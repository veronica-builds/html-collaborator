// Headless self-check for the redline extension: fails loudly if the logic breaks.
// Run: node test/redline.test.js
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><body><div id="e"></div></body>')
global.window = dom.window
global.document = dom.window.document
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true })
for (const k of ['MutationObserver', 'Element', 'Node', 'Text', 'Document', 'DocumentFragment', 'HTMLElement', 'DOMParser', 'getComputedStyle', 'Range', 'ClipboardEvent', 'InputEvent', 'KeyboardEvent', 'CustomEvent'])
  global[k] = dom.window[k]

const { Editor } = await import('@tiptap/core')
const { default: StarterKit } = await import('@tiptap/starter-kit')
const { Suggesting, SuggestInsert, SuggestDelete, collectSuggestions } = await import('../src/editor/extensions/suggestion.js')
const { exportClean } = await import('../src/services/exportClean.js')

const editor = new Editor({
  element: document.getElementById('e'),
  extensions: [StarterKit, SuggestInsert, SuggestDelete, Suggesting.configure({ user: { name: 'Vera' } })],
  content: '<p>The quick brown fox</p>',
})

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1) } console.log('ok:', msg) }

// 1. Suggesting off: typing is a plain edit, no marks.
editor.commands.insertContentAt(4, 'very ')
assert(collectSuggestions(editor.state).length === 0, 'no marks while suggesting is off')

// 2. Suggesting on: typed text carries the insert mark, tagged with author.
editor.commands.toggleSuggesting()
editor.commands.insertContentAt(9, 'extremely ')
let s = collectSuggestions(editor.state)
assert(s.length === 1 && s[0].kind === 'suggestInsert' && s[0].text === 'extremely ' && s[0].author === 'Vera', 'typing while suggesting → tracked insertion with author')

// 3. Backspace over original text strikes it instead of deleting it.
const { TextSelection } = await import('@tiptap/pm/state')
const view = editor.view
// Single paragraph → doc position = text offset + 1
const posOf = (word) => editor.getText().indexOf(word) + 1
const selectWord = (word) => {
  const from = posOf(word)
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, from + word.length)))
}
selectWord('brown')
view.someProp('handleKeyDown', (f) => f(view, new dom.window.KeyboardEvent('keydown', { key: 'Backspace' })))
s = collectSuggestions(editor.state)
const del = s.find((x) => x.kind === 'suggestDelete')
assert(del && del.text === 'brown' && editor.getText().includes('brown'), 'backspace while suggesting → struck text, still visible')

// 4. Backspacing your own pending insertion really deletes it.
selectWord('extremely ')
view.someProp('handleKeyDown', (f) => f(view, new dom.window.KeyboardEvent('keydown', { key: 'Backspace' })))
assert(!editor.getText().includes('extremely'), 'deleting own pending insertion removes it outright')

// 5. Reject the deletion: original text survives, mark gone.
editor.commands.resolveAllSuggestions(false)
assert(collectSuggestions(editor.state).length === 0 && editor.getText().includes('brown'), 'reject all → original text intact, no marks')

// 6. Accept a deletion: text actually goes.
selectWord('brown')
view.someProp('handleKeyDown', (f) => f(view, new dom.window.KeyboardEvent('keydown', { key: 'Backspace' })))
editor.commands.resolveAllSuggestions(true)
assert(!editor.getText().includes('brown') && collectSuggestions(editor.state).length === 0, 'accept all → deletion materializes')

// 7. exportClean: unaccepted suggestions never ship.
editor.commands.insertContentAt(4, 'sneaky ') // still suggesting → pending insert
const clean = exportClean(editor)
assert(!clean.includes('sneaky') && !clean.includes('data-suggestion'), 'export drops pending insertions and all markup')

console.log('\nALL REDLINE CHECKS PASS')
process.exit(0)
