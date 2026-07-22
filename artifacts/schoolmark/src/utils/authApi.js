// src/utils/authApi.js
const FIREBASE_API_KEY = "AIzaSyCy5gO6PVtTKJA37PcT0j4lQJfuBOUKaYA";

const ERROR_MAP = {
  "EMAIL_EXISTS":                  "This email is already registered.",
  "WEAK_PASSWORD":                 "Password must be at least 6 characters.",
  "INVALID_EMAIL":                 "Invalid email address format.",
  "MISSING_EMAIL":                 "Email is required.",
  "MISSING_PASSWORD":              "Password is required.",
  "INVALID_PASSWORD":              "Invalid password format.",
  "OPERATION_NOT_ALLOWED":         "Email/Password sign-in is not enabled. Firebase Console → Authentication → Sign-in method → enable Email/Password.",
  "API_KEY_HTTP_REFERRER_BLOCKED": "API key is restricted. Google Cloud Console → APIs & Services → Credentials → remove HTTP referrer restrictions or add your domain.",
  "TOO_MANY_ATTEMPTS_TRY_LATER":   "Too many attempts. Wait a few minutes.",
};

export async function createAuthUser(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

  let response, data;
  try {
    response = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:             email.trim().toLowerCase(),
        password:          password,
        returnSecureToken: true,
      }),
    });
    data = await response.json();
  } catch (networkErr) {
    throw new Error("Network error — cannot reach Firebase. Check your internet connection.");
  }

  if (!response.ok) {
    console.error("[createAuthUser] Failed:", { status: response.status, error: data?.error });
    const code = data?.error?.message || "UNKNOWN";
    if (ERROR_MAP[code]) throw new Error(ERROR_MAP[code]);
    for (const [key, msg] of Object.entries(ERROR_MAP)) {
      if (code.startsWith(key)) throw new Error(msg);
    }
    throw new Error(`Firebase error (${response.status}): ${code}`);
  }

  return { uid: data.localId, email: data.email, idToken: data.idToken };
}
