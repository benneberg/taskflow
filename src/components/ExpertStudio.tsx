import React, { useState } from 'react';
import { Agent } from '../types';
import { ShieldCheck, ShieldAlert, Settings, Save, RotateCcw, Cpu, Sparkles, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ExpertStudioProps {
  agents: Agent[];
  onUpdateAgent: (agentId: string, updates: Partial<Agent>) => Promise<void>;
  onResetCircuitBreaker: (agentId: string) => Promise<void>;
}

export default function ExpertStudio({ agents, onUpdateAgent, onResetCircuitBreaker }: ExpertStudioProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [budgetUsd, setBudgetUsd] = useState<string>('');
  const [maxIterations, setMaxIterations] = useState<number>(10);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Generate 30-day performance data based on live agent metrics to keep charts dynamic
  const performanceData = agents.map(agent => {
    let baseSuccessRate = 95;
    let baseTokens = agent.spentTokens + 1200000; // Historical base + current active spentTokens

    if (agent.id === 'agent-backend-dev') {
      baseSuccessRate = agent.tripCount > 0 ? Math.max(75, 96 - agent.tripCount * 5) : 96;
    } else if (agent.id === 'agent-frontend-dev') {
      baseSuccessRate = agent.tripCount > 0 ? Math.max(70, 92 - agent.tripCount * 7) : 92;
      baseTokens = agent.spentTokens + 1850000;
    } else if (agent.id === 'agent-qa-reviewer') {
      baseSuccessRate = agent.tripCount > 0 ? Math.max(80, 98 - agent.tripCount * 3) : 98;
      baseTokens = agent.spentTokens + 950000;
    }

    return {
      name: agent.name,
      role: agent.role.replace(' Agent', ''),
      successRate: baseSuccessRate,
      tokens: baseTokens,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-lg font-mono text-xs text-slate-200 space-y-1.5">
          <p className="font-sans font-bold text-white text-xs">{label}</p>
          <p className="text-emerald-400">Success Rate: <span className="font-bold">{payload[0].value}%</span></p>
          <p className="text-indigo-400">Tokens Consumed: <span className="font-bold">{payload[1].value.toLocaleString()}</span></p>
        </div>
      );
    }
    return null;
  };

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setBudgetUsd(agent.budgetUsd.toFixed(2));
    setMaxIterations(agent.maxIterations);
    setSystemPrompt(agent.systemPrompt);
  };

  const handleSave = async () => {
    if (!selectedAgent) return;
    setSaving(true);
    try {
      await onUpdateAgent(selectedAgent.id, {
        budgetUsd: parseFloat(budgetUsd),
        maxIterations,
        systemPrompt
      });
      // Refresh local selected
      setSelectedAgent({
        ...selectedAgent,
        budgetUsd: parseFloat(budgetUsd),
        maxIterations,
        systemPrompt
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List of Agents */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="font-sans font-bold text-base text-slate-900 tracking-tight">
          Pioneer Squad Registry
        </h2>
        <div className="space-y-3">
          {agents.map((agent) => {
            const isTripped = agent.circuitBreakerState === 'OPEN';
            const progress = (agent.spentUsd / agent.budgetUsd) * 100;

            return (
              <div
                key={agent.id}
                onClick={() => selectAgent(agent)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedAgent?.id === agent.id
                    ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/10'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isTripped ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Cpu size={20} />
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-sm text-slate-800">{agent.name}</h3>
                      <p className="font-sans text-[11px] text-slate-400">{agent.role}</p>
                    </div>
                  </div>
                  {/* CB status */}
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide font-mono ${
                    isTripped
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {isTripped ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
                    {agent.circuitBreakerState}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">USD Burned</span>
                    <span className="text-slate-700 font-bold">
                      ${agent.spentUsd.toFixed(2)} / ${agent.budgetUsd.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isTripped ? 'bg-rose-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Micro metrics */}
                <div className="mt-3.5 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-2">
                  <span>Trips: {agent.tripCount}</span>
                  <span>Tokens: {agent.spentTokens.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="lg:col-span-2">
        {selectedAgent ? (
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Settings className="text-indigo-600 w-5 h-5" />
                <div>
                  <h2 className="font-sans font-bold text-slate-900 text-sm">
                    Configure {selectedAgent.name}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">
                    SYSTEM INSTANCE: {selectedAgent.id}
                  </p>
                </div>
              </div>

              {selectedAgent.circuitBreakerState === 'OPEN' && (
                <button
                  onClick={() => onResetCircuitBreaker(selectedAgent.id).then(() => selectAgent({
                    ...selectedAgent,
                    circuitBreakerState: 'CLOSED',
                    status: 'IDLE'
                  }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] font-bold uppercase rounded-lg shadow-md shadow-rose-600/10 transition-all"
                >
                  <RotateCcw size={12} />
                  Reset CB Breaker
                </button>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1 space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold">USD Allocated Budget ($)</label>
                <input
                  type="number"
                  step="0.10"
                  min="0.50"
                  value={budgetUsd}
                  onChange={(e) => setBudgetUsd(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>

              <div className="col-span-1 space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold">Max Loop Iterations</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            {/* Fallback chain indicator */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-semibold">LLM Failover Fallback Chain</label>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedAgent.fallbackChain.map((model, idx) => (
                  <React.Fragment key={model}>
                    <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-600">
                      {model}
                    </span>
                    {idx < selectedAgent.fallbackChain.length - 1 && (
                      <span className="text-slate-400 text-[10px] font-mono">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500 font-semibold">System Cognitive Prompt Instructions</label>
                <span className="text-[10px] font-mono text-slate-400">Enforced at runtime</span>
              </div>
              <textarea
                rows={5}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Applying...' : 'Apply Agent Parameters'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-12 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 space-y-3 shadow-2xs">
            <Sparkles size={36} className="opacity-40 text-indigo-500 animate-pulse-subtle" />
            <p className="text-xs font-sans font-semibold text-slate-500 text-center">Select an agent from the Pioneer registry to modify its operating contract.</p>
          </div>
        )}
      </div>

      {/* 30-Day Agent Performance Analytics Chart */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5 mt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-800">
              30-Day Agent Performance Audit
            </h3>
            <p className="font-sans text-[11px] text-slate-400">
              Cross-agent metric audit comparing execution success rate against cumulative token footprint
            </p>
          </div>
        </div>

        <div className="w-full h-[280px] bg-slate-50/50 border border-slate-100 rounded-xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={performanceData}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                fontFamily="Inter, sans-serif"
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#10b981"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6366f1"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif', paddingTop: 10 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="left"
                dataKey="successRate"
                name="30D Success Rate (%)"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              />
              <Bar
                yAxisId="right"
                dataKey="tokens"
                name="30D Tokens Consumed"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Squad Expansion & Persona Customization Documentation */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-6 mt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-800">
              Squad Expansion & Custom Persona Guide
            </h3>
            <p className="font-sans text-[11px] text-slate-400">
              Developer guidelines for register seeding, system prompt engineering, and tool whitelist validation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Schema Requirements */}
          <div className="space-y-3">
            <h4 className="font-sans font-semibold text-xs text-indigo-600 uppercase tracking-wider">
              1. Registry Schema Requirements
            </h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              Every squad worker must adhere to the core <code className="font-mono bg-slate-100 text-[10px] px-1 py-0.5 rounded text-indigo-600">Agent</code> interface defined in the system registry:
            </p>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 font-mono text-[10px] text-slate-300 leading-normal overflow-x-auto space-y-1">
              <div><span className="text-pink-400">id</span>: <span className="text-amber-300">string</span>; <span className="text-slate-500">// Unique agent URI (e.g. &quot;agent-pm&quot;)</span></div>
              <div><span className="text-pink-400">name</span>: <span className="text-amber-300">string</span>; <span className="text-slate-500">// Human label (e.g. &quot;Pat&quot;)</span></div>
              <div><span className="text-pink-400">role</span>: <span className="text-amber-300">string</span>; <span className="text-slate-500">// Functional role description</span></div>
              <div><span className="text-pink-400">toolWhitelist</span>: <span className="text-amber-300">string[]</span>; <span className="text-slate-500">// Sandbox tool keys</span></div>
              <div><span className="text-pink-400">budgetUsd</span>: <span className="text-amber-300">number</span>; <span className="text-slate-500">// Strict micro-cost ceiling</span></div>
              <div><span className="text-pink-400">maxIterations</span>: <span className="text-amber-300">number</span>; <span className="text-slate-500">// Safety guard loops</span></div>
              <div><span className="text-pink-400">fallbackChain</span>: <span className="text-amber-300">string[]</span>; <span className="text-slate-500">// Redundant model fallback</span></div>
            </div>
          </div>

          {/* Prompt Engineering & Constraints */}
          <div className="space-y-3">
            <h4 className="font-sans font-semibold text-xs text-emerald-600 uppercase tracking-wider">
              2. System Prompt & Boundaries
            </h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              Define clean system prompts to reinforce domain expertise and enforce execution constraints:
            </p>
            <ul className="font-sans text-xs text-slate-600 list-disc pl-4 space-y-1.5 leading-relaxed">
              <li>
                <strong>State-Aware Monologue:</strong> Prompt the agent to log strategic self-thoughts before executing mutations.
              </li>
              <li>
                <strong>Strict Out-of-Bounds Restrictions:</strong> Explicitly forbid writing database adapters or executing network calls outside of their designated domain.
              </li>
              <li>
                <strong>Budget-Aware Decisions:</strong> Instruct agents to adapt complexity downward when resource limits are approached.
              </li>
            </ul>
          </div>

          {/* Tool Whitelists */}
          <div className="space-y-3">
            <h4 className="font-sans font-semibold text-xs text-amber-600 uppercase tracking-wider">
              3. Tool Sandbox Validation
            </h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              The orchestration engine validates every tool call against the active agent&apos;s <code className="font-mono bg-slate-100 text-[10px] px-1 py-0.5 rounded text-amber-600">toolWhitelist</code> before running it:
            </p>
            <ul className="font-sans text-xs text-slate-600 list-disc pl-4 space-y-1.5 leading-relaxed">
              <li>
                <strong>Product Manager (Pat):</strong> Restrict to <code className="font-mono text-[10px] text-amber-600 bg-slate-150 px-1 rounded font-semibold">requirements_analysis</code>, <code className="font-mono text-[10px] text-amber-600 bg-slate-150 px-1 rounded font-semibold">brief_compiler</code>.
              </li>
              <li>
                <strong>QA Reviewer (Dave):</strong> Bound to static evaluation scanners: <code className="font-mono text-[10px] text-amber-600 bg-slate-150 px-1 rounded font-semibold">eslint</code>, <code className="font-mono text-[10px] text-amber-600 bg-slate-150 px-1 rounded font-semibold">typescript_compiler</code>.
              </li>
              <li>
                <strong>CEO (Sam):</strong> Bound to high-level governance filters: <code className="font-mono text-[10px] text-amber-600 bg-slate-150 px-1 rounded font-semibold">strategic_signoff</code>, <code className="font-mono text-[10px] text-amber-600 bg-slate-150 px-1 rounded font-semibold">risk_assessor</code>.
              </li>
            </ul>
          </div>
        </div>

        {/* Practical Implementation Spec: Pat & Sam */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <h4 className="font-sans font-semibold text-xs text-slate-800 uppercase tracking-wider">
            Practical Implementation Spec: Pat & Sam
          </h4>
          <p className="font-sans text-xs text-slate-600 leading-relaxed">
            To register new agents, add their object definitions to the system database registry. The framework will automatically instantiate them, build their performance cards, and display their telemetry logs:
          </p>
          <div className="bg-slate-900 border border-slate-950 p-4 rounded-xl overflow-x-auto text-[10px] text-indigo-200 font-mono leading-relaxed space-y-3">
            <div>
              <span className="text-emerald-400">// Pat (Product Manager) Spec:</span>
              <pre className="text-slate-300 mt-1">{`{
  id: "agent-product-manager",
  name: "Pat",
  role: "Product Manager Agent",
  toolWhitelist: ["requirements_analysis", "brief_compiler"],
  budgetUsd: 3.50,
  maxIterations: 5,
  systemPrompt: "You are Pat, a strategic Product Manager agent. Analyze raw task parameters, formulate functional boundaries, and compile product briefs."
}`}</pre>
            </div>
            <div className="border-t border-slate-800/80 pt-3">
              <span className="text-emerald-400">// Sam (CEO) Spec:</span>
              <pre className="text-slate-300 mt-1">{`{
  id: "agent-ceo",
  name: "Sam",
  role: "CEO Agent",
  toolWhitelist: ["strategic_signoff", "financial_approver"],
  budgetUsd: 6.00,
  maxIterations: 6,
  systemPrompt: "You are Sam, the chief executive officer. Govern high-level strategic alignment, perform final budget sanity checks, and authorize deployments."
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
