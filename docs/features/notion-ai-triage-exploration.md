# Notion AI Card Triage - Exploration Document

## Overview

This document explores two interconnected features:

1. **Core AI Infrastructure** - First-class support for Anthropic, OpenAI, and Gemini as foundational services available throughout Ledger
2. **Notion Triage Plugin** - A gamified card triage experience (Pokémon-style encounters) that uses AI to help build complete product specs

---

## Part 0: Vision - The Pokémon Triage Experience

### Concept

Each Notion card is like encountering a wild Pokémon. The user enters a triage session and cards appear one at a time. For each card:

1. **Encounter** - Card appears with AI-generated summary of current state
2. **Investigation** - AI asks multi-choice questions to gather context
3. **Knowledge Transfer** - Answers are synthesized and written back to Notion
4. **Satisfaction Check** - AI evaluates if the card has enough detail for an agent to code it
5. **Capture or Release** - Card is triaged (status updated) or skipped for later

The goal: Transform vague ideas into complete product specs that AI coding agents can execute.

```
┌─────────────────────────────────────────────────────────────────────┐
│  A wild CARD appeared!                              [Run] [Catch]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ╔═══════════════════════════════════════════════════════════╗    │
│   ║  🎴 Fix auth timeout on mobile                            ║    │
│   ║  ─────────────────────────────────────────────────────────║    │
│   ║  HP: ████████░░ 80% (Missing: acceptance criteria)        ║    │
│   ║  Type: Bug | Priority: Unknown | Sprint: Unassigned       ║    │
│   ╚═══════════════════════════════════════════════════════════╝    │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ AI Summary:                                                  │  │
│   │ Users report sessions expire after 5 mins on iOS. Likely    │  │
│   │ related to Safari's aggressive background tab handling.     │  │
│   │ Missing: reproduction steps, affected versions, priority.   │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Question 1 of 4:                                             │  │
│   │                                                              │  │
│   │ Which platforms are affected?                                │  │
│   │                                                              │  │
│   │   ○ iOS only                                                 │  │
│   │   ○ Android only                                             │  │
│   │   ○ Both iOS and Android                                     │  │
│   │   ○ Web browsers only                                        │  │
│   │   ○ All platforms                                            │  │
│   │   ○ Unknown - needs investigation                            │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   Progress: ██░░░░░░░░ Question 1/4                                │
│   Answers collected: 0 | Card completeness: 45%                    │
│                                                                     │
│   [Skip Question] [Answer & Continue →]                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Write-Back to Notion

After each triage session, results are written back to the card:

1. **Content Addendum** - Appended to the card body:
   ```markdown
   ---
   ## Triage Notes (2025-01-08)

   **Platforms Affected:** iOS only
   **Severity:** High - affects 30% of users
   **Root Cause Hypothesis:** Safari background tab throttling
   **Acceptance Criteria:**
   - [ ] Session persists for 30 mins in background
   - [ ] Graceful re-auth flow when session expires
   - [ ] Analytics event for session timeout

   **Agent Readiness:** ✅ Ready for implementation
   ```

2. **Comment Thread** - For discussion/audit trail:
   ```
   🤖 Triage completed by @user via Ledger
   - Added platform details, severity assessment
   - Generated acceptance criteria
   - Card is now ready for sprint planning
   ```

### Satisfaction System

The AI evaluates card "completeness" based on:

| Dimension | Weight | Questions |
|-----------|--------|-----------|
| **Problem Definition** | 25% | What, who, when, impact |
| **Acceptance Criteria** | 30% | Definition of done, test cases |
| **Technical Context** | 20% | Related systems, dependencies |
| **Priority/Urgency** | 15% | Business impact, deadlines |
| **Scope Boundaries** | 10% | What's NOT included |

Once completeness reaches threshold (e.g., 80%), AI declares the card "ready for an agent."

---

## Architecture Decision: Core vs Plugin

### Recommendation: Hybrid Approach

| Component | Location | Rationale |
|-----------|----------|-----------|
| **AI Infrastructure** | Core | First-class citizen - used everywhere in the app |
| **Notion Service** | Core | Complex API, auth flow, rate limiting - centralized |
| **Triage Plugin** | Plugin | Gamified UX, optional, can evolve independently |

### Why Core AI Infrastructure?

AI should be a **first-class citizen** in Ledger, not an afterthought:

1. **Multiple providers** - Users should be able to use Anthropic, OpenAI, or Gemini based on preference/cost
2. **Model preferences** - Different tasks need different models (Haiku for quick summaries, Opus for complex analysis)
3. **Ubiquitous access** - Commit messages, PR reviews, diff explanations, branch summaries, merge conflict help
4. **Plugin ecosystem** - All plugins should have easy access to AI capabilities

The plugin architecture already defines AI hooks (`lib/plugins/plugin-types.ts:256-261`) that need implementation.

### Why Core Notion Service?

1. **API Complexity**: Notion's 2025-09-03 API changes require:
   - Two-step queries (fetch `data_source_id`, then query)
   - Pagination handling (100 items max per request)
   - Rate limiting (3 req/sec)

2. **Auth Management**: OAuth flow or API key storage needs secure handling

3. **Reusability**: Other plugins might want Notion access (project tracking, wiki sync)

---

## Part 1: Core AI Infrastructure

The AI system is designed as **first-class infrastructure** with all three major providers treated equally.

### New Files

```
lib/main/ai/
├── ai-service.ts           # Main service orchestrator
├── providers/
│   ├── index.ts            # Provider registry
│   ├── anthropic.ts        # Claude implementation
│   ├── openai.ts           # GPT implementation
│   └── gemini.ts           # Gemini implementation
├── models.ts               # Model definitions and capabilities
└── types.ts                # Shared types

