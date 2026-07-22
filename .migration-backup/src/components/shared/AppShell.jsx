// src/components/shared/AppShell.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ADMIN_NAV = [
  { to: "/admin",          label: "Dashboard",      icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { to: "/admin/classes",  label: "Classes",         icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { to: "/admin/teachers", label: "Teachers",        icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" },
  { to: "/admin/students", label: "Students",        icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
  { to: "/admin/overview", label: "Marks Overview",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { to: "/admin/reports",  label: "Report Cards",    icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" },
  { to: "/admin/settings", label: "Settings",        icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" },
];

const TEACHER_NAV = [
  { to: "/teacher",         label: "My Dashboard",   icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { to: "/teacher/marks",   label: "Enter Marks",    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { to: "/teacher/view",    label: "View My Marks",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

export default function AppShell({ children, title, crumb, actions, termLabel }) {
  const { profile, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const navLinks = isAdmin ? ADMIN_NAV : TEACHER_NAV;
  const initials = profile?.name?.split(" ").map(w => w[0]).slice(0,2).join("") || "?";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>SchoolMark GH</h1>
          <p>Gaddiel Aquaah Methodist</p>
          {termLabel && <span className="term-badge">{termLabel}</span>}
        </div>

        <nav style={{ padding: "8px 0", flex: 1 }}>
          <div className="nav-section">
            {isAdmin ? "Administration" : "My Portal"}
          </div>
          {navLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to} to={to} end={to.split("/").length <= 2}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <Icon d={icon} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div className="user-chip-info">
              <div className="user-chip-name">{profile?.name || "User"}</div>
              <div className="user-chip-role">
                {isAdmin ? "Administrator" : `${profile?.subjects?.join(", ")} Teacher`}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <div className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{title}</span>
            {crumb && <span className="topbar-crumb">/ {crumb}</span>}
          </div>
          <div className="topbar-right">
            <span className="chip chip-green">
              <span className="live-dot" /> Live
            </span>
            {termLabel && <span className="chip chip-gold">{termLabel}</span>}
            {actions}
          </div>
        </div>
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
