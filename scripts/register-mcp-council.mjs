import fs from 'fs';
import path from 'path';

const mcpGlobalDir = path.resolve(process.env.USERPROFILE, '.gemini', 'antigravity', 'mcp', 'topology');
const localSchemasDir = path.resolve(process.cwd(), 'mcp-server', 'schemas');

if (!fs.existsSync(localSchemasDir)) {
  fs.mkdirSync(localSchemasDir, { recursive: true });
}

// Read all JSON schema files from local mcp-server/schemas
const schemaFiles = fs.readdirSync(localSchemasDir).filter(f => f.endsWith('.json'));

let syncedCount = 0;
for (const file of schemaFiles) {
  const localPath = path.join(localSchemasDir, file);
  const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));

  // Ensure pretty-formatted in local schemas
  fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Verified local schema: ${file}`);

  if (fs.existsSync(mcpGlobalDir)) {
    const globalPath = path.join(mcpGlobalDir, file);
    fs.writeFileSync(globalPath, JSON.stringify(data), 'utf8');
    console.log(`Synced to Antigravity MCP: ${globalPath}`);
    syncedCount++;
  }
}

console.log(`Successfully synced ${syncedCount} Council, Loop, and Model schemas to ${mcpGlobalDir}`);
