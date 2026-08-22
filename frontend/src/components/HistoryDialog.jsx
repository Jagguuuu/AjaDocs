import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../api/client";
import ErrorBanner from "./ErrorBanner";

function formatRelative(value) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
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

function ActionIcon({ action }) {
  if (action === "created") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (action === "renamed") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 16h10M7.2 13.2 12.8 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6.2 13.8 8 12.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.4 4.2 15.8 7.6M4 16l3.2-.6L15.2 7.4a1.5 1.5 0 0 0 0-2.1L14.7 5a1.5 1.5 0 0 0-2.1 0L5.2 12.4 4 16Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HistoryDialog({ open, onClose }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError("");
    setLoading(true);
    api
      .get("/api/documents/activity/")
      .then((response) => setItems(response.data))
      .catch((err) => setError(formatApiError(err)))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const openDocument = (documentId) => {
    onClose();
    navigate(`/documents/${documentId}`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="history-kicker">Activity</p>
            <h2 id="history-dialog-title">History</h2>
          </div>
          <button type="button" className="history-close" onClick={onClose} aria-label="Close history">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="muted history-intro">
          Changes from owners and editors on documents you can access. View-only shares show owner edits only.
        </p>
        <ErrorBanner message={error} />
        {loading ? (
          <div className="history-loading">
            <div className="skeleton skeleton-stat" />
            <div className="skeleton skeleton-stat" />
          </div>
        ) : items.length === 0 ? (
          <div className="history-empty">
            <span className="history-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 6.5V10l2.4 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <p>No activity yet</p>
            <small>Create or edit a document and it will show up here.</small>
          </div>
        ) : (
          <ol className="history-timeline">
            {items.map((item) => (
              <li key={item.id} className={`history-item role-${item.actor_role} action-${item.action}`}>
                <span className="history-node" aria-hidden="true">
                  <ActionIcon action={item.action} />
                </span>
                <div className="history-card">
                  <div className="history-card-top">
                    <span className={`dash-avatar history-avatar ${item.actor_role === "owner" ? "tone-blue" : "tone-purple"}`}>
                      {initials(item.actor_name)}
                    </span>
                    <div className="history-copy">
                      <p className="history-message">{item.message}</p>
                      <p className="history-meta">
                        <span>{item.actor_name}</span>
                        <span className={`access-pill access-${item.actor_role === "owner" ? "owner" : "edit"}`}>
                          {item.actor_role === "owner" ? "Owner" : "Editor"}
                        </span>
                      </p>
                    </div>
                    <time dateTime={item.created_at}>{formatRelative(item.created_at)}</time>
                  </div>
                  <button
                    type="button"
                    className="history-doc-link"
                    onClick={() => openDocument(item.document_id)}
                  >
                    Open {item.document_title}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
