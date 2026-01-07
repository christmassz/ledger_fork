# AGENTS.md

This file helps AI assistants understand and work with the Ledger codebase.

## Project Overview

Ledger is a macOS desktop app for viewing git branches, worktrees, and pull requests. Built with Electron + React + TypeScript.

## Quick Facts

| Aspect | Details |
|--------|---------|
| Type | Electron desktop app |
| Platform | macOS (Apple Silicon) |
| Language | TypeScript (strict mode) |
| UI | React 19 + custom CSS |
| Git | `simple-git` library |
| PRs | GitHub CLI (`gh`) |
| Tests | Playwright E2E |
| Build | electron-vite + electron-builder |

## Key Files to Know

```
lib/main/main.ts         # IPC handlers, app lifecycle
lib/main/git-service.ts  # All git operations (large)
lib/preload/preload.ts   # API exposed to renderer
app/app.tsx              # Main React component (large)
app/styles/app.css       # All styling (large)
app/types/electron.d.ts  # TypeScript types for IPC
app/components/          # UI components (panels, canvas, window)
```

## Common Tasks

### Adding a new git operation

1. Add function to `lib/main/git-service.ts`
2. Add IPC handler in `lib/main/main.ts`
3. Expose in `lib/preload/preload.ts`
4. Add types to `app/types/electron.d.ts`
5. Call from `app/app.tsx`

### Adding UI elements

Main UI is in `app/app.tsx`. Components are in `app/components/`:
- `panels/editor/` - Editor panels (BranchDetail, PRReview, Staging, etc.)
- `panels/viz/` - Visualization panels (GitGraph)
- `canvas/` - Canvas layout system
- `window/` - Window chrome (Titlebar, menus)

Styling in `app/styles/app.css` uses CSS variables for theming.

### Running the app

```bash
npm run dev      # Development with hot reload
npm test         # Run E2E tests
npm run lint     # Check for linting issues
npm run build:mac:arm64  # Build for Apple Silicon
```

## Architecture Summary

```
Main Process (Node.js)
├── main.ts - IPC handlers
├── git-service.ts - git commands via simple-git
└── settings-service.ts - persistent storage

    ↕ IPC (ipcMain.handle / ipcRenderer.invoke)

Preload Script
└── preload.ts - exposes window.electronAPI

    ↕ contextBridge

Renderer Process (Browser)
└── app.tsx - React UI, state management
```

## State Management

Uses React hooks only (no Redux/Zustand):
- `useState` for data (branches, worktrees, prs, loading states)
- `useMemo` for derived data (filtered/sorted branches)
- `useCallback` for handlers
- `useEffect` for side effects

## Styling Approach

- Custom CSS (not Tailwind, despite it being installed)
- CSS variables for colors (`--accent`, `--bg-primary`, etc.)
- Mac native light theme aesthetic
- Responsive multi-column layout

## Testing

Playwright E2E tests in `tests/app.spec.ts`:
- Tests welcome screen (no repo)
- Tests main view (with repo via `--repo=` CLI arg)

Run with `npm test` (builds first) or `npm run test:headed`.

## Chrome DevTools Protocol (CDP) Access

AI agents can interact with the running Electron app via Chrome DevTools Protocol for debugging, validation, and UI interaction.

### Starting the App with Debugging

```bash
npm run dev -- --remote-debugging-port=9222
```

This starts the app with CDP enabled on port 9222.

### Checking if Debugging is Available

```bash
# List available debug targets
curl -s http://127.0.0.1:9222/json

# Get browser/app version info
curl -s http://127.0.0.1:9222/json/version
```

### CDP Helper Scripts

Helper scripts are available in `tools/electron-mcp-server/`:

| Script | Purpose |
|--------|---------|
| `cdp-snapshot.js` | Get page content and text |
| `cdp-screenshot.js` | Capture PNG screenshot |
| `cdp-click.js` | Click element by CSS selector |

### Common CDP Operations

**1. Get Page Content (text, element count)**

```javascript
import CDP from 'chrome-remote-interface';

const client = await CDP({ port: 9222 });
const { Runtime } = client;

const { result } = await Runtime.evaluate({
  expression: `({
    title: document.title,
    url: window.location.href,
    bodyText: document.body?.innerText?.substring(0, 5000),
    elementCount: document.querySelectorAll('*').length
  })`,
  returnByValue: true
});

console.log(result.value);
await client.close();
```

**2. Take a Screenshot**

```javascript
import CDP from 'chrome-remote-interface';
import fs from 'fs';

const client = await CDP({ port: 9222 });
const { Page } = client;

await Page.enable();
const { data } = await Page.captureScreenshot({ format: 'png' });
fs.writeFileSync('screenshot.png', Buffer.from(data, 'base64'));

await client.close();
```

**3. Click an Element**

