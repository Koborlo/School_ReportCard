// src/hooks/useAuth.js
import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";
import { getUser, saveUser } from "../utils/db";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const prof = await getUser(firebaseUser.uid);
        setProfile(prof);
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
    const prof = await getUser(cred.user.uid);
    if (!prof) throw new Error("User profile not found. Contact your administrator.");
    return prof;
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // Admin-only: create a teacher account
  async function createTeacher(email, password, profileData) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await saveUser(cred.user.uid, {
      email,
      role: "teacher",
      ...profileData,
      createdAt: new Date().toISOString(),
    });
    return cred.user.uid;
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, logout, resetPassword, createTeacher,
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
