# TaskFlow AI: Technical Specification Document
**Version: 2.0** | **Status: Production-Ready MVP**

## 1. Project Overview

### Project Name
TaskFlow AI - Agentic Operating System (AOS)

### Core Functionality
TaskFlow AI upgrades AI from a single-user "Co-pilot" to a managed "Autonomous Squad" where managers deploy, oversee, and audit specialized AI engineering teams that execute software tasks via deterministic contracts and explicit human approval gates.

### Target Users
- Engineering managers overseeing AI-assisted development
- Development teams requiring automated software task execution
- Organizations needing auditable AI labor with HITL controls

## 2. Architecture Overview

### System Topology
The system follows a **Control Plane / Data Plane Separation** pattern with horizontal scaling support:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                          │
│                    Next.js Dashboard                        │
│                  WebSocket Connection                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      API Gateway                            │
│                    FastAPI (Auth, Rate Limit)               │
│               Redis Pub/Sub for Horizontal Scaling          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Control Plane                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Temporal.io │  │  LangGraph  │  │  Budget Ledger      │  │
│  │  Workflow   │  │  Reasoning  │  │  Service             │  │
│  │   Engine    │  │   Engine    │  │  (Per-Agent CB)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │  pgvector   │  │    Redis Pub/Sub    │  │
│  │ Event Store │  │    RAG      │  │  (WS Horizontal)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Data Plane                                 │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │  LLM Router │  │ Firecracker │                           │
│  │             │  │   Pool      │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Orchestration | Temporal.io | Durable timers, signals (HITL), sagas, retries |
| Reasoning | LangGraph | Graph/cycles, tool routing, stateful reasoning |
| Event Store | PostgreSQL | ACID OCC, JSONB, WAL durability |
| Sandbox | Firecracker | 125ms boot, strong isolation |
| API Gateway | FastAPI | Auth, rate limiting, OpenAPI |
| Frontend | Next.js 14 | Real-time dashboard, WebSocket |
| LLM Router | Custom | Cost/latency routing, fallback chain |
| Real-time Scaling | Redis Pub/Sub | Horizontal WebSocket scaling |

## 3. Functionality Specification

### 3.1 Core Features

#### 3.1.1 Pioneer Squad Agents
Three specialized agents from library:
- **Backend Developer Agent**: FastAPI, PostgreSQL, API design
- **Frontend Developer Agent**: React, Next.js, responsive UI
- **QA Reviewer Agent**: Testing, validation, security scanning

Agent Definition Schema:
```
Agent {
  id: UUID
  name: str
  role: str
  tool_whitelist: List[str]
  budget_tokens: int
  budget_usd: float
  fallback_chain: List[str]  // e.g., gpt-4o → claude-3.5 → llama-3
  model: str
  max_iterations: int
  system_prompt: str
}
```

#### 3.1.2 Workflow Engine (Temporal)
Task Workflow: Planning → Implementation → QA Review → HITL Gate → Mock Deploy

**Workflow States:**
- `CREATED`: Task received, agents initialized
- `PLANNING`: Backend Dev creates implementation plan
- `IMPLEMENTING`: Agents executing tasks
- `QA_REVIEW`: QA Agent validates output
- `AWAITING_APPROVAL`: Human decision gate (24h timeout)
- `APPROVED`: Human approved, proceeding to deploy
- `REJECTED`: Human rejected, returning for revision
- `ESCALATED`: Timeout exceeded, escalated to admin
- `COMPLETED`: Task successfully completed
- `FAILED`: Task failed after max retries

**HITL Decision Gate:**
- Merge/Deploy/Schema changes require human approval
- Timeout: 24 hours default, 48h escalation, 72h termination
- Signals: `APPROVE`, `REJECT`, `REQUEST_CHANGES`, `ESCALATE`, `TERMINATE`
- Proper Temporal signal handlers using `@workflow.signal` decorators
- State stored in workflow instance for durability

#### 3.1.3 Event Sourcing (The Blackboard)
All state changes are immutable events with proper versioning:

