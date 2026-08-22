import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api, { formatApiError } from "../api/client";
import AppShell from "../components/AppShell";
import ErrorBanner from "../components/ErrorBanner";
import RichEditor from "../components/RichEditor";
import ShareDialog from "../components/ShareDialog";
import { downloadMarkdown } from "../export/downloadMarkdown";
import { htmlToMarkdown } from "../export/htmlToMarkdown";

function formatUpdated(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function countsFromHtml(html) {
  const text = html
    ? html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
    : "";
  return {
    words: text ? text.split(" ").length : 0,
    characters: text.length,
  };
}

function accessLabel(access) {
  if (access === "owner") {
    return "Owner";
  }
  if (access === "edit") {
    return "Edit";
  }
  return "View";
}

export default function EditorPage() {
  const { id } = useParams();
  const location = useLocation();
  const titleInputRef = useRef(null);
  const focusTitleOnLoad = useRef(Boolean(location.state?.focusTitle));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [access, setAccess] = useState("owner");
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle");
  const [shareOpen, setShareOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const lastSaved = useRef({ title: "", content: "" });
  const skipSave = useRef(true);
  const canEdit = access === "owner" || access === "edit";
  const isOwner = access === "owner";
  const { words, characters } = countsFromHtml(content);

  useEffect(() => {
    let cancelled = false;
    skipSave.current = true;
    focusTitleOnLoad.current = Boolean(location.state?.focusTitle);
    setEditingTitle(false);
    setLoading(true);
    setError("");
    setSaveState("idle");

    api
      .get(`/api/documents/${id}/`)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setTitle(response.data.title);
        setContent(response.data.content || "");
        setAccess(response.data.access);
        setUpdatedAt(response.data.updated_at || "");
        lastSaved.current = {
          title: response.data.title,
          content: response.data.content || "",
        };
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatApiError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (loading || !canEdit || !focusTitleOnLoad.current) {
      return;
    }
    focusTitleOnLoad.current = false;
    setEditingTitle(true);
  }, [loading, canEdit]);

  useEffect(() => {
    if (!editingTitle) {
      return;
    }
    const input = titleInputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    input.select();
  }, [editingTitle]);

  useEffect(() => {
    if (loading || !canEdit) {
      return;
    }
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }
    if (
      trimmedTitle === lastSaved.current.title &&
      content === lastSaved.current.content
    ) {
      return;
    }

    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.patch(`/api/documents/${id}/`, {
          title: trimmedTitle,
          content,
        });
        lastSaved.current = { title: data.title, content: data.content };
        if (data.updated_at) {
          setUpdatedAt(data.updated_at);
        }
        setSaveState("saved");
      } catch (err) {
        setSaveState("error");
        setError(formatApiError(err));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, content, id, loading, canEdit]);

  const finishTitleEdit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(lastSaved.current.title || "Untitled");
    } else if (trimmed !== title) {
      setTitle(trimmed);
    }
    setEditingTitle(false);
  };

  const saveLabel =
    saveState === "saving"
      ? "Saving"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "";

  return (
    <AppShell
      actions={
        <>
          <Link to="/" className="editor-back" aria-label="Back to documents">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {!loading && !(error && !title) ? (
            <>
              {canEdit && editingTitle ? (
                <input
                  ref={titleInputRef}
                  className="editor-title-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={finishTitleEdit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setTitle(lastSaved.current.title || "Untitled");
                      setEditingTitle(false);
                    }
                  }}
                  aria-label="Document title"
                  placeholder="Name this document"
                  maxLength={200}
                />
              ) : (
                <button
                  type="button"
                  className={`editor-title-button${title === "Untitled" ? " is-untitled" : ""}`}
                  onClick={() => {
                    if (canEdit) {
                      setEditingTitle(true);
                    }
                  }}
                  aria-label={canEdit ? "Rename document" : "Document title"}
                  title={canEdit ? "Click to rename" : title}
                  disabled={!canEdit}
                >
                  <span className="editor-title-text">{title || "Untitled"}</span>
                  {canEdit ? (
                    <span className="editor-title-hint">
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="M12.4 4.2 15.8 7.6M4 16l3.2-.6L15.2 7.4a1.5 1.5 0 0 0 0-2.1L14.7 5a1.5 1.5 0 0 0-2.1 0L5.2 12.4 4 16Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Rename
                    </span>
                  ) : null}
                </button>
              )}
              <div className="editor-header-meta">
                {updatedAt ? <span className="editor-edited">Last edited {formatUpdated(updatedAt)}</span> : null}
                {saveLabel ? <span className={`save-badge ${saveState}`}>{saveLabel}</span> : null}
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => downloadMarkdown(title.trim() || "Untitled", htmlToMarkdown(content))}
                >
                  Export
                </button>
                {isOwner ? (
                  <button className="btn btn-primary" type="button" onClick={() => setShareOpen(true)}>
                    Share
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </>
      }
    >
      <div className="editor-workspace">
        {loading ? (
          <div className="screen-center">
            <div className="skeleton skeleton-stat" style={{ width: 280, height: 48 }} />
          </div>
        ) : error && !title ? (
          <ErrorBanner message={error} />
        ) : (
          <>
            <ShareDialog documentId={id} open={shareOpen} onClose={() => setShareOpen(false)} />
            {access === "view" ? (
              <div className="readonly-banner">Read-only access</div>
            ) : null}
            <ErrorBanner message={error} />
            <RichEditor
              documentId={id}
              content={content}
              onChange={setContent}
              editable={canEdit}
            />
            <footer className="editor-footer">
              <span>
                {words} {words === 1 ? "word" : "words"}
                <span className="editor-footer-dot">·</span>
                {characters} {characters === 1 ? "character" : "characters"}
              </span>
              <span className={`access-pill access-${access}`}>{accessLabel(access)}</span>
              <span className="editor-shortcuts">Ctrl+B Bold · Ctrl+I Italic · Ctrl+U Underline</span>
            </footer>
          </>
        )}
      </div>
    </AppShell>
  );
}
