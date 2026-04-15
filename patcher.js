const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");

const APP_DIR = __dirname;
const VERSION_FILE = path.join(APP_DIR, "version.json");
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const SPLASH_PORT = 48902;
const APP_PORT = 48901;

let splashServer = null;
let statusMessage = "Checking for updates...";
let progressPercent = 0;
let shouldClose = false;

// ── Read local version ────────────────────────────────────────
function getLocalVersion() {
  try {
    return JSON.parse(fs.readFileSync(VERSION_FILE, "utf-8"));
  } catch {
    return { version: "0.0.0", repo: "vanmgrc/daily-task-tracker-app" };
  }
}

// ── HTTPS GET helper ──────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { "User-Agent": "TaskFlow-Updater" },
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, data }));
    }).on("error", reject);
  });
}

// ── Download file helper ──────────────────────────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { "User-Agent": "TaskFlow-Updater" },
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      const totalBytes = parseInt(res.headers["content-length"] || "0", 10);
      let downloaded = 0;
      const file = fs.createWriteStream(dest);
      res.on("data", (chunk) => {
        downloaded += chunk.length;
        if (totalBytes > 0) {
          progressPercent = Math.round((downloaded / totalBytes) * 100);
        }
      });
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

// ── Splash screen server ──────────────────────────────────────
function startSplash() {
  return new Promise((resolve) => {
    splashServer = http.createServer((req, res) => {
      if (req.url === "/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        const local = getLocalVersion();
        res.end(JSON.stringify({ message: statusMessage, progress: progressPercent, version: local.version, close: shouldClose }));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(SPLASH_HTML);
    });
    splashServer.listen(SPLASH_PORT, "127.0.0.1", () => {
      exec(`"${EDGE_PATH}" --app=http://127.0.0.1:${SPLASH_PORT} --window-size=420,320`);
      setTimeout(resolve, 1000);
    });
  });
}

function closeSplash() {
  if (splashServer) {
    splashServer.close();
    splashServer = null;
  }
}

// ── Check for updates ─────────────────────────────────────────
async function checkForUpdates() {
  const local = getLocalVersion();
  statusMessage = "Checking for updates...";
  progressPercent = 0;

  try {
    const url = `https://api.github.com/repos/${local.repo}/releases/latest`;
    const res = await httpsGet(url);

    if (res.status !== 200) {
      statusMessage = "Could not check for updates. Launching app...";
      await delay(1500);
      return false;
    }

    const release = JSON.parse(res.data);
    const remoteVersion = release.tag_name.replace(/^v/, "");

    if (compareVersions(remoteVersion, local.version) > 0) {
      statusMessage = `Update found: v${remoteVersion}`;
      await delay(1000);

      // Look for a zip asset named taskflow-update.zip
      const asset = release.assets.find((a) => a.name === "taskflow-update.zip");
      if (asset) {
        statusMessage = "Downloading update...";
        const zipPath = path.join(APP_DIR, "update.zip");
        await downloadFile(asset.browser_download_url, zipPath);

        statusMessage = "Installing update...";
        progressPercent = 100;
        await extractUpdate(zipPath);

        // Update local version
        local.version = remoteVersion;
        fs.writeFileSync(VERSION_FILE, JSON.stringify(local, null, 2), "utf-8");

        statusMessage = "Update complete!";
        await delay(1000);
        return true;
      } else {
        statusMessage = "Update available but no download package found. Launching app...";
        await delay(1500);
        return false;
      }
    } else {
      statusMessage = "App is up to date!";
      await delay(1000);
      return false;
    }
  } catch (err) {
    statusMessage = "Offline — skipping update check. Launching app...";
    await delay(1500);
    return false;
  }
}

// ── Extract zip update ────────────────────────────────────────
function extractUpdate(zipPath) {
  return new Promise((resolve, reject) => {
    // Use PowerShell to extract zip
    const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${APP_DIR}' -Force"`;
    exec(cmd, (err) => {
      // Clean up zip
      try { fs.unlinkSync(zipPath); } catch {}
      if (err) reject(err);
      else resolve();
    });
  });
}

// ── Version comparison ────────────────────────────────────────
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Launch the app ────────────────────────────────────────────
function launchApp() {
  // Start server detached so it outlives the patcher
  const server = spawn(
    "C:\\Program Files\\nodejs\\node.exe",
    [path.join(APP_DIR, "server.js")],
    { detached: true, stdio: "ignore", cwd: APP_DIR, windowsHide: true }
  );
  server.unref();

  // Wait for server to be ready, then open Edge
  setTimeout(() => {
    const edge = spawn(EDGE_PATH, [
      `--app=http://127.0.0.1:${APP_PORT}`,
      "--window-size=1280,800",
    ], { detached: true, stdio: "ignore" });
    edge.unref();
  }, 2500);
}

// ── Splash HTML ───────────────────────────────────────────────
const SPLASH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TaskFlow</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #fff; height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; overflow: hidden;
    -webkit-app-region: drag;
  }
  .logo {
    display: flex; align-items: center; gap: 12px; margin-bottom: 30px;
  }
  .logo svg { filter: drop-shadow(0 2px 8px rgba(0,0,0,.2)); }
  .logo-text { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.5px; }
  .status {
    font-size: 0.85rem; opacity: 0.9; margin-bottom: 16px;
    min-height: 20px; text-align: center;
  }
  .progress-bar {
    width: 260px; height: 4px; background: rgba(255,255,255,0.25);
    border-radius: 4px; overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: #fff; border-radius: 4px;
    transition: width 0.3s ease; width: 0%;
  }
  .version { position: absolute; bottom: 12px; font-size: 0.7rem; opacity: 0.5; }
</style>
</head>
<body>
  <div class="logo">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
    <span class="logo-text">TaskFlow</span>
  </div>
  <div class="status" id="status">Initializing...</div>
  <div class="progress-bar"><div class="progress-fill" id="bar"></div></div>
  <div class="version" id="ver"></div>
  <script>
    async function poll() {
      try {
        const res = await fetch("/status");
        const data = await res.json();
        document.getElementById("status").textContent = data.message;
        document.getElementById("bar").style.width = data.progress + "%";
        if (data.version) document.getElementById("ver").textContent = "v" + data.version;
        if (data.close) window.close();
      } catch { window.close(); }
    }
    setInterval(poll, 400);
    poll();
  </script>
</body>
</html>`;

// ── Main ──────────────────────────────────────────────────────
(async () => {
  await startSplash();
  await checkForUpdates();

  statusMessage = "Launching TaskFlow...";
  progressPercent = 100;
  await delay(800);

  // Signal splash to close itself, then shut down splash server
  shouldClose = true;
  await delay(1000);
  closeSplash();

  launchApp();

  // Exit patcher after app has launched
  setTimeout(() => process.exit(0), 6000);
})();
