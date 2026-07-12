# GitHub Push Guide

Follow these steps to push your project to GitHub:

## Step 1: Initialize Git Repository

```bash
cd h:/Voting
git init
git add .
```

## Step 2: Create Initial Commit

```bash
git commit -m "Initial commit: University Blockchain Voting System

Features:
- Backend API with encrypted vote handling (Node.js/Express)
- Frontend with Web Crypto API integration (Vue.js 3)
- Client-side key generation (ECDSA P-256 + RSA-OAEP 2048)
- Digital signatures and nullifier-based double-vote prevention
- MySQL database with crypto fields
- Custom blockchain node with PoW consensus
- Comprehensive documentation and test suite

Status: 60% complete, Phase 2 (Backend Integration) complete
Working: End-to-end encrypted voting with signature verification"
```

## Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Create repository named: `university-voting-system` (or your preferred name)
3. **DO NOT** initialize with README (we already have one)
4. **DO NOT** add .gitignore (we already have them)
5. Click "Create repository"

## Step 4: Connect to GitHub

```bash
# Replace 'yourusername' with your actual GitHub username
git remote add origin https://github.com/yourusername/university-voting-system.git

# Verify remote
git remote -v
```

## Step 5: Push to GitHub

```bash
# Rename branch to main (if needed)
git branch -M main

# Push code
git push -u origin main
```

## Step 6: Verify Upload

Visit your repository on GitHub and verify:
- [ ] All folders visible (backend, frontend, blockchain-node, Project_Status)
- [ ] README.md displays correctly
- [ ] .gitignore files present in each folder
- [ ] No node_modules/ folders uploaded
- [ ] No .env files uploaded
- [ ] No sensitive data/ JSON files uploaded

## Troubleshooting

### Issue: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/yourusername/university-voting-system.git
```

### Issue: Large files warning
```bash
# Check file sizes
git ls-files | xargs ls -lh | sort -k5 -hr | head -20

# If needed, remove large files
git rm --cached path/to/large/file
```

### Issue: Authentication failed
```bash
# Use personal access token instead of password
# Generate at: https://github.com/settings/tokens
```

## Optional: Add Repository Topics

On GitHub, add these topics to your repository:
- `blockchain`
- `voting-system`
- `cryptography`
- `web-crypto-api`
- `vue3`
- `nodejs`
- `express`
- `mysql`
- `ecdsa`
- `rsa-encryption`

## Optional: Enable GitHub Pages (for documentation)

1. Go to Settings → Pages
2. Source: Deploy from branch
3. Branch: main → /docs or /Project_Status
4. Save

---

## What Gets Ignored (won't be uploaded):

✅ **Ignored (safe):**
- `node_modules/` (all packages - 100MB+)
- `.env` files (database credentials)
- `data/*.json` (voter/election data)
- `blockchain-node/data/` (blockchain data files)
- Log files
- IDE settings

✅ **Uploaded (safe):**
- Source code (.js, .vue, .sql files)
- Package.json files
- Documentation (.md files)
- .gitignore files
- Configuration files
- README.md

---

## After Upload - Setup Instructions

Anyone cloning your repo will need to:

```bash
# Clone
git clone https://github.com/yourusername/university-voting-system.git
cd university-voting-system

# Backend setup
cd backend
npm install
cp .env.example .env  # Then configure
npm run migrate
npm run dev

# Frontend setup
cd ../frontend
npm install
npm run dev

# Blockchain setup (optional)
cd ../blockchain-node
npm install
npm start
```

---

## Repository Settings Recommendations

### Branch Protection (after Phase 3):
- Require pull request reviews
- Require status checks to pass
- Restrict who can push

### Security:
- Enable Dependabot alerts
- Enable secret scanning
- Add SECURITY.md file

### Collaboration:
- Add CONTRIBUTING.md
- Add CODE_OF_CONDUCT.md
- Add issue templates

---

**Ready to push!** Follow Step 1-5 above.
