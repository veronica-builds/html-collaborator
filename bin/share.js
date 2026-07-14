#!/usr/bin/env node
// Share an HTML file for review from the terminal:
//   node bin/share.js path/to/explainer.html            → prints the review link
//   node bin/share.js --export <docId> [outDir]         → saves next .vN.html next to you
// Env: SYNC_URL (default ws://localhost:1234), APP_URL (default http://localhost:5180)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const SYNC_URL = process.env.SYNC_URL || 'ws://localhost:1234'
const APP_URL = process.env.APP_URL || 'http://localhost:5180'

const connect = (docId) => {
  const doc = new Y.Doc()
  const provider = new HocuspocusProvider({ url: SYNC_URL, name: docId, document: doc })
  return new Promise((resolvePromise, reject) => {
    provider.on('synced', () => resolvePromise({ doc, provider }))
    setTimeout(() => reject(new Error(`Could not reach sync server at ${SYNC_URL} — is it running? (npm run server)`)), 8000)
  })
}

const [arg1, arg2, arg3] = process.argv.slice(2)

if (arg1 === '--export') {
  const docId = arg2.startsWith('review/') ? arg2 : `review/${arg2}`
  const { doc, provider } = await connect(docId)
  const html = doc.getText('sourceHtml').toString()
  if (!html) { console.error(`Doc "${docId}" is empty.`); process.exit(1) }
  const base = docId.replace(/^review\//, '').replace(/\.html?$/, '')
  const dir = resolve(arg3 || '.')
  // Next version = highest existing .vN.html in the folder + 1. Never overwrites.
  const existing = readdirSync(dir)
    .map((f) => f.match(new RegExp(`^${base}\\.v(\\d+)\\.html$`)))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  const v = Math.max(1, ...existing) + 1
  const out = resolve(dir, `${base}.v${v}.html`)
  writeFileSync(out, html)
  console.log(`Saved ${out}`)
  provider.destroy()
  process.exit(0)
}

if (!arg1) {
  console.error('Usage: share.js <file.html> | --export <docId> [outDir]')
  process.exit(1)
}

const file = resolve(arg1)
const html = readFileSync(file, 'utf8')
const docId = `review/${basename(file).replace(/\.html?$/, '')}`
const { doc, provider } = await connect(docId)
const src = doc.getText('sourceHtml')
if (src.length > 0) {
  console.log(`Doc already exists with content — link below points to the existing review.`)
  console.log(`(To push a fresh copy, use a new name or export the current state first.)`)
} else {
  doc.transact(() => src.insert(0, html))
  await new Promise((r) => setTimeout(r, 500)) // let the update flush
  console.log(`Shared ${basename(file)} (${(html.length / 1024).toFixed(0)} KB)`)
}
console.log(`\nReview link:  ${APP_URL}/${docId}`)
console.log(`Guest link:   add ?guest=Name-xxxx (or use the Share button in the app)`)
provider.destroy()
process.exit(0)
