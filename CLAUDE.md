# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

前哨AI智能体体验舱 (Qianshao AI Agent Demo Platform) — a Next.js full-stack demo application showcasing AI agent capabilities for enterprise clients. It integrates with the Coze API v3 for real AI responses, with a demo fallback mode when API keys aren't configured.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

No test suite is currently configured.

## Architecture

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, JWT auth, bcryptjs

**Data layer**: File-based JSON database at `data/store.json` via `lib/db.ts` (`readStore`/`writeStore`). No ORM or migration system — all reads/writes go through these two functions. Changes to the data schema require manually updating the JSON file and all consuming routes.

**Authentication**: Two separate auth systems:
1. **User auth** (`lib/auth.ts`): JWT tokens (7-day expiry) stored in localStorage, sent as `Authorization: Bearer <token>` header
2. **Admin auth**: Hardcoded password `qsjiaoyu` verified via `/api/admin/verify`, subsequent requests send `X-Admin-Auth: true` header

**AI Integration** (`app/api/chat/route.ts`): Streams responses from Coze API v3 via SSE. If no API key is configured, returns demo fallback responses. Each agent can have its own `bot_id`/`api_key`, or falls back to global config stored in `data/store.json`.

## Key File Locations

| Purpose | Path |
|---------|------|
| Database (JSON) | `data/store.json` |
| DB read/write helpers | `lib/db.ts` |
| JWT utilities | `lib/auth.ts` |
| Login page | `app/page.tsx` |
| Agent dashboard | `app/dashboard/page.tsx` |
| Chat interface | `app/chat/[agentId]/page.tsx` |
| Admin panel | `app/admin/page.tsx` |
| Global styles + design tokens | `app/globals.css` |

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/login` | POST | None | Phone + password login |
| `/api/agents` | GET | JWT | List enabled agents |
| `/api/chat` | POST | JWT | SSE streaming chat with Coze |
| `/api/admin/verify` | POST | None | Validate admin password |
| `/api/admin/users` | GET/POST/DELETE | X-Admin-Auth header | User CRUD |
| `/api/admin/agents` | GET/POST/PUT/DELETE | X-Admin-Auth header | Agent CRUD |

## Data Models

```typescript
// Users
{ id: string; phone: string; password: string; name: string; created_at: string }

// Agents
{ id: string; name: string; category: string; description: string;
  bot_id: string; api_key: string; enabled: 0 | 1; created_at: string }

// Config (singleton)
{ global_api_key: string; global_bot_id: string }
```

Default demo user: phone `13800000001`, password `qianshaokeji`.

## Design System

Klein Blue theme defined as CSS variables in `app/globals.css`:
- Primary: `--klein: #002FA7`
- Dark bg: `--bg-dark: #0A0E1A`, card bg: `--bg-card: #111827`
- Utility classes: `.btn-klein`, `.klein-border`, `.klein-glow`, `.card-hover`, `.fade-in`, `.typing-cursor`

All UI text is in Simplified Chinese (`lang="zh-CN"`).

## Path Alias

`@/*` maps to the project root (e.g., `import { readStore } from '@/lib/db'`).

## Admin Access

The admin panel is hidden — double-click the footer text on the login or dashboard pages to reveal the admin login dialog.
