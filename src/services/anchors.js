// Quote anchoring (W3C annotation style): a selection is stored as
// { exact, prefix, suffix } and re-found in the rendered document later.
// Survives edits elsewhere in the doc; if its own text was rewritten,
// the anchor is orphaned (found = null) rather than silently lost.

const CONTEXT = 32

// Build an anchor from a DOM Range inside `root`. Pass the owning document
// when root lives in an iframe (ranges must come from their own document).
export function anchorFromRange(root, range, doc = document) {
  const text = root.textContent
  const exact = range.toString()
  if (!exact.trim()) return null
  // Locate the range's start offset within root's full text.
  const pre = doc.createRange()
  pre.setStart(root, 0)
  pre.setEnd(range.startContainer, range.startOffset)
  const start = pre.toString().length
  return {
    exact,
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(start + exact.length, start + exact.length + CONTEXT),
  }
}

// Find the anchor in root's text; prefer the occurrence whose context matches.
export function findAnchorOffsets(root, anchor) {
  const text = root.textContent
  const candidates = []
  let i = text.indexOf(anchor.exact)
  while (i !== -1) {
    candidates.push(i)
    i = text.indexOf(anchor.exact, i + 1)
  }
  if (!candidates.length) return null
  const score = (pos) => {
    const p = text.slice(Math.max(0, pos - CONTEXT), pos)
    const s = text.slice(pos + anchor.exact.length, pos + anchor.exact.length + CONTEXT)
    let n = 0
    if (anchor.prefix && p.endsWith(anchor.prefix.slice(-12))) n++
    if (anchor.suffix && s.startsWith(anchor.suffix.slice(0, 12))) n++
    return n
  }
  const best = candidates.sort((a, b) => score(b) - score(a))[0]
  return { start: best, end: best + anchor.exact.length }
}

// Convert text offsets back to a DOM Range by walking text nodes.
export function rangeFromOffsets(root, { start, end }, doc = document) {
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */)
  const range = doc.createRange()
  let pos = 0, node
  while ((node = walker.nextNode())) {
    const next = pos + node.length
    if (start >= pos && start < next) range.setStart(node, start - pos)
    if (end > pos && end <= next) {
      range.setEnd(node, end - pos)
      return range
    }
    pos = next
  }
  return null
}