lib/conveyor/handlers/ai-handler.ts
lib/conveyor/schemas/ai-schema.ts
lib/conveyor/api/ai-api.ts
```

### Settings Architecture

All three providers can be configured simultaneously. Users can set a default provider but switch per-task.

```typescript
// lib/main/settings-service.ts - Add to Settings interface
interface Settings {
  // ... existing fields ...

  ai?: AISettings
}

interface AISettings {
  // Provider API Keys (all can be configured simultaneously)
  providers: {
    anthropic?: {
      apiKey: string
      enabled: boolean
    }
    openai?: {
      apiKey: string
      enabled: boolean
      organization?: string  // Optional org ID
    }
    gemini?: {
      apiKey: string
      enabled: boolean
    }
  }

  // Default preferences
  defaults: {
    provider: 'anthropic' | 'openai' | 'gemini'

    // Model preferences by task type
    models: {
      quick: string      // Fast responses (haiku, gpt-4o-mini, flash)
      balanced: string   // General use (sonnet, gpt-4o, pro)
      powerful: string   // Complex tasks (opus, o1, pro)
    }
  }

  // Usage tracking
  usage?: {
    trackCosts: boolean
    monthlyBudget?: number  // Optional spending limit
    history: UsageRecord[]
  }
}

interface UsageRecord {
  date: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}
```

### Model Registry

Define available models with their capabilities:

```typescript
// lib/main/ai/models.ts

export interface ModelDefinition {
  id: string
  provider: 'anthropic' | 'openai' | 'gemini'
  displayName: string
  contextWindow: number
  maxOutput: number
  tier: 'quick' | 'balanced' | 'powerful'
  capabilities: ModelCapability[]
  costPer1kInput: number   // USD
  costPer1kOutput: number  // USD
}

export type ModelCapability =
  | 'text'
  | 'vision'
  | 'tools'
  | 'streaming'
  | 'json-mode'
  | 'extended-thinking'

