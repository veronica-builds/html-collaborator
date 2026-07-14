// Self-check for quote anchoring + suggestion application against the real explainer.
// Run: node test/anchors.test.js
import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'

// Set EXPLAINER=/path/to/any.html to test against a real document.
const html = readFileSync(
  process.env.EXPLAINER || new URL('./fixtures/sample-explainer.html', import.meta.url),
  'utf8',
)

const dom = new JSDOM(html)
global.document = dom.window.document
global.NodeFilter = dom.window.NodeFilter

const { findAnchorOffsets, rangeFromOffsets, anchorFromRange } = await import('../src/services/anchors.js')

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1) } console.log('ok:', msg) }
const root = dom.window.document.body

// 1. A phrase that exists once: found at the right place.
const text = root.textContent
const phrase = text.match(/[A-Za-z][a-z]+ [a-z]+ [a-z]+ [a-z]+/)[0] // first 4-word run
const idx = text.indexOf(phrase)
const anchor = { exact: phrase, prefix: text.slice(Math.max(0, idx - 32), idx), suffix: text.slice(idx + phrase.length, idx + phrase.length + 32) }
const offsets = findAnchorOffsets(root, anchor)
assert(offsets && offsets.start === idx, `anchor re-found at exact offset ("${phrase}")`)

// 2. Offsets → DOM Range → same text back.
const range = rangeFromOffsets(root, offsets)
assert(range && range.toString() === phrase, 'offsets convert to a DOM Range with identical text')

// 3. Ambiguous quote: context picks the right occurrence.
const word = 'the'
const positions = []
let i = text.indexOf(` ${word} `)
while (i !== -1 && positions.length < 5) { positions.push(i + 1); i = text.indexOf(` ${word} `, i + 1) }
assert(positions.length >= 2, 'test phrase occurs multiple times')
const target = positions[positions.length - 1]
const amb = { exact: word, prefix: text.slice(target - 32, target), suffix: text.slice(target + word.length, target + word.length + 32) }
const found = findAnchorOffsets(root, amb)
assert(found.start === target, 'context disambiguates repeated text to the right occurrence')

// 4. Rewritten text: anchor orphans instead of mis-anchoring.
const gone = { exact: 'zqxjwv never in this doc', prefix: '', suffix: '' }
assert(findAnchorOffsets(root, gone) === null, 'missing text → orphaned (null), not a wrong match')

console.log('\nALL ANCHOR CHECKS PASS')
