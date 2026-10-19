# 📝 To-Do List Application

A modern, responsive, offline-first task management web application built with vanilla JavaScript, HTML5, modern CSS3, and Firebase Firestore. Syncs seamlessly in real-time across multiple devices with Google Authentication, and operates with zero disruption offline via a dedicated Service Worker and `localStorage` caching.

[![Live Demo](https://img.shields.io/badge/Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://todo-list-app-gamma-umber.vercel.app)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa)](https://todo-list-app-gamma-umber.vercel.app)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 🚀 Live Demo

Experience the app live: **[todo-list-app-gamma-umber.vercel.app](https://todo-list-app-gamma-umber.vercel.app)**

---

## ✨ Features

### 🔄 Multi-Device Real-Time Cloud Sync
* Real-time document updates via Firebase Firestore (`onSnapshot`).
* Check off or create a task on your phone, and see it reflect on your desktop within milliseconds without refreshing.

### ⚡ True Offline-First Architecture
* **PWA Service Worker (`sw.js`)**: Caches all core assets (HTML, CSS, JS, manifest, and icons) and Google CDN scripts for instant loading even in Airplane mode.
* **Instant Local Execution**: App boots synchronously from `localStorage` in milliseconds with zero network blocking.
* **Optimistic UI Updates**: All task operations (create, check off, edit, delete) update the DOM and `localStorage` immediately.
* **Auto-Sync on Reconnect**: Any task created or modified offline is marked with `synced: false`. As soon as internet connectivity returns (`online` event), tasks are automatically batched and pushed to Firestore.

### 🔐 Google Authentication
* Secure, one-click Google Sign-In with profile avatar and display name.
* Seamless guest mode: works out-of-the-box using local storage without requiring login.
* Automatic data migration: your existing local tasks automatically migrate to your cloud account upon your first login.

### 📊 Real-Time Counters & Filtering
* Live task counters: **Total**, **Complete**, and **Incomplete**.
* Click any counter badge to instantly filter the task list.

### 🔍 Instant Keyword Search
* Real-time, case-insensitive task search as you type.

### 🪟 Accessible Modals & Dialogs
* **Edit Task Modal**: Quick inline updating of task titles.
* **Clear All Modal**: Safe confirmation dialog to prevent accidental data loss.

### 📱 Progressive Web App (PWA)
* Fully installable on iOS, Android, macOS, and Windows.
* Includes custom high-resolution SVG and PNG icons (`192x192`, `512x512`).

### ⌨️ Keyboard Shortcuts
* `Enter`: Add task
* `Shift + Enter`: Open the "Clear All" confirmation modal

---

## 🏗️ Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   User Action / UI                     │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      [Online + Logged In]       [Offline / Guest]
               │                         │
               ├─────────────────────────┤
               ▼                         ▼
     Update LocalStorage        Update LocalStorage
      & Optimistic DOM           & Optimistic DOM
               │                         │
               ▼                         ▼
      Batch Sync to Cloud           Wait for 'online'
      (Firebase Firestore)         event to Auto-Sync
```

---

## 📁 Project Structure

```
todo-list-app/
├── index.html           # Semantic HTML5 layout and modals
├── style.css            # Responsive CSS3 styles with CSS variables
├── script.js            # Core offline-first state manager & event handlers
├── firebase-config.js   # Firebase App, Auth, and Firestore initialization
├── sw.js                # Service Worker for offline asset & CDN caching
├── manifest.json        # Web App Manifest for PWA installation
├── icon.svg             # Scalable vector app icon
├── icon.png             # 192x192 px PWA icon
├── icon-512.png         # 512x512 px high-res PWA icon
└── README.md            # Comprehensive project documentation
```

---

## 🛠️ Built With

* **HTML5:** Semantic layout, accessible dialog modals, and meta viewport tags.
* **CSS3:** Flexbox & Grid layouts, CSS variables, backdrop filters, responsive media queries.
* **JavaScript (ES6+):** Vanilla JavaScript utilizing ES modules and asynchronous dynamic imports.
* **Firebase (v10):** Firebase Authentication (Google OAuth) and Cloud Firestore with multi-tab offline persistence.
* **Service Workers:** Offline caching strategy with stale-while-revalidate and network-first fallbacks.

---

## 💻 Local Setup & Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/osaamasaleem/todo-list-app.git
   cd todo-list-app
   ```

2. **Serve the app locally:**
   Since the app uses modern ES modules and Service Workers, serve it through any local HTTP server:
   ```bash
   # Using Node.js
   npx serve .

   # Or using Python
   python -m http.server 8080
   ```

3. **Open in browser:**
   Navigate to `http://localhost:3000` (or `http://localhost:8080`).

---

## 👤 Author

* **Usama Saleem** — GitHub: [@osaamasaleem](https://github.com/osaamasaleem)