export const MODELS: ModelDefinition[] = [
  // Anthropic
  {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    maxOutput: 8192,
    tier: 'quick',
    capabilities: ['text', 'vision', 'tools', 'streaming'],
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
  },
  {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4',
    contextWindow: 200000,
    maxOutput: 16384,
    tier: 'balanced',
    capabilities: ['text', 'vision', 'tools', 'streaming', 'extended-thinking'],
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: 'claude-opus-4-20250514',
    provider: 'anthropic',
    displayName: 'Claude Opus 4',
    contextWindow: 200000,
    maxOutput: 16384,
    tier: 'powerful',
    capabilities: ['text', 'vision', 'tools', 'streaming', 'extended-thinking'],
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },

  // OpenAI
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutput: 16384,
    tier: 'quick',
    capabilities: ['text', 'vision', 'tools', 'streaming', 'json-mode'],
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    contextWindow: 128000,
    maxOutput: 16384,
    tier: 'balanced',
    capabilities: ['text', 'vision', 'tools', 'streaming', 'json-mode'],
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  {
    id: 'o1',
    provider: 'openai',
    displayName: 'o1',
    contextWindow: 200000,
    maxOutput: 100000,
    tier: 'powerful',
    capabilities: ['text', 'extended-thinking'],
    costPer1kInput: 0.015,
    costPer1kOutput: 0.060,
  },

  // Gemini
  {
    id: 'gemini-2.0-flash',
    provider: 'gemini',
    displayName: 'Gemini 2.0 Flash',
    contextWindow: 1000000,
    maxOutput: 8192,
    tier: 'quick',
    capabilities: ['text', 'vision', 'tools', 'streaming'],
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'gemini',
    displayName: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
    maxOutput: 8192,
    tier: 'balanced',
    capabilities: ['text', 'vision', 'tools', 'streaming', 'json-mode'],
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
  },
]

export function getModelsByTier(tier: 'quick' | 'balanced' | 'powerful'): ModelDefinition[] {
  return MODELS.filter(m => m.tier === tier)
}

export function getModelsByProvider(provider: string): ModelDefinition[] {
  return MODELS.filter(m => m.provider === provider)
}
```

### AI Service Interface

```typescript
// lib/main/ai/types.ts

export type AIProvider = 'anthropic' | 'openai' | 'gemini'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | AIContentBlock[]
}

export interface AIContentBlock {
  type: 'text' | 'image'
  text?: string
  imageUrl?: string
  imageBase64?: string
}

export interface CompletionOptions {
  model?: string              // Override default model
  provider?: AIProvider       // Override default provider
  maxTokens?: number
  temperature?: number
  stopSequences?: string[]
  jsonMode?: boolean          // Request JSON output
  systemPrompt?: string
}

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: Error) => void
}

// lib/main/ai/ai-service.ts

export interface AIService {
  // Configuration
  isConfigured(provider?: AIProvider): boolean
  getAvailableProviders(): AIProvider[]
  getAvailableModels(provider?: AIProvider): ModelDefinition[]

  // Core methods
  complete(prompt: string, options?: CompletionOptions): Promise<AIResponse>
  chat(messages: AIMessage[], options?: CompletionOptions): Promise<AIResponse>
  stream(messages: AIMessage[], callbacks: StreamCallbacks, options?: CompletionOptions): Promise<void>

  // Structured output
  generateJSON<T>(prompt: string, schema: z.ZodSchema<T>, options?: CompletionOptions): Promise<T>

  // Convenience methods (use default quick model)
  summarize(content: string, maxWords?: number): Promise<string>

  // Convenience methods (use default balanced model)
  analyze<T>(content: string, analysisType: AnalysisType): Promise<T>
  generateQuestions(context: string, purpose: string, count?: number): Promise<TriageQuestion[]>

  // Convenience methods (use default powerful model)
  synthesize(inputs: string[], goal: string): Promise<string>
}

