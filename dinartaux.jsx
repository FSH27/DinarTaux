import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ═════════════════════════════════════════════════════════════
//  CONFIGURATION — modifiez ces deux constantes
// ═════════════════════════════════════════════════════════════
const SQUARE_URL =
  "https://raw.githubusercontent.com/FSH27/DinarTaux/main/square-rates.json";

const OFFICIAL_API = "https://api.frankfurter.dev/v2";
const METALS_API = "https://api.gold-api.com/price";
const OZ_TO_G = 31.1034768;

const METALS_META = {
  XAU: { name: "Or", unit: "g", flag: null, symbol: "🥇" },
  XAG: { name: "Argent", unit: "g", flag: null, symbol: "🥈" },
};
const FALLBACK_METALS = { XAU: 4327.3, XAG: 70.62 }; // USD / once troy

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
// i18n — noms de devises / métaux par langue
const META_NAMES = {
  fr: { EUR: "Euro", USD: "Dollar US", GBP: "Livre Sterling", CAD: "Dollar canadien", JPY: "Yen japonais", TRY: "Livre turque", SAR: "Riyal saoudien", AED: "Dirham EAU", MAD: "Dirham marocain", TND: "Dinar tunisien", CHF: "Franc suisse", CNY: "Yuan chinois" },
  en: { EUR: "Euro", USD: "US Dollar", GBP: "British Pound", CAD: "Canadian Dollar", JPY: "Japanese Yen", TRY: "Turkish Lira", SAR: "Saudi Riyal", AED: "UAE Dirham", MAD: "Moroccan Dirham", TND: "Tunisian Dinar", CHF: "Swiss Franc", CNY: "Chinese Yuan" },
  ar: { EUR: "يورو", USD: "دولار أمريكي", GBP: "جنيه إسترليني", CAD: "دولار كندي", JPY: "ين ياباني", TRY: "ليرة تركية", SAR: "ريال سعودي", AED: "درهم إماراتي", MAD: "درهم مغربي", TND: "دينار تونسي", CHF: "فرنك سويسري", CNY: "يوان صيني" },
};
const METALS_NAMES = {
  fr: { XAU: "Or", XAG: "Argent" },
  en: { XAU: "Gold", XAG: "Silver" },
  ar: { XAU: "ذهب", XAG: "فضة" },
};

const LOCALE_MAP = { fr: "fr-FR", en: "en-US", ar: "ar-DZ-u-nu-latn" };
let CURRENT_LOCALE = "fr-FR";

