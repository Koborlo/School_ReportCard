const FIREBASE_API_KEY = "AIzaSyCy5gO6PVtTKJA37PcT0j4lQJfuBOUKaYA";

export async function createAuthUser(email, password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,  // ✅ MUST be true, not false
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    // Firebase REST API returns error.message directly, not error.errors[0].message
    const firebaseError = data.error?.message || 'Unknown error';
    
    const errorMap = {
      'EMAIL_EXISTS': 'This email is already registered.',
      'INVALID_EMAIL': 'Invalid email address format.',
      'WEAK_PASSWORD': 'Password is too weak. Use at least 6 characters.',
      'INVALID_PASSWORD': 'Invalid password format.',
      'MISSING_EMAIL': 'Email is required.',
      'MISSING_PASSWORD': 'Password is required.',
      'ADMIN_ONLY_OPERATION': 'This operation requires admin privileges.',
    };
    
    const message = errorMap[firebaseError] || firebaseError;
    throw new Error(message);
  }

  return {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,  // May be useful later
  };
}