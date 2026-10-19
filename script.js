/* ==========================================================================
   0. SERVICE WORKER REGISTRATION (OFFLINE PWA)
   ========================================================================== */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((err) => {
            console.warn("ServiceWorker registration warning:", err);
        });
    });
}


/* ==========================================================================
   1. DOM ELEMENTS
   ========================================================================== */

// Auth & Status Elements
const syncBadge = document.getElementById("syncBadge");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const userProfile = document.getElementById("userProfile");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const signOutBtn = document.getElementById("signOutBtn");

// Task Input & Action Controls
const taskInput = document.querySelector("#task");
const addButton = document.getElementById("addButton");
const clearallButton = document.getElementById("clearallButton");
const taskError = document.getElementById("taskError");

// Display & Search
const displayTasks = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");

// Statistics / Filter Badges
const totalTasks = document.getElementById("totalTasks");
const completeTasks = document.getElementById("complete");
const incompleteTasks = document.getElementById("incomplete");

// Edit Task Modal
const editModal = document.getElementById("editModal");
const editTaskInput = document.getElementById("editTaskInput");
const editTaskError = document.getElementById("editTaskError");
const saveEditButton = document.getElementById("saveEditButton");
const cancelEditButton = document.getElementById("cancelEditButton");

// Clear All Confirmation Modal
const clearAllModal = document.getElementById("clearAllModal");
const cancelClearAllButton = document.getElementById("cancelClearAllButton");
const confirmClearAllButton = document.getElementById("confirmClearAllButton");


/* ==========================================================================
   2. APPLICATION STATE
   ========================================================================== */

const tasks = [];
let currentlyEditingTask = null;
let currentFilter = "all"; // Options: "all", "complete", "incomplete"
let currentUser = null;
let fb = null; // Will hold dynamically imported Firebase module when online
let unsubscribeSnapshot = null;
let isSyncing = false;


/* ==========================================================================
   3. DATA & LOCAL STORAGE HELPERS
   ========================================================================== */

function getLocalTasks() {
    try {
        const fetchedTasks = localStorage.getItem("savedTasks");
        if (!fetchedTasks) return [];
        const parsed = JSON.parse(fetchedTasks);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Error reading localStorage:", e);
        return [];
    }
}

function saveLocalTasks() {
    try {
        localStorage.setItem("savedTasks", JSON.stringify(tasks));
    } catch (e) {
        console.error("Error writing to localStorage:", e);
    }
}

function updateSyncStatusUI(status) {
    if (!syncBadge) return;

    syncBadge.className = "sync-badge";
    if (status === "offline") {
        syncBadge.classList.add("offline");
        syncBadge.textContent = "● Offline (Saved Locally)";
    } else if (status === "syncing") {
        syncBadge.classList.add("syncing");
        syncBadge.textContent = "● Syncing...";
    } else if (status === "synced") {
        syncBadge.classList.add("online-synced");
        syncBadge.textContent = "● Cloud Synced";
    } else {
        syncBadge.textContent = "● Local Storage";
    }
}

function calculateCounter() {
    const total = tasks.length;
    const complete = tasks.filter(task => task.completed).length;
    const incomplete = total - complete;

    return { total, complete, incomplete };
}

function getFilteredTasks() {
    if (currentFilter === "complete") {
        return tasks.filter(task => task.completed === true);
    }
    if (currentFilter === "incomplete") {
        return tasks.filter(task => task.completed === false);
    }
    return tasks;
}

function getSearchedTasks(tasksToSearch) {
    const searchTerm = searchInput.value.trim().toLowerCase();
    return tasksToSearch.filter(task => task.title.toLowerCase().includes(searchTerm));
}


/* ==========================================================================
   4. RENDERING & UI UPDATES
   ========================================================================== */

function updateCounter() {
    const { total, complete, incomplete } = calculateCounter();
    
    totalTasks.textContent = `Total: ${total} ${total === 1 ? "task" : "tasks"}`;
    completeTasks.textContent = `Complete: ${complete} ${complete === 1 ? "task" : "tasks"}`;
    incompleteTasks.textContent = `Incomplete: ${incomplete} ${incomplete === 1 ? "task" : "tasks"}`;
}

