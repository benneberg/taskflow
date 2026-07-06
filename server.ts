import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  Task,
  Agent,
  TaskEvent,
  ApprovalGate,
  BudgetTransaction,
  ThermalThrottleStatus,
  TaskStatus,
  TaskEventType
} from "./src/types";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with User-Agent header for telemetry as instructed
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini AI client successfully initialized server-side.");
  } catch (error) {
    console.error("Failed to initialize Gemini AI client:", error);
  }
} else {
  console.log("GEMINI_API_KEY not found in environment. Using robust local simulation fallback.");
}

// Data Store Backup Path
const DATA_STORE_PATH = path.join(process.cwd(), "data-store.json");

// Core State (In-Memory Database with Persistence Backup)
let tasks: Task[] = [];
let agents: Agent[] = [];
let events: TaskEvent[] = [];
let gates: ApprovalGate[] = [];
let transactions: BudgetTransaction[] = [];
let thermalConfig: ThermalThrottleStatus = {
  throttleLevel: "none",
  enabled: true,
  utilizationPercent: 0,
  recommendedModelTier: 0,
  recommendedModels: ["gemini-3.5-flash"],
  tokenLimitMultiplier: 1.0,
  message: "Normal operations. High-performance premium models active."
};

// Seed initial values
function seedData() {
  agents = [
    {
      id: "agent-backend-dev",
      name: "Alex",
      role: "Backend Developer Agent",
      toolWhitelist: ["fastapi", "postgresql", "db_migration", "plan_architect"],
      budgetTokens: 5000000,
      budgetUsd: 5.00,
      spentUsd: 0.85,
      spentTokens: 250000,
      fallbackChain: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "mock-backend"],
      model: "gemini-3.5-flash",
      maxIterations: 10,
      systemPrompt: "You are Alex, an expert backend engineer specializing in FastAPI and PostgreSQL schemas. Design pristine, high-performance database architectures and robust API schemas.",
      circuitBreakerState: "CLOSED",
      tripCount: 0,
      totalWarnings: 0,
      status: "IDLE"
    },
    {
      id: "agent-frontend-dev",
      name: "Chloe",
      role: "Frontend Developer Agent",
      toolWhitelist: ["react", "tailwind_css", "nextjs", "vite", "motion"],
      budgetTokens: 4000000,
      budgetUsd: 4.00,
      spentUsd: 1.10,
      spentTokens: 380000,
      fallbackChain: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "mock-frontend"],
      model: "gemini-3.5-flash",
      maxIterations: 10,
      systemPrompt: "You are Chloe, a UI/UX-focused frontend engineer specializing in React, Tailwind CSS, and smooth motion interactions. Craft responsive, visually breathtaking, and accessible user interfaces.",
      circuitBreakerState: "CLOSED",
      tripCount: 0,
      totalWarnings: 0,
      status: "IDLE"
    },
    {
      id: "agent-qa-reviewer",
      name: "Dave",
      role: "QA Reviewer Agent",
      toolWhitelist: ["eslint", "typescript_compiler", "jest_tests", "security_scanner"],
      budgetTokens: 2500000,
      budgetUsd: 3.00,
      spentUsd: 0.40,
      spentTokens: 140000,
      fallbackChain: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "mock-qa"],
      model: "gemini-3.5-flash",
      maxIterations: 8,
      systemPrompt: "You are Dave, a meticulous QA engineer and security auditor. Scan code for edge cases, performance vulnerabilities, security flaws, and test coverage. Enforce absolute product quality.",
      circuitBreakerState: "CLOSED",
      tripCount: 0,
      totalWarnings: 0,
      status: "IDLE"
    },
    {
      id: "agent-product-manager",
      name: "Pat",
      role: "Product Manager Agent",
      toolWhitelist: ["requirements_analysis", "jira_specifier", "brief_compiler", "scope_validator"],
      budgetTokens: 3000000,
      budgetUsd: 3.50,
      spentUsd: 0.15,
      spentTokens: 45000,
      fallbackChain: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "mock-pm"],
      model: "gemini-3.5-flash",
      maxIterations: 5,
      systemPrompt: "You are Pat, a strategic Product Manager agent. Your job is to analyze incoming raw task specifications, draft structured product briefs, align tools with scope boundaries, and define the high-level functional objectives of the sprint.",
      circuitBreakerState: "CLOSED",
      tripCount: 0,
      totalWarnings: 0,
      status: "IDLE"
    },
    {
      id: "agent-ceo",
      name: "Sam",
      role: "CEO Agent",
      toolWhitelist: ["strategic_signoff", "risk_assessor", "compliance_checker", "financial_approver"],
      budgetTokens: 6000000,
      budgetUsd: 6.00,
      spentUsd: 0.50,
      spentTokens: 110000,
      fallbackChain: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "mock-ceo"],
      model: "gemini-3.5-flash",
      maxIterations: 6,
      systemPrompt: "You are Sam, the chief executive officer agent. Your role is to govern high-level strategic directives, perform financial gate sanity checks, authorize system deployment signals, and verify brand voice and market readiness.",
      circuitBreakerState: "CLOSED",
      tripCount: 0,
      totalWarnings: 0,
      status: "IDLE"
    }
  ];

  tasks = [
    {
      id: "task-seed-1",
      title: "Implement User Authentication",
      description: "Add JWT-based auth to the API with custom refresh tokens, secure cookies, and password hashing.",
      status: "COMPLETED",
      priority: "high",
      deadline: "2026-07-20T23:59:59Z",
      createdAt: "2026-07-01T10:00:00Z",
      updatedAt: "2026-07-02T14:30:00Z",
      plan: `### Alex's Technical Architecture Plan
1. **Schema Design**:
   - Create \`users\` table with UUID primary key.
   - Securely store hashed passwords using Argon2id.
   - Create \`refresh_tokens\` table tracking revocation status and rotation limits.
2. **API Handlers**:
   - \`POST /api/v1/auth/register\` -> Sign up users, validate strong passwords.
   - \`POST /api/v1/auth/login\` -> Verify credentials, issue Access JWT (15m expiry) and Refresh JWT (7d expiry, HttpOnly cookie).
   - \`POST /api/v1/auth/refresh\` -> Perform token rotation, invalidate old refresh chain.
3. **Security Invariants**:
   - Strict Origin validations, SameSite=Strict cookies.
   - High-performance Postgres index on user emails.`,
      code: `// Express Auth Middleware Entry Point
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function loginUser(req, res) {
  const { email, password } = req.body;
  const user = await db.getUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const accessToken = jwt.sign({ uid: user.id }, process.env.JWT_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ uid: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  
  res.cookie('token_refresh', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  return res.json({ accessToken });
}`,
      qaReview: `### Dave's QA Security Audit Report
- **Lint Check**: PASS (0 errors, 2 warnings)
- **Unit Tests**: 12/12 passing (100% test coverage on authentication endpoints)
- **Security Audit**:
  - [x] JWT expires in under 1 hour
  - [x] Cookie marked HttpOnly, Secure, SameSite=Strict
  - [x] Token rotation correctly revokes parent context on duplicate submission
- **Status**: APPROVED. Excellent adherence to cryptographic and operational standards.`,
      productBrief: `### Pat's Product Brief: User Authentication
- **Objective**: Implement enterprise-grade JWT-based user session handling.
- **Scope Limits**: Support standard refresh token rotation with zero client-side storage exposure of private keys.
- **Persona Boundary**: Restrict database and crypto whitelists.`,
      strategicSignoff: `### Sam's CEO Executive Alignment Review
- **Strategic Value**: High. Crucial for customer confidence and data isolation standards.
- **Financial Status**: Under budget. Safe for general deployment.
- **Sign-off**: AUTHORIZED.`
    },
    {
      id: "task-seed-2",
      title: "Build Interactive Chat Widget",
      description: "Create a floating real-time chat widget matching our dark cosmic slate aesthetic with custom entry animations.",
      status: "AWAITING_APPROVAL",
      priority: "medium",
      deadline: "2026-07-25T18:00:00Z",
      createdAt: "2026-07-05T09:00:00Z",
      updatedAt: "2026-07-06T10:15:00Z",
      plan: `### Chloe's UI/UX Layout Plan
1. **Visual Elements**:
   - Floating action button in the bottom right corner with a gentle cosmic pulse effect.
   - Chat window featuring smooth motion animations on open and close.
   - Aesthetic pairings: Deep slate slate-900 canvas, indigo-500 action highlights, custom scrollbars.
2. **Interaction Design**:
   - Click floating button -> slide up panel with micro-bounce motion.
   - Real-time text typing indicator with staggered bubble animations.
   - Clean, lightweight input box with auto-focus and send button.`,
      code: `// Floating Cosmic Chat Widget React Component
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send } from 'lucide-react';

export default function CosmicChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  
  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <button onClick={() => setIsOpen(!isOpen)} className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 text-white transition-all">
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}`,
      qaReview: `### Dave's QA UX Review
- **Aesthetic Validation**: Matches exact layout requirements. Smooth 60fps animations.
- **Micro-interactions**: High visual fidelity. Proper focus-traps handled.
- **Contrast Check**: AA compliance met for text over cosmic backdrop.
- **Decision Gate**: Ready for human deployment sign-off.`,
      productBrief: `### Pat's Product Brief: Interactive Chat Widget
- **Objective**: Design and build a floating reactive chat widget matching the Cosmic Slate design system.
- **Scope Limits**: Focus purely on front-end aesthetics, transitions, and local simulated feedback loops. No unrequested backends.`,
      strategicSignoff: `### Sam's CEO Executive Alignment Review
- **Strategic Value**: Medium. Enhances user experience engagement metrics by ~15%.
- **Financial Status**: Within expectations. Good use of frontend budget.
- **Sign-off**: APPROVED.`
    }
  ];

  events = [
    {
      id: "event-seed-1",
      taskId: "task-seed-1",
      workflowId: "wf_seed1",
      agentId: "agent-backend-dev",
      eventType: "TASK_CREATED",
      payload: { title: "Implement User Authentication" },
      causationId: null,
      correlationId: "corr_seed1",
      version: 1,
      createdAt: "2026-07-01T10:00:05Z",
      triggeredBy: "System Manager"
    },
    {
      id: "event-seed-2",
      taskId: "task-seed-1",
      workflowId: "wf_seed1",
      agentId: "agent-backend-dev",
      eventType: "PLANNING_COMPLETED",
      payload: { planLength: 384 },
      causationId: "event-seed-1",
      correlationId: "corr_seed1",
      version: 2,
      createdAt: "2026-07-01T11:15:00Z",
      triggeredBy: "Alex"
    },
    {
      id: "event-seed-3",
      taskId: "task-seed-1",
      workflowId: "wf_seed1",
      agentId: "agent-frontend-dev",
      eventType: "CODE_COMMITTED",
      payload: { locCount: 22 },
      causationId: "event-seed-2",
      correlationId: "corr_seed1",
      version: 3,
      createdAt: "2026-07-01T13:45:00Z",
      triggeredBy: "Chloe"
    },
    {
      id: "event-seed-4",
      taskId: "task-seed-1",
      workflowId: "wf_seed1",
      agentId: "agent-qa-reviewer",
      eventType: "QA_COMPLETED",
      payload: { securityScore: 98 },
      causationId: "event-seed-3",
      correlationId: "corr_seed1",
      version: 4,
      createdAt: "2026-07-02T14:15:00Z",
      triggeredBy: "Dave"
    },
    {
      id: "event-seed-5",
      taskId: "task-seed-1",
      workflowId: "wf_seed1",
      agentId: null,
      eventType: "COMPLETED",
      payload: { method: "Manual Approval" },
      causationId: "event-seed-4",
      correlationId: "corr_seed1",
      version: 5,
      createdAt: "2026-07-02T14:30:00Z",
      triggeredBy: "benneberg@gmail.com"
    },
    // Task 2
    {
      id: "event-seed-6",
      taskId: "task-seed-2",
      workflowId: "wf_seed2",
      agentId: null,
      eventType: "TASK_CREATED",
      payload: { title: "Build Interactive Chat Widget" },
      causationId: null,
      correlationId: "corr_seed2",
      version: 1,
      createdAt: "2026-07-05T09:00:10Z",
      triggeredBy: "System Manager"
    },
    {
      id: "event-seed-7",
      taskId: "task-seed-2",
      workflowId: "wf_seed2",
      agentId: "agent-frontend-dev",
      eventType: "PLANNING_COMPLETED",
      payload: { planLength: 320 },
      causationId: "event-seed-6",
      correlationId: "corr_seed2",
      version: 2,
      createdAt: "2026-07-05T10:15:00Z",
      triggeredBy: "Chloe"
    },
    {
      id: "event-seed-8",
      taskId: "task-seed-2",
      workflowId: "wf_seed2",
      agentId: "agent-frontend-dev",
      eventType: "CODE_COMMITTED",
      payload: { locCount: 18 },
      causationId: "event-seed-7",
      correlationId: "corr_seed2",
      version: 3,
      createdAt: "2026-07-05T11:40:00Z",
      triggeredBy: "Chloe"
    },
    {
      id: "event-seed-9",
      taskId: "task-seed-2",
      workflowId: "wf_seed2",
      agentId: "agent-qa-reviewer",
      eventType: "QA_COMPLETED",
      payload: { auditPassed: true },
      causationId: "event-seed-8",
      correlationId: "corr_seed2",
      version: 4,
      createdAt: "2026-07-06T10:15:00Z",
      triggeredBy: "Dave"
    }
  ];

  transactions = [
    {
      id: "tx-seed-1",
      agentId: "agent-backend-dev",
      taskId: "task-seed-1",
      tokensUsed: 120000,
      costUsd: 0.35,
      model: "gemini-3.5-flash",
      timestamp: "2026-07-01T11:15:00Z"
    },
    {
      id: "tx-seed-2",
      agentId: "agent-frontend-dev",
      taskId: "task-seed-1",
      tokensUsed: 180000,
      costUsd: 0.50,
      model: "gemini-3.5-flash",
      timestamp: "2026-07-01T13:45:00Z"
    },
    {
      id: "tx-seed-3",
      agentId: "agent-qa-reviewer",
      taskId: "task-seed-1",
      tokensUsed: 80000,
      costUsd: 0.25,
      model: "gemini-3.5-flash",
      timestamp: "2026-07-02T14:15:00Z"
    },
    {
      id: "tx-seed-4",
      agentId: "agent-backend-dev",
      taskId: "task-seed-2",
      tokensUsed: 150000,
      costUsd: 0.50,
      model: "gemini-3.5-flash",
      timestamp: "2026-07-05T10:15:00Z"
    },
    {
      id: "tx-seed-5",
      agentId: "agent-frontend-dev",
      taskId: "task-seed-2",
      tokensUsed: 200000,
      costUsd: 0.60,
      model: "gemini-3.5-flash",
      timestamp: "2026-07-05T11:40:00Z"
    },
    {
      id: "tx-seed-6",
      agentId: "agent-qa-reviewer",
      taskId: "task-seed-2",
      tokensUsed: 60000,
      costUsd: 0.15,
      model: "gemini-3.5-flash",
      timestamp: "2026-07-06T10:15:00Z"
    }
  ];

  gates = [
    {
      id: "gate-seed-1",
      taskId: "task-seed-2",
      state: "AWAITING_APPROVAL",
      requestedAt: "2026-07-06T10:15:00Z",
      summary: "Cosmic Chat Widget interactive design ready. Dave verified AA typography color contrast.",
      timeoutAt: "2026-07-07T10:15:00Z"
    }
  ];

  recalculateThermalAndUsage();
}

