import { useEffect, useRef, useState, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { anchorFromRange, findAnchorOffsets, rangeFromOffsets } from '../services/anchors'

// Annotate mode: render an existing designed HTML document untouched inside
// a same-origin iframe (srcdoc). An iframe is a real document, so the doc's
// own body/html/:root CSS applies exactly as it does opening the file
// directly — Shadow DOM broke those selectors. Comments and suggested edits
// layer on top via the iframe's native CSS Custom Highlight API: no DOM
// mutation of the document at all.
//
// sourceText is the Y.Text holding the doc's HTML; accepting a suggestion
// edits it, and every connected browser re-renders.

const HIGHLIGHT_CSS = `
  ::highlight(hc-comment) { background: rgba(245, 158, 11, .28); }
  ::highlight(hc-suggest) { background: rgba(220, 38, 38, .22); text-decoration: line-through; }
  ::highlight(hc-active) { background: rgba(245, 158, 11, .55); }
`

export default function AnnotateView({ sourceText, store, user, activeThread, onSelectThread }) {
  const frameRef = useRef(null)
  const [docReady, setDocReady] = useState(0)
  const [popover, setPopover] = useState(null) // {x, y, exact anchor}
  const [mode, setMode] = useState('comment') // comment | suggest
  const [draft, setDraft] = useState('')
  const [replacement, setReplacement] = useState('')

  // (Re)write the iframe document whenever the shared source changes.
  useEffect(() => {
    const render = () => {
      // Any link-holder can write to the shared doc → treat it as untrusted.
      // DOMPurify strips scripts, on* handlers, and javascript: URLs;
      // WHOLE_DOCUMENT keeps <head> so the doc's <style> blocks survive.
      const clean = DOMPurify.sanitize(sourceText.toString(), {
        WHOLE_DOCUMENT: true,
        ADD_TAGS: ['style', 'link'],
      })
      const doc = frameRef.current?.contentDocument
      if (!doc) return
      doc.open()
      doc.write(clean + `<style>${HIGHLIGHT_CSS}</style>`)
      doc.close()
      setDocReady((n) => n + 1)
    }
    render()
    sourceText.observe(render)
    return () => sourceText.unobserve(render)
  }, [sourceText])

  // Re-resolve all anchors and paint highlights whenever threads/doc change.
  const paint = useCallback(() => {
    const win = frameRef.current?.contentWindow
    const body = frameRef.current?.contentDocument?.body
    if (!win?.CSS?.highlights || !body) return
    const sets = { comment: new win.Highlight(), suggest: new win.Highlight(), active: new win.Highlight() }
    for (const t of store.all()) {
      if (t.resolved || !t.anchor) continue
      const offsets = findAnchorOffsets(body, t.anchor)
      if (!offsets) continue // orphaned — sidebar shows it flagged
      const range = rangeFromOffsets(body, offsets, frameRef.current.contentDocument)
      if (!range) continue
      if (t.id === activeThread) sets.active.add(range)
      else (t.replacement != null ? sets.suggest : sets.comment).add(range)
    }
    win.CSS.highlights.set('hc-comment', sets.comment)
    win.CSS.highlights.set('hc-suggest', sets.suggest)
    win.CSS.highlights.set('hc-active', sets.active)
  }, [store, activeThread])

  useEffect(() => {
    paint()
    return store.subscribe(paint)
  }, [paint, store, docReady])

  // Selection inside the iframe → popover positioned in the parent page.
  useEffect(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    const onMouseUp = () => {
      const sel = doc.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return setPopover(null)
      const range = sel.getRangeAt(0)
      const anchor = anchorFromRange(doc.body, range, doc)
      if (!anchor) return setPopover(null)
      const rect = range.getBoundingClientRect()
      const frame = frameRef.current.getBoundingClientRect()
      setPopover({
        x: frame.left + rect.left + rect.width / 2,
        y: frame.top + rect.bottom - (doc.defaultView.scrollY || 0) + 8,
        anchor,
      })
      setDraft('')
      setReplacement(anchor.exact)
    }
    doc.addEventListener('mouseup', onMouseUp)
    return () => doc.removeEventListener('mouseup', onMouseUp)
  }, [docReady])

  const submit = () => {
    const { anchor } = popover
    if (mode === 'suggest') {
      if (replacement === anchor.exact) return
      store.create(user.name, draft.trim() || 'Suggested edit', { anchor, replacement })
    } else {
      if (!draft.trim()) return
      store.create(user.name, draft.trim(), { anchor })
    }
    setPopover(null)
    frameRef.current?.contentDocument?.getSelection()?.removeAllRanges()
  }

  return (
    <div className="relative flex-1">
      <iframe ref={frameRef} title="Document under review" className="h-full w-full border-0" />
      {popover && (
        <div
          className="fixed z-20 w-80 -translate-x-1/2 rounded-lg border border-stone-300 bg-white p-3 shadow-xl space-y-2"
          style={{ left: popover.x, top: Math.min(Math.max(popover.y, 60), window.innerHeight - 240) }}
        >
          <div className="flex gap-1 text-xs">
            {['comment', 'suggest'].map((m) => (
              <button
                key={m}
                className={`rounded px-2 py-1 capitalize ${mode === m ? 'bg-stone-800 text-white' : 'bg-stone-100'}`}
                onClick={() => setMode(m)}
              >
                {m === 'suggest' ? 'Suggest edit' : 'Comment'}
              </button>
            ))}
          </div>
          {mode === 'suggest' && (
            <textarea
              className="w-full rounded border border-stone-300 p-2 text-sm"
              rows={2}
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Replacement text"
            />
          )}
          <textarea
            className="w-full rounded border border-stone-300 p-2 text-sm"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={mode === 'suggest' ? 'Why? (optional)' : 'Your comment…'}
            autoFocus={mode === 'comment'}
          />
          <div className="flex justify-end gap-2">
            <button className="text-sm text-stone-500" onClick={() => setPopover(null)}>Cancel</button>
            <button className="rounded bg-stone-800 px-3 py-1 text-sm text-white" onClick={submit}>
              {mode === 'suggest' ? 'Suggest' : 'Comment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Accept a suggested edit: replace the anchored text in the shared HTML source.
// Works when the selection sits inside a single text node (typical wording
// edits); cross-element selections can't be safely auto-applied.
// ponytail: literal source match; entity-encoded or element-spanning quotes → manual
export function applySuggestion(sourceText, thread) {
  const html = sourceText.toString()
  const { exact } = thread.anchor
  const occurrences = [...html.matchAll(new RegExp(exact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))]
  if (occurrences.length !== 1) return false // ambiguous or not found → manual
  const i = occurrences[0].index
  sourceText.delete(i, exact.length)
  sourceText.insert(i, thread.replacement)
  return true
}
