import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  FileCode2, 
  FileText, 
  Database, 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  ShieldAlert,
  Clock,
  HardDrive
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

export const ArtifactViewerModal: React.FC = () => {
  const viewingArtifact = useTopologyStore((s) => s.viewingArtifact);
  const setViewingArtifact = useTopologyStore((s) => s.setViewingArtifact);
  const nodes = useTopologyStore((s) => s.nodes);
  const approveNode = useTopologyStore((s) => s.approveNode);
  const rejectNode = useTopologyStore((s) => s.rejectNode);
  const theme = useTopologyStore((s) => s.theme);
  const isDark = theme === 'mocha' || theme === 'catpuccin';

  const [copied, setCopied] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionDoneMsg, setActionDoneMsg] = useState<string | null>(null);

  if (!viewingArtifact) return null;

  const { artifact, nodeId, nodeLabel } = viewingArtifact;
  const targetNode = nodes.find((n) => n.id === nodeId);
  const isHitlPending = targetNode?.context?.requiresHumanApproval && targetNode?.context?.approvalStatus === 'pending';

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: artifact.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApprove = () => {
    approveNode(nodeId, `Verified deliverable: ${artifact.name}`);
    setActionDoneMsg(`Deliverable approved and sent back to autonomous squad.`);
    setTimeout(() => {
      setActionDoneMsg(null);
      setViewingArtifact(null);
    }, 1500);
  };

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    rejectNode(nodeId, rejectReason || 'Deliverable revision required');
    setActionDoneMsg(`Revision requested from squad.`);
    setTimeout(() => {
      setActionDoneMsg(null);
      setViewingArtifact(null);
    }, 1500);
  };

  const isJson = artifact.mimeType?.includes('json') || artifact.name.endsWith('.json');
  const isTs = artifact.mimeType?.includes('typescript') || artifact.name.endsWith('.ts') || artifact.name.endsWith('.tsx');
  const isMd = artifact.mimeType?.includes('markdown') || artifact.name.endsWith('.md');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setViewingArtifact(null)}
    >
      <div 
        className={`w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-elevated-2xl backdrop-blur-2xl flex flex-col overflow-hidden transition-all duration-200 border-none select-text ${
          isDark 
            ? 'bg-cat-mocha-surface0/95 text-cat-mocha-text' 
            : 'bg-white/95 text-cat-latte-text'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 flex items-center justify-between gap-4 border-b ${
          isDark ? 'border-white/10' : 'border-black/5'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isJson ? 'bg-amber-500/15 text-amber-500' :
              isTs ? 'bg-blue-500/15 text-blue-500' :
              isMd ? 'bg-purple-500/15 text-purple-500' :
              'bg-emerald-500/15 text-emerald-500'
            }`}>
              {isJson ? <Database size={20} /> :
               isTs ? <FileCode2 size={20} /> :
               isMd ? <FileText size={20} /> :
               <FileCheck size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold truncate">{artifact.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                  isDark ? 'bg-cat-mocha-surface1 text-cat-mocha-blue' : 'bg-cat-latte-surface1 text-cat-latte-blue'
                }`}>
                  {artifact.mimeType}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs opacity-70 mt-0.5 font-sans">
                <span className="truncate">Node: <strong className="font-semibold">{nodeLabel}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1"><HardDrive size={11} /> {formatBytes(artifact.sizeBytes)}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {new Date(artifact.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : isDark
                  ? 'bg-cat-mocha-surface1 text-cat-mocha-text hover:bg-cat-mocha-surface2'
                  : 'bg-cat-latte-surface1 text-cat-latte-text hover:bg-cat-latte-surface2'
              }`}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer ${
                isDark
                  ? 'bg-cat-mocha-surface1 text-cat-mocha-text hover:bg-cat-mocha-surface2'
                  : 'bg-cat-latte-surface1 text-cat-latte-text hover:bg-cat-latte-surface2'
              }`}
            >
              <Download size={13} />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={() => setViewingArtifact(null)}
              className={`p-2 rounded-xl transition-all border-none cursor-pointer ${
                isDark ? 'hover:bg-cat-mocha-surface1 text-cat-mocha-subtext0' : 'hover:bg-cat-latte-surface1 text-cat-latte-subtext0'
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 p-5 overflow-y-auto min-h-[300px] max-h-[55vh]">
          <div className={`p-4 rounded-2xl font-mono text-xs leading-relaxed overflow-x-auto select-text ${
            isDark 
              ? 'bg-cat-mocha-base/80 text-cat-mocha-text' 
              : 'bg-slate-900 text-slate-100 shadow-inner'
          }`}>
            <pre className="m-0 font-mono whitespace-pre-wrap word-break">
              <code>{artifact.content}</code>
            </pre>
          </div>
        </div>

        {/* HITL Review Action Footer */}
        <div className={`p-4 flex flex-col md:flex-row items-center justify-between gap-3 border-t ${
          isDark ? 'border-white/10 bg-cat-mocha-base/40' : 'border-black/5 bg-gray-50/60'
        }`}>
          {actionDoneMsg ? (
            <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs py-1 animate-in fade-in">
              <CheckCircle2 size={16} />
              <span>{actionDoneMsg}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs">
                {isHitlPending ? (
                  <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                    <ShieldAlert size={15} />
                    <span>This artifact is blocking downstream execution pending your sign-off.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 opacity-70">
                    <Sparkles size={14} className="text-purple-400" />
                    <span>Autonomous deliverable synthesized by squad.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                {showRejectInput ? (
                  <div className="flex items-center gap-2 w-full md:w-80">
                    <input
                      type="text"
                      placeholder="Reason for revision request..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className={`flex-1 px-3 py-1.5 rounded-xl text-xs outline-none border-none ${
                        isDark ? 'bg-cat-mocha-surface1 text-white' : 'bg-white text-black shadow-xs'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleReject}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-all border-none cursor-pointer shrink-0"
                    >
                      Confirm Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="text-xs opacity-60 hover:opacity-100 border-none bg-transparent cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer ${
                        isDark 
                          ? 'bg-cat-mocha-red/20 text-cat-mocha-red hover:bg-cat-mocha-red/30' 
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <XCircle size={14} />
                      <span>Request Revision</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApprove}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:opacity-95 transition-all border-none cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve Deliverable</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
