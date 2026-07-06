import React, { useState } from 'react';
import { Agent } from '../types';
import { ShieldCheck, ShieldAlert, Settings, Save, RotateCcw, Cpu, Sparkles } from 'lucide-react';

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
    </div>
  );
}
