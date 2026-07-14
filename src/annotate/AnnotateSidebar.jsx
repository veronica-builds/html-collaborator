import { useEffect, useState } from 'react'
import { applySuggestion } from './AnnotateView'

// Sidebar for annotate mode: comment threads and suggested edits with
// accept/reject. Orphaned anchors (text since rewritten) are flagged, not lost.
export default function AnnotateSidebar({ store, sourceText, user, activeThread, onSelectThread }) {
  const [threads, setThreads] = useState(store.all())
  const [replyDrafts, setReplyDrafts] = useState({})

  useEffect(() => store.subscribe(() => setThreads(store.all())), [store])

  const reply = (id) => {
    const text = (replyDrafts[id] || '').trim()
    if (!text) return
    store.reply(id, user.name, text)
    setReplyDrafts((d) => ({ ...d, [id]: '' }))
  }

  const accept = (t) => {
    if (applySuggestion(sourceText, t)) store.resolve(t.id)
    else window.alert('Could not apply automatically (text is ambiguous or spans elements). Apply it by hand, then resolve.')
  }

  const open = threads.filter((t) => !t.resolved)
  const orphaned = (t) => t.anchor && !sourceText.toString().includes(t.anchor.exact)

  return (
    <aside className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Review</h2>
      <p className="text-xs text-stone-400">Select text in the document to comment or suggest an edit.</p>
      {open.length === 0 && <p className="text-sm text-stone-400">Nothing open.</p>}

      {open.map((t) => (
        <div
          key={t.id}
          className={`cursor-pointer rounded-lg border bg-white p-3 space-y-2 ${activeThread === t.id ? 'border-amber-400' : 'border-stone-200'}`}
          onClick={() => onSelectThread(t.id === activeThread ? null : t.id)}
        >
          {t.anchor && (
            <p className="border-l-2 border-stone-300 pl-2 text-xs italic text-stone-500">
              “{t.anchor.exact.length > 80 ? t.anchor.exact.slice(0, 80) + '…' : t.anchor.exact}”
              {orphaned(t) && <span className="ml-1 not-italic text-red-600">(text has changed)</span>}
            </p>
          )}
          {t.replacement != null && (
            <p className="text-sm">
              <span className="text-red-700 line-through">{t.anchor.exact.slice(0, 40)}</span>{' '}
              <span className="text-emerald-800">{t.replacement.slice(0, 60)}</span>
            </p>
          )}
          {t.messages.map((m, i) => (
            <div key={i}>
              <div className="text-xs font-semibold text-stone-700">
                {m.author}
                <span className="ml-2 font-normal text-stone-400">
                  {new Date(m.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-stone-800">{m.text}</p>
            </div>
          ))}
          <input
            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
            placeholder="Reply…"
            value={replyDrafts[t.id] || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setReplyDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && reply(t.id)}
          />
          <div className="flex gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
            {t.replacement != null && !orphaned(t) && (
              <button className="text-emerald-700 hover:underline" onClick={() => accept(t)}>Accept edit</button>
            )}
            <button className="text-stone-500 hover:underline" onClick={() => store.resolve(t.id)}>
              {t.replacement != null ? 'Reject' : 'Resolve'}
            </button>
          </div>
        </div>
      ))}
    </aside>
  )
}
