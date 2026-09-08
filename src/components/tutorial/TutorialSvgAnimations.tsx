import React from 'react';

/**
 * 1. DAG Canvas & Spatial Flow Animation
 */
export const DagCanvasAnimation: React.FC = () => {
  return (
    <div className="w-full h-44 flex items-center justify-center relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141724]/90 to-[#0c0d14]/90">
      <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#334155" fillOpacity="0.4" />
          </pattern>
          <linearGradient id="edge-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="edge-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#dot-grid)" />

        {/* Bezier Edge 1 */}
        <path
          d="M 105 90 C 150 90, 160 55, 205 55"
          stroke="url(#edge-grad-1)"
          strokeWidth="2.5"
          strokeDasharray="4 3"
          strokeOpacity="0.75"
        />

        {/* Bezier Edge 2 */}
        <path
          d="M 105 90 C 150 90, 160 125, 205 125"
          stroke="url(#edge-grad-1)"
          strokeWidth="2.5"
          strokeOpacity="0.75"
        />

        {/* Bezier Edge 3 */}
        <path
          d="M 295 55 C 325 55, 330 90, 350 90"
          stroke="url(#edge-grad-2)"
          strokeWidth="2.5"
          strokeOpacity="0.75"
        />
        <path
          d="M 295 125 C 325 125, 330 90, 350 90"
          stroke="url(#edge-grad-2)"
          strokeWidth="2.5"
          strokeOpacity="0.75"
        />

        {/* Flowing Pulse 1 */}
        <circle r="4" fill="#a78bfa" filter="url(#soft-glow)">
          <animateMotion
            path="M 105 90 C 150 90, 160 55, 205 55"
            dur="2.2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Flowing Pulse 2 */}
        <circle r="4" fill="#3b82f6" filter="url(#soft-glow)">
          <animateMotion
            path="M 105 90 C 150 90, 160 125, 205 125"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Node 1: Root Goal */}
        <g transform="translate(30, 68)">
          <rect width="75" height="44" rx="10" fill="#201830" filter="url(#soft-glow)" />
          <rect x="0.5" y="0.5" width="74" height="43" rx="9.5" fill="#181424" />
          <circle cx="16" cy="22" r="5" fill="#a78bfa" />
          <text x="27" y="20" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Root Goal</text>
          <text x="27" y="30" fill="#a78bfa" fontSize="7" fontFamily="monospace">INITIATED</text>
        </g>

        {/* Node 2: Sub-Task A */}
        <g transform="translate(205, 33)">
          <rect width="90" height="44" rx="10" fill="#142236" />
          <circle cx="16" cy="22" r="5" fill="#3b82f6" />
          <text x="28" y="20" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Parse Spec</text>
          <text x="28" y="30" fill="#3b82f6" fontSize="7" fontFamily="monospace">IN_PROGRESS</text>
        </g>

        {/* Node 3: Sub-Task B */}
        <g transform="translate(205, 103)">
          <rect width="90" height="44" rx="10" fill="#142236" />
          <circle cx="16" cy="22" r="5" fill="#06b6d4" />
          <text x="28" y="20" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Mock Tools</text>
          <text x="28" y="30" fill="#06b6d4" fontSize="7" fontFamily="monospace">PARALLEL</text>
        </g>

        {/* Node 4: Milestone Target */}
        <g transform="translate(330, 68)">
          <rect width="60" height="44" rx="10" fill="#142820" />
          <circle cx="15" cy="22" r="5" fill="#10b981" />
          <text x="26" y="24" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Deploy</text>
        </g>
      </svg>
    </div>
  );
};

/**
 * 2. Spotlight Quick-Add & Smart Auto-Connect Animation
 */
