import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SubjectsProvider } from './hooks/useSubjects';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorFallback from './components/ErrorFallback';
import { toastConfig } from './config/toast';
import { ROUTES } from './routes.config';
import './styles/global.css';

// Lazy load all pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const TeacherMarksPage = lazy(() => import('./pages/TeacherMarksPage'));
const TeacherViewMarks = lazy(() => import('./pages/TeacherViewMarks'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminClasses = lazy(() => import('./pages/AdminClasses'));
const AdminTeachers = lazy(() => import('./pages/AdminTeachers'));
const AdminStudents = lazy(() => import('./pages/AdminStudents'));
const AdminOverview = lazy(() => import('./pages/AdminOverview'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));

const routeComponents = {
  LoginPage, TeacherDashboard, TeacherMarksPage, TeacherViewMarks,
  AdminDashboard, AdminClasses, AdminTeachers, AdminStudents,
  AdminOverview, AdminReports, AdminSettings,
};

function PrivateRoute({ children, role }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  if (role && profile?.role !== role) {
    const fallback = profile?.role === 'admin' ? '/admin' : '/teacher';
    return <Navigate to={fallback} replace />;
  }
  
  return children;
}

function RootRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!profile) return <Navigate to="/login" replace />;
  
  const dashboard = profile.role === 'admin' ? '/admin' : '/teacher';
  return <Navigate to={dashboard} replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {ROUTES.teacher.map(({ path, element }) => (
          <Route key={path} path={path} element={
            <PrivateRoute role="teacher">{element}</PrivateRoute>
          } />
        ))}
        
        {ROUTES.admin.map(({ path, element }) => (
          <Route key={path} path={path} element={
            <PrivateRoute role="admin">{element}</PrivateRoute>
          } />
        ))}
        
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubjectsProvider>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <AppRoutes />
            <Toaster {...toastConfig} />
          </ErrorBoundary>
        </SubjectsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}