import { Link } from "react-router-dom";

export default function Logo() {
  return (
    <Link to="/" className="logo">
      <svg className="logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path d="M10 8h8l6 6v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="white" />
        <path d="M18 8v6h6" fill="#dbeafe" />
      </svg>
      AjaDocs
    </Link>
  );
}
