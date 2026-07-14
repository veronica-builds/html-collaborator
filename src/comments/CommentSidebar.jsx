import { useEffect, useState } from 'react'

// Margin sidebar: list threads, add on selection, reply, resolve.
// Receives everything; builds nothing.
export default function CommentSidebar({ editor, store, user }) {
  const [threads, setThreads] = useState(store.all())
  const [draft, setDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})

  useEffect(() => store.subscribe(() => setThreads(store.all())), [store])

  const hasSelection = !editor.state.selection.empty

  const addComment = () => {
    if (!draft.trim()) return
    const id = store.create(user.name, draft.trim())
    editor.chain().focus().setComment(id).run()
    setDraft('')
  }

  const resolve = (id) => {
    store.resolve(id)
    editor.commands.unsetComment(id)
  }

  const reply = (id) => {
    const text = (replyDrafts[id] || '').trim()
    if (!text) return
    store.reply(id, user.name, text)
    setReplyDrafts((d) => ({ ...d, [id]: '' }))
  }

  const jumpTo = (id) => {
    const el = document.querySelector(`[data-comment-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const open = threads.filter((t) => !t.resolved)

  return (
    <aside className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Comments</h2>

      <div className="space-y-2">
        <textarea
          className="w-full rounded border border-stone-300 p-2 text-sm"
          rows={2}
          placeholder={hasSelection ? 'Comment on selected text…' : 'Select text to comment'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!hasSelection}
        />
        <button
          className="rounded bg-stone-800 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          onClick={addComment}
          disabled={!hasSelection || !draft.trim()}
        >
          Comment
        </button>
      </div>

      {open.length === 0 && <p className="text-sm text-stone-400">No open comments.</p>}

      {open.map((t) => (
        <div key={t.id} className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
          {t.messages.map((m, i) => (
            <div key={i}>
              <div className="text-xs font-semibold text-stone-700">
                {m.author}
                <span className="ml-2 font-normal text-stone-400">
                  {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-stone-800">{m.text}</p>
            </div>
          ))}
          <input
            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
            placeholder="Reply…"
            value={replyDrafts[t.id] || ''}
            onChange={(e) => setReplyDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && reply(t.id)}
          />
          <div className="flex gap-3 text-xs">
            <button className="text-stone-500 hover:underline" onClick={() => jumpTo(t.id)}>
              Show in text
            </button>
            <button className="text-emerald-700 hover:underline" onClick={() => resolve(t.id)}>
              Resolve
            </button>
          </div>
        </div>
      ))}
    </aside>
  )
}