const STRINGS = {
  fr: {
    tickerLoading: "Chargement des taux…",
    brandSub: "Square & taux officiel · Algérie",
    liveUpdating: "Mise à jour…", liveOffline: "Hors ligne", liveOnline: "En direct",
    refreshedPrefix: "Actualisé", refreshTitle: "Rafraîchir",
    themeToLight: "Passer en mode clair", themeToDark: "Passer en mode sombre", themeAria: "Changer de thème",
    langAria: "Changer de langue",
    eyebrow: "Marché du dinar · Square vs officiel",
    heroTitle1: "Le vrai prix", heroTitle2Pre: "du ", heroTitle2Word: "dinar",
    heroP1: "L'écart entre le cours ", heroPOff: "officiel", heroP2: " et le taux ", heroPSt: "Square",
    heroP3: " du marché parallèle, en un coup d'œil. Officiel en temps réel, Square saisi et vérifié.",
    statAvgGap: "Écart moyen", statMaxGap: "Plus grand écart", statCurrencies: "Devises", statSquareUpdate: "Maj Square",
    sectionRatesTitle: "Taux indicatifs", sectionRatesSub: "Cliquez pour les détails",
    sectionMetalsTitle: "Métaux précieux", sectionMetalsSub: "Or & argent · spot temps réel",
    sectionTableTitle: "Tableau comparatif", sectionTableSub: "Square vs officiel",
    thCurrency: "Devise", thBuy: "Achat", thSell: "Vente", thOfficial: "Officiel", thGap: "Écart", th24h: "24h",
    noticePre: "Taux ", noticeB: "indicatifs", noticePost: ", pas une offre de change. L'« officiel » est une référence de marché (banques centrales) très proche du cours de la Banque d'Algérie sans en être strictement identique. Le « Square » reflète le marché parallèle et est saisi manuellement. Vérifiez avant toute opération.",
    footerCopy: "© 2026 DinarTaux · Intelligence économique Algérie",
    footerUpd: "Officiel : Frankfurter · Square : saisie vérifiée",
    srcbarOkPre: "Square saisi le", srcbarOkPost: " · officiel en temps réel (Frankfurter) · l'historique se construit chaque jour",
    srcbarWarn: "Taux Square : source distante injoignable — valeurs de secours affichées.",
    convTitle: "Convertisseur", convOfficial: "Officiel", amountAria: "Montant", currencyAria: "Devise",
    swapAria: "Inverser le sens", copyTitle: "Copier",
    convNoteSquare: "taux Square (vente)", convNoteOfficial: "taux officiel",
    perGram: "DZD / gramme", perOz: "DZD / once", usdPerOz: "USD / once", troyOz: "once troy",
    detailParallel: "marché parallèle vs officiel", detailOfficialOnly: "taux officiel uniquement",
    gapWord: "écart", chartOfficial: "Officiel", chartRealtime: "(temps réel)", chartEntered: "(saisi)",
    chartEmpty: "Historique en cours de constitution.", chartXAgo: "il y a ~6 sem.", chartXToday: "aujourd'hui",
    statBuySquare: "Achat Square", statSellSquare: "Vente Square", statOfficialHint: "DZD · réf. banques centrales",
    statGapVsOfficial: "Écart vs officiel", statGapHint: "prime du marché parallèle",
    statSquareMinMax: "Square min / max", statOfficialMinMax: "Officiel min / max", periodHint: "sur la période",
  },
  en: {
    tickerLoading: "Loading rates…",
    brandSub: "Square & official rate · Algeria",
    liveUpdating: "Updating…", liveOffline: "Offline", liveOnline: "Live",
    refreshedPrefix: "Updated", refreshTitle: "Refresh",
    themeToLight: "Switch to light mode", themeToDark: "Switch to dark mode", themeAria: "Change theme",
    langAria: "Change language",
    eyebrow: "Dinar market · Square vs official",
    heroTitle1: "The real price", heroTitle2Pre: "of the ", heroTitle2Word: "dinar",
    heroP1: "The gap between the ", heroPOff: "official", heroP2: " rate and the ", heroPSt: "Square",
    heroP3: " parallel-market rate, at a glance. Official in real time, Square entered and verified.",
    statAvgGap: "Average gap", statMaxGap: "Largest gap", statCurrencies: "Currencies", statSquareUpdate: "Square update",
    sectionRatesTitle: "Indicative rates", sectionRatesSub: "Click for details",
    sectionMetalsTitle: "Precious metals", sectionMetalsSub: "Gold & silver · real-time spot",
    sectionTableTitle: "Comparison table", sectionTableSub: "Square vs official",
    thCurrency: "Currency", thBuy: "Buy", thSell: "Sell", thOfficial: "Official", thGap: "Gap", th24h: "24h",
    noticePre: "Rates are ", noticeB: "indicative", noticePost: " only, not an exchange offer. The “official” rate is a market reference (central banks) very close to the Bank of Algeria's rate without being strictly identical. The “Square” rate reflects the parallel market and is entered manually. Verify before any transaction.",
    footerCopy: "© 2026 DinarTaux · Algeria economic intelligence",
    footerUpd: "Official: Frankfurter · Square: verified entry",
    srcbarOkPre: "Square entered on", srcbarOkPost: " · official in real time (Frankfurter) · history builds up daily",
    srcbarWarn: "Square rate: remote source unreachable — fallback values shown.",
    convTitle: "Converter", convOfficial: "Official", amountAria: "Amount", currencyAria: "Currency",
    swapAria: "Swap direction", copyTitle: "Copy",
    convNoteSquare: "Square rate (sell)", convNoteOfficial: "official rate",
    perGram: "DZD / gram", perOz: "DZD / oz", usdPerOz: "USD / oz", troyOz: "troy ounce",
    detailParallel: "parallel market vs official", detailOfficialOnly: "official rate only",
    gapWord: "gap", chartOfficial: "Official", chartRealtime: "(real-time)", chartEntered: "(entered)",
    chartEmpty: "History is being built.", chartXAgo: "~6 weeks ago", chartXToday: "today",
    statBuySquare: "Square buy", statSellSquare: "Square sell", statOfficialHint: "DZD · central bank ref.",
    statGapVsOfficial: "Gap vs official", statGapHint: "parallel market premium",
    statSquareMinMax: "Square min / max", statOfficialMinMax: "Official min / max", periodHint: "over the period",
  },
  ar: {
    tickerLoading: "جارٍ تحميل الأسعار…",
    brandSub: "السوق الموازي والسعر الرسمي · الجزائر",
    liveUpdating: "جارٍ التحديث…", liveOffline: "غير متصل", liveOnline: "مباشر",
    refreshedPrefix: "آخر تحديث", refreshTitle: "تحديث",
    themeToLight: "التبديل إلى الوضع الفاتح", themeToDark: "التبديل إلى الوضع الداكن", themeAria: "تغيير المظهر",
    langAria: "تغيير اللغة",
    eyebrow: "سوق الدينار · السوق الموازي مقابل الرسمي",
    heroTitle1: "السعر الحقيقي", heroTitle2Pre: "لل", heroTitle2Word: "دينار",
    heroP1: "الفرق بين السعر ", heroPOff: "الرسمي", heroP2: " وسعر ", heroPSt: "السوق الموازي",
    heroP3: " في لمحة واحدة. الرسمي في الوقت الفعلي، والموازي مُدخل ومُتحقق منه.",
    statAvgGap: "الفرق المتوسط", statMaxGap: "أكبر فرق", statCurrencies: "العملات", statSquareUpdate: "تحديث الموازي",
    sectionRatesTitle: "أسعار إرشادية", sectionRatesSub: "اضغط للتفاصيل",
    sectionMetalsTitle: "المعادن الثمينة", sectionMetalsSub: "الذهب والفضة · السعر الفوري",
    sectionTableTitle: "جدول المقارنة", sectionTableSub: "السوق الموازي مقابل الرسمي",
    thCurrency: "العملة", thBuy: "شراء", thSell: "بيع", thOfficial: "رسمي", thGap: "الفرق", th24h: "24 س",
    noticePre: "الأسعار ", noticeB: "إرشادية", noticePost: " فقط، وليست عرض صرف. السعر «الرسمي» هو مرجع سوقي (بنوك مركزية) قريب جدًا من سعر بنك الجزائر دون أن يكون مطابقًا له تمامًا. ويعكس سعر «السوق الموازي» السوق الموازي ويتم إدخاله يدويًا. تحقق قبل أي عملية.",
    footerCopy: "© 2026 DinarTaux · معلومات اقتصادية الجزائر",
    footerUpd: "الرسمي: Frankfurter · الموازي: بيانات موثقة",
    srcbarOkPre: "تم إدخال السوق الموازي في", srcbarOkPost: " · الرسمي في الوقت الفعلي (Frankfurter) · يتم بناء السجل يوميًا",
    srcbarWarn: "سعر السوق الموازي: تعذر الوصول إلى المصدر — يتم عرض قيم احتياطية.",
    convTitle: "محول العملات", convOfficial: "رسمي", amountAria: "المبلغ", currencyAria: "العملة",
    swapAria: "عكس الاتجاه", copyTitle: "نسخ",
    convNoteSquare: "سعر السوق الموازي (بيع)", convNoteOfficial: "السعر الرسمي",
    perGram: "دينار / غرام", perOz: "دينار / أونصة", usdPerOz: "دولار / أونصة", troyOz: "أونصة تروي",
    detailParallel: "السوق الموازي مقابل الرسمي", detailOfficialOnly: "السعر الرسمي فقط",
    gapWord: "فرق", chartOfficial: "رسمي", chartRealtime: "(فوري)", chartEntered: "(مُدخل)",
    chartEmpty: "السجل قيد الإنشاء.", chartXAgo: "منذ ~6 أسابيع", chartXToday: "اليوم",
    statBuySquare: "شراء السوق الموازي", statSellSquare: "بيع السوق الموازي", statOfficialHint: "دينار · مرجع البنوك المركزية",
    statGapVsOfficial: "الفرق عن الرسمي", statGapHint: "علاوة السوق الموازي",
    statSquareMinMax: "أدنى/أقصى الموازي", statOfficialMinMax: "أدنى/أقصى الرسمي", periodHint: "خلال الفترة",
  },
};

