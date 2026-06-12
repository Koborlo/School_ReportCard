// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import "./styles/global.css";

import LoginPage         from "./pages/LoginPage";
import TeacherDashboard  from "./pages/TeacherDashboard";
import TeacherMarksPage  from "./pages/TeacherMarksPage";
import AdminDashboard    from "./pages/AdminDashboard";
import AdminClasses      from "./pages/AdminClasses";
import AdminTeachers     from "./pages/AdminTeachers";
import AdminStudents     from "./pages/AdminStudents";
import AdminOverview     from "./pages/AdminOverview";
import AdminReports      from "./pages/AdminReports";
import AdminSettings     from "./pages/AdminSettings";

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div className="spinner"/>
    </div>
  );
}

function PrivateRoute({ children, role }) {
  const { user, profile, loading } = useAuth();
  if (loading)                       return <Spinner/>;
  if (!user)                         return <Navigate to="/login" replace/>;
  if (role && profile?.role !== role)return <Navigate to="/login" replace/>;
  return children;
}

function RootRedirect() {
  const { profile, loading } = useAuth();
  if (loading)               return <Spinner/>;
  if (!profile)              return <Navigate to="/login" replace/>;
  return <Navigate to={profile.role === "admin" ? "/admin" : "/teacher"} replace/>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>

      {/* ── Teacher routes ── */}
      <Route path="/teacher" element={
        <PrivateRoute role="teacher"><TeacherDashboard/></PrivateRoute>
      }/>
      <Route path="/teacher/marks" element={
        <PrivateRoute role="teacher"><TeacherMarksPage/></PrivateRoute>
      }/>
      <Route path="/teacher/view" element={
        <PrivateRoute role="teacher"><TeacherMarksPage/></PrivateRoute>
      }/>

      {/* ── Admin routes ── */}
      <Route path="/admin" element={
        <PrivateRoute role="admin"><AdminDashboard/></PrivateRoute>
      }/>
      <Route path="/admin/classes" element={
        <PrivateRoute role="admin"><AdminClasses/></PrivateRoute>
      }/>
      <Route path="/admin/teachers" element={
        <PrivateRoute role="admin"><AdminTeachers/></PrivateRoute>
      }/>
      <Route path="/admin/students" element={
        <PrivateRoute role="admin"><AdminStudents/></PrivateRoute>
      }/>
      <Route path="/admin/overview" element={
        <PrivateRoute role="admin"><AdminOverview/></PrivateRoute>
      }/>
      <Route path="/admin/reports" element={
        <PrivateRoute role="admin"><AdminReports/></PrivateRoute>
      }/>
      <Route path="/admin/settings" element={
        <PrivateRoute role="admin"><AdminSettings/></PrivateRoute>
      }/>

      {/* ── Default ── */}
      <Route path="/" element={<RootRedirect/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style:   { fontFamily:"'DM Sans',sans-serif", fontSize:13, borderRadius:8 },
            success: { style:{ background:"var(--dg)", color:"#fff" } },
            error:   { style:{ background:"#B71C1C",   color:"#fff" } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
