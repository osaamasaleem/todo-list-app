# To-Do List Application

A responsive, state-driven task management application built with vanilla JavaScript, modern CSS, HTML5, and Firebase Firestore. Syncs seamlessly in real time across multiple devices with Google Authentication and graceful offline LocalStorage fallback.

## 🚀 Live Demo
[View Live on Vercel](https://todo-list-app-gamma-umber.vercel.app)

---

## ✨ Features

* **Multi-Device Cloud Sync:** Real-time synchronization across all your phones, laptops, and tablets via Firebase Firestore (`onSnapshot`).
* **Google Authentication:** One-click Google Sign-In with personalized profile avatar and cloud sync status indicator.
* **Smart Offline & Local Storage:** Works offline or without signing in using `localStorage`; automatically migrates local tasks to the cloud upon first login.
* **State-Driven Rendering:** Centralized state management keeps the DOM, dynamic counters, and cloud store completely synchronized.
* **Dynamic Filtering:** Filter tasks instantly across **Total**, **Complete**, and **Incomplete** views.
* **Real-Time Search:** Live, case-insensitive keyword search filtered as you type.
* **Task Management:** Create, delete, and update tasks via interactive modal windows.
* **Smart Counters:** Live badge counters calculate and reflect total, completed, and pending counts.
* **PWA Ready:** Modern manifest and scalable icons for installable app experience on mobile and desktop.
* **Keyboard Shortcuts:**
  * `Enter`: Add task
  * `Shift + Enter`: Open the "Clear All" confirmation modal

---

## 🛠️ Built With

* **HTML5:** Semantic layout and accessible dialog modals.
* **CSS3:** Custom styles, CSS grid/flexbox layouts, responsive design, and CSS variables.
* **JavaScript (ES6+):** Pure vanilla JavaScript utilizing ES modules.
* **Firebase (v10):** Firebase Authentication (Google Sign-In) and Cloud Firestore for real-time document synchronization.

---

## 💻 Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/osaamasaleem/todo-list-app.git
   ```

2. **Open `index.html`** in a browser or run a simple local HTTP server:
   ```bash
   npx serve .
   ```