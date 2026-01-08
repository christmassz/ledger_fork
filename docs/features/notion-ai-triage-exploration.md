# Notion AI Card Triage - Exploration Document

## Overview

This document explores adding AI-powered card triage functionality to Ledger, integrating with Notion databases and using Claude/Gemini for intelligent summarization and investigation prompts.

---

## Architecture Decision: Core vs Plugin

### Recommendation: Hybrid Approach

| Component | Location | Rationale |
|-----------|----------|-----------|
| **AI Service** | Core | Enables AI across the app (commit messages, PR summaries, diff explanations) |
| **Notion Service** | Core | Complex API, auth flow, rate limiting better handled centrally |
| **Triage UI** | Plugin | Workflow-specific, optional, can evolve independently |

### Why Core AI Service?

The plugin architecture already defines AI hooks (`lib/plugins/plugin-types.ts:256-261`):

```typescript
// Existing AI hooks that need a core implementation
'ai:analyze-commit': (commit: Commit) => Promise<CommitAnalysis>
'ai:review-pr': (pr: PullRequest, diff: string) => Promise<PRReviewSuggestion[]>
'ai:suggest-commit-message': (diff: string, context?: CommitContext) => Promise<string>
'ai:summarize-changes': (commits: Commit[]) => Promise<string>
'ai:explain-diff': (diff: string) => Promise<string>
```

These hooks currently have no implementation. A core AI service would power both:
1. Built-in features (commit message suggestions, diff explanations)
2. Plugins like Notion Triage

### Why Core Notion Service?

1. **API Complexity**: Notion's 2025-09-03 API changes require:
   - Two-step queries (fetch `data_source_id`, then query)
   - Pagination handling (100 items max per request)
   - Rate limiting (3 req/sec)

2. **Auth Management**: OAuth flow or API key storage needs secure handling

3. **Reusability**: Other plugins might want Notion access (project tracking, wiki sync)

---

## Part 1: Core AI Service

### New Files

```
lib/main/ai-service.ts              # AI provider abstraction
lib/conveyor/handlers/ai-handler.ts # IPC handlers
lib/conveyor/schemas/ai-schema.ts   # Zod validation
lib/conveyor/api/ai-api.ts          # Renderer API
```

### Settings Extension

```typescript
// lib/main/settings-service.ts - Add to Settings interface
interface Settings {
  // ... existing fields ...

  ai?: {
    provider: 'anthropic' | 'gemini' | 'openai'
    anthropicApiKey?: string      // Encrypted or use keychain
    geminiApiKey?: string
    openaiApiKey?: string         // Future-proofing
    defaultModel?: string         // e.g., 'claude-sonnet-4-20250514'
    maxTokens?: number            // Default context limit
  }
}
```

### AI Service Interface

```typescript
// lib/main/ai-service.ts

export type AIProvider = 'anthropic' | 'gemini' | 'openai'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIServiceConfig {
  provider: AIProvider
  apiKey: string
  model?: string
  maxTokens?: number
}

export interface AIService {
  // Core methods
  complete(prompt: string, options?: CompletionOptions): Promise<string>
  chat(messages: AIMessage[], options?: ChatOptions): Promise<string>
  streamChat(messages: AIMessage[], onChunk: (text: string) => void): Promise<string>

  // Convenience methods
  summarize(content: string, maxLength?: number): Promise<string>
  askQuestions(context: string, topic: string): Promise<string[]>
  analyze(content: string, schema: AnalysisSchema): Promise<unknown>
}

export interface CompletionOptions {
  maxTokens?: number
  temperature?: number
  stopSequences?: string[]
}

// Provider implementations
class AnthropicProvider implements AIService { /* ... */ }
class GeminiProvider implements AIService { /* ... */ }

// Factory
export function createAIService(config: AIServiceConfig): AIService {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config)
    case 'gemini':
      return new GeminiProvider(config)
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}
```

### IPC Channels

