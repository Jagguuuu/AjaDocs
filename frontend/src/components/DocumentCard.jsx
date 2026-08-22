import { Link } from "react-router-dom";

function formatUpdated(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DocumentCard({ document }) {
  const isShared = document.access === "view" || document.access === "edit";

  return (
    <article className="document-card">
      <div className="document-card-header">
        <h2>{document.title}</h2>
        {isShared ? (
          <span className={`badge badge-${document.access}`}>
            {document.access === "edit" ? "Edit" : "View"}
          </span>
        ) : null}
      </div>
      <p className="muted">Updated {formatUpdated(document.updated_at)}</p>
      {isShared && document.owner_name ? (
        <p className="muted">From {document.owner_name}</p>
      ) : null}
      <Link className="btn btn-primary" to={`/documents/${document.id}`}>
        Open
      </Link>
    </article>
  );
}