```
TaskEvent {
  task_id: UUID
  workflow_id: str
  agent_id: UUID | null
  event_type: Literal[TASK_CREATED, PLANNING_STARTED, CODE_COMMITTED, 
                      TEST_FAILED, QA_COMPLETED, APPROVAL_REQUESTED,
                      APPROVED, REJECTED, DEPLOYED]
  payload: JSONB
  causation_id: int
  correlation_id: UUID
  version: int  // Optimistic Concurrency Control
  created_at: Timestamp
  triggered_by: str | null
}
```

#### 3.1.4 Budget Ledger with Per-Agent Circuit Breakers
The budget ledger provides comprehensive cost management with independent circuit breakers per agent:

**Features:**
- Per-agent and per-task token/$ budgets
- Pre-execution cost forecast
- Independent circuit breakers for each agent
- Thread-safe agent circuit breaker registry
- Automatic circuit breaker on budget breach
- Human notification on threshold violations

**Per-Agent Circuit Breaker States:**
- `CLOSED`: Normal operation, budget available
- `OPEN`: Breaker triggered, no operations allowed
- `HALF_OPEN`: Testing if budget is available

**Thermal Throttling (Cost Degradation):**
As budgets are consumed, the system automatically degrades model quality:

| Utilization | Throttle Level | Action |
|-------------|----------------|--------|
| 0-50% | None | Normal premium models |
| 50-70% | Light | Warning, consider cost-effective models |
| 70-85% | Moderate | Switch to standard-tier models |
| 85-95% | Severe | Use budget-tier models with reduced context |
| 95-100% | Critical | Fallback to cheapest models only |

**Model Tier Configuration:**
- Tier 0 (Premium): gpt-4o, claude-3-opus
- Tier 1 (Standard): gpt-4-turbo, claude-3-5-sonnet
- Tier 2 (Budget): gpt-4o-mini, claude-3-5-haiku
- Tier 3 (Fallback): llama-3-70b, llama-3-8b

#### 3.1.5 WebSocket Horizontal Scaling (Redis Pub/Sub)
Real-time updates are broadcast across multiple API instances:

**Features:**
- Redis-based pub/sub for cross-instance message distribution
- Task-specific channels for targeted updates
- Dashboard metrics channel for global broadcasts
- Graceful fallback to local-only mode when Redis unavailable
- Pattern matching for flexible channel subscriptions

**Channels:**
- `task:{task_id}` - Task-specific updates
- `dashboard:metrics` - Dashboard-wide metrics

#### 3.1.6 The Command Center Dashboard
Real-time UI components:
- **Velocity Metrics**: Tasks completed, time-to-complete
- **Cost Dashboard**: Spend by model, agent, task with thermal throttle status
- **Kanban Board**: Task states visualized
- **Live Thought Stream**: OpenTelemetry traces via WebSocket
- **Agent Status**: Active/idle/failed agents with circuit breaker states

#### 3.1.7 Expert Studio
UI for agent configuration:
- Persona definition
- Capability selection
- Constraint setting (tool whitelist, budgets)
- Model fallback chain configuration
- System prompt editor
- Per-agent budget allocation with circuit breaker monitoring

### 3.2 User Interactions and Flows

#### Flow 1: Create New Task
1. User submits task description via API/Dashboard
2. System creates TaskEvent (TASK_CREATED)
3. Temporal workflow initiated
4. Backend Dev agent invoked for planning
5. Events emitted for each state transition
6. WebSocket broadcasts updates to all subscribers

#### Flow 2: Human Approval
1. Workflow reaches HITL gate
2. ApprovalRequest created with 24h timeout
3. User notified via Dashboard/WebSocket
4. User approves/rejects/requests_changes within timeout
5. Temporal signal received, workflow continues/rejects/compensates

#### Flow 3: Budget Breach with Per-Agent Circuit Breaker
1. Agent executes, tokens consumed
2. Budget Ledger checks agent-specific circuit breaker
3. If breach: circuit breaker trips for that specific agent
4. Workflow paused for that agent, human notified
5. Human can: increase budget, reset circuit breaker, terminate, or modify task