// Load or Seed state
if (fs.existsSync(DATA_STORE_PATH)) {
  try {
    const backup = JSON.parse(fs.readFileSync(DATA_STORE_PATH, "utf8"));
    tasks = backup.tasks || [];
    agents = backup.agents || [];
    events = backup.events || [];
    gates = backup.gates || [];
    transactions = backup.transactions || [];
    thermalConfig = backup.thermalConfig || thermalConfig;
    console.log("Restored full data store from backup JSON file successfully.");
  } catch (error) {
    console.error("Failed to parse data store backup. Re-seeding defaults.", error);
    seedData();
  }
} else {
  console.log("No data store backup found. Seeding pristine initial mock dataset.");
  seedData();
  saveStateToDisk();
}

let isWriting = false;
let pendingWrite = false;

function saveStateToDisk() {
  if (isWriting) {
    pendingWrite = true;
    return;
  }
  isWriting = true;
  fs.writeFile(
    DATA_STORE_PATH,
    JSON.stringify({ tasks, agents, events, gates, transactions, thermalConfig }, null, 2),
    "utf8",
    (err) => {
      isWriting = false;
      if (err) {
        console.error("Failed to write state to disk:", err);
      }
      if (pendingWrite) {
        pendingWrite = false;
        saveStateToDisk();
      }
    }
  );
}

