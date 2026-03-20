import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';

const DOMAINS = {
  work:       { label: 'Work',       color: '#378ADD', light: '#E6F1FB', dark: '#0C447C', goal: 8 },
  spiritual:  { label: 'Spiritual',  color: '#7F77DD', light: '#EEEDFE', dark: '#3C3489', goal: 1 },
  social:     { label: 'Social',     color: '#D4537E', light: '#FBEAF0', dark: '#72243E', goal: 2 },
  fitness:    { label: 'Fitness',    color: '#639922', light: '#EAF3DE', dark: '#27500A', goal: 1 },
  creativity: { label: 'Creativity', color: '#BA7517', light: '#FAEEDA', dark: '#633806', goal: 1.5 },
};

const PRI_STYLES = {
  high:   { bg: '#FCEBEB', txt: '#A32D2D' },
  medium: { bg: '#FAEEDA', txt: '#633806' },
  low:    { bg: '#EAF3DE', txt: '#27500A' },
};

const DEFAULT_TASKS = [
  { id: 1, title: 'Review Q1 complaints data', domain: 'work', pri: 'high', done: false },
  { id: 2, title: 'Morning devotion / quiet time', domain: 'spiritual', pri: 'high', done: false },
  { id: 3, title: 'Call family in Kerala', domain: 'social', pri: 'medium', done: false },
  { id: 4, title: '30-min jog or gym session', domain: 'fitness', pri: 'medium', done: false },
  { id: 5, title: 'Portfolio review — ASML, NVDA, QQQ', domain: 'work', pri: 'medium', done: false },
  { id: 6, title: 'Journal or sketch for 20 mins', domain: 'creativity', pri: 'low', done: false },
  { id: 7, title: 'Evening Bible reading / reflection', domain: 'spiritual', pri: 'high', done: false },
];

const DEFAULT_BLOCKS = [
  { id: 1, title: 'Morning prayers', domain: 'spiritual', start: '06:00', end: '06:30' },
  { id: 2, title: 'Exercise / gym', domain: 'fitness', start: '06:30', end: '07:30' },
  { id: 3, title: 'Deep work — analysis', domain: 'work', start: '09:00', end: '12:00' },
  { id: 4, title: 'Family call', domain: 'social', start: '13:00', end: '13:30' },
  { id: 5, title: 'Creative writing / sketching', domain: 'creativity', start: '17:00', end: '18:00' },
  { id: 6, title: 'Evening prayers', domain: 'spiritual', start: '20:00', end: '20:30' },
];

const DEFAULT_WEEK = {
  work:       [6, 7, 8, 5, 8, 4, 0],
  spiritual:  [1, 0.5, 1, 1, 0.5, 1, 0],
  social:     [1, 2, 0.5, 1.5, 1, 3, 0],
  fitness:    [1, 0, 1, 1, 0, 1, 0],
  creativity: [0.5, 1, 0, 1.5, 1, 2, 0],
};

function blockedMins(blocks, domain) {
  return blocks.filter(b => b.domain === domain).reduce((acc, b) => {
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    return acc + (eh * 60 + em - sh * 60 - sm);
  }, 0);
}

