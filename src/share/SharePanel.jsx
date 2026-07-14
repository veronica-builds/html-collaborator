import { useState } from 'react'

// Generate per-person invite links: the link carries the guest's name,
// so whoever opens it comments under that name — no prompt, no account.
export default function SharePanel({ docId }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(null)

  const makeLink = () => {
    const n = name.trim()
    if (!n) return
    const token = `${n}-${Math.random().toString(36).slice(2, 7)}`
    const url = `${window.location.origin}/${docId}?guest=${encodeURIComponent(token)}`
    navigator.clipboard.writeText(url)
    setCopied(n)
    setName('')
  }

  return (
    <div className="relative">
      <button
        className="rounded bg-stone-800 px-3 py-1 text-sm text-white"
        onClick={() => { setOpen(!open); setCopied(null) }}
      >
        Share
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-72 rounded-lg border border-stone-200 bg-white p-3 shadow-lg space-y-2">
          <p className="text-xs text-stone-500">
            Invite link for one person. Their name is in the link — they open it and start commenting as themselves.
          </p>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 text-sm"
              placeholder="Guest's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && makeLink()}
            />
            <button
              className="rounded bg-stone-800 px-2.5 py-1 text-sm text-white disabled:opacity-40"
              onClick={makeLink}
              disabled={!name.trim()}
            >
              Copy link
            </button>
          </div>
          {copied && <p className="text-xs text-emerald-700">Link for {copied} copied to clipboard.</p>}
          <p className="text-xs text-stone-400">Anyone with the plain URL can still join and pick their own name.</p>
        </div>
      )}
    </div>
  )
}
