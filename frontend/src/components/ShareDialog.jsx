import { useEffect, useState } from "react";
import api, { formatApiError } from "../api/client";
import ErrorBanner from "./ErrorBanner";

export default function ShareDialog({ documentId, open, onClose }) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const [shares, setShares] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError("");
    setEmail("");
    setPermission("view");
    setLoading(true);
    api
      .get(`/api/documents/${documentId}/shares/`)
      .then((response) => setShares(response.data))
      .catch((err) => setError(formatApiError(err)))
      .finally(() => setLoading(false));
  }, [open, documentId]);

  if (!open) {
    return null;
  }

  const shareDocument = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/api/documents/${documentId}/shares/`, {
        email,
        permission,
      });
      setShares((current) => [...current, data]);
      setEmail("");
      setPermission("view");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const changePermission = async (shareId, nextPermission) => {
    setError("");
    try {
      const { data } = await api.patch(`/api/documents/${documentId}/shares/${shareId}/`, {
        permission: nextPermission,
      });
      setShares((current) => current.map((share) => (share.id === shareId ? data : share)));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const removeShare = async (shareId) => {
    setError("");
    try {
      await api.delete(`/api/documents/${documentId}/shares/${shareId}/`);
      setShares((current) => current.filter((share) => share.id !== shareId));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-labelledby="share-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="share-dialog-title">Share document</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <form className="share-form" onSubmit={shareDocument}>
          <ErrorBanner message={error} />
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              required
            />
          </label>
          <label className="field">
            Permission
            <select value={permission} onChange={(event) => setPermission(event.target.value)}>
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Sharing…" : "Share"}
          </button>
        </form>
        <h3 className="modal-subtitle">Collaborators</h3>
        {loading ? (
          <p className="muted">Loading collaborators…</p>
        ) : shares.length === 0 ? (
          <p className="muted">No collaborators yet.</p>
        ) : (
          <ul className="collaborator-list">
            {shares.map((share) => (
              <li key={share.id} className="collaborator-row">
                <div>
                  <strong>{share.shared_with_name}</strong>
                  <div className="muted">{share.shared_with_email}</div>
                </div>
                <select
                  value={share.permission}
                  onChange={(event) => changePermission(share.id, event.target.value)}
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => removeShare(share.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
