import React, { useState } from 'react';
import { BudgetTransaction, ThermalThrottleStatus } from '../types';
import { Flame, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';

interface BudgetLedgerProps {
  transactions: BudgetTransaction[];
  thermalConfig: ThermalThrottleStatus;
  onUpdateThermalThrottle: (enabled: boolean) => Promise<void>;
  spendByModel: { [model: string]: number };
  spendByAgent: { [agentId: string]: number };
}

export default function BudgetLedger({
  transactions,
  thermalConfig,
  onUpdateThermalThrottle,
  spendByModel,
  spendByAgent
}: BudgetLedgerProps) {
  const [updating, setUpdating] = useState(false);

  const getThrottleBadgeColor = (level: string) => {
    switch (level) {
      case 'none':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'light':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'moderate':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'severe':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const toggleThrottle = async () => {
    setUpdating(true);
    try {
      await onUpdateThermalThrottle(!thermalConfig.enabled);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top row: Thermal throttle info & custom charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Thermal cost degradation panel */}
        <div className="lg:col-span-1 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Flame className="text-orange-500 w-5 h-5 animate-pulse" />
              <h3 className="font-sans font-bold text-sm text-slate-800">Thermal Throttling Gate</h3>
            </div>
            <button
              onClick={toggleThrottle}
              disabled={updating}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all border ${
                thermalConfig.enabled
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200/60'
              }`}
            >
              {thermalConfig.enabled ? 'ACTIVE' : 'BYPASSED'}
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Utilization status */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-semibold">Core Budget Utilization</span>
                <span className="text-slate-800 font-bold font-mono">
                  {thermalConfig.utilizationPercent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-orange-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${Math.min(thermalConfig.utilizationPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Level status */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-xs text-slate-500 font-semibold">Degradation Phase</span>
              <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold tracking-wide uppercase font-mono ${getThrottleBadgeColor(thermalConfig.throttleLevel)}`}>
                {thermalConfig.throttleLevel}
              </span>
            </div>

            {/* Recommendations */}
            <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/80 rounded-xl text-[11px] leading-relaxed text-slate-600">
              <p className="font-bold text-slate-800 font-sans mb-1">Impact Analysis</p>
              <p>{thermalConfig.message}</p>
              <div className="mt-2 text-[10px] font-mono text-indigo-600 space-y-1 border-t border-indigo-100/60 pt-1.5">
                <div>Recommended: {thermalConfig.recommendedModels.join(', ')}</div>
                <div>Token Multiplier: {thermalConfig.tokenLimitMultiplier}x</div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom spend charts */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-800 mb-4">
              Real-Time Spend Distribution Metrics
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Agent Costs */}
              <div className="space-y-3">
                <h4 className="font-sans text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  By AI Agent ($ spent)
                </h4>
                <div className="space-y-2">
                  {Object.entries(spendByAgent).map(([agentId, val]) => (
                    <div key={agentId} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500">{agentId.replace('agent-', '')}</span>
                        <span className="text-slate-800 font-bold">${val.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${Math.min((val / 5) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Costs */}
              <div className="space-y-3">
                <h4 className="font-sans text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  By Model Tier ($ spent)
                </h4>
                <div className="space-y-2">
                  {Object.entries(spendByModel).length === 0 ? (
                    <div className="text-[10px] text-slate-400 font-mono py-2">No transaction cost logs compiled yet.</div>
                  ) : (
                    Object.entries(spendByModel).map(([model, val]) => (
                      <div key={model} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-500">{model}</span>
                          <span className="text-slate-800 font-bold">${val.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full">
                          <div
                            className="h-full bg-orange-400 rounded-full"
                            style={{ width: `${Math.min((val / 3) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-500 mt-4">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span>Budget ledger audit compliant with standard full-stack operational contracts.</span>
          </div>
        </div>

      </div>

      {/* Transactions Ledger Log */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <h3 className="font-sans font-bold text-sm text-slate-800 mb-4">
          Transactional Cost Ledger
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase">
                <th className="pb-2.5 font-bold">Tx ID</th>
                <th className="pb-2.5 font-bold">Agent</th>
                <th className="pb-2.5 font-bold">Task</th>
                <th className="pb-2.5 font-bold">Model</th>
                <th className="pb-2.5 font-bold">Tokens</th>
                <th className="pb-2.5 font-bold text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">No transactions recorded.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 text-slate-400">{tx.id.replace('tx-', '')}</td>
                    <td className="py-2.5 font-bold text-indigo-600">
                      {tx.agentId.replace('agent-', '')}
                    </td>
                    <td className="py-2.5 text-slate-600">{tx.taskId.replace('task-', '#')}</td>
                    <td className="py-2.5 text-slate-500">{tx.model}</td>
                    <td className="py-2.5 text-slate-500">{tx.tokensUsed.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-emerald-600 font-bold">${tx.costUsd.toFixed(4)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