export const SpotlightAddAnimation: React.FC = () => {
  return (
    <div className="w-full h-44 flex items-center justify-center relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141724]/90 to-[#0c0d14]/90">
      <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="spotlight-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Existing Selected Node */}
        <g transform="translate(40, 68)">
          <rect width="95" height="44" rx="10" fill="#162032" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="18" cy="22" r="5" fill="#3b82f6" />
          <text x="30" y="20" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Build Engine</text>
          <text x="30" y="30" fill="#3b82f6" fontSize="7" fontFamily="monospace">SELECTED</text>
        </g>

        {/* Elastic Smart Snap Wire */}
        <path
          d="M 135 90 C 180 90, 190 90, 230 90"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeDasharray="5 3"
        >
          <animate attributeName="stroke-dashoffset" values="16;0" dur="1s" repeatCount="indefinite" />
        </path>

        {/* Click Ripple Indicator */}
        <circle cx="230" cy="90" r="18" fill="none" stroke="#a78bfa" strokeWidth="1.5" opacity="0.4">
          <animate attributeName="r" values="6;26" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
        </circle>

        {/* Floating Spotlight Card */}
        <g transform="translate(200, 35)" filter="url(#spotlight-shadow)">
          <rect width="180" height="110" rx="14" fill="#181b26" />
          {/* Input field */}
          <rect x="10" y="10" width="160" height="28" rx="8" fill="#222738" />
          <text x="22" y="28" fill="#f8fafc" fontSize="10" fontFamily="sans-serif">Synthesize API|</text>

          {/* Quick options */}
          <g transform="translate(10, 46)">
            <rect width="160" height="24" rx="6" fill="#a78bfa" fillOpacity="0.16" />
            <circle cx="12" cy="12" r="3.5" fill="#a78bfa" />
            <text x="22" y="15" fill="#f8fafc" fontSize="9" fontWeight="600" fontFamily="sans-serif">Task Node</text>
            <text x="125" y="15" fill="#a78bfa" fontSize="8" fontFamily="monospace">Auto-link</text>
          </g>

          <g transform="translate(10, 74)">
            <rect width="160" height="24" rx="6" fill="#222738" />
            <circle cx="12" cy="12" r="3.5" fill="#f59e0b" />
            <text x="22" y="15" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Decision Gate</text>
          </g>
        </g>
      </svg>
    </div>
  );
};

/**
 * 3. Autonomous Multi-Agent Orchestration & Live Telemetry
 */
export const AgentDispatchAnimation: React.FC = () => {
  return (
    <div className="w-full h-44 flex items-center justify-center relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141724]/90 to-[#0c0d14]/90">
      <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="terminal-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Dispatch Bot Card */}
        <g transform="translate(25, 45)">
          <rect width="130" height="90" rx="14" fill="#201a2e" />
          <circle cx="24" cy="26" r="10" fill="#a78bfa" fillOpacity="0.25" />
          {/* Bot Face */}
          <rect x="18" y="21" width="12" height="10" rx="3" fill="#a78bfa" />
          <circle cx="21" cy="25" r="1.5" fill="#0f1117" />
          <circle cx="27" cy="25" r="1.5" fill="#0f1117" />

          <text x="40" y="24" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="sans-serif">Gemini Agent</text>
          <text x="40" y="34" fill="#a78bfa" fontSize="8" fontFamily="monospace">ROLE: ARCHITECT</text>

          {/* Thought Bubble */}
          <rect x="12" y="48" width="106" height="30" rx="6" fill="#161324" />
          <text x="18" y="62" fill="#fbbf24" fontSize="8" fontFamily="monospace">"Reading DAG spec..."</text>
          <circle cx="100" cy="66" r="2.5" fill="#fbbf24">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Flowing Data Stream */}
        <path d="M 155 90 L 195 90" stroke="#a78bfa" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="175" cy="90" r="3" fill="#a78bfa">
          <animate attributeName="cx" values="155;195" dur="1.5s" repeatCount="indefinite" />
        </circle>

        {/* Terminal Output Window */}
        <g transform="translate(195, 30)" filter="url(#terminal-shadow)">
          <rect width="180" height="120" rx="12" fill="#0b0e14" />
          {/* Title Bar */}
          <rect width="180" height="22" rx="12" fill="#161b26" />
          <circle cx="14" cy="11" r="3.5" fill="#ef4444" />
          <circle cx="25" cy="11" r="3.5" fill="#f59e0b" />
          <circle cx="36" cy="11" r="3.5" fill="#10b981" />
          <text x="50" y="14" fill="#94a3b8" fontSize="8" fontFamily="monospace">telemetry_stream.log</text>

          {/* Logs */}
          <text x="12" y="38" fill="#10b981" fontSize="8" fontFamily="monospace">$ dispatch --engine pro</text>
          <text x="12" y="52" fill="#cbd5e1" fontSize="8" fontFamily="monospace">[00:01] Loading input schemas</text>
          <text x="12" y="66" fill="#cbd5e1" fontSize="8" fontFamily="monospace">[00:02] Tool: ast_analyzer</text>
          <text x="12" y="80" fill="#38bdf8" fontSize="8" fontFamily="monospace">[00:03] Payload: schema.json</text>
          <text x="12" y="96" fill="#a78bfa" fontSize="8" fontFamily="monospace">[00:04] Invariants verified ✓</text>
        </g>
      </svg>
    </div>
  );
};

/**
 * 4. Human-In-The-Loop (HITL) Gates & Decision Routers
 */
