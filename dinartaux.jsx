import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ═════════════════════════════════════════════════════════════
//  CONFIGURATION — modifiez ces deux constantes
// ═════════════════════════════════════════════════════════════
const SQUARE_URL =
  "https://raw.githubusercontent.com/FSH27/DinarTaux/main/square-rates.json";

const OFFICIAL_API = "https://api.frankfurter.dev/v2";

// Currencies with Square (parallel market) rates
const SQUARE_CODES = ["EUR", "USD", "GBP", "CAD"];
// All 12 currencies
const CODES = ["EUR", "USD", "GBP", "CAD", "JPY", "TRY", "SAR", "AED", "MAD", "TND", "CHF", "CNY"];
// Codes Frankfurter can provide (ECB-tracked, excluding EUR base & non-ECB currencies)
const FKFR_CODES = ["USD", "GBP", "CAD", "JPY", "TRY", "CHF", "CNY"];

const META = {
  EUR: { name: "Euro",             flag: "https://flagcdn.com/w80/eu.png" },
  USD: { name: "Dollar US",        flag: "https://flagcdn.com/w80/us.png" },
  GBP: { name: "Livre Sterling",   flag: "https://flagcdn.com/w80/gb.png" },
  CAD: { name: "Dollar canadien",  flag: "https://flagcdn.com/w80/ca.png" },
  JPY: { name: "Yen japonais",     flag: "https://flagcdn.com/w80/jp.png" },
  TRY: { name: "Livre turque",     flag: "https://flagcdn.com/w80/tr.png" },
  SAR: { name: "Riyal saoudien",   flag: "https://flagcdn.com/w80/sa.png" },
  AED: { name: "Dirham EAU",       flag: "https://flagcdn.com/w80/ae.png" },
  MAD: { name: "Dirham marocain",  flag: "https://flagcdn.com/w80/ma.png" },
  TND: { name: "Dinar tunisien",   flag: "https://flagcdn.com/w80/tn.png" },
  CHF: { name: "Franc suisse",     flag: "https://flagcdn.com/w80/ch.png" },
  CNY: { name: "Yuan chinois",     flag: "https://flagcdn.com/w80/cn.png" },
};

const FALLBACK_SQUARE = {
  updated: "2026-06-15",
  rates: {
    EUR: { buy: 278, sell: 275 }, USD: { buy: 238, sell: 235 },
    GBP: { buy: 314, sell: 310 }, CAD: { buy: 171, sell: 169 },
  },
  history: {},
};
const FALLBACK_OFFICIAL = {
  EUR: 154.07, USD: 133.2,  GBP: 178.55, CAD: 95.22,
  JPY: 0.87,   TRY: 3.62,  SAR: 35.52,  AED: 36.28,
  MAD: 13.11,  TND: 42.98, CHF: 149.5,  CNY: 18.32,
};

// ─────────────────────────────────────────────────────────────
const fmt = (n, d = 2) =>
  n == null || isNaN(n)
    ? "—"
    : n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const spread = (buy, off) => (buy && off ? ((buy - off) / off) * 100 : 0);

// ═════════════════════════════════════════════════════════════
//  GapBar — la signature : distance officiel ↔ Square
// ═════════════════════════════════════════════════════════════
function GapBar({ official, square, big }) {
  if (!official || !square) return null;
  const RIGHT = 92;
  const offPos = Math.max(6, (official / square) * RIGHT);
  const pct = spread(square, official);
  return (
    <div className={`gap ${big ? "gap-big" : ""}`}>
      <div className="gap-track">
        <span className="gap-fill" style={{ left: `${offPos}%`, width: `${RIGHT - offPos}%` }} />
        <span className="gap-dot gap-off" style={{ left: `${offPos}%` }} />
        <span className="gap-dot gap-st" style={{ left: `${RIGHT}%` }} />
        <span className="gap-badge" style={{ left: `${(offPos + RIGHT) / 2}%` }}>+{pct.toFixed(1)}%</span>
      </div>
      <div className="gap-legend">
        <span className="gl"><i className="sw off" />Officiel <b className="num">{fmt(official)}</b></span>
        <span className="gl gl-r"><b className="num">{fmt(square)}</b> Square<i className="sw st" /></span>
      </div>
    </div>
  );
}

function MiniGap({ pct }) {
  const w = Math.min(100, Math.max(2, pct));
  return (
    <div className="mini">
      <div className="mini-track"><span className="mini-fill" style={{ width: `${w}%` }} /></div>
      <span className="mini-lbl">écart <b>{pct.toFixed(1)}%</b></span>
    </div>
  );
}