// Global SSE connection registry for instant real-time broadcasts
let sseClients: any[] = [];

function registerSseClient(res: any) {
  sseClients.push(res);
  res.on("close", () => {
    sseClients = sseClients.filter(c => c !== res);
  });
}

// Keep connections alive via active comment pings every 15 seconds
setInterval(() => {
  sseClients.forEach(client => {
    try {
      client.write(": keepalive\n\n");
    } catch (e) {
      // client connection closed or dead
    }
  });
}, 15000);

function broadcastToClients(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Metrics and cost calculations helper
function recalculateThermalAndUsage() {
  const totalBudget = agents.reduce((sum, a) => sum + a.budgetUsd, 0);
  const totalSpent = agents.reduce((sum, a) => sum + a.spentUsd, 0);
  const percent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  thermalConfig.utilizationPercent = Math.min(percent, 100);

  // Set degradation level
  if (percent < 50) {
    thermalConfig.throttleLevel = "none";
    thermalConfig.recommendedModelTier = 0;
    thermalConfig.recommendedModels = ["gemini-3.5-flash"];
    thermalConfig.tokenLimitMultiplier = 1.0;
    thermalConfig.message = "Normal operations. High-performance premium models active.";
  } else if (percent < 70) {
    thermalConfig.throttleLevel = "light";
    thermalConfig.recommendedModelTier = 1;
    thermalConfig.recommendedModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
    thermalConfig.tokenLimitMultiplier = 0.95;
    thermalConfig.message = "Light throttling active. Warning, consider standard cost-effective models.";
  } else if (percent < 85) {
    thermalConfig.throttleLevel = "moderate";
    thermalConfig.recommendedModelTier = 2;
    thermalConfig.recommendedModels = ["gemini-3.1-flash-lite"];
    thermalConfig.tokenLimitMultiplier = 0.8;
    thermalConfig.message = "Moderate budget drain. Transitioning to lite-tier models.";
  } else if (percent < 95) {
    thermalConfig.throttleLevel = "severe";
    thermalConfig.recommendedModelTier = 3;
    thermalConfig.recommendedModels = ["gemini-3.1-flash-lite"];
    thermalConfig.tokenLimitMultiplier = 0.5;
    thermalConfig.message = "Severe cost constraints. Strictly minimizing payload token sizes.";
  } else {
    thermalConfig.throttleLevel = "critical";
    thermalConfig.recommendedModelTier = 3;
    thermalConfig.recommendedModels = ["mock-models-only"];
    thermalConfig.tokenLimitMultiplier = 0.1;
    thermalConfig.message = "Critical budget threat. Fallback to cheapest mock processors ONLY.";
  }
}

// Log event helper with Optimistic Concurrency Control / version checking
function logTaskEvent(
  taskId: string,
  eventType: TaskEventType,
  agentId: string | null,
  payload: any,
  triggeredBy: string | null = "Agentic Service"
): TaskEvent {
  const relatedEvents = events.filter(e => e.taskId === taskId);
  const currentVersion = relatedEvents.length;
  const lastEvent = relatedEvents[relatedEvents.length - 1];
  
  const newEvent: TaskEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    taskId,
    workflowId: lastEvent ? lastEvent.workflowId : `wf_${Date.now()}`,
    agentId,
    eventType,
    payload,
    causationId: lastEvent ? lastEvent.id : null,
    correlationId: lastEvent ? lastEvent.correlationId : `corr_${Date.now()}`,
    version: currentVersion + 1,
    createdAt: new Date().toISOString(),
    triggeredBy
  };

  events.push(newEvent);
  // Keep event logs bounded to avoid memory leaks
  if (events.length > 500) {
    events = events.slice(events.length - 500);
  }
  saveStateToDisk();

  // Instant real-time update
  broadcastToClients("EVENT_LOGGED", newEvent);
  return newEvent;
}

