import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Download, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleResetToSafeState = () => {
    try {
      // Clear corrupt state from localStorage if any
      localStorage.removeItem('topology_active_state_v1');
      // Reset store to known stable sample topology
      useTopologyStore.getState().loadSampleTopology('topology-architecture');
      this.setState({ hasError: false, error: null, errorInfo: null });
    } catch (e) {
      console.error('Failed to reset store:', e);
      window.location.reload();
    }
  };

  handleExportDiagnostic = () => {
    try {
      const state = useTopologyStore.getState();
      const diagnosticData = {
        timestamp: new Date().toISOString(),
        error: {
          name: this.state.error?.name,
          message: this.state.error?.message,
          stack: this.state.error?.stack,
        },
        componentStack: this.state.errorInfo?.componentStack,
        graphStats: {
          nodeCount: state.nodes.length,
          edgeCount: state.edges.length,
          viewMode: state.viewMode,
          theme: state.theme,
        },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      };

      const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topology_crash_diagnostic_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not export diagnostic: ' + String(e));
    }
  };

  handleCopyStack = () => {
    const text = `${this.state.error?.toString()}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-screen flex items-center justify-center p-6 bg-[#f8fafd] dark:bg-[#10121a] text-[#202124] dark:text-[#f8fafc] select-none transition-colors">
          <div className="w-full max-w-xl rounded-3xl p-8 bg-white dark:bg-[#181a24] shadow-elevated-2xl border-none backdrop-blur-2xl">
            {/* Error Header */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#d93025]/10 text-[#d93025] flex items-center justify-center shadow-inner">
                <AlertOctagon size={26} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#202124] dark:text-[#f8fafc]">
                  Topology Render Interrupted
                </h2>
                <p className="text-xs text-[#5f6368] dark:text-[#94a3b8] mt-0.5">
                  An unexpected computational or graph rendering error was captured.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 rounded-2xl bg-[#fce8e6] dark:bg-[#d93025]/15 text-[#c5221f] dark:text-[#f28b82] text-xs font-mono mb-5 overflow-x-auto">
              {this.state.error?.message || 'Unknown runtime error encountered'}
            </div>

            {/* Diagnostic Details Accordion */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="flex items-center justify-between w-full p-2.5 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/10 text-xs font-medium text-[#5f6368] dark:text-[#94a3b8] transition-colors border-none cursor-pointer"
              >
                <span>Diagnostic Stack Trace & Details</span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {this.state.showDetails && (
                <div className="relative mt-2 p-3 rounded-2xl bg-[#202124] text-[#e8eaed] text-[11px] font-mono max-h-48 overflow-y-auto custom-scrollbar">
                  <button
                    type="button"
                    onClick={this.handleCopyStack}
                    className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border-none cursor-pointer flex items-center gap-1 text-[10px]"
                    title="Copy Stack Trace"
                  >
                    {this.state.copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                    <span>{this.state.copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <pre className="whitespace-pre-wrap pr-16">
                    {this.state.error?.stack || 'No stack trace available'}
                    {'\n\nComponent Stack:'}
                    {this.state.errorInfo?.componentStack || 'No component stack available'}
                  </pre>
                </div>
              )}
            </div>

            {/* Recovery Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={this.handleResetToSafeState}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all border-none cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Reset to Safe Canvas</span>
              </button>

              <button
                type="button"
                onClick={this.handleExportDiagnostic}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc] text-xs font-medium transition-colors border-none cursor-pointer"
                title="Download JSON Crash Report"
              >
                <Download size={14} className="text-[#1e8e3e]" />
                <span>Export Report</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc] text-xs font-medium transition-colors border-none cursor-pointer"
                title="Reload Page"
              >
                <RefreshCw size={14} />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
