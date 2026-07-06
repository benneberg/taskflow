# Project TODOs & Backlog Roadmap: TaskFlow AI (AOS)

This document maps immediate, short-term, and medium-term backlog tasks to transition TaskFlow AI from a simulated pilot to an enterprise-scale full-stack agentic engine.

---

## 🚨 Immediate Priorities (Critical Bug Fixes & Hardening)
- [ ] **State Concurrent Lock Handling**: Replace direct synchronous file writes on `data-store.json` with a queued write buffer to avoid collisions.
- [ ] **Input Sanitization for Dynamic Layout Views**: Sanitize text in `plan`, `code`, and `qaReview` keys inside React components to eliminate any possibility of XSS vector loads.
- [ ] **Prune Event Log History**: Establish a bounding ceiling for SSE/event memory lists to keep active browser tab memory footprint stable.

---

## 🔒 Security Backlog
- [ ] **Enforce Operator Auth Handlers**: Add an API auth gate layer (e.g. passport or JWT) to guard backend endpoints.
- [ ] **Role-Based Client Views (RBAC)**: Differentiate operators from viewers on the client dashboard.
- [ ] **Secret Manager Integration**: Configure the server to load API keys dynamically from secure vaults (e.g. GCP Secret Manager) instead of unencrypted `.env` files.

---

## 🧪 Testing Backlog
- [ ] **Add Unit Test Engine**: Set up Vitest/Jest configuration inside `package.json`.
- [ ] **Write Core Lifecycle Assertions**: Draft assertions testing circuit breaker thresholds and thermal models.
- [ ] **Automated End-to-End API Integration tests**: Write tests running mock task operations through full-pipeline API controllers.

---

## ⚙️ Advanced Features (Future Scope)
- [ ] **Real Temporal.io Connectors**: Replace asynchronous `setTimeout` loops with actual Temporal workflow signal handlers and activities.
- [ ] **LangGraph Execution Nodes**: Integrate real LangGraph nodes using Python/JS SDKs for multi-stage feedback graph loops.
- [ ] **Firecracker Sandbox Pool Integrations**: Implement VM provisioning logic to execute agent-generated code inside isolated runtimes.
