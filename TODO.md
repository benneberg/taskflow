# Project TODOs & Backlog Roadmap: TaskFlow AI (AOS)

This document maps immediate, short-term, and medium-term backlog tasks to transition TaskFlow AI from a simulated pilot to an enterprise-scale full-stack agentic engine.

---

## 🚨 Immediate Priorities (Critical Bug Fixes & Hardening)
- [x] **State Concurrent Lock Handling**: Replace direct synchronous file writes on `data-store.json` with a queued write buffer to avoid collisions.
- [x] **Input Sanitization for Dynamic Layout Views**: Sanitize text in `plan`, `code`, and `qaReview` keys inside React components to eliminate any possibility of XSS vector loads.
- [x] **Prune Event Log History**: Establish a bounding ceiling for SSE/event memory lists to keep active browser tab memory footprint stable.
- [x] **Squad Worker Expansion (Pat & Sam)**: Add strategic Product Manager (Pat) and CEO (Sam) roles into the registry and lifecycle loops.
- [x] **Expert Studio Documentation Section**: Integrate the detailed persona, tool whitelist, and prompt engineering developer schema guidelines inside ExpertStudio.tsx.

---

## 🔒 Security Backlog
- [x] **Enforce Operator Auth Handlers**: Add an API auth gate layer (JWT auth) to guard backend endpoints.
- [x] **Role-Based Client Views (RBAC)**: Differentiate operators from viewers on the client dashboard.
- [ ] **Secret Manager Integration**: Configure the server to load API keys dynamically from secure vaults (e.g. GCP Secret Manager) instead of unencrypted `.env` files.

---

## 🧪 Testing Backlog
- [x] **Add Unit Test Engine**: Create a custom automated test harness `/src/tests/run-assertions.ts` and set up `npm run test` inside `package.json`.
- [x] **Write Core Lifecycle Assertions**: Assert agent circuit breaker transitions and thermal models.
- [x] **Automated End-to-End API Integration tests**: Write tests running task operations through full-pipeline API controllers.

---

## ⚙️ Advanced Features (Future Scope)
- [ ] **Real Temporal.io Connectors**: Replace asynchronous `setTimeout` loops with actual Temporal workflow signal handlers and activities.
- [ ] **LangGraph Execution Nodes**: Integrate real LangGraph nodes using Python/JS SDKs for multi-stage feedback graph loops.
- [ ] **Firecracker Sandbox Pool Integrations**: Implement VM provisioning logic to execute agent-generated code inside isolated runtimes.
