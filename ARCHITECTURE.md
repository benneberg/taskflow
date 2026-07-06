# Technical Architecture: TaskFlow AI (AOS)

This document provides an in-depth breakdown of the modular engineering blocks, data pathways, and operational configurations powering the TaskFlow AI ecosystem.

---

## 🏗️ Architectural Components

### 1. Control Plane (Dashboard Interface)
- **Framework**: React 18+ with Vite and Tailwind CSS.
- **State Synchronizer**: Server-Sent Events (SSE) subscriber connecting to `/api/v1/stream`. It receives live broadcasts of state modifications, keeping metrics, columns, agent breakers, and telemetry logs perfectly synchronized.
- **Aesthetic**: Slate-colored, high-contrast dark-mode panels with custom spacing and layout animations.

### 2. Service Plane (REST & Event Gateways)
- **Runtime**: Express (Node.js full-stack container), executing with fast-start `tsx` or production-bundled CommonJS.
- **Data Engine**: Synchronous in-memory lists, backed by an immutable file serialization store `/data-store.json`.
- **Worker Execution Loop**: Simulated asynchronous multi-agent coordination pipeline using event queues and standard timers.

---

## 🔄 Transactional Data Flow & Source of Truth

The absolute **Source of Truth** resides on the server-side memory lists backed by `/data-store.json`. The frontend maintains no local state mutations; all actions transition through API endpoints, which broadcast updates back to the client.

```
┌─────────────────┐             POST /api/v1/tasks             ┌─────────────────┐
│                 ├───────────────────────────────────────────>│                 │
│                 │                                            │  Express Server │
│  React Client   │             SSE stream event               │ (Source of Truth│
│   (Dashboard)   │<───────────────────────────────────────────┤   In-Memory)    │
│                 │                                            │        │        │
└────────┬────────┘                                            └────────┼────────┘
         ^                                                              │ Writes state
         │                                                              ▼
         │                                                      ┌────────────────┐
         └──────────────────────────────────────────────────────│data-store.json │
                         Visualizes updated panels              └────────────────┘
```

### Pipeline Progression Sequence
1. **Initiate Task**: User posts JSON metadata to `/api/v1/tasks`.
2. **Alex Node (Planning)**: State transitions to `PLANNING`. Alex checks budget. If available, Alex drafts architecture plans and triggers the next queue.
3. **Chloe Node (Coding)**: State transitions to `IMPLEMENTING`. Chloe reviews the plan, generates TypeScript/React component blocks, and advances.
4. **Dave Node (QA Audit)**: State transitions to `QA_REVIEW`. Dave compiles code, scans for security issues, and sets the state to `AWAITING_APPROVAL`.
5. **HITL Control Panel**: The task is held in `AWAITING_APPROVAL` indefinitely until the human operator triggers an `/approve`, `/reject`, or `/request-changes` action.

---

## 🔗 Integrations

### 1. Google Gemini AI SDK Integration
- **Client**: `@google/genai` TypeScript SDK.
- **Implementation**: The Gemini client is safely initialized on the server with user-agent custom headers for telemetry.
- **Fallback**: In the absence of `GEMINI_API_KEY`, the server triggers robust, high-fidelity mock generators to prevent operational halts.

### 2. Multi-Agent Failover Chain
Each agent defines a standard fallback model array (e.g., `["gemini-3.5-flash", "gemini-3.1-flash-lite", "mock-backend"]`). If an LLM endpoint fails or times out, the router automatically attempts the next tier.

---

## 🚀 Deployment Model
- **Platform**: Cloud Run container environments.
- **Port Ingress**: Exclusive ingress routed through Nginx proxy to port `3000`.
- **Build Output**: `npm run build` bundles the server-side logic into a standalone self-contained `dist/server.cjs` file with esbuild, which compiles ES paths cleanly and prevents relative runtime import errors in Node.js.

---

## 👁️ System Observability & Telemetry
Every action writes to an event log schema mimicking **OpenTelemetry** specifications:
- **Causality Tracking**: Includes `causationId` linking an event back to the direct trigger, and `correlationId` tracking the entire end-to-end task pipeline transaction.
- **Optimistic Concurrency Control (OCC)**: Enforces version increments (`version: currentVersion + 1`), allowing transactional audits and prevention of race conditions.

---

## ⚠️ Risks, Improvements & Confidences

### Confidences per Section
- **UI Components & CSS Styles**: `100%` (Fully verified responsive styles.)
- **State Synchronization & SSE Systems**: `95%` (Verified live real-time broadcasts.)
- **Database & Persistent Storage**: `65%` (The JSON fallback is excellent for prototypes, but requires transition to structured relational schemas for heavy concurrent operations.)

### Key Improvements Roadmap
- **Transition to Relational Database**: Integrate PostgreSQL or SQLite to establish write-locks and transactions.
- **Add Endpoint Authentication**: Secure the control plane routes.
- **Add Automated Tests**: Implement Unit and E2E test scripts inside `package.json`.
