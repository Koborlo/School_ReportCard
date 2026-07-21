// src/hooks/useAuth.js
import { useState, useEffect, useContext, createContext } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { createAuthUser } from "../utils/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          setUserData(snap.exists() ? snap.data() : null);
        } catch (e) {
          console.error("Error fetching user data:", e);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  /**
   * ✅ CREATE TEACHER — Spark-compatible, no Cloud Functions
   * Uses REST API so admin stays logged in
   */
  const createTeacher = async (email, password, profile) => {
    const adminUser = auth.currentUser;
    if (!adminUser) {
      throw new Error("You must be logged in to create teachers");
    }

    // Verify admin role
    const adminDoc = await getDoc(doc(db, "users", adminUser.uid));
    if (!adminDoc.exists() || adminDoc.data().role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    let newUid = null;

    try {
      // Step 1: Create auth user via REST API (admin session preserved!)
      const authUser = await createAuthUser(email, password);
      newUid = authUser.uid;

      // Step 2: Write teacher profile to Firestore as admin
      await setDoc(doc(db, "users", newUid), {
        name: profile.name,
        email: email,
        subjects: profile.subjects || [],
        classes: profile.classes || [],
        role: "teacher",
        createdAt: serverTimestamp(),
        createdBy: adminUser.uid,
        updatedAt: serverTimestamp(),
      });

      return { success: true, uid: newUid, email };

    } catch (error) {
      // Cleanup: try to delete auth user if Firestore write failed
      // Note: We can't delete via REST without the new user's ID token
      // But the auth user exists without a Firestore doc — that's okay,
      // they just won't be able to log in meaningfully
      
      console.error("Teacher creation failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      login,
      logout,
      createTeacher,
      loading,
      isAdmin: userData?.role === "admin",
      isTeacher: userData?.role === "teacher",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};