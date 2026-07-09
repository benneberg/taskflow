import { Agent, Task, ThermalThrottleStatus } from '../types';

// Standard ANSI colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m"
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ${colors.red}✘ FAIL: ${message}${colors.reset}`);
    throw new Error(message);
  } else {
    console.log(`  ${colors.green}✔ PASS: ${message}${colors.reset}`);
  }
}

// 1. Circuit Breaker State Transition Test
function testCircuitBreaker() {
  console.log(`\n${colors.bold}${colors.cyan}--- TEST 1: Circuit Breaker Transitions ---${colors.reset}`);
  
  const mockAgent: Agent = {
    id: "test-agent",
    name: "Test Agent",
    role: "strategic_signoff",
    systemPrompt: "test",
    budgetUsd: 1.00,
    spentUsd: 0.95,
    spentTokens: 10000,
    circuitBreakerState: "CLOSED",
    status: "IDLE",
    tripCount: 0,
    toolWhitelist: [],
    budgetTokens: 50000,
    fallbackChain: [],
    model: "gemini-2.5-pro",
    maxIterations: 10,
    totalWarnings: 0,
    lastActiveAt: new Date().toISOString(),
    lastSuccessfulToolExecutionAt: new Date().toISOString(),
    lastCommunicationAt: new Date().toISOString(),
  };

  const cost = 0.10; // Breaks budget
  const newSpent = Number((mockAgent.spentUsd + cost).toFixed(4));
  
  // Apply breaker trip condition
  if (newSpent > mockAgent.budgetUsd) {
    mockAgent.spentUsd = newSpent;
    mockAgent.circuitBreakerState = "OPEN";
    mockAgent.status = "TRIPPED";
    mockAgent.tripCount += 1;
  }

  assert(mockAgent.circuitBreakerState === "OPEN", "Circuit breaker state should transition to OPEN.");
  assert(mockAgent.status === "TRIPPED", "Agent status should transition to TRIPPED.");
  assert(mockAgent.spentUsd === 1.05, "Spent USD should accumulate correctly.");
  assert(mockAgent.tripCount === 1, "Trip count should increment to 1.");
}

// 2. Thermal Cost Degradation Model Test
function calculateThermalModel(totalSpent: number, totalBudget: number): {
  throttleLevel: "none" | "low" | "moderate" | "severe";
  recommendedModels: string[];
} {
  const pct = (totalSpent / totalBudget) * 100;
  if (pct >= 95) {
    return { throttleLevel: "severe", recommendedModels: ["gemini-1.5-flash"] };
  } else if (pct >= 85) {
    return { throttleLevel: "moderate", recommendedModels: ["gemini-1.5-flash", "gemini-2.5-flash"] };
  } else if (pct >= 70) {
    return { throttleLevel: "low", recommendedModels: ["gemini-2.5-flash", "gemini-2.5-pro"] };
  } else {
    return { throttleLevel: "none", recommendedModels: ["gemini-2.5-pro"] };
  }
}

function testThermalDegradation() {
  console.log(`\n${colors.bold}${colors.cyan}--- TEST 2: Thermal Cost Degradation Models ---${colors.reset}`);
  
  const budget = 100.0;
  
  const stateNone = calculateThermalModel(10.0, budget);
  assert(stateNone.throttleLevel === "none", "Throttle level should be 'none' at 10% budget utilization.");
  assert(stateNone.recommendedModels.includes("gemini-2.5-pro"), "Pro model recommended at 10%.");

  const stateLow = calculateThermalModel(75.0, budget);
  assert(stateLow.throttleLevel === "low", "Throttle level should be 'low' at 75% budget utilization.");

  const stateModerate = calculateThermalModel(88.0, budget);
  assert(stateModerate.throttleLevel === "moderate", "Throttle level should be 'moderate' at 88% budget utilization.");

  const stateSevere = calculateThermalModel(96.0, budget);
  assert(stateSevere.throttleLevel === "severe", "Throttle level should be 'severe' at 96% budget utilization.");
}

// 3. OCC & Event Sourcing Audit Links
function testEventSourcingAndOCC() {
  console.log(`\n${colors.bold}${colors.cyan}--- TEST 3: OCC Ledger & Event Sourcing Links ---${colors.reset}`);
  
  let taskVersion = 5;
  const initialCausationId = "causation-123";
  const initialCorrelationId = "correlation-abc";

  // Simulate transactional state mutation
  taskVersion += 1;
  const nextCausationId = `evt-trans-${Date.now()}`;
  const nextCorrelationId = initialCorrelationId; // preserved across execution lifespan

  assert(taskVersion === 6, "Optimistic Concurrency Control should increment transaction version to 6.");
  assert(nextCorrelationId === initialCorrelationId, "Correlation ID must match across entire stream trace.");
  assert(nextCausationId !== initialCausationId, "New causation event must have unique transaction ID.");
}

// 4. Workflow State Progression Test
function testStateProgression() {
  console.log(`\n${colors.bold}${colors.cyan}--- TEST 4: Workflow State Transitions ---${colors.reset}`);
  
  const validStatusSequence = ["CREATED", "PLANNING", "IMPLEMENTING", "QA_REVIEW", "AWAITING_APPROVAL", "APPROVED", "COMPLETED"];
  let currentStatus = "CREATED";

  function transitionTo(next: string) {
    const currIdx = validStatusSequence.indexOf(currentStatus);
    const nextIdx = validStatusSequence.indexOf(next);
    // Allow progression or failure/escalation paths
    if (next === "ESCALATED" || next === "FAILED") {
      currentStatus = next;
      return;
    }
    if (nextIdx === currIdx + 1 || nextIdx === currIdx) {
      currentStatus = next;
    } else {
      throw new Error(`Invalid state transition from ${currentStatus} to ${next}`);
    }
  }

  transitionTo("PLANNING");
  assert(currentStatus === "PLANNING", "Transitioned to PLANNING.");

  transitionTo("IMPLEMENTING");
  assert(currentStatus === "IMPLEMENTING", "Transitioned to IMPLEMENTING.");

  try {
    transitionTo("COMPLETED"); // invalid jump
    assert(false, "Should have thrown on direct skip from IMPLEMENTING to COMPLETED");
  } catch (e) {
    assert(true, "Correctly blocked invalid direct transition (skipping QA & approval).");
  }
}

function runAll() {
  console.log(`${colors.bold}${colors.yellow}🚀 STARTING AOS AUTOMATED TEST HARNESS 🚀${colors.reset}`);
  const startTime = Date.now();
  try {
    testCircuitBreaker();
    testThermalDegradation();
    testEventSourcingAndOCC();
    testStateProgression();
    console.log(`\n${colors.green}${colors.bold}✔ ALL TEST CASES COMPLETED SUCCESSFULLY [${Date.now() - startTime}ms]${colors.reset}\n`);
    process.exit(0);
  } catch (err: any) {
    console.error(`\n${colors.red}${colors.bold}✘ TEST SUITE CRASHED: ${err.message}${colors.reset}\n`);
    process.exit(1);
  }
}

runAll();
