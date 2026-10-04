import fs from 'fs';
import path from 'path';
import { TOOLS } from '../mcp-server/index.js';

const userProfile = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\Logan';
const mcpGlobalDir = path.resolve(userProfile, '.gemini', 'antigravity', 'mcp', 'topology');
const localSchemasDir = path.resolve(process.cwd(), 'mcp-server', 'schemas');
const globalSkillsDir = path.resolve(userProfile, '.gemini', 'config', 'skills');
const localSkillsDir = path.resolve(process.cwd(), '.agents', 'skills');
const agentsMdPath = path.resolve(process.cwd(), 'AGENTS.md');
const mcpConfigPath = path.resolve(userProfile, '.gemini', 'config', 'mcp_config.json');

console.log('=== Topology Antigravity MCP & Skills Registration ===');

// 1. Ensure directories exist
if (!fs.existsSync(localSchemasDir)) {
  fs.mkdirSync(localSchemasDir, { recursive: true });
}
if (!fs.existsSync(mcpGlobalDir)) {
  fs.mkdirSync(mcpGlobalDir, { recursive: true });
}
if (!fs.existsSync(globalSkillsDir)) {
  fs.mkdirSync(globalSkillsDir, { recursive: true });
}

// 2. Generate and sync all 27 tool schemas from TOOLS in mcp-server/index.js
let syncedSchemaCount = 0;
for (const tool of TOOLS) {
  const schemaPayload = {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  };

  const localFile = path.join(localSchemasDir, `${tool.name}.json`);
  const globalFile = path.join(mcpGlobalDir, `${tool.name}.json`);

  fs.writeFileSync(localFile, JSON.stringify(schemaPayload, null, 2), 'utf8');
  fs.writeFileSync(globalFile, JSON.stringify(schemaPayload), 'utf8');
  syncedSchemaCount++;
}
console.log(`[Schemas] Synced ${syncedSchemaCount} tool schemas to local and global Antigravity MCP directory.`);

// 3. Sync instructions.md from AGENTS.md
if (fs.existsSync(agentsMdPath)) {
  const agentsContent = fs.readFileSync(agentsMdPath, 'utf8');
  const targetInstructions = path.join(mcpGlobalDir, 'instructions.md');
  fs.writeFileSync(targetInstructions, agentsContent, 'utf8');
  console.log(`[Instructions] Synced AGENTS.md -> ${targetInstructions}`);
}

// 4. Sync skills (topology-planner and topology-ooda-loop)
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const skillsToSync = ['topology-planner', 'topology-ooda-loop'];
for (const skillName of skillsToSync) {
  const localSkillDir = path.join(localSkillsDir, skillName);
  const targetSkillDir = path.join(globalSkillsDir, skillName);
  if (fs.existsSync(localSkillDir)) {
    copyDirRecursive(localSkillDir, targetSkillDir);
    console.log(`[Skills] Synced ${skillName} -> ${targetSkillDir}`);
  }
}

// 5. Verify / Update mcp_config.json
try {
  let mcpConfig = {};
  if (fs.existsSync(mcpConfigPath)) {
    mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  }
  if (!mcpConfig.mcpServers) {
    mcpConfig.mcpServers = {};
  }
  const mcpIndexPath = path.resolve(process.cwd(), 'mcp-server', 'index.js');
  mcpConfig.mcpServers.topology = {
    command: 'node',
    args: [mcpIndexPath],
  };
  fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
  console.log(`[Config] Verified and updated ${mcpConfigPath} with topology server.`);
} catch (err) {
  console.warn(`[Config] Notice updating mcp_config.json:`, err.message);
}

console.log('=== All Topology MCP tools and global skills successfully registered! ===\n');
process.exit(0);
