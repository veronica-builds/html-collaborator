import { useMemo } from 'react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ADJECTIVES = ['Amber', 'Quiet', 'Bold', 'Silver', 'Clever', 'Gentle', 'Swift', 'Golden']
const ANIMALS = ['Fox', 'Heron', 'Otter', 'Lynx', 'Wren', 'Badger', 'Ibis', 'Marten']

function pseudonym() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`
}

// Identity, lowest-friction first:
// 1. ?guest=<token> in the URL → name mapped when the link was created (Phase 3).
// 2. Name remembered in this browser from a previous visit.
// 3. One prompt, pre-filled with a pseudonym — empty submit → the pseudonym.
export function getIdentity() {
  const guest = new URLSearchParams(window.location.search).get('guest')
  if (guest) {
    // Token format: <display name>-<suffix>, e.g. "Sam Reviewer-x8k2".
    // ponytail: the link carries the name; honor-system like the prompt.
    // Server-side token→name lookup is the upgrade if links ever need revoking.
    const name = guest.replace(/-[a-z0-9]+$/i, '').trim() || guest
    return { name, guest }
  }
  let name = localStorage.getItem('htmlcollab:name')
  if (!name) {
    const suggested = pseudonym()
    name = (window.prompt('Your name for comments:', suggested) || suggested).trim() || suggested
    localStorage.setItem('htmlcollab:name', name)
  }
  return { name, guest: null }
}

const CURSOR_COLORS = ['#f783ac', '#74c0fc', '#63e6be', '#ffd43b', '#b197fc', '#ffa94d']

// One Yjs doc + one provider per document id. The only place these are built;
// everything downstream receives them.
export function useCollab(docId, serverUrl) {
  return useMemo(() => {
    const ydoc = new Y.Doc()
    const provider = new HocuspocusProvider({ url: serverUrl, name: docId, document: ydoc })
    const identity = getIdentity()
    const user = {
      name: identity.name,
      color: CURSOR_COLORS[Math.abs([...identity.name].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % CURSOR_COLORS.length],
    }
    return { ydoc, provider, user }
  }, [docId, serverUrl])
}