```javascript
import CDP from 'chrome-remote-interface';

const client = await CDP({ port: 9222 });
const { Runtime, Input } = client;

// Find element and get its position
const { result } = await Runtime.evaluate({
  expression: `(() => {
    const el = document.querySelector('[data-testid="my-button"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
  })()`,
  returnByValue: true
});

if (result.value) {
  await Input.dispatchMouseEvent({
    type: 'mousePressed',
    x: result.value.x,
    y: result.value.y,
    button: 'left',
    clickCount: 1
  });
  await Input.dispatchMouseEvent({
    type: 'mouseReleased',
    x: result.value.x,
    y: result.value.y,
    button: 'left'
  });
}

await client.close();
```

**4. Execute Arbitrary JavaScript**

```javascript
import CDP from 'chrome-remote-interface';

const client = await CDP({ port: 9222 });
const { Runtime } = client;

// Access React state, trigger actions, etc.
const { result } = await Runtime.evaluate({
  expression: `window.someGlobalFunction?.() || 'not available'`,
  returnByValue: true
});

await client.close();
```

**5. Monitor Console Output**

```javascript
import CDP from 'chrome-remote-interface';

const client = await CDP({ port: 9222 });
const { Runtime } = client;

await Runtime.enable();
client.on('Runtime.consoleAPICalled', (params) => {
  console.log('Console:', params.type, params.args);
});

// Keep listening...
```

### Quick One-Liner Examples

```bash
# Get page content and text
cd tools/electron-mcp-server && node cdp-snapshot.js

# Take a screenshot (saves to wip/app-screenshot.png)
cd tools/electron-mcp-server && node cdp-screenshot.js

# Take screenshot to custom path
cd tools/electron-mcp-server && node cdp-screenshot.js /path/to/output.png

# Click an element by selector
cd tools/electron-mcp-server && node cdp-click.js "button.refresh"
cd tools/electron-mcp-server && node cdp-click.js "[data-testid='submit']"
```

### Typical Validation Workflow

1. Start app with debugging: `npm run dev -- --remote-debugging-port=9222`
2. Wait for app to load (~5 seconds)
3. Verify debugging available: `curl -s http://127.0.0.1:9222/json`
4. Run CDP scripts to inspect/interact with the UI
5. Take screenshots to validate visual state

### Notes

- CDP scripts require `chrome-remote-interface` package (installed in `tools/electron-mcp-server/`)
- Screenshots saved to `wip/` are gitignored
- The app must be running for CDP to connect
- Port 9222 is the standard Chrome debugging port

## Git Operations Available

This list is intentionally **non-exhaustive**. The canonical contract is:

- `app/types/electron.d.ts` (renderer-facing `window.electronAPI`)
- `lib/main/git-service.ts` (git operations)
- `lib/main/settings-service.ts` (persistent settings: themes, canvases, etc.)

## Error Handling

- Git errors shown in error banner
- PR errors shown in PR column
- Operation results shown as dismissible toasts
- All IPC returns `{ success, message }` or `{ error }` pattern
- Unused catch variables prefixed with `_` (e.g., `_error`)

## Settings Storage

JSON file at `~/Library/Application Support/ledger/ledger-settings.json`:
```json
{
  "lastRepoPath": "/path/to/repo"
}
```

## Build & Distribution

### Development Build
```bash
npm run build:mac:arm64  # Build unsigned for local testing
```

### Release Build (Signed + Notarized + Published)
```bash
APPLE_KEYCHAIN_PROFILE="AC_PASSWORD" npm run release
```

This builds, signs, notarizes, and publishes to GitHub Releases.

### Notarization Setup

**Important:** The `notarize` option in `electron-builder.yml` must be a **boolean** (`true`/`false`), not an object. Credentials are passed via environment variables.

```yaml
# electron-builder.yml
mac:
  identity: "Peter Thomson (R4RRG93J68)"
  notarize: true  # Must be boolean, not object!
```

**Required credentials** (one of these sets via env vars):
1. `APPLE_KEYCHAIN_PROFILE` - keychain profile name (recommended)
2. `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
3. `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`

**One-time setup** to store credentials in keychain:
```bash
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "your@email.com" \
  --team-id "YOUR_TEAM_ID"
# Enter app-specific password when prompted
```

**During signing:** macOS may show a keychain access dialog - click "Always Allow" to prevent it blocking future builds.

### Notarization Troubleshooting

⚠️ **Warning:** Apple's notarization service can be slow and unreliable. Builds may hang for 30+ minutes or even 24+ hours. The service occasionally has outages or backlogs. Proceed with patience.

**Best practices:**
- Copy build artifacts to `wip/builds/` before starting notarization (folder is gitignored)
- Run notarization separately from the main build if experiencing issues
- Don't assume a timeout means failure - check status manually

**Check notarization status:**
```bash
# List recent submissions
xcrun notarytool history --keychain-profile "AC_PASSWORD"

# Get detailed log for a submission ID
xcrun notarytool log <submission-id> --keychain-profile "AC_PASSWORD"

# Check info for a specific submission
xcrun notarytool info <submission-id> --keychain-profile "AC_PASSWORD"
```

**Common issues:**
- "In Progress" for extended periods: Apple's servers may be slow; check back later
- "Team is not yet configured for notarization": Contact Apple Developer support
- ZIP files notarize; DMGs sometimes fail: Try rebuilding or contact support

### Build Artifacts
- DMG: `dist/Ledger-{version}-arm64.dmg`
- ZIP: `dist/Ledger-{version}-arm64-mac.zip`
- Published to GitHub Releases automatically

## Code Style

- Prettier for formatting
- ESLint for linting (see `eslint.config.mjs`)
- TypeScript strict mode
- Functional React components
- No class components
- Unused variables prefixed with `_`

## Areas for Improvement

1. The `git-service.ts` file is large (~5400 lines) - partially modularized into `lib/services/`
2. No loading skeletons - just "Loading..." text
3. No keyboard shortcuts yet
4. PR integration requires `gh` CLI - could add fallback
5. Only macOS supported currently
6. React hooks exhaustive-deps warnings (intentional to prevent infinite loops)

## IPC Naming Convention

- Channels use kebab-case: `get-branches`, `checkout-branch`
- Functions use camelCase: `getBranches()`, `checkoutBranch()`