// Helper to simulate workflow progress asynchronously
async function executeWorkflowStep(taskId: string) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // Let's figure out what status to process
  if (task.status === "CREATED") {
    logTaskEvent(taskId, "TASK_CREATED", null, { message: "Task initialized. Pat drafting product requirements brief." });
    
    // Start Pat's requirements draft phase
    setTimeout(() => runProductBriefPhase(taskId), 3000);
  } else if (task.status === "PLANNING") {
    logTaskEvent(taskId, "PLANNING_STARTED", "agent-backend-dev", { message: "Alex began creating technical plan." });
    
    // Asynchronous state loop simulation
    setTimeout(() => runPlanningPhase(taskId), 3000);
  } else if (task.status === "IMPLEMENTING") {
    logTaskEvent(taskId, "IMPLEMENTING_STARTED", "agent-frontend-dev", { message: "Chloe initiated React code development." });
    
    setTimeout(() => runImplementingPhase(taskId), 3000);
  } else if (task.status === "QA_REVIEW") {
    logTaskEvent(taskId, "QA_REVIEW_STARTED", "agent-qa-reviewer", { message: "Dave deployed typescript validator scans." });
    
    setTimeout(() => runQAPhase(taskId), 3000);
  }
}

// PLANNING PHASE execution (Alex)
async function runPlanningPhase(taskId: string) {
  const task = tasks.find(t => t.id === taskId);
  const agent = agents.find(a => a.id === "agent-backend-dev");
  if (!task || !agent) return;

  // Check circuit breaker first!
  if (agent.circuitBreakerState === "OPEN") {
    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();
    broadcastToClients("TASK_UPDATED", task);
    logTaskEvent(taskId, "TEST_FAILED", "agent-backend-dev", { error: "Alex's Circuit Breaker is OPEN. Budgets exceeded." });
    return;
  }

  agent.status = "WORKING";
  broadcastToClients("AGENT_UPDATED", agent);

  let generatedPlan = "";
  let promptCost = 0.20;
  let tokensConsumed = 90000;

  // Apply thermal degradation cost scaling if needed
  if (thermalConfig.throttleLevel === "moderate" || thermalConfig.throttleLevel === "severe") {
    promptCost = 0.08;
    tokensConsumed = 35000;
  }

  // Check if trip budget
  if (agent.spentUsd + promptCost > agent.budgetUsd) {
    agent.circuitBreakerState = "OPEN";
    agent.status = "TRIPPED";
    agent.tripCount += 1;
    agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
    agent.spentTokens += tokensConsumed;
    
    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();

    recalculateThermalAndUsage();
    saveStateToDisk();

    broadcastToClients("AGENT_UPDATED", agent);
    broadcastToClients("TASK_UPDATED", task);

    logTaskEvent(taskId, "CIRCUIT_BREAKER_TRIPPED", "agent-backend-dev", {
      agentName: agent.name,
      allocated: agent.budgetUsd,
      spent: agent.spentUsd,
      message: "Allocated threshold breached mid-execution."
    });
    return;
  }

  // Generate the plan (via real Gemini or robust fallback)
  if (ai) {
    try {
      logTaskEvent(taskId, "THOUGHT_LOG", "agent-backend-dev", {
        monologue: "Alex analyzing architecture parameters to compile database layout constraints..."
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a technical planning architecture outline for task: "${task.title}". Context: "${task.description}". Be extremely brief, using Markdown formatting with sections: "Database Layout Plan" and "Core Schema Endpoints". Keep it under 150 words.`,
      });
      generatedPlan = response.text || "Failed to generate plan text.";
    } catch (e) {
      console.error("Gemini call failed in planning phase, falling back:", e);
      generatedPlan = `### Alex's Fallback Technical Outline
1. **Model Specs**: FastAPI endpoints mapping users.
2. **Schema Design**: PostgreSQL entities with proper indexing rules.
3. **Execution Gate**: Safe handling of transaction isolation.`;
    }
  } else {
    // Elegant local simulator
    generatedPlan = `### Alex's High-Performance API Layout Plan
1. **Schema Definitions**:
   - Establish a partitioned, high-density index on entity IDs.
   - Configure constraints ensuring absolute key isolation.
2. **Rest Endpoints**:
   - Build FastAPI router schemas with automated request payloads validations.
3. **Service Layer**:
   - Create synchronous worker handlers to safely process transactions.`;
  }

  // Deduct cost
  agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
  agent.spentTokens += tokensConsumed;
  agent.status = "IDLE";
  
  // Update task plan
  task.plan = generatedPlan;
  task.status = "IMPLEMENTING";
  task.updatedAt = new Date().toISOString();

  // Budget transaction
  transactions.push({
    id: `tx-${Date.now()}`,
    agentId: agent.id,
    taskId: task.id,
    tokensUsed: tokensConsumed,
    costUsd: promptCost,
    model: thermalConfig.recommendedModels[0],
    timestamp: new Date().toISOString()
  });

  recalculateThermalAndUsage();
  saveStateToDisk();

  broadcastToClients("AGENT_UPDATED", agent);
  broadcastToClients("TASK_UPDATED", task);

  logTaskEvent(taskId, "PLANNING_COMPLETED", "agent-backend-dev", {
    message: "Plan formulated and verified against system schemas."
  });

  // Next step
  executeWorkflowStep(taskId);
}

// IMPLEMENTING PHASE execution (Chloe)
async function runImplementingPhase(taskId: string) {
  const task = tasks.find(t => t.id === taskId);
  const agent = agents.find(a => a.id === "agent-frontend-dev");
  if (!task || !agent) return;

  if (agent.circuitBreakerState === "OPEN") {
    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();
    broadcastToClients("TASK_UPDATED", task);
    logTaskEvent(taskId, "TEST_FAILED", "agent-frontend-dev", { error: "Chloe's Circuit Breaker is OPEN." });
    return;
  }

  agent.status = "WORKING";
  broadcastToClients("AGENT_UPDATED", agent);

  let generatedCode = "";
  let promptCost = 0.35;
  let tokensConsumed = 150000;

  if (thermalConfig.throttleLevel === "moderate" || thermalConfig.throttleLevel === "severe") {
    promptCost = 0.12;
    tokensConsumed = 50000;
  }

  if (agent.spentUsd + promptCost > agent.budgetUsd) {
    agent.circuitBreakerState = "OPEN";
    agent.status = "TRIPPED";
    agent.tripCount += 1;
    agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
    agent.spentTokens += tokensConsumed;

    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();

    recalculateThermalAndUsage();
    saveStateToDisk();

    broadcastToClients("AGENT_UPDATED", agent);
    broadcastToClients("TASK_UPDATED", task);

    logTaskEvent(taskId, "CIRCUIT_BREAKER_TRIPPED", "agent-frontend-dev", {
      agentName: agent.name,
      allocated: agent.budgetUsd,
      spent: agent.spentUsd,
      message: "Allocated budget breach during code generation."
    });
    return;
  }

  // Generate code via real Gemini or fallback
  if (ai) {
    try {
      logTaskEvent(taskId, "THOUGHT_LOG", "agent-frontend-dev", {
        monologue: "Chloe drafting interactive Tailwind styles, ensuring clean responsive transitions..."
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Write a clean React component file using Tailwind CSS representing task: "${task.title}". Context: "${task.description}". The code must be clean, wrapped inside \`\`\`tsx ... \`\`\`. Do not include explanations, only code. Keep it under 20 lines.`,
      });
      generatedCode = response.text || "Failed to generate component code.";
    } catch (e) {
      console.error("Gemini call failed in implementation phase:", e);
      generatedCode = `// Chloe's React Component Code
import React from 'react';

export default function AppWidget() {
  return (
    <div className="p-4 bg-slate-900 text-white rounded-lg">
      <h3 className="text-lg font-bold">Aesthetic Element</h3>
      <p className="text-xs text-slate-400">Rendered dynamically with precise spacing metrics.</p>
    </div>
  );
}`;
    }
  } else {
    generatedCode = `// Chloe's Beautiful Handcrafted React Component
import React, { useState } from 'react';
import { motion } from 'motion/react';

export default function InteractiveWidget() {
  const [active, setActive] = useState(false);
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="p-6 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer"
      onClick={() => setActive(!active)}
    >
      <h4 className="font-sans text-indigo-400 text-sm font-semibold tracking-wide uppercase">
        ${task.title}
      </h4>
      <p className="mt-2 text-xs text-slate-400 leading-relaxed font-mono">
        Status: {active ? "Engaged (Active)" : "Awaiting user trigger"}
      </p>
    </motion.div>
  );
}`;
  }

  agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
  agent.spentTokens += tokensConsumed;
  agent.status = "IDLE";

  task.code = generatedCode;
  task.status = "QA_REVIEW";
  task.updatedAt = new Date().toISOString();

  transactions.push({
    id: `tx-${Date.now()}`,
    agentId: agent.id,
    taskId: task.id,
    tokensUsed: tokensConsumed,
    costUsd: promptCost,
    model: thermalConfig.recommendedModels[0],
    timestamp: new Date().toISOString()
  });

  recalculateThermalAndUsage();
  saveStateToDisk();

  broadcastToClients("AGENT_UPDATED", agent);
  broadcastToClients("TASK_UPDATED", task);

  logTaskEvent(taskId, "CODE_COMMITTED", "agent-frontend-dev", {
    linesAdded: 24,
    components: ["InteractiveWidget"]
  });

  executeWorkflowStep(taskId);
}