const fmt = (n, d = 2) =>
  n == null || isNaN(n)
    ? "—"
    : n.toLocaleString(CURRENT_LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
const spread = (buy, off) => (buy && off ? ((buy - off) / off) * 100 : 0);

// ═════════════════════════════════════════════════════════════
//  GapBar — la signature : distance officiel ↔ Square
// ═════════════════════════════════════════════════════════════
function GapBar({ official, square, big, t }) {
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
        <span className="gl"><i className="sw off" />{t.thOfficial} <b className="num">{fmt(official)}</b></span>
        <span className="gl gl-r"><b className="num">{fmt(square)}</b> Square<i className="sw st" /></span>
      </div>
    </div>
  );
}

function MiniGap({ pct, t }) {
  const w = Math.min(100, Math.max(2, pct));
  return (
    <div className="mini">
      <div className="mini-track"><span className="mini-fill" style={{ width: `${w}%` }} /></div>
      <span className="mini-lbl">{t.gapWord} <b>{pct.toFixed(1)}%</b></span>
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
function Converter({ rows, t, lang }) {
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
        <span className="conv-title">{t.convTitle}</span>
        <div className="seg">
          <button className={mode === "square" ? "on st" : ""} onClick={() => setMode("square")}>Square</button>
          <button className={mode === "official" ? "on off" : ""} onClick={() => setMode("official")}>{t.convOfficial}</button>
        </div>
      </div>

      <div className="conv-io">
        <span className="conv-side">{inUnit}</span>
        <input className="conv-amount num" type="number" min="0" value={amount}
          onChange={(e) => setAmount(e.target.value)} aria-label={t.amountAria} />
        {dir === "fwd" && (
          <select className="conv-select" value={code} onChange={(e) => setCode(e.target.value)} aria-label={t.currencyAria}>
            {visibleRows.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
          </select>
        )}
      </div>

      <button className="conv-swap" onClick={() => setDir(dir === "fwd" ? "inv" : "fwd")} aria-label={t.swapAria}>⇅</button>

      <div className="conv-out">
        <button className="conv-copy" onClick={copy} title={t.copyTitle}>{copied ? "✓" : "⧉"}</button>
        <span className="conv-num num">{fmt(result)}</span>
        <span className="conv-unit">{outUnit}</span>
        {dir === "inv" && (
          <select className="conv-select conv-select-out" value={code} onChange={(e) => setCode(e.target.value)} aria-label={t.currencyAria}>
            {visibleRows.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
          </select>
        )}
      </div>

      <div className="conv-chips">
        {[100, 500, 1000, 5000].map((v) => (
          <button key={v} className={amount === String(v) ? "on" : ""} onClick={() => setAmount(String(v))}>{v.toLocaleString(CURRENT_LOCALE)}</button>
        ))}
      </div>

      <div className="conv-note">
        1 {code} = <b className="num">{fmt(rate)}</b> DZD · {mode === "square" ? t.convNoteSquare : t.convNoteOfficial}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
function RateCard({ r, active, onClick, t }) {
  const sp = r.hasSquare ? spread(r.buy, r.official) : 0;
  return (
    <button className={`card ${active ? "card-active" : ""} ${!r.hasSquare ? "card-offonly" : ""}`} onClick={onClick}>
      <div className="card-top">
        <img src={r.flag} alt="" className="flag" />
        <div className="card-id">
          <span className="card-code">{r.code}</span>
          <span className="card-name">{r.name}</span>
        </div>
        {r.hasSquare ? <ChangeChip pct={r.change?.square} /> : <span className="off-badge">{t.thOfficial}</span>}
      </div>
      {r.hasSquare ? <MiniGap pct={sp} t={t} /> : <div className="off-only-row"><span className="off-lbl">{t.thOfficial}</span><span className="val num val-off">{fmt(r.official)}</span><span className="off-lbl-dzd">DZD</span></div>}
      {r.hasSquare && (
        <div className="card-rates">
          <div><span className="lbl st-lbl">{t.thBuy}</span><span className="val num">{fmt(r.buy)}</span></div>
          <div><span className="lbl st-lbl">{t.thSell}</span><span className="val num">{fmt(r.sell)}</span></div>
          <div><span className="lbl off-lbl">{t.thOfficial}</span><span className="val num val-off">{fmt(r.official)}</span></div>
        </div>
      )}
    </button>
  );
}

function MetalCard({ m, t }) {
  return (
    <div className="metal-card">
      <div className="metal-top">
        <span className="metal-ico">{m.symbol}</span>
        <div className="card-id">
          <span className="card-code">{m.name}</span>
          <span className="card-name">{m.code} · {t.troyOz} = {OZ_TO_G.toFixed(2)} g</span>
        </div>
        <ChangeChip pct={m.change} />
      </div>
      <div className="metal-rates">
        <div className="metal-main">
          <span className="lbl off-lbl">{t.perGram}</span>
          <span className="val num metal-big">{fmt(m.dzdGram)}</span>
        </div>
        <div className="metal-sub">
          <span><span className="lbl">{t.perOz}</span><span className="val num">{fmt(m.dzdOz, 0)}</span></span>
          <span><span className="lbl">{t.usdPerOz}</span><span className="val num">{fmt(m.usdOz)}</span></span>
        </div>
      </div>
    </div>
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

function Detail({ r, t }) {
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
          <span className="detail-sub">{r.name} · {r.hasSquare ? t.detailParallel : t.detailOfficialOnly}</span>
        </div>
        <div className="detail-now">
          <span className="detail-now-num num">{r.hasSquare ? fmt(r.buy) : fmt(r.official)}</span>
          <span className="detail-now-tag">{r.hasSquare ? `${t.gapWord} +${sp.toFixed(2)}%` : "Frankfurter"}</span>
        </div>
      </div>

      {r.hasSquare && <GapBar official={r.official} square={r.buy} big t={t} />}

      <div className="detail-chart-wrap">
        <div className="chart-legend">
          <span><i className="sw off" /> {t.chartOfficial} <small>{t.chartRealtime}</small></span>
          {r.hasSquare && <span><i className="sw st" /> Square <small>{t.chartEntered}</small></span>}
        </div>
        <div className="detail-chart">
          {(offSeries.length > 1 || sqSeries.length > 1)
            ? <TwoLineChart off={offSeries} sq={sqSeries} />
            : <div className="chart-empty">{t.chartEmpty}</div>}
        </div>
        <div className="chart-x"><span>{t.chartXAgo}</span><span>{t.chartXToday}</span></div>
      </div>

      <div className="detail-grid">
        {r.hasSquare && <Stat label={t.statBuySquare} value={`${fmt(r.buy)}`} hint="DZD" />}
        {r.hasSquare && <Stat label={t.statSellSquare} value={`${fmt(r.sell)}`} hint="DZD" />}
        <Stat label={t.thOfficial} value={`${fmt(r.official)}`} hint={t.statOfficialHint} />
        {r.hasSquare && <Stat label={t.statGapVsOfficial} value={`+${sp.toFixed(2)}%`} hint={t.statGapHint} />}
        {ss && <Stat label={t.statSquareMinMax} value={`${fmt(ss.min)} – ${fmt(ss.max)}`} hint={t.periodHint} />}
        {so && <Stat label={t.statOfficialMinMax} value={`${fmt(so.min)} – ${fmt(so.max)}`} hint={t.periodHint} />}
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
  const [metals, setMetals] = useState(null);
  const [prevMetals, setPrevMetals] = useState(null);
  const metalsRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [warn, setWarn] = useState("");
  const [activeCode, setActiveCode] = useState("EUR");
  const [fetchedAt, setFetchedAt] = useState("");
  const firstLoad = useRef(true);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("dt-theme");
      if (saved) return saved;
      return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch { return "dark"; }
  });

  useEffect(() => {
    try { localStorage.setItem("dt-theme", theme); } catch {}
  }, [theme]);

  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("dt-lang") || "fr"; } catch { return "fr"; }
  });

  useEffect(() => {
    try { localStorage.setItem("dt-lang", lang); } catch {}
    try { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; } catch {}
  }, [lang]);

  const t = STRINGS[lang];
  CURRENT_LOCALE = LOCALE_MAP[lang];

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
      // Frankfurter v2 returns a flat array of { date, base, quote, rate } rows,
      // not the nested { rates: {...} } shape — flatten into lookup maps.
      const latRows = await latR.json();
      const serRows = await serR.json();
      const latMap = {};
      for (const row of latRows) latMap[row.quote] = row.rate;
      const eurDzd = latMap.DZD;
      // Start from fallback, override with live data
      const off = { ...FALLBACK_OFFICIAL, EUR: eurDzd };
      for (const c of FKFR_CODES) if (latMap[c]) off[c] = eurDzd / latMap[c];

      const byDate = {};
      for (const row of serRows) (byDate[row.date] ??= {})[row.quote] = row.rate;
      const hist = {}; CODES.forEach((c) => (hist[c] = []));
      const dates = Object.keys(byDate).sort();
      for (const d of dates) {
        const rowD = byDate[d];
        const dz = rowD.DZD;
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

    // Or & argent (gold-api.com — gratuit, sans clé, USD/once troy)
    try {
      const [xauR, xagR] = await Promise.all([
        fetch(`${METALS_API}/XAU`),
        fetch(`${METALS_API}/XAG`),
      ]);
      if (!xauR.ok || !xagR.ok) throw new Error("metals");
      const [xau, xag] = await Promise.all([xauR.json(), xagR.json()]);
      setPrevMetals(metalsRef.current);
      const next = { XAU: xau.price, XAG: xag.price };
      metalsRef.current = next;
      setMetals(next);
    } catch {
      if (!metalsRef.current) { metalsRef.current = FALLBACK_METALS; setMetals(FALLBACK_METALS); }
    }

    setFetchedAt(new Date().toLocaleString(CURRENT_LOCALE, { hour: "2-digit", minute: "2-digit" }));
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
        code: c, name: META_NAMES[lang][c], flag: META[c].flag,
        buy: hasSquare ? (sq.buy ?? null) : null,
        sell: hasSquare ? (sq.sell ?? null) : null,
        official: off, offHist: oH, sqHist: sH, hasSquare,
        change: { official: chg(oH), square: hasSquare ? chg(sH) : null },
      };
    });
  }, [square, official, offHist, lang]);

  const metalRows = useMemo(() => {
    if (!metals || !official) return [];
    const usdDzd = official.USD;
    if (!usdDzd) return [];
    return Object.keys(METALS_META).map((code) => {
      const usdOz = metals[code];
      const prevUsdOz = prevMetals?.[code];
      const dzdOz = usdOz * usdDzd;
      const dzdGram = dzdOz / OZ_TO_G;
      const change = prevUsdOz ? ((usdOz - prevUsdOz) / prevUsdOz) * 100 : null;
      return { code, ...METALS_META[code], name: METALS_NAMES[lang][code], usdOz, dzdOz, dzdGram, change };
    });
  }, [metals, prevMetals, official, lang]);

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
    <div className="root" data-theme={theme} dir={lang === "ar" ? "rtl" : "ltr"}>
      <style>{CSS}</style>

      <div className="ticker">
        <div className="ticker-track">
          {rows.length
            ? [...rows, ...rows].map((r, i) => (
                <span className="ticker-item" key={i}>
                  <img src={r.flag} alt="" /> {r.code}{" "}
                  {r.hasSquare ? (
                    <>
                      <b className="num">{fmt(r.buy)}</b>
                      <span className="ti-off num">off {fmt(r.official, 0)}</span>
                      <em className="ti-gap">+{spread(r.buy, r.official).toFixed(0)}%</em>
                    </>
                  ) : (
                    <b className="num">{fmt(r.official, 2)}</b>
                  )}
                </span>
              ))
            : <span className="ticker-item">{t.tickerLoading}</span>}
        </div>
      </div>

      <header className="head">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 44 44" width="44" height="44">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="var(--st)" />
                  <stop offset="1" stopColor="var(--off-deep)" />
                </linearGradient>
              </defs>
              <rect width="44" height="44" rx="13" fill="url(#logoGrad)" />
              <circle cx="22" cy="22" r="14" fill="none" stroke="rgba(10,10,10,.28)" strokeWidth="1.6" strokeDasharray="2.4 3.4" />
              <text x="22" y="29.5" textAnchor="middle" fontSize="19" fontWeight="700" fill="#0a0a0a" fontFamily="'Bricolage Grotesque',sans-serif">د</text>
            </svg>
          </div>
          <div>
            <span className="brand-name">DinarTaux</span>
            <span className="brand-sub">{t.brandSub}</span>
          </div>
        </div>
        <div className="head-meta">
          <span className={`live ${status === "loading" ? "load" : status === "error" ? "err" : ""}`}>
            <i /> {status === "loading" ? t.liveUpdating : status === "error" ? t.liveOffline : t.liveOnline}
          </span>
          <span className="clock">
            <span className="clock-text">{fetchedAt ? `${t.refreshedPrefix} ${fetchedAt}` : "—"}</span>
            <button className="refresh" onClick={load} title={t.refreshTitle}>↻</button>
            <div className="lang-switch" role="group" aria-label={t.langAria}>
              {["fr", "en", "ar"].map((lg) => (
                <button key={lg} className={lang === lg ? "on" : ""} onClick={() => setLang(lg)}>{lg.toUpperCase()}</button>
              ))}
            </div>
            <button
              className="theme-toggle"
              onClick={() => setTheme((th) => (th === "dark" ? "light" : "dark"))}
              title={theme === "dark" ? t.themeToLight : t.themeToDark}
              aria-label={t.themeAria}
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
          </span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-left">
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>{t.heroTitle1}<br />{t.heroTitle2Pre}<span>{t.heroTitle2Word}</span></h1>
          <p>
            {t.heroP1}<b className="t-off">{t.heroPOff}</b>{t.heroP2}<b className="t-st">{t.heroPSt}</b>
            {t.heroP3}
          </p>
          {active && active.hasSquare && (
            <div className="hero-gap-card">
              <div className="hgc-head">
                <img src={active.flag} alt="" className="flag" />
                <span className="hgc-code">{active.code}/DZD</span>
                <ChangeChip pct={active.change?.square} />
              </div>
              <GapBar official={active.official} square={active.buy} big t={t} />
            </div>
          )}
          {stats && (
            <div className="hero-stats">
              <Stat label={t.statAvgGap} value={`${stats.avg.toFixed(1)}%`} />
              <Stat label={t.statMaxGap} value={`${stats.max.toFixed(0)}%`} hint={stats.maxCode} />
              <Stat label={t.statCurrencies} value={stats.count} />
              <Stat label={t.statSquareUpdate} value={stats.updated?.slice(5) || "—"} hint={stats.updated?.slice(0, 4)} />
            </div>
          )}
        </div>
        <Converter rows={rows} t={t} lang={lang} />
      </section>

      {square && (
        <div className={`srcbar ${warn ? "warn" : ""}`}>
          {warn ? <>⚠ {warn}</> : <>✓ {t.srcbarOkPre} <b>{square.updated}</b>{t.srcbarOkPost}</>}
        </div>
      )}

      <section className="section">
        <div className="section-head"><h2>{t.sectionRatesTitle}</h2><span className="muted">{t.sectionRatesSub}</span></div>
        <div className="cards">
          {rows.length
            ? rows.map((r) => <RateCard key={r.code} r={r} active={r.code === activeCode} onClick={() => setActiveCode(r.code)} t={t} />)
            : [0, 1, 2, 3].map((i) => <div key={i} className="card skeleton" />)}
        </div>
      </section>

      {active && <section className="section"><Detail r={active} t={t} /></section>}

      <section className="section">
        <div className="section-head"><h2>{t.sectionMetalsTitle}</h2><span className="muted">{t.sectionMetalsSub}</span></div>
        <div className="metal-cards">
          {metalRows.length
            ? metalRows.map((m) => <MetalCard key={m.code} m={m} t={t} />)
            : [0, 1].map((i) => <div key={i} className="metal-card skeleton" />)}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>{t.sectionTableTitle}</h2><span className="muted">{t.sectionTableSub}</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>{t.thCurrency}</th><th className="th-st">{t.thBuy}</th><th className="th-st">{t.thSell}</th><th className="th-off">{t.thOfficial}</th><th>{t.thGap}</th><th>{t.th24h}</th></tr>
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
          {t.noticePre}<b>{t.noticeB}</b>{t.noticePost}
        </p>
      </section>

      <footer className="foot">
        <span>{t.footerCopy}</span>
        <span className="foot-upd">{t.footerUpd}</span>
      </footer>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500;600&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