const s = {
  card: {
    background: 'var(--surface)',
    border: '0.5px solid var(--border)',
    borderRadius: 12,
    padding: '12px 14px',
  },
  surface2: {
    background: 'var(--surface2)',
    borderRadius: 12,
    padding: '14px',
  },
  pill: (bg, txt) => ({
    display: 'inline-flex',
    padding: '2px 9px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    background: bg,
    color: txt,
  }),
  btn: {
    background: 'var(--text)',
    color: 'var(--bg)',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  navBtn: (active) => ({
    padding: '10px 14px',
    fontSize: 13,
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--text)' : '2px solid transparent',
    color: active ? 'var(--text)' : 'var(--text2)',
    fontWeight: active ? 500 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }),
};

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ tasks, blocks }) {
  const highPri = tasks.filter(t => t.pri === 'high' && !t.done).slice(0, 5);
  const done = tasks.filter(t => t.done).length;
  const totalH = (Object.keys(DOMAINS).reduce((a, k) => a + blockedMins(blocks, k), 0) / 60).toFixed(1);
  const hiDone = tasks.filter(t => t.pri === 'high' && t.done).length;
  const hiTotal = tasks.filter(t => t.pri === 'high').length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 8, marginBottom: 20 }}>
        {Object.entries(DOMAINS).map(([k, d]) => {
          const hrs = blockedMins(blocks, k) / 60;
          const pct = Math.min(100, Math.round(hrs / d.goal * 100));
          return (
            <div key={k} style={{ ...s.card, borderTop: `3px solid ${d.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: d.dark, marginBottom: 4 }}>{d.label}</div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', margin: '4px 0' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{hrs.toFixed(1)}h / {d.goal}h</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: d.dark, marginTop: 2 }}>{pct}%</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginBottom: 20 }}>
        {[['Time planned', `${totalH}h`], ['Blocks today', `${blocks.length}`], [`Tasks done`, `${done}/${tasks.length}`], ['High priority', `${hiDone}/${hiTotal}`]].map(([l, v]) => (
          <div key={l} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>High priority focus</div>
      {highPri.length === 0
        ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>All high-priority tasks done! 🎉</div>
        : highPri.map(t => {
          const d = DOMAINS[t.domain];
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>{t.title}</div>
              <span style={s.pill(d.light, d.dark)}>{d.label}</span>
            </div>
          );
        })
      }
    </div>
  );
}

// ── Schedule ─────────────────────────────────────────────────────────────────
function Schedule({ blocks, setBlocks }) {
  const [form, setForm] = useState({ title: '', domain: 'work', start: '09:00', end: '10:00' });
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let bid = blocks.reduce((a, b) => Math.max(a, b.id), 0) + 1;

  const add = () => {
    if (!form.title.trim()) return;
    setBlocks(prev => [...prev, { ...form, id: bid++ }]);
    setForm(f => ({ ...f, title: '' }));
  };

  return (
    <div>
      <div style={{ ...s.surface2, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Add time block</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <input style={{ flex: 2, minWidth: 120 }} placeholder="Activity name..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && add()} />
          <select value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}>
            {Object.entries(DOMAINS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="time" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
          <input type="time" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
          <button style={s.btn} onClick={add}>+ Add block</button>
        </div>
      </div>

      {Array.from({ length: 18 }, (_, i) => i + 5).map(h => {
        const hm = h * 60;
        const isNow = Math.abs(hm - nowMins) < 30;
        const label = h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`;
        const blocksHere = blocks.filter(b => {
          const [sh] = b.start.split(':').map(Number);
          return sh === h;
        });
        return (
          <div key={h} style={{ display: 'flex', gap: 10, minHeight: 40, marginBottom: 2 }}>
            <div style={{ width: 38, fontSize: 11, color: 'var(--text2)', paddingTop: 4, textAlign: 'right', flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, borderLeft: '0.5px solid var(--border)', paddingLeft: 10, paddingTop: 3 }}>
              {isNow && <div style={{ height: 1, background: '#E24B4A', marginBottom: 4, position: 'relative' }}><span style={{ position: 'absolute', left: 0, top: -6, fontSize: 10, color: '#A32D2D', fontWeight: 600 }}>NOW</span></div>}
              {blocksHere.map(b => {
                const d = DOMAINS[b.domain];
                return (
                  <div key={b.id} style={{ padding: '5px 9px', borderRadius: 8, marginBottom: 4, background: d.light, borderLeft: `3px solid ${d.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 12, color: d.dark }}>{b.title}</div>
                      <div style={{ fontSize: 11, color: d.dark, opacity: 0.7 }}>{b.start}–{b.end}</div>
                    </div>
                    <button onClick={() => setBlocks(prev => prev.filter(x => x.id !== b.id))} style={{ background: 'none', border: 'none', color: d.dark, fontSize: 16, opacity: 0.5, cursor: 'pointer' }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tasks ────────────────────────────────────────────────────────────────────
function Tasks({ tasks, setTasks }) {
  const [form, setForm] = useState({ title: '', domain: 'work', pri: 'high' });
  const [filter, setFilter] = useState('all');
  let tid = tasks.reduce((a, t) => Math.max(a, t.id), 0) + 1;

  const add = () => {
    if (!form.title.trim()) return;
    setTasks(prev => [...prev, { ...form, id: tid++, done: false }]);
    setForm(f => ({ ...f, title: '' }));
  };

  const visible = [...tasks]
    .filter(t => filter === 'all' || t.domain === filter)
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.pri] - { high: 0, medium: 1, low: 2 }[b.pri]));

  return (
    <div>
      <div style={{ ...s.surface2, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Add task</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <input style={{ flex: 2, minWidth: 160 }} placeholder="Task description..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && add()} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}>
            {Object.entries(DOMAINS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
          </select>
          <select value={form.pri} onChange={e => setForm(f => ({ ...f, pri: e.target.value }))}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button style={s.btn} onClick={add}>+ Add task</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', ...Object.keys(DOMAINS)].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', fontSize: 12, borderRadius: 20, border: '0.5px solid var(--border)', background: filter === f ? 'var(--surface2)' : 'none', fontWeight: filter === f ? 500 : 400, color: 'var(--text)', cursor: 'pointer' }}>
            {f === 'all' ? 'All' : DOMAINS[f].label}
          </button>
        ))}
      </div>

      {visible.map(t => {
        const d = DOMAINS[t.domain];
        const p = PRI_STYLES[t.pri];
        return (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--border)' }}>
            <div onClick={() => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
              style={{ width: 18, height: 18, border: t.done ? 'none' : '1.5px solid var(--border)', borderRadius: 4, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.done ? '#EAF3DE' : 'none' }}>
              {t.done && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#27500A" strokeWidth="1.8" /></svg>}
            </div>
            <div style={{ flex: 1, fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text2)' : 'var(--text)' }}>{t.title}</div>
            <span style={s.pill(d.light, d.dark)}>{d.label}</span>
            <span style={{ ...s.pill(p.bg, p.txt), marginLeft: 4 }}>{t.pri}</span>
            <button onClick={() => setTasks(prev => prev.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Progress ─────────────────────────────────────────────────────────────────
function Progress({ week }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const allPcts = Object.entries(DOMAINS).map(([k, d]) => {
    const total = week[k].reduce((a, b) => a + b, 0);
    return Math.min(100, Math.round(total / d.goal / 7 * 100));
  });
  const score = Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Weekly balance score</div>
        <div style={{ fontSize: 44, fontWeight: 500 }}>{score}%</div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>across all 5 life domains</div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Domain progress this week</div>
      {Object.entries(DOMAINS).map(([k, d], i) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 80, fontSize: 13, fontWeight: 500, color: d.dark }}>{d.label}</div>
          <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${allPcts[i]}%`, background: d.color, borderRadius: 4 }} />
          </div>
          <div style={{ width: 34, fontSize: 12, color: 'var(--text2)', textAlign: 'right' }}>{allPcts[i]}%</div>
        </div>
      ))}

      <div style={{ fontSize: 14, fontWeight: 500, margin: '24px 0 12px' }}>Daily activity heatmap</div>
      <div style={{ display: 'grid', gridTemplateColumns: '72px repeat(7, 1fr)', gap: 4, fontSize: 11 }}>
        <div />
        {days.map(d => <div key={d} style={{ textAlign: 'center', color: 'var(--text2)', paddingBottom: 5 }}>{d}</div>)}
        {Object.entries(DOMAINS).map(([k, d]) => {
          const mx = Math.max(...week[k], d.goal);
          return [
            <div key={k + '-label'} style={{ color: d.dark, fontWeight: 500, fontSize: 12, display: 'flex', alignItems: 'center' }}>{d.label.slice(0, 5)}</div>,
            ...week[k].map((v, i) => {
              const op = v === 0 ? 0.08 : Math.max(0.18, v / mx);
              return (
                <div key={k + i} style={{ background: d.color, opacity: op, borderRadius: 3, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: d.dark, fontWeight: 500 }}>
                  {v > 0 ? `${v}h` : ''}
                </div>
              );
            })
          ];
        })}
      </div>
    </div>
  );
}


// ── Helpers ───────────────────────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function lsGet(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// Debounced push to /api/data so we don't hammer on every keystroke
let syncTimer = null;
function scheduleSync(payload) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, 1500);
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState('dashboard');
  const [tasks, setTasksRaw] = useState(DEFAULT_TASKS);
  const [blocks, setBlocksRaw] = useState(DEFAULT_BLOCKS);
  const [week, setWeekRaw] = useState(DEFAULT_WEEK);
  const [streak, setStreakRaw] = useState({ count: 5, lastDate: todayKey() });
  const [now, setNow] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');

  // Single save function: update state + localStorage + schedule KV push
  function saveAll(nextTasks, nextBlocks, nextWeek, nextStreak) {
    setTasksRaw(nextTasks);
    setBlocksRaw(nextBlocks);
    setWeekRaw(nextWeek);
    setStreakRaw(nextStreak);
    lsSet('lb_tasks',  nextTasks);
    lsSet('lb_blocks', nextBlocks);
    lsSet('lb_week',   nextWeek);
    lsSet('lb_streak', nextStreak);
    setSyncStatus('saving');
    scheduleSync({ tasks: nextTasks, blocks: nextBlocks, week: nextWeek, streak: nextStreak });
    setTimeout(() => setSyncStatus('synced'), 2200);
  }

  // Individual setters that go through saveAll
  const setTasks = useCallback((v) => {
    setTasksRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      setBlocksRaw(bl => { setWeekRaw(wk => { setStreakRaw(sk => { saveAll(next, bl, wk, sk); return sk; }); return wk; }); return bl; });
      return next;
    });
  }, []);

  const setBlocks = useCallback((nextBlocks) => {
    setTasksRaw(tk => { setWeekRaw(wk => { setStreakRaw(sk => {
      const dayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
      const newWeek = Object.fromEntries(Object.keys(DOMAINS).map(k => {
        const arr = [...wk[k]];
        arr[dayIdx] = parseFloat((blockedMins(nextBlocks, k) / 60).toFixed(1));
        return [k, arr];
      }));
      saveAll(tk, nextBlocks, newWeek, sk);
      return sk;
    }); return wk; }); return tk; });
    setBlocksRaw(nextBlocks);
  }, []);

  const setStreak = useCallback((v) => {
    setTasksRaw(tk => { setBlocksRaw(bl => { setWeekRaw(wk => {
      const next = typeof v === 'function' ? v(streak) : v;
      saveAll(tk, bl, wk, next);
      return wk;
    }); return bl; }); return tk; });
    setStreakRaw(v);
  }, [streak]);

  // On mount: load localStorage immediately, then fetch KV (cloud wins)
  useEffect(() => {
    const t0 = lsGet('lb_tasks',  DEFAULT_TASKS);
    const b0 = lsGet('lb_blocks', DEFAULT_BLOCKS);
    const w0 = lsGet('lb_week',   DEFAULT_WEEK);
    const s0 = lsGet('lb_streak', { count: 5, lastDate: todayKey() });
    setTasksRaw(t0); setBlocksRaw(b0); setWeekRaw(w0); setStreakRaw(s0);
    setHydrated(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);

    fetch('/api/data')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return;
        const nt = data.tasks   ?? t0;
        const nb = data.blocks  ?? b0;
        const nw = data.week    ?? w0;
        const ns = data.streak  ?? s0;
        setTasksRaw(nt); setBlocksRaw(nb); setWeekRaw(nw); setStreakRaw(ns);
        lsSet('lb_tasks', nt); lsSet('lb_blocks', nb); lsSet('lb_week', nw); lsSet('lb_streak', ns);
      })
      .catch(() => setSyncStatus('offline'));

    return () => clearInterval(timer);
  }, []);

  // Streak — increment on new day
  useEffect(() => {
    if (!hydrated) return;
    const today = todayKey();
    if (streak.lastDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
    setStreak({ count: newCount, lastDate: today });
  }, [hydrated]);

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  const resetToDefaults = useCallback(() => {
    saveAll(DEFAULT_TASKS, DEFAULT_BLOCKS, DEFAULT_WEEK, { count: 1, lastDate: todayKey() });
    addToast('Reset to defaults', 'warning');
  }, []);

  const clock = now ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '--:--';
  const dateStr = now ? now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const allPcts = Object.entries(DOMAINS).map(([k, d]) => Math.min(100, blockedMins(blocks, k) / 60 / d.goal * 100));
  const balScore = Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length);

  const TABS = ['dashboard', 'schedule', 'tasks', 'progress'];

  if (!hydrated) return null; // prevent SSR flash

  return (
    <>
      <Head>
        <title>Life Balance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a1a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Life Balance" />
      </Head>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 0 16px' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 500 }}>{clock}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{dateStr}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'var(--amber-bg)', color: 'var(--amber)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              Streak: {streak.count} day{streak.count !== 1 ? 's' : ''} 🔥
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Balance: {balScore}%</div>
          </div>
        </div>

        {/* Toasts */}
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '9px 14px', borderRadius: 8, marginBottom: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between', background: t.type === 'success' ? 'var(--green-bg)' : 'var(--amber-bg)', color: t.type === 'success' ? 'var(--green)' : 'var(--amber)', border: `0.5px solid ${t.type === 'success' ? 'var(--green)' : 'var(--amber)'}` }}>
            <span>{t.msg}</span>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'inherit', lineHeight: 1 }}>×</button>
          </div>
        ))}

        {/* Nav */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t} style={s.navBtn(tab === t)} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tabs */}
        {tab === 'dashboard' && <Dashboard tasks={tasks} blocks={blocks} />}
        {tab === 'schedule' && <Schedule blocks={blocks} setBlocks={b => { setBlocks(b); addToast('Schedule saved'); }} />}
        {tab === 'tasks' && <Tasks tasks={tasks} setTasks={t => { setTasks(t); addToast('Tasks saved'); }} />}
        {tab === 'progress' && <Progress week={week} />}

        {/* Footer reset */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <button onClick={resetToDefaults} style={{ background: 'none', border: '0.5px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
            Reset to defaults
          </button>
          <div style={{ fontSize: 11, color: syncStatus === 'offline' ? 'var(--amber)' : 'var(--text3)', marginTop: 6 }}>{ syncStatus === 'saving' ? 'Saving to cloud...' : syncStatus === 'offline' ? 'Offline — changes saved locally' : 'Synced across all devices' }</div>
        </div>
      </div>
    </>
  );
}
