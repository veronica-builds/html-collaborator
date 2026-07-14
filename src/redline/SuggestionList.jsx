import { useEffect, useState } from 'react'
import { collectSuggestions } from '../editor/extensions/suggestion'

// Redline panel: every pending suggestion with accept/reject, plus
// accept-all / reject-all. Reads the doc; mutates only through commands.
export default function SuggestionList({ editor }) {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    const update = () => setSuggestions(collectSuggestions(editor.state))
    update()
    editor.on('transaction', update)
    return () => editor.off('transaction', update)
  }, [editor])

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-3 border-t border-stone-200 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Redlines</h2>
        <div className="flex gap-2 text-xs">
          <button className="text-emerald-700 hover:underline" onClick={() => editor.commands.resolveAllSuggestions(true)}>
            Accept all
          </button>
          <button className="text-red-700 hover:underline" onClick={() => editor.commands.resolveAllSuggestions(false)}>
            Reject all
          </button>
        </div>
      </div>

      {suggestions.map((s, i) => (
        <div key={`${s.from}-${i}`} className="rounded-lg border border-stone-200 bg-white p-3 space-y-1.5">
          <div className="text-xs text-stone-500">
            <span className="font-semibold text-stone-700">{s.author || 'Unknown'}</span>
            {' '}suggests {s.kind === 'suggestInsert' ? 'inserting' : 'deleting'}
          </div>
          <p className={`text-sm ${s.kind === 'suggestInsert' ? 'text-emerald-800' : 'text-red-800 line-through'}`}>
            “{s.text.length > 120 ? s.text.slice(0, 120) + '…' : s.text}”
          </p>
          <div className="flex gap-3 text-xs">
            <button className="text-emerald-700 hover:underline" onClick={() => editor.commands.resolveSuggestion(s, true)}>
              Accept
            </button>
            <button className="text-red-700 hover:underline" onClick={() => editor.commands.resolveSuggestion(s, false)}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
