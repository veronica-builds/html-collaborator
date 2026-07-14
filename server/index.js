// HTML Collaborator sync server — the one machine every browser connects to.
// Hocuspocus handles all Yjs sync; SQLite extension persists every doc.
import { Server } from '@hocuspocus/server'
import { SQLite } from '@hocuspocus/extension-sqlite'

const port = Number(process.env.PORT) || 1234

const server = new Server({
  port,
  extensions: [new SQLite({ database: process.env.HTMLCOLLAB_DB || 'htmlcollab.sqlite' })],
})

server.listen().then(() => {
  console.log(`HTML Collaborator sync server listening on ws://localhost:${port}`)
})
