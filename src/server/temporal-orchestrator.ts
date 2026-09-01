import {
  TemporalWorkflowRun,
  TemporalActivity,
  TemporalEngineStatus,
  TemporalWorkflowStatus,
  TemporalActivityStatus,
  Task
} from "../types";

export type SignalHandler = (signalName: string, payload: any) => Promise<void>;

class TemporalOrchestratorService {
  private runs: Map<string, TemporalWorkflowRun> = new Map();
  private signalListeners: Map<string, SignalHandler[]> = new Map();
  private namespace: string = "production.taskflow-aos";
  private taskQueue: string = "agent-orchestration-queue";
  private completedCount: number = 0;
  private compensationCount: number = 0;

  constructor() {
    this.seedHistoricalRuns();
  }

  private seedHistoricalRuns(): void {
    const seedRun: TemporalWorkflowRun = {
      workflowId: "wf_seed1",
      runId: "run_01j9x716a",
      taskId: "task-seed-1",
      workflowType: "TaskExecutionWorkflow",
      status: "COMPLETED",
      startedAt: "2026-07-01T10:00:00Z",
      completedAt: "2026-07-02T14:30:00Z",
      currentStep: "COMPLETED",
      activities: [
        {
          id: "act_pm_001",
          name: "ExecuteProductBriefActivity",
          agentId: "agent-product-manager",
          status: "COMPLETED",
          startedAt: "2026-07-01T10:00:05Z",
          completedAt: "2026-07-01T10:00:30Z",
          retryCount: 0,
          maxRetries: 3,
          durationMs: 820
        },
        {
          id: "act_plan_001",
          name: "ExecutePlanningActivity",
          agentId: "agent-backend-dev",
          status: "COMPLETED",
          startedAt: "2026-07-01T11:15:00Z",
          completedAt: "2026-07-01T11:15:45Z",
          retryCount: 0,
          maxRetries: 3,
          durationMs: 1250
        },
        {
          id: "act_code_001",
          name: "ExecuteImplementationActivity",
          agentId: "agent-frontend-dev",
          status: "COMPLETED",
          startedAt: "2026-07-01T13:45:00Z",
          completedAt: "2026-07-01T13:45:50Z",
          retryCount: 0,
          maxRetries: 3,
          durationMs: 2050
        },
        {
          id: "act_qa_001",
          name: "ExecuteSandboxAuditActivity",
          agentId: "agent-qa-reviewer",
          status: "COMPLETED",
          startedAt: "2026-07-02T14:15:00Z",
          completedAt: "2026-07-02T14:15:35Z",
          retryCount: 0,
          maxRetries: 3,
          durationMs: 980
        },
        {
          id: "act_ceo_001",
          name: "ExecuteCeoSignoffActivity",
          agentId: "agent-ceo",
          status: "COMPLETED",
          startedAt: "2026-07-02T14:16:00Z",
          completedAt: "2026-07-02T14:16:30Z",
          retryCount: 0,
          maxRetries: 3,
          durationMs: 1100
        },
        {
          id: "act_deploy_001",
          name: "ExecuteDeploymentActivity",
          agentId: "system-cd",
          status: "COMPLETED",
          startedAt: "2026-07-02T14:30:00Z",
          completedAt: "2026-07-02T14:30:10Z",
          retryCount: 0,
          maxRetries: 2,
          durationMs: 450
        }
      ],
      signalsReceived: ["APPROVE_SIGNAL"],
      sagaCompensationActive: false
    };

    this.runs.set(seedRun.workflowId, seedRun);
    this.completedCount += 1;
  }

  public initWorkflowForTask(task: Task): TemporalWorkflowRun {
    const workflowId = `wf_${task.id.replace('task-', '')}`;
    const runId = `run_${Date.now().toString(36)}`;

    const run: TemporalWorkflowRun = {
      workflowId,
      runId,
      taskId: task.id,
      workflowType: "TaskExecutionWorkflow",
      status: "RUNNING",
      startedAt: new Date().toISOString(),
      currentStep: "ExecuteProductBriefActivity",
      activities: [
        {
          id: `act_${Date.now()}_pm`,
          name: "ExecuteProductBriefActivity",
          agentId: "agent-product-manager",
          status: "EXECUTING",
          startedAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3
        }
      ],
      signalsReceived: [],
      sagaCompensationActive: false
    };

    this.runs.set(workflowId, run);
    return run;
  }

  public recordActivityTransition(
    workflowId: string,
    activityName: string,
    agentId: string,
    status: TemporalActivityStatus,
    durationMs?: number,
    error?: string
  ): void {
    let run = this.runs.get(workflowId);
    if (!run) return;

    let act = run.activities.find(a => a.name === activityName);
    if (!act) {
      act = {
        id: `act_${Date.now()}_${activityName.substring(7, 11).toLowerCase()}`,
        name: activityName,
        agentId,
        status,
        startedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3
      };
      run.activities.push(act);
    }

    act.status = status;
    if (status === 'COMPLETED') {
      act.completedAt = new Date().toISOString();
      act.durationMs = durationMs;
    } else if (status === 'FAILED') {
      act.errorMessage = error;
    } else if (status === 'COMPENSATING') {
      run.sagaCompensationActive = true;
      this.compensationCount += 1;
    }

    run.currentStep = activityName;
    if (status === 'COMPLETED' && activityName === 'ExecuteDeploymentActivity') {
      run.status = 'COMPLETED';
      run.completedAt = new Date().toISOString();
      this.completedCount += 1;
    }
  }

  public async sendSignal(workflowId: string, signalName: string, payload: any = {}): Promise<boolean> {
    const run = this.runs.get(workflowId);
    if (!run) return false;

    run.signalsReceived.push(signalName);

    if (signalName === 'APPROVE_SIGNAL') {
      this.recordActivityTransition(workflowId, "ExecuteDeploymentActivity", "system-cd", "EXECUTING");
    } else if (signalName === 'REJECT_SIGNAL') {
      run.status = 'TERMINATED';
      run.completedAt = new Date().toISOString();
    } else if (signalName === 'REQUEST_CHANGES_SIGNAL') {
      this.recordActivityTransition(workflowId, "ExecuteImplementationActivity", "agent-frontend-dev", "RETRYING");
    }

    const listeners = this.signalListeners.get(workflowId) || [];
    for (const listener of listeners) {
      await listener(signalName, payload);
    }

    return true;
  }

  public registerSignalListener(workflowId: string, handler: SignalHandler): void {
    const list = this.signalListeners.get(workflowId) || [];
    list.push(handler);
    this.signalListeners.set(workflowId, list);
  }

  public getWorkflowRun(workflowId: string): TemporalWorkflowRun | undefined {
    return this.runs.get(workflowId);
  }

  public listWorkflowRuns(): TemporalWorkflowRun[] {
    return Array.from(this.runs.values());
  }

  public getEngineStatus(): TemporalEngineStatus {
    const activeRuns = Array.from(this.runs.values()).filter(r => r.status === 'RUNNING');
    const compRate = this.completedCount > 0 ? (this.compensationCount / this.completedCount) * 100 : 0;

    return {
      connectorState: "CONNECTED_LOCAL_RUNTIME",
      namespace: this.namespace,
      taskQueue: this.taskQueue,
      activeWorkflowsCount: activeRuns.length,
      completedWorkflowsCount: this.completedCount,
      sagaCompensationRate: Number(compRate.toFixed(1))
    };
  }
}

export const temporalOrchestrator = new TemporalOrchestratorService();
