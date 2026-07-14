// Comment threads, stored in the shared Yjs doc so they sync with the text.
// Shape: ydoc.getMap('comments') → { [threadId]: { resolved, messages: [{author, text, at}] } }
export function createCommentStore(ydoc) {
  const threads = ydoc.getMap('comments')

  return {
    // extra: { anchor } for annotate mode; { anchor, replacement } for a
    // suggested edit (redline on a designed page).
    create(author, text, extra = {}) {
      const id = crypto.randomUUID()
      threads.set(id, { resolved: false, ...extra, messages: [{ author, text, at: Date.now() }] })
      return id
    },
    reply(id, author, text) {
      const t = threads.get(id)
      if (!t) return
      threads.set(id, { ...t, messages: [...t.messages, { author, text, at: Date.now() }] })
    },
    resolve(id) {
      const t = threads.get(id)
      if (t) threads.set(id, { ...t, resolved: true })
    },
    remove(id) {
      threads.delete(id)
    },
    all() {
      return [...threads.entries()].map(([id, t]) => ({ id, ...t }))
    },
    subscribe(fn) {
      threads.observe(fn)
      return () => threads.unobserve(fn)
    },
  }
}
