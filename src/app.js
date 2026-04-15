// ── State ─────────────────────────────────────────────────────
let tasks = [];
let editingId = null;
let deletingId = null;
let currentView = "kanban";
let currentFilter = "all";

// ── DOM refs ──────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const kanbanBoard = $("#kanbanBoard");
const listView = $("#listView");
const listBody = $("#listBody");
const modalOverlay = $("#modalOverlay");
const deleteOverlay = $("#deleteOverlay");
const taskForm = $("#taskForm");
const searchInput = $("#searchInput");

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("/api/tasks");
  tasks = await res.json();
  render();
  bindEvents();
});

// ── Persistence ───────────────────────────────────────────────
async function persist() {
  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  });
}

// ── Helpers ───────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID();
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function filteredTasks() {
  let list = tasks;
  if (currentFilter !== "all") {
    list = list.filter((t) => t.priority === currentFilter);
  }
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }
  return list;
}

// ── Render ────────────────────────────────────────────────────
function render() {
  const list = filteredTasks();

  // Kanban
  ["todo", "inprogress", "done"].forEach((status) => {
    const col = $(`#list-${status}`);
    const cards = list.filter((t) => t.status === status);
    $(`#count-${status}`).textContent = cards.length;

    if (cards.length === 0) {
      col.innerHTML = `
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          <span>No tasks</span>
        </div>`;
      return;
    }

    col.innerHTML = cards
      .map(
        (t) => `
      <div class="card" draggable="true" data-id="${t.id}">
        <div class="card-priority ${t.priority}">${t.priority} priority</div>
        <div class="card-title">${escHtml(t.title)}</div>
        ${t.description ? `<div class="card-desc">${escHtml(t.description)}</div>` : ""}
        <div class="card-footer">
          <span>${formatDate(t.createdAt)}</span>
          <div class="card-actions">
            <button title="Edit" data-action="edit" data-id="${t.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button title="Delete" data-action="delete" data-id="${t.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>`
      )
      .join("");
  });

  // List view
  if (list.length === 0) {
    listBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">No tasks found</td></tr>`;
  } else {
    listBody.innerHTML = list
      .map(
        (t) => `
      <tr>
        <td><strong>${escHtml(t.title)}</strong>${t.description ? `<br><span style="color:var(--text-muted);font-size:.78rem">${escHtml(t.description)}</span>` : ""}</td>
        <td><span class="badge ${t.priority}">${t.priority}</span></td>
        <td><span class="badge ${t.status}">${statusLabel(t.status)}</span></td>
        <td style="font-size:.8rem;color:var(--text-muted)">${formatDate(t.createdAt)}</td>
        <td class="list-actions">
          <button data-action="edit" data-id="${t.id}">Edit</button>
          <button data-action="delete" data-id="${t.id}">Delete</button>
        </td>
      </tr>`
      )
      .join("");
  }

  // Stats
  $("#stat-total").textContent = tasks.length;
  $("#stat-done").textContent = tasks.filter((t) => t.status === "done").length;

  // Re-bind drag events
  bindDragEvents();
}

function statusLabel(s) {
  return { todo: "To Do", inprogress: "In Progress", done: "Done" }[s] || s;
}

function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ── Events ────────────────────────────────────────────────────
function bindEvents() {
  // Create task button
  $("#btnCreateTask").addEventListener("click", () => openModal());
  $$(".btn-add-card").forEach((btn) =>
    btn.addEventListener("click", () => openModal(null, btn.dataset.status))
  );

  // Modal close
  $("#btnCloseModal").addEventListener("click", closeModal);
  $("#btnCancel").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Delete modal
  $("#btnCloseDelete").addEventListener("click", closeDeleteModal);
  $("#btnCancelDelete").addEventListener("click", closeDeleteModal);
  deleteOverlay.addEventListener("click", (e) => {
    if (e.target === deleteOverlay) closeDeleteModal();
  });
  $("#btnConfirmDelete").addEventListener("click", confirmDelete);

  // Form submit
  taskForm.addEventListener("submit", handleSave);

  // Search
  searchInput.addEventListener("input", render);

  // View tabs (topbar)
  $$(".tab").forEach((tab) =>
    tab.addEventListener("click", () => switchView(tab.dataset.view))
  );
  // View nav (sidebar)
  $$('.nav-item[data-view]').forEach((btn) =>
    btn.addEventListener("click", () => switchView(btn.dataset.view))
  );

  // Priority filters
  $$(".filter-item").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.priority;
      $$(".filter-item").forEach((b) => b.classList.remove("active-filter"));
      btn.classList.add("active-filter");
      render();
    })
  );

  // Delegate card actions
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "edit") openModal(id);
    if (btn.dataset.action === "delete") openDeleteModal(id);
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeDeleteModal();
    }
  });
}

// ── View switching ────────────────────────────────────────────
function switchView(view) {
  currentView = view;
  kanbanBoard.classList.toggle("hidden", view !== "kanban");
  listView.classList.toggle("hidden", view !== "list");

  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  $$('.nav-item[data-view]').forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  render();
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(id = null, defaultStatus = "todo") {
  editingId = id;
  if (id) {
    const t = tasks.find((t) => t.id === id);
    if (!t) return;
    $("#modalTitle").textContent = "Edit Task";
    $("#inputTitle").value = t.title;
    $("#inputDesc").value = t.description || "";
    $("#inputPriority").value = t.priority;
    $("#inputStatus").value = t.status;
  } else {
    $("#modalTitle").textContent = "Create Task";
    taskForm.reset();
    $("#inputStatus").value = defaultStatus;
    $("#inputPriority").value = "medium";
  }
  modalOverlay.classList.remove("hidden");
  $("#inputTitle").focus();
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  editingId = null;
}

function openDeleteModal(id) {
  deletingId = id;
  deleteOverlay.classList.remove("hidden");
}

function closeDeleteModal() {
  deleteOverlay.classList.add("hidden");
  deletingId = null;
}

async function confirmDelete() {
  if (!deletingId) return;
  tasks = tasks.filter((t) => t.id !== deletingId);
  await persist();
  closeDeleteModal();
  render();
}

async function handleSave(e) {
  e.preventDefault();
  const title = $("#inputTitle").value.trim();
  if (!title) return;

  if (editingId) {
    const t = tasks.find((t) => t.id === editingId);
    if (t) {
      t.title = title;
      t.description = $("#inputDesc").value.trim();
      t.priority = $("#inputPriority").value;
      t.status = $("#inputStatus").value;
    }
  } else {
    tasks.push({
      id: uuid(),
      title,
      description: $("#inputDesc").value.trim(),
      priority: $("#inputPriority").value,
      status: $("#inputStatus").value,
      createdAt: new Date().toISOString(),
    });
  }

  await persist();
  closeModal();
  render();
}

// ── Drag & Drop ───────────────────────────────────────────────
function bindDragEvents() {
  $$(".card[draggable]").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.id);
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  $$(".card-list").forEach((list) => {
    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterEl = getDragAfterElement(list, e.clientY);
      const dragging = $(".card.dragging");
      if (!dragging) return;
      if (afterEl) {
        list.insertBefore(dragging, afterEl);
      } else {
        list.appendChild(dragging);
      }
    });

    list.addEventListener("drop", async (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      const col = list.closest(".column");
      const newStatus = col.dataset.status;
      const task = tasks.find((t) => t.id === id);
      if (task && task.status !== newStatus) {
        task.status = newStatus;
        await persist();
        render();
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll(".card:not(.dragging)")];
  return cards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}