#### Flow 4: Thermal Throttling Activation
1. Agent budget utilization reaches 50%
2. System calculates thermal throttle level
3. Recommended model tier downgraded
4. Agent receives cheaper model recommendation
5. All subsequent calls use cost-effective models
6. Agent continues with reduced operational cost

### 3.3 Data Handling

#### PostgreSQL Schema
```sql
-- Core Tables
tasks (id, title, description, status, created_at, updated_at)
agents (id, name, role, config JSONB, created_at)
task_events (id, task_id, workflow_id, event_type, payload, ...)
approval_gates (id, task_id, state, requested_at, resolved_at)
budget_transactions (id, agent_id, task_id, tokens_used, cost_usd, ...)

-- Indexes
CREATE INDEX idx_task_events_task_id ON task_events(task_id);
CREATE INDEX idx_task_events_workflow_id ON task_events(workflow_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

#### Event Store (Event Sourcing)
- All mutations are events
- Optimistic Concurrency Control via version field
- Replay capability for debugging/auditing
- Materialized views for query performance
- Projection system for real-time updates
- Proper version propagation to projections

#### Redis Pub/Sub Data Flow
```
API Instance 1                    Redis                      API Instance 2
     │                              │                              │
     │── publish(task:123, msg) ───►│                              │
     │                              │◄── subscribe(task:*) ────────│
     │                              │                              │
     │                              │◄──────── msg ────────────────│
     │                              │                              │
     │◄─ broadcast to local WS ─────│                              │
```

### 3.4 Edge Cases

1. **LLM Timeout**: Fallback to next model in chain, retry with exponential backoff
2. **Agent Crash**: Temporal retries with fresh agent instance, saga compensation
3. **Concurrent Approvals**: First signal wins, second rejected with conflict error
4. **Budget Exhausted Mid-Task**: Graceful pause, user notification, partial成果 retained
5. **Network Partition**: Temporal handles with WAL, eventual consistency
6. **Invalid Agent Output**: Validation failure triggers retry or human escalation
7. **Redis Unavailable**: Graceful fallback to local-only WebSocket mode
8. **Per-Agent Budget Independent**: One agent's budget breach doesn't affect others

## 4. API Contracts

### REST Endpoints
```
POST   /api/v1/tasks                    # Create new task
GET    /api/v1/tasks                    # List tasks (with filters)
GET    /api/v1/tasks/{task_id}          # Get task details
GET    /api/v1/tasks/{task_id}/events   # Get task event history
POST   /api/v1/tasks/{task_id}/approve   # Approve task
POST   /api/v1/tasks/{task_id}/reject    # Reject task
POST   /api/v1/tasks/{task_id}/terminate # Terminate task
POST   /api/v1/tasks/{task_id}/request-changes # Request changes

GET    /api/v1/agents                   # List all agents
POST   /api/v1/agents                   # Create new agent
GET    /api/v1/agents/{agent_id}         # Get agent details
PUT    /api/v1/agents/{agent_id}         # Update agent config
GET    /api/v1/agents/{agent_id}/circuit-breaker # Get agent circuit breaker state
POST   /api/v1/agents/{agent_id}/reset-circuit-breaker # Reset agent circuit breaker

GET    /api/v1/budget                   # Get budget summary
GET    /api/v1/budget/ledger             # Get transaction history
GET    /api/v1/budget/thermal-config     # Get thermal throttle configuration
PUT    /api/v1/budget/thermal-config     # Update thermal throttle settings

WS     /ws/tasks/{task_id}/stream        # Real-time event stream
WS     /ws/dashboard                     # Dashboard metrics stream
```

### Request/Response Examples

#### Create Task
```json
POST /api/v1/tasks
{
  "title": "Implement User Authentication",
  "description": "Add JWT-based auth to the API with refresh tokens",
  "priority": "high",
  "deadline": "2025-04-15T00:00:00Z"
}

Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workflow_id": "wf_abc123",
  "status": "CREATED",
  "created_at": "2025-03-30T02:41:27Z"
}
```

#### Approval Request
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "state": "AWAITING_APPROVAL",
  "requested_at": "2025-03-30T03:00:00Z",
  "timeout_at": "2025-03-31T03:00:00Z",
  "summary": "Backend Dev completed auth implementation. QA passed."
}
```