function TwoLineChart({ off, sq, w = 660, h = 150 }) {
  const all = [...off.map((p) => p.v), ...sq.map((p) => p.v)];
  if (all.length < 2) return <div style={{ height: h }} />;
  const min = Math.min(...all), max = Math.max(...all), range = max - min || 1;
  const mk = (arr, cls) => {
    if (arr.length < 2) return null;
    const pts = arr.map((p, i) => [(i / (arr.length - 1)) * w, h - ((p.v - min) / range) * (h - 22) - 11]);
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const last = pts[pts.length - 1];
    return (
      <g className={cls}>
        <path d={d} className="ln" />
        <circle cx={last[0]} cy={last[1]} r="4" className="dot" />
      </g>
    );
  };
  const rows = [0.25, 0.5, 0.75].map((f) => h * f);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" className="tlc">
      {rows.map((y, i) => <line key={i} x1="0" x2={w} y1={y} y2={y} className="grid" />)}
      {mk(off, "c-off")}
      {mk(sq, "c-st")}
    </svg>
  );
}

function ChangeChip({ pct }) {
  if (pct == null || isNaN(pct)) return null;
  const up = pct >= 0;
  return <span className={`chip ${up ? "up" : "down"}`}>{up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%</span>;
}

// ═════════════════════════════════════════════════════════════
//  Convertisseur
// ═════════════════════════════════════════════════════════════
function Converter({ rows }) {
  const [amount, setAmount] = useState("100");
  const [code, setCode] = useState("EUR");
  const [mode, setMode] = useState("square");
  const [dir, setDir] = useState("fwd");
  const [copied, setCopied] = useState(false);
  const visibleRows = mode === "square" ? rows.filter((r) => r.hasSquare) : rows;
  const row = visibleRows.find((r) => r.code === code) || visibleRows[0];
  if (!row) return null;
  const rate = mode === "square" ? (row.sell ?? row.official) : row.official;
  const amt = parseFloat(amount || "0");
  const result = dir === "fwd" ? amt * (rate || 0) : (rate ? amt / rate : 0);
  const outUnit = dir === "fwd" ? "DZD" : code;
  const inUnit = dir === "fwd" ? code : "DZD";

  const copy = () => {
    const txt = result.toFixed(2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }).catch(() => {});
    }
  };

  return (
    <div className="conv">
      <div className="conv-head">
        <span className="conv-title">Convertisseur</span>
        <div className="seg">
          <button className={mode === "square" ? "on st" : ""} onClick={() => setMode("square")}>Square</button>
          <button className={mode === "official" ? "on off" : ""} onClick={() => setMode("official")}>Officiel</button>
        </div>
      </div>

      <div className="conv-io">
        <span className="conv-side">{inUnit}</span>
        <input className="conv-amount num" type="number" min="0" value={amount}
          onChange={(e) => setAmount(e.target.value)} aria-label="Montant" />
        {dir === "fwd" && (
          <select className="conv-select" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Devise">
            {visibleRows.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
          </select>
        )}
      </div>

      <button className="conv-swap" onClick={() => setDir(dir === "fwd" ? "inv" : "fwd")} aria-label="Inverser le sens">⇅</button>

      <div className="conv-out">
        <button className="conv-copy" onClick={copy} title="Copier">{copied ? "✓" : "⧉"}</button>
        <span className="conv-num num">{fmt(result)}</span>
        <span className="conv-unit">{outUnit}</span>
        {dir === "inv" && (
          <select className="conv-select conv-select-out" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Devise">
            {visibleRows.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
          </select>
        )}
      </div>

      <div className="conv-chips">
        {[100, 500, 1000, 5000].map((v) => (
          <button key={v} className={amount === String(v) ? "on" : ""} onClick={() => setAmount(String(v))}>{v.toLocaleString("fr-FR")}</button>
        ))}
      </div>

      <div className="conv-note">
        1 {code} = <b className="num">{fmt(rate)}</b> DZD · {mode === "square" ? "taux Square (vente)" : "taux officiel"}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
function RateCard({ r, active, onClick }) {
  const sp = r.hasSquare ? spread(r.buy, r.official) : 0;
  return (
    <button className={`card ${active ? "card-active" : ""} ${!r.hasSquare ? "card-offonly" : ""}`} onClick={onClick}>
      <div className="card-top">
        <img src={r.flag} alt="" className="flag" />
        <div className="card-id">
          <span className="card-code">{r.code}</span>
          <span className="card-name">{r.name}</span>
        </div>
        {r.hasSquare ? <ChangeChip pct={r.change?.square} /> : <span className="off-badge">Officiel</span>}
      </div>
      {r.hasSquare ? <MiniGap pct={sp} /> : <div className="off-only-row"><span className="off-lbl">Officiel</span><span className="val num val-off">{fmt(r.official)}</span><span className="off-lbl-dzd">DZD</span></div>}
      {r.hasSquare && (
        <div className="card-rates">
          <div><span className="lbl st-lbl">Achat</span><span className="val num">{fmt(r.buy)}</span></div>
          <div><span className="lbl st-lbl">Vente</span><span className="val num">{fmt(r.sell)}</span></div>
          <div><span className="lbl off-lbl">Officiel</span><span className="val num val-off">{fmt(r.official)}</span></div>
        </div>
      )}
    </button>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <span className="stat-lbl">{label}</span>
      <span className="stat-val num">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

function Detail({ r }) {
  if (!r) return null;
  const sp = r.hasSquare ? spread(r.buy, r.official) : 0;
  const offSeries = r.offHist?.length > 1 ? r.offHist : [];
  const sqSeries = r.hasSquare && r.sqHist?.length > 1 ? r.sqHist : [];
  const offV = offSeries.map((p) => p.v);
  const sqV = sqSeries.map((p) => p.v);
  const stat = (arr) => arr.length ? {
    min: Math.min(...arr), max: Math.max(...arr), avg: arr.reduce((a, b) => a + b, 0) / arr.length,
  } : null;
  const so = stat(offV), ss = stat(sqV);

  return (
    <div className="detail">
      <div className="detail-head">
        <img src={r.flag} alt="" className="flag flag-lg" />
        <div className="detail-title">
          <h3>{r.code}<span className="slash">/</span>DZD</h3>
          <span className="detail-sub">{r.name} · {r.hasSquare ? "marché parallèle vs officiel" : "taux officiel uniquement"}</span>
        </div>
        <div className="detail-now">
          <span className="detail-now-num num">{r.hasSquare ? fmt(r.buy) : fmt(r.official)}</span>
          <span className="detail-now-tag">{r.hasSquare ? `écart +${sp.toFixed(2)}%` : "Frankfurter"}</span>
        </div>
      </div>

      {r.hasSquare && <GapBar official={r.official} square={r.buy} big />}

      <div className="detail-chart-wrap">
        <div className="chart-legend">
          <span><i className="sw off" /> Officiel <small>(temps réel)</small></span>
          {r.hasSquare && <span><i className="sw st" /> Square <small>(saisi)</small></span>}
        </div>
        <div className="detail-chart">
          {(offSeries.length > 1 || sqSeries.length > 1)
            ? <TwoLineChart off={offSeries} sq={sqSeries} />
            : <div className="chart-empty">Historique en cours de constitution.</div>}
        </div>
        <div className="chart-x"><span>il y a ~6 sem.</span><span>aujourd'hui</span></div>
      </div>

      <div className="detail-grid">
        {r.hasSquare && <Stat label="Achat Square" value={`${fmt(r.buy)}`} hint="DZD" />}
        {r.hasSquare && <Stat label="Vente Square" value={`${fmt(r.sell)}`} hint="DZD" />}
        <Stat label="Officiel" value={`${fmt(r.official)}`} hint="DZD · réf. banques centrales" />
        {r.hasSquare && <Stat label="Écart vs officiel" value={`+${sp.toFixed(2)}%`} hint="prime du marché parallèle" />}
        {ss && <Stat label="Square min / max" value={`${fmt(ss.min)} – ${fmt(ss.max)}`} hint="sur la période" />}
        {so && <Stat label="Officiel min / max" value={`${fmt(so.min)} – ${fmt(so.max)}`} hint="sur la période" />}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  App
// ═════════════════════════════════════════════════════════════
export default function App() {
  const [official, setOfficial] = useState(null);
  const [offHist, setOffHist] = useState({});
  const [square, setSquare] = useState(null);
  const [status, setStatus] = useState("loading");
  const [warn, setWarn] = useState("");
  const [activeCode, setActiveCode] = useState("EUR");
  const [fetchedAt, setFetchedAt] = useState("");
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    setStatus("loading");
    setWarn("");
    let offOk = false, sqOk = false;

    // Taux officiels + historique (Frankfurter v2 — ECB currencies only)
    try {
      const today = new Date();
      const from = new Date(Date.now() - 44 * 864e5);
      const iso = (d) => d.toISOString().slice(0, 10);
      const q = FKFR_CODES.join(",") + ",DZD";
      const [latR, serR] = await Promise.all([
        fetch(`${OFFICIAL_API}/rates?base=EUR&quotes=${q}`),
        fetch(`${OFFICIAL_API}/rates?base=EUR&quotes=${q}&from=${iso(from)}&to=${iso(today)}`),
      ]);
      if (!latR.ok || !serR.ok) throw new Error("frankfurter");
      const lat = await latR.json();
      const ser = await serR.json();
      const eurDzd = lat.rates.DZD;
      // Start from fallback, override with live data
      const off = { ...FALLBACK_OFFICIAL, EUR: eurDzd };
      for (const c of FKFR_CODES) if (lat.rates[c]) off[c] = eurDzd / lat.rates[c];

      const hist = {}; CODES.forEach((c) => (hist[c] = []));
      const dates = Object.keys(ser.rates || {}).sort();
      for (const d of dates) {
        const rowD = ser.rates[d];
        const dz = rowD?.DZD;
        if (!dz) continue;
        hist.EUR.push({ d, v: dz });
        for (const c of FKFR_CODES) if (rowD[c]) hist[c].push({ d, v: dz / rowD[c] });
      }
      setOfficial(off); setOffHist(hist); offOk = true;
    } catch {
      setOfficial(FALLBACK_OFFICIAL); setOffHist({});
    }

    // Taux Square (votre JSON GitHub)
    try {
      const res = await fetch(SQUARE_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json();
      if (!data.rates) throw new Error("format");
      setSquare(data); sqOk = true;
    } catch {
      setSquare(FALLBACK_SQUARE);
      setWarn("Taux Square : source distante injoignable — valeurs de secours affichées.");
    }

    setFetchedAt(new Date().toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    setStatus(offOk && sqOk ? "ok" : offOk || sqOk ? "partial" : "error");
    firstLoad.current = false;
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const rows = useMemo(() => {
    if (!square || !official) return [];
    return CODES.map((c) => {
      const hasSquare = SQUARE_CODES.includes(c);
      const sq = hasSquare ? (square.rates[c] || {}) : {};
      const off = official[c] ?? FALLBACK_OFFICIAL[c] ?? null;
      const oH = offHist[c] || [];
      const sH = hasSquare ? (square.history?.[c] || []).map((p) => ({ d: p.d, v: p.buy })) : [];
      const chg = (arr) => arr.length >= 2 ? ((arr[arr.length - 1].v - arr[arr.length - 2].v) / arr[arr.length - 2].v) * 100 : null;
      return {
        code: c, name: META[c].name, flag: META[c].flag,
        buy: hasSquare ? (sq.buy ?? null) : null,
        sell: hasSquare ? (sq.sell ?? null) : null,
        official: off, offHist: oH, sqHist: sH, hasSquare,
        change: { official: chg(oH), square: hasSquare ? chg(sH) : null },
      };
    });
  }, [square, official, offHist]);

  const squareRows = rows.filter((r) => r.hasSquare);
  const active = rows.find((r) => r.code === activeCode);
  const stats = useMemo(() => {
    if (!squareRows.length) return null;
    const sp = squareRows.map((r) => spread(r.buy, r.official));
    const maxI = sp.indexOf(Math.max(...sp));
    return {
      avg: sp.reduce((a, b) => a + b, 0) / sp.length,
      max: Math.max(...sp), maxCode: squareRows[maxI]?.code,
      count: rows.length, updated: square?.updated,
    };
  }, [rows, squareRows, square]);

  return (
    <div className="root">
      <style>{CSS}</style>

      <div className="ticker">
        <div className="ticker-track">
          {squareRows.length
            ? [...squareRows, ...squareRows].map((r, i) => (
                <span className="ticker-item" key={i}>
                  <img src={r.flag} alt="" /> {r.code} <b className="num">{fmt(r.buy)}</b>
                  <span className="ti-off num">off {fmt(r.official, 0)}</span>
                  <em className="ti-gap">+{spread(r.buy, r.official).toFixed(0)}%</em>
                </span>
              ))
            : <span className="ticker-item">Chargement des taux…</span>}
        </div>
      </div>

      <header className="head">
        <div className="brand">
          <div className="logo"><span>د</span></div>
          <div>
            <span className="brand-name">DinarTaux</span>
            <span className="brand-sub">Square &amp; taux officiel · Algérie</span>
          </div>
        </div>
        <div className="head-meta">
          <span className={`live ${status === "loading" ? "load" : status === "error" ? "err" : ""}`}>
            <i /> {status === "loading" ? "Mise à jour…" : status === "error" ? "Hors ligne" : "En direct"}
          </span>
          <span className="clock">
            {fetchedAt ? `Actualisé ${fetchedAt}` : "—"}
            <button className="refresh" onClick={load} title="Rafraîchir">↻</button>
          </span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <span className="eyebrow">Marché du dinar · Square vs officiel</span>
          <h1>Le vrai prix<br />du <span>dinar</span></h1>
          <p>
            L'écart entre le cours <b className="t-off">officiel</b> et le taux <b className="t-st">Square</b>
            {" "}du marché parallèle, en un coup d'œil. Officiel en temps réel, Square saisi et vérifié.
          </p>
          {active && active.hasSquare && (
            <div className="hero-gap-card">
              <div className="hgc-head">
                <img src={active.flag} alt="" className="flag" />
                <span className="hgc-code">{active.code}/DZD</span>
                <ChangeChip pct={active.change?.square} />
              </div>
              <GapBar official={active.official} square={active.buy} big />
            </div>
          )}
          {stats && (
            <div className="hero-stats">
              <Stat label="Écart moyen" value={`${stats.avg.toFixed(1)}%`} />
              <Stat label="Plus grand écart" value={`${stats.max.toFixed(0)}%`} hint={stats.maxCode} />
              <Stat label="Devises" value={stats.count} />
              <Stat label="Maj Square" value={stats.updated?.slice(5) || "—"} hint={stats.updated?.slice(0, 4)} />
            </div>
          )}
        </div>
        <Converter rows={rows} />
      </section>

      {square && (
        <div className={`srcbar ${warn ? "warn" : ""}`}>
          {warn ? <>⚠ {warn}</> : <>✓ Square saisi le <b>{square.updated}</b> · officiel en temps réel (Frankfurter) · l'historique se construit chaque jour</>}
        </div>
      )}

      <section className="section">
        <div className="section-head"><h2>Taux indicatifs</h2><span className="muted">Cliquez pour les détails</span></div>
        <div className="cards">
          {rows.length
            ? rows.map((r) => <RateCard key={r.code} r={r} active={r.code === activeCode} onClick={() => setActiveCode(r.code)} />)
            : [0, 1, 2, 3].map((i) => <div key={i} className="card skeleton" />)}
        </div>
      </section>

      {active && <section className="section"><Detail r={active} /></section>}

      <section className="section">
        <div className="section-head"><h2>Tableau comparatif</h2><span className="muted">Square vs officiel</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Devise</th><th className="th-st">Achat</th><th className="th-st">Vente</th><th className="th-off">Officiel</th><th>Écart</th><th>24h</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className={r.code === activeCode ? "row-on" : ""} onClick={() => setActiveCode(r.code)}>
                  <td>
                    <div className="td-cur"><img src={r.flag} alt="" className="flag" />
                      <span><b>{r.code}</b><small>{r.name}</small></span></div>
                  </td>
                  <td className="num">{r.hasSquare ? <b>{fmt(r.buy)}</b> : <span className="val-off">—</span>}</td>
                  <td className="num">{r.hasSquare ? fmt(r.sell) : <span className="val-off">—</span>}</td>
                  <td className="num val-off">{fmt(r.official)}</td>
                  <td>{r.hasSquare ? <span className="spread">+{spread(r.buy, r.official).toFixed(1)}%</span> : <span className="muted-dash">—</span>}</td>
                  <td>{r.hasSquare ? <ChangeChip pct={r.change?.square} /> : <ChangeChip pct={r.change?.official} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="notice">
        <span className="notice-icon">⚠</span>
        <p>
          Taux <b>indicatifs</b>, pas une offre de change. L'« officiel » est une référence de marché
          (banques centrales) très proche du cours de la Banque d'Algérie sans en être strictement identique.
          Le « Square » reflète le marché parallèle et est saisi manuellement. Vérifiez avant toute opération.
        </p>
      </section>

      <footer className="foot">
        <span>© 2026 DinarTaux · Intelligence économique Algérie</span>
        <span className="foot-upd">Officiel : Frankfurter · Square : saisie vérifiée</span>
      </footer>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500;600&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
.root{
  --bg:#090C15;--bg2:#0E121D;--surface:#141926;--surface2:#1A2030;--line:#252D40;
  --text:#EEF1F8;--dim:#929DB4;--mute:#5A6479;
  --off:#6AA0FF;--off-deep:#3D6FD6;
  --st:#F7B23B;--st-deep:#E0951F;
  --up:#46E0A0;--down:#FB6F88;
  --mono:'Geist Mono','SF Mono',ui-monospace,monospace;
  background:
    radial-gradient(1200px 560px at 84% -10%, rgba(247,178,59,.10), transparent 58%),
    radial-gradient(1000px 520px at 6% 2%, rgba(106,160,255,.10), transparent 56%),
    var(--bg);
  color:var(--text);
  font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  min-height:100vh;padding-bottom:44px;
}
.root h1,.root h2,.root h3{font-family:'Bricolage Grotesque','Geist',sans-serif;letter-spacing:-.02em}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1}
.t-off{color:var(--off)}.t-st{color:var(--st)}
.val-off{color:var(--off)!important}
.muted-dash{color:var(--mute)}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--off);outline-offset:2px}

/* Ticker */
.ticker{overflow:hidden;border-bottom:1px solid var(--line);background:rgba(14,18,29,.7);backdrop-filter:blur(8px)}
.ticker-track{display:inline-flex;gap:34px;padding:9px 0;white-space:nowrap;animation:slide 36s linear infinite}
@keyframes slide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ticker-item{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--dim)}
.ticker-item img{width:18px;height:13px;border-radius:2px;object-fit:cover}
.ticker-item b{color:var(--text)}
.ti-off{color:var(--off);font-size:11px}
.ti-gap{font-style:normal;color:var(--st);font-weight:600;font-size:12px}

/* Head */
.head{max-width:1120px;margin:0 auto;padding:22px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:13px}
.logo{width:44px;height:44px;border-radius:13px;background:linear-gradient(140deg,var(--st),var(--off-deep));display:grid;place-items:center;font-size:22px;color:#0a0a0a;box-shadow:0 8px 24px -6px rgba(247,178,59,.4);font-weight:700}
.logo span{transform:translateY(-1px)}
.brand-name{display:block;font-family:'Bricolage Grotesque';font-weight:700;font-size:19px}
.brand-sub{display:block;font-size:12px;color:var(--dim)}
.head-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.live{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--up)}
.live i{width:7px;height:7px;border-radius:50%;background:var(--up);animation:pulse 2s infinite}
.live.load{color:var(--st)}.live.load i{background:var(--st)}
.live.err{color:var(--down)}.live.err i{background:var(--down);animation:none}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(70,224,160,.5)}70%{box-shadow:0 0 0 7px rgba(70,224,160,0)}100%{box-shadow:0 0 0 0 rgba(70,224,160,0)}}
.clock{font-size:12px;color:var(--mute);display:flex;align-items:center;gap:7px}
.refresh{background:var(--surface);border:1px solid var(--line);color:var(--dim);width:23px;height:23px;border-radius:6px;cursor:pointer;font-size:13px;transition:.15s}
.refresh:hover{color:var(--off);border-color:var(--off)}

/* Hero */
.hero{max-width:1120px;margin:10px auto 0;padding:28px 24px 8px;display:grid;grid-template-columns:1.3fr .9fr;gap:38px;align-items:start;animation:fadeUp .6s ease both}
.eyebrow{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--st);margin-bottom:16px}
.hero h1{font-size:clamp(38px,5.5vw,60px);line-height:.98;font-weight:800}
.hero h1 span{background:linear-gradient(100deg,var(--st),var(--off));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.hero p{margin-top:18px;color:var(--dim);font-size:15px;line-height:1.6;max-width:500px}
.hero p b{font-weight:600}

.hero-gap-card{margin-top:26px;background:linear-gradient(160deg,var(--surface2),var(--surface));border:1px solid var(--line);border-radius:18px;padding:20px}
.hgc-head{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.hgc-head .flag{width:26px;height:19px}
.hgc-code{font-family:'Bricolage Grotesque';font-weight:700;font-size:16px;flex:1}

.hero-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}

/* Gap signature */
.gap{width:100%}
.gap-track{position:relative;height:8px;border-radius:6px;background:var(--bg2);border:1px solid var(--line);margin:30px 0 16px}
.gap-big .gap-track{height:10px}
.gap-fill{position:absolute;top:50%;transform:translateY(-50%);height:8px;border-radius:6px;background:linear-gradient(90deg,var(--off-deep),var(--st));box-shadow:0 0 18px -2px rgba(247,178,59,.5)}
.gap-big .gap-fill{height:10px}
.gap-dot{position:absolute;top:50%;width:14px;height:14px;border-radius:50%;transform:translate(-50%,-50%);border:3px solid var(--bg)}
.gap-off{background:var(--off);box-shadow:0 0 0 3px rgba(106,160,255,.25)}
.gap-st{background:var(--st);box-shadow:0 0 0 3px rgba(247,178,59,.3)}
.gap-badge{position:absolute;top:-30px;transform:translateX(-50%);font-family:var(--mono);font-size:12px;font-weight:600;color:var(--st);background:rgba(247,178,59,.12);border:1px solid rgba(247,178,59,.3);padding:2px 9px;border-radius:20px;white-space:nowrap}
.gap-legend{display:flex;justify-content:space-between;font-size:12px;color:var(--dim)}
.gap-legend b{color:var(--text);margin:0 3px}
.gl{display:inline-flex;align-items:center;gap:6px}
.gl-r{flex-direction:row}
.sw{width:9px;height:9px;border-radius:3px;display:inline-block}
.sw.off{background:var(--off)}.sw.st{background:var(--st)}

/* Mini gap (cards) */
.mini{margin:4px 0 13px}
.mini-track{height:6px;border-radius:4px;background:var(--bg2);border:1px solid var(--line);overflow:hidden}
.mini-fill{display:block;height:100%;background:linear-gradient(90deg,var(--st-deep),var(--st))}
.mini-lbl{display:block;font-size:11px;color:var(--dim);margin-top:6px}
.mini-lbl b{color:var(--st);font-family:var(--mono)}

/* Stat */
.stat{background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:13px 14px}
.stat-lbl{display:block;font-size:11px;color:var(--dim);margin-bottom:6px}
.stat-val{display:block;font-size:20px;font-weight:600;letter-spacing:-.01em}
.stat-hint{display:block;font-size:10px;color:var(--mute);margin-top:3px}

/* Chip */
.chip{font-family:var(--mono);font-size:11px;font-weight:600;padding:3px 8px;border-radius:20px}
.chip.up{color:var(--up);background:rgba(70,224,160,.12)}
.chip.down{color:var(--down);background:rgba(251,111,136,.12)}

/* Converter */
.conv{background:linear-gradient(160deg,var(--surface2),var(--surface));border:1px solid var(--line);border-radius:22px;padding:22px;box-shadow:0 28px 70px -24px rgba(0,0,0,.65);position:sticky;top:18px}
.conv-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.conv-title{font-family:'Bricolage Grotesque';font-weight:700;font-size:16px}
.seg{display:flex;background:var(--bg2);border:1px solid var(--line);border-radius:9px;padding:3px}
.seg button{border:0;background:transparent;color:var(--dim);font-size:12px;font-weight:600;padding:5px 12px;border-radius:6px;cursor:pointer;font-family:inherit;transition:.15s}
.seg button.on.st{background:var(--st);color:#1a1206}
.seg button.on.off{background:var(--off);color:#06101f}
.conv-io{display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:6px 8px 6px 14px}
.conv-io:focus-within{border-color:var(--off)}
.conv-side{font-size:13px;color:var(--mute);font-weight:600;min-width:30px}
.conv-amount{flex:1;background:transparent;border:0;color:var(--text);font-size:24px;font-weight:600;outline:none;min-width:0;padding:8px 0}
.conv-select{background:var(--surface2);border:1px solid var(--line);border-radius:10px;padding:9px 12px;color:var(--text);font-size:14px;font-weight:600;cursor:pointer;outline:none;font-family:inherit}
.conv-swap{display:block;margin:-9px auto;position:relative;z-index:2;width:34px;height:34px;border-radius:10px;background:var(--surface2);border:1px solid var(--line);color:var(--off);font-size:16px;cursor:pointer;transition:.18s}
.conv-swap:hover{transform:rotate(180deg);border-color:var(--off);color:var(--text)}
.conv-out{display:flex;align-items:center;gap:9px;background:var(--bg);border:1px dashed var(--line);border-radius:14px;padding:14px;margin-top:0}
.conv-copy{margin-right:auto;width:30px;height:30px;border-radius:8px;background:var(--surface2);border:1px solid var(--line);color:var(--dim);cursor:pointer;font-size:14px;transition:.15s;order:-1}
.conv-copy:hover{color:var(--st);border-color:var(--st)}
.conv-num{font-size:30px;font-weight:600;color:var(--st);letter-spacing:-.02em}
.conv-unit{font-size:14px;color:var(--dim);font-weight:600}
.conv-select-out{margin-left:4px;padding:7px 10px}
.conv-chips{display:flex;gap:7px;margin-top:12px}
.conv-chips button{flex:1;background:var(--bg);border:1px solid var(--line);color:var(--dim);font-family:var(--mono);font-size:12px;font-weight:600;padding:7px 0;border-radius:9px;cursor:pointer;transition:.15s}
.conv-chips button:hover{border-color:var(--off);color:var(--text)}
.conv-chips button.on{background:rgba(106,160,255,.12);border-color:var(--off);color:var(--off)}
.conv-note{text-align:center;font-size:12px;color:var(--mute);margin-top:13px}
.conv-note b{color:var(--st)}

/* Source bar */
.srcbar{max-width:1120px;margin:24px auto 0;padding:0 24px;font-size:13px;color:var(--up)}
.srcbar b{color:var(--text)}
.srcbar.warn{color:var(--st)}

/* Sections */
.section{max-width:1120px;margin:32px auto 0;padding:0 24px;animation:fadeUp .6s ease both}
.section-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px}
.section-head h2{font-size:22px;font-weight:700}
.muted{font-size:13px;color:var(--mute)}

/* Cards */
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.card{text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:17px;padding:17px;cursor:pointer;transition:.18s;font-family:inherit;color:inherit}
.card:hover{border-color:var(--off);transform:translateY(-3px)}
.card-active{border-color:var(--st);background:var(--surface2);box-shadow:0 0 0 1px var(--st),0 20px 44px -24px rgba(247,178,59,.5)}
.card-offonly{opacity:.88}
.card.skeleton{height:172px;animation:sk 1.4s ease-in-out infinite;cursor:default;border-style:dashed}
@keyframes sk{0%,100%{opacity:.45}50%{opacity:.8}}
.card-top{display:flex;align-items:center;gap:9px;margin-bottom:13px}
.flag{width:26px;height:19px;border-radius:3px;object-fit:cover;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
.flag-lg{width:42px;height:30px;border-radius:5px}
.card-id{display:flex;flex-direction:column;flex:1}
.card-code{font-family:'Bricolage Grotesque';font-weight:700;font-size:15px}
.card-name{font-size:11px;color:var(--dim)}
.card-rates{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;border-top:1px solid var(--line);padding-top:12px}
.lbl{display:block;font-size:10px;margin-bottom:3px}
.st-lbl{color:var(--st)}.off-lbl{color:var(--off)}
.val{font-size:14px;font-weight:600}
.off-badge{font-size:10px;font-weight:600;color:var(--off);background:rgba(106,160,255,.12);border:1px solid rgba(106,160,255,.25);padding:2px 8px;border-radius:20px}
.off-only-row{display:flex;align-items:baseline;gap:6px;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin:8px 0}
.off-lbl-dzd{font-size:10px;color:var(--mute)}

/* Detail */
.detail{background:linear-gradient(160deg,var(--surface2),var(--surface));border:1px solid var(--line);border-radius:22px;padding:26px}
.detail-head{display:flex;align-items:center;gap:15px;margin-bottom:6px}
.detail-title{flex:1}
.detail-head h3{font-size:24px;font-weight:700}
.detail-head .slash{color:var(--st);margin:0 1px}
.detail-sub{font-size:12px;color:var(--dim)}
.detail-now{text-align:right}
.detail-now-num{display:block;font-size:28px;font-weight:600;color:var(--st)}
.detail-now-tag{font-size:11px;color:var(--dim)}
.detail-chart-wrap{margin-top:22px}
.chart-legend{display:flex;gap:18px;font-size:12px;color:var(--dim);margin-bottom:10px}
.chart-legend span{display:inline-flex;align-items:center;gap:6px}
.chart-legend small{color:var(--mute)}
.detail-chart{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:16px}
.chart-empty{height:118px;display:grid;place-items:center;color:var(--mute);font-size:13px}
.tlc .grid{stroke:var(--line);stroke-width:1;stroke-dasharray:3 5;opacity:.5}
.tlc .ln{fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.tlc .c-off .ln{stroke:var(--off)}.tlc .c-off .dot{fill:var(--off)}
.tlc .c-st .ln{stroke:var(--st)}.tlc .c-st .dot{fill:var(--st)}
.chart-x{display:flex;justify-content:space-between;font-size:11px;color:var(--mute);margin-top:8px}
.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}

/* Table */
.table-wrap{background:var(--surface);border:1px solid var(--line);border-radius:17px;overflow:hidden}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl thead th{text-align:left;padding:14px 16px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--mute);border-bottom:1px solid var(--line);background:var(--bg2)}
.th-st{color:var(--st)}.th-off{color:var(--off)}
.tbl tbody td{padding:14px 16px;border-bottom:1px solid var(--line);cursor:pointer}
.tbl tbody tr:last-child td{border-bottom:0}
.tbl tbody tr:hover{background:var(--surface2)}
.tbl tbody tr.row-on{background:rgba(247,178,59,.06)}
.td-cur{display:flex;align-items:center;gap:10px}
.td-cur b{font-family:'Bricolage Grotesque'}
.td-cur small{color:var(--dim);font-size:12px;display:block}
.spread{display:inline-block;font-family:var(--mono);font-weight:600;color:var(--st);background:rgba(247,178,59,.1);padding:3px 9px;border-radius:7px;font-size:13px}

/* Notice + footer */
.notice{max-width:1072px;margin:36px auto 0;padding:16px 20px;display:flex;gap:13px;align-items:flex-start;background:rgba(247,178,59,.06);border:1px solid rgba(247,178,59,.2);border-radius:14px}
.notice-icon{color:var(--st);font-size:17px;line-height:1.4}
.notice p{font-size:13px;color:var(--dim);line-height:1.6}
.notice b{color:var(--text)}
.foot{max-width:1120px;margin:34px auto 0;padding:24px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);font-size:12px;color:var(--mute)}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

@media(max-width:900px){
  .hero{grid-template-columns:1fr;gap:26px}
  .conv{position:static}
  .cards{grid-template-columns:repeat(2,1fr)}
  .detail-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:560px){
  .cards{grid-template-columns:1fr}
  .hero-stats{grid-template-columns:repeat(2,1fr)}
  .table-wrap{overflow-x:auto}.tbl{min-width:560px}
  .head-meta{align-items:flex-start}
  .detail-grid{grid-template-columns:1fr}
}
@media(prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  .conv-swap:hover{transform:none}
}
`;
