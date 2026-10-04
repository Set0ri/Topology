import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowDown, 
  Trash2, 
  Search, 
  Layers, 
  Radio, 
  MessageSquare,
  Clock
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { CouncilDebateChunk, DeliberationPhase } from '../../types/topology';

interface LiveDebateTranscriptProps {
  className?: string;
}

interface GroupedBubble {
  id: string;
  sessionId: string;
  round: number;
  phase: DeliberationPhase;
  modelId: string;
  modelName: string;
  avatar: string;
  text: string;
  tokensUsed: number;
  costUsd: number;
  timestamp: number;
  isComplete: boolean;
}

function getModelMeta(modelId: string, customName?: string, customAvatar?: string) {
  const id = modelId.toLowerCase();
  if (id.includes('gemini') || id.includes('flash')) {
    return {
      name: customName || 'Gemini 3.8 Flash',
      avatar: customAvatar || '⚡',
      family: 'Gemini',
      bubbleBg: 'bg-indigo-950/20',
      badgeBg: 'bg-indigo-500/15 text-indigo-300',
      glow: 'shadow-indigo-500/5',
    };
  }
  if (id.includes('claude') || id.includes('opus') || id.includes('anthropic')) {
    const is55 = id.includes('5.5') || id.includes('5-5');
    return {
      name: customName || (is55 ? 'Claude 5.5 Opus' : 'Claude 4.6 Opus'),
      avatar: customAvatar || '🧠',
      family: 'Anthropic',
      bubbleBg: 'bg-purple-950/20',
      badgeBg: 'bg-purple-500/15 text-purple-300',
      glow: 'shadow-purple-500/5',
    };
  }
  if (id.includes('deepseek')) {
    return {
      name: customName || 'DeepSeek V3',
      avatar: customAvatar || '🐋',
      family: 'DeepSeek',
      bubbleBg: 'bg-teal-950/20',
      badgeBg: 'bg-teal-500/15 text-teal-300',
      glow: 'shadow-teal-500/5',
    };
  }
  return {
    name: customName || 'GPT-OSS 120b',
    avatar: customAvatar || '🌐',
    family: 'Open-Source',
    bubbleBg: 'bg-cyan-950/20',
    badgeBg: 'bg-cyan-500/15 text-cyan-300',
    glow: 'shadow-cyan-500/5',
  };
}

