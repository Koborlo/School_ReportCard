// src/utils/authApi.js
// Firebase Auth REST API — creates teachers WITHOUT logging out admin
// Works on Spark (free) plan, no Cloud Functions needed

const FIREBASE_API_KEY = "AIzaSyCy5gO6PVtTKJA37PcT0j4lQJfuBOUKaYA";

/**
 * Create a Firebase Auth user via REST API
 * This does NOT affect the current admin session!
 */
export async function createAuthUser(email, password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: false, // Don't need tokens
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    // Map Firebase errors to friendly messages
    const errorMap = {
      'EMAIL_EXISTS': 'This email is already registered.',
      'INVALID_EMAIL': 'Invalid email address format.',
      'WEAK_PASSWORD': 'Password is too weak. Use at least 6 characters.',
      'INVALID_PASSWORD': 'Invalid password format.',
    };
    const message = errorMap[data.error?.message] || data.error?.message || 'Failed to create account';
    throw new Error(message);
  }

  return {
    uid: data.localId,
    email: data.email,
  };
}

/**
 * Delete an auth user via REST API (cleanup on failure)
 */
export async function deleteAuthUser(idToken) {
  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
}