function updateActiveFilterButton() {
    totalTasks.classList.remove("active");
    completeTasks.classList.remove("active");
    incompleteTasks.classList.remove("active");

    if (currentFilter === "all") {
        totalTasks.classList.add("active");
    } else if (currentFilter === "complete") {
        completeTasks.classList.add("active");
    } else if (currentFilter === "incomplete") {
        incompleteTasks.classList.add("active");
    }
}

function createTaskElement(task) {
    const li = document.createElement("li");

    const checkBox = document.createElement("input");
    checkBox.type = "checkbox";
    checkBox.checked = task.completed;

    const taskText = document.createElement("span");
    taskText.textContent = task.title;

    const editButton = document.createElement("button");
    editButton.textContent = "Edit Task";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete Task";

    li.append(checkBox, " ", taskText, " ", editButton, " ", deleteButton);

    // Item Action: Toggle Completion
    checkBox.addEventListener("change", async function () {
        await updateTaskCompletion(task, checkBox.checked);
    });

    // Item Action: Delete Task
    deleteButton.addEventListener("click", async function () {
        await removeTask(task);
    });

    // Item Action: Open Edit Modal
    editButton.addEventListener("click", function () {
        editTaskInput.value = task.title;
        currentlyEditingTask = task;
        editModal.style.display = "flex";
        editTaskInput.focus();
    });

    displayTasks.appendChild(li);
}

function renderTasks() {
    displayTasks.innerHTML = "";
    updateActiveFilterButton();

    if (tasks.length === 0) {
        const message = document.createElement("li");
        message.textContent = "You have no tasks!";
        displayTasks.appendChild(message);
        return;
    }

    const filteredTasks = getFilteredTasks();
    const tasksToDisplay = getSearchedTasks(filteredTasks);

    if (tasksToDisplay.length === 0) {
        const message = document.createElement("li");
        message.textContent = "No tasks match your current filter/search";
        displayTasks.appendChild(message);
        return;
    }

    tasksToDisplay.forEach(task => createTaskElement(task));
}


/* ==========================================================================
   5. TASK CRUD (OFFLINE-FIRST WITH BACKGROUND CLOUD SYNC)
   ========================================================================== */

