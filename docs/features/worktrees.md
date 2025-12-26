# 🌲 Worktrees

> First-class support for git worktrees with AI agent workspace detection.

## Overview

Git worktrees allow you to have multiple working directories from a single repository. Ledger enhances worktrees with automatic detection of AI agent workspaces (Cursor, Claude, Gemini), diff statistics, and smart display names.

## Features

### Agent Detection

Ledger automatically detects which AI agent created a worktree:

| Agent | Detection Path | Display |
|-------|---------------|---------|
| **Cursor** | `~/.cursor/worktrees/` | "Cursor 1: context" |
| **Claude** | `~/.claude/worktrees/` | "Claude 1: context" |
| **Gemini** | `~/.gemini/worktrees/` | "Gemini 1: context" |
| **Unknown** | Other paths | Folder name |

### Smart Display Names

```
Format: "{Agent} {Index}: {Context}"

Examples:
  • Cursor 1: AuthController
  • Claude 2: login-fix
  • Gemini 1: workspace
```

**Context Hint Priority:**
1. Primary modified file name (if changes exist)
2. Branch name (if checked out)
3. Last commit message (truncated)
4. Generic "workspace"

### Diff Statistics

Each worktree shows:
- **Changed file count**: Number of modified files
- **Additions**: Lines added (`+42`)
- **Deletions**: Lines removed (`-17`)
- **Clean indicator**: "clean" if no changes

## Data Model

```typescript
interface EnhancedWorktree {
  path: string;              // "/Users/me/.cursor/worktrees/abc123"
  head: string;              // Commit hash
  branch: string | null;     // "feature/auth" or null if detached
  bare: boolean;             // Bare repo flag
  
  // Agent metadata
  agent: 'cursor' | 'claude' | 'gemini' | 'junie' | 'unknown';
  agentIndex: number;        // 1, 2, 3... per agent type
  contextHint: string;       // "AuthController"
  displayName: string;       // "Cursor 1: AuthController"
  
  // Diff statistics
  changedFileCount: number;  // 3
  additions: number;         // 42
  deletions: number;         // 17
  
  // Ordering
  lastModified: string;      // ISO timestamp
}
```

## Actions

### Checkout Worktree (Double-click)

Switches to the branch associated with the worktree:

```
User double-clicks "Cursor 1: AuthController"
    │
    ├─► Get worktree branch: "feature/auth"
    │
    ├─► Auto-stash current changes (if any)
    │
    ├─► git checkout feature/auth
    │
    └─► Show success toast
```

### Open in Finder (Right-click)

Opens the worktree directory in macOS Finder.

### Convert to Branch (Right-click)

**Powerful feature**: Takes changes from a worktree and creates a proper branch.

```
Convert "Cursor 1: AuthController" to branch
    │
    ├─► Detect base branch (main/master)
    │
    ├─► Create new branch from base
    │       Name: worktree folder name
    │
    ├─► Create patch from worktree changes
    │       git diff > /tmp/changes.patch
    │
    ├─► Apply patch to new branch
    │       git apply /tmp/changes.patch
    │
    ├─► Stage all changes
    │       git add -A
    │
    └─► Return branch name for commit
```

**Use case**: AI agents often work in worktrees. This lets you easily promote their work to a proper branch for review and commit.

## Filtering

```
┌─────────────────────────────────────┐
│ Parent:  [All ▾]                    │
│          • All                      │
│          • .cursor                  │
│          • .claude                  │
│          • main                     │
└─────────────────────────────────────┘
```

Filter worktrees by their parent directory to see only specific agent workspaces.

## Git Commands Used

| Feature | Command |
|---------|---------|
| List worktrees | `git worktree list --porcelain` |
| Get status | `git status --porcelain` (in worktree) |
| Get diff stats | `git diff --shortstat` (in worktree) |
| Get commit msg | `git log -1 --format=%s` (in worktree) |
| Convert to branch | `git diff`, `git checkout -b`, `git apply` |

## UI Locations

### Column Mode
- **Worktrees** column (2nd column)
- Shows all worktrees with diff stats

### Work Mode
- **Worktrees** section in sidebar (collapsible)
- Single-click → Shows worktree info in detail panel
- Double-click → Checks out worktree branch

## Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| `●` dot | Currently checked out |
| `+42 -17` | Additions/deletions |
| `3 files` | Changed file count |
| `clean` | No uncommitted changes |

## Example Display

```
┌─────────────────────────────────────────────────────┐
│ ⧉ Worktrees                                    [4] │
├─────────────────────────────────────────────────────┤
│ Cursor 1: AuthController                        ●  │
│ ~/.cursor/worktrees/abc123                         │
│ abc123 · +42 -17 · 3 files                         │
│                                                    │
│ Cursor 2: DocsUpdate                               │
│ ~/.cursor/worktrees/def456                         │
│ def456 · clean                                     │
│                                                    │
│ Claude 1: login-fix                                │
│ ~/.claude/worktrees/ghi789                         │
│ ghi789 · +8 -2 · 1 file                            │
└────────────────────────────────────────────────────┘
```

## Work Mode Detail Panel

When a worktree is selected:

```
┌─────────────────────────────────────────────────────┐
│ [Worktree]                                          │
│                                                     │
│ Cursor 1: AuthController                            │
│                                                     │
│ PATH                                                │
│ /Users/me/.cursor/worktrees/abc123                  │
│                                                     │
│ BRANCH           STATUS                             │
│ feature/auth     Current                            │
│                                                     │
│ CHANGES                                             │
│ 3 files · +42 -17                                   │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ Double-click to checkout this worktree              │
└─────────────────────────────────────────────────────┘
```

## Performance Notes

- Worktree metadata is fetched in parallel
- Diff stats require executing git in each worktree directory
- Many worktrees (10+) may cause slight delay
- Directory mtime used for sorting by recency

