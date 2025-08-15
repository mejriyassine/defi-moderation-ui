import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCxk1c8V0jDw-F4ZO_gxFAPLPr_k4mYX0k",
  authDomain: "defi-du-jour.firebaseapp.com",
  projectId: "defi-du-jour",
  storageBucket: "defi-du-jour.firebasestorage.app",
  messagingSenderId: "73332910110",
  appId: "1:73332910110:web:463ac78e16944a4d5ae60f",
  measurementId: "G-FZ7NZ1E6TL",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  // Uncomment these lines if you want to use Firebase emulators
  // connectAuthEmulator(auth, 'http://localhost:9099');
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;
