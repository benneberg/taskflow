import React, { useState } from 'react';
import { TaskEvent } from '../types';
import { Terminal, Layers, Cpu } from 'lucide-react';

interface ThoughtStreamProps {
  events: TaskEvent[];
}

export default function ThoughtStream({ events }: ThoughtStreamProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'agent') return e.agentId !== null;
    if (filter === 'system') return e.agentId === null;
    if (filter === 'errors') return e.eventType === 'TEST_FAILED' || e.eventType === 'CIRCUIT_BREAKER_TRIPPED';
    return true;
  });

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'TASK_CREATED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'PLANNING_STARTED':
      case 'PLANNING_COMPLETED':
        return 'bg-sky-50 text-sky-700 border-sky-200/80';
      case 'IMPLEMENTING_STARTED':
      case 'CODE_COMMITTED':
        return 'bg-violet-50 text-violet-700 border-violet-200/80';
      case 'QA_REVIEW_STARTED':
      case 'QA_COMPLETED':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'CIRCUIT_BREAKER_TRIPPED':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 animate-pulse';
      case 'APPROVED':
        return 'bg-teal-50 text-teal-700 border-teal-200/80';
      case 'REQUEST_CHANGES':
        return 'bg-orange-50 text-orange-700 border-orange-200/80';
      case 'THOUGHT_LOG':
        return 'bg-slate-50 text-slate-600 border-slate-200/60';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-slate-50 border-b border-slate-200/80 gap-3">
        <div className="flex items-center gap-2.5">
          <Terminal className="text-indigo-600 w-5 h-5 animate-pulse" />
          <h2 className="font-sans font-bold text-sm text-slate-900 tracking-tight">
            The Blackboard — Thought Stream & Traces
          </h2>
        </div>
        
        {/* Filter buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/60 shadow-2xs">
          {['all', 'agent', 'system', 'errors'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md font-mono text-[10px] uppercase font-bold transition-all ${
                filter === f
                  ? 'bg-white text-indigo-600 shadow-2xs border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stream Terminal Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs max-h-[calc(100vh-280px)]">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-12 bg-slate-50/30 rounded-xl border border-dashed border-slate-200/60">
            <Layers size={32} className="opacity-40 animate-pulse-subtle" />
            <p className="text-[11px] font-mono uppercase tracking-wide">Stream connection idle. Awaiting agentic triggers...</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="p-3 bg-white border border-slate-100 hover:border-slate-200 rounded-xl shadow-2xs transition-all space-y-2"
            >
              {/* Event Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${getEventBadge(event.eventType)}`}>
                    {event.eventType}
                  </span>
                  <span>v{event.version}</span>
                  {event.agentId && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Cpu size={10} className="text-indigo-600" />
                      {event.agentId.replace('agent-', '')}
                    </span>
                  )}
                </div>
                <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
              </div>

              {/* Event Description */}
              <div className="text-slate-700 leading-relaxed break-words text-[11px]">
                {event.eventType === 'THOUGHT_LOG' ? (
                  <span className="text-indigo-700 italic font-sans bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100/40 block">💭 &quot;{event.payload.monologue}&quot;</span>
                ) : (
                  event.payload.message || event.payload.error || event.payload.feedback || `State transition occurred: ${event.eventType}`
                )}
              </div>

              {/* Payload details if exists */}
              {Object.keys(event.payload).some(k => k !== 'message' && k !== 'error' && k !== 'feedback' && k !== 'monologue') && (
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-950 text-[10px] text-indigo-200">
                  <pre className="overflow-x-auto">
                    {JSON.stringify(
                      Object.keys(event.payload)
                        .filter(k => k !== 'message' && k !== 'error' && k !== 'feedback' && k !== 'monologue')
                        .reduce((obj: any, key) => {
                          obj[key] = event.payload[key];
                          return obj;
                        }, {}),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {/* Causation / Correlation */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-1.5 mt-1">
                <span>Trig: {event.triggeredBy || 'Engine'}</span>
                <span>Corr: {event.correlationId.substr(0, 10)}...</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