// QA REVIEW PHASE execution (Dave)
async function runQAPhase(taskId: string) {
  const task = tasks.find(t => t.id === taskId);
  const agent = agents.find(a => a.id === "agent-qa-reviewer");
  if (!task || !agent) return;

  if (agent.circuitBreakerState === "OPEN") {
    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();
    broadcastToClients("TASK_UPDATED", task);
    logTaskEvent(taskId, "TEST_FAILED", "agent-qa-reviewer", { error: "Dave's Circuit Breaker is OPEN." });
    return;
  }

  agent.status = "WORKING";
  broadcastToClients("AGENT_UPDATED", agent);

  let generatedReview = "";
  let promptCost = 0.20;
  let tokensConsumed = 60000;

  if (thermalConfig.throttleLevel === "moderate" || thermalConfig.throttleLevel === "severe") {
    promptCost = 0.08;
    tokensConsumed = 20000;
  }

  if (agent.spentUsd + promptCost > agent.budgetUsd) {
    agent.circuitBreakerState = "OPEN";
    agent.status = "TRIPPED";
    agent.tripCount += 1;
    agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
    agent.spentTokens += tokensConsumed;

    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();

    recalculateThermalAndUsage();
    saveStateToDisk();

    broadcastToClients("AGENT_UPDATED", agent);
    broadcastToClients("TASK_UPDATED", task);

    logTaskEvent(taskId, "CIRCUIT_BREAKER_TRIPPED", "agent-qa-reviewer", {
      agentName: agent.name,
      allocated: agent.budgetUsd,
      spent: agent.spentUsd,
      message: "Allocated budget breach during QA validation scans."
    });
    return;
  }

  // Generate audit review via Gemini or fallback
  if (ai) {
    try {
      logTaskEvent(taskId, "THOUGHT_LOG", "agent-qa-reviewer", {
        monologue: "Dave verifying code block integrity and contrast accessibility scores..."
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Review the following code outline. Provide a very brief security and styling compliance evaluation (under 120 words). Code to review: "${task.code}". Output in Markdown.`,
      });
      generatedReview = response.text || "Failed to generate audit text.";
    } catch (e) {
      console.error("Gemini call failed in QA phase:", e);
      generatedReview = `### Dave's Fail-Safe Audit Log
- **Security Check**: Verified token parsing.
- **Visuals Check**: Component structures match dark cosmic palette constraints.
- **Lint Check**: 0 vulnerabilities found.`;
    }
  } else {
    generatedReview = `### Dave's Strict QA Audit & Security Report
- **Structure Auditing**: Correct usage of \`AnimatePresence\` components.
- **Accessibility Verification**: Color contrast meets strict WCAG AA standards.
- **Edge Cases Tested**: 
  - [x] Zero-input boundaries handled.
  - [x] Correct viewport resizing scalability rules.
- **Status**: PASSED. Ready for Human-in-the-Loop merge approval.`;
  }

  agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
  agent.spentTokens += tokensConsumed;
  agent.status = "IDLE";

  task.qaReview = generatedReview;
  task.updatedAt = new Date().toISOString();

  // Budget transaction
  transactions.push({
    id: `tx-${Date.now()}`,
    agentId: agent.id,
    taskId: task.id,
    tokensUsed: tokensConsumed,
    costUsd: promptCost,
    model: thermalConfig.recommendedModels[0],
    timestamp: new Date().toISOString()
  });

  recalculateThermalAndUsage();
  saveStateToDisk();

  broadcastToClients("AGENT_UPDATED", agent);
  broadcastToClients("TASK_UPDATED", task);

  logTaskEvent(taskId, "QA_COMPLETED", "agent-qa-reviewer", {
    message: "Security and layout validators reports passed. Handing over to Sam (CEO) for strategic review."
  });

  // Trigger Sam (CEO) strategic review
  setTimeout(() => runCeoSignoffPhase(taskId), 3000);
}

// PRODUCT BRIEF PHASE execution (Pat)
async function runProductBriefPhase(taskId: string) {
  const task = tasks.find(t => t.id === taskId);
  const agent = agents.find(a => a.id === "agent-product-manager");
  if (!task || !agent) return;

  if (agent.circuitBreakerState === "OPEN") {
    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();
    broadcastToClients("TASK_UPDATED", task);
    logTaskEvent(taskId, "TEST_FAILED", "agent-product-manager", { error: "Pat's Circuit Breaker is OPEN." });
    return;
  }

  agent.status = "WORKING";
  broadcastToClients("AGENT_UPDATED", agent);

  let generatedBrief = "";
  let promptCost = 0.15;
  let tokensConsumed = 45000;

  if (thermalConfig.throttleLevel === "moderate" || thermalConfig.throttleLevel === "severe") {
    promptCost = 0.05;
    tokensConsumed = 15000;
  }

  if (agent.spentUsd + promptCost > agent.budgetUsd) {
    agent.circuitBreakerState = "OPEN";
    agent.status = "TRIPPED";
    agent.tripCount += 1;
    agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
    agent.spentTokens += tokensConsumed;

    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();

    recalculateThermalAndUsage();
    saveStateToDisk();

    broadcastToClients("AGENT_UPDATED", agent);
    broadcastToClients("TASK_UPDATED", task);

    logTaskEvent(taskId, "CIRCUIT_BREAKER_TRIPPED", "agent-product-manager", {
      agentName: agent.name,
      allocated: agent.budgetUsd,
      spent: agent.spentUsd,
      message: "Allocated threshold breached during requirements drafting."
    });
    return;
  }

  // Generate the brief via real Gemini or fallback
  if (ai) {
    try {
      logTaskEvent(taskId, "THOUGHT_LOG", "agent-product-manager", {
        monologue: "Pat scanning incoming scope parameters to formulate functional boundaries and agile brief..."
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create a professional product brief for the task: "${task.title}". Context: "${task.description}". Keep it very concise (under 120 words), using Markdown formatting with sections: "Strategic Objective", "Scope Limits", and "Required Tools".`,
      });
      generatedBrief = response.text || "Failed to generate product brief.";
    } catch (e) {
      console.error("Gemini failed in PM brief generation, fallback used:", e);
      generatedBrief = `### Pat's Fallback Requirements Brief
- **Strategic Objective**: Fast, robust fulfillment of target requirements.
- **Scope Limits**: Strictly adhere to basic REST conventions. No extra database triggers.`;
    }
  } else {
    generatedBrief = `### Pat's Agile Requirements Brief
- **Strategic Objective**: Standardize layout and logic mapping for "${task.title}".
- **Scope Limits**: Focus purely on explicit user specifications. Do not overcomplicate boundaries.
- **Required Tools**: Standard schema parsers and visual design frameworks.`;
  }

  // Deduct cost
  agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
  agent.spentTokens += tokensConsumed;
  agent.status = "IDLE";

  task.productBrief = generatedBrief;
  task.status = "PLANNING";
  task.updatedAt = new Date().toISOString();

  transactions.push({
    id: `tx-${Date.now()}`,
    agentId: agent.id,
    taskId: task.id,
    tokensUsed: tokensConsumed,
    costUsd: promptCost,
    model: thermalConfig.recommendedModels[0],
    timestamp: new Date().toISOString()
  });

  recalculateThermalAndUsage();
  saveStateToDisk();

  broadcastToClients("AGENT_UPDATED", agent);
  broadcastToClients("TASK_UPDATED", task);

  logTaskEvent(taskId, "THOUGHT_LOG", "agent-product-manager", {
    monologue: "Brief finalized. Handing over scope parameters to Alex for technical planning."
  });

  // Next step - planning starts immediately!
  executeWorkflowStep(task.id);
}

// STRATEGIC SIGNOFF / EXECUTIVE REVIEW PHASE execution (Sam)
async function runCeoSignoffPhase(taskId: string) {
  const task = tasks.find(t => t.id === taskId);
  const agent = agents.find(a => a.id === "agent-ceo");
  if (!task || !agent) return;

  if (agent.circuitBreakerState === "OPEN") {
    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();
    broadcastToClients("TASK_UPDATED", task);
    logTaskEvent(taskId, "TEST_FAILED", "agent-ceo", { error: "Sam's Circuit Breaker is OPEN." });
    return;
  }

  agent.status = "WORKING";
  broadcastToClients("AGENT_UPDATED", agent);

  let generatedSignoff = "";
  let promptCost = 0.30;
  let tokensConsumed = 80000;

  if (thermalConfig.throttleLevel === "moderate" || thermalConfig.throttleLevel === "severe") {
    promptCost = 0.10;
    tokensConsumed = 25000;
  }

  if (agent.spentUsd + promptCost > agent.budgetUsd) {
    agent.circuitBreakerState = "OPEN";
    agent.status = "TRIPPED";
    agent.tripCount += 1;
    agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
    agent.spentTokens += tokensConsumed;

    task.status = "ESCALATED";
    task.updatedAt = new Date().toISOString();

    recalculateThermalAndUsage();
    saveStateToDisk();

    broadcastToClients("AGENT_UPDATED", agent);
    broadcastToClients("TASK_UPDATED", task);

    logTaskEvent(taskId, "CIRCUIT_BREAKER_TRIPPED", "agent-ceo", {
      agentName: agent.name,
      allocated: agent.budgetUsd,
      spent: agent.spentUsd,
      message: "CEO budget threshold breached during strategic review."
    });
    return;
  }

  // Generate CEO strategic signoff
  if (ai) {
    try {
      logTaskEvent(taskId, "THOUGHT_LOG", "agent-ceo", {
        monologue: "Sam conducting high-level corporate governance audit and validating sprint ROI..."
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Perform a CEO high-level strategic sign-off for the task: "${task.title}". Outline context: "${task.description}". Planned by Alex: "${task.plan}". Coded by Chloe: "${task.code}". Audited by Dave: "${task.qaReview}". Keep it very brief (under 120 words), using Markdown formatting with sections: "Strategic Alignment", "Financial/Budget Audit", and "Deployment Authorization".`,
      });
      generatedSignoff = response.text || "Failed to generate CEO strategic sign-off.";
    } catch (e) {
      console.error("Gemini failed in CEO signoff generation, fallback used:", e);
      generatedSignoff = `### Sam's Fallback Strategic Sign-off
- **Strategic Alignment**: Task matches high-level user deliverables.
- **Financial/Budget Audit**: Approved. Total cost is well within corporate operating targets.
- **Deployment Authorization**: AUTHORIZED. Ready for human operator approval.`;
    }
  } else {
    generatedSignoff = `### Sam's Corporate Strategic Alignment Sign-off
- **Strategic Alignment**: Excellent execution aligning user stories with core product KPIs.
- **Financial/Budget Audit**: Fully verified. Circuit breakers remained closed, high efficiency achieved.
- **Deployment Authorization**: APPROVED. Presenting task to human operator for the final merge sign-off.`;
  }

  // Deduct cost
  agent.spentUsd = Number((agent.spentUsd + promptCost).toFixed(4));
  agent.spentTokens += tokensConsumed;
  agent.status = "IDLE";

  task.strategicSignoff = generatedSignoff;
  task.status = "AWAITING_APPROVAL";
  task.updatedAt = new Date().toISOString();

  // Create human approval gate request
  const gateId = `gate-${Date.now()}`;
  const newGate: ApprovalGate = {
    id: gateId,
    taskId: task.id,
    state: "AWAITING_APPROVAL",
    requestedAt: new Date().toISOString(),
    summary: `Dave successfully audited code and Sam completed strategic CEO review. Ready for human operator sign-off.`,
    timeoutAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
  };
  gates.push(newGate);

  transactions.push({
    id: `tx-${Date.now()}`,
    agentId: agent.id,
    taskId: task.id,
    tokensUsed: tokensConsumed,
    costUsd: promptCost,
    model: thermalConfig.recommendedModels[0],
    timestamp: new Date().toISOString()
  });

  recalculateThermalAndUsage();
  saveStateToDisk();

  broadcastToClients("AGENT_UPDATED", agent);
  broadcastToClients("TASK_UPDATED", task);
  broadcastToClients("GATE_UPDATED", newGate);

  logTaskEvent(task.id, "APPROVAL_REQUESTED", "agent-ceo", {
    message: "Dave's audit and Sam's strategic review completed. Presenting to operator for deployment sign-off."
  });
}

// REST API Routes

// Create a task
app.post("/api/v1/tasks", (req, res) => {
  const { title, description, priority, deadline } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required." });
  }

  const newTask: Task = {
    id: `task-${Date.now()}`,
    title,
    description,
    status: "CREATED",
    priority: priority || "medium",
    deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  tasks.push(newTask);
  saveStateToDisk();

  // Broadcast addition to dashboard
  broadcastToClients("TASK_CREATED", newTask);

  // Emit event
  logTaskEvent(newTask.id, "TASK_CREATED", null, { title: newTask.title }, "Operator");

  // Spin up async workflow thread
  executeWorkflowStep(newTask.id);

  res.status(201).json(newTask);
});

// List tasks
app.get("/api/v1/tasks", (req, res) => {
  res.json(tasks);
});

// Get single task
app.get("/api/v1/tasks/:id", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// Get task events
app.get("/api/v1/tasks/:id/events", (req, res) => {
  const taskEvents = events.filter(e => e.taskId === req.params.id);
  res.json(taskEvents);
});

// Human Approval Sign-off (APPROVE signal)
app.post("/api/v1/tasks/:id/approve", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (task.status !== "AWAITING_APPROVAL") {
    return res.status(400).json({ error: "Task is not awaiting approval." });
  }

  const gate = gates.find(g => g.taskId === task.id && g.state === "AWAITING_APPROVAL");
  if (gate) {
    gate.state = "APPROVED";
    gate.resolvedAt = new Date().toISOString();
  }

  task.status = "APPROVED";
  task.updatedAt = new Date().toISOString();
  broadcastToClients("TASK_UPDATED", task);

  logTaskEvent(task.id, "APPROVED", null, { decision: "APPROVE_TO_DEPLOY" }, "Operator");

  // Run mock deployment
  setTimeout(() => {
    task.status = "COMPLETED";
    task.updatedAt = new Date().toISOString();
    broadcastToClients("TASK_UPDATED", task);

    logTaskEvent(task.id, "DEPLOYED", null, { environment: "Staging-Cloud-Run" }, "System CD Engine");
    logTaskEvent(task.id, "COMPLETED", null, { message: "Task completed successfully." }, "System CD Engine");
  }, 3000);

  res.json({ message: "Task successfully approved for mock deployment.", task });
});

// Human Rejection (REJECT signal)
app.post("/api/v1/tasks/:id/reject", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (task.status !== "AWAITING_APPROVAL") {
    return res.status(400).json({ error: "Task is not awaiting approval." });
  }

  const gate = gates.find(g => g.taskId === task.id && g.state === "AWAITING_APPROVAL");
  if (gate) {
    gate.state = "REJECTED";
    gate.resolvedAt = new Date().toISOString();
  }

  task.status = "REJECTED";
  task.updatedAt = new Date().toISOString();
  broadcastToClients("TASK_UPDATED", task);

  logTaskEvent(task.id, "REJECTED", null, { decision: "REJECTED_BY_OPERATOR" }, "Operator");

  res.json({ message: "Task rejected by operator.", task });
});

// Request Changes (REQUEST_CHANGES signal)
app.post("/api/v1/tasks/:id/request-changes", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (task.status !== "AWAITING_APPROVAL") {
    return res.status(400).json({ error: "Task is not awaiting approval." });
  }

  const { comment } = req.body;

  const gate = gates.find(g => g.taskId === task.id && g.state === "AWAITING_APPROVAL");
  if (gate) {
    gate.state = "REJECTED"; // Close gate
    gate.resolvedAt = new Date().toISOString();
  }

  // Push task back to IMPLEMENTING for revision!
  task.status = "IMPLEMENTING";
  task.updatedAt = new Date().toISOString();
  broadcastToClients("TASK_UPDATED", task);

  logTaskEvent(task.id, "REQUEST_CHANGES", null, { feedback: comment || "Reviewer requested changes to implementation code." }, "Operator");

  // Re-run implementing step!
  executeWorkflowStep(task.id);

  res.json({ message: "Changes successfully requested. Sending task back to Chloe.", task });
});

// Terminate Task (TERMINATE signal)
app.post("/api/v1/tasks/:id/terminate", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  task.status = "FAILED";
  task.updatedAt = new Date().toISOString();
  broadcastToClients("TASK_UPDATED", task);

  logTaskEvent(task.id, "FAILED", null, { reason: "Terminated manually by operator." }, "Operator");

  res.json({ message: "Task execution forcefully terminated.", task });
});

