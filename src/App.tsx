import React, { useState, useEffect, useRef } from 'react';
import { Task, Agent, TaskEvent, BudgetTransaction, ThermalThrottleStatus, DashboardMetrics } from './types';
import CommandCenter from './components/CommandCenter';
import ExpertStudio from './components/ExpertStudio';
import BudgetLedger from './components/BudgetLedger';
import ThoughtStream from './components/ThoughtStream';
import {
  Activity,
  Terminal,
  Cpu,
  Flame,
  LayoutGrid,
  ShieldCheck,
  ShieldAlert,
  Coins,
  DollarSign,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [thermalConfig, setThermalConfig] = useState<ThermalThrottleStatus>({
    throttleLevel: "none",
    enabled: true,
    utilizationPercent: 0,
    recommendedModelTier: 0,
    recommendedModels: ["gemini-3.5-flash"],
    tokenLimitMultiplier: 1.0,
    message: "Initializing dashboard metrics..."
  });
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    totalCostUsd: 0,
    averageTimeToCompleteMinutes: 0,
    spendByModel: {},
    spendByAgent: {}
  });

  const [activeTab, setActiveTab] = useState<'command' | 'studio' | 'ledger' | 'stream'>('command');
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch full dataset initially and during polling backup
  const fetchAllData = async () => {
    try {
      const tasksRes = await fetch('/api/v1/tasks');
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      const agentsRes = await fetch('/api/v1/agents');
      const agentsData = await agentsRes.json();
      setAgents(agentsData);

      const budgetRes = await fetch('/api/v1/budget');
      const budgetData = await budgetRes.json();
      setMetrics(budgetData.metrics);
      setTransactions(budgetData.transactions);
      setThermalConfig(budgetData.thermalConfig);

      // Fetch events for task stream
      if (tasksData.length > 0) {
        const eventsPromises = tasksData.map((t: Task) => fetch(`/api/v1/tasks/${t.id}/events`).then(r => r.json()));
        const resolvedEvents = await Promise.all(eventsPromises);
        const flattenedEvents = resolvedEvents.flat();
        
        // Sort newest first
        const sortedEvents = flattenedEvents.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEvents(sortedEvents);
      }
    } catch (e) {
      console.error("Failed to load initial dataset:", e);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Setup SSE (Server-Sent Events) live real-time connection stream
    const setupStream = () => {
      const source = new EventSource('/api/v1/stream');
      eventSourceRef.current = source;

      source.onopen = () => {
        setSseConnected(true);
        console.log("Real-time telemetry stream connected.");
      };

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;

          if (type === "CONNECTED") {
            return;
          }

          if (type === "TASK_CREATED") {
            setTasks(prev => [data, ...prev]);
          } else if (type === "TASK_UPDATED") {
            setTasks(prev => prev.map(t => t.id === data.id ? data : t));
          } else if (type === "EVENT_LOGGED") {
            setEvents(prev => [data, ...prev]);
            // Refresh budget and transactions as spending changed
            fetchBudgetMetrics();
          } else if (type === "AGENT_UPDATED") {
            setAgents(prev => prev.map(a => a.id === data.id ? data : a));
          } else if (type === "THERMAL_CONFIG_UPDATED") {
            setThermalConfig(data);
          }
        } catch (err) {
          console.error("Error parsing real-time message:", err);
        }
      };

      source.onerror = (err) => {
        console.error("SSE Connection error. Reconnecting stream in 5 seconds...");
        setSseConnected(false);
        source.close();
        setTimeout(setupStream, 5000);
      };
    };

    setupStream();

    // Interval polling backup to guarantee data consistency
    const backupInterval = setInterval(fetchAllData, 8000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearInterval(backupInterval);
    };
  }, []);

  const fetchBudgetMetrics = async () => {
    try {
      const budgetRes = await fetch('/api/v1/budget');
      const budgetData = await budgetRes.json();
      setMetrics(budgetData.metrics);
      setTransactions(budgetData.transactions);
      setThermalConfig(budgetData.thermalConfig);
    } catch (e) {
      console.error(e);
    }
  };

  // API Call Handlers

  const handleCreateTask = async (title: string, description: string, priority: 'low' | 'medium' | 'high', deadline: string, templateId?: string) => {
    await fetch('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority, deadline, templateId })
    });
  };

  const handleApproveTask = async (id: string) => {
    await fetch(`/api/v1/tasks/${id}/approve`, { method: 'POST' });
  };

  const handleRejectTask = async (id: string) => {
    await fetch(`/api/v1/tasks/${id}/reject`, { method: 'POST' });
  };

  const handleRequestChanges = async (id: string, comment: string) => {
    await fetch(`/api/v1/tasks/${id}/request-changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment })
    });
  };

  const handleTerminateTask = async (id: string) => {
    await fetch(`/api/v1/tasks/${id}/terminate`, { method: 'POST' });
  };

  const handleUpdateAgent = async (agentId: string, updates: Partial<Agent>) => {
    const res = await fetch(`/api/v1/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    setAgents(prev => prev.map(a => a.id === agentId ? data.agent : a));
  };

  const handleResetCircuitBreaker = async (agentId: string) => {
    const res = await fetch(`/api/v1/agents/${agentId}/reset-circuit-breaker`, { method: 'POST' });
    const data = await res.json();
    setAgents(prev => prev.map(a => a.id === agentId ? data.agent : a));
  };

  const handleUpdateThermalThrottle = async (enabled: boolean) => {
    const res = await fetch('/api/v1/budget/thermal-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const data = await res.json();
    setThermalConfig(data);
  };

  // Computations
  const trippedAgentsCount = agents.filter(a => a.circuitBreakerState === 'OPEN').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      
      {/* Top Navigation / Dashboard Header */}
      <header className="bg-white/85 border-b border-slate-200/80 sticky top-0 z-40 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/10">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-bold text-sm tracking-tight text-slate-950">TaskFlow AI</h1>
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-md font-semibold tracking-wider">
                  AOS 2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-wide uppercase font-semibold">Autonomous Software Squad OS</p>
            </div>
          </div>

          {/* Sse telemetry status badge */}
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold font-mono border ${
              sseConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-rose-50 text-rose-700 border-rose-200/80'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
              {sseConnected ? 'TELEMETRY ONLINE' : 'TELEMETRY OFFLINE'}
            </span>
            
            <button
              onClick={fetchAllData}
              className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw size={13} className="animate-spin-hover" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-5">
        
        {/* KPI Ribbon Block */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Active Pipelines</p>
              <h3 className="font-sans font-extrabold text-xl text-slate-900 mt-1">{metrics.activeTasks}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Cpu size={18} />
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Ready Deploys</p>
              <h3 className="font-sans font-extrabold text-xl text-slate-900 mt-1">{metrics.completedTasks}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck size={18} />
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all">
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Aggregate Cost</p>
              <h3 className="font-sans font-extrabold text-xl text-slate-900 mt-1">${metrics.totalCostUsd.toFixed(2)}</h3>
            </div>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
              <TrendingUp size={18} />
            </div>
          </div>

          <div className={`p-4 bg-white border rounded-2xl shadow-xs flex items-center justify-between transition-all hover:shadow-sm ${
            trippedAgentsCount > 0 ? 'border-rose-300 bg-rose-50/50 animate-pulse-subtle' : 'border-slate-200/80'
          }`}>
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Breakers Tripped</p>
              <h3 className={`font-sans font-extrabold text-xl mt-1 ${trippedAgentsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {trippedAgentsCount}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl ${trippedAgentsCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
              <ShieldAlert size={18} />
            </div>
          </div>

        </div>

        {/* Navigation Tabs bar */}
        <div className="flex border-b border-slate-200/80 gap-1 overflow-x-auto pb-1">
          {[
            { id: 'command', label: 'Command Center', icon: LayoutGrid },
            { id: 'studio', label: 'Expert Studio', icon: Cpu },
            { id: 'ledger', label: 'Financial Ledger', icon: Coins },
            { id: 'stream', label: 'Thought Stream', icon: Terminal }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-xs font-semibold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab contents window */}
        <div className="min-h-[500px]">
          {activeTab === 'command' && (
            <CommandCenter
              tasks={tasks}
              events={events}
              agents={agents}
              onCreateTask={handleCreateTask}
              onApproveTask={handleApproveTask}
              onRejectTask={handleRejectTask}
              onRequestChanges={handleRequestChanges}
              onTerminateTask={handleTerminateTask}
            />
          )}

          {activeTab === 'studio' && (
            <ExpertStudio
              agents={agents}
              onUpdateAgent={handleUpdateAgent}
              onResetCircuitBreaker={handleResetCircuitBreaker}
            />
          )}

          {activeTab === 'ledger' && (
            <BudgetLedger
              transactions={transactions}
              thermalConfig={thermalConfig}
              onUpdateThermalThrottle={handleUpdateThermalThrottle}
              spendByModel={metrics.spendByModel}
              spendByAgent={metrics.spendByAgent}
            />
          )}

          {activeTab === 'stream' && (
            <ThoughtStream events={events} />
          )}
        </div>

      </main>
    </div>
  );
}
