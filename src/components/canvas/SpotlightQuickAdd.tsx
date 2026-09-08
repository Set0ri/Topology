import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Cpu, 
  Target, 
  GitBranch, 
  Flag, 
  Package, 
  Bot, 
  Link2, 
  CornerDownLeft, 
  X,
  Sparkles
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { NodeType, TopologyNode } from '../../types/topology';
import { getNodeTypeColor } from '../../utils/catppuccin';

interface SpotlightQuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  screenPos: { x: number; y: number };
  flowPos: { x: number; y: number };
}

interface NodeOption {
  type: NodeType;
  label: string;
  sublabel: string;
  description: string;
  icon: React.ReactNode;
}

const NODE_OPTIONS: NodeOption[] = [
  {
    type: 'task',
    label: 'Action Task',
    sublabel: 'Agent Operational Step',
    description: 'Executable step with tools, prompts, and verification criteria',
    icon: <Cpu size={16} className="text-cat-mocha-sapphire" />,
  },
  {
    type: 'goal',
    label: 'Strategic Goal',
    sublabel: 'System Objective',
    description: 'High-level mission anchor defining scope and success metrics',
    icon: <Target size={16} className="text-cat-mocha-mauve" />,
  },
  {
    type: 'decision',
    label: 'Decision Gate',
    sublabel: 'Conditional Branch',
    description: 'Evaluation checkpoint routing execution based on test results',
    icon: <GitBranch size={16} className="text-cat-mocha-peach" />,
  },
  {
    type: 'milestone',
    label: 'Milestone Gate',
    sublabel: 'Deliverable Sync Point',
    description: 'Consolidation point verifying upstream deliverables',
    icon: <Flag size={16} className="text-cat-mocha-green" />,
  },
  {
    type: 'artifact',
    label: 'Data Artifact',
    sublabel: 'File / Contract Schema',
    description: 'Output artifact, interface contract, or data entity',
    icon: <Package size={16} className="text-cat-mocha-teal" />,
  },
  {
    type: 'agent',
    label: 'Autonomous Persona',
    sublabel: 'Subagent Assignment',
    description: 'Autonomous worker unit with dedicated toolset',
    icon: <Bot size={16} className="text-cat-mocha-lavender" />,
  },
];

export const SpotlightQuickAdd: React.FC<SpotlightQuickAddProps> = ({
  isOpen,
  onClose,
  screenPos,
  flowPos,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [autoConnect, setAutoConnect] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const addNode = useTopologyStore(s => s.addNode);
  const findSmartConnectTarget = useTopologyStore(s => s.findSmartConnectTarget);
  const theme = useTopologyStore(s => s.theme);

  // Determine smart candidate
  const candidate = findSmartConnectTarget(flowPos);

  const filteredOptions = NODE_OPTIONS.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase()) ||
    opt.sublabel.toLowerCase().includes(query.toLowerCase()) ||
    opt.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleCreate = (type: NodeType) => {
    addNode(
      {
        type,
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        position: flowPos,
      },
      {
        autoConnect,
        targetId: candidate ? candidate.id : undefined,
      }
    );
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[selectedIndex]) {
        handleCreate(filteredOptions[selectedIndex].type);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  // Position nicely within viewport (desktop) or center (mobile)
  const posX = isMobile ? undefined : Math.min(Math.max(screenPos.x - 160, 20), window.innerWidth - 360);
  const posY = isMobile ? undefined : Math.min(Math.max(screenPos.y - 40, 70), window.innerHeight - 440);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -6 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          style={isMobile ? undefined : { left: posX, top: posY }}
          onClick={(e) => e.stopPropagation()}
          className={`rounded-3xl p-3 bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] shadow-elevated-2xl backdrop-blur-2xl border-none overflow-hidden select-none transition-colors duration-200 ${
            isMobile ? 'fixed top-20 left-4 right-4 w-[calc(100vw-2rem)] max-w-sm mx-auto' : 'absolute w-84'
          }`}
        >
          {/* Top Search Bar */}
          <div className="relative flex items-center px-3 py-2 rounded-2xl bg-black/4 dark:bg-white/5 mb-2">
            <Search size={14} className="text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search node type..."
              className="w-full text-xs font-medium bg-transparent text-cat-latte-text dark:text-cat-mocha-text placeholder-cat-latte-overlay0 dark:placeholder-cat-mocha-overlay1 focus:outline-none border-none"
            />
            <button 
              onClick={onClose} 
              className="text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 hover:text-cat-latte-text dark:hover:text-cat-mocha-text border-none bg-transparent cursor-pointer p-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Smart Auto-Connect Preview */}
          {candidate && (
            <div className="px-3 py-1.5 mb-2 rounded-xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 truncate max-w-[200px]">
                <Link2 size={12} className="text-cat-mocha-sapphire shrink-0" />
                <span className="truncate">Link to: <strong className="text-cat-latte-text dark:text-cat-mocha-text font-normal">{candidate.label}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setAutoConnect(!autoConnect)}
                className={`px-2 py-0.5 rounded-lg font-mono text-[10px] transition-colors border-none cursor-pointer ${
                  autoConnect 
                    ? 'bg-cat-latte-sapphire/20 dark:bg-cat-mocha-sapphire/20 text-cat-latte-sapphire dark:text-cat-mocha-sapphire font-semibold' 
                    : 'bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-cat-latte-overlay1 dark:text-cat-mocha-overlay1'
                }`}
              >
                {autoConnect ? 'AUTO-LINK ✓' : 'STANDALONE'}
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredOptions.map((opt, idx) => {
              const isSelected = idx === selectedIndex;
              const typeColor = getNodeTypeColor(opt.type, theme);

              return (
                <div
                  key={opt.type}
                  onClick={() => handleCreate(opt.type)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-2.5 p-2 rounded-2xl cursor-pointer transition-all duration-150 border-none ${
                    isSelected 
                      ? 'bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-cat-latte-text dark:text-cat-mocha-text shadow-elevated-sm' 
                      : 'hover:bg-cat-latte-surface0/50 dark:hover:bg-cat-mocha-surface0/50 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0'
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${typeColor}18` }}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-cat-latte-text dark:text-cat-mocha-text truncate">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-mono opacity-50 flex items-center gap-0.5">
                          <CornerDownLeft size={10} />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 truncate">
                      {opt.sublabel}
                    </p>
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
