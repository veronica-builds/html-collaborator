import { Mark } from '@tiptap/core'

// A mark that anchors a comment thread to a range of text.
// It carries only the thread id; thread bodies live in commentStore (Yjs map)
// so they sync like everything else.
export const Comment = Mark.create({
  name: 'comment',
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs) => ({ 'data-comment-id': attrs.commentId }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'hc-comment' }, 0]
  },

  addCommands() {
    return {
      setComment:
        (commentId) =>
        ({ commands }) =>
          commands.setMark(this.name, { commentId }),
      unsetComment:
        (commentId) =>
        ({ tr, state, dispatch }) => {
          // Remove only the mark instances belonging to this thread.
          state.doc.descendants((node, pos) => {
            const mark = node.marks.find(
              (m) => m.type.name === this.name && m.attrs.commentId === commentId,
            )
            if (mark) tr.removeMark(pos, pos + node.nodeSize, mark)
          })
          if (dispatch) dispatch(tr)
          return true
        },
    }
  },
})
