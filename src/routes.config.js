import { lazy } from 'react';

const LoginPage        = lazy(() => import('./pages/LoginPage'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const TeacherMarksPage = lazy(() => import('./pages/TeacherMarksPage'));
const TeacherViewMarks = lazy(() => import('./pages/TeacherViewMarks'));
const AdminDashboard   = lazy(() => import('./pages/AdminDashboard'));
const AdminClasses     = lazy(() => import('./pages/AdminClasses'));
const AdminTeachers    = lazy(() => import('./pages/AdminTeachers'));
const AdminStudents    = lazy(() => import('./pages/AdminStudents'));
const AdminOverview    = lazy(() => import('./pages/AdminOverview'));
const AdminReports     = lazy(() => import('./pages/AdminReports'));
const AdminSettings    = lazy(() => import('./pages/AdminSettings'));

export const ROUTES = {
  public: [{ path: '/login', element: LoginPage }],
  teacher: [
    { path: '/teacher', element: TeacherDashboard },
    { path: '/teacher/marks', element: TeacherMarksPage },
    { path: '/teacher/view', element: TeacherViewMarks },
  ],
  admin: [
    { path: '/admin', element: AdminDashboard },
    { path: '/admin/classes', element: AdminClasses },
    { path: '/admin/teachers', element: AdminTeachers },
    { path: '/admin/students', element: AdminStudents },
    { path: '/admin/overview', element: AdminOverview },
    { path: '/admin/reports', element: AdminReports },
    { path: '/admin/settings', element: AdminSettings },
  ],
};