function generateId() {
    return (typeof crypto !== "undefined" && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : String(Date.now() + Math.random());
}

async function addNewTask(title) {
    const task = {
        id: generateId(),
        title: title,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        synced: false
    };

    // 1. Immediately update local state & UI (Instant response even offline)
    tasks.push(task);
    saveLocalTasks();
    updateCounter();
    renderTasks();

    // 2. If online and logged in, push to Firestore
    if (currentUser && navigator.onLine && fb) {
        try {
            const taskDocRef = fb.doc(fb.db, "users", currentUser.uid, "tasks", task.id);
            await fb.setDoc(taskDocRef, {
                title: task.title,
                completed: task.completed,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt
            });
            task.synced = true;
            saveLocalTasks();
        } catch (err) {
            console.warn("Could not sync new task to cloud (will sync on reconnect):", err);
        }
    }
}

async function updateTaskCompletion(task, completed) {
    // 1. Immediate local update
    task.completed = completed;
    task.updatedAt = Date.now();
    task.synced = false;
    saveLocalTasks();
    updateCounter();
    renderTasks();

    // 2. Cloud update if online
    if (currentUser && navigator.onLine && fb && task.id) {
        try {
            const taskDocRef = fb.doc(fb.db, "users", currentUser.uid, "tasks", task.id);
            await fb.updateDoc(taskDocRef, {
                completed: completed,
                updatedAt: task.updatedAt
            });
            task.synced = true;
            saveLocalTasks();
        } catch (err) {
            console.warn("Could not sync completion to cloud (will sync on reconnect):", err);
        }
    }
}

async function updateTaskTitle(task, newTitle) {
    // 1. Immediate local update
    task.title = newTitle;
    task.updatedAt = Date.now();
    task.synced = false;
    saveLocalTasks();
    renderTasks();

    // 2. Cloud update if online
    if (currentUser && navigator.onLine && fb && task.id) {
        try {
            const taskDocRef = fb.doc(fb.db, "users", currentUser.uid, "tasks", task.id);
            await fb.updateDoc(taskDocRef, {
                title: newTitle,
                updatedAt: task.updatedAt
            });
            task.synced = true;
            saveLocalTasks();
        } catch (err) {
            console.warn("Could not sync edit to cloud (will sync on reconnect):", err);
        }
    }
}

async function removeTask(task) {
    // 1. Immediate local removal
    const index = tasks.indexOf(task);
    if (index > -1) {
        tasks.splice(index, 1);
        saveLocalTasks();
        updateCounter();
        renderTasks();
    }

    // 2. Cloud removal if online
    if (currentUser && navigator.onLine && fb && task.id) {
        try {
            const taskDocRef = fb.doc(fb.db, "users", currentUser.uid, "tasks", task.id);
            await fb.deleteDoc(taskDocRef);
        } catch (err) {
            console.warn("Could not delete from cloud:", err);
        }
    }
}

async function clearAllTasksList() {
    // 1. Immediate local clear
    tasks.length = 0;
    saveLocalTasks();
    updateCounter();
    renderTasks();

    // 2. Cloud clear if online
    if (currentUser && navigator.onLine && fb) {
        try {
            const tasksRef = fb.collection(fb.db, "users", currentUser.uid, "tasks");
            const snapshot = await fb.getDocs(tasksRef);
            const batch = fb.writeBatch(fb.db);
            snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
            await batch.commit();
        } catch (err) {
            console.warn("Could not clear cloud tasks:", err);
        }
    }
}


/* ==========================================================================
   6. AUTOMATIC CLOUD SYNC & RECONNECT LOGIC
   ========================================================================== */

// Sync all unsynced local tasks to Firestore
async function syncLocalTasksWithCloud(userId) {
    if (!fb || !navigator.onLine || isSyncing) return;
    isSyncing = true;
    updateSyncStatusUI("syncing");

    try {
        const tasksRef = fb.collection(fb.db, "users", userId, "tasks");
        const cloudDocsSnapshot = await fb.getDocs(tasksRef);
        const cloudIds = new Set();
        cloudDocsSnapshot.forEach(docSnap => cloudIds.add(docSnap.id));

        const batch = fb.writeBatch(fb.db);
        let pendingUploads = 0;

        tasks.forEach((task) => {
            if (!task.id) task.id = generateId();

            // If task is not in cloud or has pending local edits
            if (!cloudIds.has(task.id) || !task.synced) {
                const docRef = fb.doc(fb.db, "users", userId, "tasks", task.id);
                batch.set(docRef, {
                    title: task.title,
                    completed: Boolean(task.completed),
                    createdAt: task.createdAt || Date.now(),
                    updatedAt: task.updatedAt || Date.now()
                });
                task.synced = true;
                pendingUploads++;
            }
        });

        if (pendingUploads > 0) {
            await batch.commit();
            saveLocalTasks();
        }
    } catch (err) {
        console.warn("Background sync error:", err);
    } finally {
        isSyncing = false;
    }
}

// Subscribe to real-time cloud updates
function startRealtimeCloudListener(userId) {
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
    }

    if (!fb || !navigator.onLine) {
        updateSyncStatusUI("offline");
        return;
    }

    const tasksRef = fb.collection(fb.db, "users", userId, "tasks");
    const q = fb.query(tasksRef, fb.orderBy("createdAt", "asc"));

    unsubscribeSnapshot = fb.onSnapshot(q, (snapshot) => {
        // Merge cloud snapshot with local memory
        const cloudTasks = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudTasks.push({
                id: docSnap.id,
                title: data.title || "",
                completed: Boolean(data.completed),
                createdAt: data.createdAt || 0,
                updatedAt: data.updatedAt || 0,
                synced: true
            });
        });

        // Replace local state with latest verified cloud data
        tasks.length = 0;
        tasks.push(...cloudTasks);
        saveLocalTasks(); // Update offline backup
        updateSyncStatusUI(navigator.onLine ? "synced" : "offline");
        updateCounter();
        renderTasks();
    }, (error) => {
        console.warn("Firestore onSnapshot error:", error);
        updateSyncStatusUI(navigator.onLine ? "synced" : "offline");
    });
}


/* ==========================================================================
   7. DYNAMIC FIREBASE INITIALIZER (LOADED SAFELY IN BACKGROUND)
   ========================================================================== */