export interface AIResponse {
  content: string
  model: string
  provider: AIProvider
  usage: {
    inputTokens: number
    outputTokens: number
    estimatedCost: number
  }
  finishReason: 'complete' | 'length' | 'stop' | 'error'
}

export interface TriageQuestion {
  id: string
  question: string
  type: 'single-choice' | 'multi-choice' | 'text' | 'scale'
  options?: string[]
  context?: string           // Why this question matters
  dimension: TriageDimension // Which completeness dimension it addresses
}

export type TriageDimension =
  | 'problem-definition'
  | 'acceptance-criteria'
  | 'technical-context'
  | 'priority-urgency'
  | 'scope-boundaries'

export type AnalysisType =
  | 'card-completeness'    // Evaluate how ready a card is for implementation
  | 'commit-summary'       // Summarize a commit's changes
  | 'pr-review'            // Review a PR for issues
  | 'diff-explanation'     // Explain what a diff does
  | 'branch-summary'       // Summarize a branch's purpose
```

### Provider Implementations

```typescript
// lib/main/ai/providers/anthropic.ts

import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIMessage, CompletionOptions, AIResponse } from '../types'

export class AnthropicProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async complete(messages: AIMessage[], options: CompletionOptions): Promise<AIResponse> {
    const response = await this.client.messages.create({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      system: options.systemPrompt,
      messages: this.convertMessages(messages),
    })

    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      model: response.model,
      provider: 'anthropic',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        estimatedCost: this.calculateCost(response.model, response.usage),
      },
      finishReason: this.mapStopReason(response.stop_reason),
    }
  }

  async stream(
    messages: AIMessage[],
    callbacks: StreamCallbacks,
    options: CompletionOptions
  ): Promise<void> {
    const stream = this.client.messages.stream({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 4096,
      messages: this.convertMessages(messages),
    })

    let fullText = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text
        callbacks.onChunk(event.delta.text)
      }
    }
    callbacks.onComplete?.(fullText)
  }

  private convertMessages(messages: AIMessage[]): Anthropic.MessageParam[] {
    return messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: typeof m.content === 'string' ? m.content : this.convertContent(m.content),
    }))
  }
}

// Similar implementations for OpenAI and Gemini...
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

## Part 3: Notion Triage Plugin - Pokémon Edition

### Plugin Structure

```
lib/plugins/notion-triage/
├── index.ts                        # Plugin definition
├── components/
│   ├── TriageApp.tsx               # Main encounter screen
│   ├── SetupWizard.tsx             # First-time configuration
│   ├── EncounterCard.tsx           # Pokemon-style card display
│   ├── QuestionPanel.tsx           # Multi-choice question UI
│   ├── CompletenessBar.tsx         # HP-style progress bar
│   ├── TriageActions.tsx           # Catch/Run/Skip buttons
│   ├── SessionSummary.tsx          # End-of-session stats
│   └── SettingsPanel.tsx           # Plugin settings
├── hooks/
│   ├── useTriage.ts                # Main triage state machine
│   ├── useCardCompleteness.ts      # Completeness scoring
│   └── useNotionWriteBack.ts       # Write results to Notion
├── prompts/
│   ├── question-generation.ts      # Prompts for generating questions
│   ├── completeness-eval.ts        # Prompts for evaluating readiness
│   └── synthesis.ts                # Prompts for synthesizing answers
├── types.ts                        # Plugin-specific types
└── styles.css                      # Pokemon-inspired styling
```

### Plugin Definition

