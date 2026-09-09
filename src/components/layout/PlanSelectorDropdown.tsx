import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Plus, 
  LayoutGrid, 
  Check, 
  X, 
  Activity, 
  Sparkles, 
  Bot,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopologyStore } from '../../store/useTopologyStore';

interface PlanSelectorDropdownProps {
  onOpenFleetModal?: () => void;
  className?: string;
}

export const PlanSelectorDropdown: React.FC<PlanSelectorDropdownProps> = ({ 
  onOpenFleetModal, 
  className 
}) => {
  const plans = useTopologyStore(s => s.plans);
  const activePlanId = useTopologyStore(s => s.activePlanId);
  const plansList = useTopologyStore(s => s.plansList);
  const switchPlan = useTopologyStore(s => s.switchPlan);
  const createNewPlan = useTopologyStore(s => s.createNewPlan);
  const removePlan = useTopologyStore(s => s.removePlan);
  const theme = useTopologyStore(s => s.theme);

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState('Architect');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = theme !== 'default' && theme !== 'light' && theme !== 'latte';

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus input when creating mode activates
  useEffect(() => {
    if (isCreating) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCreating]);

  // Fallback plans if registry is empty
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

  const activePlan = displayPlans.find(p => p.id === activePlanId) || displayPlans[0];
  const hasBackgroundWork = displayPlans.some(p => p.id !== activePlanId && p.hasActiveWork);

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createNewPlan(newTitle.trim(), newRole);
    setNewTitle('');
    setIsCreating(false);
  };

  return (
    <div ref={dropdownRef} className={`relative select-none ${className || ''}`}>
      {/* Trigger Button: Elevated Paper Style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Active Workflow: ${activePlan.title} (Click to switch plans or open fleet)`}
        className={`h-8 px-2.5 sm:px-3 rounded-xl flex items-center gap-2 transition-all border-none cursor-pointer shadow-elevated-xs select-none max-w-[200px] sm:max-w-[260px] md:max-w-[320px] ${
          isOpen
            ? isDark
              ? 'bg-cat-mocha-surface1 text-white shadow-elevated-sm'
              : 'bg-white text-slate-900 shadow-elevated-sm'
            : isDark
            ? 'bg-white/5 hover:bg-white/10 text-cat-mocha-text'
            : 'bg-black/5 hover:bg-black/10 text-slate-800'
        }`}
      >
        {/* Active Agent Avatar with Active Aura */}
        <div className="relative flex items-center justify-center shrink-0">
          <span className="text-sm">{activePlan.agentAvatar || '🤖'}</span>
          {activePlan.hasActiveWork && (
            <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
              <span 
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: activePlan.agentColor || '#1a73e8' }}
              />
              <span 
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: activePlan.agentColor || '#1a73e8' }}
              />
            </span>
          )}
        </div>

        {/* Plan Title (Truncated) */}
        <span className="font-medium text-xs truncate text-left flex-1">
          {activePlan.title}
        </span>

        {/* Progress Pill */}
        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold shrink-0 ${
          activePlan.progressPercent === 100
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
        }`}>
          {activePlan.completedCount}/{activePlan.nodeCount}
        </span>

        {/* Background Activity Beacon Dot */}
        {hasBackgroundWork && (
          <span className="relative flex h-2 w-2 shrink-0" title="Other background agents are actively working">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        )}

        {/* Subtle Chevron */}
        <ChevronDown 
          size={12} 
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Elevated Borderless Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 w-80 sm:w-96 rounded-2xl p-2.5 bg-white/95 dark:bg-[#181a24]/95 shadow-elevated-2xl backdrop-blur-2xl z-50 border-none select-none flex flex-col gap-1.5"
          >
            {/* Header: Title & Fleet Matrix Launcher */}
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Workflows
                </span>
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8]">
                  {displayPlans.length}
                </span>
              </div>

              {onOpenFleetModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFleetModal();
                  }}
                  title="Open Multi-Plan Fleet Matrix grid view"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#1a73e8]/10 transition-colors border-none cursor-pointer"
                >
                  <LayoutGrid size={12} />
                  <span>Fleet Matrix</span>
                </button>
              )}
            </div>

            {/* List of Registered Plans */}
            <div className="max-h-64 overflow-y-auto no-scrollbar flex flex-col gap-1 pr-0.5">
              {displayPlans.map((plan) => {
                const isActive = plan.id === activePlanId;
                const agentColor = plan.agentColor || '#1a73e8';

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      switchPlan(plan.id);
                      setIsOpen(false);
                    }}
                    className={`group relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isActive
                        ? isDark
                          ? 'bg-cat-mocha-surface1 text-white shadow-elevated-xs'
                          : 'bg-slate-100 text-slate-900 shadow-elevated-xs'
                        : isDark
                        ? 'hover:bg-white/5 text-cat-mocha-subtext0'
                        : 'hover:bg-black/5 text-slate-700'
                    }`}
                  >
                    {/* Left: Avatar & Text */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative flex items-center justify-center shrink-0 w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 text-sm">
                        <span>{plan.agentAvatar || '🤖'}</span>
                        {plan.hasActiveWork && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
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

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs truncate font-medium ${isActive ? 'font-bold text-slate-900 dark:text-white' : ''}`}>
                            {plan.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <span>{plan.agentRole || 'Worker'}</span>
                          <span>•</span>
                          <span>{plan.completedCount}/{plan.nodeCount} tasks ({plan.progressPercent}%)</span>
                        </div>

                        {/* Mini Thought Snippet */}
                        {plan.latestThought && (
                          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate italic flex items-center gap-1">
                            <Activity size={10} className="text-[#1a73e8] shrink-0" />
                            <span className="truncate">"{plan.latestThought}"</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Active Checkmark & Delete Option */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}

                      {displayPlans.length > 1 && !isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePlan(plan.id);
                          }}
                          title="Delete plan"
                          className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-all border-none cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-black/5 dark:bg-white/10 my-0.5" />

            {/* Footer: Create New Plan */}
            {isCreating ? (
              <form onSubmit={handleCreatePlan} className="flex flex-col gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Plan title (e.g. Auth Service Refactor)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#12141d] text-slate-800 dark:text-slate-200 outline-none border-none shadow-xs"
                />
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-white dark:bg-[#12141d] text-slate-700 dark:text-slate-300 border-none outline-none shadow-xs"
                  >
                    <option value="Architect">🧠 Architect</option>
                    <option value="FrontendArchitect">🎨 Frontend</option>
                    <option value="CodeGenerator">🤖 Coder</option>
                    <option value="SecurityAnalyst">🛡️ Security</option>
                    <option value="DevOpsEngineer">⚡ DevOps</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors border-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-[#1a73e8] text-white text-xs font-semibold hover:bg-[#1557b0] transition-colors border-none cursor-pointer shadow-xs"
                    >
                      Add Plan
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full h-8 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] hover:bg-[#1a73e8]/5 transition-colors border-none cursor-pointer"
              >
                <Plus size={13} />
                <span>Create New Plan</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