```typescript
// lib/conveyor/schemas/ai-schema.ts
import { z } from 'zod'

export const aiIpcSchema = {
  'ai:complete': {
    args: z.tuple([
      z.string(),                          // prompt
      z.object({
        maxTokens: z.number().optional(),
        temperature: z.number().optional(),
      }).optional()
    ]),
    return: z.object({
      success: z.boolean(),
      result: z.string().optional(),
      error: z.string().optional(),
    }),
  },

  'ai:chat': {
    args: z.tuple([
      z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })),
      z.object({ maxTokens: z.number().optional() }).optional()
    ]),
    return: z.object({
      success: z.boolean(),
      result: z.string().optional(),
      error: z.string().optional(),
    }),
  },

  'ai:summarize': {
    args: z.tuple([z.string(), z.number().optional()]),
    return: z.object({
      success: z.boolean(),
      summary: z.string().optional(),
      error: z.string().optional(),
    }),
  },

  'ai:generate-questions': {
    args: z.tuple([z.string(), z.string()]),  // context, topic
    return: z.object({
      success: z.boolean(),
      questions: z.array(z.string()).optional(),
      error: z.string().optional(),
    }),
  },

  'ai:get-config': {
    args: z.tuple([]),
    return: z.object({
      configured: z.boolean(),
      provider: z.enum(['anthropic', 'gemini', 'openai']).optional(),
      model: z.string().optional(),
    }),
  },

  'ai:set-config': {
    args: z.tuple([z.object({
      provider: z.enum(['anthropic', 'gemini', 'openai']),
      apiKey: z.string(),
      model: z.string().optional(),
    })]),
    return: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
}
```

### Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.50.0",
    "@google/generative-ai": "^0.21.0"
  }
}
```

---

## Part 2: Core Notion Service

### New Files

```
lib/main/notion-service.ts              # Notion API wrapper
lib/conveyor/handlers/notion-handler.ts # IPC handlers
lib/conveyor/schemas/notion-schema.ts   # Zod validation
lib/conveyor/api/notion-api.ts          # Renderer API
```

### Settings Extension

```typescript
// Add to Settings interface
interface Settings {
  // ... existing fields ...

  notion?: {
    apiKey?: string           // Internal integration token
    // OAuth tokens if using OAuth flow
    accessToken?: string
    refreshToken?: string
    tokenExpiry?: number
  }
}
```

### Notion Service Interface

```typescript
// lib/main/notion-service.ts

import { Client } from '@notionhq/client'

export interface NotionDatabase {
  id: string
  title: string
  dataSourceId: string        // Required for 2025-09-03 API
  properties: NotionProperty[]
}

export interface NotionProperty {
  id: string
  name: string
  type: 'title' | 'rich_text' | 'select' | 'multi_select' | 'status' |
        'date' | 'people' | 'checkbox' | 'number' | 'url' | 'relation'
  options?: { id: string; name: string; color?: string }[]
}

export interface NotionCard {
  id: string
  title: string
  properties: Record<string, unknown>
  content: string             // Extracted page content as markdown
  url: string
  createdTime: string
  lastEditedTime: string
}

export interface NotionService {
  // Auth
  isConfigured(): boolean
  setApiKey(key: string): void

  // Databases
  listDatabases(): Promise<NotionDatabase[]>
  getDatabase(databaseId: string): Promise<NotionDatabase>

  // Cards (Pages in a database)
  queryCards(databaseId: string, options?: QueryOptions): Promise<{
    cards: NotionCard[]
    hasMore: boolean
    nextCursor?: string
  }>
  getCard(pageId: string): Promise<NotionCard>
  updateCardProperty(pageId: string, property: string, value: unknown): Promise<void>

  // Content
  getPageContent(pageId: string): Promise<string>  // Returns markdown
}

export interface QueryOptions {
  filter?: {
    property: string
    type: 'select' | 'status' | 'checkbox' | 'date'
    value: unknown
  }
  sorts?: { property: string; direction: 'ascending' | 'descending' }[]
  pageSize?: number
  startCursor?: string
}
```

### IPC Channels

```typescript
// lib/conveyor/schemas/notion-schema.ts

