# HTML Collaborator

Share an HTML document and let people comment and redline it, Google-Docs
style, without touching the document's design. Self-hosted, free, no
accounts.

Built for a specific workflow: you create a polished HTML explainer or
lesson with your own tools, then need someone else to review it. They click
a link, select text, leave comments or suggest replacement wording. You
accept or reject. Works live (both in the doc at once, visible cursors) or
async (they comment Tuesday night, you read Wednesday morning).

## Two modes

- **Review mode** (`/review/<doc-id>`): an existing, fully designed HTML
  file rendered pixel-identical in an iframe. Annotations layer on top via
  the CSS Custom Highlight API; the document itself is never modified.
  Suggested edits show old vs. new with accept/reject; accepting updates the
  shared copy for everyone.
- **Editor mode** (any other path): a collaborative rich-text editor
  (Tiptap) with comments and tracked-changes redlining built clean-room on
  ProseMirror marks.

## Stack

All MIT-licensed: [Tiptap](https://tiptap.dev) (editor),
[Yjs](https://yjs.dev) (conflict-free sync),
[Hocuspocus](https://tiptap.dev/hocuspocus) (sync server, SQLite
persistence), [DOMPurify](https://github.com/cure53/DOMPurify)
(shared docs are sanitized before rendering), React + Tailwind + Vite.

No paid extensions, no vendor cloud. Documents live in a SQLite file on
whatever machine runs the server.

## Run it

```bash
npm install
npm run server        # sync server on ws://localhost:1234
npx vite --port 5180  # app on http://localhost:5180
```

Open `http://localhost:5180/review/my-doc` and drop an HTML file on the
page, or share one from the terminal:

```bash
bin/hc share path/to/document.html   # starts servers if needed, prints link
bin/hc export my-doc ./out           # saves next .v2.html / .v3.html — never overwrites
bin/hc open my-doc
```

Add `bin/` to your PATH to use `hc` from anywhere.

## Identity (deliberately no login)

First visit asks for a name, pre-filled with a generated pseudonym; the
browser remembers it. For attribution, generate per-person invite links
from the Share button: the link carries the guest's name, so whoever opens
it comments as that person. It is honor-system accountability, right for
reviewing documents with people you know, not for adversarial negotiation.
If you need real authentication, put the app behind a managed auth provider;
don't hand-roll login.

## Collaborating beyond one machine

Browsers must reach the sync server. On localhost, that's only you. To
collaborate for real, run the server somewhere reachable and point the app
at it:

```bash
SYNC_URL=wss://your-host.example    # used by bin/share.js
VITE_SYNC_URL=wss://your-host.example  # baked into the app at build time
PORT=1234                            # sync server port
HTMLCOLLAB_DB=/path/to/data.sqlite   # persistence location
```

A ~$5/month VPS is plenty; a Cloudflare Tunnel from your own machine works
for one-off sessions. The static front end (`vite build` → `dist/`) can be
hosted anywhere free.

## Tests

```bash
npm test   # redline logic + quote-anchoring self-checks, no framework
```

## Honest limitations

- Suggested-edit auto-apply works when the selected text appears exactly
  once in the HTML source; ambiguous or element-spanning selections fall
  back to "apply by hand."
- A comment whose anchored text is later rewritten shows as
  "(text has changed)" rather than guessing a new location.
- Anyone with a doc's link can read and write that doc. Links are
  unlisted-URL security; treat them accordingly.
