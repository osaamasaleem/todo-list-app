import {
    auth,
    db,
    googleProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    writeBatch,
    getDocs
} from "./firebase-config.js";

/* ==========================================================================
   1. DOM ELEMENTS
   ========================================================================== */

// Auth Elements
const googleSignInBtn = document.getElementById("googleSignInBtn");
const userProfile = document.getElementById("userProfile");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const syncStatus = document.getElementById("syncStatus");
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
let unsubscribeSnapshot = null;


/* ==========================================================================
   3. DATA & STORAGE HELPERS (LOCAL + CLOUD)
   ========================================================================== */

function saveLocalTasks() {
    localStorage.setItem("savedTasks", JSON.stringify(tasks));
}

function getLocalTasks() {
    const fetchedTasks = localStorage.getItem("savedTasks");
    return fetchedTasks ? JSON.parse(fetchedTasks) : [];
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
   4. CLOUD SYNC & FIRESTORE INTEGRATION
   ========================================================================== */

// Listen to Firestore real-time updates for the logged-in user
function listenToTasks(userId) {
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
    }

    syncStatus.textContent = "● Syncing...";
    syncStatus.style.color = "#d97706";

    const tasksRef = collection(db, "users", userId, "tasks");
    const q = query(tasksRef, orderBy("createdAt", "asc"));

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        tasks.length = 0;
        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            tasks.push({
                id: docSnapshot.id,
                title: data.title || "",
                completed: Boolean(data.completed),
                createdAt: data.createdAt || 0
            });
        });

        syncStatus.textContent = "● Cloud Synced";
        syncStatus.style.color = "#16a34a";
        updateCounter();
        renderTasks();
    }, (error) => {
        console.error("Firestore sync error:", error);
        syncStatus.textContent = "● Sync Error";
        syncStatus.style.color = "#dc2626";
    });
}

// Migrate existing localStorage tasks to Firestore when user first signs in
async function migrateLocalTasksToCloud(userId) {
    const local = getLocalTasks();
    if (!local || local.length === 0) return;

    try {
        const tasksRef = collection(db, "users", userId, "tasks");
        const existingDocs = await getDocs(tasksRef);

        if (existingDocs.empty) {
            const batch = writeBatch(db);
            local.forEach((item, index) => {
                const newDocRef = doc(tasksRef);
                batch.set(newDocRef, {
                    title: item.title,
                    completed: Boolean(item.completed),
                    createdAt: Date.now() + index
                });
            });
            await batch.commit();
            localStorage.removeItem("savedTasks");
        }
    } catch (err) {
        console.error("Migration error:", err);
    }
}

// Cloud-aware Task Operations
async function addNewTask(title) {
    if (currentUser) {
        const tasksRef = collection(db, "users", currentUser.uid, "tasks");
        await addDoc(tasksRef, {
            title,
            completed: false,
            createdAt: Date.now()
        });
    } else {
        tasks.push({
            id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
            title,
            completed: false,
            createdAt: Date.now()
        });
        saveLocalTasks();
        updateCounter();
        renderTasks();
    }
}

async function updateTaskCompletion(task, completed) {
    task.completed = completed;
    if (currentUser && task.id) {
        const docRef = doc(db, "users", currentUser.uid, "tasks", task.id);
        await updateDoc(docRef, { completed });
    } else {
        saveLocalTasks();
        updateCounter();
        renderTasks();
    }
}

async function updateTaskTitle(task, newTitle) {
    task.title = newTitle;
    if (currentUser && task.id) {
        const docRef = doc(db, "users", currentUser.uid, "tasks", task.id);
        await updateDoc(docRef, { title: newTitle });
    } else {
        saveLocalTasks();
        renderTasks();
    }
}

async function removeTask(task) {
    if (currentUser && task.id) {
        const docRef = doc(db, "users", currentUser.uid, "tasks", task.id);
        await deleteDoc(docRef);
    } else {
        const index = tasks.indexOf(task);
        if (index > -1) {
            tasks.splice(index, 1);
            saveLocalTasks();
            updateCounter();
            renderTasks();
        }
    }
}

