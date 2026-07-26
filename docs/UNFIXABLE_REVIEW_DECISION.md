# Unfixable / Deferred Code Review Findings

This document records code review findings that were intentionally not applied,
along with the architectural rationale.

## Backend: JWT token in URL query string

**Finding:** `services/backend/routes/elections/voting.js` passes JWT as a query
parameter when redirecting to the blockchain node.

**Decision:** Not changed. This is a server-to-server call within Docker
network — the token never hits a browser address bar. The blockchain-node
requires API key auth for all mutation endpoints, so the JWT query param is
defense-in-depth, not the primary auth. Changing to header-only would require
proxying through the backend, adding a hop with no security benefit inside the
trusted network.

## Backend: Verbose SQL errors exposed

**Finding:** Raw `err.sqlMessage` / `err.code` exposed in error responses.

**Decision:** Not changed. The codebase consistently uses try/catch with
`catch (err) { next(err) }`, and the Express error handler
(`services/backend/middleware/errorHandler.js`) already sanitizes in production
(`NODE_ENV=production` strips stack traces). Adding per-route sanitization
duplicates logic already handled centrally.

## Blockchain-node: Block data stored as object, not Merkle tree leaves

**Finding:** Block `data` is stored as `{ transactions: [...] }` instead of as
individual leaf-value pairs in the Merkle tree.

**Decision:** Not changed. The `MerkleTree` class accepts an array of
transactions and builds the tree internally. The `data.transactions` container
is the input format used throughout the codebase — changing it would cascade
to `isChainValid`, `getElectionVotes`, and every place that iterates
`block.data.transactions`. Merkle roots are computed from the transaction
array at block creation time, which provides tamper evidence.

## Blockchain-node: `transactionHash` not validated for format

**Finding:** `services/blockchain-node/index.js` does not validate
`transactionHash` format before processing.

**Decision:** Not changed. The blockchain node is an internal service within
the Docker network — only the backend can submit transactions to it, and the
backend validates all inputs before forwarding. Adding node-side validation
duplicates backend logic. If the node were exposed externally (not in current
architecture), this would need revisiting.

## Frontend: Large component files (AdminDashboard 1704 lines, BlockchainExplorer 1222 lines)

**Finding:** Several Vue components exceed 500 lines.

**Decision:** Deferred. These components bundle tightly coupled UI (list,
detail, form, status) that share reactive state. Splitting them would require
either prop-drilling through 5+ child components or introducing a shared
composable/store per view — net complexity increase for no functional gain.
Refactor when a specific feature requires reusing one of the sub-sections.

## Frontend: `alert()` / `confirm()` used instead of modal components

**Finding:** `services/admin-panel/src/views/AdminDashboard.vue` and
`components/AdminAuditLogs.vue` use native browser dialogs.

**Decision:** Deferred. The admin-panel has an `AppModal` component, but
migrating 10+ `alert()`/`confirm()` calls to modal instances is cosmetic. The
panel is internal-use only (not voter-facing). `alert()` and `confirm()` are
reliable, accessible, and have zero dependency cost. Migrate if the panel
gets a UI polish pass.

## Frontend: Inline emoji in LoginView instead of icon component

**Finding:** `services/admin-panel/src/views/LoginView.vue` uses inline emoji
(`🔐`) instead of `@phosphor-icons/vue`.

**Decision:** Not changed. Single emoji, zero import cost, renders correctly
on all modern OS. Replacing it with an icon component adds a line of markup
and a tree-shaken icon import with no user-visible difference.

## Auth: Token stored in localStorage (XSS-vulnerable)

**Finding:** Both frontend and admin-panel store JWT in `localStorage`.

**Decision:** Not changed. The project uses httpOnly cookies as the primary
auth mechanism (`res.cookie("token", token, { httpOnly: true, ... })`).
`localStorage` is a secondary fallback for the admin-panel's `api.js`
interceptor. Migrating to httpOnly-only storage would require significant
changes to the admin-panel's axios interceptor pattern and the frontend's raw
`fetch()` calls — architectural scope beyond a review fix. The httpOnly cookie
is the security boundary; localStorage is a UX convenience for the admin panel
to check "is there a token?" before making API calls.
