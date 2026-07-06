import React, { useState } from 'react';
import { Task, TaskStatus, TaskEvent } from '../types';
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
  Award
} from 'lucide-react';

interface CommandCenterProps {
  tasks: Task[];
  events: TaskEvent[];
  onCreateTask: (title: string, description: string, priority: 'low' | 'medium' | 'high', deadline: string) => Promise<void>;
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
  onCreateTask,
  onApproveTask,
  onRejectTask,
  onRequestChanges,
  onTerminateTask
}: CommandCenterProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [changesComment, setChangesComment] = useState('');
  const [submittingChanges, setSubmittingChanges] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDeadline, setNewDeadline] = useState('');

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
      await onCreateTask(newTitle, newDesc, newPriority, newDeadline);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      setNewDeadline('');
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
