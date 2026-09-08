import { NodeType, NodeStatus, Priority, ThemeMode } from '../types/topology';

export interface CatppuccinPalette {
  rosewater: string;
  flamingo: string;
  pink: string;
  mauve: string;
  red: string;
  maroon: string;
  peach: string;
  yellow: string;
  green: string;
  teal: string;
  sky: string;
  sapphire: string;
  blue: string;
  lavender: string;
  text: string;
  subtext1: string;
  subtext0: string;
  overlay2: string;
  overlay1: string;
  overlay0: string;
  surface2: string;
  surface1: string;
  surface0: string;
  base: string;
  mantle: string;
  crust: string;
}

export const CATPPUCCIN_MOCHA: CatppuccinPalette = {
  rosewater: '#f5e0dc',
  flamingo: '#f2cdcd',
  pink: '#f5c2e7',
  mauve: '#cba6f7',
  red: '#f38ba8',
  maroon: '#eba0ac',
  peach: '#fab387',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  teal: '#94e2d5',
  sky: '#89dceb',
  sapphire: '#74c7ec',
  blue: '#89b4fa',
  lavender: '#b4befe',
  text: '#cdd6f4',
  subtext1: '#bac2de',
  subtext0: '#a6adc8',
  overlay2: '#9399b2',
  overlay1: '#7f849c',
  overlay0: '#6c7086',
  surface2: '#585b70',
  surface1: '#45475a',
  surface0: '#313244',
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b',
};

export const CATPPUCCIN_LATTE: CatppuccinPalette = {
  rosewater: '#dc8a78',
  flamingo: '#dd7878',
  pink: '#ea76cb',
  mauve: '#8839ef',
  red: '#d20f39',
  maroon: '#e64553',
  peach: '#fe640b',
  yellow: '#df8e1d',
  green: '#40a02b',
  teal: '#179299',
  sky: '#04a5e5',
  sapphire: '#209fb5',
  blue: '#1e66f5',
  lavender: '#7287fd',
  text: '#4c4f69',
  subtext1: '#5c5f77',
  subtext0: '#6c6f85',
  overlay2: '#7c7f93',
  overlay1: '#8c8fa1',
  overlay0: '#9ca0b0',
  surface2: '#acb0be',
  surface1: '#bcc0cc',
  surface0: '#ccd0da',
  base: '#eff1f5',
  mantle: '#e6e9ef',
  crust: '#dce0e8',
};

/**
 * World-Class Google Material Light Palette (Default)
 * Authentic Google brand colors (Blue, Red, Yellow, Green, Purple, Teal)
 * on pure elevated paper surfaces and crisp Google Slate typography.
 */
export const GOOGLE_LIGHT: CatppuccinPalette = {
  rosewater: '#fce8e6',
  flamingo: '#fa7b17', // Google Orange 600
  pink: '#e52592',     // Google Pink 600
  mauve: '#9334e6',    // Google Purple 600 (Strategic Goals)
  red: '#ea4335',      // Google Red 500 (Alerts / Critical / Agent Persona)
  maroon: '#d93025',   // Google Red 600
  peach: '#fbbc04',    // Google Yellow 500
  yellow: '#f9ab00',   // Google Amber 600 (Decisions / Active)
  green: '#34a853',    // Google Green 500 (Milestones / Completed)
  teal: '#007b83',     // Google Teal 700 (Artifacts / Contracts)
  sky: '#4285f4',      // Google Blue 500 (Pending / Ready)
  sapphire: '#1a73e8', // Google Blue 600 (Execution Tasks)
  blue: '#1a73e8',     // Iconic Google Blue
  lavender: '#a142f4', // Google Purple 500
  text: '#202124',     // Google Slate Dark 900 (High contrast text)
  subtext1: '#3c4043', // Google Slate 800
  subtext0: '#5f6368', // Google Muted Slate 700
  overlay2: '#747775', // Google Outline
  overlay1: '#80868b', // Google Mid Slate
  overlay0: '#dadce0', // Google Light Divider
  surface2: '#e8eaed', // Google Hover Surface
  surface1: '#dadce0', // Google Dot Grid Accent
  surface0: '#ffffff', // Google Card Paper (Pure White)
  base: '#ffffff',     // Google Pure White Paper
  mantle: '#f8fafd',   // Google Workspace Canvas (Cool Clean White)
  crust: '#edf2fa',    // Google Subtle Backdrop
};