async function clearAllTasksList() {
    if (currentUser) {
        const tasksRef = collection(db, "users", currentUser.uid, "tasks");
        const snapshot = await getDocs(tasksRef);
        const batch = writeBatch(db);
        snapshot.forEach((docSnap) => {
            batch.delete(docSnap.ref);
        });
        await batch.commit();
    } else {
        tasks.length = 0;
        saveLocalTasks();
        updateCounter();
        renderTasks();
    }
}


/* ==========================================================================
   5. RENDERING & UI UPDATES
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
        try {
            await updateTaskCompletion(task, checkBox.checked);
        } catch (err) {
            console.error("Error updating completion:", err);
            checkBox.checked = !checkBox.checked;
        }
    });

    // Item Action: Delete Task
    deleteButton.addEventListener("click", async function () {
        try {
            await removeTask(task);
        } catch (err) {
            console.error("Error deleting task:", err);
        }
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
   6. EVENT LISTENERS
   ========================================================================== */

// Auth Buttons
googleSignInBtn.addEventListener("click", async function () {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (err) {
        console.error("Google sign-in error:", err);
        if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
            alert(`Sign-in failed: ${err.message}`);
        }
    }
});

signOutBtn.addEventListener("click", async function () {
    try {
        await signOut(auth);
    } catch (err) {
        console.error("Sign-out error:", err);
    }
});

// Add Task
addButton.addEventListener("click", async function () {
    const taskTitle = taskInput.value.trim();

    if (taskTitle === "") {
        taskError.textContent = "Please enter a task.";
        return;
    }

    taskInput.value = "";
    taskError.textContent = "";

    try {
        await addNewTask(taskTitle);
    } catch (err) {
        console.error("Error adding task:", err);
        taskError.textContent = "Failed to save task. Please try again.";
    }
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

// Search
searchInput.addEventListener("input", function () {
    renderTasks();
});

// Filter Buttons
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

// Edit Modal Actions
saveEditButton.addEventListener("click", async function () {
    const newTitle = editTaskInput.value.trim();

    if (newTitle === "") {
        editTaskError.textContent = "Task title cannot be empty.";
        return;
    }

    try {
        await updateTaskTitle(currentlyEditingTask, newTitle);
        editModal.style.display = "none";
    } catch (err) {
        console.error("Error editing task:", err);
        editTaskError.textContent = "Failed to update task.";
    }
});

cancelEditButton.addEventListener("click", function () {
    editModal.style.display = "none";
});

editTaskInput.addEventListener("input", function () {
    editTaskError.textContent = "";
});

// Clear All Modal Actions
clearallButton.addEventListener("click", function () {
    clearAllModal.style.display = "flex";
});

cancelClearAllButton.addEventListener("click", function () {
    clearAllModal.style.display = "none";
});

confirmClearAllButton.addEventListener("click", async function () {
    try {
        await clearAllTasksList();
        clearAllModal.style.display = "none";
    } catch (err) {
        console.error("Error clearing all tasks:", err);
        alert("Failed to clear tasks. Please try again.");
    }
});


/* ==========================================================================
   7. APP & AUTH INITIALIZATION
   ========================================================================== */

// Listen to Auth state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        googleSignInBtn.style.display = "none";
        userProfile.style.display = "flex";
        userAvatar.src = user.photoURL || "icon.png";
        userName.textContent = user.displayName || user.email || "Account";

        await migrateLocalTasksToCloud(user.uid);
        listenToTasks(user.uid);
    } else {
        currentUser = null;
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }

        userProfile.style.display = "none";
        googleSignInBtn.style.display = "inline-flex";

        tasks.length = 0;
        tasks.push(...getLocalTasks());
        updateCounter();
        renderTasks();
    }
});