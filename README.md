# TaskFlow AI — Agentic Operating System (AOS)

TaskFlow AI is a technical full-stack dashboard designed to manage AI from single-user "co-pilots" to an auditable **Autonomous Squad**. Engineering managers can deploy, audit, and direct specialized agentic developer teams executing workloads under strict budget contracts, Human-in-the-Loop (HITL) gates, and independent circuit breakers.

---

## 🚀 Architectural Blueprint

The system establishes a clean **Control Plane / Data Plane Separation** supporting resilient, distributed workflows:

- **Orchestration Layer**: Simulated durable multi-stage pipelines mimicking Temporal.io timers, sagas, and state signals.
- **Cognitive Reasoning**: Powered by server-side **Google Gemini AI Models** utilizing the official `@google/genai` TypeScript SDK with automatic high-fidelity offline fallbacks.
- **Immutable Ledger**: Immutable event sourcing recording full system and model state mutations with optimistic concurrency control (OCC).
- **Control Gateways & Security**: Restricts budget allocations using thread-safe **Per-Agent Circuit Breakers**, real-time **Thermal Cost Throttling**, a dynamic **30-Day Agent Performance Audit Bar Chart** built with `recharts`, and **Control Plane Role-Based JWT Security** requiring verification for administrative actions (e.g. task creation, approvals, config changes).

---

## 🔒 Control Plane Security (RBAC)

TaskFlow AI features high-security **Control Plane & Data Plane Separation**:
- **Observer Mode (Viewer)**: Accessible by default. Users have real-time read access to telemetry streams, blackboards, agent statistics, and log outputs.
- **Operator Mode (Admin)**: Requires secure Bearer JWT verification (using a secret signature). Elevating to Operator Mode unlocks action-oriented administrative API controls: deploying tasks, manual approvals/rejections, altering agent budgets, and resetting circuit breakers.

---

## 🛠️ Pioneer Squad Agent Registry

The operating system includes three pre-configured specialized software engineering agents:

1. **Alex (Backend Developer Agent)**: Specialist in database schemas, APIs design, and architecture outlines.
2. **Chloe (Frontend Developer Agent)**: Specialist in React states, Tailwind CSS elements, and smooth animations.
3. **Dave (QA Reviewer Agent)**: Specialist in linting checks, typescript compilers, and color contrast audits.

---

## 📦 System Directory Structure

```
taskflow-ai/
├── server.ts                 # Full-stack Express server with Gemini SDK & event loop
├── SPEC.md                   # Full system technical specification sheet
├── README.md                 # Project repository documentation
├── package.json              # Dependencies and full-stack build scripts
├── vite.config.ts            # Vite config file
└── src/
    ├── main.tsx              # React mounting entry point
    ├── App.tsx               # Primary dashboard controller and state subscriber
    ├── types.ts              # Global TypeScript schemas (Tasks, Agents, Events)
    ├── index.css             # Cosmic slate theme & Tailwind CSS styles
    └── components/
        ├── CommandCenter.tsx # Live Kanban board, task details, and HITL decision gates
        ├── ExpertStudio.tsx  # Pioneer squad config & circuit breaker resets
        ├── BudgetLedger.tsx  # Cost distribution charts & thermal throttling panels
        └── ThoughtStream.tsx # Stream terminal showing OTel traces & event JSON payloads
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
```

---

## ⚙️ Development & Operational Usage

### 1. Launch Development Server
Starts the full-stack server with live hot-reloading:
```bash
npm run dev
```
*Note: The system binds to host `0.0.0.0` on port `3000` for seamless access.*

### 2. Perform Operational Workflows
- **Deploy Task**: Create a software engineering task specifying priority and deadlines.
- **Monitor the Blackboard**: Watch the agents brainstorm, write code, and run reviews in real-time inside the `Thought Stream & Traces` terminal.
- **Govern Budget Constraints**: Lower an agent's USD allocation in the `Expert Studio` to witness the circuit breaker trip (`CLOSED` → `OPEN`) and halt executions.
- **Human-in-the-Loop Sign-off**: Open a task awaiting approval to review Dave's QA report and select `Approve`, `Reject`, `Terminate`, or request revisions using the feedback form.

---

## 🧪 Testing

TaskFlow AI includes full-stack type checking, code style linters, and a custom state-machine and budget-contract automated assertion test suite.

### 1. Run High-Fidelity Automated Test Suite
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

The codebase is pre-configured to build a production bundle ready for containerized hosting environments (such as Cloud Run):

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