export function getPalette(theme: ThemeMode = 'default'): CatppuccinPalette {
  if (theme === 'catpuccin' || theme === 'mocha') return CATPPUCCIN_MOCHA;
  if (theme === 'light' || theme === 'latte') return CATPPUCCIN_LATTE;
  return GOOGLE_LIGHT; // Default is now Google Light
}

export function getNodeTypeColor(type: NodeType, theme: ThemeMode = 'default'): string {
  const p = getPalette(theme);
  switch (type) {
    case 'goal':
      return p.mauve;    // Google Purple
    case 'task':
      return p.blue;     // Google Blue
    case 'decision':
      return p.yellow;   // Google Amber
    case 'milestone':
      return p.green;    // Google Green
    case 'artifact':
      return p.teal;     // Google Teal
    case 'agent':
      return p.red;      // Google Red
  }
}

export function getStatusColor(status: NodeStatus, theme: ThemeMode = 'mocha'): string {
  const p = getPalette(theme);
  switch (status) {
    case 'draft':
      return p.overlay0;
    case 'pending':
      return p.sky;
    case 'ready':
      return p.lavender;
    case 'in_progress':
      return p.yellow;
    case 'completed':
      return p.green;
    case 'failed':
      return p.red;
    case 'blocked':
      return p.maroon;
    default:
      return p.overlay0;
  }
}

export function getPriorityColor(priority: Priority, theme: ThemeMode = 'mocha'): string {
  const p = getPalette(theme);
  switch (priority) {
    case 'low':
      return p.overlay1;
    case 'medium':
      return p.blue;
    case 'high':
      return p.peach;
    case 'critical':
      return p.red;
    default:
      return p.overlay1;
  }
}

export interface NodeCardStylingResult {
  bgGradient: string;
  background: string;
  boxShadow: string;
  typeColor: string;
  statusColor: string;
  priorityColor: string;
  isDark: boolean;
  typeBadgeBg: string;
  typeBadgeText: string;
  typeLabel: string;
  typeSublabel: string;
}

/**
 * Generates clean, minimal, elevated card surface shading and natural drop shadows.
 * Zero borders! Clean, elegant paper surfaces with a subtle tint of the node's type hue.
 * Free of weird multi-color gradients, neon glow halos, or corner radial pools.
 */
