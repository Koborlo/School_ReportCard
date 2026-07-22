# SchoolMark GH — JHS Terminal Report Web App

A full-stack real-time school marks management system for Ghana JHS (Basic 7–9).
Built with **React + Firebase**.

---

## 🚀 Quick Setup (15 minutes)

### Step 1 — Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it `schoolmark-gh`
3. Disable Google Analytics (optional) → **Create project**

### Step 2 — Enable Firebase Services
In your Firebase project:
- **Authentication** → Get started → **Email/Password** → Enable → Save
- **Firestore Database** → Create database → **Start in production mode** → choose a region close to Ghana (e.g. `europe-west1`) → Done

### Step 3 — Get Your Config
- Go to **Project Settings** (⚙ gear icon) → **Your apps** → **Web app** (`</>`)
- Register app name: `schoolmark-web` → click Register
- Copy the `firebaseConfig` object shown

### Step 4 — Add Config to App
Open `src/firebase.js` and replace the placeholder values:
```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "schoolmark-gh.firebaseapp.com",
  projectId:         "schoolmark-gh",
  storageBucket:     "schoolmark-gh.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
};
```

### Step 5 — Firestore Security Rules
In Firebase Console → Firestore → **Rules**, paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read: if request.auth != null;
    }
    match /settings/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /terms/{termId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /students/{termId}/{classCode}/{studentId} {
      allow read, write: if request.auth != null;
    }
    match /marks/{termId}/{classCode}/{subjectCode}/{studentId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 6 — Create Admin Account
1. In Firebase Console → **Authentication** → **Add user**
2. Enter your admin email + password → Add user
3. Copy the **UID** shown
4. Go to **Firestore** → **Start collection** → Collection ID: `users`
5. Document ID: *(paste the UID)*
6. Add fields:
   - `name` (string): `Head Teacher`
   - `role` (string): `admin`
   - `email` (string): *(your admin email)*

### Step 7 — Install & Run
```bash
npm install
npm start
```
Open http://localhost:3000 → sign in with your admin account.

### Step 8 — First-Time Setup in the App
1. Go to **Settings → Terms** → Create Term (e.g. "Term 1", "2026") → Set Active
2. Go to **Settings → School Info** → Fill in your school details
3. Go to **Students** → Select a class → Paste your class register
4. Go to **Settings → Teachers** → Add each teacher with their assigned subjects & classes

---

## 🌐 Deploy to the Web (Free)

### Option A — Vercel (Recommended)
```bash
npm install -g vercel
npm run build
vercel --prod
```
Your app gets a URL like `https://schoolmark-gh.vercel.app`

### Option B — Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select build/ as public dir, SPA=yes
npm run build
firebase deploy
```

---

## 👩‍🏫 How Teachers Use It
1. Admin shares the website URL + their login credentials
2. Teacher logs in → sees only their assigned subjects and classes
3. Opens a mark sheet → enters Task 1–4 and Exam scores
4. Marks auto-save and sync in real time — no Save button needed
5. Grades, totals, positions, and proficiency levels calculate automatically

## 🖨 Report Cards
- Admin → **Report Cards** → select class → click **⬇ Download PDF** next to each student
- Each PDF is a professional A4 report card with all subjects, grades, positions, and signature lines

---

## 📁 Project Structure
```
src/
├── firebase.js              ← Firebase config (edit this first)
├── App.jsx                  ← Router + auth wrapper
├── hooks/useAuth.js         ← Auth context
├── utils/
│   ├── constants.js         ← Classes, subjects, grading scale, calculations
│   └── db.js                ← All Firestore operations
├── styles/global.css        ← All styles
├── pages/
│   ├── LoginPage.jsx
│   ├── TeacherDashboard.jsx
│   ├── TeacherMarksPage.jsx
│   ├── AdminDashboard.jsx
│   ├── AdminStudents.jsx
│   ├── AdminSettings.jsx
│   └── AdminReports.jsx
└── components/
    ├── shared/
    │   ├── AppShell.jsx         ← Sidebar + layout
    │   └── ReportCardPDF.jsx    ← PDF generator
    └── teacher/
        └── MarkSheet.jsx        ← Real-time mark entry table
```

---

## 🛠 Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + React Router |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Authentication |
| PDF | @react-pdf/renderer |
| Hosting | Vercel / Firebase Hosting |
| Cost | **Free** (Firebase Spark plan covers small schools) |

---

Built for Ghana Education Service · JHS Curriculum · GES Grading Scale