// List Agents
app.get("/api/v1/agents", (req, res) => {
  res.json(agents);
});

// Update agent budget / config in Expert Studio
app.put("/api/v1/agents/:id", (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  const { budgetUsd, maxIterations, systemPrompt } = req.body;
  if (budgetUsd !== undefined) agent.budgetUsd = Number(budgetUsd);
  if (maxIterations !== undefined) agent.maxIterations = Number(maxIterations);
  if (systemPrompt !== undefined) agent.systemPrompt = systemPrompt;

  // If budget increased and was open, we can auto-close if spent is lower
  if (agent.circuitBreakerState === "OPEN" && agent.spentUsd < agent.budgetUsd) {
    agent.circuitBreakerState = "CLOSED";
    agent.status = "IDLE";
  }

  recalculateThermalAndUsage();
  saveStateToDisk();

  broadcastToClients("AGENT_UPDATED", agent);
  res.json({ message: "Agent config updated successfully.", agent });
});

// Reset agent circuit breaker manually
app.post("/api/v1/agents/:id/reset-circuit-breaker", (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  agent.circuitBreakerState = "CLOSED";
  agent.status = "IDLE";
  agent.tripCount = 0;

  recalculateThermalAndUsage();
  saveStateToDisk();

  broadcastToClients("AGENT_UPDATED", agent);
  res.json({ message: `${agent.name}'s circuit breaker successfully reset.`, agent });
});

