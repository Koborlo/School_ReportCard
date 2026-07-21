// src/hooks/useAuth.js
import { useState, useEffect, useContext, createContext } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { createAuthUser } from "../utils/authApi";

const AuthContext = createContext({
  user: null,
  profile: null,        // ✅ Named "profile" to match AppShell/PrivateRoute
  loading: true,
  login: () => {},
  logout: () => {},
  createTeacher: () => {},
  isAdmin: false,
  isTeacher: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);  // ✅ Named "profile"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            setProfile(snap.data());
          } else {
            console.warn("No user document found for:", firebaseUser.uid);
            setProfile(null);
          }
        } catch (e) {
          console.error("Error fetching user data:", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const createTeacher = async (email, password, teacherProfile) => {
    const adminUser = auth.currentUser;
    if (!adminUser) {
      throw new Error("You must be logged in to create teachers");
    }

    // Verify admin role
    let adminDoc;
    try {
      adminDoc = await getDoc(doc(db, "users", adminUser.uid));
    } catch (e) {
      throw new Error("Failed to verify admin privileges");
    }

    if (!adminDoc.exists() || adminDoc.data().role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Create auth user via REST API (admin session preserved!)
    const authUser = await createAuthUser(email, password);

    // Write teacher profile to Firestore
    await setDoc(doc(db, "users", authUser.uid), {
      name: teacherProfile.name,
      email: email,
      subjects: teacherProfile.subjects || [],
      classes: teacherProfile.classes || [],
      role: "teacher",
      createdAt: serverTimestamp(),
      createdBy: adminUser.uid,
      updatedAt: serverTimestamp(),
    });

    return { success: true, uid: authUser.uid, email };
  };

  const value = {
    user,
    profile,              // ✅ Matches AppShell.jsx expectation
    login,
    logout,
    createTeacher,
    loading,
    isAdmin: profile?.role === "admin",      // ✅ Matches AppShell.jsx
    isTeacher: profile?.role === "teacher",
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};