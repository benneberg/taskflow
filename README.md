# TaskFlow AI — Agentic Operating System (AOS)

TaskFlow AI is an enterprise-grade full-stack orchestration dashboard designed to govern multi-agent AI teams. Engineering leaders and operators can deploy, audit, and direct specialized agentic software squads executing workloads under strict budget contracts, Human-in-the-Loop (HITL) gates, per-agent circuit breakers, and sandboxed MicroVM runtime environments.

---

## 🚀 Architectural Blueprint

The system establishes a clean **Control Plane / Data Plane Separation** supporting resilient, distributed workflows:

- **Dynamic Secret Management**: Resolves API keys and credentials on-the-fly from multiple providers (GCP Secret Manager, HashiCorp Vault, Container Env) with zero-downtime runtime overrides and 5-minute LRU TTL caching.
- **Temporal.io Workflow Engine**: Coordinates stateful, long-running pipelines with activity state transitions (`PENDING`, `EXECUTING`, `COMPLETED`, `COMPENSATING`, `FAILED`) and event-driven signals (`APPROVE_SIGNAL`, `REJECT_SIGNAL`, `REQUEST_CHANGES_SIGNAL`, `TERMINATE_SIGNAL`).
- **LangGraph State-Graph Topology**: Directed acyclic multi-agent graph with discrete nodes (PM, Architect, Coder, QA Sandbox, CEO Governance, HITL Gate, Cloud Deploy).
- **Firecracker MicroVM Sandbox Pool**: Runs agent-generated code inside isolated microVM slots with strict zero-trust AST security scanners blocking unauthorized globals (`process.exit`, `eval`, `fs`), memory caps, and execution timeout guards.
- **Cognitive Reasoning**: Powered by server-side **Google Gemini AI Models** utilizing the official `@google/genai` TypeScript SDK with automatic high-fidelity offline fallbacks.
- **Immutable Ledger**: Immutable event sourcing recording full system and model state mutations with optimistic concurrency control (OCC).
- **Safety Gateways & Budgets**: Restricts budget allocations using thread-safe **Per-Agent Circuit Breakers**, real-time **Thermal Cost Throttling**, and dynamic **30-Day Agent Performance Analytics** built with `recharts`.

---

## 🔒 Control Plane Security (RBAC)

TaskFlow AI features high-security **Control Plane & Data Plane Separation**:
- **Observer Mode (Viewer)**: Accessible by default. Users have real-time read access to telemetry streams, blackboards, agent statistics, and log outputs.
- **Operator Mode (Admin)**: Requires secure authentication. Elevating to Operator Mode unlocks action-oriented administrative API controls: deploying tasks, manual approvals/rejections, altering agent budgets, resetting circuit breakers, and configuring dynamic secret overrides.

---

## 🛠️ Pioneer Squad Agent Registry

The operating system includes five specialized agentic roles:

1. **Pat (Product Manager Agent)**: Synthesizes user specifications into concise agile product briefs and scope boundaries.
2. **Alex (Backend Developer Agent)**: Formulates high-performance database schema indexes, API designs, and architectural plans.
3. **Chloe (Frontend Developer Agent)**: Crafts responsive React components and Tailwind CSS interfaces.
4. **Dave (QA Reviewer Agent)**: Performs security validation, AST compliance audits, and executes code within the Firecracker MicroVM isolate.
5. **Sam (CEO / Governance Agent)**: Conducts strategic alignment reviews and corporate financial audits before requesting operator merge sign-offs.

---

## 📦 System Directory Structure

```
taskflow-ai/
├── server.ts                       # Full-stack Express server with Gemini SDK, SSE & REST APIs
├── SPEC.md                         # Full system technical specification sheet
├── README.md                       # Project repository documentation
├── PLAN.md                         # Enterprise refactoring & implementation roadmap
├── TODO.md                         # Actionable backlog & milestone tracker
├── package.json                    # Dependencies, test scripts, and build pipeline
├── vite.config.ts                  # Vite config file
└── src/
    ├── main.tsx                    # React mounting entry point
    ├── App.tsx                     # Primary dashboard controller and state subscriber
    ├── types.ts                    # Global TypeScript schemas (Tasks, Agents, Events, Infra)
    ├── index.css                   # Refined cosmic theme & Tailwind CSS styles
    ├── components/
    │   ├── CommandCenter.tsx       # Live Kanban board, task details, and HITL decision gates
    │   ├── ExpertStudio.tsx        # Pioneer squad config & circuit breaker resets
    │   ├── BudgetLedger.tsx        # Cost distribution charts & thermal throttling panels
    │   ├── ThoughtStream.tsx       # Stream terminal showing OTel traces & event JSON payloads
    │   └── EnterpriseInfra.tsx     # Enterprise Mesh inspector (Secrets, Temporal, LangGraph, Firecracker)
    ├── server/
    │   ├── secret-manager.ts       # Dynamic multi-provider Secret Manager (GCP/Vault/Env)
    │   ├── temporal-orchestrator.ts # Temporal.io workflow state machine & signal dispatcher
    │   ├── langgraph-engine.ts     # LangGraph multi-agent DAG execution topology
    │   └── firecracker-sandbox.ts  # MicroVM sandbox pool & zero-trust AST security scanner
    └── tests/
        └── run-assertions.ts       # Automated unit & integration test runner
```

---

## 💿 Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- NPM package manager

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Google Gemini API Key (Optional. Robust simulation fallback is used if missing)
GEMINI_API_KEY=your_gemini_api_key_here
OPERATOR_PASSWORD=admin123
```

---

## ⚙️ Operational Usage

### 1. Launch Development Server
```bash
npm run dev
```

### 2. Perform Operational Workflows
- **Deploy Task**: Create a software engineering task specifying priority and deadlines.
- **Inspect Infra Mesh**: Switch to the **Infra Mesh** tab to audit live Temporal workflows, LangGraph nodes, Firecracker microVM isolates, and dynamic secret providers.
- **Govern Budget Constraints**: Lower an agent's USD allocation in the `Expert Studio` to witness the circuit breaker trip (`CLOSED` → `OPEN`) and halt executions.
- **Human-in-the-Loop Sign-off**: Open a task awaiting approval to review Dave's microVM audit and Sam's strategic review, and choose to `Approve`, `Reject`, `Terminate`, or request revisions.

---

## 🧪 Testing

TaskFlow AI includes full-stack type checking, code style linters, and a custom automated assertion test suite.

### 1. Run Automated Test Suite
Executes unit tests verifying circuit breaker transitions, thermal cost model throttles, state-machine progressions, and optimistic concurrency control (OCC) ledger traces:
```bash
npm run test
```

### 2. Run Linter & Type Compilations
Validates TypeScript syntax integrity across the codebase:
```bash
npm run lint
```

---

## 🚀 Production Build & Deployment

### 1. Compile Assets & Bundle Server
```bash
npm run build
```
This builds frontend assets into `dist/` and compiles the Express TypeScript backend into a single, bundled `dist/server.cjs` executable using `esbuild`.

### 2. Start Production Server
```bash
npm run start
```
This boots the standalone server on http://localhost:3000.
