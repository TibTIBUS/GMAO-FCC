const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const code = html.split('   6. TEMPS RÉEL\n   ============================================================ */')[1]
  .split('/* ============================================================\n   7. INDICATEUR')[0];
assert.ok(code, 'section Realtime présente');
assert.ok(!html.includes("select('*')"), 'pas de téléchargement intégral des tables');
assert.ok(html.includes(".select('photos').eq('id', id)"), 'photos chargées à la demande');

let clock = 1000000;
let nextTimer = 0;
const timers = new Map();
const events = {};
const calls = { rpc: 0, full: 0, created: 0, removed: 0 };
const channels = [];
let remote = [];
const document = {
  visibilityState: 'visible',
  addEventListener(name, cb) { events[name] = cb; },
  querySelector() { return null; }
};
const context = {
  Date: class extends Date { static now() { return clock; } },
  document,
  window: { addEventListener(name, cb) { events[name] = cb; } },
  navigator: { onLine: true },
  setTimeout(cb, ms) { const id = ++nextTimer; timers.set(id, { cb, ms }); return id; },
  clearTimeout(id) { timers.delete(id); },
  setInterval() {},
  console,
  _cacheLoaded: true, _prevCacheLoaded: true, _adviceCacheLoaded: true,
  _cache: [{ id: 1, dateModification: '2026-09-25T09:00:00.000Z' }],
  _prevCache: [{ id: 2, dateModification: '2026-09-25T09:00:00.000Z' }],
  _adviceCache: [{ id: 3, dateModification: '2026-09-25T09:00:00.000Z' }],
  refreshCache: async () => { calls.full++; },
  refreshPrevCache: async () => { calls.full++; },
  refreshAdviceCache: async () => { calls.full++; },
  updateConnStatus() {}, render() {}, renderPrev() {}, renderAdvice() {},
  dbToApp: x => x, prevDbToApp: x => x, adviceDbToApp: x => x,
  sb: {
    channel(name) {
      const ch = {
        name, on() { return this; },
        subscribe(cb) { this.callback = cb; cb('SUBSCRIBED'); return this; }
      };
      channels.push(ch);
      calls.created++;
      return ch;
    },
    removeChannel(ch) { calls.removed++; ch.callback('CLOSED'); return Promise.resolve(); },
    async rpc(name) { assert.equal(name, 'gmao_sync_signals'); calls.rpc++; return { data: remote, error: null }; }
  }
};
vm.createContext(context);
vm.runInContext('let _cache = globalThis._cache, _prevCache = globalThis._prevCache, _adviceCache = globalThis._adviceCache; let _cacheLoaded = true, _prevCacheLoaded = true, _adviceCacheLoaded = true;\n' + code, context);
const evalIn = statement => vm.runInContext(statement, context);
const settle = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  remote = ['interventions', 'preventif', 'conseils_machine'].map(name => ({
    table_name: name, row_count: 1, latest_modified: '2026-09-25T09:00:00.000Z'
  }));
  evalIn('setupRealtime(); setupAutoResync()');
  assert.equal(calls.created, 3, 'un canal par table');

  // 20 allers-retours rapides, aucune liste intégrale et un seul RPC.
  for (let i = 0; i < 20; i++) {
    document.visibilityState = 'hidden'; events.visibilitychange();
    document.visibilityState = 'visible'; events.visibilitychange();
  }
  await settle();
  assert.equal(calls.rpc, 1);
  assert.equal(calls.full, 0);
  assert.equal(calls.created, 3);

  // Le CLOSED inattendu programme 5s, puis recrée uniquement le canal fermé.
  channels[0].callback('CLOSED');
  assert.equal([...timers.values()].filter(t => t.ms === 5000).length, 1);
  const retry = [...timers].find(([, t]) => t.ms === 5000);
  timers.delete(retry[0]); retry[1].cb();
  assert.equal(calls.created, 4);
  assert.equal(calls.removed, 0);

  // Un removeChannel volontaire (focus après erreur transitoire) n'entraîne
  // aucun nouveau timer de reconnexion depuis son callback CLOSED.
  channels.at(-1).callback('CHANNEL_ERROR');
  clock += 60001;
  events.visibilitychange();
  await settle();
  assert.equal(calls.removed, 1);
  assert.equal(calls.created, 5);
  assert.equal([...timers.values()].filter(t => t.ms === 5000).length, 0);

  // La date max est identique : seul count repère cette suppression.
  remote[2].row_count = 0;
  clock += 60001;
  events.visibilitychange();
  await settle();
  assert.equal(calls.full, 3, 'les trois caches sont rechargés sur différence de count');

  // Une série de fermetures terminales n'induit jamais un timer perpétuel.
  // Le premier CLOSED après le focus consomme la tentative à 5 s.
  for (const delay of [5000, 15000, 45000]) {
    channels.at(-1).callback('CLOSED');
    const timer = [...timers].find(([, t]) => t.ms === delay);
    assert.ok(timer, `tentative bornée ${delay} ms`);
    timers.delete(timer[0]); timer[1].cb();
  }
  channels.at(-1).callback('CLOSED');
  assert.equal([...timers.values()].filter(t => [5000, 15000, 45000].includes(t.ms)).length, 0);
  console.log('OK : 20 alternances, reprise 5/15/45 s, CLOSED volontaire, suppression détectée');
})().catch(err => { console.error(err); process.exitCode = 1; });