export const notionIpcSchema = {
  'notion:is-configured': {
    args: z.tuple([]),
    return: z.boolean(),
  },

  'notion:set-api-key': {
    args: z.tuple([z.string()]),
    return: z.object({ success: z.boolean(), error: z.string().optional() }),
  },

  'notion:list-databases': {
    args: z.tuple([]),
    return: z.object({
      success: z.boolean(),
      databases: z.array(z.object({
        id: z.string(),
        title: z.string(),
        dataSourceId: z.string(),
        properties: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
          options: z.array(z.object({
            id: z.string(),
            name: z.string(),
            color: z.string().optional(),
          })).optional(),
        })),
      })).optional(),
      error: z.string().optional(),
    }),
  },

  'notion:query-cards': {
    args: z.tuple([
      z.string(),  // databaseId
      z.object({
        filter: z.object({
          property: z.string(),
          type: z.enum(['select', 'status', 'checkbox', 'date']),
          value: z.unknown(),
        }).optional(),
        sorts: z.array(z.object({
          property: z.string(),
          direction: z.enum(['ascending', 'descending']),
        })).optional(),
        pageSize: z.number().optional(),
        startCursor: z.string().optional(),
      }).optional()
    ]),
    return: z.object({
      success: z.boolean(),
      cards: z.array(z.object({
        id: z.string(),
        title: z.string(),
        properties: z.record(z.unknown()),
        content: z.string(),
        url: z.string(),
        createdTime: z.string(),
        lastEditedTime: z.string(),
      })).optional(),
      hasMore: z.boolean().optional(),
      nextCursor: z.string().optional(),
      error: z.string().optional(),
    }),
  },

  'notion:get-card': {
    args: z.tuple([z.string()]),  // pageId
    return: z.object({
      success: z.boolean(),
      card: z.object({
        id: z.string(),
        title: z.string(),
        properties: z.record(z.unknown()),
        content: z.string(),
        url: z.string(),
        createdTime: z.string(),
        lastEditedTime: z.string(),
      }).optional(),
      error: z.string().optional(),
    }),
  },

  'notion:update-card-property': {
    args: z.tuple([
      z.string(),   // pageId
      z.string(),   // property name
      z.unknown(),  // value
    ]),
    return: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
}
```

### Dependencies

```json
{
  "dependencies": {
    "@notionhq/client": "^5.0.0"
  }
}
```

### API Version Handling

The Notion API 2025-09-03 introduced breaking changes. The service must:

```typescript
// lib/main/notion-service.ts

class NotionServiceImpl implements NotionService {
  private client: Client
  private dataSourceCache: Map<string, string> = new Map()

  async queryCards(databaseId: string, options?: QueryOptions) {
    // Step 1: Get data_source_id (cache this)
    let dataSourceId = this.dataSourceCache.get(databaseId)
    if (!dataSourceId) {
      const db = await this.client.databases.retrieve({ database_id: databaseId })
      // In 2025-09-03, databases have data_sources array
      dataSourceId = db.data_sources?.[0]?.id || databaseId
      this.dataSourceCache.set(databaseId, dataSourceId)
    }

    // Step 2: Query via data sources API
    const response = await this.client.dataSources.query({
      data_source_id: dataSourceId,
      filter: options?.filter ? this.buildFilter(options.filter) : undefined,
      sorts: options?.sorts,
      page_size: options?.pageSize || 50,
      start_cursor: options?.startCursor,
    })

    // Step 3: Transform results
    return {
      cards: await Promise.all(response.results.map(p => this.transformPage(p))),
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
    }
  }
}
```

---

## Part 3: Notion Triage Plugin

### Plugin Structure

```
lib/plugins/notion-triage/
├── index.ts                    # Plugin definition
├── components/
│   ├── TriageApp.tsx           # Main app component
│   ├── SetupPanel.tsx          # Initial configuration
│   ├── CardViewer.tsx          # Single card display
│   ├── AIInsights.tsx          # Summary + questions
│   └── TriageActions.tsx       # Status change buttons
└── hooks/
    └── useTriage.ts            # Triage state management
```

### Plugin Definition

```typescript
// lib/plugins/notion-triage/index.ts

import type { AppPlugin } from '@/lib/plugins/plugin-types'

