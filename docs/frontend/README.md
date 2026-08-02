# Frontend

Vue 3 + Vite + Vuex frontend for the CryptoPoll blockchain voting system.

## Quick Start

```bash
cd services/frontend
npm install
npm run dev          # Vite dev server on port 5173
```

For production build:

```bash
npm run build        # Output to dist/
npm run preview      # Preview production build
```

## Environment Variables

| Variable                   | Default                 | Description                             |
| -------------------------- | ----------------------- | --------------------------------------- |
| `VITE_API_BASE_URL`        | `http://localhost:3000` | Backend API URL                         |
| `VITE_BLOCKCHAIN_URL`      | `http://localhost:3001` | Blockchain node URL                     |
| `VITE_INSTITUTION_API_URL` | `http://localhost:4000` | Institution API URL                     |
| `VITE_DEVTOOLS`            | `false`                 | Enable Vue devtools (`true` to turn on) |

Set these in docker-compose or `.env` — not in `vite.config.js`.

## Architecture

```text
src/
├── assets/tokens.css          # Design tokens (CSS variables, light/dark themes)
├── components/
│   ├── AppModal.vue           # Reusable modal dialog (success/error/warning/info)
│   ├── AppFooter.vue          # Site footer
│   ├── NavBar.vue             # Navigation bar with theme toggle, profile card
│   └── VoteReceipt.vue        # Cryptographic vote receipt with copy/download
├── views/
│   ├── HomeView.vue           # Landing page with features and steps
│   ├── LoginView.vue          # User login
│   ├── RegisterView.vue       # 3-step registration (ID verify → OTP → password)
│   ├── ElectionsView.vue      # Election listing with vote status
│   ├── ElectionDetailView.vue # Election details, candidates, results
│   ├── VoteView.vue           # Voting interface with crypto key check
│   ├── ResultsView.vue        # Election results with bar charts
│   └── BlockchainExplorer.vue # Blockchain block explorer
├── services/
│   ├── crypto.js              # Web Crypto API wrapper (ECDSA, RSA-OAEP, SHA-256)
│   └── keyManager.js          # Key lifecycle (generate, store, load, export)
├── store/index.js             # Vuex store (auth, elections, voting)
├── router/index.js            # Vue Router with auth guards
├── App.vue                    # Root shell (NavBar + router-view + Footer)
└── main.js                    # Entry point
```

## Pages

| Route                 | Page               | Auth | Description                                                         |
| --------------------- | ------------------ | ---- | ------------------------------------------------------------------- |
| `/`                   | HomeView           | No   | Landing page with feature cards and how-it-works steps              |
| `/login`              | LoginView          | No   | Sign in with institution ID and password                            |
| `/register`           | RegisterView       | No   | 3-step registration: ID verification → email OTP → password         |
| `/elections`          | ElectionsView      | Yes  | List all elections, shows "Already Voted" badge for voted elections |
| `/elections/:id`      | ElectionDetailView | Yes  | Election info, candidate results, registration, vote button         |
| `/elections/:id/vote` | VoteView           | Yes  | Select candidate, encrypt vote, submit to blockchain                |
| `/results`            | ResultsView        | Yes  | All election results with ranked bar charts                         |
| `/explorer`           | BlockchainExplorer | No   | Browse blockchain blocks, search by hash                            |

## Design System

### Theming

Dark/light mode via CSS custom properties in `tokens.css`. Three-layer system:

1. **System default**: `@media (prefers-color-scheme: dark)` applies dark tokens
2. **Manual override**: `data-theme="dark"` or `data-theme="light"` on `<html>` takes priority
3. **Persistence**: Toggle state saved to `localStorage('theme')`

The NavBar sun/moon button toggles themes. On first visit, follows system preference.

### Tokens

All colors, spacing, typography, and shadows use CSS variables:

```css
var(--bg-primary)      /* Page background */
var(--bg-card)         /* Card backgrounds */
var(--accent)          /* Primary brand color */
var(--text-primary)    /* Main text */
var(--success)         /* Success states */
var(--error)           /* Error states */
var(--font-mono)       /* Monospace for code/hashes */
var(--radius-md)       /* Border radius */
```

No hardcoded colors outside `tokens.css`. Components use `color-mix()` for tinted backgrounds.

### Glass Effect

```html
<div class="card glass">...</div>
```

The `.glass` class adds `backdrop-filter: blur()` with semi-transparent background.

## Cryptography

### Key Generation (Registration)

1. `RegisterView` calls `keyManager.initializeUserKeys(userId, password)`
2. Generates ECDSA P-256 signing keypair + RSA-OAEP 2048-bit encryption keypair
3. Public keys sent to backend for storage
4. Full keypairs stored in **IndexedDB** (encrypted with password + random salt, AES-256-GCM)
5. Keys kept in memory for current session

### Key Loading (Login)

1. Store login action calls `keyManager.loadUserKeys(userId, password)`
2. Retrieves keypairs from **IndexedDB** by userId
3. Re-imports raw key data into `CryptoKey` objects
4. Keys kept in memory for current session
5. On page refresh, `restoreKeys` action auto-reloads from **IndexedDB**

### Voting Flow

1. User selects candidate on `VoteView`
2. `keyManager.generateVote()` creates vote package:
   - Generates nullifier (SHA-256 of private key + election ID)
   - Encrypts ballot with election's RSA public key
   - Signs the vote package with user's ECDSA private key
3. Vote package sent to backend `/api/elections/:id/vote`
4. Backend verifies signature, checks double-vote via nullifier
5. Returns receipt with transaction hash

### Key Files

| File                     | Purpose                                            |
| ------------------------ | -------------------------------------------------- |
| `services/crypto.js`     | Low-level Web Crypto API operations                |
| `services/keyManager.js` | High-level key lifecycle management                |
| `store/index.js`         | Login/register actions that trigger key operations |

## State Management

Vuex store with single module:

- **Auth**: `user`, `token`, `isAuthenticated`, `isAdmin`
- **Elections**: `elections`, `currentElection`
- **UI**: `loading`, `error`, `keyLoadError`

User data persists to `localStorage` under `voter_user` for session recovery on refresh.

**Actions:** `login` sends `loginType: "voter"` (role-filtered). `restoreKeys` auto-loads cryptographic keys from **IndexedDB** on app init (called from `App.vue`). `logout` calls `keyManager.clearKeys()` to wipe in-memory keys.

## Routing

Vue Router with navigation guards:

- `requiresAuth` — redirects to `/login` if no token
- Login redirects preserve intended destination via `?redirect=` query param

**Note:** Frontend is voter-only (port 5173). Admin panel runs separately on port 5174 with its own router and auth.

## Components

### AppModal

Reusable modal with 4 types: `success`, `error`, `warning`, `info`. Props: `show`, `type`, `title`, `message`, `confirmText`, `cancelText`, `showCancel`. Emits: `confirm`, `cancel`.

### NavBar

Sticky navigation with:

- Theme toggle (sun/moon icon)
- User profile hover card (name, email, institution ID, role)
- Mobile hamburger menu
- Auth-aware links (shows Login/Register or Elections/Admin/Logout)

### VoteReceipt

Cryptographic receipt displayed after voting. Shows transaction hash, timestamp, and opaque receipt ID. Supports copy-to-clipboard, download as JSON, and print. Nullifier is never exposed to protect voter privacy.

## Mobile Responsive

Three breakpoints:

- **Desktop** (1280px+): Full multi-column layouts
- **Tablet** (768px-1280px): Stacked grids, adjusted spacing
- **Mobile** (375px-768px): Single column, hamburger nav, full-width buttons