.root,.root *{min-width:0}
.root img{max-width:100%}
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
  font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;
  min-height:100vh;padding-bottom:44px;overflow-x:hidden;width:100%;
}
.root[dir="rtl"]{direction:rtl;text-align:right}
.root[dir="rtl"] .gap,.root[dir="rtl"] .gap-track,.root[dir="rtl"] .mini,.root[dir="rtl"] .mini-track,
.root[dir="rtl"] .tlc,.root[dir="rtl"] .ticker-track,.root[dir="rtl"] .ticker-item,
.root[dir="rtl"] .conv-io,.root[dir="rtl"] .conv-out,.root[dir="rtl"] .td-cur,.root[dir="rtl"] .num{direction:ltr}
.root[dir="rtl"] .gap-legend,.root[dir="rtl"] .chart-legend,.root[dir="rtl"] .chart-x{direction:rtl}
.root[dir="rtl"] .head{flex-direction:row-reverse}
.root[dir="rtl"] .head-meta{align-items:flex-start}
.root[dir="rtl"] .hero p{margin-right:0}
.root[dir="rtl"] .tbl th,.root[dir="rtl"] .tbl td{text-align:right}
.root[dir="rtl"] .td-cur{justify-content:flex-end}
.root[dir="rtl"] .conv-copy{margin-right:0;margin-left:auto;order:0}
.root[dir="rtl"] .notice{flex-direction:row-reverse}
.root[dir="rtl"] .foot{flex-direction:row-reverse}
.root[data-theme="light"]{
  --bg:#F6F7FB;--bg2:#FFFFFF;--surface:#FFFFFF;--surface2:#F0F2F8;--line:#E1E5F0;
  --text:#161A2A;--dim:#5C6478;--mute:#8A92A6;
  --off:#3D6FD6;--off-deep:#2A52A8;
  --st:#C97D12;--st-deep:#9C6209;
  --up:#1B9E6B;--down:#D43A57;
  background:
    radial-gradient(1200px 560px at 84% -10%, rgba(201,125,18,.07), transparent 58%),
    radial-gradient(1000px 520px at 6% 2%, rgba(61,111,214,.08), transparent 56%),
    var(--bg);
}
.root[data-theme="light"] .ticker{background:rgba(255,255,255,.75)}
.root[data-theme="light"] .conv{box-shadow:0 20px 50px -20px rgba(40,50,90,.18)}
.root[data-theme="light"] .logo circle{stroke:rgba(255,255,255,.45)}
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
.logo{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;box-shadow:0 8px 24px -6px rgba(247,178,59,.4);flex-shrink:0}
.logo svg{display:block;border-radius:13px}
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
.theme-toggle{background:var(--surface);border:1px solid var(--line);color:var(--dim);width:23px;height:23px;border-radius:6px;cursor:pointer;font-size:12px;line-height:1;transition:.15s;display:grid;place-items:center}
.theme-toggle:hover{color:var(--st);border-color:var(--st)}
.lang-switch{display:flex;background:var(--surface);border:1px solid var(--line);border-radius:7px;padding:2px;gap:2px}
.lang-switch button{border:0;background:transparent;color:var(--dim);font-size:10px;font-weight:700;letter-spacing:.03em;padding:3px 6px;border-radius:5px;cursor:pointer;font-family:inherit;transition:.15s}
.lang-switch button:hover{color:var(--text)}
.lang-switch button.on{background:var(--off);color:#06101f}

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

/* Metal cards */
.metal-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.metal-card{background:linear-gradient(160deg,var(--surface2),var(--surface));border:1px solid var(--line);border-radius:17px;padding:18px}
.metal-card.skeleton{height:128px;animation:sk 1.4s ease-in-out infinite;border-style:dashed}
.metal-top{display:flex;align-items:center;gap:11px;margin-bottom:14px}
.metal-ico{font-size:24px;line-height:1}
.metal-rates{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;border-top:1px solid var(--line);padding-top:13px;flex-wrap:wrap}
.metal-main{display:flex;flex-direction:column}
.metal-big{font-size:24px;font-weight:700;color:var(--st)}
.metal-sub{display:flex;gap:18px}
.metal-sub .lbl{display:block;font-size:10px;color:var(--dim);margin-bottom:3px}
.metal-sub .val{font-size:13px;font-weight:600}

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
  .metal-cards{grid-template-columns:1fr}
  .hero-stats{grid-template-columns:repeat(2,1fr)}
  .table-wrap{overflow-x:auto}.tbl{min-width:560px}
  .head-meta{align-items:flex-start}
  .detail-grid{grid-template-columns:1fr}
  .detail-head{flex-wrap:wrap}
  .detail-now{text-align:left}
}
@media(max-width:480px){
  .root{overflow-x:hidden}
  .head{padding:16px 16px}
  .brand{gap:10px}
  .logo{width:38px;height:38px}
  .logo svg{width:38px;height:38px}
  .brand-name{font-size:17px}
  .hero{padding:20px 16px 6px;gap:22px}
  .hero p{max-width:none}
  .hero-gap-card{padding:16px}
  .hero-stats{gap:8px}
  .stat{padding:11px 12px}
  .stat-val{font-size:17px}
  .section{padding:0 16px;margin-top:26px}
  .srcbar{padding:0 16px}
  .foot{padding:20px 16px}
  .conv{padding:16px;border-radius:18px}
  .conv-amount{font-size:20px}
  .conv-num{font-size:24px}
  .conv-chips{flex-wrap:wrap}
  .conv-chips button{flex:1 1 calc(50% - 4px)}
  .detail{padding:18px}
  .detail-head{gap:10px}
  .detail-head h3{font-size:19px}
  .detail-now-num{font-size:22px}
  .card-rates{grid-template-columns:repeat(3,1fr);gap:4px}
  .notice{padding:14px}
  .gap-badge{font-size:11px;padding:2px 7px}
}
@media(max-width:380px){
  .brand-sub{display:none}
  .ticker-item{font-size:12px}
}
@media(prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  .conv-swap:hover{transform:none}
}
`;