export const notionTriagePlugin: AppPlugin = {
  id: 'ledger.notion-triage',
  name: 'Notion Triage',
  version: '1.0.0',
  type: 'app',
  description: 'AI-powered triage for Notion database cards',

  icon: 'ListChecks',           // Lucide icon
  iconTooltip: 'Notion Triage',
  iconOrder: 50,

  component: 'NotionTriageApp',

  permissions: ['network'],

  settings: [
    {
      key: 'databaseId',
      label: 'Notion Database',
      type: 'string',
      default: '',
      description: 'The Notion database to triage',
    },
    {
      key: 'statusColumn',
      label: 'Status Column',
      type: 'string',
      default: 'Status',
      description: 'Column name for card status',
    },
    {
      key: 'filterStatus',
      label: 'Filter by Status',
      type: 'select',
      default: '',
      description: 'Only show cards with this status',
      options: [],  // Populated dynamically
    },
    {
      key: 'triageStatuses',
      label: 'Triage Status Options',
      type: 'multiselect',
      default: ['Backlog', 'To Do', 'Blocked', 'Won\'t Do'],
      description: 'Status options to show during triage',
    },
  ],

  async activate(context) {
    context.logger.info('Notion Triage plugin activated')

    // Check if Notion is configured
    const notionConfigured = await window.conveyor.notion.isConfigured()
    if (!notionConfigured) {
      context.api.showNotification(
        'Please configure Notion API key in Settings → Integrations',
        'warning'
      )
    }
  },
}
```

### Main App Component

```tsx
// lib/plugins/notion-triage/components/TriageApp.tsx

import React, { useState, useEffect } from 'react'
import type { PluginAppProps } from '@/lib/plugins/plugin-types'
import { SetupPanel } from './SetupPanel'
import { CardViewer } from './CardViewer'
import { AIInsights } from './AIInsights'
import { TriageActions } from './TriageActions'

interface NotionCard {
  id: string
  title: string
  properties: Record<string, unknown>
  content: string
  url: string
}

export function NotionTriageApp({ context }: PluginAppProps) {
  const [isSetup, setIsSetup] = useState(false)
  const [cards, setCards] = useState<NotionCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [triageQuestions, setTriageQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const currentCard = cards[currentIndex]

  // Load settings and cards on mount
  useEffect(() => {
    async function init() {
      const databaseId = await context.storage.get<string>('databaseId')
      if (!databaseId) {
        setLoading(false)
        return
      }

      setIsSetup(true)
      await loadCards(databaseId)
    }
    init()
  }, [])

  // Generate AI insights when card changes
  useEffect(() => {
    if (currentCard) {
      generateInsights(currentCard)
    }
  }, [currentCard?.id])

  async function loadCards(databaseId: string) {
    setLoading(true)
    const filterStatus = await context.storage.get<string>('filterStatus')
    const statusColumn = await context.storage.get<string>('statusColumn') || 'Status'

    const result = await window.conveyor.notion.queryCards(databaseId, {
      filter: filterStatus ? {
        property: statusColumn,
        type: 'status',
        value: filterStatus,
      } : undefined,
      sorts: [{ property: 'Created', direction: 'descending' }],
    })

    if (result.success && result.cards) {
      setCards(result.cards)
    }
    setLoading(false)
  }

  async function generateInsights(card: NotionCard) {
    setAiSummary(null)
    setTriageQuestions([])

    // Build context from card
    const cardContext = `
Title: ${card.title}

Properties:
${Object.entries(card.properties)
  .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
  .join('\n')}

Content:
${card.content}
    `.trim()

    // Get AI summary
    const summaryResult = await window.conveyor.ai.summarize(cardContext, 200)
    if (summaryResult.success) {
      setAiSummary(summaryResult.summary)
    }

    // Get triage questions
    const questionsResult = await window.conveyor.ai.generateQuestions(
      cardContext,
      'triage and prioritization'
    )
    if (questionsResult.success) {
      setTriageQuestions(questionsResult.questions || [])
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!currentCard) return

    const statusColumn = await context.storage.get<string>('statusColumn') || 'Status'

    await window.conveyor.notion.updateCardProperty(
      currentCard.id,
      statusColumn,
      newStatus
    )

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Reload to get fresh list
      const databaseId = await context.storage.get<string>('databaseId')
      if (databaseId) await loadCards(databaseId)
    }
  }

  function handleSkip() {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (loading) {
    return <div className="triage-loading">Loading...</div>
  }

  if (!isSetup) {
    return <SetupPanel context={context} onComplete={() => setIsSetup(true)} />
  }

  if (cards.length === 0) {
    return (
      <div className="triage-empty">
        <h2>No cards to triage</h2>
        <p>All cards have been processed or the filter returned no results.</p>
      </div>
    )
  }

  return (
    <div className="notion-triage-app">
      <header className="triage-header">
        <h1>Notion Triage</h1>
        <span className="triage-progress">
          Card {currentIndex + 1} of {cards.length}
        </span>
      </header>

      <main className="triage-content">
        <CardViewer card={currentCard} />

        <AIInsights
          summary={aiSummary}
          questions={triageQuestions}
          loading={!aiSummary}
        />

        <TriageActions
          onStatusChange={handleStatusChange}
          onSkip={handleSkip}
          onPrevious={handlePrevious}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < cards.length - 1}
          context={context}
        />
      </main>
    </div>
  )
}
```

### AI Insights Component

```tsx
// lib/plugins/notion-triage/components/AIInsights.tsx

