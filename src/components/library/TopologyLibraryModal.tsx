import React, { useState, useMemo } from 'react';
import { 
  X, 
  BookOpen, 
  Layers, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  Clock, 
  User, 
  Download, 
  Trash2, 
  Share2, 
  Copy, 
  Check, 
  PlusCircle, 
  Search, 
  Compass, 
  FolderHeart,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { 
  CANONICAL_ARCHETYPES, 
  CanonicalArchetype, 
  getTopologyCoverageMetrics, 
  TopologyCategory 
} from '../../data/topologyRegistry';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TopologyLibraryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'canonical' | 'user' | 'publish'>('canonical');
  const [selectedCategory, setSelectedCategory] = useState<TopologyCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Publish Form State
  const [pubName, setPubName] = useState('');
  const [pubDesc, setPubDesc] = useState('');
  const [pubCategory, setPubCategory] = useState<'coding' | 'knowledge' | 'reasoning' | 'operations'>('coding');
  const [pubTags, setPubTags] = useState('agent, autonomous, dag');
  const [pubAuthor, setPubAuthor] = useState('Developer / Agent');
  const [isCopied, setIsCopied] = useState(false);
  const [justLoadedId, setJustLoadedId] = useState<string | null>(null);

  const nodes = useTopologyStore(s => s.nodes);
  const edges = useTopologyStore(s => s.edges);
  const userTopologies = useTopologyStore(s => s.userTopologies);
  const publishTopology = useTopologyStore(s => s.publishTopology);
  const deleteUserTopology = useTopologyStore(s => s.deleteUserTopology);
  const loadTopologyDirect = useTopologyStore(s => s.loadTopologyDirect);
  const loadSampleTopology = useTopologyStore(s => s.loadSampleTopology);

  const coverageMetrics = useMemo(() => getTopologyCoverageMetrics(), []);

  // Filtered Canonical Archetypes
  const filteredCanonical = useMemo(() => {
    return CANONICAL_ARCHETYPES.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        item.name.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  // Filtered User Topologies
  const filteredUser = useMemo(() => {
    return userTopologies.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      return !q || 
        item.name.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));
    });
  }, [userTopologies, searchQuery]);

  if (!isOpen) return null;

  const handleLoadArchetype = (archetype: CanonicalArchetype) => {
    if (archetype.status === 'roadmap' || archetype.nodes.length === 0) {
      alert(`The "${archetype.name}" archetype is on the architecture roadmap! Community contribution PRs are welcome.`);
      return;
    }
    loadTopologyDirect(archetype.nodes, archetype.edges);
    setJustLoadedId(archetype.id);
    setTimeout(() => {
      setJustLoadedId(null);
      onClose();
    }, 600);
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubName.trim()) {
      alert('Please provide a name for your topology.');
      return;
    }

    const tagsArray = pubTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    publishTopology({
      name: pubName,
      description: pubDesc,
      category: pubCategory,
      tags: tagsArray,
      author: pubAuthor,
    });

    setPubName('');
    setPubDesc('');
    setActiveTab('user');
  };

  const handleExportSingleJson = (top: CanonicalArchetype) => {
    const jsonStr = JSON.stringify(top, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${top.id || 'topology'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyContributionJson = () => {
    const contributionPayload = {
      id: `community-${pubName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: pubName || 'My Custom Topology',
      category: pubCategory,
      description: pubDesc || 'Custom community topology for agent workflows.',
      popularity: 80,
      complexity: 'Intermediate',
      status: 'ready',
      tags: pubTags.split(',').map(t => t.trim()).filter(Boolean),
      estimatedMinutes: 15,
      author: pubAuthor || 'Community Contributor',
      whyItMatters: 'Contributed to the global topology library repository.',
      nodes,
      edges,
    };

    navigator.clipboard.writeText(JSON.stringify(contributionPayload, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-all">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] backdrop-blur-2xl shadow-elevated-2xl border-none overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Section */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-slate-50/50 dark:bg-white/2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#9334e6] flex items-center justify-center text-white shadow-xs shrink-0">
              <Compass size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">Topology Archetype Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] dark:bg-[#1e8e3e]/20 dark:text-[#34a853]">
                  {coverageMetrics.overallCoveragePercent}% Coverage
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#5f6368] dark:text-[#94a3b8] line-clamp-1">
                Reusable software & agent DAG archetypes — never reinvent standard patterns.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 pt-2.5 pb-2 bg-slate-100/40 dark:bg-white/2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('canonical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border-none cursor-pointer ${
                activeTab === 'canonical'
                  ? 'bg-white dark:bg-[#222536] text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs font-semibold'
                  : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] bg-transparent'
              }`}
            >
              <BookOpen size={14} />
              <span>Canonical Archetypes</span>
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/5 dark:bg-white/10 font-bold">
                {CANONICAL_ARCHETYPES.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('user')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border-none cursor-pointer ${
                activeTab === 'user'
                  ? 'bg-white dark:bg-[#222536] text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs font-semibold'
                  : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] bg-transparent'
              }`}
            >
              <FolderHeart size={14} />
              <span>My Published</span>
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/5 dark:bg-white/10 font-bold">
                {userTopologies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('publish')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border-none cursor-pointer ${
                activeTab === 'publish'
                  ? 'bg-white dark:bg-[#222536] text-[#1a73e8] dark:text-[#8ab4f8] shadow-xs font-semibold'
                  : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] bg-transparent'
              }`}
            >
              <PlusCircle size={14} />
              <span>Publish Canvas</span>
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-[#1a73e8]/10 text-[#1a73e8] font-bold">
                {nodes.length}
              </span>
            </button>
          </div>

          {/* Search Box (for canonical and user tabs) */}
          {activeTab !== 'publish' && (
            <div className="relative w-full sm:w-60 shrink-0">
              <Search size={13} className="absolute left-2.5 top-2.5 text-[#5f6368] dark:text-[#94a3b8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topologies, tags..."
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl bg-black/4 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] placeholder-[#5f6368]/60 focus:outline-none focus:bg-black/6 dark:focus:bg-white/10 transition-all border-none"
              />
            </div>
          )}
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar">

          {/* TAB 1: CANONICAL ARCHETYPES & % COVERAGE MAP */}
          {activeTab === 'canonical' && (
            <>
              {/* % Coverage Map Dashboard Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-purple-50/60 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-purple-950/20 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a73e8] dark:text-[#8ab4f8] uppercase tracking-wider">
                      <TrendingUp size={14} />
                      <span>Software Architecture % Coverage Map</span>
                    </div>
                    <div className="text-sm font-semibold text-[#202124] dark:text-[#f8fafc] mt-0.5">
                      {coverageMetrics.readyCount} of {coverageMetrics.totalArchetypes} Standard Patterns Ready to Instantiate
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-[#1a73e8] dark:text-[#8ab4f8]">
                      {coverageMetrics.overallCoveragePercent}%
                    </div>
                    <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">Global Industry Coverage</div>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden mb-3">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[#1a73e8] via-[#4285f4] to-[#34a853] transition-all duration-500" 
                    style={{ width: `${coverageMetrics.overallCoveragePercent}%` }}
                  />
                </div>

                {/* Category Breakdown Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {coverageMetrics.categoryBreakdown.map(cat => (
                    <div 
                      key={cat.category}
                      onClick={() => setSelectedCategory(selectedCategory === cat.category ? 'all' : cat.category)}
                      className={`p-2 rounded-2xl transition-all cursor-pointer ${
                        selectedCategory === cat.category 
                          ? 'bg-white dark:bg-[#202434] shadow-elevated-xs' 
                          : 'bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-[#202434]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="truncate">{cat.label}</span>
                        <span className="text-[10px] font-bold text-[#1a73e8] dark:text-[#8ab4f8]">{cat.percent}%</span>
                      </div>
                      <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8] mt-0.5">
                        {cat.ready} / {cat.total} Archetypes
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All Patterns' },
                  { id: 'coding', label: '💻 Coding & Dev Loops' },
                  { id: 'knowledge', label: '📚 Knowledge & RAG' },
                  { id: 'reasoning', label: '🧠 Multi-Agent Debate' },
                  { id: 'operations', label: '🛡️ Operations & SRE' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border-none cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
                        : 'bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Archetypes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCanonical.map(item => {
                  const isReady = item.status === 'ready';
                  const isLoaded = justLoadedId === item.id;

                  return (
                    <div 
                      key={item.id}
                      className="flex flex-col justify-between p-4 rounded-3xl bg-white dark:bg-[#1f2230] shadow-elevated-xs hover:shadow-elevated-md transition-all border-none group"
                    >
                      <div>
                        {/* Top Ribbon */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            {item.popularity >= 90 ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#fce8e6] text-[#c5221f] dark:bg-[#d93025]/20 dark:text-[#f28b82]">
                                <Flame size={11} />
                                <span>{item.popularity}% Popular</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/5 dark:bg-white/10 text-[#5f6368] dark:text-[#94a3b8]">
                                <span>{item.popularity}% Usage</span>
                              </span>
                            )}

                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-black/4 dark:bg-white/5 text-[#5f6368] dark:text-[#94a3b8]">
                              {item.complexity}
                            </span>
                          </div>

                          {isReady ? (
                            <span className="text-[10px] font-semibold text-[#1e8e3e] dark:text-[#34a853] flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Ready
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-[#fef7e0] text-[#b06000] dark:bg-[#f9ab00]/20 dark:text-[#fbbc04]">
                              Roadmap
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-sm font-bold tracking-tight text-[#202124] dark:text-[#f8fafc] group-hover:text-[#1a73e8] dark:group-hover:text-[#8ab4f8] transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-xs text-[#5f6368] dark:text-[#94a3b8] mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Why It Matters Callout */}
                        <div className="mt-2.5 p-2 rounded-xl bg-black/2 dark:bg-white/3 text-[11px] text-[#5f6368] dark:text-[#94a3b8] italic">
                          "{item.whyItMatters}"
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {item.tags.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/4 dark:bg-white/5 text-[#5f6368] dark:text-[#94a3b8]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer & Action */}
                      <div className="flex items-center justify-between pt-3 mt-3 bg-black/2 dark:bg-white/2 -mx-4 -mb-4 px-4 py-3 rounded-b-3xl text-[11px] text-[#5f6368] dark:text-[#94a3b8]">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {item.estimatedMinutes}m
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Layers size={11} />
                            {item.nodes.length} nodes
                          </span>
                        </div>

                        {isReady ? (
                          <button
                            type="button"
                            onClick={() => handleLoadArchetype(item)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer ${
                              isLoaded
                                ? 'bg-[#1e8e3e] text-white shadow-xs'
                                : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs'
                            }`}
                          >
                            {isLoaded ? (
                              <>
                                <Check size={13} />
                                <span>Loaded!</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={13} />
                                <span>Load into Canvas</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLoadArchetype(item)}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#5f6368] dark:text-[#94a3b8] transition-colors border-none cursor-pointer"
                          >
                            Upvote Archetype
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* TAB 2: MY PUBLISHED TOPOLOGIES */}
          {activeTab === 'user' && (
            <div>
              {userTopologies.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-black/4 dark:bg-white/5 text-[#5f6368] dark:text-[#94a3b8] flex items-center justify-center mb-3">
                    <FolderHeart size={28} />
                  </div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#f8fafc]">
                    No Custom Topologies Published Yet
                  </h3>
                  <p className="text-xs text-[#5f6368] dark:text-[#94a3b8] max-w-sm mx-auto mt-1 mb-4">
                    Create custom topologies on the canvas, then publish them to your local registry or export for community GitHub repos!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('publish')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all shadow-xs border-none cursor-pointer"
                  >
                    Publish Active Canvas
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredUser.map(item => (
                    <div 
                      key={item.id}
                      className="flex flex-col justify-between p-4 rounded-3xl bg-white dark:bg-[#1f2230] shadow-elevated-xs hover:shadow-elevated-md transition-all border-none"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#1a73e8]/10 text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8] capitalize">
                            {item.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteUserTopology(item.id)}
                            className="p-1 rounded-lg text-[#5f6368] dark:text-[#94a3b8] hover:text-[#d93025] hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
                            title="Delete custom topology"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <h3 className="text-sm font-bold tracking-tight text-[#202124] dark:text-[#f8fafc]">
                          {item.name}
                        </h3>
                        <p className="text-xs text-[#5f6368] dark:text-[#94a3b8] mt-1 line-clamp-2">
                          {item.description}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-3">
                          {item.tags.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/4 dark:bg-white/5 text-[#5f6368] dark:text-[#94a3b8]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 bg-black/2 dark:bg-white/2 -mx-4 -mb-4 px-4 py-3 rounded-b-3xl text-[11px] text-[#5f6368] dark:text-[#94a3b8]">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            {item.author}
                          </span>
                          <span>•</span>
                          <span>{item.nodes.length} nodes</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleExportSingleJson(item)}
                            className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] transition-colors border-none cursor-pointer"
                            title="Export JSON file"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadArchetype(item)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all shadow-xs border-none cursor-pointer"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PUBLISH ACTIVE CANVAS */}
          {activeTab === 'publish' && (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Canvas Status Preview Banner */}
              <div className="p-4 rounded-3xl bg-black/3 dark:bg-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#1a73e8] dark:text-[#8ab4f8]">Active Workspace Canvas</div>
                  <div className="text-xs text-[#5f6368] dark:text-[#94a3b8] mt-0.5">
                    Ready to package {nodes.length} nodes and {edges.length} causal edges into the library.
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-[#202434] text-[#202124] dark:text-[#f8fafc] shadow-xs">
                    {nodes.length} Nodes
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-[#202434] text-[#202124] dark:text-[#f8fafc] shadow-xs">
                    {edges.length} Edges
                  </span>
                </div>
              </div>

              {/* Publish Metadata Form */}
              <form onSubmit={handlePublishSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] dark:text-[#94a3b8] mb-1">
                    Topology Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={pubName}
                    onChange={(e) => setPubName(e.target.value)}
                    placeholder="e.g. Next.js Autonomous Migration Agent"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-black/4 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] border-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5f6368] dark:text-[#94a3b8] mb-1">
                      Domain Category
                    </label>
                    <select
                      value={pubCategory}
                      onChange={(e) => setPubCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-black/4 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] focus:outline-none border-none transition-all"
                    >
                      <option value="coding">Coding & Dev Loops</option>
                      <option value="knowledge">Knowledge & RAG</option>
                      <option value="reasoning">Multi-Agent Reasoning</option>
                      <option value="operations">Operations & SRE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5f6368] dark:text-[#94a3b8] mb-1">
                      Author / Agent Persona
                    </label>
                    <input
                      type="text"
                      value={pubAuthor}
                      onChange={(e) => setPubAuthor(e.target.value)}
                      placeholder="e.g. Gemini CLI Lead / Logan"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-black/4 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] border-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] dark:text-[#94a3b8] mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    placeholder="e.g. testing, vitest, autonomous, cicd"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-black/4 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] border-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] dark:text-[#94a3b8] mb-1">
                    Description & Purpose
                  </label>
                  <textarea
                    rows={3}
                    value={pubDesc}
                    onChange={(e) => setPubDesc(e.target.value)}
                    placeholder="Explain what this topology accomplishes, required inputs, and expected artifacts..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-black/4 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] border-none transition-all resize-none"
                  />
                </div>

                {/* Actions: Save locally, Export Pack, Copy GitHub JSON */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    <span>Save to Local Registry</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyContributionJson}
                    className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#202124] dark:text-[#f8fafc] text-xs font-medium transition-colors border-none cursor-pointer flex items-center justify-center gap-1.5"
                    title="Copy JSON formatted for a GitHub PR to the community topology repository"
                  >
                    {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    <span>{isCopied ? 'PR JSON Copied!' : 'Copy GitHub PR JSON'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[11px] text-[#5f6368] dark:text-[#94a3b8] bg-black/2 dark:bg-white/2">
          <span>Global Archetype Standard v2.0 • Zero-Borders Elevated Design</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer font-medium"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
};
