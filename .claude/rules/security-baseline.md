# Security Baseline (for AI-built apps)

Drop this into any project that stores data, has users, or touches a network.
It is the build-time half of the beginner-builder-security framework; the
runtime half (RLS on the live database, the "steal your own data" test) is on
the 5-point checklist and stays manual.

Claude Code must follow these rules when writing code for this project.

## Secrets
- Every secret (API key, password, token, connection string) lives in a
  server-side environment variable. Never in client code, never committed.
- Never assign a secret to a browser-exposed variable: no real key behind
  `NEXT_PUBLIC_*` (Next.js) or `VITE_*` (Vite). Those ship to the browser.
- `.env` files are git-ignored. Secrets that were ever public are burned:
  rotate them, don't just move them.

## Database access
- Enable Row Level Security on every table (Supabase), or authenticated,
  per-user rules (Firebase). No table is world-readable.
- Every table gets at least one policy scoped to the owning user.
- Never ship Firebase `allow read, write: if true`.

## Authorization
- Every API route verifies the requesting user owns the requested record.
  Checking "is logged in" is not checking "is allowed."
- Security lives on the server, never only in the browser. No client-side
  paywalls, no hidden-route admin panels as the only gate.

## Injection
- Parameterized queries for all database access. Never string-concatenate SQL.
- Escape and sanitize all user input before rendering. No `dangerouslySetInnerHTML`
  on unsanitized content.
- Validate every input on the server, not just in the form.

## Authentication
- Use a managed auth provider (Supabase Auth, Clerk, Auth0). Never write custom
  login, session, or password-hashing code.

## Dependencies
- Do not add a package you can't account for. Confirm it exists on the real
  registry and is not a typo of a well-known package before installing.

## Process
- Do not iteratively re-prompt working security code to "improve" it. Security
  degrades on re-prompting. Review or scan between rounds instead.

## Client / privileged data
- If this project touches client or privileged material, this baseline is the
  floor, not the goal. ABA Op. 512 applies confidentiality duties to AI tools;
  Op. 483 creates a breach-notification duty. Do not send client data to an
  external service without a deliberate, confirmed decision.
