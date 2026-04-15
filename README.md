# Daily Task Tracker App

A personal desktop Kanban task tracker. Manage your daily tasks with a clean drag-and-drop board — no cloud, no accounts, everything stored locally on your PC.

## Download

[**Download TaskFlow Setup**](https://github.com/vanmgrc/daily-task-tracker-app/releases/latest/download/TaskFlow-Setup.zip)

> Requires [Node.js](https://nodejs.org/) (v18 or later) and Microsoft Edge (pre-installed on Windows).

### How to install

1. Download and extract the zip
2. Run **`TaskFlow-Setup.bat`**
3. Done — a **TaskFlow** shortcut appears on your Desktop and Start Menu

The app auto-checks for updates every time you open it.

## Features

- **Kanban Board** — Drag and drop tasks between To Do, In Progress, and Done columns
- **List View** — See all tasks in a sortable table
- **Priority Levels** — High, Medium, and Low with color-coded labels
- **Search** — Instantly filter tasks by title or description
- **Priority Filters** — View only tasks of a specific priority
- **Create / Edit / Delete** — Full CRUD with a clean modal form
- **Auto Updater** — Patcher checks for updates on launch with a splash screen
- **Local Storage** — All data saved as a JSON file on your machine (no internet needed)

## Tech Stack

- **Node.js** — Lightweight local HTTP server
- **Edge App Mode** — Native-looking window (no tabs, no address bar)
- **Vanilla HTML / CSS / JS** — No heavy frontend frameworks
- **Inter** — Clean Google Font
- **Local JSON file** — Data persisted in `data/tasks.json`

## Uninstall

Run `%LOCALAPPDATA%\TaskFlow\uninstall.bat`

## License

This project is licensed under the MIT License.
