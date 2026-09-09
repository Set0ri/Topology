import React, { useState } from 'react';
import { 
  X, 
  LayoutGrid, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Download, 
  Trash2, 
  Layers, 
  ArrowRight,
  ExternalLink,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopologyStore } from '../../store/useTopologyStore';
import { PlanSummary } from '../../types/topology';

interface MultiPlanFleetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiPlanFleetModal: React.FC<MultiPlanFleetModalProps> = ({ isOpen, onClose }) => {
  const plans = useTopologyStore(s => s.plans);
  const activePlanId = useTopologyStore(s => s.activePlanId);
  const plansList = useTopologyStore(s => s.plansList);
  const switchPlan = useTopologyStore(s => s.switchPlan);
  const removePlan = useTopologyStore(s => s.removePlan);
  const createNewPlan = useTopologyStore(s => s.createNewPlan);
  const theme = useTopologyStore(s => s.theme);

  const [searchFilter, setSearchFilter] = useState('');
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanRole, setNewPlanRole] = useState('Architect');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const isDark = theme !== 'default' && theme !== 'light' && theme !== 'latte';

  const displayList = plansList.length > 0 ? plansList : Object.values(plans).map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    agentId: p.agentId,
    agentName: p.agentName,
    agentRole: p.agentRole,
    agentAvatar: p.agentAvatar,
    agentColor: p.agentColor,
    nodeCount: (p.nodes || []).length,
    completedCount: (p.nodes || []).filter(n => n.status === 'completed').length,
    inProgressCount: (p.nodes || []).filter(n => n.status === 'in_progress').length,
    progressPercent: (p.nodes || []).length > 0 ? Math.round(((p.nodes || []).filter(n => n.status === 'completed').length / (p.nodes || []).length) * 100) : 0,
    updatedAt: p.updatedAt,
    status: p.status || 'active',
    latestThought: p.latestThought,
    activeTool: p.activeTool,
    hasActiveWork: (p.nodes || []).some(n => n.status === 'in_progress'),
  }));

  const filteredPlans = displayList.filter(p => 
    p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.agentRole || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.id.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalTasks = displayList.reduce((acc, p) => acc + p.nodeCount, 0);
  const totalCompleted = displayList.reduce((acc, p) => acc + p.completedCount, 0);
  const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) return;
    const id = createNewPlan(newPlanTitle.trim(), newPlanRole);
    switchPlan(id);
    setIsAdding(false);
    setNewPlanTitle('');
    onClose();
  };

  const handleExportPlan = (planId: string) => {
    const target = plans[planId];
    if (!target) return;
    const json = JSON.stringify(target, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan_${planId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
        {/* Soft Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-elevated-2xl z-10 border-none ${
            isDark
              ? 'bg-[#181a24]/95 text-white backdrop-blur-2xl'
              : 'bg-white/95 text-slate-900 backdrop-blur-2xl'
          }`}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-none bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#9334e6] flex items-center justify-center text-white shadow-elevated-sm shrink-0">
                <LayoutGrid size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Multi-Agent Workflow Fleet
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {displayList.length} concurrent agent plans running on server • {totalCompleted}/{totalTasks} tasks complete ({overallProgress}%)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="h-8 px-3 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center gap-1.5 transition-colors border-none cursor-pointer shadow-elevated-xs"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">New Agent Plan</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Create Drawer */}
          {isAdding && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleCreateSubmit}
              className="p-4 bg-slate-50 dark:bg-white/5 border-none flex flex-wrap items-center gap-2.5"
            >
              <input
                type="text"
                autoFocus
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                placeholder="Workflow plan name (e.g. Microservice Migration)..."
                className="flex-1 min-w-[200px] text-xs px-3 py-2 rounded-xl bg-white dark:bg-[#10121a] text-slate-900 dark:text-white border-none outline-none shadow-elevated-xs"
              />
              <select
                value={newPlanRole}
                onChange={(e) => setNewPlanRole(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl bg-white dark:bg-[#10121a] text-slate-700 dark:text-slate-300 border-none outline-none shadow-elevated-xs"
              >
                <option value="Architect">🧠 Architect</option>
                <option value="FrontendArchitect">🎨 Frontend Architect</option>
                <option value="CodeGenerator">🤖 Code Generator</option>
                <option value="SecurityAnalyst">🛡️ Security Analyst</option>
                <option value="DevOpsEngineer">⚡ DevOps Engineer</option>
              </select>
              <button
                type="submit"
                className="h-8 px-4 rounded-xl text-xs font-semibold bg-[#1a73e8] text-white hover:bg-[#1557b0] transition-colors border-none cursor-pointer shadow-elevated-xs"
              >
                Launch Plan
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="h-8 px-3 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none cursor-pointer"
              >
                Cancel
              </button>
            </motion.form>
          )}

          {/* Search Filter Bar */}
          <div className="px-4 sm:px-5 py-2.5 bg-black/[0.01] dark:bg-white/[0.01] flex items-center justify-between gap-3">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search plans by title, role, or ID..."
              className="w-full max-w-sm text-xs px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-slate-900 dark:text-white border-none outline-none"
            />
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
              Showing {filteredPlans.length} of {displayList.length} plans
            </div>
          </div>

          {/* Plan Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPlans.map((plan) => {
              const isActive = plan.id === activePlanId;
              const agentColor = plan.agentColor || '#1a73e8';

              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-2xl flex flex-col justify-between transition-all border-none relative overflow-hidden ${
                    isActive
                      ? isDark
                        ? 'bg-cat-mocha-surface1 shadow-elevated-md ring-2 ring-[#1a73e8]/50'
                        : 'bg-white shadow-elevated-md ring-2 ring-[#1a73e8]/50'
                      : isDark
                      ? 'bg-cat-mocha-surface0/60 hover:bg-cat-mocha-surface0/90 shadow-elevated-xs'
                      : 'bg-white/80 hover:bg-white shadow-elevated-xs'
                  }`}
                >
                  {/* Active Aura Accent */}
                  {isActive && (
                    <div 
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: agentColor }}
                    />
                  )}

                  <div>
                    {/* Top Header: Avatar, Role, Status & Actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl shrink-0">{plan.agentAvatar || '🤖'}</span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug flex items-center gap-1.5">
                            {plan.title}
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-[#1a73e8] text-white uppercase tracking-wider">
                                Current
                              </span>
                            )}
                          </h3>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {plan.agentRole || 'Autonomous Agent'} • <span className="font-mono text-[10px]">{plan.id}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        plan.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : plan.hasActiveWork
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                      }`}>
                        {plan.status === 'completed' ? 'Completed' : plan.hasActiveWork ? 'In Progress' : 'Idle'}
                      </span>
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                        {plan.description}
                      </p>
                    )}

                    {/* Progress Bar & Stats */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Progress</span>
                        <span className="font-bold font-mono">{plan.completedCount} / {plan.nodeCount} tasks ({plan.progressPercent}%)</span>
                      </div>
                      <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${plan.progressPercent}%`,
                            backgroundColor: plan.progressPercent === 100 ? '#10b981' : agentColor,
                          }}
                        />
                      </div>
                    </div>

                    {/* Live Active Thought */}
                    {plan.latestThought && (
                      <div className="p-2 rounded-xl bg-black/[0.03] dark:bg-white/5 text-[11px] text-slate-600 dark:text-slate-300 italic flex items-start gap-1.5 mb-3">
                        <Activity size={13} className="text-[#1a73e8] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">"{plan.latestThought}"</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleExportPlan(plan.id)}
                        title="Export plan as JSON"
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors border-none cursor-pointer"
                      >
                        <Download size={13} />
                      </button>
                      {displayList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlan(plan.id)}
                          title="Delete plan"
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors border-none cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isActive}
                      onClick={() => {
                        switchPlan(plan.id);
                        onClose();
                      }}
                      className={`h-7.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-elevated-xs ${
                        isActive
                          ? 'bg-black/5 dark:bg-white/5 text-slate-400 cursor-default'
                          : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'
                      }`}
                    >
                      <span>{isActive ? 'Currently Viewing' : 'Switch to Canvas'}</span>
                      {!isActive && <ArrowRight size={12} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
