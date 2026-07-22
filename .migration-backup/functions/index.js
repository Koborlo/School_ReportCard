// functions/index.js  (Firebase Cloud Functions v2)
// Deploy with: firebase deploy --only functions

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const auth = getAuth();
const db = getFirestore();

// ── Helper: Verify caller is admin ────────────────────────────────────────────
async function verifyAdmin(authToken) {
  if (!authToken) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const decoded = await auth.verifyIdToken(authToken);
  const userDoc = await db.collection("users").doc(decoded.uid).get();

  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can perform this action.");
  }

  return decoded.uid;
}

// ── Callable: Create Teacher Account ─────────────────────────────────────────
exports.createTeacher = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    const { email, password, profileData } = request.data;

    // Verify admin (no optional chaining)
    const token = request.auth && request.auth.token ? request.auth.token : null;
    await verifyAdmin(token);

    // Validate inputs
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Valid email is required.");
    }
    if (!password || password.length < 6) {
      throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }
    if (!profileData || !profileData.name || !profileData.name.trim()) {
      throw new HttpsError("invalid-argument", "Teacher name is required.");
    }

    try {
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        displayName: profileData.name.trim(),
      });

      // Save profile to Firestore
      await db.collection("users").doc(userRecord.uid).set({
        email: email.trim().toLowerCase(),
        name: profileData.name.trim(),
        role: "teacher",
        subjects: profileData.subjects || [],
        classes: profileData.classes || [],
        createdAt: new Date().toISOString(),
        createdBy: request.auth && request.auth.uid ? request.auth.uid : null,
      });

      return {
        success: true,
        uid: userRecord.uid,
        message: "Teacher account created for " + profileData.name,
      };

    } catch (err) {
      console.error("createTeacher error:", err);

      if (err.code === "auth/email-already-exists" || err.code === "auth/uid-already-exists") {
        throw new HttpsError("already-exists", "A user with this email already exists.");
      }

      throw new HttpsError("internal", "Failed to create teacher. Please try again.");
    }
  }
);

// ── Callable: Delete Teacher Account ──────────────────────────────────────────
exports.deleteTeacher = onCall(
  { region: "us-central1" },
  async (request) => {
    const { uid } = request.data;

    const token = request.auth && request.auth.token ? request.auth.token : null;
    await verifyAdmin(token);

    if (!uid) {
      throw new HttpsError("invalid-argument", "Teacher UID is required.");
    }

    try {
      // Verify target is actually a teacher
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists || userDoc.data().role !== "teacher") {
        throw new HttpsError("not-found", "Teacher not found.");
      }

      // Delete auth user first (idempotent)
      await auth.deleteUser(uid).catch(function() {});

      // Delete Firestore profile
      await db.collection("users").doc(uid).delete();

      return { success: true, message: "Teacher deleted successfully." };

    } catch (err) {
      console.error("deleteTeacher error:", err);
      throw new HttpsError("internal", "Failed to delete teacher.");
    }
  }
);

// ── Callable: List All Teachers ──────────────────────────────────────────────
exports.listTeachers = onCall(
  { region: "us-central1" },
  async (request) => {
    const token = request.auth && request.auth.token ? request.auth.token : null;
    await verifyAdmin(token);

    const snapshot = await db.collection("users")
      .where("role", "==", "teacher")
      .orderBy("name")
      .get();

    const teachers = snapshot.docs.map(function(doc) {
      return {
        uid: doc.id,
        email: doc.data().email,
        name: doc.data().name,
        role: doc.data().role,
        subjects: doc.data().subjects || [],
        classes: doc.data().classes || [],
        createdAt: doc.data().createdAt,
      };
    });

    return { teachers: teachers };
  }
);