export function getNodeCardStyling(
  type: NodeType, 
  status: NodeStatus, 
  priority: Priority, 
  theme: ThemeMode = 'mocha',
  isSelected: boolean = false,
  isHovered: boolean = false
): NodeCardStylingResult {
  const typeColor = getNodeTypeColor(type, theme);
  const statusColor = getStatusColor(status, theme);
  const priorityColor = getPriorityColor(priority, theme);
  const isLight = theme === 'default' || theme === 'light' || theme === 'latte';
  const isCatppuccin = theme === 'catpuccin' || theme === 'mocha';
  const isGoogleLight = theme === 'default';
  const isDark = !isLight;

  // 1. Signature Type Labels
  let typeLabel = 'Task';
  let typeSublabel = 'Action';
  switch (type) {
    case 'goal':
      typeLabel = 'Goal';
      typeSublabel = 'Strategic Objective';
      break;
    case 'task':
      typeLabel = 'Task';
      typeSublabel = 'Execution Step';
      break;
    case 'decision':
      typeLabel = 'Decision';
      typeSublabel = 'Evaluation Gate';
      break;
    case 'milestone':
      typeLabel = 'Milestone';
      typeSublabel = 'Consolidation Sync';
      break;
    case 'artifact':
      typeLabel = 'Artifact';
      typeSublabel = 'Data Contract';
      break;
    case 'agent':
      typeLabel = 'Agent';
      typeSublabel = 'Autonomous Persona';
      break;
  }

  // 2. Simple, Clean, Minimal Elevated Background Color per Type
  let background = '';
  if (isGoogleLight) {
    // Google Material Light: Elevated crisp white paper with gentle atmospheric jewel tints
    switch (type) {
      case 'goal': // Google Purple
        background = 'rgba(254, 252, 255, 0.98)';
        break;
      case 'task': // Google Blue
        background = 'rgba(251, 253, 255, 0.98)';
        break;
      case 'decision': // Google Amber
        background = 'rgba(255, 254, 249, 0.98)';
        break;
      case 'milestone': // Google Green
        background = 'rgba(251, 255, 252, 0.98)';
        break;
      case 'artifact': // Google Teal
        background = 'rgba(250, 254, 255, 0.98)';
        break;
      case 'agent': // Google Red
        background = 'rgba(255, 251, 251, 0.98)';
        break;
    }
  } else if (isCatppuccin) {
    // Catppuccin Mocha - soft pastel cyber tinting
    switch (type) {
      case 'goal':
        background = 'rgba(34, 28, 44, 0.94)';
        break;
      case 'task':
        background = 'rgba(25, 33, 44, 0.94)';
        break;
      case 'decision':
        background = 'rgba(36, 30, 28, 0.94)';
        break;
      case 'milestone':
        background = 'rgba(26, 35, 29, 0.94)';
        break;
      case 'artifact':
        background = 'rgba(24, 35, 36, 0.94)';
        break;
      case 'agent':
        background = 'rgba(28, 30, 46, 0.94)';
        break;
    }
  } else {
    // Light (Catppuccin Latte) - pristine porcelain paper
    switch (type) {
      case 'goal':
        background = 'rgba(252, 249, 255, 0.98)';
        break;
      case 'task':
        background = 'rgba(247, 251, 254, 0.98)';
        break;
      case 'decision':
        background = 'rgba(255, 251, 248, 0.98)';
        break;
      case 'milestone':
        background = 'rgba(248, 253, 249, 0.98)';
        break;
      case 'artifact':
        background = 'rgba(247, 253, 253, 0.98)';
        break;
      case 'agent':
        background = 'rgba(249, 250, 255, 0.98)';
        break;
    }
  }

  // 3. Clean, Natural Paper Shadows (Zero borders, natural physical elevation)
  let boxShadow = '';
  if (isGoogleLight) {
    // Authentic Google Material elevation
    boxShadow = isSelected
      ? `0 0 0 2.5px ${typeColor}, 0 6px 20px 2px rgba(26, 115, 232, 0.20)`
      : isHovered
      ? '0 2px 6px 0 rgba(60, 64, 67, 0.20), 0 8px 24px 3px rgba(60, 64, 67, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 1)'
      : '0 1px 3px 0 rgba(60, 64, 67, 0.16), 0 4px 14px 1px rgba(60, 64, 67, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 1)';
  } else if (isDark) {
    boxShadow = isSelected
      ? `0 0 0 2px ${typeColor}, 0 12px 28px -4px rgba(0, 0, 0, 0.55)`
      : isHovered
      ? '0 10px 28px -4px rgba(0, 0, 0, 0.50), 0 4px 10px -2px rgba(0, 0, 0, 0.28), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)'
      : '0 4px 16px -2px rgba(0, 0, 0, 0.35), 0 2px 6px -1px rgba(0, 0, 0, 0.20), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)';
  } else {
    boxShadow = isSelected
      ? `0 0 0 2px ${typeColor}, 0 12px 24px -4px rgba(0, 0, 0, 0.10)`
      : isHovered
      ? '0 10px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 1)'
      : '0 4px 16px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)';
  }

  const bgGradient = isDark ? 'text-cat-mocha-text' : 'text-cat-latte-text shadow-sm';
  const typeBadgeBg = hexToRgba(typeColor, isDark ? '0.14' : '0.08');
  const typeBadgeText = typeColor;

  return { 
    bgGradient, 
    background, 
    boxShadow, 
    typeColor, 
    statusColor, 
    priorityColor, 
    isDark,
    typeBadgeBg,
    typeBadgeText,
    typeLabel,
    typeSublabel,
  };
}


/**
 * Generates an ambient multi-layer glow shadow without borders.
 */
export function getAmbientGlow(colorHex: string, intensity: 'low' | 'med' | 'high' = 'med'): string {
  const alpha = intensity === 'low' ? '0.12' : intensity === 'med' ? '0.22' : '0.40';
  return `0 8px 32px -4px ${hexToRgba(colorHex, alpha)}, 0 4px 12px -2px ${hexToRgba(colorHex, '0.15')}`;
}

export function hexToRgba(hex: string, alpha: string | number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
