// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrir8nGUmjgO6pxCS9uS4IcX0tUVQRT0Y",
  authDomain: "smart-expense-tracker-eed65.firebaseapp.com",
  projectId: "smart-expense-tracker-eed65",
  storageBucket: "smart-expense-tracker-eed65.firebasestorage.app",
  messagingSenderId: "541778667653",
  appId: "1:541778667653:web:2916e2214a4b63084b21ec",
  measurementId: "G-NMBC5T0893"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

// Export Auth and Firestore for our app
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);
export { analytics };
export default app;