```typescript
// lib/plugins/notion-triage/index.ts

import type { AppPlugin } from '@/lib/plugins/plugin-types'

export const notionTriagePlugin: AppPlugin = {
  id: 'ledger.notion-triage',
  name: 'Card Triage',
  version: '1.0.0',
  type: 'app',
  description: 'Pokémon-style card triage - catch em all with complete specs!',

  icon: 'Sparkles',            // Lucide icon
  iconTooltip: 'Card Triage',
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
      default: 'Backlog',
      description: 'Only show cards with this status (cards needing triage)',
      options: [],  // Populated dynamically from database
    },
    {
      key: 'readyStatus',
      label: 'Ready Status',
      type: 'string',
      default: 'Ready for Dev',
      description: 'Status to set when card is fully triaged',
    },
    {
      key: 'completenessThreshold',
      label: 'Completeness Threshold',
      type: 'number',
      default: 80,
      description: 'Minimum % completeness to mark card as ready (0-100)',
    },
    {
      key: 'writeBackMode',
      label: 'Write-Back Mode',
      type: 'select',
      default: 'both',
      description: 'How to save triage results to Notion',
      options: [
        { label: 'Content + Comment', value: 'both' },
        { label: 'Content only', value: 'content' },
        { label: 'Comment only', value: 'comment' },
      ],
    },
  ],

  async activate(context) {
    context.logger.info('Card Triage plugin activated')

    const notionConfigured = await window.conveyor.notion.isConfigured()
    const aiConfigured = await window.conveyor.ai.isConfigured()

    if (!notionConfigured) {
      context.api.showNotification(
        'Configure Notion API key in Settings → Integrations',
        'warning'
      )
    }
    if (!aiConfigured) {
      context.api.showNotification(
        'Configure AI provider in Settings → Integrations',
        'warning'
      )
    }
  },
}
```

### Core Types

```typescript
// lib/plugins/notion-triage/types.ts

export interface TriageCard {
  id: string
  title: string
  properties: Record<string, unknown>
  content: string
  url: string
  createdTime: string
}

export interface TriageSession {
  cardId: string
  startedAt: Date
  questions: TriageQuestion[]
  answers: TriageAnswer[]
  completeness: CompletenessScore
  status: 'in-progress' | 'ready' | 'skipped' | 'needs-more'
}

export interface TriageQuestion {
  id: string
  question: string
  type: 'single-choice' | 'multi-choice' | 'scale'
  options: QuestionOption[]
  dimension: TriageDimension
  context?: string  // Why AI is asking this
}

export interface QuestionOption {
  id: string
  label: string
  implication?: string  // What choosing this means for the spec
}

export interface TriageAnswer {
  questionId: string
  selectedOptions: string[]
  timestamp: Date
}

export interface CompletenessScore {
  overall: number  // 0-100
  dimensions: {
    problemDefinition: number
    acceptanceCriteria: number
    technicalContext: number
    priorityUrgency: number
    scopeBoundaries: number
  }
  missingElements: string[]
  readyForAgent: boolean
}

export type TriageDimension =
  | 'problem-definition'
  | 'acceptance-criteria'
  | 'technical-context'
  | 'priority-urgency'
  | 'scope-boundaries'

export interface TriageWriteBack {
  cardId: string
  contentAddendum: string    // Markdown to append to card
  comment: string            // Comment to add
  propertyUpdates: Record<string, unknown>  // Properties to update
}
```

### Main Encounter Screen

