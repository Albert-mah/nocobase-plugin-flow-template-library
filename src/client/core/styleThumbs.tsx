import React from 'react';
import { ThemeTokens } from './themes';

/**
 * Thumbnails for `styleSelect` params — tiny visual previews of each variant,
 * drawn with the CURRENT theme tokens so the picker re-skins live. Keyed
 * `<thumbs>.<optionValue>` (see ParamSpec.thumbs).
 */

export type ThumbFC = React.FC<{ T: ThemeTokens }>;

// ---- KPI card variants -----------------------------------------------------

const KpiMinimal: ThumbFC = ({ T }) => (
  <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 9px' }}>
    <div style={{ fontSize: 8, color: T.sub }}>Sales</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>128k</div>
    <div style={{ height: 2, width: 18, background: T.primary, borderRadius: 1, marginTop: 4 }} />
  </div>
);

const KpiGradient: ThumbFC = ({ T }) => (
  <div style={{ background: T.gradient, borderRadius: 6, padding: '7px 9px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', right: -10, top: -10, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
    <div style={{ fontSize: 8, opacity: 0.85 }}>Sales</div>
    <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1 }}>128k</div>
  </div>
);

const KpiIcon: ThumbFC = ({ T }) => (
  <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 20, height: 20, borderRadius: 6, background: T.card, border: '1px solid ' + T.border, display: 'grid', placeItems: 'center', fontSize: 11, flexShrink: 0 }}>📊</span>
    <span>
      <span style={{ display: 'block', fontSize: 7, color: T.sub }}>Sales</span>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>128k</span>
    </span>
  </div>
);

const KpiOutline: ThumbFC = ({ T }) => (
  <div style={{ background: T.bg, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.primary, borderRadius: 6, padding: '7px 9px' }}>
    <div style={{ fontSize: 8, color: T.sub }}>Sales</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: T.primary, lineHeight: 1.1 }}>128k</div>
  </div>
);

// ---- phone preview platforms ----------------------------------------------

export const PHONE_PLATFORMS: Record<string, { name: string; glyph: string; color: string; acts: string[] }> = {
  x: { name: 'X', glyph: '𝕏', color: '#000000', acts: ['♡ 1.2K', '↺ 340', '💬 88', '↗'] },
  linkedin: { name: 'LinkedIn', glyph: 'in', color: '#0a66c2', acts: ['👍 React', '💬 Comment', '↺ Repost'] },
  instagram: { name: 'Instagram', glyph: '◎', color: '#e1306c', acts: ['♡', '💬', '↗', '🔖'] },
  facebook: { name: 'Facebook', glyph: 'f', color: '#1877f2', acts: ['👍 Like', '💬 Comment', '↗ Share'] },
  youtube: { name: 'YouTube', glyph: '▶', color: '#ff0000', acts: ['👍 2.4K', '👎', '💬 112'] },
  wechat: { name: 'WeChat', glyph: 'Wx', color: '#07c160', acts: ['Like', 'Comment', 'Share'] },
};

const platThumb = (key: string): ThumbFC => {
  const p = PHONE_PLATFORMS[key];
  const Thumb: ThumbFC = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 4px' }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: p.color, color: '#fff', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center' }}>
        {p.glyph}
      </span>
    </div>
  );
  return Thumb;
};

/**
 * Template families register their variant thumbnails from their own files
 * (side-effect import next to the template definition) — adding a new family
 * never touches this core file.
 */
export function registerStyleThumbs(prefix: string, map: Record<string, ThumbFC>) {
  Object.entries(map).forEach(([k, fc]) => {
    styleThumbs[prefix + '.' + k] = fc;
  });
}

export const styleThumbs: Record<string, ThumbFC> = {
  'kpi.minimal': KpiMinimal,
  'kpi.gradient': KpiGradient,
  'kpi.icon': KpiIcon,
  'kpi.outline': KpiOutline,
  'phone.x': platThumb('x'),
  'phone.linkedin': platThumb('linkedin'),
  'phone.instagram': platThumb('instagram'),
  'phone.facebook': platThumb('facebook'),
  'phone.youtube': platThumb('youtube'),
  'phone.wechat': platThumb('wechat'),
};
