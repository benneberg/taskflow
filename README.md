# TaskFlow AI — Agentic Operating System (AOS)

**TaskFlow AI** is an advanced Agentic Operating System (AOS) designed to upgrade artificial intelligence from individual, unmanaged assistance ("co-pilots") to a production-ready, highly structured "Autonomous Squad." Engineering managers can deploy, audit, and direct specialized agentic software teams executing development workloads under strict deterministic contracts, Human-in-the-Loop (HITL) gates, and independent circuit breakers.

---

## 🚀 Architectural Blueprint

The system establishes a clean **Control Plane / Data Plane Separation** supporting resilient, distributed workflows:

- **Orchestration Layer**: Mimics Temporal.io durable timers, sagas, and state signals.
- **Cognitive Reasoning Engines**: Backed by server-side **Google Gemini AI Models** utilizing the official `@google/genai` TypeScript SDK.
- **Data Event Ledger**: Immutable event sourcing recording full system and model state mutations with optimistic concurrency control (OCC).
- **Control Gateways**: Restricts budget allocations using thread-safe **Per-Agent Circuit Breakers** and real-time **Thermal Cost Degradation (Throttling)**.

---

## 🛠️ Pioneer Squad Agent Registry

The operating system includes three pre-configured specialized software engineering agents:

1. **Alex (Backend Developer Agent)**:
   - *Specialization*: FastAPI, database schema migrations, and relational schema designs.
   - *Models*: `gemini-3.5-flash` with failover fallback layers.
2. **Chloe (Frontend Developer Agent)**:
   - *Specialization*: React state managers, Tailwind CSS spacing, and smooth interactive animations.
3. **Dave (QA Reviewer Agent)**:
   - *Specialization*: Security vulnerability scans, typescript compilers check, and color contrast auditing.

---

## 🧪 Core Capabilities & Interactions

### 1. Multi-Stage Pipeline Workflows
Tasks progress sequentially through deterministic gates:
$$\text{CREATED} \longrightarrow \text{PLANNING} \longrightarrow \text{IMPLEMENTING} \longrightarrow \text{QA REVIEW} \longrightarrow \text{AWAITING APPROVAL} \longrightarrow \text{DEPLOYED}$$

### 2. Human-in-the-Loop (HITL) Gates
Workflow pausing enforcements on security limits or code verification boundaries. Operators can trigger signals:
- `APPROVE`: Transitions code directly to mock deployment.
- `REQUEST_CHANGES`: Returns task to the active developer with operator revision feedback.
- `REJECT` / `TERMINATE`: Stops work, logs event telemetry, and frees resources.

### 3. Per-Agent Circuit Breakers
If an agent's allocated USD budget is breached during planning or coding operations, the agent's circuit breaker trips (`CLOSED` $\rightarrow$ `OPEN`), pausing all active pipelines and notifying operators for parameter updates or breaker resets.

### 4. Thermal Cost Degradation (Throttling)
As cumulative USD spend increases, the throttling engine automatically shifts reasoning steps to more cost-effective models:
- **0–50% Utilization**: Tier 0 Premium (`gemini-3.5-flash`).
- **50–70%**: Light throttle warning issued.
- **70–85%**: Tier 1/2 Budget (`gemini-3.1-flash-lite`).
- **>95%**: Critical. Falling back to rule-based mock processors to guarantee zero budget breach.

---

## 📂 Project Directory Structure

```
taskflow-ai/
├── server.ts                 # Full-stack Express server with Gemini SDK & event loop
├── SPEC.md                   # Full system technical specification sheet
├── README.md                 # Project repository documentation
├── package.json              # Standard dependencies config with full-stack build scripts
├── vite.config.ts            # Vite configuration file
└── src/
    ├── main.tsx              # React mounting entry point
    ├── App.tsx               # Primary dashboard router & metrics controller
    ├── types.ts              # Fully declared TS models (Tasks, Agents, Events)
    ├── index.css             # Cosmic slate theme & Tailwind imports
    └── components/
        ├── CommandCenter.tsx # Live Kanban, Creation sheets, and HITL decision gates
        ├── ExpertStudio.tsx  # Pioneer squad config & circuit breaker override
        ├── BudgetLedger.tsx  # Transaction list & Thermal throttling panels
        └── ThoughtStream.tsx # Stream console showing OTel traces & prompt parameters
```

---

## 💿 Standard Dev & Build Scripts

Our full-stack setup compiles both Express API services and Vite assets flawlessly:

- **Local Development**: Launches concurrent tsx server and Vite dev middlewares:
  ```bash
  npm run dev
  ```
- **Production Build**: Compiles frontend assets and bundles server-side TS files into a standalone CommonJS executable inside `dist/server.cjs`:
  ```bash
  npm run build
  ```
- **Start Container**: Boots production deployment:
  ```bash
  npm run start
  ```
