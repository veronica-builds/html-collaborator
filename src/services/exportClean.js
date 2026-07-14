// Produce publishable HTML: the document with all review artifacts removed.
// Comments are unwrapped (text kept, mark dropped). Redlines are resolved
// the only safe way for publication: suggested insertions are dropped,
// suggested deletions are kept — i.e. unaccepted suggestions do not ship.
export function exportClean(editor) {
  const doc = new DOMParser().parseFromString(editor.getHTML(), 'text/html')

  // Unwrap comment marks: keep the text, drop the annotation.
  for (const el of [...doc.querySelectorAll('[data-comment-id]')]) {
    el.replaceWith(...el.childNodes)
  }

  // Unaccepted insertions don't ship.
  for (const el of [...doc.querySelectorAll('[data-suggestion="insert"]')]) {
    el.remove()
  }

  // Unaccepted deletions: the original text stays.
  for (const el of [...doc.querySelectorAll('[data-suggestion="delete"]')]) {
    el.replaceWith(...el.childNodes)
  }

  return doc.body.innerHTML
}