export const LiveDebateTranscript: React.FC<LiveDebateTranscriptProps> = ({
  className = '',
}) => {
  const activeDebateChunks = useTopologyStore((s) => s.activeDebateChunks);
  const clearDebateChunks = useTopologyStore((s) => s.clearDebateChunks);
  const isCouncilSpawning = useTopologyStore((s) => s.isCouncilSpawning);
  const activeCouncilSession = useTopologyStore((s) => s.activeCouncilSession);

  const [roundFilter, setRoundFilter] = useState<number | 'all'>('all');
  const [phaseFilter, setPhaseFilter] = useState<DeliberationPhase | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // Group real-time chunks into cohesive speech bubbles
  const groupedBubbles: GroupedBubble[] = useMemo(() => {
    // If active streaming chunks exist, group them
    if (activeDebateChunks && activeDebateChunks.length > 0) {
      const bubbles: GroupedBubble[] = [];
      let currentBubble: GroupedBubble | null = null;

      for (const chunk of activeDebateChunks) {
        const meta = getModelMeta(chunk.modelId, chunk.modelName, chunk.avatar);

        // Check if chunk belongs to current bubble
        if (
          currentBubble &&
          currentBubble.modelId === chunk.modelId &&
          currentBubble.round === chunk.round &&
          currentBubble.phase === chunk.phase
        ) {
          currentBubble.text += chunk.deltaText || '';
          currentBubble.tokensUsed += chunk.tokensUsedDelta || 0;
          currentBubble.costUsd += chunk.costUsdDelta || 0;
          currentBubble.timestamp = chunk.timestamp || currentBubble.timestamp;
          if (chunk.isComplete) {
            currentBubble.isComplete = true;
          }
        } else {
          // Finish previous bubble and start a new one
          currentBubble = {
            id: `bubble-${chunk.sessionId}-${chunk.round}-${chunk.phase}-${chunk.modelId}-${bubbles.length}`,
            sessionId: chunk.sessionId,
            round: chunk.round,
            phase: chunk.phase,
            modelId: chunk.modelId,
            modelName: meta.name,
            avatar: meta.avatar,
            text: chunk.deltaText || '',
            tokensUsed: chunk.tokensUsedDelta || 0,
            costUsd: chunk.costUsdDelta || 0,
            timestamp: chunk.timestamp || Date.now(),
            isComplete: chunk.isComplete || false,
          };
          bubbles.push(currentBubble);
        }
      }
      return bubbles;
    }

    // Fallback: If no streaming chunks but historical deliberation session exists, convert round contributions
    if (activeCouncilSession?.deliberationHistory) {
      const historicalBubbles: GroupedBubble[] = [];
      activeCouncilSession.deliberationHistory.forEach((r) => {
        const phase: DeliberationPhase = r.round === 1 ? 'ideate' : r.round === 2 ? 'critique' : 'synthesize';
        r.contributions.forEach((c, idx) => {
          const meta = getModelMeta(c.memberId, c.memberName, c.avatar);
          let fullText = '';
          if (c.thought) fullText += `"${c.thought}"\n\n`;
          if (c.proposals && c.proposals.length > 0) {
            fullText += `Proposals:\n• ${c.proposals.join('\n• ')}\n\n`;
          }
          if (c.critiques && c.critiques.length > 0) {
            fullText += `Critiques:\n• ${c.critiques.join('\n• ')}\n\n`;
          }
          if (c.consensusSummary) {
            fullText += `Consensus: ${c.consensusSummary}`;
          }

          historicalBubbles.push({
            id: `hist-${r.round}-${c.memberId}-${idx}`,
            sessionId: activeCouncilSession.id || 'historical',
            round: r.round,
            phase,
            modelId: c.memberId,
            modelName: meta.name,
            avatar: meta.avatar,
            text: fullText.trim() || c.perspective || 'Deliberation contribution',
            tokensUsed: c.tokensUsed || 0,
            costUsd: c.costUsd || 0,
            timestamp: c.timestamp || activeCouncilSession.timestamp || Date.now(),
            isComplete: true,
          });
        });
      });
      return historicalBubbles;
    }

    return [];
  }, [activeDebateChunks, activeCouncilSession]);

  // Filtered speech bubbles based on UI controls
  const filteredBubbles = useMemo(() => {
    return groupedBubbles.filter((b) => {
      if (roundFilter !== 'all' && b.round !== roundFilter) return false;
      if (phaseFilter !== 'all' && b.phase !== phaseFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesModel = b.modelName.toLowerCase().includes(q) || b.modelId.toLowerCase().includes(q);
        const matchesText = b.text.toLowerCase().includes(q);
        if (!matchesModel && !matchesText) return false;
      }
      return true;
    });
  }, [groupedBubbles, roundFilter, phaseFilter, searchQuery]);

  // Handle user scroll detection
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom > 80) {
      setIsUserScrolledUp(true);
    } else {
      setIsUserScrolledUp(false);
    }
  };

  // Auto-scroll to bottom as new chunks stream in
  useEffect(() => {
    if (!autoScroll || isUserScrolledUp) return;
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [activeDebateChunks.length, autoScroll, isUserScrolledUp]);

  const scrollToBottom = () => {
    setIsUserScrolledUp(false);
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const getPhaseBadge = (phase: DeliberationPhase) => {
    switch (phase) {
      case 'ideate':
        return {
          label: 'Ideation',
          className: 'bg-indigo-500/15 text-indigo-300',
          icon: Sparkles,
        };
      case 'critique':
        return {
          label: 'Critique',
          className: 'bg-amber-500/15 text-amber-300',
          icon: ShieldAlert,
        };
      case 'synthesize':
        return {
          label: 'Synthesis',
          className: 'bg-emerald-500/15 text-emerald-300',
          icon: CheckCircle2,
        };
    }
  };

  return (
    <div
      className={`rounded-3xl bg-slate-900/90 backdrop-blur-2xl p-6 shadow-2xl flex flex-col text-slate-100 ${className}`}
      style={{ boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.7), 0 0 40px 1px rgba(99, 102, 241, 0.08)' }}
    >
      {/* Header & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-purple-500/30 flex items-center justify-center text-indigo-300 shadow-lg">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold tracking-tight text-white">
                Live Inter-Model Debate Stream
              </h3>
              {isCouncilSpawning ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Streaming Live</span>
                </span>
              ) : groupedBubbles.length > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.06] text-slate-300">
                  {groupedBubbles.length} Contributions
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-model dialogue, adversarial critiques, and architectural rebuttals in real time
            </p>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Round Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setRoundFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all border-none outline-none cursor-pointer ${
                roundFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Rounds
            </button>
            {[1, 2, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoundFilter(r)}
                className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all border-none outline-none cursor-pointer ${
                  roundFilter === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                R{r}
              </button>
            ))}
          </div>

          {/* Phase Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04]">
            {(['all', 'ideate', 'critique', 'synthesize'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhaseFilter(p)}
                className={`px-2 py-1 rounded-lg capitalize font-medium transition-all border-none outline-none cursor-pointer ${
                  phaseFilter === p
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-xl bg-white/[0.04] text-xs text-slate-200 placeholder-slate-500 focus:bg-white/[0.08] transition-all border-none outline-none"
            />
          </div>

          {/* Clear button */}
          {activeDebateChunks.length > 0 && (
            <button
              type="button"
              onClick={clearDebateChunks}
              className="p-1.5 rounded-xl bg-white/[0.04] text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all border-none outline-none cursor-pointer"
              title="Clear streaming transcript"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Transcript Scroll Container */}
      <div className="relative flex-1 min-h-[380px] max-h-[580px] overflow-hidden rounded-2xl bg-white/[0.02]">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {filteredBubbles.length === 0 ? (
            <div className="py-24 text-center text-slate-500 space-y-3">
              <Layers className="w-12 h-12 mx-auto opacity-30 text-indigo-400" />
              <div className="text-sm font-medium text-slate-400">
                {isCouncilSpawning
                  ? 'Connecting to SSE debate stream...'
                  : 'Debate transcript is ready.'}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isCouncilSpawning
                  ? 'Model proposals, adversarial critiques, and consensus rebuttals will stream here in real time.'
                  : 'Convene the multi-model council to watch live dialogue stream between Gemini, Claude, and GPT-OSS.'}
              </p>
            </div>
          ) : (
            filteredBubbles.map((bubble, idx) => {
              const meta = getModelMeta(bubble.modelId, bubble.modelName, bubble.avatar);
              const phaseBadge = getPhaseBadge(bubble.phase);
              const PhaseIcon = phaseBadge.icon;
              const isStreamingThis = !bubble.isComplete && isCouncilSpawning && idx === filteredBubbles.length - 1;

              return (
                <motion.div
                  key={bubble.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`p-4 sm:p-5 rounded-2xl backdrop-blur-md transition-all ${meta.bubbleBg} ${meta.glow} shadow-lg`}
                >
                  {/* Bubble Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center text-lg shadow-sm">
                        {meta.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white tracking-tight">
                            {meta.name}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                            {meta.family}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Round Pill */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/[0.06] text-slate-300">
                        R{bubble.round}
                      </span>

                      {/* Phase Tag */}
                      <span
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${phaseBadge.className}`}
                      >
                        <PhaseIcon className="w-3 h-3" />
                        <span>{phaseBadge.label}</span>
                      </span>

                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(bubble.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </span>
                    </div>
                  </div>

                  {/* Bubble Speech Content */}
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap pl-1 sm:pl-2">
                    {bubble.text}
                    {/* Live Typing Cursor Animation */}
                    {isStreamingThis && (
                      <span className="inline-block w-1.5 h-3.5 bg-indigo-400 rounded-sm ml-1 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Bubble Footer Metadata */}
                  <div className="mt-3 pt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      {bubble.tokensUsed > 0 && (
                        <span>{bubble.tokensUsed.toLocaleString()} tokens</span>
                      )}
                      {bubble.costUsd > 0 && (
                        <span className="text-emerald-400/90">${bubble.costUsd.toFixed(5)} USD</span>
                      )}
                    </div>

                    <div>
                      {bubble.isComplete ? (
                        <span className="text-slate-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Deliberated</span>
                        </span>
                      ) : isStreamingThis ? (
                        <span className="text-indigo-300 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                          <span>Generating thought...</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={scrollBottomRef} />
        </div>

        {/* Floating "Resume Auto-scroll" Button */}
        <AnimatePresence>
          {isUserScrolledUp && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 px-3.5 py-2 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 backdrop-blur-md text-white text-xs font-semibold shadow-2xl flex items-center gap-2 transition-all border-none outline-none cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              <span>Jump to Latest Thoughts</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
