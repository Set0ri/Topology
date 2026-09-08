import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  X,
  Layers,
  Sparkles,
  Bot
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { NodeStatus, NodeType, ExecutionType } from '../../types/topology';

export const SidebarFilter: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const searchQuery = useTopologyStore(s => s.searchQuery);
  const setSearchQuery = useTopologyStore(s => s.setSearchQuery);
  const filterStatus = useTopologyStore(s => s.filterStatus);
  const setFilterStatus = useTopologyStore(s => s.setFilterStatus);
  const filterExecutionType = useTopologyStore(s => s.filterExecutionType);
  const setFilterExecutionType = useTopologyStore(s => s.setFilterExecutionType);
  const filterType = useTopologyStore(s => s.filterType);
  const setFilterType = useTopologyStore(s => s.setFilterType);
  const getStats = useTopologyStore(s => s.getStats);

  const stats = getStats();
  const hasActiveFilters = searchQuery.trim() !== '' || filterStatus !== 'all' || filterType !== 'all' || filterExecutionType !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterType('all');
    setFilterExecutionType('all');
  };

  // Collapsed State: Sleek Vertical Floating Rail
  if (isCollapsed) {
    return (
      <aside className="fixed top-16 sm:top-18 left-2.5 sm:left-4 z-30 flex flex-col items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-white/90 dark:bg-[#181a24]/90 backdrop-blur-2xl shadow-elevated-md border-none select-none transition-all duration-200">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-xl text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
          title="Expand Filter Sidebar"
        >
          <ChevronRight size={16} />
        </button>

        <div className="w-6 h-px bg-black/5 dark:bg-white/10" />

        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="relative p-2 rounded-xl text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
          title="Search & Filters"
        >
          <Filter size={15} className={hasActiveFilters ? 'text-[#1a73e8]' : ''} />
          {hasActiveFilters && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1a73e8] shadow-xs" />
          )}
        </button>

        {/* Quick Node Count Badge */}
        <div 
          onClick={() => setIsCollapsed(false)}
          className="cursor-pointer text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#5f6368] dark:text-[#94a3b8]"
          title={`${stats.total} total nodes`}
        >
          {stats.total}
        </div>
      </aside>
    );
  }

  // Expanded State: Elevated Floating Paper Panel with Mobile Backdrop
  return (
    <>
      {/* Mobile Backdrop Click-to-Dismiss */}
      <div 
        className="fixed inset-0 bg-black/25 backdrop-blur-xs z-30 sm:hidden" 
        onClick={() => setIsCollapsed(true)} 
      />

      <aside className="fixed top-15 sm:top-18 left-2.5 sm:left-4 bottom-3 sm:bottom-6 w-[calc(100vw-1.25rem)] sm:w-72 max-w-full z-40 sm:z-30 rounded-3xl p-3.5 sm:p-4 bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] backdrop-blur-2xl shadow-elevated-xl border-none flex flex-col overflow-hidden select-none transition-all duration-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#1a73e8]/10 text-[#1a73e8] dark:bg-[#1a73e8]/20 flex items-center justify-center">
            <Filter size={13} />
          </div>
          <span className="text-xs font-semibold tracking-tight text-[#202124] dark:text-[#f8fafc]">
            Topology Scope
          </span>
        </div>

        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-[#1a73e8] hover:bg-[#1a73e8]/10 transition-colors border-none cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {/* Clean Search Bar */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-2.5 text-[#5f6368] dark:text-[#94a3b8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter nodes, labels, tags..."
          className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-black/4 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] placeholder-[#5f6368]/60 dark:placeholder-[#94a3b8]/60 focus:outline-none focus:bg-black/6 dark:focus:bg-white/10 transition-all border-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-2.5 p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] transition-colors border-none cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Interactive Micro-Metrics Strip */}
      <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-black/3 dark:bg-white/5 mb-3">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all border-none cursor-pointer ${
            filterStatus === 'all' 
              ? 'bg-white dark:bg-[#202434] shadow-xs text-[#202124] dark:text-white font-semibold' 
              : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#5f6368] dark:text-[#94a3b8]'
          }`}
          title="Show All Nodes"
        >
          <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">Total</span>
          <span className="text-xs font-bold mt-0.5">{stats.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all border-none cursor-pointer ${
            filterStatus === 'completed' 
              ? 'bg-[#e6f4ea] text-[#137333] dark:bg-[#1e8e3e]/25 dark:text-[#34a853] shadow-xs font-semibold' 
              : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#137333] dark:text-[#34a853]'
          }`}
          title="Filter Completed"
        >
          <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e]" />
            Done
          </span>
          <span className="text-xs font-bold mt-0.5">{stats.completed}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'in_progress' ? 'all' : 'in_progress')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all border-none cursor-pointer ${
            filterStatus === 'in_progress' 
              ? 'bg-[#fef7e0] text-[#b06000] dark:bg-[#f9ab00]/25 dark:text-[#fbbc04] shadow-xs font-semibold' 
              : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#b06000] dark:text-[#fbbc04]'
          }`}
          title="Filter Active"
        >
          <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f9ab00]" />
            Active
          </span>
          <span className="text-xs font-bold mt-0.5">{stats.inProgress}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all border-none cursor-pointer ${
            filterStatus === 'pending' 
              ? 'bg-[#feefe3] text-[#c25100] dark:bg-[#e8710a]/25 dark:text-[#fa903e] shadow-xs font-semibold' 
              : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#c25100] dark:text-[#fa903e]'
          }`}
          title="Filter Pending"
        >
          <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e8710a]" />
            Wait
          </span>
          <span className="text-xs font-bold mt-0.5">{stats.pending}</span>
        </button>
      </div>

      {/* Filter Sections (Scrollable) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
        {/* Status Filter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[#5f6368] dark:text-[#94a3b8] uppercase tracking-wider">
              Node Status
            </span>
            {filterStatus !== 'all' && (
              <button 
                type="button" 
                onClick={() => setFilterStatus('all')}
                className="text-[9px] text-[#1a73e8] hover:underline border-none bg-transparent cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {(['all', 'in_progress', 'ready', 'completed', 'pending', 'blocked'] as (NodeStatus | 'all')[]).map(st => {
              const isSelected = filterStatus === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-medium transition-all border-none cursor-pointer ${
                    isSelected
                      ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
                      : 'bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8]'
                  }`}
                >
                  {st === 'all' ? 'All' : st.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Node Type Filter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[#5f6368] dark:text-[#94a3b8] uppercase tracking-wider">
              Archetype Type
            </span>
            {filterType !== 'all' && (
              <button 
                type="button" 
                onClick={() => setFilterType('all')}
                className="text-[9px] text-[#1a73e8] hover:underline border-none bg-transparent cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {(['all', 'goal', 'task', 'decision', 'milestone', 'artifact'] as (NodeType | 'all')[]).map(nt => {
              const isSelected = filterType === nt;
              return (
                <button
                  key={nt}
                  type="button"
                  onClick={() => setFilterType(nt)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-medium transition-all border-none cursor-pointer capitalize ${
                    isSelected
                      ? 'bg-[#9334e6] text-white shadow-xs font-semibold'
                      : 'bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8]'
                  }`}
                >
                  {nt === 'all' ? 'All Types' : nt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Execution Engine Filter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[#5f6368] dark:text-[#94a3b8] uppercase tracking-wider">
              Execution Engine
            </span>
            {filterExecutionType !== 'all' && (
              <button 
                type="button" 
                onClick={() => setFilterExecutionType('all')}
                className="text-[9px] text-[#1a73e8] hover:underline border-none bg-transparent cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'All Engines' },
              { id: 'autonomous_agent', label: '🤖 AI Agent' },
              { id: 'automated_script', label: '⚡ Script' },
              { id: 'human_operator', label: '👤 Human Gate' },
              { id: 'conditional_router', label: '🔀 Router' },
            ].map(item => {
              const isSelected = filterExecutionType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterExecutionType(item.id as ExecutionType | 'all')}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-medium transition-all border-none cursor-pointer ${
                    isSelected
                      ? 'bg-[#007b83] text-white shadow-xs font-semibold'
                      : 'bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  </>
  );
};
