import React, { useState, useRef } from 'react';
import { 
  Plus, 
  LayoutGrid, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Radio,
  ChevronRight,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopologyStore } from '../../store/useTopologyStore';
import { PlanSummary } from '../../types/topology';

interface PlanWorkspaceTabsProps {
  onOpenFleetModal?: () => void;
}

export const PlanWorkspaceTabs: React.FC<PlanWorkspaceTabsProps> = ({ onOpenFleetModal }) => {
  const plans = useTopologyStore(s => s.plans);
  const activePlanId = useTopologyStore(s => s.activePlanId);
  const plansList = useTopologyStore(s => s.plansList);
  const switchPlan = useTopologyStore(s => s.switchPlan);
  const createNewPlan = useTopologyStore(s => s.createNewPlan);
  const removePlan = useTopologyStore(s => s.removePlan);
  const theme = useTopologyStore(s => s.theme);

  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState('Architect');
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = theme !== 'default' && theme !== 'light' && theme !== 'latte';

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewTitle('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleConfirmCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) {
      setIsCreating(false);
      return;
    }
    createNewPlan(newTitle.trim(), newRole);
    setIsCreating(false);
    setNewTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTitle('');
    }
  };

  // Ensure at least the active plan is represented if plansList is empty
  const displayPlans = plansList.length > 0 ? plansList : [
    {
      id: activePlanId || 'default',
      title: plans[activePlanId]?.title || 'Main Plan',
      agentRole: plans[activePlanId]?.agentRole || 'Lead Orchestrator',
      agentAvatar: plans[activePlanId]?.agentAvatar || '🧠',
      agentColor: plans[activePlanId]?.agentColor || '#1a73e8',
      nodeCount: (plans[activePlanId]?.nodes || []).length,
      completedCount: (plans[activePlanId]?.nodes || []).filter(n => n.status === 'completed').length,
      inProgressCount: (plans[activePlanId]?.nodes || []).filter(n => n.status === 'in_progress').length,
      progressPercent: 0,
      updatedAt: Date.now(),
      status: 'active' as const,
      hasActiveWork: false,
    }
  ];

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar select-none z-20 transition-colors duration-200">
      {/* Fleet Overview Matrix Trigger */}
      <button
        type="button"
        onClick={onOpenFleetModal}
        title="Open Multi-Plan Fleet Matrix (View all concurrent agent DAGs)"
        className={`h-7 px-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-elevated-xs shrink-0 ${
          isDark
            ? 'bg-cat-mocha-surface0/90 text-cat-mocha-text hover:bg-cat-mocha-surface1'
            : 'bg-white/95 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <LayoutGrid size={13} className="text-[#1a73e8] dark:text-[#8ab4f8]" />
        <span className="hidden sm:inline">Fleet</span>
        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8]">
          {displayPlans.length}
        </span>
      </button>

      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700/60 mx-0.5 shrink-0" />

      {/* Plan Pills Tab Ribbon */}
      <div className="flex items-center gap-1.5">
        {displayPlans.map((plan) => {
          const isActive = plan.id === activePlanId;
          const isHovered = hoveredPlanId === plan.id;
          const isWorking = plan.hasActiveWork;
          const agentColor = plan.agentColor || '#1a73e8';

          return (
            <div
              key={plan.id}
              className="relative group shrink-0"
              onMouseEnter={() => setHoveredPlanId(plan.id)}
              onMouseLeave={() => setHoveredPlanId(null)}
            >
              <button
                type="button"
                onClick={() => switchPlan(plan.id)}
                className={`h-7.5 px-2.5 rounded-xl text-xs flex items-center gap-2 transition-all border-none cursor-pointer select-none text-left relative overflow-hidden ${
                  isActive
                    ? isDark
                      ? 'bg-cat-mocha-surface1 text-cat-mocha-text font-bold shadow-elevated-sm'
                      : 'bg-white text-slate-900 font-bold shadow-elevated-sm'
                    : isDark
                    ? 'bg-cat-mocha-surface0/70 hover:bg-cat-mocha-surface0 text-cat-mocha-subtext0 font-medium shadow-elevated-xs'
                    : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 font-medium shadow-elevated-xs'
                }`}
                style={{
                  boxShadow: isActive
                    ? `0 0 16px -2px ${agentColor}40, 0 3px 8px -2px rgba(0,0,0,0.15)`
                    : undefined,
                }}
              >
                {/* Active Plan Radiant Glow Backdrop */}
                {isActive && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-15 dark:opacity-25"
                    style={{
                      background: `linear-gradient(90deg, ${agentColor} 0%, transparent 80%)`,
                    }}
                  />
                )}

                {/* Agent Avatar with optional active ping */}
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="text-sm">{plan.agentAvatar || '🤖'}</span>
                  {isWorking && (
                    <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
                      <span 
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: agentColor }}
                      />
                      <span 
                        className="relative inline-flex rounded-full h-2 w-2"
                        style={{ backgroundColor: agentColor }}
                      />
                    </span>
                  )}
                </div>

                {/* Plan Title */}
                <span className="truncate max-w-[130px] sm:max-w-[170px] text-xs">
                  {plan.title}
                </span>

                {/* Progress Mini Badge */}
                <div className="flex items-center gap-1 shrink-0 ml-0.5">
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-semibold ${
                    plan.progressPercent === 100
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : isActive
                      ? 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                      : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                  }`}>
                    {plan.completedCount}/{plan.nodeCount}
                  </span>
                </div>

                {/* Close Button (if more than 1 plan) */}
                {displayPlans.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePlan(plan.id);
                    }}
                    title="Delete this workflow plan"
                    className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/15 transition-opacity border-none cursor-pointer ml-0.5"
                  >
                    <X size={11} />
                  </button>
                )}
              </button>

              {/* Hover Popover with Live Telemetry Snippet */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-72 rounded-2xl p-3 bg-white dark:bg-[#181a24] shadow-elevated-xl backdrop-blur-2xl z-50 border-none pointer-events-none"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{plan.agentAvatar || '🤖'}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {plan.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {plan.agentRole || 'Specialist Worker'}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        plan.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : plan.hasActiveWork
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                      }`}>
                        {plan.status === 'completed' ? 'Completed' : plan.hasActiveWork ? 'In Progress' : 'Idle'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${plan.progressPercent}%`,
                          backgroundColor: plan.progressPercent === 100 ? '#10b981' : agentColor,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>Tasks: {plan.completedCount} / {plan.nodeCount} completed</span>
                      <span className="font-bold">{plan.progressPercent}%</span>
                    </div>

                    {/* Live Thought Snippet */}
                    {plan.latestThought && (
                      <div className="mt-1 p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-[10px] text-slate-600 dark:text-slate-300 italic flex items-start gap-1.5">
                        <Activity size={12} className="text-[#1a73e8] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">"{plan.latestThought}"</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Quick Add Plan Form / Button */}
        {isCreating ? (
          <form
            onSubmit={handleConfirmCreate}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white dark:bg-[#181a24] shadow-elevated-md shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Plan name..."
              className="w-28 sm:w-36 text-xs px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-slate-900 dark:text-white border-none outline-none"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="text-[11px] px-1.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-none outline-none"
            >
              <option value="Architect">🧠 Architect</option>
              <option value="FrontendArchitect">🎨 Frontend</option>
              <option value="CodeGenerator">🤖 Coder</option>
              <option value="SecurityAnalyst">🛡️ Security</option>
              <option value="DevOpsEngineer">⚡ DevOps</option>
            </select>
            <button
              type="submit"
              className="px-2 py-1 rounded-lg bg-[#1a73e8] text-white text-xs font-semibold hover:bg-[#1557b0] transition-colors border-none cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border-none cursor-pointer"
            >
              <X size={12} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={handleStartCreate}
            title="Create a new concurrent agent workflow plan"
            className={`h-7 px-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-all border-none cursor-pointer shrink-0 ${
              isDark
                ? 'bg-cat-mocha-surface0/50 hover:bg-cat-mocha-surface0 text-cat-mocha-subtext0 hover:text-white'
                : 'bg-black/5 hover:bg-black/10 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus size={13} />
            <span className="hidden md:inline">New Plan</span>
          </button>
        )}
      </div>
    </div>
  );
};