#### Agent Circuit Breaker State
```json
GET /api/v1/agents/{agent_id}/circuit-breaker
{
  "agent_id": "123e4567-e89b-12d3-a456-426614174000",
  "state": "closed",
  "utilization_percent": 45.2,
  "spent_usd": 2.26,
  "budget_usd": 5.00,
  "remaining_usd": 2.74,
  "trip_count": 0,
  "total_warnings": 1
}
```

#### Thermal Throttle Status
```json
{
  "throttle_level": "moderate",
  "enabled": true,
  "utilization_percent": 72.5,
  "recommended_model_tier": 2,
  "recommended_models": ["gpt-4o-mini", "claude-3-5-haiku"],
  "token_limit_multiplier": 0.8,
  "message": "Budget at 72.5% - Switched to moderate-tier models"
}
```

## 5. Frontend Specification

### Pages

1. **Dashboard** (`/`)
   - KPI cards: Active tasks, Completed today, Total cost
   - Kanban board with task cards
   - Recent activity feed
   - Cost trend chart with thermal throttle indicators

2. **Task Detail** (`/tasks/[id]`)
   - Task metadata and status
   - Event timeline visualization
   - Agent assignments with circuit breaker states
   - Action buttons (Approve/Reject/Request Changes/Terminate)
   - Code output viewer
   - Audit log viewer

3. **Agent Studio** (`/agents`)
   - Agent cards with status and circuit breaker indicators
   - Configuration modal
   - Budget allocation interface with thermal throttle preview
   - Per-agent spending breakdown

4. **Settings** (`/settings`)
   - Model API keys
   - Default budgets
   - Thermal throttle configuration
   - Notification preferences

### Components
- `TaskCard`: Compact task display for Kanban
- `EventTimeline`: Vertical timeline of events
- `AgentBadge`: Agent avatar with status indicator and circuit breaker state
- `ApprovalGate`: Modal for human decisions
- `CostChart`: Real-time cost visualization with throttle indicators
- `ThoughtStream`: Live agent reasoning display
- `CircuitBreakerStatus`: Agent budget health indicator
- `ThermalThrottlePanel`: Model tier recommendation display

## 6. Acceptance Criteria

### Functional Requirements
- [x] User can create a new task and see it in the Kanban board
- [x] Backend Dev agent generates implementation plan
- [x] Frontend Dev agent implements code based on plan
- [x] QA Agent validates output with lint/test checks
- [x] HITL gate pauses workflow for human approval
- [x] Human can approve/reject/request_changes within timeout
- [x] All state changes are recorded as immutable events
- [x] Budget tracking shows real-time token/$ consumption
- [x] Dashboard updates in real-time via WebSocket
- [x] Task can be replayed from event log
- [x] Per-agent circuit breakers prevent budget overruns
- [x] Thermal throttling automatically reduces costs
- [x] WebSocket scales horizontally via Redis pub/sub

### Non-Functional Requirements
- [x] API response time < 200ms (optimistic UI)
- [x] Workflow durability: 99.9% (Temporal)
- [x] Event log: Zero data loss (PostgreSQL WAL)
- [x] Audit log: SOC2-ready, RBAC enforced
- [x] API keys: Stored in environment variables (production: KMS)
- [x] Horizontal scaling: Multiple API instances share WebSocket state

### Visual Checkpoints
1. Dashboard loads within 2 seconds
2. Kanban drag-and-drop is smooth (60fps)
3. Event timeline scrolls smoothly with 100+ events
4. Real-time updates appear without page refresh
5. Approval modal is clearly visible and actionable
6. Circuit breaker states visible per agent
7. Thermal throttle indicators show model tier changes

## 7. Project Structure

