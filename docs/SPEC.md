# SOCAKit — SOCA Holobiont OS Unified Dashboard

## Vision
One app to rule them all. A unified observatory, control center, and lightweight IDE for the entire SOCA HOLOBIONT OS ecosystem. Expert-level AI industry quality. Light on system resources. Zero drift, zero hallucination.

## Architecture Decision

### Stack: **Tauri 2 + SvelteKit 5 + TypeScript**
**Why:**
- **Tauri 2**: ~6MB binary, 10× lighter than Electron. Rust backend = fast, secure, low memory
- **SvelteKit 5**: Fastest reactive framework, smallest bundle, no virtual DOM overhead
- **TypeScript**: Type safety across the stack
- **SQLite** (via Tauri): Local cache/state, no external DB needed for the dashboard itself

### UI Framework: **Skeleton UI + Tailwind CSS 4**
- Dark-mode-first, customizable design tokens
- Command palette (⌘K) built-in pattern
- Accessible, keyboard-first navigation

### Real-time: **WebSocket + Server-Sent Events**
- Tauri sidecar → monitors Docker, system metrics
- WebSocket to VPS Clawdbot Gateway API
- SSE for log streaming

### Graph: **3d-force-graph** (Three.js-based)
- Lightweight 3D knowledge graph visualization
- Works with Neo4j Bolt + Obsidian vault parsing
- Interactive node exploration

---

## Core Modules (6 Panels)

### 1. 🌐 System Observatory (Home)
**Purpose:** Bird's-eye view of entire ecosystem health

**Components:**
- Service health grid: Docker containers, Redis, PostgreSQL, Supabase, Neo4j status
- VPS metrics: CPU, RAM, disk, network (from Clawdbot health checks)
- Tailscale mesh: connected devices, latencies
- Mac node status (mac-soca)
- GitHub: recent commits, open PRs, CI status
- Trust Score gauge: ZHV, ZHDEEV, overall health grade

**Data sources:**
- `docker stats` / Docker API
- `/proc` system metrics
- `tailscale status --json`
- `gh` CLI
- Clawdbot Gateway API (`/health`)
- ASI ARCH `latest.json` health report

### 2. 🤖 Agent Control (Kanban)
**Purpose:** Launch, monitor, and manage AI agent tasks

**Components:**
- Kanban board: TODO → IN PROGRESS → REVIEW → DONE
- Agent cards: model, tier, token usage, cost, duration, status
- Live output stream (like OpenCode): thinking, diff, context window
- Model selector: pick from Perfect Stack tiers
- Thinking level control (off/minimal/normal/deep)
- Task launcher: natural language → smart-routed to optimal model
- Agent history: past runs with evidence bundles

**Data sources:**
- Clawdbot sessions API
- ASI ARCH smart router
- OpenRouter API (model stats, costs)
- Evidence bundles (`runs/asi-arch/`)

### 3. 🧠 Knowledge Graph (3D)
**Purpose:** Visual exploration of the SOCA knowledge base

**Components:**
- 3D force-directed graph of:
  - Obsidian vault notes (nodes = files, edges = links)
  - Neo4j entities and relationships
  - Codebase modules and dependencies
- Search + filter: by tag, date, type
- Click node → preview content
- Zoom levels: galaxy (all) → cluster (topic) → star (single note)
- Pieces LTM integration: timeline of AI interactions

**Data sources:**
- Obsidian vault (`/opt/soca/vault/`) markdown parsing
- Neo4j Bolt protocol (if available)
- Git log for codebase graph
- Pieces API (if available)

### 4. 📜 Constitution Inspector
**Purpose:** Live view of SOCA Constitution rules and compliance

**Components:**
- All 67 Sacred Rules listed, searchable
- Rule status: ✅ compliant / ⚠️ warning / ❌ violation
- Click rule → full text + linked evidence
- Live feed: "Rule 4 invoked by SAIS at 14:02"
- Compliance score over time (sparkline chart)
- Amendment protocol viewer

**Data sources:**
- `core/SOCAcore/CONSTITUTION.md` parsed
- ASI ARCH compliance reports
- Evidence bundle audit trail

### 5. 💻 ADE — Agent Development Environment
**Purpose:** Lightweight IDE for SOCA development

**Components:**
- File tree (filtered: no node_modules, venv)
- Code editor: Monaco or CodeMirror 6 (lightweight)
- Diff viewer: side-by-side with syntax highlighting
- Terminal panel: embedded shell
- Model-assisted editing: select code → ask model to refactor/explain
- Skill browser: installed skills, one-click docs
- Git integration: status, diff, commit, push

**Data sources:**
- Local filesystem (Tauri FS API)
- Git CLI
- Clawdbot skills directory
- Smart router for model selection

### 6. 📊 Metrics & Timeline
**Purpose:** Historical trends, cost tracking, performance analytics

**Components:**
- Token usage over time (by model, by tier)
- Cost dashboard: daily/weekly/monthly spend by model
- Agent performance: success rate, avg duration, fitness scores
- System uptime history
- Memory timeline: daily logs visualization
- Cron job status and history

**Data sources:**
- OpenRouter usage API
- Clawdbot session logs
- ASI ARCH evidence bundles
- System uptime records

