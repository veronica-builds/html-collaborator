import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { Comment } from './extensions/comment'
import { Suggesting, SuggestInsert, SuggestDelete } from './extensions/suggestion'

// Builds the Tiptap editor from injected collab pieces; renders it.
// onReady hands the editor instance up so App can share it with the sidebar.
export default function Editor({ ydoc, provider, user, onReady }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }), // Yjs owns undo history
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({ provider, user }),
      Comment,
      SuggestInsert,
      SuggestDelete,
      Suggesting.configure({ user }),
    ],
    onCreate: ({ editor }) => onReady(editor),
    onSelectionUpdate: ({ editor }) => onReady(editor), // re-render sidebar's selection state
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none min-h-[70vh] p-8 focus:outline-none',
      },
    },
  })

  return <EditorContent editor={editor} className="flex-1 overflow-y-auto bg-white" />
}
