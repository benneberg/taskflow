import React, { useState } from 'react';
import { Task, TaskStatus, TaskEvent, TaskTemplate, Agent } from '../types';
import {
  Plus,
  Calendar,
  AlertTriangle,
  Code,
  CheckCircle,
  XCircle,
  Send,
  GitPullRequest,
  Check,
  FileText,
  Copy,
  Terminal,
  Cpu,
  BookOpen,
  Award,
  Timer,
  Zap,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Lock,
  Unlock,
  Users,
  Bot,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface CommandCenterProps {
  tasks: Task[];
  events: TaskEvent[];
  agents: Agent[];
  onCreateTask: (title: string, description: string, priority: 'low' | 'medium' | 'high', deadline: string, templateId?: string) => Promise<void>;
  onApproveTask: (id: string) => Promise<void>;
  onRejectTask: (id: string) => Promise<void>;
  onRequestChanges: (id: string, comment: string) => Promise<void>;
  onTerminateTask: (id: string) => Promise<void>;
}

const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
};

export default function CommandCenter({
  tasks,
  events,
  agents,
  onCreateTask,
  onApproveTask,
  onRejectTask,
  onRequestChanges,
  onTerminateTask
}: CommandCenterProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [changesComment, setChangesComment] = useState('');
  const [submittingChanges, setSubmittingChanges] = useState(false);

  // Agent Collaboration States
  const [collabTab, setCollabTab] = useState<'scratchpad' | 'messenger'>('scratchpad');
  const [scratchpadText, setScratchpadText] = useState('');
  const [activeLock, setActiveLock] = useState<string | null>(null);
  const [senderIdentity, setSenderIdentity] = useState('user');
  const [recipientAgent, setRecipientAgent] = useState('agent-backend-dev');
  const [msgProtocol, setMsgProtocol] = useState<'HANDSHAKE_REQUEST' | 'DATA_TRANSMISSION' | 'QA_ALERT' | 'COLLABORATION_NOTE'>('COLLABORATION_NOTE');
  const [draftMessage, setDraftMessage] = useState('');
  const [collabError, setCollabError] = useState<string | null>(null);
  const [isConsulting, setIsConsulting] = useState(false);

  // Synchronize state when selectedTask changes
  React.useEffect(() => {
    if (selectedTask) {
      setScratchpadText(selectedTask.scratchpad || '');
      setActiveLock(selectedTask.scratchpadLockedBy || null);
    }
  }, [selectedTask?.id]);

  // Keep selectedTask in sync with parent updates (e.g. SSE stream broadcasts)
  React.useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) {
        // Only update if there are physical changes to prevent infinite re-renders
        if (
          updated.scratchpad !== selectedTask.scratchpad ||
          updated.scratchpadLockedBy !== selectedTask.scratchpadLockedBy ||
          (updated.directMessages?.length || 0) !== (selectedTask.directMessages?.length || 0) ||
          updated.status !== selectedTask.status
        ) {
          setSelectedTask(updated);
        }
      }
    }
  }, [tasks, selectedTask?.id]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('taskflow_operator_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const handleSaveScratchpad = async () => {
    if (!selectedTask) return;
    try {
      setCollabError(null);
      const response = await fetch(`/api/v1/tasks/${selectedTask.id}/scratchpad`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ content: scratchpadText, lockedBy: senderIdentity })
      });
      if (response.status === 401 || response.status === 403) {
        setCollabError("Access restricted. Please sign in as Operator.");
        return;
      }
      if (response.status === 409) {
        const errData = await response.json();
        setCollabError(errData.error);
        return;
      }
      const data = await response.json();
      setSelectedTask(data.task);
    } catch (err) {
      console.error("Failed to save scratchpad:", err);
      setCollabError("Network error saving sandbox.");
    }
  };

  const handleToggleLock = async () => {
    if (!selectedTask) return;
    try {
      setCollabError(null);
      const nextLock = activeLock ? null : senderIdentity;
      const response = await fetch(`/api/v1/tasks/${selectedTask.id}/scratchpad/lock`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ lockedBy: nextLock })
      });
      if (response.status === 401 || response.status === 403) {
        setCollabError("Access restricted. Please sign in as Operator.");
        return;
      }
      if (response.status === 409) {
        const errData = await response.json();
        setCollabError(errData.error);
        return;
      }
      const data = await response.json();
      setSelectedTask(data.task);
    } catch (err) {
      console.error("Failed to toggle lock:", err);
      setCollabError("Network error toggling lock state.");
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !draftMessage.trim()) return;
    try {
      setCollabError(null);
      const response = await fetch(`/api/v1/tasks/${selectedTask.id}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          senderId: senderIdentity,
          recipientId: recipientAgent,
          protocol: msgProtocol,
          content: draftMessage
        })
      });
      if (response.status === 401 || response.status === 403) {
        setCollabError("Access restricted. Please sign in as Operator.");
        return;
      }
      const data = await response.json();
      setSelectedTask(data.task);
      setDraftMessage('');
    } catch (err) {
      console.error("Failed to send direct message:", err);
      setCollabError("Network error dispatching message.");
    }
  };

  const handleTriggerAiDebate = async () => {
    if (!selectedTask) return;
    try {
      setCollabError(null);
      setIsConsulting(true);
      const response = await fetch(`/api/v1/tasks/${selectedTask.id}/collaboration/discuss`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (response.status === 401 || response.status === 403) {
        setCollabError("Access restricted. Please sign in as Operator.");
        return;
      }
      const data = await response.json();
      setSelectedTask(data.task);
    } catch (err) {
      console.error("Failed to start AI debate:", err);
      setCollabError("Network error starting debate.");
    } finally {
      setIsConsulting(false);
    }
  };
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDeadline, setNewDeadline] = useState('');

  // Templates list & select state
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  React.useEffect(() => {
    if (showCreateModal) {
      fetch('/api/v1/templates')
        .then(r => r.json())
        .then(data => setTemplates(data))
        .catch(err => console.error("Failed to load templates:", err));
    }
  }, [showCreateModal]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setNewTitle(tpl.targetTaskTitle || '');
      setNewDesc(tpl.targetTaskDescription || '');
      setNewPriority(tpl.priority || 'medium');
    }
  };

  // Group tasks into columns
  const getColumnTasks = (colType: string) => {
    return tasks.filter(t => {
      if (colType === 'backlog') return t.status === 'CREATED';
      if (colType === 'progress') return t.status === 'PLANNING' || t.status === 'IMPLEMENTING';
      if (colType === 'qa') return t.status === 'QA_REVIEW';
      if (colType === 'hitl') return t.status === 'AWAITING_APPROVAL' || t.status === 'ESCALATED';
      if (colType === 'completed') return t.status === 'COMPLETED' || t.status === 'APPROVED';
      return false;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    try {
      await onCreateTask(newTitle, newDesc, newPriority, newDeadline, selectedTemplateId || undefined);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      setNewDeadline('');
      setSelectedTemplateId('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const copyCodeToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'CREATED':
        return 'bg-slate-100 border-slate-200 text-slate-600';
      case 'PLANNING':
        return 'bg-sky-50 border-sky-200 text-sky-700 animate-pulse';
      case 'IMPLEMENTING':
        return 'bg-violet-50 border-violet-200 text-violet-700 animate-pulse';
      case 'QA_REVIEW':
        return 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse';
      case 'AWAITING_APPROVAL':
        return 'bg-orange-50 border-orange-200 text-orange-700 animate-pulse-subtle';
      case 'COMPLETED':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'ESCALATED':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'FAILED':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  // Timeline events for the active details panel
  const getTaskTimelineEvents = (taskId: string) => {
    return events.filter(e => e.taskId === taskId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Header with quick creation trigger */}
      <div className="flex items-center justify-between">
        <h2 className="font-sans font-bold text-base text-slate-900 tracking-tight">
          AOS Operator Dashboard
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
        >
          <Plus size={14} />
          Deploy New Task
        </button>
      </div>

      {/* Collapsible Telemetry Card */}
      <button
        onClick={() => setShowTelemetry(!showTelemetry)}
        className="flex items-center justify-between w-full p-4 bg-slate-100 hover:bg-slate-200/60 border border-slate-200/80 rounded-2xl transition-all text-left shadow-xs cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-xs text-slate-800 tracking-tight">Active Squad Telemetry & Performance Profiles</h3>
            <p className="text-[10px] text-slate-500 font-mono font-medium">Real-time token distribution, step response latencies, and tool validation yields</p>
          </div>
        </div>
        <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
          {showTelemetry ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {showTelemetry && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          {agents.map((agent) => {
            const planLat = agent.metrics?.latencyPlanningMs && agent.metrics.latencyPlanningMs.length > 0
              ? (agent.metrics.latencyPlanningMs.reduce((a, b) => a + b, 0) / agent.metrics.latencyPlanningMs.length).toFixed(0) : null;
            const implLat = agent.metrics?.latencyImplementationMs && agent.metrics.latencyImplementationMs.length > 0
              ? (agent.metrics.latencyImplementationMs.reduce((a, b) => a + b, 0) / agent.metrics.latencyImplementationMs.length).toFixed(0) : null;
            const qaLat = agent.metrics?.latencyQaMs && agent.metrics.latencyQaMs.length > 0
              ? (agent.metrics.latencyQaMs.reduce((a, b) => a + b, 0) / agent.metrics.latencyQaMs.length).toFixed(0) : null;
            const pmLat = agent.metrics?.latencyProductBriefMs && agent.metrics.latencyProductBriefMs.length > 0
              ? (agent.metrics.latencyProductBriefMs.reduce((a, b) => a + b, 0) / agent.metrics.latencyProductBriefMs.length).toFixed(0) : null;
            const ceoLat = agent.metrics?.latencyCeoMs && agent.metrics.latencyCeoMs.length > 0
              ? (agent.metrics.latencyCeoMs.reduce((a, b) => a + b, 0) / agent.metrics.latencyCeoMs.length).toFixed(0) : null;

            return (
              <div key={agent.id} className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans font-bold text-xs text-slate-800 truncate">{agent.name}</span>
                    <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full border truncate ${
                      agent.id === 'agent-ceo' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      agent.id === 'agent-product-manager' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                      'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {agent.role}
                    </span>
                  </div>

                  {/* Token Info */}
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Recent Tokens</span>
                      <span className="text-slate-700 font-bold">
                        {agent.metrics?.llmCallTokens && agent.metrics.llmCallTokens.length > 0
                          ? `${(agent.metrics.llmCallTokens[agent.metrics.llmCallTokens.length - 1] / 1000).toFixed(0)}k`
                          : '0k'}
                      </span>
                    </div>

                    {/* Latency Info */}
                    <div className="space-y-1 border-t border-slate-200/50 pt-1.5">
                      <p className="text-[9px] font-mono text-slate-400 font-semibold uppercase">Response Latencies</p>
                      {planLat && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Planning:</span>
                          <span className="font-mono font-bold text-slate-700">{planLat}ms</span>
                        </div>
                      )}
                      {implLat && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Coding:</span>
                          <span className="font-mono font-bold text-slate-700">{implLat}ms</span>
                        </div>
                      )}
                      {qaLat && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">QA Scan:</span>
                          <span className="font-mono font-bold text-slate-700">{qaLat}ms</span>
                        </div>
                      )}
                      {pmLat && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Briefing:</span>
                          <span className="font-mono font-bold text-slate-700">{pmLat}ms</span>
                        </div>
                      )}
                      {ceoLat && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Approval:</span>
                          <span className="font-mono font-bold text-slate-700">{ceoLat}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Tool Execution */}
                {agent.metrics?.toolExecutions && agent.metrics.toolExecutions.length > 0 && (
                  <div className="border-t border-slate-200/50 pt-2 space-y-1">
                    <p className="text-[9px] font-mono text-slate-400 font-semibold uppercase">Tool Executions</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.metrics.toolExecutions.slice(0, 2).map((t, i) => {
                        const total = t.successes + t.failures;
                        const rate = total > 0 ? (t.successes / total) * 100 : 0;
                        return (
                          <div key={i} className="text-[9px] font-mono bg-white border border-slate-200 px-1 py-0.5 rounded-md text-slate-600 flex items-center gap-1">
                            <span className="font-semibold">{t.toolName}:</span>
                            <span className={rate > 85 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                              {rate.toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        
        {/* Column helper */}
        {[
          { id: 'backlog', title: 'Task Backlog', status: 'Backlog Queue' },
          { id: 'progress', title: 'In Execution', status: 'Plan & Code' },
          { id: 'qa', title: 'QA Audit', status: 'Validators Scans' },
          { id: 'hitl', title: 'HITL Decisions', status: 'Needs Approval' },
          { id: 'completed', title: 'Deployed & Ready', status: 'Verified Prod' }
        ].map((col) => {
          const colTasks = getColumnTasks(col.id);

          return (
            <div key={col.id} className="flex flex-col min-w-[240px] bg-slate-100/50 border border-slate-200/60 rounded-2xl p-3 space-y-3 h-[calc(100vh-280px)] overflow-y-auto shadow-2xs">
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div>
                  <h3 className="font-sans font-bold text-xs text-slate-800">{col.title}</h3>
                  <p className="font-mono text-[9px] text-slate-400 uppercase font-semibold">{col.status}</p>
                </div>
                <span className="bg-white border border-slate-200 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="p-3.5 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl cursor-pointer transition-all shadow-xs hover:shadow-sm group relative overflow-hidden"
                  >
                    {/* Status accent glow */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      task.status === 'COMPLETED' ? 'bg-emerald-500' :
                      task.status === 'AWAITING_APPROVAL' ? 'bg-orange-400' :
                      task.status === 'ESCALATED' ? 'bg-rose-500' : 'bg-indigo-500'
                    }`} />

                    {/* Meta */}
                    <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-slate-400 mb-1.5">
                      <span className={`px-2 py-0.5 border rounded-full font-semibold uppercase ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={9} />
                        {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="font-sans font-semibold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">
                      {task.title}
                    </h4>

                    {/* Operational badge */}
                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                      <span className={`px-2 py-0.5 border rounded-md font-mono text-[9px] font-semibold tracking-wide ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                      
                      {/* Active developer avatars */}
                      <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500 font-semibold uppercase">
                        {task.status === 'PLANNING' && <span>Alex</span>}
                        {task.status === 'IMPLEMENTING' && <span>Chloe</span>}
                        {task.status === 'QA_REVIEW' && <span>Dave</span>}
                      </div>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-[10px] font-mono text-slate-400 uppercase border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    Queue Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-sans font-bold text-sm text-slate-900">Deploy New Operating Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Load Task Template (Optional)</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-indigo-500 transition-all font-sans cursor-pointer"
                >
                  <option value="">-- No Template Selected --</option>
                  {templates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <p className="text-[10px] text-indigo-600 font-medium font-mono">
                    Template applied. Agent parameter sets pre-filled.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Integrate User Register API"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-medium">Functional Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Clearly outline the requirements and expected outcomes..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Execution Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-sans text-xs font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/10 transition-all"
                >
                  Initiate Autonomous Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-out Panel / Detail Sheets Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono mb-1.5">
                  <span className={`px-2.5 py-0.5 border rounded-full font-semibold uppercase ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  <span className="text-slate-400">Task ID: {selectedTask.id}</span>
                </div>
                <h3 className="font-sans font-bold text-base text-slate-900">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setChangesComment('');
                }}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-all"
              >
                ✕ Close
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Objective */}
              <div className="space-y-1.5">
                <h4 className="font-sans text-[11px] uppercase tracking-wider font-semibold text-slate-400">Operation Objective</h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
                  {selectedTask.description}
                </p>
              </div>

              {/* AGENT COLLABORATION HUB & SANDBOX */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4 shadow-2xs">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-xs text-slate-800 tracking-tight">Agent Collaboration Hub</h4>
                      <p className="text-[9px] text-slate-400 font-mono">Real-time inter-agent message logs and lockable write sandboxes</p>
                    </div>
                  </div>
                  
                  {/* Persona simulation selector */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-[10px]">
                    <span className="text-slate-400 font-mono">Speak as:</span>
                    <select
                      value={senderIdentity}
                      onChange={(e) => setSenderIdentity(e.target.value)}
                      className="font-sans font-bold text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      <option value="user">Operator (You)</option>
                      <option value="agent-product-manager">Pat (PM)</option>
                      <option value="agent-backend-dev">Alex (Backend Dev)</option>
                      <option value="agent-frontend-dev">Chloe (Frontend Dev)</option>
                      <option value="agent-qa-reviewer">Dave (QA Auditor)</option>
                    </select>
                  </div>
                </div>

                {/* Sub Tab selection */}
                <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => { setCollabTab('scratchpad'); setCollabError(null); }}
                    className={`flex-1 py-1.5 text-center font-sans text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      collabTab === 'scratchpad'
                        ? 'bg-white text-indigo-600 shadow-3xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Scratchpad Sandbox
                  </button>
                  <button
                    onClick={() => { setCollabTab('messenger'); setCollabError(null); }}
                    className={`flex-1 py-1.5 text-center font-sans text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      collabTab === 'messenger'
                        ? 'bg-white text-indigo-600 shadow-3xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Direct Messenger ({selectedTask.directMessages?.length || 0})
                  </button>
                </div>

                {/* Error Banner */}
                {collabError && (
                  <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-700 font-semibold font-mono animate-pulse-subtle">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{collabError}</span>
                  </div>
                )}

                {/* TAB 1: SCRATCHPAD SANDBOX */}
                {collabTab === 'scratchpad' && (
                  <div className="space-y-3.5 animate-fadeIn">
                    
                    {/* Lock Status Info */}
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-xl">
                      <div className="flex items-center gap-2">
                        {activeLock ? (
                          <div className="flex items-center gap-1.5 text-amber-600 font-mono text-[10px] font-bold">
                            <Lock className="w-3.5 h-3.5 animate-pulse" />
                            <span>LOCKED BY: {
                              activeLock === 'user' ? 'Operator' : 
                              activeLock === 'agent-product-manager' ? 'Pat (PM)' :
                              activeLock === 'agent-backend-dev' ? 'Alex (Backend Dev)' :
                              activeLock === 'agent-frontend-dev' ? 'Chloe (Frontend Dev)' :
                              activeLock === 'agent-qa-reviewer' ? 'Dave (QA)' : activeLock
                            }</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-mono text-[10px] font-bold">
                            <Unlock className="w-3.5 h-3.5" />
                            <span>UNLOCKED: Shared Workspace</span>
                          </div>
                        )}
                      </div>

                      {/* Lock controls */}
                      <button
                        onClick={handleToggleLock}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg font-sans text-[10px] font-bold transition-all shadow-3xs cursor-pointer ${
                          activeLock
                            ? activeLock === senderIdentity
                              ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                        }`}
                        disabled={!!activeLock && activeLock !== senderIdentity}
                        title={activeLock && activeLock !== senderIdentity ? "This workspace is locked by another agent" : ""}
                      >
                        {activeLock ? (
                          activeLock === senderIdentity ? "Release Lock" : "Locked"
                        ) : "Acquire Edit Lock"}
                      </button>
                    </div>

                    {/* Shared Text Area */}
                    <div className="relative">
                      <textarea
                        rows={6}
                        value={scratchpadText}
                        onChange={(e) => setScratchpadText(e.target.value)}
                        placeholder="Define operational boundaries, schema specs, or direct agent execution notes..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:border-indigo-500 focus:outline-none transition-all resize-none leading-relaxed shadow-3xs"
                        disabled={!!activeLock && activeLock !== senderIdentity}
                      />
                      {activeLock && activeLock !== senderIdentity && (
                        <div className="absolute inset-0 bg-slate-100/30 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center">
                          <p className="bg-slate-900/80 text-white text-[10px] font-mono px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            Acquire Edit Lock to modify sandbox
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Save Action Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveScratchpad}
                        disabled={!!activeLock && activeLock !== senderIdentity}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-sans text-[10px] font-bold rounded-xl transition-all shadow-md shadow-indigo-600/5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save Sandbox State
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: DIRECT MESSENGER */}
                {collabTab === 'messenger' && (
                  <div className="space-y-4 animate-fadeIn">
                    
                    {/* Top Action buttons */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide font-bold">Communication Logs</span>
                      <button
                        onClick={handleTriggerAiDebate}
                        disabled={isConsulting}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 font-sans text-[10px] font-bold rounded-xl transition-all shadow-3xs cursor-pointer disabled:opacity-60"
                      >
                        {isConsulting ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Consulting Squad...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            Simulate AI Consult Debate
                          </>
                        )}
                      </button>
                    </div>

                    {/* Scrolling message feed */}
                    <div className="max-h-48 overflow-y-auto space-y-2.5 border border-slate-200 rounded-xl p-3 bg-white shadow-3xs">
                      {selectedTask.directMessages && selectedTask.directMessages.length > 0 ? (
                        [...selectedTask.directMessages].reverse().map((msg: any) => {
                          // Determine protocol styles
                          let protocolBadge = 'bg-slate-50 text-slate-600 border-slate-200';
                          if (msg.protocol === 'HANDSHAKE_REQUEST') protocolBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                          if (msg.protocol === 'DATA_TRANSMISSION') protocolBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          if (msg.protocol === 'QA_ALERT') protocolBadge = 'bg-rose-50 text-rose-700 border-rose-200';

                          return (
                            <div key={msg.id} className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1.5 hover:bg-slate-50 transition-colors">
                              {/* Message Header */}
                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800">{msg.senderName}</span>
                                  <span className="text-slate-400">➜</span>
                                  <span className="text-slate-600 font-semibold">{msg.recipientName}</span>
                                </div>
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${protocolBadge}`}>
                                  {msg.protocol}
                                </span>
                              </div>
                              
                              {/* Message Content */}
                              <p className="text-[11px] text-slate-700 font-sans leading-relaxed break-words pl-0.5">
                                {msg.content}
                              </p>
                              
                              {/* Timestamp */}
                              <div className="flex justify-end text-[8px] font-mono text-slate-400">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                          <Bot className="w-7 h-7 text-slate-300 animate-bounce mb-1.5" />
                          <p className="text-[10px] font-mono uppercase tracking-wider">No Agent Comms Dispatched</p>
                          <p className="text-[9px] text-slate-400 mt-1">Start simulated debate or compose a direct transmission.</p>
                        </div>
                      )}
                    </div>

                    {/* Compose Messenger Section */}
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Recipient Agent Selector */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Recipient Agent</label>
                          <select
                            value={recipientAgent}
                            onChange={(e) => setRecipientAgent(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-sans font-bold text-slate-700 cursor-pointer"
                          >
                            <option value="user">Operator (Human)</option>
                            <option value="agent-product-manager">Pat (PM)</option>
                            <option value="agent-backend-dev">Alex (Backend Dev)</option>
                            <option value="agent-frontend-dev">Chloe (Frontend Dev)</option>
                            <option value="agent-qa-reviewer">Dave (QA Auditor)</option>
                            <option value="agent-ceo">Sam (CEO)</option>
                          </select>
                        </div>

                        {/* Communication Protocol Selector */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-slate-500 uppercase font-bold">Protocol Type</label>
                          <select
                            value={msgProtocol}
                            onChange={(e: any) => setMsgProtocol(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                          >
                            <option value="COLLABORATION_NOTE">COLLABORATION_NOTE</option>
                            <option value="DATA_TRANSMISSION">DATA_TRANSMISSION</option>
                            <option value="QA_ALERT">QA_ALERT</option>
                            <option value="HANDSHAKE_REQUEST">HANDSHAKE_REQUEST</option>
                          </select>
                        </div>
                      </div>

                      {/* Text Draft Compose Input */}
                      <form onSubmit={handleSendDirectMessage} className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Type direct transmission message..."
                          value={draftMessage}
                          onChange={(e) => setDraftMessage(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none transition-all shadow-3xs"
                        />
                        <button
                          type="submit"
                          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0"
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* OPERATOR HITL ACTION CONTROLS */}
              {selectedTask.status === 'AWAITING_APPROVAL' && (
                <div className="p-4 bg-orange-50/40 border border-orange-200 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-600" />
                    <span className="font-sans font-semibold text-xs text-orange-700">Human-In-The-Loop Decision Required</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Pioneer agents successfully completed the pipeline tasks. Audit code, verify test logs, and select appropriate action.
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-1.5">
                    <button
                      onClick={() => onApproveTask(selectedTask.id).then(() => setSelectedTask(prev => prev ? { ...prev, status: 'COMPLETED' } : null))}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/10 transition-all"
                    >
                      <Check size={13} />
                      Approve to Deploy
                    </button>
                    <button
                      onClick={() => onRejectTask(selectedTask.id).then(() => setSelectedTask(prev => prev ? { ...prev, status: 'REJECTED' } : null))}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-semibold rounded-xl shadow-md shadow-rose-600/10 transition-all"
                    >
                      <XCircle size={13} />
                      Reject Task
                    </button>
                    <button
                      onClick={() => onTerminateTask(selectedTask.id).then(() => setSelectedTask(prev => prev ? { ...prev, status: 'FAILED' } : null))}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-semibold rounded-xl transition-all"
                    >
                      Terminate Execution
                    </button>
                  </div>

                  {/* Changes request text input */}
                  <div className="border-t border-slate-200/60 pt-3.5 space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Request Specific Revisions</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Explain changes needed (e.g. Add validation error responses)..."
                        value={changesComment}
                        onChange={(e) => setChangesComment(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                      />
                      <button
                        onClick={async () => {
                          if (!changesComment.trim()) return;
                          setSubmittingChanges(true);
                          await onRequestChanges(selectedTask.id, changesComment);
                          setSubmittingChanges(false);
                          setSelectedTask(null); // Close panel
                        }}
                        disabled={submittingChanges || !changesComment.trim()}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-sans text-xs font-semibold rounded-xl shadow-md transition-all"
                      >
                        <Send size={12} />
                        Request changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Brief (Pat) */}
              {selectedTask.productBrief && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <BookOpen size={14} className="text-emerald-600" />
                    <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Pat&apos;s Requirements Brief</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                    {sanitizeText(selectedTask.productBrief)}
                  </div>
                </div>
              )}

              {/* Generated Plan (Alex) */}
              {selectedTask.plan && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FileText size={14} className="text-indigo-600" />
                    <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Alex&apos;s Architecture Plan</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                    {sanitizeText(selectedTask.plan)}
                  </div>
                </div>
              )}

              {/* Generated Code (Chloe) */}
              {selectedTask.code && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                       <Code size={14} className="text-violet-600" />
                      <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Chloe&apos;s Compiled Code Output</span>
                    </div>
                    <button
                      onClick={() => copyCodeToClipboard(selectedTask.code!)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-600 rounded-lg transition-all"
                    >
                      {copiedCode ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      {copiedCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="relative">
                    <pre className="p-4 bg-slate-900 border border-slate-950 rounded-xl overflow-x-auto text-xs text-indigo-200 font-mono leading-relaxed">
                      <code>{sanitizeText(selectedTask.code)}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Generated QA Review (Dave) */}
              {selectedTask.qaReview && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle size={14} className="text-amber-600" />
                    <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Dave&apos;s QA & Validation Audit</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                    {sanitizeText(selectedTask.qaReview)}
                  </div>
                </div>
              )}

              {/* Strategic CEO Sign-off (Sam) */}
              {selectedTask.strategicSignoff && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Award size={14} className="text-rose-600" />
                    <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">Sam&apos;s CEO Strategic Sign-off</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                    {sanitizeText(selectedTask.strategicSignoff)}
                  </div>
                </div>
              )}

              {/* Events history OTel trace log for details card */}
              <div className="space-y-2 border-t border-slate-200/80 pt-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Terminal size={14} />
                  <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">OpenTelemetry Lifecycle Traces</span>
                </div>
                
                <div className="space-y-2 font-mono text-[10px]">
                  {getTaskTimelineEvents(selectedTask.id).map((e, idx) => (
                    <div key={e.id} className="flex items-start gap-2.5 py-1">
                      <span className="text-slate-400 whitespace-nowrap">{new Date(e.createdAt).toLocaleTimeString()}</span>
                      <span className="text-indigo-600 font-semibold uppercase">[{e.eventType}]</span>
                      <span className="text-slate-600">
                        {e.payload.message || e.payload.error || e.payload.feedback || `State transition occurred`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
