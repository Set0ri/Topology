import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Wand2, Lightbulb, ArrowRight } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { TopologyNode, TopologyEdge } from '../../types/topology';
import { calculateDagreLayout } from '../../utils/graphAlgorithms';

interface PlanGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_IDEAS = [
  'Build a distributed rate-limited crawler with Redis and Cheerio',
  'Design an automated CI/CD pipeline with Canary deployments and rollback',
  'Autonomous LLM Agent with tool calling and human-in-the-loop review',
  'Fullstack React & Node.js app with real-time WebSockets and Tailwind',
];

export const PlanGeneratorModal: React.FC<PlanGeneratorModalProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const setGraph = useTopologyStore(s => s.setGraph);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      const p = prompt.trim();
      const goalLabel = p.length > 40 ? p.slice(0, 38) + '...' : p;

      // Synthesize multi-tier DAG
      const nodes: TopologyNode[] = [
        {
          id: 'gen-goal',
          type: 'goal',
          label: goalLabel,
          description: `Strategic objective: ${p}`,
          status: 'ready',
          priority: 'critical',
          tags: ['synthesized', 'core'],
          position: { x: 50, y: 150 },
          context: {
            executionType: 'autonomous_agent',
            modelEngine: 'gemini-2.5-pro',
            role: 'Architect',
            promptTemplate: `Establish foundational specifications and decompose requirements for: ${p}`,
            toolsRequired: ['spec_analyzer', 'write_file'],
            inputArtifacts: ['intent_brief.md'],
            outputArtifacts: ['architecture_plan.md'],
            validationCriteria: 'All requirements scoped and dependencies resolved',
            estimatedMinutes: 25,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'gen-spec',
          type: 'task',
          label: 'Define Schema & Data Contracts',
          description: 'Draft API contracts, database schema migrations, and interface signatures.',
          status: 'ready',
          priority: 'high',
          tags: ['schema', 'contracts'],
          position: { x: 350, y: 50 },
          context: {
            executionType: 'autonomous_agent',
            modelEngine: 'gemini-2.5-pro',
            role: 'Architect',
            promptTemplate: 'Generate data models and API signatures matching user requirements.',
            toolsRequired: ['prisma_cli', 'ts_compiler'],
            inputArtifacts: ['architecture_plan.md'],
            outputArtifacts: ['schema.prisma', 'contracts.ts'],
            validationCriteria: 'Schema compiles without errors',
            estimatedMinutes: 30,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'gen-scaffold',
          type: 'task',
          label: 'Scaffold Core Engine & Services',
          description: 'Implement core application routines, middleware, and external service connectors.',
          status: 'pending',
          priority: 'critical',
          tags: ['backend', 'core'],
          position: { x: 350, y: 250 },
          context: {
            executionType: 'autonomous_agent',
            modelEngine: 'claude-3-7-sonnet',
            role: 'CodeGenerator',
            promptTemplate: 'Write clean, strongly typed implementation of backend logic.',
            toolsRequired: ['code_writer', 'package_manager'],
            inputArtifacts: ['contracts.ts'],
            outputArtifacts: ['src/services/core.ts'],
            validationCriteria: 'Unit tests passing with 0 lint warnings',
            estimatedMinutes: 45,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'gen-tests',
          type: 'task',
          label: 'Automated Test Harness & Integration',
          description: 'Execute end-to-end integration tests, load testing, and edge case fuzzing.',
          status: 'pending',
          priority: 'high',
          tags: ['testing', 'qa'],
          position: { x: 680, y: 150 },
          context: {
            executionType: 'automated_script',
            modelEngine: 'script-runner',
            role: 'TestAuditor',
            promptTemplate: 'Run integration test suite to verify end-to-end user workflows.',
            toolsRequired: ['vitest_runner', 'mock_service'],
            inputArtifacts: ['src/services/core.ts'],
            outputArtifacts: ['reports/test_summary.json'],
            validationCriteria: 'Coverage > 85% and no regressions',
            estimatedMinutes: 20,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'gen-eval',
          type: 'decision',
          label: 'Security & Performance Audit',
          description: 'Evaluate rate limits, credential isolation, and audit trail generation.',
          status: 'pending',
          priority: 'high',
          tags: ['security', 'audit'],
          position: { x: 1000, y: 60 },
          context: {
            executionType: 'automated_script',
            modelEngine: 'script-runner',
            role: 'SecurityAnalyst',
            promptTemplate: 'Inspect code for vulnerabilities, leaks, and potential injection attacks.',
            toolsRequired: ['security_scanner', 'snyk_cli'],
            inputArtifacts: ['reports/test_summary.json'],
            outputArtifacts: ['audit_cert.json'],
            validationCriteria: 'Zero critical or high vulnerabilities',
            estimatedMinutes: 15,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'gen-milestone',
          type: 'milestone',
          label: 'Production Release & Delivery',
          description: 'Publish final production build, update docs, and deploy artifacts.',
          status: 'pending',
          priority: 'critical',
          tags: ['deploy', 'release'],
          position: { x: 1000, y: 240 },
          context: {
            executionType: 'human_operator',
            modelEngine: 'human-operator',
            role: 'Synthesizer',
            promptTemplate: 'Package release artifacts, write release notes, and notify stakeholders.',
            toolsRequired: ['deploy_cli', 'slack_webhook'],
            inputArtifacts: ['audit_cert.json'],
            outputArtifacts: ['DEPLOYMENT_RECEIPT.md'],
            validationCriteria: 'Health check 200 OK in production environment',
            estimatedMinutes: 10,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const edges: TopologyEdge[] = [
        { id: 'ge1', source: 'gen-goal', target: 'gen-spec', type: 'subtask', label: 'specs' },
        { id: 'ge2', source: 'gen-goal', target: 'gen-scaffold', type: 'subtask', label: 'scaffold' },
        { id: 'ge3', source: 'gen-spec', target: 'gen-tests', type: 'depends_on', label: 'contracts' },
        { id: 'ge4', source: 'gen-scaffold', target: 'gen-tests', type: 'depends_on', label: 'impl' },
        { id: 'ge5', source: 'gen-tests', target: 'gen-eval', type: 'depends_on', label: 'verify' },
        { id: 'ge6', source: 'gen-tests', target: 'gen-milestone', type: 'depends_on', label: 'ship' },
      ];

      // Auto-layout
      const layoutPositions = calculateDagreLayout(nodes, edges, 'LR');
      const alignedNodes = nodes.map(n => ({
        ...n,
        position: layoutPositions[n.id] || n.position,
      }));

      setGraph(alignedNodes, edges);
      setIsGenerating(false);
      onClose();
    }, 450);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl p-4 sm:p-6 bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] shadow-elevated-2xl border-none overflow-y-auto custom-scrollbar transition-colors duration-200 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-none">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-[#1a73e8]/10 text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]">
                <Wand2 size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#f8fafc]">
                  Agent Plan Synthesizer
                </h3>
                <p className="text-[11px] sm:text-xs text-[#5f6368] dark:text-[#94a3b8]">
                  Compile high-level goals into dependency-ordered topology graphs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Textarea Input */}
          <div className="mt-2 space-y-3">
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What project, workflow, or agent task do you want to plan? (e.g. 'Build an automated code review bot with GitHub API integration and Discord notifications')"
              className="w-full p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed bg-slate-100/70 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] placeholder-[#5f6368]/60 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/40 border-none resize-none transition-all"
            />

            {/* Presets */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#5f6368] dark:text-[#94a3b8] mb-2">
                <Lightbulb size={12} className="text-[#f9ab00]" />
                <span>Quick Inspiration:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IDEAS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setPrompt(idea)}
                    className="text-left text-[11px] px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer leading-tight"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-none">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#5f6368] dark:text-[#94a3b8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isGenerating || !prompt.trim()}
              onClick={handleGenerate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all duration-150 disabled:opacity-50 border-none cursor-pointer shadow-elevated-md"
            >
              {isGenerating ? (
                <>
                  <Sparkles size={14} className="animate-spin" />
                  <span>Synthesizing Topology...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate Topology Graph</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
