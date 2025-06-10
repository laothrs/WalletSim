import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC2Da-IjqzfNzA7KobhlR9OmCMBf-nwUi0",
  authDomain: "simulate-wallet.firebaseapp.com",
  projectId: "simulate-wallet",
  storageBucket: "simulate-wallet.firebasestorage.app",
  messagingSenderId: "435522380162",
  appId: "1:435522380162:web:b5cef5655bb5eb5272af9b",
  measurementId: "G-BWYZ1DK158"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions }; 