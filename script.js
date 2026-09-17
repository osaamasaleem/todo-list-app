/* ==========================================================================
   1. DOM ELEMENTS
   ========================================================================== */

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


/* ==========================================================================
   3. DATA & STORAGE HELPERS
   ========================================================================== */

function saveTasks() {
    localStorage.setItem("savedTasks", JSON.stringify(tasks));
}

function getTasks() {
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

// Single function to sync storage, update counts, and re-draw the UI
function syncAppState() {
    saveTasks();
    updateCounter();
    renderTasks();
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
    checkBox.addEventListener("change", function () {
        task.completed = checkBox.checked;
        syncAppState();
    });

    // Item Action: Delete Task
    deleteButton.addEventListener("click", function () {
        const index = tasks.indexOf(task);
        tasks.splice(index, 1);
        syncAppState();
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
   5. EVENT LISTENERS
   ========================================================================== */

// Add Task
addButton.addEventListener("click", function () {
    const taskTitle = taskInput.value.trim();

    if (taskTitle === "") {
        taskError.textContent = "Please enter a task.";
        return;
    }

    const task = {
        title: taskTitle,
        completed: false
    };

    tasks.push(task);
    syncAppState();

    taskInput.value = "";
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
saveEditButton.addEventListener("click", function () {
    const newTitle = editTaskInput.value.trim();

    if (newTitle === "") {
        editTaskError.textContent = "Task title cannot be empty.";
        return;
    }

    currentlyEditingTask.title = newTitle;
    syncAppState();
    editModal.style.display = "none";
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

confirmClearAllButton.addEventListener("click", function () {
    tasks.length = 0;
    syncAppState();
    clearAllModal.style.display = "none";
});


/* ==========================================================================
   6. APP INITIALIZATION
   ========================================================================== */

// Load saved data and perform initial render
tasks.push(...getTasks());
updateCounter();
renderTasks();