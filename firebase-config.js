import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    collection, 
    doc, 
    setDoc,
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    writeBatch, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXSVSsOuEzKzVo9CBwinDrmSGmA7Xqhpw",
  authDomain: "todo-list-sync-a2122.firebaseapp.com",
  projectId: "todo-list-sync-a2122",
  storageBucket: "todo-list-sync-a2122.firebasestorage.app",
  messagingSenderId: "26583494869",
  appId: "1:26583494869:web:31c5ffc728c973b8c8b25c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with multi-tab offline persistence
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
} catch (e) {
    console.warn("Firestore offline persistence fallback:", e);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export {
    auth,
    db,
    googleProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    writeBatch,
    getDocs
};
