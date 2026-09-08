import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Layers, 
  Search, 
  Bot, 
  ShieldCheck, 
  Terminal,
  CheckCircle2
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import {
  DagCanvasAnimation,
  SpotlightAddAnimation,
  AgentDispatchAnimation,
  HitlApprovalAnimation,
  UniversalHandoffAnimation
} from './TutorialSvgAnimations';

interface TutorialStep {
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  tips: string[];
  animation: React.ReactNode;
}

interface OnboardingTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTutorialModal: React.FC<OnboardingTutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const theme = useTopologyStore(s => s.theme);
  const isLight = theme === 'light' || theme === 'latte';

  const steps: TutorialStep[] = [
    {
      title: 'Precision Spatial DAG Architecture',
      badge: 'CANVAS & LOD',
      badgeColor: 'text-cat-mocha-mauve bg-cat-mocha-mauve/15',
      description: 'Design multi-agent system workflows on an infinite reactive canvas. Semantic Level-of-Detail (LOD) dynamically shifts between Macro (birdseye view), Normal (structured cards), and Micro (full telemetry & schemas) as you zoom.',
      tips: [
        'Right-click or Middle-click drag to pan freely across the workspace.',
        'Use the Minimap in the bottom right to track distant clusters.',
        'Auto-organize your flow anytime using the Dagre Auto-Layout button.'
      ],
      animation: <DagCanvasAnimation />
    },
    {
      title: 'Spotlight Quick-Add & Smart Auto-Connect',
      badge: 'COMFYUI STYLE',
      badgeColor: 'text-cat-mocha-sapphire bg-cat-mocha-sapphire/15',
      description: 'No need to drag from sidebars. Simply click or double-click anywhere on the empty canvas to invoke the floating Spotlight prompt. Type any task name and press Enter.',
      tips: [
        'Topology automatically detects upstream parent nodes and snaps a connecting edge.',
        'Press Tab on any selected node to branch an immediate child subtask.',
        'Press Enter to spawn an adjacent parallel worker unit.'
      ],
      animation: <SpotlightAddAnimation />
    },
    {
      title: 'Autonomous Multi-Agent Orchestration',
      badge: 'EXECUTION ENGINES',
      badgeColor: 'text-cat-mocha-yellow bg-cat-mocha-yellow/15',
      description: 'Assign specialized personas and models to each node: Gemini 2.5 Pro, Flash, Claude 3.7 Sonnet, or Script Runners. Watch real-time thought chains, tool executions, and artifact passing between stages.',
      tips: [
        'Click the "Agent" micro-action button on any node to dispatch autonomous execution.',
        'Output artifacts automatically propagate into downstream nodes\' input context.',
        'Inspect the terminal logs tab to view raw tool invocations and timings.'
      ],
      animation: <AgentDispatchAnimation />
    },
    {
      title: 'Human-In-The-Loop & Decision Gates',
      badge: 'SAFETY & GUARDS',
      badgeColor: 'text-cat-mocha-green bg-cat-mocha-green/15',
      description: 'Ensure mission-critical safety with Human-In-The-Loop (HITL) approval gates. Conditional decision nodes dynamically route execution paths based on evaluated conditions or human sign-off.',
      tips: [
        'Toggle "Requires Approval" to halt execution until a supervisor verifies outputs.',
        'Test branch outcomes with the interactive [TRUE] / [FALSE] route simulator.',
        'Recursive nodes are guarded by stopping invariants to eliminate infinite loops.'
      ],
      animation: <HitlApprovalAnimation />
    },
    {
      title: 'Universal Agent Manifest & Headless Python CLI',
      badge: 'INTEROPERABILITY',
      badgeColor: 'text-cat-mocha-teal bg-cat-mocha-teal/15',
      description: 'Built for humans and AI agents alike. Export your visual graph into an executable headless Python CLI runner (run_topology.py) or copy formatted LLM prompts with all upstream schemas intact.',
      tips: [
        'Click "Copy Agent Prompt" on any node card to handoff context directly to Gemini CLI or Claude.',
        'Export to Obsidian Canvas (.canvas), Mermaid Flowcharts, or Agent DAG JSON.',
        'Run workflows headless in CI/CD pipelines with zero external dependencies.'
      ],
      animation: <UniversalHandoffAnimation />
    }
  ];

  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('topology_tutorial_seen_v1', 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`relative w-full max-w-xl rounded-3xl p-6 shadow-elevated-xl overflow-hidden border-none ${
            isLight 
              ? 'bg-white/95 text-cat-latte-text' 
              : 'bg-[#12141c]/95 text-[#f8fafc]'
          } backdrop-blur-2xl`}
        >
          {/* Top Bar: Step Indicator & Close Button */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${currentStep.badgeColor}`}>
                {currentStep.badge}
              </span>
              <span className="text-xs font-mono opacity-50">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handleComplete}
              className={`p-1.5 rounded-xl transition-colors border-none cursor-pointer ${
                isLight 
                  ? 'hover:bg-cat-latte-surface0 text-cat-latte-overlay1' 
                  : 'hover:bg-white/10 text-cat-mocha-overlay2'
              }`}
              title="Close Tutorial"
            >
              <X size={18} />
            </button>
          </div>

          {/* Bespoke Animated SVG Demonstration */}
          <div className="my-2 shadow-inner rounded-2xl overflow-hidden">
            {currentStep.animation}
          </div>

          {/* Title & Description */}
          <div className="mt-4 space-y-2">
            <h2 className="text-lg font-bold tracking-tight">
              {currentStep.title}
            </h2>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-cat-latte-subtext0' : 'text-[#94a3b8]'}`}>
              {currentStep.description}
            </p>
          </div>

          {/* Pro Tips Box */}
          <div className={`mt-3.5 p-3 rounded-2xl space-y-1.5 ${
            isLight ? 'bg-cat-latte-surface0/70' : 'bg-[#181b26]/70'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5 text-cat-mocha-yellow">
              <Sparkles size={11} />
              <span>Key Capabilities & Shortcuts</span>
            </span>
            <ul className="space-y-1">
              {currentStep.tips.map((tip, idx) => (
                <li key={idx} className={`text-[11px] flex items-start gap-2 ${
                  isLight ? 'text-cat-latte-subtext1' : 'text-[#cbd5e1]'
                }`}>
                  <span className="text-cat-mocha-sapphire font-bold shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Controls: Step Dots & Navigation Buttons */}
          <div className="mt-5 pt-3 flex items-center justify-between">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentStepIndex(i)}
                  className={`h-2 rounded-full transition-all border-none cursor-pointer p-0 ${
                    i === currentStepIndex 
                      ? 'w-6 bg-cat-mocha-mauve' 
                      : 'w-2 bg-cat-mocha-overlay0/40 hover:bg-cat-mocha-overlay0/70'
                  }`}
                  title={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* Next / Back / Complete Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors border-none cursor-pointer ${
                    isLight 
                      ? 'bg-cat-latte-surface0 hover:bg-cat-latte-surface1 text-cat-latte-text' 
                      : 'bg-[#1e2230] hover:bg-[#282d40] text-[#cbd5e1]'
                  }`}
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cat-mocha-mauve to-cat-mocha-sapphire hover:opacity-95 text-white shadow-elevated-md transition-all border-none cursor-pointer"
              >
                <span>{currentStepIndex === steps.length - 1 ? 'Start Building' : 'Next'}</span>
                {currentStepIndex === steps.length - 1 ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
