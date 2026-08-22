import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AppShell from "../components/AppShell";
import ErrorBanner from "../components/ErrorBanner";
import { downloadMarkdown } from "../export/downloadMarkdown";
import { htmlToMarkdown } from "../export/htmlToMarkdown";

function formatUpdated(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function avatarTone(name) {
  const sum = String(name || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return ["tone-blue", "tone-green", "tone-purple"][sum % 3];
}

function EmptyState({ title, body, actions }) {
  return (
    <div className="dashboard-empty">
      <svg className="dashboard-empty-art" viewBox="0 0 180 132" fill="none" aria-hidden="true">
        <rect className="empty-sheet-back" x="24" y="28" width="84" height="86" rx="14" />
        <rect className="empty-accent" x="40" y="46" width="52" height="8" rx="4" />
        <rect className="empty-line" x="40" y="62" width="40" height="6" rx="3" />
        <rect className="empty-line" x="40" y="76" width="48" height="6" rx="3" />
        <rect className="empty-sheet-front" x="72" y="18" width="84" height="92" rx="14" />
        <rect className="empty-accent" x="88" y="36" width="36" height="8" rx="4" />
        <rect className="empty-line" x="88" y="54" width="52" height="6" rx="3" />
        <rect className="empty-line" x="88" y="68" width="44" height="6" rx="3" />
        <circle className="empty-check" cx="148" cy="104" r="16" />
        <path d="M142 104.5 146.5 109l8-10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <h3>{title}</h3>
      <p>{body}</p>
      {actions ? <div className="dashboard-empty-actions">{actions}</div> : null}
    </div>
  );
}

function DashboardDocumentCard({ doc }) {
  const isShared = doc.access === "view" || doc.access === "edit";
  const ownerLabel = isShared ? doc.owner_name : "You";
  const accessLabel = doc.access === "owner" ? "Owner" : doc.access === "edit" ? "Edit" : "View";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    window.document.addEventListener("mousedown", onPointerDown);
    return () => window.document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const exportDocument = () => {
    downloadMarkdown(doc.title || "Untitled", htmlToMarkdown(doc.content || ""));
    setMenuOpen(false);
  };

  return (
    <article className={`dash-doc-card${isShared ? " is-shared" : ""}`}>
      <div className="dash-doc-more-wrap" ref={menuRef}>
        <button
          type="button"
          className="dash-doc-more"
          aria-label="Document actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ···
        </button>
        {menuOpen ? (
          <div className="dash-doc-menu" role="menu">
            <Link role="menuitem" to={`/documents/${doc.id}`} onClick={() => setMenuOpen(false)}>
              Open
            </Link>
            <button type="button" role="menuitem" onClick={exportDocument}>
              Export Markdown
            </button>
          </div>
        ) : null}
      </div>
      <Link className="dash-doc-body" to={`/documents/${doc.id}`}>
        <div className="dash-doc-top">
          <span className="dash-file-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M7 3.5h6.2L19 9.2V19a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 19V6a2.5 2.5 0 0 1 2.5-2.5Z"
                fill="currentColor"
                fillOpacity="0.18"
                stroke="currentColor"
              />
              <path d="M13.2 3.6V8a1.2 1.2 0 0 0 1.2 1.2H19" stroke="currentColor" />
            </svg>
          </span>
        </div>
        <h2>{doc.title}</h2>
        <p className="dash-doc-meta">Last edited {formatUpdated(doc.updated_at)}</p>
        <div className="dash-doc-footer">
          <span className={`dash-avatar ${avatarTone(ownerLabel)}`} title={ownerLabel}>
            {initials(ownerLabel)}
          </span>
          <span className={`access-pill access-${doc.access}`}>{accessLabel}</span>
        </div>
      </Link>
    </article>
  );
}

function DocumentSection({ title, subtitle, documents, emptyTitle, emptyBody, emptyActions }) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="dashboard-count">{documents.length}</span>
      </div>
      {documents.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} actions={emptyActions} />
      ) : (
        <div className="dash-doc-grid">
          {documents.map((document) => (
            <DashboardDocumentCard key={document.id} doc={document} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const importInput = useRef(null);
  const searchRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get("/api/documents/")
      .then((response) => setDocuments(response.data))
      .catch((err) => setError(formatApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const createDocument = async () => {
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post("/api/documents/", {
        title: "Untitled",
        content: "",
      });
      navigate(`/documents/${data.id}`, { state: { focusTitle: true } });
    } catch (err) {
      setError(formatApiError(err));
      setCreating(false);
    }
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setImporting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/api/documents/import/", formData);
      navigate(`/documents/${data.id}`);
    } catch (err) {
      setError(formatApiError(err));
      setImporting(false);
    }
  };

  const query = search.trim().toLowerCase();
  const matchesSearch = (document) =>
    !query ||
    document.title.toLowerCase().includes(query) ||
    (document.owner_name || "").toLowerCase().includes(query);

  const ownedAll = documents.filter((document) => document.access === "owner");
  const sharedAll = documents.filter((document) => document.access !== "owner");
  const owned = ownedAll.filter(matchesSearch);
  const shared = sharedAll.filter(matchesSearch);
  const editableCount = documents.filter(
    (document) => document.access === "owner" || document.access === "edit",
  ).length;
  const searching = search.trim().length > 0;

  const actionButtons = (
    <>
      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => importInput.current?.click()}
        disabled={importing}
      >
        {importing ? "Importing…" : "Import"}
      </button>
      <button className="btn btn-primary" type="button" onClick={createDocument} disabled={creating}>
        {creating ? "Creating…" : "New Document"}
      </button>
    </>
  );

  return (
    <AppShell
      actions={
        <>
          <input
            ref={importInput}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            hidden
            onChange={importFile}
          />
          <label className="dashboard-search">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14.5 17.5 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search documents"
              aria-label="Search documents"
            />
            <kbd>Ctrl+K</kbd>
          </label>
          {actionButtons}
          <span className={`dash-avatar topbar-avatar ${avatarTone(user?.username)}`} title={user?.username}>
            {initials(user?.username)}
          </span>
        </>
      }
    >
      <div className="dashboard">
        <div className="dashboard-body">
          <div className="dashboard-intro">
            <p className="dashboard-kicker">Workspace</p>
            <h1>Welcome back{user?.username ? `, ${user.username}` : ""}</h1>
          </div>
          <ErrorBanner message={error} />
          {loading ? (
            <div className="dashboard-loading">
              <div className="skeleton-stats">
                <div className="skeleton skeleton-stat" />
                <div className="skeleton skeleton-stat" />
                <div className="skeleton skeleton-stat" />
              </div>
              <div className="skeleton-grid">
                <div className="skeleton skeleton-card" />
                <div className="skeleton skeleton-card" />
                <div className="skeleton skeleton-card" />
              </div>
            </div>
          ) : (
            <>
              <div className="dashboard-stats">
                <article className="stat-card stat-blue">
                  <div className="stat-top">
                    <span className="stat-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M7 4h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" />
                      </svg>
                    </span>
                  </div>
                  <strong>{ownedAll.length}</strong>
                  <p>My documents</p>
                  <small>Files you own in this workspace</small>
                </article>
                <article className="stat-card stat-green">
                  <div className="stat-top">
                    <span className="stat-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="9" cy="10" r="3" stroke="currentColor" fill="currentColor" fillOpacity="0.2" />
                        <circle cx="16" cy="11" r="2.5" stroke="currentColor" fill="currentColor" fillOpacity="0.12" />
                        <path d="M4.5 18c.6-2.4 2.4-4 4.5-4s3.9 1.6 4.5 4" stroke="currentColor" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                  <strong>{sharedAll.length}</strong>
                  <p>Shared with me</p>
                  <small>Invites from other people</small>
                </article>
                <article className="stat-card stat-purple">
                  <div className="stat-top">
                    <span className="stat-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M5 16.5 12 5l7 11.5H5Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" />
                        <path d="M12 10v4.5" stroke="currentColor" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                  <strong>{editableCount}</strong>
                  <p>Editable</p>
                  <small>Documents you can change</small>
                </article>
              </div>

              <DocumentSection
                title="My Documents"
                subtitle="Documents you own and can share."
                documents={owned}
                emptyTitle={searching ? "No matching documents" : "No documents yet"}
                emptyBody={
                  searching
                    ? "Try a different title or owner name."
                    : "Create a document or import a .txt / .md file to get started."
                }
                emptyActions={searching ? null : actionButtons}
              />
              <DocumentSection
                title="Shared With Me"
                subtitle="Files others have invited you to view or edit."
                documents={shared}
                emptyTitle={searching ? "No matching shared documents" : "Nothing shared with you yet"}
                emptyBody={
                  searching
                    ? "Try a different search term."
                    : "When someone shares a document, it will appear here."
                }
              />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
