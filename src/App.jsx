import { useEffect, useMemo, useState } from 'react'
import { useCollab } from './hooks/useCollab'
import { createCommentStore } from './services/commentStore'
import { exportClean } from './services/exportClean'
import Editor from './editor/Editor'
import Toolbar from './editor/Toolbar'
import CommentSidebar from './comments/CommentSidebar'
import SuggestionList from './redline/SuggestionList'
import SharePanel from './share/SharePanel'
import AnnotateView from './annotate/AnnotateView'
import AnnotateSidebar from './annotate/AnnotateSidebar'
import UploadDoc from './annotate/UploadDoc'

const SERVER_URL = import.meta.env.VITE_SYNC_URL || 'ws://localhost:1234'

const download = (name, html) => {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([html], { type: 'text/html' })),
    download: name,
  })
  a.click()
  URL.revokeObjectURL(a.href)
}

// Thin orchestrator. Two modes share one doc space:
//  /review/<id>  → annotate an uploaded designed HTML file (explainer, lesson)
//  /<id>         → write a doc from scratch in the collaborative editor
export default function App() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '') || 'welcome'
  const isReview = path.startsWith('review/')
  const docId = path
  const { ydoc, provider, user } = useCollab(docId, SERVER_URL)
  const store = useMemo(() => createCommentStore(ydoc), [ydoc])
  const sourceText = useMemo(() => ydoc.getText('sourceHtml'), [ydoc])
  const [editor, setEditor] = useState(null)
  const [activeThread, setActiveThread] = useState(null)
  const [hasSource, setHasSource] = useState(false)
  const [synced, setSynced] = useState(false)
  const [, bump] = useState(0)

  useEffect(() => {
    const check = () => setHasSource(sourceText.length > 0)
    check()
    sourceText.observe(check)
    provider.on('synced', () => { setSynced(true); check() })
    return () => sourceText.unobserve(check)
  }, [sourceText, provider])

  // Versioned export: never overwrites — v2, v3, … tracked in the shared doc.
  const exportVersion = () => {
    const meta = ydoc.getMap('meta')
    const v = (meta.get('version') || 1) + 1
    meta.set('version', v)
    const base = docId.replace(/^review\//, '').replace(/\.html?$/, '')
    download(`${base}.v${v}.html`, sourceText.toString())
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-stone-200 px-4 py-2">
        <h1 className="font-serif text-lg">
          HTML Collaborator <span className="ml-2 text-sm text-stone-400">{docId}</span>
        </h1>
        <div className="flex items-center gap-3">
          {isReview && hasSource && (
            <button className="rounded px-3 py-1 text-sm hover:bg-stone-200" onClick={exportVersion}>
              Export version
            </button>
          )}
          <span className="text-sm text-stone-500">
            You are <span className="font-medium" style={{ color: user.color }}>{user.name}</span>
          </span>
          <SharePanel docId={docId} />
        </div>
      </header>

      {isReview ? (
        <div className="flex min-h-0 flex-1">
          {!synced ? (
            <div className="flex flex-1 items-center justify-center text-stone-400">Connecting…</div>
          ) : hasSource ? (
            <>
              <AnnotateView
                sourceText={sourceText}
                store={store}
                user={user}
                activeThread={activeThread}
                onSelectThread={setActiveThread}
              />
              <div className="w-80 shrink-0 overflow-y-auto border-l border-stone-200 bg-stone-50">
                <AnnotateSidebar
                  store={store}
                  sourceText={sourceText}
                  user={user}
                  activeThread={activeThread}
                  onSelectThread={setActiveThread}
                />
              </div>
            </>
          ) : (
            <UploadDoc sourceText={sourceText} />
          )}
        </div>
      ) : (
        <>
          <Toolbar editor={editor} onExport={() => editor && download(`${docId}.html`, exportClean(editor))} />
          <div className="flex min-h-0 flex-1">
            <Editor ydoc={ydoc} provider={provider} user={user} onReady={(e) => { setEditor(e); bump((n) => n + 1) }} />
            {editor && (
              <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-stone-200 bg-stone-50">
                <CommentSidebar editor={editor} store={store} user={user} />
                <div className="px-4 pb-4">
                  <SuggestionList editor={editor} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
