const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');

test('every CK script in index.html exists and is cached by the service worker', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const srcs = [...html.matchAll(/src="(js\/ck\/[^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs.map((s) => s.split('/').pop().replace('.js', '')), ['state', 'world', 'rules', 'story', 'puzzle', 'pixel', 'sprites', 'rooms', 'roomgen', 'roomart', 'foes', 'action', 'input', 'pixengine', 'roomscene', 'puzzlescene', 'ui', 'main']);
  for (const s of srcs) { assert.ok(fs.existsSync(path.join(ROOT, s)), s); assert.ok(sw.includes(`'${s}'`) || sw.includes(`"${s}"`), `sw caches ${s}`); }
  assert.match(sw, /lilnux-v14/);
  for (const gone of ['engine', 'scenes', 'combat', 'art', 'slice']) assert.ok(!sw.includes(`js/ck/${gone}.js`), gone);
});

test('the start-screen FX script and entry stylesheet are loaded and cached', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.ok(html.includes('src="js/start-fx.js"') && html.includes('href="css/entry.css"'));
  assert.ok(html.indexOf('js/start-fx.js') < html.indexOf('js/game.js'), 'start-fx loads before game.js');
  for (const f of ['js/start-fx.js', 'css/entry.css']) { assert.ok(fs.existsSync(path.join(ROOT, f)), f); assert.ok(sw.includes(`'${f}'`), `sw caches ${f}`); }
});