```tsx
// lib/plugins/notion-triage/components/TriageApp.tsx

import React, { useState, useEffect, useReducer } from 'react'
import type { PluginAppProps } from '@/lib/plugins/plugin-types'
import { SetupWizard } from './SetupWizard'
import { EncounterCard } from './EncounterCard'
import { QuestionPanel } from './QuestionPanel'
import { CompletenessBar } from './CompletenessBar'
import { TriageActions } from './TriageActions'
import { SessionSummary } from './SessionSummary'
import { useTriage } from '../hooks/useTriage'
import type { TriageCard, TriageSession, CompletenessScore } from '../types'

type TriagePhase = 'loading' | 'setup' | 'encounter' | 'questioning' | 'review' | 'complete' | 'empty'

export function NotionTriageApp({ context }: PluginAppProps) {
  const {
    phase,
    currentCard,
    session,
    completeness,
    currentQuestion,
    questionIndex,
    totalQuestions,
    cardsRemaining,
    sessionStats,
    // Actions
    startSession,
    answerQuestion,
    skipQuestion,
    skipCard,
    catchCard,
    runAway,
    finishSession,
  } = useTriage(context)

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="triage-loading">
        <div className="pokeball-spinner" />
        <p>Searching for wild cards...</p>
      </div>
    )
  }

  // First-time setup
  if (phase === 'setup') {
    return <SetupWizard context={context} onComplete={startSession} />
  }

  // No cards to triage
  if (phase === 'empty') {
    return (
      <div className="triage-empty">
        <div className="empty-pokeball" />
        <h2>No wild cards appeared!</h2>
        <p>All cards have been triaged or none match your filter.</p>
        <button onClick={startSession}>Search Again</button>
      </div>
    )
  }

  // Session complete
  if (phase === 'complete') {
    return (
      <SessionSummary
        stats={sessionStats}
        onNewSession={startSession}
        onClose={() => context.api.navigateToApp('home')}
      />
    )
  }

  // Main encounter screen
  return (
    <div className="notion-triage-app pokemon-theme">
      {/* Header */}
      <header className="encounter-header">
        <span className="cards-remaining">
          {cardsRemaining} wild card{cardsRemaining !== 1 ? 's' : ''} remaining
        </span>
        <button className="end-session-btn" onClick={finishSession}>
          End Session
        </button>
      </header>

      {/* Encounter announcement */}
      {phase === 'encounter' && (
        <div className="encounter-announcement">
          A wild CARD appeared!
        </div>
      )}

      {/* Card display */}
      <EncounterCard
        card={currentCard}
        completeness={completeness}
        isActive={phase === 'encounter' || phase === 'questioning'}
      />

      {/* Completeness bar (HP style) */}
      <CompletenessBar
        score={completeness}
        threshold={80}
        showDimensions={phase === 'review'}
      />

      {/* Question panel */}
      {phase === 'questioning' && currentQuestion && (
        <QuestionPanel
          question={currentQuestion}
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          onAnswer={answerQuestion}
          onSkip={skipQuestion}
        />
      )}

      {/* Review panel */}
      {phase === 'review' && (
        <div className="review-panel">
          <h3>Card Assessment</h3>
          {completeness.readyForAgent ? (
            <div className="ready-status success">
              ✅ This card is ready for an AI agent to implement!
            </div>
          ) : (
            <div className="ready-status warning">
              ⚠️ Card needs more detail. Missing: {completeness.missingElements.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <TriageActions
        phase={phase}
        completeness={completeness}
        onCatch={catchCard}
        onRun={runAway}
        onSkip={skipCard}
        onStartQuestions={() => {/* transitions to questioning */}}
      />
    </div>
  )
}
```

### Question Panel Component

```tsx
// lib/plugins/notion-triage/components/QuestionPanel.tsx

import React, { useState } from 'react'
import type { TriageQuestion } from '../types'

interface QuestionPanelProps {
  question: TriageQuestion
  questionNumber: number
  totalQuestions: number
  onAnswer: (selectedOptions: string[]) => void
  onSkip: () => void
}

export function QuestionPanel({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onSkip,
}: QuestionPanelProps) {
  const [selected, setSelected] = useState<string[]>([])

  const handleOptionClick = (optionId: string) => {
    if (question.type === 'single-choice') {
      setSelected([optionId])
    } else {
      setSelected(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      )
    }
  }

  const handleSubmit = () => {
    if (selected.length > 0) {
      onAnswer(selected)
      setSelected([])
    }
  }

  return (
    <div className="question-panel">
      <div className="question-header">
        <span className="question-number">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span className="question-dimension">
          {formatDimension(question.dimension)}
        </span>
      </div>

      <div className="question-content">
        <h3>{question.question}</h3>
        {question.context && (
          <p className="question-context">{question.context}</p>
        )}
      </div>

      <div className="question-options">
        {question.options.map(option => (
          <button
            key={option.id}
            className={`option-btn ${selected.includes(option.id) ? 'selected' : ''}`}
            onClick={() => handleOptionClick(option.id)}
          >
            <span className="option-radio">
              {selected.includes(option.id) ? '●' : '○'}
            </span>
            <span className="option-label">{option.label}</span>
            {option.implication && (
              <span className="option-implication">{option.implication}</span>
            )}
          </button>
        ))}
      </div>

      <div className="question-actions">
        <button className="skip-btn" onClick={onSkip}>
          Skip Question
        </button>
        <button
          className="answer-btn"
          onClick={handleSubmit}
          disabled={selected.length === 0}
        >
          Answer & Continue →
        </button>
      </div>

      <div className="question-progress">
        <div
          className="progress-fill"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>
    </div>
  )
}

function formatDimension(dim: string): string {
  return dim.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}
```

