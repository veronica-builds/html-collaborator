// Formatting buttons + export. Suggesting-mode toggle lands here in Phase 2.
export default function Toolbar({ editor, onExport }) {
  if (!editor) return null

  const Btn = ({ label, active, onClick }) => (
    <button
      className={`rounded px-2.5 py-1 text-sm ${active ? 'bg-stone-800 text-white' : 'hover:bg-stone-200'}`}
      onClick={onClick}
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center gap-1 border-b border-stone-200 bg-stone-100 px-4 py-2">
      <Btn label="B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Btn label="I" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Btn label="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Btn label="List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <div className="ml-auto flex items-center gap-1">
        <Btn
          label={editor.storage.suggesting?.enabled ? '✓ Suggesting' : 'Suggesting'}
          active={editor.storage.suggesting?.enabled}
          onClick={() => editor.chain().focus().toggleSuggesting().run()}
        />
        <Btn label="Export HTML" onClick={onExport} />
      </div>
    </div>
  )
}