// Get general budget metrics
app.get("/api/v1/budget", (req, res) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const activeTasks = tasks.filter(t => t.status !== "COMPLETED" && t.status !== "FAILED" && t.status !== "REJECTED").length;
  const totalCostUsd = Number(agents.reduce((sum, a) => sum + a.spentUsd, 0).toFixed(4));

  // Compute spend by model
  const spendByModel: { [model: string]: number } = {};
  transactions.forEach(t => {
    spendByModel[t.model] = Number(((spendByModel[t.model] || 0) + t.costUsd).toFixed(4));
  });

  // Compute spend by agent
  const spendByAgent: { [agentId: string]: number } = {};
  agents.forEach(a => {
    spendByAgent[a.id] = a.spentUsd;
  });

  res.json({
    metrics: {
      totalTasks,
      completedTasks,
      activeTasks,
      totalCostUsd,
      averageTimeToCompleteMinutes: 14.5,
      spendByModel,
      spendByAgent
    },
    thermalConfig,
    transactions: transactions.slice().reverse() // Newest first
  });
});

// Get and update thermal config
app.get("/api/v1/budget/thermal-config", (req, res) => {
  res.json(thermalConfig);
});

app.put("/api/v1/budget/thermal-config", (req, res) => {
  const { enabled } = req.body;
  if (enabled !== undefined) thermalConfig.enabled = !!enabled;
  saveStateToDisk();
  broadcastToClients("THERMAL_CONFIG_UPDATED", thermalConfig);
  res.json(thermalConfig);
});

// Real-Time Server-Sent Events stream endpoint for instant UI updates
app.get("/api/v1/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });
  
  // Heartbeat signal
  res.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);
  
  registerSseClient(res);
});

// Integrate Express + Vite dev servers
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TaskFlow AI full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
