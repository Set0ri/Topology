import React, { useState } from 'react';
import { 
  X, 
  Brain, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Globe, 
  Box, 
  Sparkles,
  Search,
  Code2,
  Clock
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { SharedContextEntry } from '../../types/topology';

interface GlobalContextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalContextModal: React.FC<GlobalContextModalProps> = ({ isOpen, onClose }) => {
  const sharedContext = useTopologyStore((s) => s.sharedContext);
  const writeSharedContext = useTopologyStore((s) => s.writeSharedContext);
  const clearSharedContext = useTopologyStore((s) => s.clearSharedContext);
  const nodes = useTopologyStore((s) => s.nodes);
  const theme = useTopologyStore((s) => s.theme);
  const isDark = theme === 'mocha' || theme === 'catpuccin';

  const [activeTab, setActiveTab] = useState<'global' | 'nodes'>('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New Context Form
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValueStr, setNewValueStr] = useState('');
  const [targetNodeId, setTargetNodeId] = useState<string>(nodes[0]?.id || '');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const globalEntries = Object.values(sharedContext.global || {});
  
  // Aggregate all node context entries
  const nodeEntries: SharedContextEntry[] = [];
  Object.entries(sharedContext.nodes || {}).forEach(([nId, entries]) => {
    Object.values(entries).forEach(entry => {
      nodeEntries.push({ ...entry, nodeId: nId });
    });
  });

  const filteredGlobal = globalEntries.filter(e => 
    e.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
    JSON.stringify(e.value).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNodes = nodeEntries.filter(e => 
    e.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.nodeId && e.nodeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    JSON.stringify(e.value).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (key: string, value: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedKey = newKey.trim();
    if (!trimmedKey) {
      setFormError('Context key is required.');
      return;
    }

    let parsedValue: unknown = newValueStr;
    try {
      parsedValue = JSON.parse(newValueStr);
    } catch {
      // Treat as plain string if not valid JSON
      parsedValue = newValueStr;
    }

    if (activeTab === 'global') {
      writeSharedContext('global', trimmedKey, parsedValue, 'agent-user', 'Human Supervisor');
    } else {
      if (!targetNodeId) {
        setFormError('Please select a target node.');
        return;
      }
      writeSharedContext('node', trimmedKey, parsedValue, 'agent-user', 'Human Supervisor', targetNodeId);
    }

    setNewKey('');
    setNewValueStr('');
    setIsAdding(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-elevated-2xl backdrop-blur-2xl flex flex-col overflow-hidden transition-all border-none ${
          isDark 
            ? 'bg-cat-mocha-surface0/95 text-cat-mocha-text' 
            : 'bg-white/95 text-cat-latte-text'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b ${
          isDark ? 'border-white/10' : 'border-black/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
              <Brain size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Shared Agent Context Repository</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500 font-semibold">
                  Dual-Tier Blackboard
                </span>
              </h2>
              <p className="text-xs opacity-65 mt-0.5 font-sans">
                Cross-agent memory bus allowing autonomous workers to read and write graph-level and node-level contracts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-all border-none cursor-pointer ${
              isDark ? 'hover:bg-cat-mocha-surface1 text-cat-mocha-subtext0' : 'hover:bg-cat-latte-surface1 text-cat-latte-subtext0'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs & Search & Add Button */}
        <div className={`px-5 py-3 flex items-center justify-between gap-3 border-b ${
          isDark ? 'border-white/5 bg-cat-mocha-base/30' : 'border-black/5 bg-gray-50/50'
        }`}>
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5">
            <button
              type="button"
              onClick={() => { setActiveTab('global'); setIsAdding(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer ${
                activeTab === 'global'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Globe size={13} />
              <span>Global Graph ({globalEntries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('nodes'); setIsAdding(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer ${
                activeTab === 'nodes'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Box size={13} />
              <span>Node Scoped ({nodeEntries.length})</span>
            </button>
          </div>

          {/* Search bar & + Add Context button */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs ${
              isDark ? 'bg-cat-mocha-surface1' : 'bg-white shadow-xs'
            }`}>
              <Search size={13} className="opacity-50" />
              <input
                type="text"
                placeholder="Search keys or values..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-36"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all border-none cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {/* Inline Create Entry Form */}
        {isAdding && (
          <form onSubmit={handleCreate} className={`p-4 border-b animate-in fade-in duration-150 ${
            isDark ? 'bg-cat-mocha-surface1/60 border-white/10' : 'bg-purple-50/70 border-purple-100'
          }`}>
            <div className="font-semibold text-xs mb-2 flex items-center gap-1.5 text-purple-500">
              <Sparkles size={13} />
              <span>New {activeTab === 'global' ? 'Global Graph' : 'Node-Level'} Shared Context</span>
            </div>

            {formError && (
              <div className="mb-2 text-xs text-red-500 font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] font-bold uppercase opacity-70 block mb-1">Key Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. database_schema or auth_token_contract"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl text-xs outline-none border-none ${
                    isDark ? 'bg-cat-mocha-base text-white' : 'bg-white text-black shadow-xs'
                  }`}
                  required
                />
              </div>

              {activeTab === 'nodes' && (
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-70 block mb-1">Target Node</label>
                  <select
                    value={targetNodeId}
                    onChange={(e) => setTargetNodeId(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs outline-none border-none ${
                      isDark ? 'bg-cat-mocha-base text-white' : 'bg-white text-black shadow-xs'
                    }`}
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mb-2">
              <label className="text-[10px] font-bold uppercase opacity-70 block mb-1">Context Value (JSON or String)</label>
              <textarea
                placeholder='e.g. { "contractVersion": "2.0", "strictIsolation": true }'
                value={newValueStr}
                onChange={(e) => setNewValueStr(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono outline-none border-none resize-none ${
                  isDark ? 'bg-cat-mocha-base text-white' : 'bg-white text-black shadow-xs'
                }`}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-xl text-xs opacity-70 hover:opacity-100 border-none bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all border-none cursor-pointer"
              >
                Save to Context Repository
              </button>
            </div>
          </form>
        )}

        {/* Entries List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 min-h-[300px] max-h-[55vh]">
          {activeTab === 'global' ? (
            filteredGlobal.length === 0 ? (
              <div className="py-12 text-center opacity-60 text-xs">
                No global shared context entries found. Add one above or let agents write via MCP.
              </div>
            ) : (
              filteredGlobal.map((entry) => (
                <ContextEntryCard
                  key={entry.key}
                  entry={entry}
                  isDark={isDark}
                  onCopy={() => handleCopy(entry.key, entry.value)}
                  isCopied={copiedKey === entry.key}
                  onDelete={() => clearSharedContext('global', entry.key)}
                />
              ))
            )
          ) : (
            filteredNodes.length === 0 ? (
              <div className="py-12 text-center opacity-60 text-xs">
                No node-scoped context entries found.
              </div>
            ) : (
              filteredNodes.map((entry) => {
                const targetNode = nodes.find(n => n.id === entry.nodeId);
                return (
                  <ContextEntryCard
                    key={`${entry.nodeId}-${entry.key}`}
                    entry={entry}
                    isDark={isDark}
                    nodeLabel={targetNode?.label}
                    onCopy={() => handleCopy(`${entry.nodeId}-${entry.key}`, entry.value)}
                    isCopied={copiedKey === `${entry.nodeId}-${entry.key}`}
                    onDelete={() => clearSharedContext('node', entry.key, entry.nodeId)}
                  />
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
};

interface ContextEntryCardProps {
  entry: SharedContextEntry;
  isDark: boolean;
  nodeLabel?: string;
  onCopy: () => void;
  isCopied: boolean;
  onDelete: () => void;
}

const ContextEntryCard: React.FC<ContextEntryCardProps> = ({
  entry,
  isDark,
  nodeLabel,
  onCopy,
  isCopied,
  onDelete,
}) => {
  return (
    <div className={`p-4 rounded-2xl transition-all shadow-elevated-sm backdrop-blur-md border-none ${
      isDark ? 'bg-cat-mocha-surface1/60 hover:bg-cat-mocha-surface1/90' : 'bg-gray-50/90 hover:bg-gray-100/90'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
          <h4 className="font-mono font-bold text-xs truncate">{entry.key}</h4>
          {nodeLabel && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium truncate ${
              isDark ? 'bg-cat-mocha-surface2 text-cat-mocha-blue' : 'bg-blue-100 text-blue-700'
            }`}>
              Node: {nodeLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] opacity-60 font-sans">
            <span>By: <strong>{entry.authorAgentRole || entry.authorAgentId || 'Agent'}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-0.5"><Clock size={10} /> {new Date(entry.updatedAt).toLocaleTimeString()}</span>
          </div>

          <button
            type="button"
            onClick={onCopy}
            title="Copy JSON value"
            className={`p-1.5 rounded-lg text-xs transition-all border-none cursor-pointer ${
              isCopied ? 'bg-emerald-500 text-white' : 'opacity-60 hover:opacity-100 bg-transparent'
            }`}
          >
            {isCopied ? <Check size={12} /> : <Copy size={12} />}
          </button>

          <button
            type="button"
            onClick={onDelete}
            title="Delete entry"
            className="p-1.5 rounded-lg text-xs opacity-60 hover:opacity-100 hover:text-red-500 transition-all border-none bg-transparent cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Structured Value Rendering */}
      <div className={`p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed ${
        isDark ? 'bg-cat-mocha-base/80 text-cat-mocha-text' : 'bg-slate-900 text-slate-100'
      }`}>
        <pre className="m-0 whitespace-pre-wrap word-break">
          <code>
            {typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value, null, 2)}
          </code>
        </pre>
      </div>
    </div>
  );
};
