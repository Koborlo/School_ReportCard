// src/hooks/useAuth.js
import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase";  // Add functions to your firebase.js
import { getUser } from "../utils/db";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const prof = await getUser(firebaseUser.uid);
          setProfile(prof);
        } catch (err) {
          console.error("Failed to load profile:", err);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      const prof = await getUser(cred.user.uid);
      if (!prof) {
        await signOut(auth);
        throw new Error("User profile not found. Contact your administrator.");
      }
      return prof;
    } catch (err) {
      if (err.message.includes("profile not found")) throw err;
      await signOut(auth);
      throw new Error("Failed to load user profile. Please try again.");
    }
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // ── Cloud Function: Create Teacher (admin stays logged in) ──
  async function createTeacher(email, password, profileData) {
    const createTeacherFn = httpsCallable(functions, "createTeacher");
    const result = await createTeacherFn({ email, password, profileData });
    return result.data.uid;
  }

  // ── Cloud Function: Delete Teacher ──
  async function deleteTeacher(uid) {
    const deleteTeacherFn = httpsCallable(functions, "deleteTeacher");
    await deleteTeacherFn({ uid });
  }

  // ── Cloud Function: List Teachers ──
  async function listTeachers() {
    const listTeachersFn = httpsCallable(functions, "listTeachers");
    const result = await listTeachersFn();
    return result.data.teachers;
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, logout, resetPassword,
      createTeacher, deleteTeacher, listTeachers,
      isAdmin:   profile?.role === "admin",
      isTeacher: profile?.role === "teacher",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}