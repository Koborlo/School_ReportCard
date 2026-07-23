// src/hooks/useAuth.js
import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { createAuthUser } from "../utils/authApi";
import { getDeletedAuth, removeDeletedAuth } from "../utils/db";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          setProfile(snap.exists() ? { uid: firebaseUser.uid, ...snap.data() } : null);
        } catch (e) {
          console.error("Failed to load profile:", e);
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
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) {
      await signOut(auth);
      throw new Error("NO_PROFILE: Account exists but has no Firestore profile. Add a document in Firestore → users → your UID with role: 'admin'.");
    }
    return { uid: cred.user.uid, ...snap.data() };
  }

  async function logout() { await signOut(auth); }

  async function resetPassword(email) { await sendPasswordResetEmail(auth, email.trim()); }

  async function createTeacher(email, password, teacherProfile) {
    const adminUser = auth.currentUser;
    if (!adminUser) throw new Error("You must be logged in.");

    // Verify admin
    const adminSnap = await getDoc(doc(db, "users", adminUser.uid));
    if (!adminSnap.exists() || adminSnap.data().role !== "admin") {
      throw new Error("Unauthorized: Admin access required.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    let uid;
    let passwordReset = false;

    try {
      // Try to create a brand-new Firebase Auth account
      const newAuth = await createAuthUser(normalizedEmail, password);
      uid = newAuth.uid;
    } catch (err) {
      // EMAIL_EXISTS — check whether this is a previously-deleted teacher's
      // zombie Auth account (profile deleted but Auth account still alive).
      if (!err.message.includes("already registered")) throw err;

      const tombstone = await getDeletedAuth(normalizedEmail);
      if (!tombstone) {
        // Genuinely taken by a different active account
        throw new Error("This email is already in use by another account.");
      }

      // Reuse the existing Auth UID; the teacher will reset their password
      uid = tombstone.uid;
      passwordReset = true;
      await removeDeletedAuth(normalizedEmail);

      // Send a password-reset email so the teacher can set the new password
      await sendPasswordResetEmail(auth, normalizedEmail);
    }

    // Write (or overwrite) the Firestore profile
    await setDoc(doc(db, "users", uid), {
      name:      teacherProfile.name,
      email:     normalizedEmail,
      subjects:  teacherProfile.subjects || [],
      classes:   teacherProfile.classes  || [],
      role:      "teacher",
      createdAt: serverTimestamp(),
      createdBy: adminUser.uid,
      updatedAt: serverTimestamp(),
    });

    return { success: true, uid, passwordReset };
  }

  async function updateTeacher(uid, updates) {
    await setDoc(doc(db, "users", uid), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, logout, resetPassword,
      createTeacher, updateTeacher,
      isAdmin:         profile?.role === "admin",
      isTeacher:       profile?.role === "teacher",
      isAuthenticated: !!user && !!profile,
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
