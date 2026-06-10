import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCy5gO6PVtTKJA37PcT0j4lQJfuBOUKaYA",
  authDomain: "schoolmark-gh.firebaseapp.com",
  projectId: "schoolmark-gh",
  storageBucket: "schoolmark-gh.firebasestorage.app",
  messagingSenderId: "504392563457",
  appId: "1:504392563457:web:e205408ca7f1a7b4c1b900"
};

const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingFirebaseConfig.join(", ")}`
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