export const HitlApprovalAnimation: React.FC = () => {
  return (
    <div className="w-full h-44 flex items-center justify-center relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141724]/90 to-[#0c0d14]/90">
      <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Decision Router Node */}
        <g transform="translate(30, 68)">
          <polygon points="45,0 90,22 45,44 0,22" fill="#2a1f18" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="45" y="24" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Gate Check</text>
          <text x="45" y="33" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="monospace">EVALUATE</text>
        </g>

        {/* Branch Paths */}
        {/* TRUE Branch (Green) */}
        <path d="M 120 75 C 160 50, 180 50, 210 50" stroke="#10b981" strokeWidth="2.5" />
        <text x="155" y="44" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="monospace">TRUE</text>

        {/* FALSE Branch (Amber) */}
        <path d="M 120 105 C 160 130, 180 130, 210 130" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
        <text x="155" y="142" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace">FALSE</text>

        {/* Human Sign-Off Modal Card */}
        <g transform="translate(210, 25)">
          <rect width="165" height="130" rx="14" fill="#161e22" />
          {/* Header */}
          <circle cx="22" cy="22" r="8" fill="#10b981" fillOpacity="0.2" />
          <path d="M 18 22 L 21 25 L 26 19" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <text x="36" y="20" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="sans-serif">Supervisor Sign-Off</text>
          <text x="36" y="30" fill="#10b981" fontSize="8" fontFamily="monospace">STATUS: APPROVED</text>

          {/* Notes preview */}
          <rect x="12" y="42" width="141" height="42" rx="8" fill="#0d1418" />
          <text x="18" y="56" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">"Security audit passed.</text>
          <text x="18" y="68" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">All unit tests conforming."</text>

          {/* Action Button */}
          <rect x="12" y="92" width="141" height="26" rx="8" fill="#10b981" />
          <text x="82" y="108" textAnchor="middle" fill="#091410" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Unblock Downstream</text>
        </g>
      </svg>
    </div>
  );
};

/**
 * 5. Universal Agent Manifest & Headless Python CLI Interop
 */
export const UniversalHandoffAnimation: React.FC = () => {
  return (
    <div className="w-full h-44 flex items-center justify-center relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141724]/90 to-[#0c0d14]/90">
      <svg className="w-full h-full" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Central Core Manifest */}
        <g transform="translate(130, 40)">
          <rect width="140" height="100" rx="14" fill="#1a1c29" stroke="#3b82f6" strokeWidth="1.5" />
          <rect x="15" y="15" width="24" height="24" rx="6" fill="#3b82f6" fillOpacity="0.2" />
          <text x="21" y="31" fill="#3b82f6" fontSize="12" fontWeight="bold" fontFamily="monospace">&lt;/&gt;</text>
          <text x="46" y="24" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="sans-serif">Universal Manifest</text>
          <text x="46" y="34" fill="#38bdf8" fontSize="8" fontFamily="monospace">agent_dag.json</text>

          <line x1="15" y1="50" x2="125" y2="50" stroke="#2a3045" />

          <text x="18" y="65" fill="#cbd5e1" fontSize="8" fontFamily="monospace">• Kahn Topological Plan</text>
          <text x="18" y="77" fill="#cbd5e1" fontSize="8" fontFamily="monospace">• Upstream Artifact IO</text>
          <text x="18" y="89" fill="#10b981" fontSize="8" fontFamily="monospace">• Stopping Guard Invariant</text>
        </g>

        {/* Left Handoff: Gemini CLI */}
        <g transform="translate(20, 60)">
          <rect width="90" height="60" rx="10" fill="#161324" />
          <text x="45" y="25" textAnchor="middle" fill="#a78bfa" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Gemini CLI</text>
          <rect x="8" y="34" width="74" height="18" rx="4" fill="#211b36" />
          <text x="45" y="46" textAnchor="middle" fill="#f8fafc" fontSize="7" fontFamily="monospace">gemini run</text>
        </g>

        <path d="M 110 90 L 130 90" stroke="#a78bfa" strokeWidth="2" strokeDasharray="3 3" />

        {/* Right Handoff: Headless Python Runner */}
        <g transform="translate(290, 60)">
          <rect width="90" height="60" rx="10" fill="#142028" />
          <text x="45" y="25" textAnchor="middle" fill="#06b6d4" fontSize="9" fontWeight="bold" fontFamily="sans-serif">Python CLI</text>
          <rect x="8" y="34" width="74" height="18" rx="4" fill="#182e38" />
          <text x="45" y="46" textAnchor="middle" fill="#f8fafc" fontSize="7" fontFamily="monospace">python run.py</text>
        </g>

        <path d="M 270 90 L 290 90" stroke="#06b6d4" strokeWidth="2" strokeDasharray="3 3" />
      </svg>
    </div>
  );
};
