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

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  protocol: 'HANDSHAKE_REQUEST' | 'DATA_TRANSMISSION' | 'QA_ALERT' | 'COLLABORATION_NOTE';
  content: string;
  timestamp: string;
}

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
  scratchpad?: string;
  scratchpadLockedBy?: string | null;
  scratchpadLockedAt?: string | null;
  directMessages?: DirectMessage[];
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ToolMetric {
  toolName: string;
  successes: number;
  failures: number;
}

export interface AgentMetrics {
  llmCallTokens: number[];
  latencyPlanningMs: number[];
  latencyImplementationMs: number[];
  latencyQaMs: number[];
  latencyProductBriefMs: number[];
  latencyCeoMs: number[];
  toolExecutions: ToolMetric[];
}

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
  metrics?: AgentMetrics;
  lastActiveAt?: string;
  lastSuccessfulToolExecutionAt?: string;
  lastCommunicationAt?: string;
}

export interface AgentTemplateConfig {
  agentId: string;
  systemPrompt: string;
  budgetUsd: number;
  maxIterations: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  targetTaskTitle: string;
  targetTaskDescription: string;
  priority: 'low' | 'medium' | 'high';
  agentConfigs: AgentTemplateConfig[];
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

// --- Dynamic Secret Manager Interfaces ---
export interface SecretManagerStatus {
  provider: 'GCP_SECRET_MANAGER' | 'VAULT_KMS' | 'ENV_FALLBACK';
  connected: boolean;
  activeSecrets: {
    geminiApiKeyConfigured: boolean;
    geminiApiKeyMasked: string;
    operatorPasswordConfigured: boolean;
    secretVersion: string;
    lastRotatedAt: string;
  };
  cacheTtlSeconds: number;
  isDynamicRotationEnabled: boolean;
}

// --- Temporal.io Orchestration Engine Interfaces ---
export type TemporalWorkflowStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'TERMINATED' | 'WAITING_SIGNAL';
export type TemporalActivityStatus = 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'COMPENSATING';

export interface TemporalActivity {
  id: string;
  name: string;
  agentId: string;
  status: TemporalActivityStatus;
  startedAt: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  durationMs?: number;
  inputPayload?: any;
  resultPayload?: any;
  errorMessage?: string;
}

export interface TemporalWorkflowRun {
  workflowId: string;
  runId: string;
  taskId: string;
  workflowType: 'TaskExecutionWorkflow' | 'SecurityAuditWorkflow' | 'EmergencyRollbackWorkflow';
  status: TemporalWorkflowStatus;
  startedAt: string;
  completedAt?: string;
  currentStep: string;
  activities: TemporalActivity[];
  signalsReceived: string[];
  sagaCompensationActive: boolean;
}

export interface TemporalEngineStatus {
  connectorState: 'CONNECTED_LOCAL_RUNTIME' | 'TEMPORAL_SERVER_LIVE' | 'STANDBY';
  namespace: string;
  taskQueue: string;
  activeWorkflowsCount: number;
  completedWorkflowsCount: number;
  sagaCompensationRate: number;
}

// --- LangGraph Execution Engine Interfaces ---
export interface LangGraphNode {
  id: string;
  name: string;
  type: 'agent' | 'evaluator' | 'tool' | 'gate' | 'router';
  agentId?: string;
  description: string;
  status: 'IDLE' | 'ACTIVE' | 'PASSED' | 'FAILED' | 'SKIPPED';
  iteration: number;
  maxIterations: number;
}

export interface LangGraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionDescription?: string;
  isConditional: boolean;
  lastTraversedAt?: string;
}

export interface LangGraphState {
  taskId: string;
  currentStep: string;
  currentNodeId: string;
  iterationCount: number;
  maxCycles: number;
  history: Array<{
    nodeId: string;
    agentId?: string;
    timestamp: string;
    action: string;
    outputSummary: string;
  }>;
  graphTopology: {
    nodes: LangGraphNode[];
    edges: LangGraphEdge[];
  };
}

// --- Firecracker MicroVM Sandbox Interfaces ---
export interface SandboxInstance {
  id: string;
  vmStatus: 'WARM_READY' | 'EXECUTING' | 'RECYCLING' | 'TERMINATED';
  cpuLimitCores: number;
  memoryLimitMb: number;
  executionTimeoutMs: number;
  uptimeSeconds: number;
  totalExecutions: number;
  lastExecutionAt?: string;
}

export interface SandboxSecurityScan {
  passed: boolean;
  score: number; // 0 to 100
  forbiddenGlobalsDetected: string[];
  networkPolicyViolation: boolean;
  warnings: string[];
}

export interface SandboxExecutionResult {
  executionId: string;
  sandboxId: string;
  language: 'typescript' | 'javascript' | 'python' | 'bash';
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  memoryUsedMb: number;
  securityScan: SandboxSecurityScan;
  executedAt: string;
}

export interface FirecrackerSandboxPoolStatus {
  poolCapacity: number;
  warmInstances: number;
  busyInstances: number;
  totalExecutionsCount: number;
  averageExecutionMs: number;
  securityViolationsBlocked: number;
  instances: SandboxInstance[];
}

