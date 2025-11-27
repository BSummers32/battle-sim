import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOkyhoEb0jFZQDbjMtylMfcDC7jSOxn8Y",
  authDomain: "battle-sim-multiplayer.firebaseapp.com",
  projectId: "battle-sim-multiplayer",
  storageBucket: "battle-sim-multiplayer.firebasestorage.app",
  messagingSenderId: "269143153224",
  appId: "1:269143153224:web:bdef73104a33fb2812967d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);