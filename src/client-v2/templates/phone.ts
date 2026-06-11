import { themeParam } from '../core/themes';
import { Template } from '../core/types';
import { recordPinParam, RESOLVE_RECORD_SNIPPET } from './shared';

/**
 * 手机壳预览 — a device-frame social post preview, distilled from the
 * social-media-calendar prototype (04). Two data modes, auto-detected:
 *  - inside a form → LIVE: binds formValuesChange, the post updates as you type
 *  - elsewhere     → record chain (popup / row / pinned record)
 * Platform picker re-skins the post (badge color, action row, media ratio).
 */
export const phonePreview: Template = {
  key: 'phonePreview',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'record',
  label: 'Phone post preview',
  description: 'Device-frame social post preview — live in forms, record-bound elsewhere',
  icon: '📱',
  category: 'Style',
  scenes: ['Form', 'Popup', 'Dashboard'],
  sort: 915,
  params: [
    { name: 'collection', type: 'collection', label: 'Record collection', required: true },
    {
      name: 'textField',
      type: 'field',
      label: 'Post text field',
      collectionFrom: 'collection',
      required: true,
    },
    {
      name: 'authorField',
      type: 'field',
      label: 'Author / handle field',
      collectionFrom: 'collection',
      hint: 'Shown as the account name; empty = "Your account"',
    },
    {
      name: 'mediaField',
      type: 'field',
      label: 'Media field (optional)',
      collectionFrom: 'collection',
      hint: 'Truthy value → shows a media placeholder in the post',
    },
    {
      name: 'platform',
      type: 'styleSelect',
      thumbs: 'phone',
      label: 'Platform skin',
      default: 'x',
      options: [
        { label: 'X', value: 'x' },
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'Facebook', value: 'facebook' },
        { label: 'YouTube', value: 'youtube' },
        { label: 'WeChat', value: 'wechat' },
      ],
    },
    recordPinParam,
    themeParam,
  ],
  body:
    RESOLVE_RECORD_SNIPPET +
    `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0', gradient: 'linear-gradient(135deg,#1677ff,#13c2c2)' };

const PLATFORMS = {
  x: { name: 'X', glyph: '𝕏', color: '#000000', acts: ['♡ 1.2K', '↺ 340', '💬 88', '↗'] },
  linkedin: { name: 'LinkedIn', glyph: 'in', color: '#0a66c2', acts: ['👍 React', '💬 Comment', '↺ Repost'] },
  instagram: { name: 'Instagram', glyph: '◎', color: '#e1306c', acts: ['♡', '💬', '↗', '🔖'] },
  facebook: { name: 'Facebook', glyph: 'f', color: '#1877f2', acts: ['👍 Like', '💬 Comment', '↗ Share'] },
  youtube: { name: 'YouTube', glyph: '▶', color: '#ff0000', acts: ['👍 2.4K', '👎', '💬 112'] },
  wechat: { name: 'WeChat', glyph: 'Wx', color: '#07c160', acts: ['Like', 'Comment', 'Share'] },
};
const P = PLATFORMS[$p.platform] || PLATFORMS.x;

function fieldOf(obj, f) {
  if (!obj || !f) return null;
  const v = obj[f];
  if (v == null) return null;
  if (typeof v === 'object') return v.id != null ? null : (Array.isArray(v) ? (v.length ? v : null) : v);
  return v;
}

function Post(props) {
  const text = props.text == null || String(props.text).trim() === '' ? null : String(props.text);
  const author = props.author == null || String(props.author).trim() === '' ? 'Your account' : String(props.author);
  // hashtag highlight, platform-colored
  const parts = text ? text.split(/(#[\\w\\u4e00-\\u9fa5]+)/g) : [];
  const tagColor = P.color === '#000000' ? '#0a66c2' : P.color;
  return (
    <div style={{ width: 270, margin: '0 auto', background: '#000', borderRadius: 36, padding: 9, boxShadow: '0 14px 34px rgba(0,0,0,0.22)' }}>
      <div style={{ background: '#fff', borderRadius: 28, overflow: 'hidden', minHeight: 400, position: 'relative', paddingBottom: 34 }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 110, height: 22, background: '#000', borderRadius: '0 0 14px 14px', zIndex: 5 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '30px 14px 10px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 14, background: T.gradient }}>
            {author.slice(0, 1).toUpperCase()}
          </span>
          <span style={{ lineHeight: 1.25, flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(0,0,0,0.88)' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{author}</span>
              <span style={{ width: 15, height: 15, borderRadius: '50%', color: '#fff', fontSize: 8, display: 'grid', placeItems: 'center', fontWeight: 800, background: P.color, flexShrink: 0 }}>{P.glyph}</span>
            </b>
            <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.45)' }}>{'@' + author.toLowerCase().replace(/\\s+/g, '') + ' · now'}</span>
          </span>
          <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 16 }}>⋯</span>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', color: 'rgba(0,0,0,0.85)' }}>
            {text
              ? parts.map(function (s, i) {
                  return s.charAt(0) === '#'
                    ? <span key={i} style={{ color: tagColor, fontWeight: 500 }}>{s}</span>
                    : <span key={i}>{s}</span>;
                })
              : <span style={{ color: 'rgba(0,0,0,0.35)', fontStyle: 'italic' }}>Your post preview shows up here…</span>}
          </div>
          {props.media ? (
            <div style={{ marginTop: 11, borderRadius: 10, height: $p.platform === 'instagram' ? 200 : 140, background: 'linear-gradient(135deg,#fdeff5,#e6f0ff)', display: 'grid', placeItems: 'center', color: '#c0c8d4', fontSize: 28, border: '1px solid #f0f0f0' }}>
              {$p.platform === 'youtube' ? '▶' : '🖼️'}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 20, padding: '10px 16px', borderTop: '1px solid #f0f0f0', color: 'rgba(0,0,0,0.45)', fontSize: 12.5 }}>
          {P.acts.map(function (a, i) { return <span key={i}>{a}</span>; })}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', padding: 7, fontSize: 10, color: 'rgba(0,0,0,0.4)', borderTop: '1px solid #f0f0f0', background: '#fafbfc' }}>
          {(ctx.form ? 'Live preview · ' : 'Preview · ') + P.name}
        </div>
      </div>
    </div>
  );
}

function Comp() {
  const isForm = !!(ctx.form && ctx.form.getFieldsValue);
  const read = function () {
    try {
      const v = ctx.form.getFieldsValue();
      return { text: fieldOf(v, $p.textField), author: fieldOf(v, $p.authorField), media: !!(v && $p.mediaField && v[$p.mediaField]) };
    } catch (e) { return { text: null, author: null, media: false }; }
  };
  const [data, setData] = useState(isForm ? read() : null);

  useEffect(function () {
    if (isForm) {
      const bm = ctx.blockModel;
      const h = function () { setData(read()); };
      if (bm && bm.on) {
        if (bm.__hPhone && bm.off) bm.off('formValuesChange', bm.__hPhone);
        bm.__hPhone = h;
        bm.on('formValuesChange', h);
      }
      return;
    }
    (async function () {
      const rec = await __resolveRecord();
      setData({
        text: fieldOf(rec, $p.textField),
        author: fieldOf(rec, $p.authorField),
        media: !!(rec && $p.mediaField && rec[$p.mediaField]),
      });
    })();
  }, []);

  const d = data || { text: null, author: null, media: false };
  return <Post text={d.text} author={d.author} media={d.media} />;
}

ctx.render(<Comp />);
`,
};
