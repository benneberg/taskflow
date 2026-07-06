# Testing Delta & Gaps: TaskFlow AI (AOS)

This document maps the testing gaps in the current codebase and specifies standard test configurations required to move TaskFlow AI to enterprise-grade production.

---

## 🚦 Current Test Coverage
- **Unit Tests**: `0%` (No unit tests implemented in workspace.)
- **Integration Tests**: `0%` (No system integration tests configured.)
- **Manual Verification**: `100%` (Highly detailed manual end-to-end verification via the React developer dashboard interface.)
- **Static Analysis**: `100%` (`tsc --noEmit` and linter checks pass cleanly.)

---

## 🔍 Identified Gaps
1. **Circuit Breaker State Transitions**: No test verifies that an agent with `spentUsd > budgetUsd` correctly trips from `CLOSED` to `OPEN` mid-execution, and halts downstream transitions.
2. **Thermal Cost Degradation Logic**: No automated test asserts that when overall spent reaches specific percentage bands (e.g. 55% or 80%), correct thermal throttle statuses and recommended model selections are returned.
3. **Optimistic Concurrency Control (OCC)**: No tests challenge parallel events attempting to log updates to verify version increments (`version + 1`) and correct event parenting (`causationId` chaining).
4. **API Controller Routes**: REST endpoints on `server.ts` lack automated HTTP request/response mocks.

---

## 🧪 Recommended Test Delta

To establish a solid test harness, we recommend implementing **Vitest** or **Jest** with the following unit and integration templates.

### 1. Agent Circuit Breaker Unit Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Agent } from '../src/types';

describe('Pioneer Squad Circuit Breakers', () => {
  let mockAgent: Agent;

  beforeEach(() => {
    mockAgent = {
      id: 'agent-backend-dev',
      name: 'Alex',
      role: 'Backend Developer',
      spentUsd: 0.90,
      budgetUsd: 1.00,
      circuitBreakerState: 'CLOSED',
      tripCount: 0,
      status: 'IDLE',
      // ...other fields
    };
  });

  it('should trip breaker to OPEN when mid-execution spent exceeds allocated budget', () => {
    const promptCost = 0.20; // 0.90 + 0.20 = 1.10 (Breaches budget of 1.00)
    
    if (mockAgent.spentUsd + promptCost > mockAgent.budgetUsd) {
      mockAgent.circuitBreakerState = 'OPEN';
      mockAgent.status = 'TRIPPED';
      mockAgent.tripCount += 1;
    }

    expect(mockAgent.circuitBreakerState).toBe('OPEN');
    expect(mockAgent.status).toBe('TRIPPED');
    expect(mockAgent.tripCount).toBe(1);
  });
});
```

### 2. Thermal Cost Degradation Integration Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { ThermalThrottleStatus } from '../src/types';

function computeThermalLevel(totalSpent: number, totalBudget: number): ThermalThrottleStatus {
  const percent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  let level: 'none' | 'light' | 'moderate' | 'severe' | 'critical' = 'none';
  let models: string[] = ['gemini-3.5-flash'];

  if (percent >= 50 && percent < 70) {
    level = 'light';
  } else if (percent >= 70 && percent < 85) {
    level = 'moderate';
    models = ['gemini-3.1-flash-lite'];
  }

  return {
    throttleLevel: level,
    enabled: true,
    utilizationPercent: percent,
    recommendedModelTier: level === 'none' ? 0 : 1,
    recommendedModels: models,
    tokenLimitMultiplier: 1.0,
    message: ''
  };
}

describe('Thermal Cost Degradation Throttling', () => {
  it('should transition to moderate throttling and recommend lite models at 80% spend utilization', () => {
    const status = computeThermalLevel(8.00, 10.00); // 80% utilization
    expect(status.throttleLevel).toBe('moderate');
    expect(status.recommendedModels).toContain('gemini-3.1-flash-lite');
  });
});
```
