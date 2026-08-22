import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import HistoryDialog from "./HistoryDialog";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({ children, actions }) {
  const { user, logout } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 800) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !historyOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, historyOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      {menuOpen ? <button type="button" className="menu-backdrop" onClick={closeMenu} aria-label="Close menu" /> : null}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
          <button type="button" className="sidebar-close" onClick={closeMenu} aria-label="Close menu">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className="sidebar-link" end onClick={closeMenu}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M6 3.5h5.2L15.5 8v8.2A1.8 1.8 0 0 1 13.7 18H6.3A1.8 1.8 0 0 1 4.5 16.2V5.3A1.8 1.8 0 0 1 6.3 3.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M11.2 3.7V7.4H15" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Documents
          </NavLink>
          <button
            type="button"
            className={`sidebar-link${historyOpen ? " active" : ""}`}
            onClick={() => {
              closeMenu();
              setHistoryOpen(true);
            }}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 6.5V10l2.4 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            History
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">{user?.username}</div>
          <button type="button" className="btn btn-ghost logout-btn" onClick={logout}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M8.5 4.5H5.8A1.8 1.8 0 0 0 4 6.3v7.4A1.8 1.8 0 0 0 5.8 15.5h2.7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M8.2 10H16m0 0-2.4-2.4M16 10l-2.4 2.4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Log out
          </button>
        </div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <button
            type="button"
            className="hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="topbar-brand">
            <Logo />
          </div>
          <div className="topbar-actions">
            {actions}
            <ThemeToggle />
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
      <HistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
