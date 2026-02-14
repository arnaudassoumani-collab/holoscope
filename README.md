# 🔭 HOLOSCOPE

> **SOCA Holobiont OS — Unified Dashboard**
> One app. Full visibility. Zero drift. Vers l'infini et l'au-delà! 🚀

## What is HOLOSCOPE?

HOLOSCOPE is the unified observatory, control center, and lightweight IDE for the SOCA HOLOBIONT OS ecosystem. Desktop + iOS/iPad. Dark midnight blue.

### 6 Core Panels

| Panel | Purpose | Phase |
|-------|---------|-------|
| 🌐 **Observatory** | Bird's-eye health of Docker, VPS, Tailscale, GitHub | 1 ✅ |
| 🤖 **Agent Control** | Launch, monitor AI agents (kanban + live stream) | 1 ✅ |
| 🧠 **Knowledge Graph** | 3D visualization of Obsidian + Neo4j knowledge | 3 |
| 📜 **Constitution** | Live compliance of 67 Sacred Rules | 3 |
| 💻 **ADE** | Lightweight Agent Development Environment | 4 |
| 📊 **Metrics** | Cost tracking, performance, timeline analytics | 4 |

### Tech Stack

- **Next.js 15 + React 19** — SSR, app router, server components
- **Tauri 2** — Desktop (macOS/Linux) + iOS/iPad · Rust backend · ~6MB binary
- **Tailwind CSS 4** — Dark midnight blue theme
- **3d-force-graph** — Interactive 3D knowledge visualization
- **CodeMirror 6** — Lightweight code editor
- **xterm.js** — Embedded terminal

### UX Design

- **⌘K command palette** — Search anything, navigate anywhere
- **VS Code + LM Studio hybrid** — Optimized for AI engineering
- **Zero-click info** — Health visible immediately
- **1-click actions** — Launch, switch, open
- **Keyboard-first** — Every panel navigable
- **Dark midnight blue** 🌙

### Requirements

- Node.js 22+
- Rust (for Tauri desktop builds)
- npm

### Development

```bash
npm install
npm run dev          # Web dev server (http://localhost:3000)
npm run tauri dev    # Desktop app dev mode
npm run tauri build  # Build desktop app
```

### Testing via Tailscale

```bash
npm run dev -- --hostname 0.0.0.0
# Access from any Tailscale device: http://100.64.0.21:3000
```

## Part of SOCA HOLOBIONT OS

Built by the ASI ARCH team using the Perfect Stack:
- 🧠 Opus 4.6 (architecture, design decisions)
- 🏗️ MiniMax M2.5 (coding, component implementation)
- 🐜 MiMo V2 Flash (tests, CI — FREE)

---

*🌀 SOCA HOLOBIONT OS · "Vers l'infini et l'au-delà!" 🚀*
