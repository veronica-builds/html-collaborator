// Load an existing explainer/lesson HTML file into the shared doc.
// Shown when a doc is empty; bin/share.js is the terminal equivalent.
export default function UploadDoc({ sourceText }) {
  const onFile = (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      sourceText.delete(0, sourceText.length)
      sourceText.insert(0, reader.result)
    }
    reader.readAsText(file)
  }

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 text-stone-500"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && onFile(e.dataTransfer.files[0]) }}
    >
      <p className="text-lg">Drop an HTML file here to share it for review</p>
      <label className="cursor-pointer rounded bg-stone-800 px-4 py-2 text-sm text-white">
        Choose file
        <input type="file" accept=".html,.htm" className="hidden" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      </label>
      <p className="text-xs text-stone-400">Or start a blank collaborative doc: type in the editor at any other URL.</p>
    </div>
  )
}
