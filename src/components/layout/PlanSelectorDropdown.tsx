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
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  FileText,
  Pause,
  Play,
  Archive,
  Ban,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopologyStore } from '../../store/useTopologyStore';
import { PlanStatus } from '../../types/topology';

interface PlanSelectorDropdownProps {
  onOpenFleetModal?: () => void;
  className?: string;
}

type PlanViewTab = 'active' | 'paused' | 'completed' | 'archived' | 'abandoned' | 'all';

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
  const completePlan = useTopologyStore(s => s.completePlan);
  const reactivatePlan = useTopologyStore(s => s.reactivatePlan);
  const pausePlan = useTopologyStore(s => s.pausePlan);
  const resumePlan = useTopologyStore(s => s.resumePlan);
  const archivePlan = useTopologyStore(s => s.archivePlan);
  const abandonPlan = useTopologyStore(s => s.abandonPlan);
  const theme = useTopologyStore(s => s.theme);

  const [isOpen, setIsOpen] = useState(false);
  const [viewTab, setViewTab] = useState<PlanViewTab>('active');
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
      status: 'active' as PlanStatus,
      hasActiveWork: false,
    }
  ];

  const activePlan = displayPlans.find(p => p.id === activePlanId) || displayPlans[0];
  const hasBackgroundWork = displayPlans.some(p => p.id !== activePlanId && p.hasActiveWork);

  // Filter plans across all lifecycle states
  const activePlans = displayPlans.filter(p => p.status === 'active' || !p.status);
  const pausedPlans = displayPlans.filter(p => p.status === 'paused' || p.status === 'inactive');
  const completedPlans = displayPlans.filter(p => p.status === 'completed');
  const archivedPlans = displayPlans.filter(p => p.status === 'archived');
  const abandonedPlans = displayPlans.filter(p => p.status === 'abandoned');

  let visiblePlans = displayPlans;
  if (viewTab === 'active') visiblePlans = activePlans;
  else if (viewTab === 'paused') visiblePlans = pausedPlans;
  else if (viewTab === 'completed') visiblePlans = completedPlans;
  else if (viewTab === 'archived') visiblePlans = archivedPlans;
  else if (viewTab === 'abandoned') visiblePlans = abandonedPlans;

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createNewPlan(newTitle.trim(), newRole);
    setNewTitle('');
    setIsCreating(false);
  };

  const renderStatusBadge = (status?: PlanStatus, countDone = 0, countTotal = 0) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shadow-xs">
            <CheckCircle2 size={10} />
            <span className="hidden xs:inline">Done</span>
          </span>
        );
      case 'paused':
      case 'inactive':
        return (
          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-0.5 shadow-xs">
            <Pause size={9} />
            <span className="hidden xs:inline">Paused</span>
          </span>
        );
      case 'archived':
        return (
          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold shrink-0 bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center gap-0.5 shadow-xs">
            <Archive size={9} />
            <span className="hidden xs:inline">Archived</span>
          </span>
        );
      case 'abandoned':
        return (
          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold shrink-0 bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-0.5 shadow-xs">
            <Ban size={9} />
            <span className="hidden xs:inline">Abandoned</span>
          </span>
        );
      case 'active':
      default:
        return (
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold shrink-0 ${
            countDone === countTotal && countTotal > 0
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}>
            {countDone}/{countTotal}
          </span>
        );
    }
  };

  return (
    <div ref={dropdownRef} className={`relative select-none min-w-0 ${className || ''}`}>
      {/* Trigger Button: Elevated Paper Style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Active Plan: ${activePlan.title} (${activePlan.status || 'active'}) (Click to switch plans or open fleet)`}
        className={`h-8 px-2 sm:px-2.5 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all border-none cursor-pointer shadow-elevated-xs select-none min-w-0 w-full max-w-[125px] xs:max-w-[160px] sm:max-w-[210px] md:max-w-[270px] lg:max-w-[320px] ${
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
          <span className="text-sm">
            {activePlan.status === 'completed' 
              ? '🏁' 
              : activePlan.status === 'abandoned' 
              ? '⛔' 
              : (activePlan.agentAvatar || '🤖')}
          </span>
          {(!activePlan.status || activePlan.status === 'active') && activePlan.hasActiveWork && (
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
        <span className="font-medium text-xs truncate text-left flex-1 min-w-0">
          {activePlan.title}
        </span>

        {/* Progress or Status Pill */}
        {renderStatusBadge(activePlan.status, activePlan.completedCount, activePlan.nodeCount)}

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
            className="absolute top-full left-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl p-2.5 bg-white/95 dark:bg-[#181a24]/95 shadow-elevated-2xl backdrop-blur-2xl z-50 border-none select-none flex flex-col gap-1.5"
          >
            {/* Header: Segmented Filter Tabs & Fleet Matrix Launcher */}
            <div className="flex items-center justify-between px-1 py-1 gap-1">
              <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar max-w-[calc(100%-4.5rem)]">
                <button
                  type="button"
                  onClick={() => setViewTab('active')}
                  className={`px-2 py-0.5 rounded-lg transition-all border-none cursor-pointer text-[10px] font-medium flex items-center gap-1 shrink-0 ${
                    viewTab === 'active'
                      ? 'bg-white dark:bg-[#202434] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <span>Active</span>
                  <span className="px-1 py-0.1 rounded text-[9px] bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8]">
                    {activePlans.length}
                  </span>
                </button>

                {pausedPlans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewTab('paused')}
                    className={`px-2 py-0.5 rounded-lg transition-all border-none cursor-pointer text-[10px] font-medium flex items-center gap-1 shrink-0 ${
                      viewTab === 'paused'
                        ? 'bg-white dark:bg-[#202434] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Pause size={9} className="text-amber-500" />
                    <span>Paused</span>
                    <span className="px-1 py-0.1 rounded text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {pausedPlans.length}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewTab('completed')}
                  className={`px-2 py-0.5 rounded-lg transition-all border-none cursor-pointer text-[10px] font-medium flex items-center gap-1 shrink-0 ${
                    viewTab === 'completed'
                      ? 'bg-white dark:bg-[#202434] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 size={9} className="text-emerald-500" />
                  <span>Done</span>
                  <span className="px-1 py-0.1 rounded text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {completedPlans.length}
                  </span>
                </button>

                {archivedPlans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewTab('archived')}
                    className={`px-2 py-0.5 rounded-lg transition-all border-none cursor-pointer text-[10px] font-medium flex items-center gap-1 shrink-0 ${
                      viewTab === 'archived'
                        ? 'bg-white dark:bg-[#202434] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Archive size={9} className="text-slate-500" />
                    <span>Archived</span>
                    <span className="px-1 py-0.1 rounded text-[9px] bg-slate-500/10 text-slate-600 dark:text-slate-400">
                      {archivedPlans.length}
                    </span>
                  </button>
                )}

                {abandonedPlans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewTab('abandoned')}
                    className={`px-2 py-0.5 rounded-lg transition-all border-none cursor-pointer text-[10px] font-medium flex items-center gap-1 shrink-0 ${
                      viewTab === 'abandoned'
                        ? 'bg-white dark:bg-[#202434] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Ban size={9} className="text-rose-500" />
                    <span>Abandoned</span>
                    <span className="px-1 py-0.1 rounded text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      {abandonedPlans.length}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewTab('all')}
                  className={`px-2 py-0.5 rounded-lg transition-all border-none cursor-pointer text-[10px] font-medium flex items-center gap-1 shrink-0 ${
                    viewTab === 'all'
                      ? 'bg-white dark:bg-[#202434] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <span>All</span>
                  <span className="px-1 py-0.1 rounded text-[9px] bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    {displayPlans.length}
                  </span>
                </button>
              </div>

              {onOpenFleetModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFleetModal();
                  }}
                  title="Open Multi-Plan Fleet Matrix grid view"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#1a73e8]/10 transition-colors border-none cursor-pointer shrink-0"
                >
                  <LayoutGrid size={12} />
                  <span>Fleet</span>
                </button>
              )}
            </div>

            {/* List of Plans */}
            <div className="max-h-64 overflow-y-auto no-scrollbar flex flex-col gap-1 pr-0.5">
              {visiblePlans.length === 0 ? (
                <div className="py-6 px-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  {viewTab === 'active' ? (
                    <p>No active plans running. Create a plan below to begin.</p>
                  ) : viewTab === 'paused' ? (
                    <p>No paused plans.</p>
                  ) : viewTab === 'completed' ? (
                    <p>No completed plans in history yet.</p>
                  ) : viewTab === 'archived' ? (
                    <p>No archived plans.</p>
                  ) : viewTab === 'abandoned' ? (
                    <p>No abandoned plans.</p>
                  ) : (
                    <p>No plans found.</p>
                  )}
                </div>
              ) : (
                visiblePlans.map((plan) => {
                  const isActive = plan.id === activePlanId;
                  const agentColor = plan.agentColor || '#1a73e8';
                  const isCompleted = plan.status === 'completed';
                  const isPaused = plan.status === 'paused' || plan.status === 'inactive';
                  const isArchived = plan.status === 'archived';
                  const isAbandoned = plan.status === 'abandoned';

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
                          {isCompleted ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : isPaused ? (
                            <Pause size={14} className="text-amber-500" />
                          ) : isArchived ? (
                            <Archive size={14} className="text-slate-400" />
                          ) : isAbandoned ? (
                            <Ban size={14} className="text-rose-500" />
                          ) : (
                            <span>{plan.agentAvatar || '🤖'}</span>
                          )}
                          {!isCompleted && !isPaused && !isArchived && !isAbandoned && plan.hasActiveWork && (
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
                            {isCompleted && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                Done
                              </span>
                            )}
                            {isPaused && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                Paused
                              </span>
                            )}
                            {isArchived && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 shrink-0">
                                Archived
                              </span>
                            )}
                            {isAbandoned && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
                                Abandoned
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <span>{plan.agentRole || 'Worker'}</span>
                            <span>•</span>
                            <span>{plan.completedCount}/{plan.nodeCount} tasks ({plan.progressPercent}%)</span>
                            {isCompleted && plan.completedAt && (
                              <>
                                <span>•</span>
                                <span>{new Date(plan.completedAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>

                          {/* Abandon reason snippet */}
                          {isAbandoned && plan.abandonReason && (
                            <div className="mt-0.5 text-[10px] text-rose-500 dark:text-rose-400 truncate italic">
                              Reason: "{plan.abandonReason}"
                            </div>
                          )}

                          {/* Mini Thought or Summary Snippet */}
                          {!isAbandoned && (plan.summary || plan.latestThought) && (
                            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate italic flex items-center gap-1">
                              <Activity size={10} className="text-[#1a73e8] shrink-0" />
                              <span className="truncate">"{plan.summary || plan.latestThought}"</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Status Transition Controls */}
                        {plan.status === 'active' && (
                          <>
                            {/* Pause */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                pausePlan(plan.id);
                              }}
                              title="Pause plan"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-amber-500/15 text-slate-400 hover:text-amber-500 transition-all border-none cursor-pointer"
                            >
                              <Pause size={12} />
                            </button>

                            {/* Mark Completed */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                completePlan(plan.id);
                              }}
                              title="Mark this plan completed"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all border-none cursor-pointer"
                            >
                              <CheckCircle2 size={12} />
                            </button>

                            {/* Archive */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                archivePlan(plan.id);
                              }}
                              title="Archive plan"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-500/15 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all border-none cursor-pointer"
                            >
                              <Archive size={12} />
                            </button>

                            {/* Abandon */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abandonPlan(plan.id, 'User stopped plan');
                              }}
                              title="Mark abandoned"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition-all border-none cursor-pointer"
                            >
                              <Ban size={12} />
                            </button>
                          </>
                        )}

                        {isPaused && (
                          <>
                            {/* Resume */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                resumePlan(plan.id);
                              }}
                              title="Resume plan"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-blue-500/15 text-slate-400 hover:text-blue-500 transition-all border-none cursor-pointer"
                            >
                              <Play size={12} />
                            </button>

                            {/* Mark Completed */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                completePlan(plan.id);
                              }}
                              title="Mark this plan completed"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-500 transition-all border-none cursor-pointer"
                            >
                              <CheckCircle2 size={12} />
                            </button>

                            {/* Archive */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                archivePlan(plan.id);
                              }}
                              title="Archive plan"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-500/15 text-slate-400 hover:text-slate-300 transition-all border-none cursor-pointer"
                            >
                              <Archive size={12} />
                            </button>
                          </>
                        )}

                        {(isCompleted || isArchived || isAbandoned) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reactivatePlan(plan.id);
                            }}
                            title="Re-open / reactivate plan"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-blue-500/15 text-slate-400 hover:text-blue-500 transition-all border-none cursor-pointer"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}

                        {isActive && (
                          <div className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shrink-0 ml-1">
                            <Check size={11} strokeWidth={3} />
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
                            className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-all border-none cursor-pointer ml-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
