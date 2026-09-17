import fs from 'fs';
import path from 'path';

const mcpGlobalDir = path.resolve(process.env.USERPROFILE, '.gemini', 'antigravity', 'mcp', 'topology');
const localSchemasDir = path.resolve(process.cwd(), 'mcp-server', 'schemas');

if (!fs.existsSync(localSchemasDir)) {
  fs.mkdirSync(localSchemasDir, { recursive: true });
}

const spawnCouncilSchema = {
  name: 'topology_spawn_council',
  description: 'Spawn a recurrent multi-model council for ideation, planning, and research (Gemini 3.8 Flash, Claude 4.6 Opus, and GPT-OSS 120b). Deliberates in 3 phases (independent ideation -> adversarial peer review -> unified DAG synthesis) with hard budget stops before exceeding Gemini Ultra plan limits.',
  parameters: {
    type: 'object',
    properties: {
      goal: {
        type: 'string',
        description: 'The research topic, architecture proposal, or feature goal for the council to deliberate on'
      },
      planId: {
        type: 'string',
        description: 'Optional unique plan ID for visualizing the deliberation on the Topology canvas'
      },
      rounds: {
        type: 'number',
        default: 3,
        description: 'Number of deliberation rounds (1: Ideate, 2: Critique, 3: Consensus)'
      },
      strategy: {
        type: 'string',
        enum: [
          'halt_before_limit',
          'fallback_gemini_flash',
          'pause_for_refresh'
        ],
        default: 'halt_before_limit',
        description: 'Allocation strategy when a model reaches its 85% safety quota ceiling'
      },
      contextFiles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional relative file paths or code files to feed directly into council deliberation as context'
      },
      constraints: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional non-negotiable architectural invariants or constraints (e.g. "Zero borders UI", "Memory < 128MB")'
      },
      specialists: {
        type: 'object',
        description: 'Optional specialist persona overrides for the 3 council seats'
      },
      saveAdr: {
        type: 'boolean',
        default: true,
        description: 'Whether to automatically format and write an Architectural Decision Record (ADR) in docs/adr/'
      }
    },
    required: ['goal']
  }
};

const getCouncilBudgetSchema = {
  name: 'topology_get_council_budget',
  description: 'Inspect live quota allocations, RPM/TPM usage, daily counts, sliding window TTR countdowns, and estimated USD cost for the Gemini Ultra multi-model council (Gemini 3.8 Flash, Claude 4.6 Opus, GPT-OSS 120b).',
  parameters: {
    type: 'object',
    properties: {
      modelId: {
        type: 'string',
        enum: ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'],
        description: 'Filter report to a specific model ID'
      },
      reset: {
        type: 'boolean',
        default: false,
        description: 'Set true to reset usage metrics'
      }
    }
  }
};

const exportCouncilAdrSchema = {
  name: 'topology_export_council_adr',
  description: 'Export the consensus of a council deliberation session into a standardized Architectural Decision Record (ADR) Markdown document, optionally written to docs/adr/.',
  parameters: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Optional session ID or plan ID of the council deliberation. Defaults to the most recent session.'
      },
      title: {
        type: 'string',
        description: 'Optional override title for the ADR document'
      },
      saveToDisk: {
        type: 'boolean',
        default: true,
        description: 'Whether to write the generated ADR Markdown file to docs/adr/ in the workspace'
      }
    }
  }
};

const listCouncilSessionsSchema = {
  name: 'topology_list_council_sessions',
  description: 'Query, list, and search previous council deliberation sessions, their synthesized consensus architectures, token footprints, and ADR files.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        default: 10,
        description: 'Maximum number of recent sessions to retrieve'
      }
    }
  }
};

const emitLoopTelemetrySchema = JSON.parse(fs.readFileSync(path.join(localSchemasDir, 'topology_emit_loop_telemetry.json'), 'utf8'));
const getLoopTelemetrySchema = JSON.parse(fs.readFileSync(path.join(localSchemasDir, 'topology_get_loop_telemetry.json'), 'utf8'));

const schemas = [
  { name: 'topology_spawn_council.json', data: spawnCouncilSchema },
  { name: 'topology_get_council_budget.json', data: getCouncilBudgetSchema },
  { name: 'topology_export_council_adr.json', data: exportCouncilAdrSchema },
  { name: 'topology_list_council_sessions.json', data: listCouncilSessionsSchema },
  { name: 'topology_emit_loop_telemetry.json', data: emitLoopTelemetrySchema },
  { name: 'topology_get_loop_telemetry.json', data: getLoopTelemetrySchema }
];

for (const s of schemas) {
  const localPath = path.join(localSchemasDir, s.name);
  fs.writeFileSync(localPath, JSON.stringify(s.data, null, 2), 'utf8');
  console.log(`Wrote local schema: ${localPath}`);

  if (fs.existsSync(mcpGlobalDir)) {
    const globalPath = path.join(mcpGlobalDir, s.name);
    fs.writeFileSync(globalPath, JSON.stringify(s.data), 'utf8');
    console.log(`Synced to Antigravity MCP: ${globalPath}`);
  }
}

console.log('All 6 Council & Loop Telemetry MCP tool schemas updated and synced.');
