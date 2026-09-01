import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Database,
  Cpu,
  Layers,
  Terminal,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Lock,
  Zap,
  Activity,
  Code2
} from 'lucide-react';
import {
  SecretManagerStatus,
  TemporalWorkflowRun,
  LangGraphState,
  FirecrackerSandboxPoolStatus
} from '../types';

interface EnterpriseInfraProps {
  operatorToken: string | null;
}

export default function EnterpriseInfra({ operatorToken }: EnterpriseInfraProps) {
  const [secretStatus, setSecretStatus] = useState<SecretManagerStatus | null>(null);
  const [temporalStatus, setTemporalStatus] = useState<any>(null);
  const [workflows, setWorkflows] = useState<TemporalWorkflowRun[]>([]);
  const [selectedWf, setSelectedWf] = useState<TemporalWorkflowRun | null>(null);
  const [graphTopology, setGraphTopology] = useState<any>(null);
  const [sandboxPool, setSandboxPool] = useState<FirecrackerSandboxPoolStatus | null>(null);
  const [sandboxTestCode, setSandboxTestCode] = useState<string>(
    `function calculateMetrics() {\n  const data = [10, 20, 30, 40];\n  const sum = data.reduce((a, b) => a + b, 0);\n  return { sum, avg: sum / data.length };\n}\ncalculateMetrics();`
  );
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'secrets' | 'temporal' | 'langgraph' | 'sandbox'>('secrets');

  // Secret override state
  const [overrideKey, setOverrideKey] = useState('');
  const [overrideVal, setOverrideVal] = useState('');
  const [providerChoice, setProviderChoice] = useState<'env' | 'gcp' | 'vault'>('env');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchInfraData = async () => {
    try {
      const [secRes, tempStatRes, wfRes, graphRes, poolRes] = await Promise.all([
        fetch('/api/v1/secrets/status').then(r => r.json()),
        fetch('/api/v1/temporal/status').then(r => r.json()),
        fetch('/api/v1/temporal/workflows').then(r => r.json()),
        fetch('/api/v1/langgraph/graph').then(r => r.json()),
        fetch('/api/v1/sandbox/pool-status').then(r => r.json())
      ]);

      setSecretStatus(secRes);
      setTemporalStatus(tempStatRes);
      setWorkflows(wfRes);
      if (wfRes.length > 0 && !selectedWf) {
        setSelectedWf(wfRes[0]);
      }
      setGraphTopology(graphRes);
      setSandboxPool(poolRes);
    } catch (e) {
      console.error("Failed to load infrastructure telemetry:", e);
    }
  };

  useEffect(() => {
    fetchInfraData();
    const interval = setInterval(fetchInfraData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleReloadSecrets = async () => {
    try {
      const token = localStorage.getItem('taskflow_operator_token');
      const res = await fetch('/api/v1/secrets/reload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSecretStatus(data.status);
        setActionMessage("Secrets cache successfully purged & reloaded.");
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProviderSwitch = async (prov: 'env' | 'gcp' | 'vault') => {
    setProviderChoice(prov);
    try {
      const token = localStorage.getItem('taskflow_operator_token');
      const res = await fetch('/api/v1/secrets/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ provider: prov })
      });
      if (res.ok) {
        const data = await res.json();
        setSecretStatus(data.status);
        setActionMessage(`Secret Provider switched to ${prov.toUpperCase()}.`);
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideKey.trim()) return;
    try {
      const token = localStorage.getItem('taskflow_operator_token');
      const res = await fetch('/api/v1/secrets/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ key: overrideKey, value: overrideVal })
      });
      if (res.ok) {
        const data = await res.json();
        setSecretStatus(data.status);
        setActionMessage(`Secret override set for ${overrideKey}.`);
        setOverrideKey('');
        setOverrideVal('');
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestSandbox = async () => {
    setIsExecutingCode(true);
    try {
      const token = localStorage.getItem('taskflow_operator_token');
      const res = await fetch('/api/v1/sandbox/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ code: sandboxTestCode, language: 'javascript', timeoutMs: 3000 })
      });
      const data = await res.json();
      setSandboxResult(data);
      fetchInfraData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecutingCode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl">
            <Server size={18} />
          </div>
          <div>
            <h2 className="font-sans font-bold text-base text-slate-900 tracking-tight">Enterprise Infrastructure Mesh</h2>
            <p className="text-xs text-slate-500 font-mono">Dynamic Secrets • Temporal.io Workflows • LangGraph State • Firecracker MicroVMs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          {[
            { id: 'secrets', label: 'Secret Manager', icon: Key },
            { id: 'temporal', label: 'Temporal Engine', icon: Clock },
            { id: 'langgraph', label: 'LangGraph Topology', icon: Layers },
            { id: 'sandbox', label: 'Firecracker Sandbox', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600" />
          {actionMessage}
        </div>
      )}

      {/* VIEW 1: DYNAMIC SECRET MANAGER */}
      {activeSubTab === 'secrets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-900">Provider Orchestration</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Dynamic secret resolution with auto-fallback and TTL caching</p>
                </div>
                <button
                  onClick={handleReloadSecrets}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-semibold cursor-pointer border border-slate-200 transition-all"
                >
                  <RotateCw size={12} />
                  Purge & Refresh Cache
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'env', title: 'Local / Container Env', desc: 'Node.js process.env resolution' },
                  { id: 'gcp', title: 'Google Secret Manager', desc: 'GCP Cloud IAM key rotation' },
                  { id: 'vault', title: 'HashiCorp Vault', desc: 'AppRole & dynamic leased secrets' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProviderSwitch(p.id as any)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      secretStatus?.provider === p.id
                        ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-500/20'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-xs text-slate-900 uppercase tracking-wide">{p.title}</span>
                      {secretStatus?.provider === p.id && <CheckCircle2 size={14} className="text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-1 leading-relaxed">{p.desc}</p>
                  </button>
                ))}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200">
                  <span>Cache Strategy</span>
                  <span className="font-bold text-slate-800">In-Memory LRU with TTL</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200">
                  <span>Cache TTL</span>
                  <span className="font-bold text-slate-800">{((secretStatus?.cacheTtlMs || 300000) / 1000)}s</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200">
                  <span>Active Cached Keys</span>
                  <span className="font-bold text-slate-800">{secretStatus?.cachedKeysCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Resolved Secrets</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {secretStatus?.resolvedSecrets?.map(k => (
                      <span key={k} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Set Secret Override Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-sans font-bold text-sm text-slate-900">Runtime Dynamic Secret Injection</h3>
              <p className="text-xs text-slate-500 font-mono">Inject runtime overrides without restarting server containers.</p>
              
              <form onSubmit={handleSetOverride} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 mb-1">Secret Key Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. GEMINI_API_KEY"
                      value={overrideKey}
                      onChange={e => setOverrideKey(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 mb-1">Secret Value (Masked)</label>
                    <input
                      type="password"
                      placeholder="Enter secret or key"
                      value={overrideVal}
                      onChange={e => setOverrideVal(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs"
                >
                  Save & Apply Override
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="font-sans font-bold text-sm text-slate-900">Security Invariant Checks</h3>
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Browser Zero-Exposure</p>
                    <p className="text-[11px] text-emerald-700 leading-relaxed font-mono mt-0.5">Secrets never leaked over client SSE or REST payloads.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                  <Shield size={16} className="text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Graceful Simulation Fallback</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-mono mt-0.5">Offline mock synthesis automatically active if keys absent.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TEMPORAL.IO WORKFLOW ORCHESTRATION */}
      {activeSubTab === 'temporal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-900">Temporal Workflow Runs</h3>
                <p className="text-xs text-slate-500 font-mono">{workflows.length} stateful runs registered</p>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Activity size={16} />
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {workflows.map(wf => (
                <button
                  key={wf.workflowId}
                  onClick={() => setSelectedWf(wf)}
                  className={`w-full p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedWf?.workflowId === wf.workflowId
                      ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/20'
                      : 'bg-white/80 border-slate-200/80 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 truncate max-w-[170px]">{wf.workflowId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      wf.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      wf.status === 'RUNNING' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {wf.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans mt-1 truncate">{wf.taskTitle}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedWf ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="font-sans font-bold text-sm text-slate-900">{selectedWf.workflowId}</h3>
                    <p className="text-xs text-slate-500 font-mono">Workflow Type: TaskExecutionOrchestrationWorkflow</p>
                  </div>
                  <span className="font-mono text-xs text-slate-400">Started {new Date(selectedWf.startTime).toLocaleTimeString()}</span>
                </div>

                {/* Activity transitions ledger */}
                <div>
                  <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wide mb-3">Temporal Activity State Machine</h4>
                  <div className="space-y-2">
                    {selectedWf.activities?.map((act, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between font-mono text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            act.status === 'COMPLETED' ? 'bg-emerald-500' :
                            act.status === 'EXECUTING' ? 'bg-indigo-500 animate-ping' :
                            act.status === 'FAILED' ? 'bg-rose-500' : 'bg-slate-300'
                          }`} />
                          <div>
                            <span className="font-bold text-slate-900">{act.activityName}</span>
                            <span className="text-slate-400 ml-2">({act.assignedAgentId})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                          {act.durationMs && <span>{act.durationMs}ms</span>}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            act.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            act.status === 'EXECUTING' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {act.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signals Received */}
                <div>
                  <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wide mb-2">Dispatched Signals</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedWf.signalsReceived?.length ? (
                      selectedWf.signalsReceived.map((sig, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-mono font-semibold">
                          ⚡ {sig.signalName} @ {new Date(sig.receivedAt).toLocaleTimeString()}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">No signals dispatched yet.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-white rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs font-mono">
                Select a Temporal workflow run from the list to inspect execution traces.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: LANGGRAPH MULTI-AGENT STATE GRAPH */}
      {activeSubTab === 'langgraph' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-900">LangGraph Execution Topology</h3>
                <p className="text-xs text-slate-500 font-mono">State-Graph multi-agent DAG with Human-in-the-Loop conditional gates</p>
              </div>
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-semibold">
                Entry: {graphTopology?.entryPoint || "pm_node"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {graphTopology?.nodes?.map((n: any) => (
                <div key={n.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900">{n.name}</span>
                    <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {n.agentRole}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{n.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: FIRECRACKER MICROVM SANDBOX */}
      {activeSubTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="font-sans font-bold text-sm text-slate-900">MicroVM Pool Status</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="block text-base font-extrabold text-emerald-800">{sandboxPool?.readySlots || 0}</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase">Ready Slots</span>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="block text-base font-extrabold text-indigo-800">{sandboxPool?.busySlots || 0}</span>
                  <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase">Executing</span>
                </div>
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                  <span className="block text-base font-extrabold text-slate-800">{sandboxPool?.totalSlots || 0}</span>
                  <span className="text-[10px] font-mono text-slate-600 font-bold uppercase">Total Pool</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Isolate Engine</span>
                  <span className="font-bold text-slate-800">Firecracker v1.4 Isolate</span>
                </div>
                <div className="flex justify-between">
                  <span>AST Security Scanner</span>
                  <span className="font-bold text-emerald-700">Strict Zero-Trust Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Enforced Memory Cap</span>
                  <span className="font-bold text-slate-800">128 MB / Slot</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-900">Sandbox Code Execution Tester</h3>
                  <p className="text-xs text-slate-500 font-mono">Test safe code execution inside the Firecracker sandbox pool</p>
                </div>
                <button
                  onClick={handleTestSandbox}
                  disabled={isExecutingCode}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs disabled:opacity-50"
                >
                  <Play size={13} />
                  {isExecutingCode ? "Executing in Isolate..." : "Run in Sandbox"}
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={sandboxTestCode}
                  onChange={e => setSandboxTestCode(e.target.value)}
                  rows={6}
                  className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {sandboxResult && (
                <div className="p-4 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-indigo-400 font-bold">Execution Output:</span>
                    <span className="text-slate-400">Exit Code: {sandboxResult.exitCode} ({sandboxResult.executionTimeMs}ms)</span>
                  </div>
                  <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap">{sandboxResult.output || "(no stdout)"}</pre>
                  {sandboxResult.error && (
                    <pre className="text-rose-400">{sandboxResult.error}</pre>
                  )}
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                    <span>Security Audit: {sandboxResult.securityScan?.score}/100</span>
                    <span>Sandbox Slot: {sandboxResult.sandboxId}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
