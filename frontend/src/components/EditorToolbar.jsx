function ToolbarButton({ label, active, onAction, children }) {
  return (
    <button
      type="button"
      className={active ? "is-active" : ""}
      aria-label={label}
      data-tooltip={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onAction();
      }}
    >
      {children}
    </button>
  );
}

export default function EditorToolbar({ editor }) {
  if (!editor) {
    return null;
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Text formatting">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onAction={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onAction={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onAction={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="toolbar-underline">U</span>
      </ToolbarButton>
      <span className="toolbar-divider" />
      <ToolbarButton
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onAction={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span className="toolbar-heading">H1</span>
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onAction={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="toolbar-heading">H2</span>
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onAction={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <span className="toolbar-heading">H3</span>
      </ToolbarButton>
      <span className="toolbar-divider" />
      <ToolbarButton
        label="Bullet List"
        active={editor.isActive("bulletList")}
        onAction={() => editor.chain().focus().toggleBulletList().run()}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="4" cy="5" r="1.4" fill="currentColor" />
          <circle cx="4" cy="10" r="1.4" fill="currentColor" />
          <circle cx="4" cy="15" r="1.4" fill="currentColor" />
          <path d="M8 5h8M8 10h8M8 15h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        label="Number List"
        active={editor.isActive("orderedList")}
        onAction={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 4.5h2M4.5 4.5V8M3.5 8h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3.5 11.5h2l-2 3h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 5h8M8 10h8M8 15h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </ToolbarButton>
    </div>
  );
}
