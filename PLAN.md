# Enterprise Refactoring & Hardening Plan: TaskFlow AI (AOS)

This document maps out the comprehensive, production-grade security, testing, and operational enhancement strategy to transition the TaskFlow AI workspace to an absolute enterprise-grade standard.

---

## 🏗️ Refactoring & Optimization Architecture

### 🛡️ Module 1: Control Plane JWT Authentication & Authorization
- **Objective**: Prevent unauthorized administrative changes (budget updates, task creation, circuit breaker resets, manual approval gates) while allowing public telemetry reads.
- **Backend Components**:
  - Implement an `/api/v1/auth/login` REST endpoint verifying operator credentials (password loaded from `process.env.OPERATOR_PASSWORD` or fallback `admin123`).
  - Introduce an `authMiddleware` verifying a Bearer JWT (or simplified secure signature) on all state-mutating HTTP methods (`POST`, `PUT`, `DELETE`).
- **Frontend Components**:
  - Integrate a role status switch in the top header: **Operator Mode** (Admin) vs. **Observer Mode** (Viewer).
  - Add a beautiful "Operator Sign-In" sliding drawer/modal in the React UI with password input and visual status hooks.
  - Disable and show custom Lock icons on administrative controls (e.g., Kanban action approvals, agent configuration edits, breaker resets) unless verified as an Active Operator.

### 🧪 Module 2: High-Fidelity Automated Test Harness
- **Objective**: Guarantee functional correctness of the agentic state machine, cost degradation loops, and safety triggers under simulated concurrency.
- **Execution Engine**:
  - Implement a dedicated test runner file `/src/tests/run-assertions.ts` executing deep automated unit tests.
  - Expose a `"test"` script command in `package.json`: `"test": "tsx src/tests/run-assertions.ts"`.
- **Test Target Coverage**:
  - **Circuit Breaker Transitions**: Verify that an agent's state transitions standardly (`CLOSED` ➔ `OPEN`) when its USD spend surpasses its budget ceiling.
  - **Thermal Cost Degradation Logic**: Verify that as budget utilization percentages cross the `50%`, `70%`, `85%`, and `95%` boundaries, the correct recommended models, token multiplier limits, and messages are generated.
  - **Optimistic Concurrency Control (OCC) & Event Sourcing**: Assert that each task state mutation increases the transaction ledger `version` field exactly by `currentVersion + 1`, and correctly maps OpenTelemetry-style links (`causationId` & `correlationId`).
  - **State Machine Integration**: Test that task state progresses logically (`CREATED` ➔ `PLANNING` ➔ `IMPLEMENTING` ➔ `QA_REVIEW` ➔ `AWAITING_APPROVAL`).

### ⚡ Module 3: State Memory Leak and Pruning Hardening
- **Objective**: Eliminate any possible memory footprint growth in active SSE telemetry streams or transaction log structures.
- **Optimization Strategy**:
  - Harden SSE client lifecycle handlers inside `server.ts` to actively prune half-closed connections.
  - Add explicit bounds to client logs, ensuring arrays are capped.

---

## 📅 Execution Roadmap

1. **Create `PLAN.md`** & update `TODO.md` backlog checkpoints.
2. **Implement Backend Auth Infrastructure**: Update `server.ts` to add authentication endpoint, JWT handling, and security middleware.
3. **Refactor Client UI with RBAC**: Update `App.tsx` and components to support observer mode, locks, operator credentials, and active token persistence in localStorage.
4. **Implement Test Harness**: Write `src/tests/run-assertions.ts` and update `package.json` to expose `npm run test`.
5. **Verify and Harden**: Run linter, compiler, and the automated tests. Correct any discrepancies.