### Write-Back Hook

```typescript
// lib/plugins/notion-triage/hooks/useNotionWriteBack.ts

import { useCallback } from 'react'
import type { TriageSession, TriageCard, TriageWriteBack } from '../types'

export function useNotionWriteBack() {
  /**
   * Synthesize triage answers into a structured addendum
   */
  const synthesizeResults = useCallback(async (
    card: TriageCard,
    session: TriageSession
  ): Promise<TriageWriteBack> => {
    // Use AI to synthesize answers into structured content
    const synthesisPrompt = buildSynthesisPrompt(card, session)
    const result = await window.conveyor.ai.generateJSON(
      synthesisPrompt,
      writeBackSchema
    )

    return {
      cardId: card.id,
      contentAddendum: formatContentAddendum(result, session),
      comment: formatComment(result, session),
      propertyUpdates: result.propertyUpdates || {},
    }
  }, [])

  /**
   * Write triage results back to Notion
   */
  const writeBack = useCallback(async (
    writeBackData: TriageWriteBack,
    mode: 'both' | 'content' | 'comment'
  ): Promise<void> => {
    const { cardId, contentAddendum, comment, propertyUpdates } = writeBackData

    // Append content to card body
    if (mode === 'both' || mode === 'content') {
      await window.conveyor.notion.appendToPage(cardId, contentAddendum)
    }

    // Add comment
    if (mode === 'both' || mode === 'comment') {
      await window.conveyor.notion.addComment(cardId, comment)
    }

    // Update properties (status, priority, etc.)
    for (const [property, value] of Object.entries(propertyUpdates)) {
      await window.conveyor.notion.updateCardProperty(cardId, property, value)
    }
  }, [])

  return { synthesizeResults, writeBack }
}

function formatContentAddendum(result: SynthesisResult, session: TriageSession): string {
  const date = new Date().toISOString().split('T')[0]

  return `
---
## Triage Notes (${date})

${result.platformsAffected ? `**Platforms Affected:** ${result.platformsAffected}` : ''}
${result.severity ? `**Severity:** ${result.severity}` : ''}
${result.rootCauseHypothesis ? `**Root Cause Hypothesis:** ${result.rootCauseHypothesis}` : ''}

### Acceptance Criteria
${result.acceptanceCriteria?.map(ac => `- [ ] ${ac}`).join('\n') || '_None specified_'}

### Technical Notes
${result.technicalNotes || '_None_'}

### Out of Scope
${result.outOfScope?.map(item => `- ${item}`).join('\n') || '_Not specified_'}

---
**Agent Readiness:** ${session.completeness.readyForAgent ? '✅ Ready for implementation' : '⚠️ Needs more detail'}
**Completeness Score:** ${session.completeness.overall}%
`.trim()
}

function formatComment(result: SynthesisResult, session: TriageSession): string {
  const stats = [
    `${session.answers.length} questions answered`,
    `Completeness: ${session.completeness.overall}%`,
  ]

  if (session.completeness.missingElements.length > 0) {
    stats.push(`Missing: ${session.completeness.missingElements.join(', ')}`)
  }

  return `🤖 **Triage completed via Ledger**
