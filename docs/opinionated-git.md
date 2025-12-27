# Opinionated Git Behaviors

Ledger is opinionated about common git paper cuts. Rather than showing cryptic git errors, we handle common situations automatically.

## Philosophy

Git's CLI is conservative and shows warnings/errors for situations that rarely cause real problems. Ledger is smarter about these cases:

1. **Try the smart thing first**
2. **Only fail on real conflicts**
3. **Provide clear options when intervention is needed**

---

## Auto-Stash on Pull

**The Problem:** Git refuses to pull if you have ANY uncommitted changes, even if those changes don't conflict with incoming changes.

```
error: cannot pull with rebase: You have unstaged changes.
error: please commit or stash them.
```

**Ledger's Solution:** Auto-stash, pull, then restore.

```
Pull requested with uncommitted changes
    ↓
Stash changes (including untracked files)
    ↓
Pull with rebase
    ↓
Pop stash to restore changes
    ↓
✓ "Pulled 3 commits and restored your uncommitted changes"
```

**When it fails:** Only if there's an actual conflict between your uncommitted changes and the pulled changes. In that case, Ledger will tell you exactly what happened.

**Implementation:** `pullCurrentBranch()` in `git-service.ts`

---

## Behind-Check Before Commit

**The Problem:** You stage changes and commit, only to realize origin has moved ahead. Now you need to pull, deal with merge commits, or rebase.

**Ledger's Solution:** Before committing, fetch and check if you're behind origin.

```
User clicks "Commit"
    ↓
Fetch origin (silent)
    ↓
Are we behind? → Yes → Show prompt:
                        ┌─────────────────────────────────────┐
                        │ ⚠️ Origin has 3 new commits         │
                        │                                     │
                        │ [Pull & Commit] [Commit Ahead] [X]  │
                        └─────────────────────────────────────┘
    ↓ No
Commit normally
```

**Options:**
- **Pull & Commit** — Pull first (with auto-stash magic), then commit
- **Commit Ahead** — Commit anyway, you'll deal with origin later
- **Cancel** — Think about it

**Implementation:** `commitChanges(message, description, force)` in `git-service.ts`

---

## Future Opinions

Things we might handle automatically in the future:

### Auto-fetch on Focus
Fetch origin when the app gains focus so you always see up-to-date behind/ahead counts.

### Smart Branch Cleanup
When a branch is merged and deleted on origin, offer to clean up the local branch.

### Conflict Prevention
Before switching branches, warn if you have uncommitted changes that would conflict.

### Stash Naming
When auto-stashing, use meaningful names like `ledger-auto-stash-for-pull` so you can identify Ledger's stashes.

---

## Disabling Opinions

Currently, these behaviors are always on. In the future, we may add settings to disable specific behaviors for users who prefer vanilla git.

---

## Contributing

Found a git paper cut that Ledger should handle better? Open an issue describing:

1. The git error/situation
2. Why it's annoying
3. What the smart behavior should be

