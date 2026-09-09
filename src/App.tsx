import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTopologyStore } from './store/useTopologyStore';
import { Header } from './components/layout/Header';
import { SidebarFilter } from './components/layout/SidebarFilter';
import { TopologyCanvas2D } from './components/canvas/TopologyCanvas2D';
import { NodeInspector } from './components/inspector/NodeInspector';
import { SimulationBar } from './components/simulator/SimulationBar';
import { PlanGeneratorModal } from './components/generator/PlanGeneratorModal';
import { CoherenceModal } from './components/validation/CoherenceModal';
import { OnboardingTutorialModal } from './components/tutorial/OnboardingTutorialModal';
import { TopologyLibraryModal } from './components/library/TopologyLibraryModal';
import { MultiAgentCockpit } from './components/swarm/MultiAgentCockpit';
import { AgentSyncModal } from './components/modals/AgentSyncModal';
import { GlobalContextModal } from './components/modals/GlobalContextModal';
import { ArtifactViewerModal } from './components/modals/ArtifactViewerModal';
import { useLiveAgentSync } from './services/liveAgentSync';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Sparkles } from 'lucide-react';

const TopologyGraph3D = lazy(() => import('./components/graph3d/TopologyGraph3D').then(m => ({ default: m.TopologyGraph3D })));

export const App: React.FC = () => {
  // Initialize real-time SSE listener, chimes, and notifications
  useLiveAgentSync();

  const viewMode = useTopologyStore(s => s.viewMode);
  const theme = useTopologyStore(s => s.theme);
  const setTheme = useTopologyStore(s => s.setTheme);

  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isCoherenceOpen, setIsCoherenceOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAgentSyncOpen, setIsAgentSyncOpen] = useState(false);
  const [isSharedContextOpen, setIsSharedContextOpen] = useState(false);

  // Initialize theme class on document element & check first-time tutorial
  useEffect(() => {
    setTheme(theme);
    if (typeof window !== 'undefined') {
      const hasSeenTutorial = localStorage.getItem('topology_tutorial_seen_v1');
      if (!hasSeenTutorial) {
        setIsTutorialOpen(true);
      }
    }
  }, []);

  const isLight = theme === 'default' || theme === 'light' || theme === 'latte';
  const bgThemeClass = theme === 'default'
    ? 'bg-[#f8fafd] text-[#202124]'
    : isLight
    ? 'bg-cat-latte-mantle text-cat-latte-text'
    : 'bg-cat-mocha-crust text-cat-mocha-text';

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden select-none ${!isLight ? 'dark' : ''} ${bgThemeClass} transition-colors duration-200`}>
      {/* Top Navigation Bar */}
      <Header 
        onOpenGenerator={() => setIsGeneratorOpen(true)} 
        onOpenCoherence={() => setIsCoherenceOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenAgentSync={() => setIsAgentSyncOpen(true)}
        onOpenSharedContext={() => setIsSharedContextOpen(true)}
      />

      {/* Main Viewport wrapped in ErrorBoundary */}
      <ErrorBoundary>
        <main className="flex-1 relative w-full h-full overflow-hidden">
          {viewMode === '2d' ? (
            <TopologyCanvas2D />
          ) : (
            <Suspense fallback={
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#f8fafd] dark:bg-[#11111b] text-[#5f6368] dark:text-[#94a3b8]">
                <Sparkles size={28} className="text-[#1a73e8] animate-spin" />
                <div className="text-xs font-medium tracking-wide">Initializing 3D Force-Directed Constellation...</div>
              </div>
            }>
              <TopologyGraph3D />
            </Suspense>
          )}

          {/* Floating Collapsible Sidebar & Filter */}
          <SidebarFilter />

          {/* Slide-out Agent Context Protocol Inspector */}
          <NodeInspector />

          {/* Live Simulation Playback Dock */}
          <SimulationBar />

          {/* Multi-Agent Swarm Observability Cockpit Drawer */}
          <MultiAgentCockpit />
        </main>
      </ErrorBoundary>

      {/* Topology Archetype Library & Coverage Map Modal */}
      <TopologyLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
      />

      {/* AI Topology Generator Modal */}
      <PlanGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />

      {/* Graph Coherence Diagnostic Modal */}
      <CoherenceModal
        isOpen={isCoherenceOpen}
        onClose={() => setIsCoherenceOpen(false)}
      />

      {/* Interactive First-Time Onboarding Tutorial Modal */}
      <OnboardingTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Antigravity Live Agent Sync & Notifications Modal */}
      <AgentSyncModal
        isOpen={isAgentSyncOpen}
        onClose={() => setIsAgentSyncOpen(false)}
      />

      {/* Shared Context Blackboard Modal */}
      <GlobalContextModal
        isOpen={isSharedContextOpen}
        onClose={() => setIsSharedContextOpen(false)}
      />

      {/* Elevated Artifact Viewer & HITL Review Modal */}
      <ArtifactViewerModal />
    </div>
  );
};

export default App;
