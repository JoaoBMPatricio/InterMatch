import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-Qz2yoQMPg10d2ISrlsJrpd7XNH5wfgE",
  authDomain: "intermatch-150ef.firebaseapp.com",
  projectId: "intermatch-150ef",
  storageBucket: "intermatch-150ef.firebasestorage.app",
  messagingSenderId: "236360178554",
  appId: "1:236360178554:web:4d8ab774c8eaa94fd8d4c3",
  measurementId: "G-S5KHXH7REK"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

