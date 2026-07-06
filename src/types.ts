export type TaskStatus =
  | 'CREATED'
  | 'PLANNING'
  | 'IMPLEMENTING'
  | 'QA_REVIEW'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'COMPLETED'
  | 'FAILED';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  createdAt: string;
  updatedAt: string;
  plan?: string;
  code?: string;
  qaReview?: string;
  productBrief?: string;
  strategicSignoff?: string;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface Agent {
  id: string;
  name: string;
  role: string;
  toolWhitelist: string[];
  budgetTokens: number;
  budgetUsd: number;
  spentUsd: number;
  spentTokens: number;
  fallbackChain: string[];
  model: string;
  maxIterations: number;
  systemPrompt: string;
  circuitBreakerState: CircuitBreakerState;
  tripCount: number;
  totalWarnings: number;
  status: 'IDLE' | 'WORKING' | 'TRIPPED';
}

export type TaskEventType =
  | 'TASK_CREATED'
  | 'PLANNING_STARTED'
  | 'PLANNING_COMPLETED'
  | 'IMPLEMENTING_STARTED'
  | 'CODE_COMMITTED'
  | 'QA_REVIEW_STARTED'
  | 'QA_COMPLETED'
  | 'TEST_FAILED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUEST_CHANGES'
  | 'DEPLOYED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CIRCUIT_BREAKER_TRIPPED'
  | 'THERMAL_THROTTLE_ACTIVE'
  | 'THOUGHT_LOG';

export interface TaskEvent {
  id: string;
  taskId: string;
  workflowId: string;
  agentId: string | null;
  eventType: TaskEventType;
  payload: any;
  causationId: string | null;
  correlationId: string;
  version: number;
  createdAt: string;
  triggeredBy: string | null;
}

export interface ApprovalGate {
  id: string;
  taskId: string;
  state: 'AWAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  resolvedAt?: string;
  summary: string;
  timeoutAt: string;
}

export interface BudgetTransaction {
  id: string;
  agentId: string;
  taskId: string;
  tokensUsed: number;
  costUsd: number;
  model: string;
  timestamp: string;
}

export interface ThermalThrottleStatus {
  throttleLevel: 'none' | 'light' | 'moderate' | 'severe' | 'critical';
  enabled: boolean;
  utilizationPercent: number;
  recommendedModelTier: number;
  recommendedModels: string[];
  tokenLimitMultiplier: number;
  message: string;
}

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  totalCostUsd: number;
  averageTimeToCompleteMinutes: number;
  spendByModel: { [model: string]: number };
  spendByAgent: { [agentId: string]: number };
}
