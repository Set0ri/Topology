import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scanDirectoryForBorderViolations, createTempDir, cleanupTempDir } from './testHarness.mjs';

// ============================================================================
// Tier 1: Feature Coverage (>=5 tests)
// ============================================================================

test('Zero-Border Audit - Scans src/components/council/ and asserts 0 forbidden border classes', () => {
  const councilDir = path.resolve(process.cwd(), 'src', 'components', 'council');
  assert.ok(fs.existsSync(councilDir), 'src/components/council directory must exist');

  const violations = scanDirectoryForBorderViolations(councilDir);

  if (violations.length > 0) {
    const details = violations.map(v => `  - [${path.basename(v.file)}:${v.line}] Token: '${v.token}' -> "${v.snippet}"`).join('\n');
    assert.fail(`Found ${violations.length} forbidden border classes in src/components/council/:\n${details}`);
  }

  assert.equal(violations.length, 0, 'Zero border violations allowed in council components');
});

test('Zero-Border Audit - Permitted exceptions (border-none, border-0) are allowed without flagging', () => {
  const tempDir = createTempDir('zero-border-test-');
  try {
    const validComponentPath = path.join(tempDir, 'ValidElevatedCard.tsx');
    const validContent = `
      export function ValidElevatedCard() {
        return (
          <div className="relative rounded-2xl border-none outline-none backdrop-blur-xl shadow-2xl bg-white/[0.03]">
            <button className="px-4 py-2 border-0 rounded-xl bg-indigo-500 text-white">Click</button>
          </div>
        );
      }
    `;
    fs.writeFileSync(validComponentPath, validContent, 'utf-8');

    const violations = scanDirectoryForBorderViolations(tempDir);
    assert.equal(violations.length, 0, 'border-none and border-0 must be permitted exceptions');
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('Zero-Border Audit - Council Modal shell strictly complies with zero borders', () => {
  const modalPath = path.resolve(process.cwd(), 'src', 'components', 'council', 'CouncilMonitorModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'CouncilMonitorModal.tsx must exist');

  const content = fs.readFileSync(modalPath, 'utf-8');
  assert.ok(content.length > 0);

  // Assert modal does not contain raw 'border ' or 'border-' except 'border-none' or 'border-0'
  const lines = content.split('\n');
  const modalViolations = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/(?:className|class)\s*=\s*(?:\{`([^`]+)`\}|"([^"]+)"|'([^']+)')/);
    if (match) {
      const cls = match[1] || match[2] || match[3] || '';
      const tokens = cls.split(/\s+/);
      for (const t of tokens) {
        if (t === 'border' || (t.startsWith('border-') && t !== 'border-none' && t !== 'border-0')) {
          modalViolations.push({ line: i + 1, token: t, snippet: line.trim() });
        }
      }
    }
  }

  assert.equal(modalViolations.length, 0, `CouncilMonitorModal.tsx must have 0 border violations, found: ${modalViolations.length}`);
});

test('Zero-Border Audit - Inline style={{ border: ... }} is detected and prohibited', () => {
  const tempDir = createTempDir('inline-style-border-');
  try {
    const inlineStyleComponent = path.join(tempDir, 'BadInlineCard.tsx');
    const badContent = `
      export function BadInlineCard() {
        return (
          <div style={{ border: '1px solid red', padding: '12px' }}>
            <span style={{ borderWidth: 2 }}>Bad</span>
          </div>
        );
      }
    `;
    fs.writeFileSync(inlineStyleComponent, badContent, 'utf-8');

    const violations = scanDirectoryForBorderViolations(tempDir);
    assert.ok(violations.length >= 1, 'Inline border style must be detected as violation');
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('Zero-Border Audit - Elevated Glassmorphism (backdrop-blur, shadow, rounded) is present', () => {
  const modalPath = path.resolve(process.cwd(), 'src', 'components', 'council', 'CouncilMonitorModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');

  // Verify elevated card glassmorphism attributes are present
  assert.ok(content.includes('backdrop-blur'), 'Modal must use backdrop blur for elevation');
  assert.ok(content.includes('shadow-'), 'Modal must use shadow for elevation');
  assert.ok(content.includes('rounded-'), 'Modal must use rounded corners');
});

// ============================================================================
// Tier 2: Boundary & Corner Cases
// ============================================================================

test('Zero-Border Audit - Color border utility classes (border-slate-800, border-indigo-500) detected', () => {
  const tempDir = createTempDir('color-border-');
  try {
    const compPath = path.join(tempDir, 'ColorBorderCard.tsx');
    const content = `
      export function ColorBorderCard() {
        return <div className="p-4 border-slate-800 border-indigo-500">Test</div>;
      }
    `;
    fs.writeFileSync(compPath, content, 'utf-8');

    const violations = scanDirectoryForBorderViolations(tempDir);
    assert.equal(violations.length, 2);
    assert.ok(violations.some(v => v.token === 'border-slate-800'));
    assert.ok(violations.some(v => v.token === 'border-indigo-500'));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('Zero-Border Audit - Directional border utility classes (border-t, border-b) detected', () => {
  const tempDir = createTempDir('directional-border-');
  try {
    const compPath = path.join(tempDir, 'DirectionalBorderCard.tsx');
    const content = `
      export function DirectionalBorderCard() {
        return <div className="border-t border-b border-l border-r">Test</div>;
      }
    `;
    fs.writeFileSync(compPath, content, 'utf-8');

    const violations = scanDirectoryForBorderViolations(tempDir);
    assert.equal(violations.length, 4);
    assert.ok(violations.some(v => v.token === 'border-t'));
    assert.ok(violations.some(v => v.token === 'border-b'));
    assert.ok(violations.some(v => v.token === 'border-l'));
    assert.ok(violations.some(v => v.token === 'border-r'));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('Zero-Border Audit - Width & Arbitrary border utility classes (border-2, border-[1px]) detected', () => {
  const tempDir = createTempDir('width-border-');
  try {
    const compPath = path.join(tempDir, 'WidthBorderCard.tsx');
    const content = `
      export function WidthBorderCard() {
        return <div className="border border-2 border-[1px]">Test</div>;
      }
    `;
    fs.writeFileSync(compPath, content, 'utf-8');

    const violations = scanDirectoryForBorderViolations(tempDir);
    assert.equal(violations.length, 3);
    assert.ok(violations.some(v => v.token === 'border'));
    assert.ok(violations.some(v => v.token === 'border-2'));
    assert.ok(violations.some(v => v.token === 'border-[1px]'));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('Zero-Border Audit - False positive safety: non-class phrases and words are not flagged', () => {
  const tempDir = createTempDir('false-positive-');
  try {
    const compPath = path.join(tempDir, 'BenignComponent.tsx');
    const content = `
      // This comment discusses cross-border data transfer
      export function BenignComponent() {
        const title = "Border control settings";
        return <div className="p-4 bg-slate-900 text-white">{title}</div>;
      }
    `;
    fs.writeFileSync(compPath, content, 'utf-8');

    const violations = scanDirectoryForBorderViolations(tempDir);
    assert.equal(violations.length, 0, 'Non-class occurrences of border must not be flagged');
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('Zero-Border Audit - Catppuccin theme color borders are prohibited', () => {
  const tempDir = createTempDir('catppuccin-border-');
  try {
    const compPath = path.join(tempDir, 'CatppuccinBorder.tsx');
    const content = `
      export function CatppuccinBorder() {
        return <div className="border-cat-surface0 border-cat-overlay0">Test</div>;
      }
    `;
    fs.writeFileSync(compPath, content, 'utf-8');

    const violations = scanDirectoryForBorderViolations(tempDir);
    assert.equal(violations.length, 2);
  } finally {
    cleanupTempDir(tempDir);
  }
});

// ============================================================================
// Tier 3: Cross-Feature Combinations
// ============================================================================

test('Zero-Border Audit - ElevatedCard primitive strictly enforces border-none', () => {
  const elevatedCardPath = path.resolve(process.cwd(), 'src', 'components', 'common', 'ElevatedCard.tsx');
  if (fs.existsSync(elevatedCardPath)) {
    const content = fs.readFileSync(elevatedCardPath, 'utf-8');
    assert.ok(content.includes('border-none'), 'ElevatedCard must explicitly include border-none');
    assert.ok(content.includes('backdrop-blur'), 'ElevatedCard must use backdrop-blur');
  }
});

test('Zero-Border Audit - Scans both src/components/council/ and modal components without violations', () => {
  const councilDir = path.resolve(process.cwd(), 'src', 'components', 'council');
  const violations = scanDirectoryForBorderViolations(councilDir);
  assert.equal(violations.length, 0);
});

test('Zero-Border Audit - Violation report accurately provides line, file, and offending token', () => {
  const tempDir = createTempDir('violation-report-');
  try {
    const compPath = path.join(tempDir, 'Offender.tsx');
    const content = `import React from 'react';\n\nexport const Bad = () => <div className="border-red-500" />;`;
    fs.writeFileSync(compPath, content, 'utf-8');

    const violations = scanDirectoryForBorderViolations(tempDir);
    assert.equal(violations.length, 1);
    const v = violations[0];
    assert.equal(v.line, 3);
    assert.equal(v.token, 'border-red-500');
    assert.ok(v.snippet.includes('border-red-500'));
    assert.equal(v.file, compPath);
  } finally {
    cleanupTempDir(tempDir);
  }
});

// ============================================================================
// Tier 4: Real-World Application Scenario
// ============================================================================

test('Zero-Border Audit - Complete Production Council Visualizer Surface 100% Zero-Border Compliant', () => {
  const councilDir = path.resolve(process.cwd(), 'src', 'components', 'council');
  const violations = scanDirectoryForBorderViolations(councilDir);

  assert.equal(
    violations.length,
    0,
    `Production Council Visualizer surface must have exactly 0 border violations. Violations detected: ${JSON.stringify(violations, null, 2)}`
  );
});

test('Zero-Border Audit - Canvas, Inspector, and Layout surfaces 100% Zero-Border Compliant', () => {
  const dirs = [
    path.resolve(process.cwd(), 'src', 'components', 'canvas'),
    path.resolve(process.cwd(), 'src', 'components', 'inspector'),
    path.resolve(process.cwd(), 'src', 'components', 'layout'),
  ];

  const allViolations = [];
  for (const dir of dirs) {
    allViolations.push(...scanDirectoryForBorderViolations(dir));
  }

  assert.equal(
    allViolations.length,
    0,
    `Production Canvas, Inspector, and Layout surfaces must have exactly 0 border violations. Violations detected: ${JSON.stringify(allViolations, null, 2)}`
  );
});