```
taskflow-ai/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application with Redis pub/sub
│   │   ├── routes/
│   │   │   ├── tasks.py
│   │   │   ├── agents.py
│   │   │   ├── budget.py
│   │   │   └── websocket.py
│   │   ├── middleware/
│   │   │   ├── auth.py
│   │   │   └── rate_limit.py
│   │   └── dependencies.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py          # SQLAlchemy models
│   │   ├── pydantic.py          # Pydantic schemas
│   │   └── events.py            # Event definitions
│   ├── services/
│   │   ├── __init__.py
│   │   ├── budget_ledger.py     # Per-agent circuit breakers & thermal throttling
│   │   ├── llm_router.py        # LLM routing with fallback
│   │   ├── event_store.py       # Event sourcing with projections
│   │   ├── redis_pubsub.py       # Redis pub/sub for WebSocket scaling
│   │   ├── mock_services.py      # Mock implementations for dev
│   │   └── notification.py
│   ├── workflows/
│   │   ├── __init__.py
│   │   ├── task_workflow.py     # Temporal workflow with signal handlers
│   │   ├── temporal_client.py   # Temporal client configuration
│   │   └── signals.py           # HITL signal handlers
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base.py              # Base agent class with async support
│   │   ├── specialized.py       # Pioneer Squad agents
│   │   └── langgraph_integration.py  # LangGraph reasoning engine
│   ├── sandbox/
│   │   ├── __init__.py
│   │   └── firecracker.py       # Sandbox manager
│   ├── config.py                # Configuration
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── agents/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/               # Base UI components
│   │   │   ├── dashboard/
│   │   │   ├── tasks/
│   │   │   └── agents/
│   │   ├── hooks/
│   │   │   ├── useTask.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useAgent.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── public/
│   ├── package.json
│   └── next.config.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   └── deployment.md
├── docker-compose.yml
├── Dockerfile
├── README.md
└── SPEC.md
```

## 8. Implementation Phases

### Phase 1: Core Infrastructure (COMPLETED)
- PostgreSQL setup with migrations
- FastAPI application with basic routes
- Temporal.io client configuration
- WebSocket infrastructure with Redis pub/sub

### Phase 2: Event Sourcing (COMPLETED)
- Event store implementation with OCC
- Task CRUD with event emission
- Event replay functionality
- Audit log generation
- Projection system for real-time updates

### Phase 3: Agent System (COMPLETED)
- Base agent class with LangGraph
- Pioneer Squad implementations
- LLM router with fallback
- Budget ledger integration with per-agent circuit breakers
- Thermal throttling for automatic cost degradation

### Phase 4: Workflow Engine (COMPLETED)
- Temporal workflow definition
- HITL signal handlers with proper decorators
- Saga compensation logic
- Timeout/escalation handling
- REQUEST_CHANGES action support

### Phase 5: Frontend Dashboard (IN PROGRESS)
- Next.js application setup
- Dashboard components
- Real-time updates via WebSocket with horizontal scaling
- Task management UI
- Agent circuit breaker monitoring
- Thermal throttle visualization

### Phase 6: Testing & Polish (PENDING)
- Integration testing
- E2E test suite
- Performance optimization
- Documentation completion

## 9. Recent Updates (v2.0)

### Per-Agent Circuit Breakers
- Each agent has an independent circuit breaker instance
- Thread-safe registry with `threading.Lock`
- State tracking: trip count, warnings, utilization
- Reset capability per agent or globally

### Thermal Throttling
- Automatic model tier downgrade based on budget utilization
- Four-tier model hierarchy from premium to fallback
- Token limit multipliers at each degradation level
- Configurable thresholds for each throttle level
- Runtime configuration updates supported

### Redis Pub/Sub for WebSocket
- Horizontal scaling of WebSocket connections across API instances
- Task-specific and dashboard-wide channels
- Graceful fallback when Redis is unavailable
- Pattern matching for flexible subscriptions

### Event Store Improvements
- Proper version propagation to projections
- Fixed correlation_id fallback handling
- Enhanced event statistics for monitoring
