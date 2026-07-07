import React, { useState } from 'react';
import { Agent, TaskTemplate } from '../types';
import { ShieldCheck, ShieldAlert, Settings, Save, RotateCcw, Cpu, Sparkles, BarChart3, HeartPulse, Activity, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
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
  const [now, setNow] = useState<number>(Date.now());
  const [simulationMsg, setSimulationMsg] = useState<string>('');
  const [simulating, setSimulating] = useState<boolean>(false);

  const activeAgent = selectedAgent ? (agents.find(a => a.id === selectedAgent.id) || selectedAgent) : null;

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Template creation form state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateTargetTitle, setNewTemplateTargetTitle] = useState('');
  const [newTemplateTargetDesc, setNewTemplateTargetDesc] = useState('');
  const [newTemplatePriority, setNewTemplatePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSavedMsg, setTemplateSavedMsg] = useState('');

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    setSavingTemplate(true);
    setTemplateSavedMsg('');
    try {
      const agentConfigs = agents.map(ag => ({
        agentId: ag.id,
        systemPrompt: ag.systemPrompt,
        budgetUsd: ag.budgetUsd,
        maxIterations: ag.maxIterations
      }));

      const response = await fetch('/api/v1/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          description: newTemplateDesc,
          targetTaskTitle: newTemplateTargetTitle,
          targetTaskDescription: newTemplateTargetDesc,
          priority: newTemplatePriority,
          agentConfigs
        })
      });

      if (response.ok) {
        setTemplateSavedMsg('Template saved successfully!');
        setNewTemplateName('');
        setNewTemplateDesc('');
        setNewTemplateTargetTitle('');
        setNewTemplateTargetDesc('');
        setNewTemplatePriority('medium');
      } else {
        setTemplateSavedMsg('Failed to save template.');
      }
    } catch (e) {
      console.error(e);
      setTemplateSavedMsg('Error saving template.');
    } finally {
      setSavingTemplate(false);
    }
  };

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

                {/* Health Check telemetry */}
                {(() => {
                  const lastActive = agent.lastActiveAt ? new Date(agent.lastActiveAt).getTime() : now;
                  const secSinceActive = Math.max(0, Math.floor((now - lastActive) / 1000));

                  let healthLabel = 'Asleep';
                  let healthBg = 'bg-slate-50 border-slate-200 text-slate-600';
                  let healthIcon = <Clock size={11} className="text-slate-400" />;

                  if (agent.status === 'TRIPPED') {
                    healthLabel = 'Tripped';
                    healthBg = 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse';
                    healthIcon = <ShieldAlert size={11} className="text-rose-500" />;
                  } else if (agent.status === 'WORKING') {
                    if (secSinceActive < 15) {
                      healthLabel = 'Processing';
                      healthBg = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                      healthIcon = <Activity size={11} className="text-emerald-500 animate-pulse" />;
                    } else if (secSinceActive < 30) {
                      healthLabel = 'Lagging';
                      healthBg = 'bg-amber-50 border-amber-200 text-amber-700';
                      healthIcon = <Clock size={11} className="text-amber-500" />;
                    } else {
                      healthLabel = 'Deadlocked';
                      healthBg = 'bg-rose-50 border-rose-200 text-rose-700 animate-bounce';
                      healthIcon = <AlertTriangle size={11} className="text-rose-500" />;
                    }
                  }

                  return (
                    <div className="mt-3 flex items-center justify-between text-[11px] font-sans">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <HeartPulse size={12} className="text-indigo-500" /> Process Health:
                      </span>
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase ${healthBg}`}>
                        {healthIcon}
                        {healthLabel}
                        {agent.status === 'WORKING' && ` (${secSinceActive}s)`}
                      </span>
                    </div>
                  );
                })()}

                {/* Micro metrics */}
                <div className="mt-3.5 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-2">
                  <span>Trips: {agent.tripCount}</span>
                  <span>Tokens: {agent.spentTokens.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Template Saver Form Card */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4 mt-5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
            <Save className="text-indigo-600 w-4.5 h-4.5" />
            <span className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider">Save Custom Squad Template</span>
          </div>
          
          <div className="space-y-3 text-xs">
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Capture the current active agent prompts, spending budgets, and loop limit thresholds as a custom loadable task template.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 font-mono uppercase">Template Name</label>
              <input
                type="text"
                required
                placeholder="e.g. 🚀 Ultra-Fast Prototyping Blueprint"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 font-mono uppercase">Template Description</label>
              <textarea
                rows={2}
                placeholder="Briefly explain the use-case for this configuration blueprint..."
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 font-mono uppercase">Default Task Title</label>
              <input
                type="text"
                placeholder="e.g. Rapid KPI Widget Sprint"
                value={newTemplateTargetTitle}
                onChange={(e) => setNewTemplateTargetTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 font-mono uppercase">Default Description</label>
              <textarea
                rows={2}
                placeholder="Provide pre-filled functional task details..."
                value={newTemplateTargetDesc}
                onChange={(e) => setNewTemplateTargetDesc(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 font-mono uppercase">Default Priority</label>
              <select
                value={newTemplatePriority}
                onChange={(e: any) => setNewTemplatePriority(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <button
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !newTemplateName.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-sans text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer font-sans"
            >
              {savingTemplate ? 'Saving Template...' : 'Save Current Squad as Template'}
            </button>

            {templateSavedMsg && (
              <p className={`text-[10px] font-mono font-bold text-center mt-1 ${
                templateSavedMsg.includes('successfully') ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {templateSavedMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Editor Panel */}
      <div className="lg:col-span-2">
        {activeAgent ? (
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Settings className="text-indigo-600 w-5 h-5" />
                <div>
                  <h2 className="font-sans font-bold text-slate-900 text-sm">
                    Configure {activeAgent.name}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">
                    SYSTEM INSTANCE: {activeAgent.id}
                  </p>
                </div>
              </div>

              {activeAgent.circuitBreakerState === 'OPEN' && (
                <button
                  onClick={() => onResetCircuitBreaker(activeAgent.id).then(() => selectAgent({
                    ...activeAgent,
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

            {/* Health check & diagnostics section */}
            {(() => {
              const lastActive = activeAgent.lastActiveAt ? new Date(activeAgent.lastActiveAt).getTime() : now;
              const secSinceActive = Math.max(0, Math.floor((now - lastActive) / 1000));

              const lastTool = activeAgent.lastSuccessfulToolExecutionAt ? new Date(activeAgent.lastSuccessfulToolExecutionAt).getTime() : now;
              const secSinceTool = Math.max(0, Math.floor((now - lastTool) / 1000));

              const lastComm = activeAgent.lastCommunicationAt ? new Date(activeAgent.lastCommunicationAt).getTime() : now;
              const secSinceComm = Math.max(0, Math.floor((now - lastComm) / 1000));

              let healthLabel = 'Asleep (Idle)';
              let healthStatus = 'READY';
              let healthBg = 'bg-slate-50 border-slate-200 text-slate-700';
              let healthIcon = <Clock size={16} className="text-slate-400" />;
              let healthDesc = `${activeAgent.name} is currently resting and awaiting an autonomous task assignment. No live loops are running.`;

              if (activeAgent.circuitBreakerState === 'OPEN') {
                healthStatus = 'TRIPPED';
                healthLabel = 'Tripped & Terminated';
                healthBg = 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse';
                healthIcon = <ShieldAlert size={16} className="text-rose-500" />;
                healthDesc = `CRITICAL: ${activeAgent.name}'s safety limits were breached! Circuit breaker is OPEN. Reset the circuit breaker to resume.`;
              } else if (activeAgent.status === 'WORKING') {
                if (secSinceActive < 15) {
                  healthStatus = 'HEALTHY';
                  healthLabel = 'Processing Securely';
                  healthBg = 'bg-emerald-50 border-emerald-300 text-emerald-800';
                  healthIcon = <Activity size={16} className="text-emerald-500 animate-pulse" />;
                  healthDesc = `${activeAgent.name} is currently running a live autonomous iteration. Spawning sub-agents and compiling output.`;
                } else if (secSinceActive < 30) {
                  healthStatus = 'LAGGING';
                  healthLabel = 'Processing Lag / High Latency';
                  healthBg = 'bg-amber-50 border-amber-300 text-amber-800';
                  healthIcon = <Clock size={16} className="text-amber-500" />;
                  healthDesc = `Notice: ${activeAgent.name} is taking longer than usual to complete this step. Re-attempting or awaiting upstream response.`;
                } else {
                  healthStatus = 'DEADLOCKED';
                  healthLabel = 'PROCESS DEADLOCKED / STALLED';
                  healthBg = 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse';
                  healthIcon = <AlertTriangle size={16} className="text-rose-500 animate-bounce" />;
                  healthDesc = `WARNING: No tool execution or communication has been recorded for ${secSinceActive}s in WORKING state. The autonomous loop appears deadlocked!`;
                }
              }

              // Handler to trigger simulated deadlock via API
              const handleSimulateDeadlock = async () => {
                setSimulating(true);
                setSimulationMsg('');
                try {
                  const res = await fetch(`/api/v1/agents/${activeAgent.id}/simulate-deadlock`, { method: 'POST' });
                  if (res.ok) {
                    setSimulationMsg(`Deadlock simulation injected successfully! ${activeAgent.name} is now stalled.`);
                  } else {
                    setSimulationMsg('Failed to inject deadlock.');
                  }
                } catch (err) {
                  console.error(err);
                  setSimulationMsg('Error injecting deadlock.');
                } finally {
                  setSimulating(false);
                }
              };

              // Handler to clear/ping heartbeat
              const handlePingHeartbeat = async () => {
                setSimulating(true);
                setSimulationMsg('');
                try {
                  const res = await fetch(`/api/v1/agents/${activeAgent.id}/ping-heartbeat`, { method: 'POST' });
                  if (res.ok) {
                    setSimulationMsg(`Process heartbeat pinged. ${activeAgent.name} has been recovered to IDLE!`);
                  } else {
                    setSimulationMsg('Failed to ping heartbeat.');
                  }
                } catch (err) {
                  console.error(err);
                  setSimulationMsg('Error pinging heartbeat.');
                } finally {
                  setSimulating(false);
                }
              };

              return (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="text-indigo-600 w-4.5 h-4.5" />
                      <span className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider">Health Check & Autonomous Diagnostics</span>
                    </div>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide font-mono border ${healthBg}`}>
                      {healthIcon}
                      {healthLabel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {healthDesc}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs font-mono">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">Last Activity</span>
                      <span className="font-bold text-slate-700">{secSinceActive}s ago</span>
                      <span className="text-[9px] text-slate-400 block truncate">{activeAgent.lastActiveAt ? new Date(activeAgent.lastActiveAt).toLocaleTimeString() : 'Never'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">Last Successful Tool Execution</span>
                      <span className="font-bold text-slate-700">{secSinceTool}s ago</span>
                      <span className="text-[9px] text-slate-400 block truncate">{activeAgent.lastSuccessfulToolExecutionAt ? new Date(activeAgent.lastSuccessfulToolExecutionAt).toLocaleTimeString() : 'Never'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">Last Communication</span>
                      <span className="font-bold text-slate-700">{secSinceComm}s ago</span>
                      <span className="text-[9px] text-slate-400 block truncate">{activeAgent.lastCommunicationAt ? new Date(activeAgent.lastCommunicationAt).toLocaleTimeString() : 'Never'}</span>
                    </div>
                  </div>

                  {/* Simulations & Heartbeat Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    {activeAgent.status !== 'WORKING' || healthStatus !== 'DEADLOCKED' ? (
                      <button
                        onClick={handleSimulateDeadlock}
                        disabled={simulating || activeAgent.circuitBreakerState === 'OPEN'}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-mono text-[10px] font-bold uppercase rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <AlertTriangle size={12} />
                        Simulate Deadlock
                      </button>
                    ) : (
                      <button
                        onClick={handlePingHeartbeat}
                        disabled={simulating}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-mono text-[10px] font-bold uppercase rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={12} className="animate-spin" />
                        Ping Heartbeat (Clear Deadlock)
                      </button>
                    )}

                    {activeAgent.status === 'WORKING' && healthStatus !== 'DEADLOCKED' && (
                      <button
                        onClick={handlePingHeartbeat}
                        disabled={simulating}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white font-mono text-[10px] font-bold uppercase rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        Ping Heartbeat
                      </button>
                    )}

                    {simulationMsg && (
                      <span className="text-[10px] text-indigo-600 font-mono font-bold animate-pulse truncate max-w-xs">
                        {simulationMsg}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

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

            {/* Real-time Agent Telemetry & LLM Metrics */}
            {selectedAgent.metrics && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-indigo-600 w-4.5 h-4.5" />
                  <span className="font-sans font-bold text-slate-900 text-xs uppercase tracking-wider">Telemetry & LLM Run Metrics</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Token & Latency Column */}
                  <div className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                    <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">LLM Transaction Profiles</h4>
                    
                    {/* Latency Steps Breakdown */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-slate-400">Step Latency Profile</p>
                      
                      {selectedAgent.metrics.latencyPlanningMs && selectedAgent.metrics.latencyPlanningMs.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">Planning Latency:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {(selectedAgent.metrics.latencyPlanningMs.reduce((a,b)=>a+b,0)/selectedAgent.metrics.latencyPlanningMs.length).toFixed(0)} ms
                          </span>
                        </div>
                      )}

                      {selectedAgent.metrics.latencyImplementationMs && selectedAgent.metrics.latencyImplementationMs.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">Implementation Latency:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {(selectedAgent.metrics.latencyImplementationMs.reduce((a,b)=>a+b,0)/selectedAgent.metrics.latencyImplementationMs.length).toFixed(0)} ms
                          </span>
                        </div>
                      )}

                      {selectedAgent.metrics.latencyQaMs && selectedAgent.metrics.latencyQaMs.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">QA Review Latency:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {(selectedAgent.metrics.latencyQaMs.reduce((a,b)=>a+b,0)/selectedAgent.metrics.latencyQaMs.length).toFixed(0)} ms
                          </span>
                        </div>
                      )}

                      {selectedAgent.metrics.latencyProductBriefMs && selectedAgent.metrics.latencyProductBriefMs.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">Product Brief Latency:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {(selectedAgent.metrics.latencyProductBriefMs.reduce((a,b)=>a+b,0)/selectedAgent.metrics.latencyProductBriefMs.length).toFixed(0)} ms
                          </span>
                        </div>
                      )}

                      {selectedAgent.metrics.latencyCeoMs && selectedAgent.metrics.latencyCeoMs.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">CEO Sign-off Latency:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {(selectedAgent.metrics.latencyCeoMs.reduce((a,b)=>a+b,0)/selectedAgent.metrics.latencyCeoMs.length).toFixed(0)} ms
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Token Footprint List */}
                    {selectedAgent.metrics.llmCallTokens && selectedAgent.metrics.llmCallTokens.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <p className="text-[10px] font-mono text-slate-400">Tokens per LLM Call (Recent runs)</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {selectedAgent.metrics.llmCallTokens.map((tokens, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold">
                              {(tokens / 1000).toFixed(0)}k
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tool Executions Grid */}
                  <div className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                    <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Tool Execution Success Rates</h4>
                    
                    {selectedAgent.metrics.toolExecutions && selectedAgent.metrics.toolExecutions.length > 0 ? (
                      <div className="space-y-2.5">
                        {selectedAgent.metrics.toolExecutions.map((tool, idx) => {
                          const total = tool.successes + tool.failures;
                          const rate = total > 0 ? (tool.successes / total) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-semibold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md text-[10px]">
                                  {tool.toolName}
                                </span>
                                <span className="font-mono text-slate-500 font-bold text-[10px]">
                                  {tool.successes}/{total} ok ({rate.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${rate > 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No tool calls executed yet in this session.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
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
