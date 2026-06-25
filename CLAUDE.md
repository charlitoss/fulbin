# CLAUDE.md

Development guardrails for Fulbin. See [README.md](README.md) for features and architecture.

## Security

**Never render untrusted text as HTML.** Any user-controlled value — player names, match
names, locations, anything a user types or that comes back from the database — must be
rendered through normal JSX (`{value}`), which React escapes automatically. Do **not**:

- use `dangerouslySetInnerHTML` with user/DB content,
- assign to `innerHTML` or call `document.write`,
- put user-controlled values into an `href`/`src` as a `javascript:` URL,
- add a dependency that injects raw HTML into the page.

If you ever genuinely need to render HTML you didn't author, sanitize it first (e.g. with
[DOMPurify](https://github.com/cure53/DOMPurify)) before it reaches the DOM.

**Why this is load-bearing:** the WorkOS refresh token is stored in `localStorage`
(`devMode={true}` in [src/main.jsx](src/main.jsx)) rather than an HttpOnly cookie — a
deliberate tradeoff to avoid WorkOS's paid custom-domain add-on. `localStorage` is readable
by JavaScript, so an XSS bug would let an attacker steal the session token. No XSS means the
token is safe, so keeping the app XSS-free is the mitigation this choice depends on. The full
rationale lives in the comment above `devMode` in `src/main.jsx`.