async function initFirebase() {
    if (!navigator.onLine) {
        updateSyncStatusUI("offline");
        return;
    }

    try {
        if (!fb) {
            fb = await import("./firebase-config.js");
            
            // Listen to Auth State
            fb.onAuthStateChanged(fb.auth, async (user) => {
                if (user) {
                    currentUser = user;
                    googleSignInBtn.style.display = "none";
                    userProfile.style.display = "flex";
                    userAvatar.src = user.photoURL || "icon.png";
                    userName.textContent = user.displayName || user.email || "Account";

                    // Sync any tasks created while offline / logged out
                    await syncLocalTasksWithCloud(user.uid);
                    startRealtimeCloudListener(user.uid);
                } else {
                    currentUser = null;
                    if (unsubscribeSnapshot) {
                        unsubscribeSnapshot();
                        unsubscribeSnapshot = null;
                    }
                    userProfile.style.display = "none";
                    googleSignInBtn.style.display = "inline-flex";
                    updateSyncStatusUI(navigator.onLine ? "local" : "offline");
                }
            });
        }
    } catch (err) {
        console.warn("Firebase could not be loaded (offline or network blocked):", err);
        updateSyncStatusUI("offline");
    }
}


/* ==========================================================================
   8. EVENT LISTENERS
   ========================================================================== */

// Auth Action: Sign In
googleSignInBtn.addEventListener("click", async function () {
    if (!navigator.onLine) {
        alert("You are currently offline. Please connect to the internet to sign in with Google.");
        return;
    }

    try {
        if (!fb) await initFirebase();
        await fb.signInWithPopup(fb.auth, fb.googleProvider);
    } catch (err) {
        console.error("Sign-in error:", err);
        if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
            alert(`Sign-in failed: ${err.message}`);
        }
    }
});

// Auth Action: Sign Out
signOutBtn.addEventListener("click", async function () {
    try {
        if (fb) await fb.signOut(fb.auth);
    } catch (err) {
        console.error("Sign-out error:", err);
    }
});

// Add Task Button
addButton.addEventListener("click", async function () {
    const taskTitle = taskInput.value.trim();

    if (taskTitle === "") {
        taskError.textContent = "Please enter a task.";
        return;
    }

    taskInput.value = "";
    taskError.textContent = "";

    await addNewTask(taskTitle);
});

taskInput.addEventListener("input", function () {
    taskError.textContent = "";
});

taskInput.addEventListener("keydown", function (e) {
    if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        clearallButton.click();
        return;
    }

    if (e.key === "Enter") {
        e.preventDefault();
        addButton.click();
    }
});

// Search Input
searchInput.addEventListener("input", function () {
    renderTasks();
});

// Filter Tabs
totalTasks.addEventListener("click", function () {
    currentFilter = "all";
    renderTasks();
});

completeTasks.addEventListener("click", function () {
    currentFilter = "complete";
    renderTasks();
});

incompleteTasks.addEventListener("click", function () {
    currentFilter = "incomplete";
    renderTasks();
});

// Edit Modal
saveEditButton.addEventListener("click", async function () {
    const newTitle = editTaskInput.value.trim();

    if (newTitle === "") {
        editTaskError.textContent = "Task title cannot be empty.";
        return;
    }

    await updateTaskTitle(currentlyEditingTask, newTitle);
    editModal.style.display = "none";
});

cancelEditButton.addEventListener("click", function () {
    editModal.style.display = "none";
});

editTaskInput.addEventListener("input", function () {
    editTaskError.textContent = "";
});

// Clear All Modal
clearallButton.addEventListener("click", function () {
    clearAllModal.style.display = "flex";
});

cancelClearAllButton.addEventListener("click", function () {
    clearAllModal.style.display = "none";
});

confirmClearAllButton.addEventListener("click", async function () {
    await clearAllTasksList();
    clearAllModal.style.display = "none";
});

// Network Status Listeners (Auto Reconnect & Sync)
window.addEventListener("online", async () => {
    updateSyncStatusUI("syncing");
    await initFirebase();
    if (currentUser) {
        await syncLocalTasksWithCloud(currentUser.uid);
        startRealtimeCloudListener(currentUser.uid);
    } else {
        updateSyncStatusUI("local");
    }
});

window.addEventListener("offline", () => {
    updateSyncStatusUI("offline");
});


/* ==========================================================================
   9. IMMEDIATE SYNCHRONOUS INITIALIZATION
   ========================================================================== */

// 1. Immediately load tasks from localStorage & render UI
tasks.push(...getLocalTasks());
updateCounter();
renderTasks();

// 2. Set initial sync status indicator
updateSyncStatusUI(navigator.onLine ? "local" : "offline");

// 3. Attempt background Firebase connection if online
if (navigator.onLine) {
    initFirebase();
}