- ${stats.join('\n- ')}
- ${session.completeness.readyForAgent ? 'Card is ready for sprint planning' : 'Card needs additional refinement'}
`
}
```

### Completeness Evaluation

```typescript
// lib/plugins/notion-triage/hooks/useCardCompleteness.ts

import { useState, useCallback } from 'react'
import type { TriageCard, TriageSession, CompletenessScore, TriageAnswer } from '../types'

const DIMENSION_WEIGHTS = {
  'problem-definition': 0.25,
  'acceptance-criteria': 0.30,
  'technical-context': 0.20,
  'priority-urgency': 0.15,
  'scope-boundaries': 0.10,
}

export function useCardCompleteness() {
  const [completeness, setCompleteness] = useState<CompletenessScore>({
    overall: 0,
    dimensions: {
      problemDefinition: 0,
      acceptanceCriteria: 0,
      technicalContext: 0,
      priorityUrgency: 0,
      scopeBoundaries: 0,
    },
    missingElements: [],
    readyForAgent: false,
  })

  /**
   * Evaluate initial completeness of a card (before questions)
   */
  const evaluateInitial = useCallback(async (card: TriageCard): Promise<CompletenessScore> => {
    const result = await window.conveyor.ai.analyze(
      buildCardContext(card),
      'card-completeness'
    ) as CompletenessScore

    setCompleteness(result)
    return result
  }, [])

  /**
   * Update completeness based on answered questions
   */
  const updateFromAnswers = useCallback((
    answers: TriageAnswer[],
    questions: TriageQuestion[]
  ): CompletenessScore => {
    // Calculate new scores based on questions answered per dimension
    const dimensionAnswers = new Map<string, number>()

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId)
      if (question && answer.selectedOptions.length > 0) {
        const current = dimensionAnswers.get(question.dimension) || 0
        dimensionAnswers.set(question.dimension, current + 1)
      }
    }

    // Recalculate scores (this is simplified - real impl would use AI)
    const newDimensions = { ...completeness.dimensions }
    const dimMap: Record<string, keyof typeof newDimensions> = {
      'problem-definition': 'problemDefinition',
      'acceptance-criteria': 'acceptanceCriteria',
      'technical-context': 'technicalContext',
      'priority-urgency': 'priorityUrgency',
      'scope-boundaries': 'scopeBoundaries',
    }

    for (const [dim, count] of dimensionAnswers) {
      const key = dimMap[dim]
      if (key) {
        // Each answered question adds ~15-20% to dimension score
        newDimensions[key] = Math.min(100, newDimensions[key] + count * 18)
      }
    }

    // Calculate weighted overall
    const overall = Math.round(
      newDimensions.problemDefinition * 0.25 +
      newDimensions.acceptanceCriteria * 0.30 +
      newDimensions.technicalContext * 0.20 +
      newDimensions.priorityUrgency * 0.15 +
      newDimensions.scopeBoundaries * 0.10
    )

    // Determine missing elements
    const missingElements: string[] = []
    if (newDimensions.problemDefinition < 60) missingElements.push('problem definition')
    if (newDimensions.acceptanceCriteria < 60) missingElements.push('acceptance criteria')
    if (newDimensions.technicalContext < 50) missingElements.push('technical context')

    const newCompleteness: CompletenessScore = {
      overall,
      dimensions: newDimensions,
      missingElements,
      readyForAgent: overall >= 80 && missingElements.length === 0,
    }

    setCompleteness(newCompleteness)
    return newCompleteness
  }, [completeness])

  return {
    completeness,
    evaluateInitial,
    updateFromAnswers,
  }
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
