import { Mark, Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

// Redline ("suggesting mode"), clean-room on public ProseMirror primitives.
// Two marks: suggested insertion (new text, underlined) and suggested
// deletion (struck text that stays visible until someone accepts).
// Because they are marks in the shared Yjs doc, redlines sync live and
// survive concurrent edits the same way bold does.

const suggestionMark = (name, kind) =>
  Mark.create({
    name,
    inclusive: kind === 'insert',
    excludes: name, // same-kind marks merge rather than stack
    addAttributes() {
      return {
        author: { default: null, parseHTML: (el) => el.getAttribute('data-author') },
        at: { default: null, parseHTML: (el) => Number(el.getAttribute('data-at')) || null },
      }
    },
    parseHTML() {
      return [{ tag: `span[data-suggestion="${kind}"]` }]
    },
    renderHTML({ HTMLAttributes }) {
      return [
        'span',
        {
          ...HTMLAttributes,
          'data-suggestion': kind,
          'data-author': HTMLAttributes.author,
          'data-at': HTMLAttributes.at,
          class: `hc-suggest-${kind}`,
        },
        0,
      ]
    },
  })

export const SuggestInsert = suggestionMark('suggestInsert', 'insert')
export const SuggestDelete = suggestionMark('suggestDelete', 'delete')

const key = new PluginKey('hc-suggesting')
const ACTION = 'hc-suggestion-action' // meta flag: accept/reject edits skip tracking

// Walk the doc and return contiguous suggestion ranges.
export function collectSuggestions(state) {
  const out = []
  state.doc.descendants((node, pos) => {
    if (!node.isText) return
    for (const kind of ['suggestInsert', 'suggestDelete']) {
      const mark = node.marks.find((m) => m.type.name === kind)
      if (!mark) continue
      const prev = out[out.length - 1]
      if (prev && prev.kind === kind && prev.to === pos && prev.author === mark.attrs.author) {
        prev.to = pos + node.nodeSize
        prev.text += node.text
      } else {
        out.push({ kind, from: pos, to: pos + node.nodeSize, text: node.text, author: mark.attrs.author, at: mark.attrs.at })
      }
    }
  })
  return out
}

export const Suggesting = Extension.create({
  name: 'suggesting',

  addOptions() {
    return { user: { name: 'Anonymous' } }
  },

  addStorage() {
    return { enabled: false }
  },

  addCommands() {
    const resolveRange = (kind, from, to, tr, state, accept) => {
      // accept insert = keep text, drop mark; accept delete = remove text
      // reject insert = remove text;    reject delete = keep text, drop mark
      const type = state.schema.marks[kind]
      const removeText = (kind === 'suggestDelete') === accept
      if (removeText) tr.delete(tr.mapping.map(from), tr.mapping.map(to))
      else tr.removeMark(tr.mapping.map(from), tr.mapping.map(to), type)
    }

    return {
      toggleSuggesting:
        () =>
        ({ editor }) => {
          this.storage.enabled = !this.storage.enabled
          editor.view.dispatch(editor.state.tr.setMeta(key, this.storage.enabled))
          return true
        },
      resolveSuggestion:
        ({ kind, from, to }, accept) =>
        ({ tr, state, dispatch }) => {
          tr.setMeta(ACTION, true)
          resolveRange(kind, from, to, tr, state, accept)
          if (dispatch) dispatch(tr)
          return true
        },
      resolveAllSuggestions:
        (accept) =>
        ({ tr, state, dispatch }) => {
          tr.setMeta(ACTION, true)
          for (const s of collectSuggestions(state)) resolveRange(s.kind, s.from, s.to, tr, state, accept)
          if (dispatch) dispatch(tr)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const storage = this.storage
    const user = this.options.user

    return [
      new Plugin({
        key,

        // Track insertions: anything typed/pasted while suggesting gets the
        // insert mark, applied in the same event loop as the edit.
        appendTransaction(transactions, _old, newState) {
          if (!storage.enabled) return null
          if (transactions.some((t) => t.getMeta(ACTION) || t.getMeta('y-sync$'))) return null
          const ranges = []
          for (const t of transactions) {
            if (!t.docChanged) continue
            for (const step of t.steps) step.getMap().forEach((_a, _b, from, to) => from !== to && ranges.push([from, to]))
          }
          if (!ranges.length) return null
          const tr = newState.tr
          const insert = newState.schema.marks.suggestInsert
          const del = newState.schema.marks.suggestDelete
          for (const [from, to] of ranges) {
            tr.addMark(from, to, insert.create({ author: user.name, at: Date.now() }))
            tr.removeMark(from, to, del)
          }
          return tr
        },

        props: {
          // Track deletions: Backspace/Delete strike text out instead of
          // removing it. Deleting your own still-pending insertion really
          // deletes it (nothing to preserve — it was never in the original).
          handleKeyDown(view, event) {
            if (!storage.enabled) return false
            if (event.key !== 'Backspace' && event.key !== 'Delete') return false
            const { state } = view
            const { empty, from, to } = state.selection
            let start = from, end = to
            if (empty) {
              if (event.key === 'Backspace') { if (from <= 1) return true; start = from - 1 }
              else { if (to >= state.doc.content.size - 1) return true; end = to + 1 }
            }
            const tr = state.tr
            const insertType = state.schema.marks.suggestInsert
            // ponytail: own-pending-insert check is whole-range; mixed ranges get struck, not split
            const allOwnInsert = state.doc.rangeHasMark(start, end, insertType) &&
              (() => { let own = true; state.doc.nodesBetween(start, end, (n) => { if (n.isText) { const m = n.marks.find((x) => x.type === insertType); if (!m || m.attrs.author !== user.name) own = false } }); return own })()
            if (allOwnInsert) {
              tr.setMeta(ACTION, true).delete(start, end)
            } else {
              tr.addMark(start, end, state.schema.marks.suggestDelete.create({ author: user.name, at: Date.now() }))
              tr.setSelection(TextSelection.create(tr.doc, event.key === 'Backspace' ? start : end))
            }
            view.dispatch(tr)
            return true
          },
        },
      }),
    ]
  },
})