---

## Navigation Design

### Layout: **Sidebar + Content + Command Palette**

```
┌─────────┬────────────────────────────────────────┐
│  SIDE   │                                        │
│         │                                        │
│  🌐 Sys │            MAIN CONTENT                │
│  🤖 Agt │                                        │
│  🧠 Kng │       (selected panel renders          │
│  📜 Con │        full-width here)                 │
│  💻 ADE │                                        │
│  📊 Met │                                        │
│         │                                        │
│─────────│                                        │
│ ⌘K CMD  │                                        │
│ 🌀 SOCA │                                        │
└─────────┴────────────────────────────────────────┘
```

### Key UX Principles:
1. **⌘K everything**: Command palette for any action (launch agent, open file, search, navigate)
2. **Zero-click info**: Most important data visible without clicking (health, agents, alerts)
3. **1-click actions**: Launch task, switch model, open rule, view diff
4. **Keyboard-first**: Every panel navigable with keyboard shortcuts
5. **Contextual panels**: Right-click or ⌘-click opens detail without leaving current view
6. **Adaptive density**: Compact mode for power users, relaxed for overview

### Keyboard Shortcuts:
- `⌘K` — Command palette
- `⌘1-6` — Switch panels
- `⌘N` — New agent task
- `⌘.` — Quick model switch
- `⌘/` — Search everything
- `Esc` — Close overlay/return to main

---

## Tech Architecture

```
┌─────────────────────────────────────────────────┐
│                   SOCAKit App                    │
│              (Tauri 2 + SvelteKit)               │
├─────────────────────────────────────────────────┤
│  Frontend (Svelte 5 + Runes)                    │
│  ├── Skeleton UI + Tailwind CSS 4               │
│  ├── 3d-force-graph (Three.js)                  │
│  ├── CodeMirror 6 (editor)                      │
│  ├── xterm.js (terminal)                        │
│  └── Chart.js / uPlot (metrics)                 │
├─────────────────────────────────────────────────┤
│  Tauri Backend (Rust)                           │
│  ├── System monitor (sysinfo crate)             │
│  ├── Docker client (bollard crate)              │
│  ├── WebSocket server (tokio-tungstenite)       │
│  ├── SQLite state (rusqlite)                    │
│  ├── File watcher (notify crate)                │
│  └── Process manager (agent launcher)           │
├─────────────────────────────────────────────────┤
│  External Connections                           │
│  ├── Clawdbot Gateway (HTTP/WS localhost:18789) │
│  ├── OpenRouter API (model stats)               │
│  ├── GitHub API (gh cli / REST)                 │
│  ├── Docker API (unix socket)                   │
│  ├── Neo4j (bolt://localhost:7687)              │
│  ├── Redis (localhost:6379)                     │
│  ├── PostgreSQL (localhost:5432)                │
│  ├── Tailscale (CLI / API)                      │
│  └── Obsidian vault (filesystem watch)          │
└─────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Create repo, project structure
- [ ] Tauri 2 + SvelteKit 5 scaffold
- [ ] Skeleton UI theme (SOCA dark theme)
- [ ] Sidebar navigation + panel routing
- [ ] Command palette (⌘K)
- [ ] System Observatory: Docker + system metrics
- [ ] VPS health integration (Clawdbot API)

### Phase 2: Agent Control (Week 2)
- [ ] Kanban board component
- [ ] Agent card design
- [ ] Live output stream (WebSocket)
- [ ] Task launcher with smart routing
- [ ] Model selector dropdown
- [ ] Session history viewer

### Phase 3: Knowledge & Constitution (Week 3)
- [ ] 3D force graph component
- [ ] Obsidian vault parser → graph data
- [ ] Neo4j connector (if available)
- [ ] Constitution parser
- [ ] Rule compliance viewer
- [ ] Search integration

### Phase 4: ADE + Metrics (Week 4)
- [ ] CodeMirror 6 integration
- [ ] File tree browser
- [ ] Terminal (xterm.js)
- [ ] Git integration panel
- [ ] Cost/usage dashboard
- [ ] Timeline visualization

### Phase 5: Polish & Ship (Week 5)
- [ ] Performance optimization (lazy loading, virtualization)
- [ ] Keyboard shortcuts everywhere
- [ ] Auto-update mechanism
- [ ] Documentation
- [ ] macOS code signing
- [ ] First release

---

## Design Inspiration
- **Arc Browser**: Sidebar + command bar + spaces
- **OpenCode**: Live thinking display, diff view, model status line
- **Linear**: Clean kanban, keyboard-first, minimal UI
- **Grafana**: Dashboard panels, metric visualization
- **Obsidian**: Graph view, vault navigation
- **Warp**: Modern terminal, AI-integrated
- **Raycast**: Command palette excellence

## Principles
- **Light**: <100MB installed, <200MB RAM idle
- **Fast**: <1s panel switch, <100ms command palette
- **Honest**: ZHV 100% — only show verified data
- **Resilient**: Offline-capable, graceful degradation
- **SOCA-native**: Constitution-aware, evidence-linked

---

*"Vers l'infini et l'au-delà!" 🚀🌀*
