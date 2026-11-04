// SVG markup strings shared by the renderers.

export const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const r1 = (n) => Math.round(n * 10) / 10;

export const line = (x1, y1, x2, y2, cls) => `<line class="${cls}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/>`;
export const text = (x, y, t, cls, anchor = 'middle') => `<text class="${cls}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}">${esc(t)}</text>`;
export const dot = (x, y, r, cls = 'dot') => `<circle class="${cls}" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/>`;