import React from 'react'

interface AIInsightsProps {
  summary: string | null
  questions: string[]
  loading: boolean
}

export function AIInsights({ summary, questions, loading }: AIInsightsProps) {
  if (loading) {
    return (
      <div className="ai-insights loading">
        <div className="ai-summary-skeleton" />
        <div className="ai-questions-skeleton" />
      </div>
    )
  }

  return (
    <div className="ai-insights">
      {summary && (
        <section className="ai-summary">
          <h3>AI Summary</h3>
          <p>{summary}</p>
        </section>
      )}

      {questions.length > 0 && (
        <section className="ai-questions">
          <h3>Triage Questions</h3>
          <ul>
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
```

---

## Part 4: UI Settings Panel

The AI and Notion configuration need UI in the Settings panel.

### Settings Panel Addition

```tsx
// Add to existing Settings panel or create new Integrations tab

function IntegrationsSettings() {
  const [aiConfig, setAiConfig] = useState({
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
  })
  const [notionKey, setNotionKey] = useState('')
  const [saving, setSaving] = useState(false)

  async function saveAIConfig() {
    setSaving(true)
    await window.conveyor.ai.setConfig(aiConfig)
    setSaving(false)
  }

  async function saveNotionKey() {
    setSaving(true)
    await window.conveyor.notion.setApiKey(notionKey)
    setSaving(false)
  }

  return (
    <div className="integrations-settings">
      <section>
        <h2>AI Provider</h2>
        <div className="setting-row">
          <label>Provider</label>
          <select
            value={aiConfig.provider}
            onChange={e => setAiConfig({...aiConfig, provider: e.target.value})}
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="gemini">Google (Gemini)</option>
          </select>
        </div>

        <div className="setting-row">
          <label>API Key</label>
          <input
            type="password"
            value={aiConfig.apiKey}
            onChange={e => setAiConfig({...aiConfig, apiKey: e.target.value})}
            placeholder="sk-ant-..."
          />
        </div>

        <div className="setting-row">
          <label>Model</label>
          <select
            value={aiConfig.model}
            onChange={e => setAiConfig({...aiConfig, model: e.target.value})}
          >
            <optgroup label="Anthropic">
              <option value="claude-opus-4-20250514">Claude Opus 4</option>
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
            </optgroup>
            <optgroup label="Google">
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </optgroup>
          </select>
        </div>

        <button onClick={saveAIConfig} disabled={saving}>
          Save AI Configuration
        </button>
      </section>

      <section>
        <h2>Notion</h2>
        <p className="setting-description">
          Create an internal integration at{' '}
          <a href="https://www.notion.so/my-integrations" target="_blank">
            notion.so/my-integrations
          </a>{' '}
          and share your databases with it.
        </p>

        <div className="setting-row">
          <label>Integration Token</label>
          <input
            type="password"
            value={notionKey}
            onChange={e => setNotionKey(e.target.value)}
            placeholder="secret_..."
          />
        </div>

        <button onClick={saveNotionKey} disabled={saving}>
          Save Notion Token
        </button>
      </section>
    </div>
  )
}
```

---

## Implementation Plan

### Phase 1: Core AI Service (Priority: High)

**Files to create:**
1. `lib/main/ai-service.ts` - Provider abstraction, Anthropic + Gemini implementations
2. `lib/conveyor/schemas/ai-schema.ts` - Zod schemas
3. `lib/conveyor/handlers/ai-handler.ts` - IPC handlers
4. `lib/conveyor/api/ai-api.ts` - Renderer API

**Files to modify:**
1. `lib/main/settings-service.ts` - Add AI settings
2. `lib/conveyor/schemas/index.ts` - Export AI schemas
3. `lib/main/main.ts` - Register AI handlers
4. `package.json` - Add `@anthropic-ai/sdk`, `@google/generative-ai`

**Estimated effort:** Medium

### Phase 2: Core Notion Service (Priority: High)

**Files to create:**
1. `lib/main/notion-service.ts` - Notion API wrapper
2. `lib/conveyor/schemas/notion-schema.ts` - Zod schemas
3. `lib/conveyor/handlers/notion-handler.ts` - IPC handlers
4. `lib/conveyor/api/notion-api.ts` - Renderer API

**Files to modify:**
1. `lib/main/settings-service.ts` - Add Notion settings
2. `lib/conveyor/schemas/index.ts` - Export Notion schemas
3. `lib/main/main.ts` - Register Notion handlers
4. `package.json` - Add `@notionhq/client`

**Estimated effort:** Medium

### Phase 3: Settings UI (Priority: Medium)

**Files to modify:**
1. Add Integrations tab to Settings
2. Create API key input components
3. Add test connection buttons

**Estimated effort:** Low-Medium

### Phase 4: Notion Triage Plugin (Priority: Medium)

**Files to create:**
1. `lib/plugins/notion-triage/index.ts`
2. `lib/plugins/notion-triage/components/TriageApp.tsx`
3. `lib/plugins/notion-triage/components/SetupPanel.tsx`
4. `lib/plugins/notion-triage/components/CardViewer.tsx`
5. `lib/plugins/notion-triage/components/AIInsights.tsx`
6. `lib/plugins/notion-triage/components/TriageActions.tsx`

**Files to modify:**
1. `lib/plugins/examples/index.ts` - Register plugin

**Estimated effort:** Medium

---

## Security Considerations

### API Key Storage

**Current approach**: Plain JSON in settings file
- Location: `~/Library/Application Support/ledger/ledger-settings.json`
- Risk: Keys visible to any process with file read access

**Recommended improvement**: Use macOS Keychain
```typescript
// Future: lib/main/keychain-service.ts
import keytar from 'keytar'

export async function setAPIKey(service: string, key: string) {
  await keytar.setPassword('ledger', service, key)
}

export async function getAPIKey(service: string) {
  return await keytar.getPassword('ledger', service)
}
```

### Rate Limiting

| Service | Limit | Mitigation |
|---------|-------|------------|
| Notion | 3 req/sec | Request queue with exponential backoff |
| Claude | 4000 req/min (tier 1) | Unlikely to hit in normal use |
| Gemini | 60 req/min (free) | Queue for free tier |

---

## Open Questions

1. **Should AI keys be per-repo or global?**
   - Recommendation: Global, since AI is a user-level resource

2. **OAuth vs API key for Notion?**
   - Recommendation: Start with API key (simpler), add OAuth later for teams

3. **Encrypt API keys in settings?**
   - Recommendation: Yes, or use Keychain. File-level encryption is minimal security.

4. **Model cost visibility?**
   - Could show estimated cost before AI operations
   - Track usage per session

5. **Offline mode for Notion triage?**
   - Could cache cards locally for offline review
   - Sync status changes when online

---

## Conclusion

This feature is **highly feasible** with the current architecture:

- **Plugin system** already supports app plugins with storage and hooks
- **IPC patterns** are well-established and type-safe
- **AI hooks** are already defined, just need implementation
- **Settings service** supports extensible configuration

The hybrid approach (core services + plugin UI) provides:
- Maximum reusability of AI across the app
- Clean separation of concerns
- Ability to add more AI-powered features later
- Optional Notion functionality for users who need it
