# Product Purpose: TaskFlow AI (AOS)

This document outlines the product vision, core problem spaces, user cohorts, and core value propositions of the TaskFlow AI Agentic Operating System.

---

## 🚀 Product Summary
TaskFlow AI is a technical full-stack operator dashboard designed to transition AI from single-user conversational interfaces ("co-pilots") to a production-ready **Autonomous Squad**. Managers deploy, monitor, and govern specialized agent teams executing development workloads under strict budget boundaries, automated code audits, and human approval gates.

---

## ⚠️ Problem Statement
As organizations attempt to scale AI usage inside software engineering teams, they encounter three primary blockers:
1. **Unbounded Financial Risk**: Agents running in recursive feedback loops can consume thousands of dollars in LLM API fees in minutes if they get stuck or enter infinite loops.
2. **Lack of Quality Gates**: Automated code generation code output can bypass unit checks, introducing bugs, syntax errors, or security vulnerabilities directly to repositories.
3. **No Human-in-the-Loop Oversight**: Traditional autonomous agents execute code changes blindly, lacking a structured approval step for critical transitions like API schema changes or production deployments.

---

## 👥 Target Audience
- **Engineering Managers & Directors (Confidence: High)**: Looking to deploy auditable, cost-controlled autonomous software execution pipelines in their departments.
- **AI/Agent Architects (Confidence: High)**: Prototyping multi-stage agent pipelines with resilient fallback chains, circuit breakers, and cost-degradation strategies.
- **Enterprise DevOps Teams (Confidence: Medium)**: Seeking structured, event-sourced audit logs of AI contributions before deployment into production codebases.

---

## 💎 Value Proposition
- **Deterministic Budget Controls**: Implements independent **Per-Agent Circuit Breakers** that instantly halt operational loops if spending caps are violated.
- **Thermal Cost Throttling**: Automatically shifts reasoning workloads to cost-effective models as budget consumption grows, guaranteeing uninterrupted operations at minimal cost.
- **Rigorous Governance Gates**: Enforces **Human-in-the-Loop (HITL)** controls where operators can review code, request specific revisions, or approve deployments.
- **OpenTelemetry Standard Audit Traces**: Every action, plan, and code commit is event-sourced on an immutable blackboard with strict causality and correlation linking.

---

## 🛠️ Feature Matrix

### Verified Features (Observed & Tested)
- **Live Kanban Task Board**: Multi-stage columns tracking status updates dynamically without page reloads.
- **Slide-out Detail Panel**: Centralized workspace showing agent plans, generated code, QA reviews, and inline HITL controls (Approve, Reject, Request Revisions text form, Terminate).
- **Expert Studio Registry**: Central configuration module to update agent USD allocations, max iteration limits, and cognitive system prompts on the fly.
- **Thermal Throttling Gate**: Real-time visualization of cost accumulation, throttling level warning badges, and a manual throttle override.
- **Event-Sourced Trace Stream**: Real-time terminal visualizing the system blackboard telemetry with causation/correlation matching.
- **Robust Backup Storage**: Local state preservation inside `/data-store.json`.

### Inferred Features (Partially Mocked / Under Sim)
- **Automatic Temporal workflows**: Re-runs and state migrations inside durable containers.
- **Live Sandbox Sandbox Pool Execution**: Run verification tasks inside isolated microVMs to evaluate code.

### Future Backlog Features
- **Relational PostgreSQL integration**: Transitioning the mock JSON schema store to database structures.
- **Enterprise SSO & RBAC Views**: Securing the console with authentication and custom permissions.
