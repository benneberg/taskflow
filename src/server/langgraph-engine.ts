import {
  LangGraphState,
  LangGraphNode,
  LangGraphEdge,
  Task
} from "../types";

class LangGraphEngineService {
  private graphStates: Map<string, LangGraphState> = new Map();

  private getBaseNodes(): LangGraphNode[] {
    return [
      {
        id: "pm_node",
        name: "Product Manager Node",
        type: "agent",
        agentId: "agent-product-manager",
        description: "Drafts scope requirements, aligns tool whitelists, and sets sprint objectives.",
        status: "IDLE",
        iteration: 0,
        maxIterations: 3
      },
      {
        id: "architect_node",
        name: "System Architect Node",
        type: "agent",
        agentId: "agent-backend-dev",
        description: "Designs PostgreSQL relational schemas and FastAPI contract specifications.",
        status: "IDLE",
        iteration: 0,
        maxIterations: 5
      },
      {
        id: "coder_node",
        name: "Component Coder Node",
        type: "agent",
        agentId: "agent-frontend-dev",
        description: "Generates responsive Tailwind/React components and motion interactive widgets.",
        status: "IDLE",
        iteration: 0,
        maxIterations: 5
      },
      {
        id: "qa_sandbox_node",
        name: "Firecracker Sandbox & QA Node",
        type: "evaluator",
        agentId: "agent-qa-reviewer",
        description: "Runs code inside isolated microVM sandbox and computes AST security audit score.",
        status: "IDLE",
        iteration: 0,
        maxIterations: 5
      },
      {
        id: "ceo_governance_node",
        name: "CEO Executive Governance Node",
        type: "agent",
        agentId: "agent-ceo",
        description: "Validates corporate alignment, ROI metrics, and authorizes deployment gate.",
        status: "IDLE",
        iteration: 0,
        maxIterations: 3
      },
      {
        id: "hitl_gate_node",
        name: "Human-in-the-Loop Approval Gate",
        type: "gate",
        description: "Operator control plane decision point: Approve, Request Changes, or Reject.",
        status: "IDLE",
        iteration: 0,
        maxIterations: 10
      },
      {
        id: "deploy_node",
        name: "Production Cloud Run Deployment Node",
        type: "tool",
        description: "Deploys verified artifact to container staging and updates OCC ledger.",
        status: "IDLE",
        iteration: 0,
        maxIterations: 1
      }
    ];
  }

  private getBaseEdges(): LangGraphEdge[] {
    return [
      {
        id: "e_pm_to_arch",
        sourceNodeId: "pm_node",
        targetNodeId: "architect_node",
        conditionDescription: "Requirements brief complete & validated",
        isConditional: false
      },
      {
        id: "e_arch_to_code",
        sourceNodeId: "architect_node",
        targetNodeId: "coder_node",
        conditionDescription: "Schema definitions and API endpoints verified",
        isConditional: false
      },
      {
        id: "e_code_to_qa",
        sourceNodeId: "coder_node",
        targetNodeId: "qa_sandbox_node",
        conditionDescription: "Component code committed",
        isConditional: false
      },
      {
        id: "e_qa_pass_to_ceo",
        sourceNodeId: "qa_sandbox_node",
        targetNodeId: "ceo_governance_node",
        conditionDescription: "Security score >= 80% & zero exploit vectors",
        isConditional: true
      },
      {
        id: "e_qa_fail_to_code",
        sourceNodeId: "qa_sandbox_node",
        targetNodeId: "coder_node",
        conditionDescription: "Security failure / syntax errors (Retry Cycle)",
        isConditional: true
      },
      {
        id: "e_ceo_to_hitl",
        sourceNodeId: "ceo_governance_node",
        targetNodeId: "hitl_gate_node",
        conditionDescription: "CEO Strategic sign-off authorized",
        isConditional: false
      },
      {
        id: "e_hitl_to_deploy",
        sourceNodeId: "hitl_gate_node",
        targetNodeId: "deploy_node",
        conditionDescription: "Operator triggered APPROVE signal",
        isConditional: true
      },
      {
        id: "e_hitl_to_code",
        sourceNodeId: "hitl_gate_node",
        targetNodeId: "coder_node",
        conditionDescription: "Operator requested changes",
        isConditional: true
      }
    ];
  }

  public initTaskGraph(task: Task): LangGraphState {
    const nodes = this.getBaseNodes();
    const edges = this.getBaseEdges();

    const state: LangGraphState = {
      taskId: task.id,
      currentStep: "pm_node",
      currentNodeId: "pm_node",
      iterationCount: 1,
      maxCycles: 5,
      history: [
        {
          nodeId: "pm_node",
          agentId: "agent-product-manager",
          timestamp: new Date().toISOString(),
          action: "INITIALIZE_TASK_GRAPH",
          outputSummary: `TaskGraph initialized for "${task.title}". Entering PM node.`
        }
      ],
      graphTopology: {
        nodes,
        edges
      }
    };

    this.graphStates.set(task.id, state);
    return state;
  }

  public recordNodeExecution(
    taskId: string,
    nodeId: string,
    action: string,
    outputSummary: string,
    status: 'PASSED' | 'FAILED' | 'ACTIVE' = 'PASSED'
  ): void {
    let state = this.graphStates.get(taskId);
    if (!state) return;

    state.currentNodeId = nodeId;
    const node = state.graphTopology.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = status;
      node.iteration += 1;
    }

    state.history.push({
      nodeId,
      agentId: node?.agentId,
      timestamp: new Date().toISOString(),
      action,
      outputSummary
    });
  }

  public getTaskGraphState(taskId: string): LangGraphState | null {
    return this.graphStates.get(taskId) || null;
  }

  public getGraphTopology(): { nodes: LangGraphNode[]; edges: LangGraphEdge[] } {
    return {
      nodes: this.getBaseNodes(),
      edges: this.getBaseEdges()
    };
  }
}

export const langGraphEngine = new LangGraphEngineService();
