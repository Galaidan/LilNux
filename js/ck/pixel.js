/* Colonel Kernel — palette-indexed pixel sprites -> canvases (with pre-rendered glow and hit-flash). */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // rows: equal-length strings, one char per pixel; '.' = transparent.
  function parse(rows, palette) {
    const h = rows.length; const w = h ? rows[0].length : 0;
    const data = new Uint8ClampedArray(w * h * 4);
    const cache = {};
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      if (row.length !== w) throw new Error(`ragged row ${y}: ${row.length} != ${w}`);
      for (let x = 0; x < w; x++) {
        const c = row[x];
        if (c === '.') continue;
        if (!palette[c]) throw new Error(`bad pixel "${c}" at ${x},${y}`);
        const rgb = cache[c] || (cache[c] = hex(palette[c]));
        const i = (y * w + x) * 4;
        data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
      }
    }
    return { w, h, data };
  }

  const GLOW_PAD = 4;
  function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // Browser only. img = the sprite; glow = soft halo (drawn later with 'lighter'); white = hit flash.
  function build(sprite, palette) {
    const p = parse(sprite.rows, palette);
    const img = canvasOf(p.w, p.h);
    img.getContext('2d').putImageData(new ImageData(p.data, p.w, p.h), 0, 0);
    const white = canvasOf(p.w, p.h); const wx = white.getContext('2d');
    wx.drawImage(img, 0, 0); wx.globalCompositeOperation = 'source-in'; wx.fillStyle = '#ffffff'; wx.fillRect(0, 0, p.w, p.h);
    const glow = canvasOf(p.w + GLOW_PAD * 2, p.h + GLOW_PAD * 2); const gx = glow.getContext('2d');
    // Cheap blur without ctx.filter (not on every iPhone): stacked offset copies, fading outward.
    for (const [r, a] of [[3, 0.12], [2, 0.2], [1, 0.3]]) {
      gx.globalAlpha = a;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) === r) gx.drawImage(img, GLOW_PAD + dx, GLOW_PAD + dy);
    }
    gx.globalAlpha = 1;
    return { w: p.w, h: p.h, img, white, glow };
  }

  // (x, y) is the sprite's feet centre in buffer pixels.
  function draw(ctx, b, x, y, o) {
    o = o || {};
    const left = Math.round(x - b.w / 2); const top = Math.round(y - b.h);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.flip) { ctx.translate(left * 2 + b.w, 0); ctx.scale(-1, 1); }
    if (o.glow) {
      const prev = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * o.glow;
      ctx.drawImage(b.glow, left - GLOW_PAD, top - GLOW_PAD);
      ctx.globalCompositeOperation = prev; ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    }
    ctx.drawImage(o.flash ? b.white : b.img, left, top);
    ctx.restore();
  }

  CK.Pixel = { parse, build, draw, hex, GLOW_PAD };
})(typeof window !== 'undefined' ? window : globalThis);
