import { ParamSpec } from './types';

/**
 * Unified visual themes for display templates. Picking a theme injects its
 * design tokens into the generated code as `$p.__theme` (see
 * defineGalleryModel), so template bodies style themselves with `T.*` tokens
 * instead of hard-coded colors. The picker renders these as a visual swatch
 * wall (not a text dropdown).
 */

export interface ThemeTokens {
  /** accent / primary color */
  primary: string;
  /** container background */
  bg: string;
  /** inner card / muted background */
  card: string;
  /** main text */
  text: string;
  /** secondary text */
  sub: string;
  /** hairline borders */
  border: string;
  /** accent gradient (banners / emphasis) */
  gradient: string;
  /** true → light text on dark surfaces */
  dark?: boolean;
}

export const UI_THEMES: Record<string, { label: string; tokens: ThemeTokens }> = {
  default: {
    label: 'Classic',
    tokens: {
      primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)',
      sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0', gradient: 'linear-gradient(135deg,#1677ff,#13c2c2)',
    },
  },
  soft: {
    label: 'Soft Indigo',
    tokens: {
      primary: '#4f46e5', bg: '#f8fafc', card: '#ffffff', text: '#1e293b',
      sub: '#64748b', border: '#e2e8f0', gradient: 'linear-gradient(135deg,#4f46e5,#9333ea)',
    },
  },
  dark: {
    label: 'Midnight',
    tokens: {
      primary: '#3ea6ff', bg: '#0f1622', card: '#0b111c', text: '#e6eefb',
      sub: '#8298b5', border: '#1d2c40', gradient: 'linear-gradient(135deg,#1e3a5f,#7c5cff)', dark: true,
    },
  },
  mint: {
    label: 'Mint',
    tokens: {
      primary: '#0d9488', bg: '#f0fdf9', card: '#ffffff', text: '#134e4a',
      sub: '#5f9c94', border: '#cdf0e7', gradient: 'linear-gradient(135deg,#0d9488,#22c55e)',
    },
  },
  warm: {
    label: 'Sunrise',
    tokens: {
      primary: '#fa8c16', bg: '#fffbf3', card: '#ffffff', text: '#431407',
      sub: '#b3845f', border: '#fde8cd', gradient: 'linear-gradient(135deg,#f97316,#ec4899)',
    },
  },
  rose: {
    label: 'Rose',
    tokens: {
      primary: '#e11d48', bg: '#fff1f4', card: '#ffffff', text: '#4c0519',
      sub: '#b07385', border: '#fcdde4', gradient: 'linear-gradient(135deg,#e11d48,#fb7185)',
    },
  },
  violet: {
    label: 'Violet',
    tokens: {
      primary: '#7c3aed', bg: '#f7f3ff', card: '#ffffff', text: '#2e1065',
      sub: '#8b7bb0', border: '#e6dcfb', gradient: 'linear-gradient(135deg,#7c3aed,#c026d3)',
    },
  },
  ocean: {
    label: 'Ocean',
    tokens: {
      primary: '#0ea5e9', bg: '#f0f9ff', card: '#ffffff', text: '#0c4a6e',
      sub: '#64a0bd', border: '#d3ecfa', gradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
    },
  },
  forest: {
    label: 'Forest',
    tokens: {
      primary: '#16a34a', bg: '#f2fdf5', card: '#ffffff', text: '#14532d',
      sub: '#6b9e7d', border: '#d2f2dc', gradient: 'linear-gradient(135deg,#16a34a,#84cc16)',
    },
  },
  mono: {
    label: 'Mono',
    tokens: {
      primary: '#374151', bg: '#fafafa', card: '#ffffff', text: '#111827',
      sub: '#6b7280', border: '#e5e7eb', gradient: 'linear-gradient(135deg,#374151,#9ca3af)',
    },
  },
  sky: {
    label: 'Sky',
    tokens: {
      primary: '#0284c7', bg: '#f0f9ff', card: '#ffffff', text: '#0c4a6e',
      sub: '#5b8aa6', border: '#dcefff', gradient: 'linear-gradient(135deg,#38bdf8,#0ea5e9)',
    },
  },
  lime: {
    label: 'Lime',
    tokens: {
      primary: '#65a30d', bg: '#f7fee7', card: '#ffffff', text: '#365314',
      sub: '#76964a', border: '#e3f5c4', gradient: 'linear-gradient(135deg,#a3e635,#65a30d)',
    },
  },
  coral: {
    label: 'Coral',
    tokens: {
      primary: '#f43f5e', bg: '#fff5f5', card: '#ffffff', text: '#7f1d1d',
      sub: '#bd8181', border: '#ffe0e0', gradient: 'linear-gradient(135deg,#fb7185,#f97316)',
    },
  },
  slate: {
    label: 'Slate',
    tokens: {
      primary: '#475569', bg: '#f8fafc', card: '#ffffff', text: '#0f172a',
      sub: '#64748b', border: '#e2e8f0', gradient: 'linear-gradient(135deg,#64748b,#334155)',
    },
  },
  plum: {
    label: 'Plum',
    tokens: {
      primary: '#a21caf', bg: '#fdf4ff', card: '#ffffff', text: '#4a044e',
      sub: '#9d7aa3', border: '#f5dcf7', gradient: 'linear-gradient(135deg,#d946ef,#a21caf)',
    },
  },
  amber: {
    label: 'Amber',
    tokens: {
      primary: '#d97706', bg: '#fffbeb', card: '#ffffff', text: '#451a03',
      sub: '#b08a55', border: '#fdecc8', gradient: 'linear-gradient(135deg,#fbbf24,#d97706)',
    },
  },
  graphite: {
    label: 'Graphite',
    tokens: {
      primary: '#a78bfa', bg: '#18181b', card: '#101013', text: '#f4f4f5',
      sub: '#a1a1aa', border: '#27272a', gradient: 'linear-gradient(135deg,#3f3f46,#a78bfa)', dark: true,
    },
  },
  teal: {
    label: 'Deep Teal',
    tokens: {
      primary: '#5eead4', bg: '#042f2e', card: '#022422', text: '#ecfeff',
      sub: '#7dd3c8', border: '#134e4a', gradient: 'linear-gradient(135deg,#0d9488,#5eead4)', dark: true,
    },
  },
};

export const DEFAULT_TOKENS = UI_THEMES.default.tokens;

export function resolveThemeTokens(theme?: string): ThemeTokens {
  return (theme && UI_THEMES[theme]?.tokens) || DEFAULT_TOKENS;
}

/** drop-in ParamSpec for display templates — rendered as a visual swatch wall */
export const themeParam: ParamSpec = {
  name: 'theme',
  type: 'theme',
  label: 'Theme',
  default: 'default',
};
