import { useState, useRef, useCallback } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const HOURLY_RATE      = 75;
const IRS_MILEAGE      = 0.67;
const FUEL_PER_MILE    = 0.12;
const PLATFORMS        = ["UberEats", "DoorDash", "Both"];

// ── Verdict system ─────────────────────────────────────────────────────────
const verdict = (score) => {
  if (score >= 80) return { label: "Worth It",     color: "#5FB88A", bg: "#5FB88A14" };
  if (score >= 60) return { label: "Decent",       color: "#D4A843", bg: "#D4A84314" };
  if (score >= 40) return { label: "Marginal",     color: "#C9A84C", bg: "#C9A84C14" };
  return              { label: "Not Worth It", color: "#C0614A", bg: "#C0614A14" };
};

// ── Helpers ────────────────────────────────────────────────────────────────
const parseTime = (str) => {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};

const toHM = (mins) => {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const fmt$ = (n) => `$${Math.abs(n).toFixed(2)}`;

const calcShift = (shift) => {
  const start = parseTime(shift.timeOut);
  const end   = parseTime(shift.timeHome);
  if (!start || !end) return null;

  let durationMins = end - start;
  if (durationMins < 0) durationMins += 1440;
  const durationHours = durationMins / 60;

  const miles    = parseFloat(shift.miles)         || 0;
  const earnings = parseFloat(shift.totalEarnings) || 0;
  const tip      = parseFloat(shift.tip)           || 0;
  const trips    = parseInt(shift.trips)           || 0;

  const fuelCost         = miles * FUEL_PER_MILE;
  const mileageDeduction = miles * IRS_MILEAGE;
  const netEarnings      = earnings - fuelCost;
  const opportunityCost  = durationHours * HOURLY_RATE;
  const effectiveHourly  = durationHours > 0 ? netEarnings / durationHours : 0;
  const earningsPerTrip  = trips > 0 ? earnings / trips : 0;
  const tipRate          = earnings > 0 ? (tip / earnings) * 100 : 0;
  const tripsPerHour     = durationHours > 0 ? trips / durationHours : 0;

  const hourlyScore = Math.min((effectiveHourly / HOURLY_RATE) * 100, 100);
  const tipScore    = Math.min(tipRate * 1.5, 100);
  const tripScore   = Math.min(tripsPerHour * 33, 100);
  const netScore    = earnings > 0 ? Math.min((netEarnings / earnings) * 150, 100) : 0;
  const score       = Math.round(hourlyScore * 0.5 + tipScore * 0.2 + tripScore * 0.15 + netScore * 0.15);

  return {
    durationMins, durationHours, miles, earnings, tip, trips,
    fuelCost, mileageDeduction, netEarnings, opportunityCost,
    effectiveHourly, earningsPerTrip, tipRate, tripsPerHour, score,
  };
};

// ── Sub-components ─────────────────────────────────────────────────────────

function ScoreArc({ score, size = 140 }) {
  const v   = verdict(score);
  const cx  = size / 2;
  const r   = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  // Arc spans 240° (from 150° to 390° / 30°), starting bottom-left
  const arcLen  = (circ * 240) / 360;
  const filled  = (score / 100) * arcLen;
  const rot     = 150; // start angle

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rot}deg)` }}>
        {/* Track */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke="#1E1E1E" strokeWidth={8}
          strokeDasharray={`${arcLen} ${circ - arcLen}`}
          strokeLinecap="round" />
        {/* Fill */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke={v.color} strokeWidth={8}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2,
      }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: size * 0.22, color: v.color, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          score
        </span>
      </div>
    </div>
  );
}

function VerdictBadge({ score, large }) {
  const v = verdict(score);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: v.bg, color: v.color,
      border: `1px solid ${v.color}44`,
      borderRadius: 99,
      padding: large ? "5px 14px" : "3px 10px",
      fontSize: large ? 13 : 11,
      fontWeight: 700,
      letterSpacing: "0.03em",
    }}>
      {v.label}
    </span>
  );
}

function PlatformBadge({ platform }) {
  const isUber = platform === "UberEats";
  const isBoth = platform === "Both";
  const color  = isBoth ? "#C9A84C" : isUber ? "#00C47C" : "#FF6720";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
      color, background: color + "18",
      border: `1px solid ${color}33`,
      padding: "2px 9px", borderRadius: 99,
    }}>
      {platform}
    </span>
  );
}

function Row({ label, value, valueColor, sub, topBorder }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "11px 0",
      borderTop: topBorder ? "1px solid var(--border)" : "none",
      borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ fontSize: 14, color: "var(--text-2)", paddingRight: 12 }}>{label}</span>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: valueColor || "var(--text-1)" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "20px 18px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--text-3)",
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function ShiftCard({ shift, idx, onDelete }) {
  const c = calcShift(shift);
  if (!c) return null;
  const v = verdict(c.score);

  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid var(--border)`,
      borderLeft: `3px solid ${v.color}`,
      borderRadius: "var(--radius-md)",
      padding: "18px 16px",
      marginBottom: 10,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <PlatformBadge platform={shift.platform} />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>{shift.date}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            {shift.timeOut} – {shift.timeHome} &nbsp;·&nbsp; {toHM(c.durationMins)} &nbsp;·&nbsp; {c.miles} mi
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--text-1)", lineHeight: 1 }}>
              {fmt$(c.earnings)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
              {fmt$(c.effectiveHourly)}/hr net
            </div>
          </div>
          <button
            onClick={() => onDelete(idx)}
            style={{
              background: "none", color: "var(--text-3)", fontSize: 20,
              padding: "0 2px", lineHeight: 1, marginTop: 2,
            }}
          >×</button>
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
        {[
          { l: "Trips", v: c.trips },
          { l: "Tip %", v: `${c.tipRate.toFixed(0)}%` },
          { l: "Fuel", v: `-${fmt$(c.fuelCost)}` },
          { l: "Deduct.", v: fmt$(c.mileageDeduction) },
        ].map((s) => (
          <div key={s.l} style={{
            background: "var(--surface-2)", borderRadius: 8,
            padding: "7px 8px", textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>Shift Score</span>
        <VerdictBadge score={c.score} />
      </div>
      <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          width: `${c.score}%`, height: "100%",
          background: `linear-gradient(90deg, ${v.color}88, ${v.color})`,
          borderRadius: 99,
          transition: "width 0.9s ease",
        }} />
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [shifts, setShifts] = useState([
    {
      platform: "UberEats", date: "2026-06-22",
      timeOut: "11:00", timeHome: "13:01",
      miles: "18", trips: "3",
      netFare: "14.84", tip: "18.86", totalEarnings: "33.70",
    },
  ]);

  const [form, setForm] = useState({
    platform: "UberEats",
    date: new Date().toISOString().slice(0, 10),
    timeOut: "11:00", timeHome: "13:00",
    miles: "", trips: "", netFare: "", tip: "", totalEarnings: "",
  });

  const [tab, setTab]             = useState("log");
  const [result, setResult]       = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview]     = useState(null);
  const [imgB64, setImgB64]       = useState(null);
  const [toast, setToast]         = useState(null);
  const fileRef = useRef();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgB64(e.target.result.split(",")[1]);
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const analyzeScreenshot = async () => {
    if (!imgB64) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgB64 } },
              { type: "text", text: `Extract delivery earnings data from this screenshot. Return ONLY valid JSON, no markdown:
{"platform":"UberEats"|"DoorDash"|"Both","trips":number|null,"netFare":number|null,"tip":number|null,"totalEarnings":number|null}
Use null for any field not visible.` },
            ],
          }],
        }),
      });
      const data   = await res.json();
      const text   = data.content?.find((b) => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed);
      setForm((f) => ({
        ...f,
        platform:      parsed.platform                          || f.platform,
        trips:         parsed.trips     != null ? String(parsed.trips)         : f.trips,
        netFare:       parsed.netFare   != null ? String(parsed.netFare)       : f.netFare,
        tip:           parsed.tip       != null ? String(parsed.tip)           : f.tip,
        totalEarnings: parsed.totalEarnings != null ? String(parsed.totalEarnings) : f.totalEarnings,
      }));
      showToast("Screenshot read — fields filled in below");
    } catch {
      setResult({ error: true });
      showToast("Couldn't read screenshot — fill in manually");
    }
    setAnalyzing(false);
  };

  const saveShift = () => {
    if (!form.totalEarnings || !form.timeOut || !form.timeHome) return;
    setShifts((s) => [{ ...form }, ...s]);
    setForm((f) => ({ ...f, miles: "", trips: "", netFare: "", tip: "", totalEarnings: "" }));
    setPreview(null); setImgB64(null); setResult(null);
    setTab("history");
    showToast("Shift saved");
  };

  const deleteShift = (idx) => {
    setShifts((s) => s.filter((_, i) => i !== idx));
    showToast("Shift removed");
  };

  // Aggregates
  const allCalc        = shifts.map((s) => ({ s, c: calcShift(s) })).filter((x) => x.c);
  const totalEarnings  = allCalc.reduce((a, x) => a + x.c.earnings,         0);
  const totalNet       = allCalc.reduce((a, x) => a + x.c.netEarnings,      0);
  const totalMiles     = allCalc.reduce((a, x) => a + x.c.miles,            0);
  const totalTrips     = allCalc.reduce((a, x) => a + x.c.trips,            0);
  const totalHours     = allCalc.reduce((a, x) => a + x.c.durationHours,    0);
  const totalFuel      = allCalc.reduce((a, x) => a + x.c.fuelCost,         0);
  const totalDeduction = allCalc.reduce((a, x) => a + x.c.mileageDeduction, 0);
  const avgHourly      = totalHours > 0 ? totalNet / totalHours : 0;
  const avgScore       = allCalc.length > 0
    ? Math.round(allCalc.reduce((a, x) => a + x.c.score, 0) / allCalc.length) : 0;

  const canSave = form.totalEarnings && form.timeOut && form.timeHome;
  const liveCalc = calcShift(form);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", paddingBottom: 48 }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        padding: "32px 20px 0",
        background: "linear-gradient(180deg, #111111 0%, #0A0A0A 100%)",
        borderBottom: "1px solid var(--border)",
      }}>
        {/* Brand */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "var(--text-1)",
              lineHeight: 1,
            }}>
              WorthIt
            </h1>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              color: "var(--gold)",
              lineHeight: 1,
            }}>?</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, letterSpacing: "0.02em" }}>
            Your time is worth ${HOURLY_RATE}/hr · IRS deduction ${IRS_MILEAGE}/mi
          </p>
        </div>

        {/* Summary strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 20,
        }}>
          {[
            { l: "Earned",     v: fmt$(totalEarnings),  c: "var(--text-1)" },
            { l: "Net",        v: fmt$(totalNet),        c: "var(--green)"  },
            { l: "Avg /hr",    v: fmt$(avgHourly),       c: avgHourly >= 20 ? "var(--green)" : "var(--red)" },
            { l: "Tax Deduc.", v: fmt$(totalDeduction),  c: "var(--gold)"   },
          ].map((p) => (
            <div key={p.l} style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 8px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4, letterSpacing: "0.06em" }}>
                {p.l}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: p.c, letterSpacing: "-0.01em" }}>
                {p.v}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {[["log", "Log Shift"], ["history", `History (${shifts.length})`], ["insights", "Insights"]].map(([id, lbl]) => (
            <button key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, padding: "11px 0",
                background: "none", border: "none",
                borderBottom: `2px solid ${tab === id ? "var(--gold)" : "transparent"}`,
                color: tab === id ? "var(--text-1)" : "var(--text-3)",
                fontWeight: tab === id ? 600 : 400,
                fontSize: 13,
                transition: "all 0.2s",
                letterSpacing: "0.01em",
              }}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div style={{ padding: "22px 20px" }}>

        {/* ══ LOG TAB ══ */}
        {tab === "log" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Screenshot upload */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              style={{
                border: `1.5px dashed ${preview ? "var(--gold)" : "var(--border-2)"}`,
                borderRadius: "var(--radius-md)",
                padding: preview ? "14px" : "28px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: preview ? "var(--surface)" : "transparent",
                transition: "all 0.2s",
              }}
            >
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])} />
              {preview ? (
                <div>
                  <img src={preview} alt="Earnings screenshot"
                    style={{ maxHeight: 160, borderRadius: 8, marginBottom: 8, opacity: 0.9 }} />
                  <div style={{ fontSize: 12, color: "var(--gold)" }}>Tap to change screenshot</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                  <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 3 }}>
                    Upload earnings screenshot
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    UberEats or DoorDash — AI reads it for you
                  </div>
                </>
              )}
            </div>

            {preview && (
              <button
                onClick={analyzeScreenshot}
                disabled={analyzing}
                style={{
                  background: analyzing ? "var(--surface-2)" : "var(--gold)",
                  color: analyzing ? "var(--text-3)" : "#0A0A0A",
                  borderRadius: "var(--radius-sm)", padding: "14px",
                  fontWeight: 700, fontSize: 14,
                  transition: "all 0.2s",
                }}
              >
                {analyzing ? "Reading screenshot…" : "Auto-Fill from Screenshot"}
              </button>
            )}

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em" }}>OR ENTER MANUALLY</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {/* Platform + Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="label">Platform</label>
                <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>

            {/* Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="label">Left Home</label>
                <input type="time" value={form.timeOut}
                  onChange={(e) => setForm((f) => ({ ...f, timeOut: e.target.value }))} />
              </div>
              <div>
                <label className="label">Got Home</label>
                <input type="time" value={form.timeHome}
                  onChange={(e) => setForm((f) => ({ ...f, timeHome: e.target.value }))} />
              </div>
            </div>

            {/* Miles + Trips */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="label">Miles Driven</label>
                <input type="number" placeholder="0.0" step="0.1" inputMode="decimal"
                  value={form.miles} onChange={(e) => setForm((f) => ({ ...f, miles: e.target.value }))} />
              </div>
              <div>
                <label className="label">Trips</label>
                <input type="number" placeholder="0" inputMode="numeric"
                  value={form.trips} onChange={(e) => setForm((f) => ({ ...f, trips: e.target.value }))} />
              </div>
            </div>

            {/* Earnings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="label">Net Fare</label>
                <input type="number" placeholder="0.00" step="0.01" inputMode="decimal"
                  value={form.netFare} onChange={(e) => setForm((f) => ({ ...f, netFare: e.target.value }))} />
              </div>
              <div>
                <label className="label">Tips</label>
                <input type="number" placeholder="0.00" step="0.01" inputMode="decimal"
                  value={form.tip} onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Total Earnings</label>
              <input
                type="number" placeholder="0.00" step="0.01" inputMode="decimal"
                value={form.totalEarnings}
                onChange={(e) => setForm((f) => ({ ...f, totalEarnings: e.target.value }))}
                style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)" }}
              />
            </div>

            {/* Live verdict preview */}
            {canSave && liveCalc && (() => {
              const v = verdict(liveCalc.score);
              return (
                <Card style={{ border: `1px solid ${v.color}33`, background: v.bg }}>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
                    <ScoreArc score={liveCalc.score} size={120} />
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 8 }}>
                        <VerdictBadge score={liveCalc.score} large />
                      </div>
                      <div style={{
                        fontFamily: "var(--font-display)", fontSize: 28,
                        color: "var(--text-1)", lineHeight: 1, marginBottom: 2,
                      }}>
                        {fmt$(liveCalc.netEarnings)}
                        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-3)", fontFamily: "var(--font-body)", marginLeft: 4 }}>
                          net
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                        {fmt$(liveCalc.effectiveHourly)}/hr effective
                      </div>
                    </div>
                  </div>
                  <Row label="Duration"         value={toHM(liveCalc.durationMins)} />
                  <Row label="Gross earnings"   value={fmt$(liveCalc.earnings)} />
                  <Row label="Fuel cost"        value={`−${fmt$(liveCalc.fuelCost)}`} valueColor="var(--red)" />
                  <Row label="Net take-home"    value={fmt$(liveCalc.netEarnings)} valueColor="var(--green)" />
                  <Row label="IRS deduction"    value={fmt$(liveCalc.mileageDeduction)} valueColor="var(--gold)"
                    sub="reduces taxable income" />
                  <Row label="Opportunity cost" value={`−${fmt$(liveCalc.opportunityCost)}`} valueColor="var(--text-3)"
                    sub={`${toHM(liveCalc.durationMins)} @ $${HOURLY_RATE}/hr`} />
                  <div style={{
                    marginTop: 14, padding: "12px 14px",
                    background: "var(--surface)", borderRadius: "var(--radius-sm)",
                    fontSize: 13, color: "var(--text-2)", lineHeight: 1.65,
                    borderLeft: `3px solid ${v.color}`,
                  }}>
                    {liveCalc.effectiveHourly >= HOURLY_RATE
                      ? "You beat your full-time rate. This almost never happens — bank it."
                      : liveCalc.effectiveHourly >= 25
                      ? `${fmt$(liveCalc.effectiveHourly)}/hr is solid side-hustle income for off-hours. Keep going.`
                      : `At ${fmt$(liveCalc.effectiveHourly)}/hr, this shift cost you more in opportunity than you earned. Shorter or skip.`}
                  </div>
                </Card>
              );
            })()}

            <button
              onClick={saveShift}
              disabled={!canSave}
              style={{
                background: canSave ? "var(--gold)" : "var(--surface-2)",
                color: canSave ? "#0A0A0A" : "var(--text-3)",
                borderRadius: "var(--radius-md)", padding: "16px",
                fontWeight: 700, fontSize: 15,
                transition: "all 0.2s",
                marginTop: 4,
              }}
            >
              Save Shift
            </button>
          </div>
        )}

        {/* ══ HISTORY TAB ══ */}
        {tab === "history" && (
          <div>
            {shifts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 0", color: "var(--text-3)", fontSize: 14 }}>
                No shifts yet.<br />
                <span style={{ color: "var(--gold)" }}>Log your first shift</span> to see it here.
              </div>
            ) : (
              shifts.map((s, i) => <ShiftCard key={i} shift={s} idx={i} onDelete={deleteShift} />)
            )}
          </div>
        )}

        {/* ══ INSIGHTS TAB ══ */}
        {tab === "insights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {allCalc.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 0", color: "var(--text-3)", fontSize: 14 }}>
                Log at least one shift to see insights.
              </div>
            ) : (
              <>
                {/* Overall score card */}
                <Card>
                  <SectionLabel>Overall Performance</SectionLabel>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
                    <ScoreArc score={avgScore} size={120} />
                    <div style={{ flex: 1 }}>
                      <VerdictBadge score={avgScore} large />
                      <div style={{ marginTop: 10 }}>
                        <Row label="Shifts logged"  value={shifts.length} />
                        <Row label="Total on road"  value={toHM(Math.round(totalHours * 60))} />
                        <Row label="Total miles"    value={`${totalMiles.toFixed(1)} mi`} />
                        <Row label="Total trips"    value={totalTrips} />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Financial summary */}
                <Card>
                  <SectionLabel>Financial Breakdown</SectionLabel>
                  <Row label="Gross earnings"    value={fmt$(totalEarnings)} />
                  <Row label="Fuel costs"        value={`−${fmt$(totalFuel)}`} valueColor="var(--red)" />
                  <Row label="Net take-home"     value={fmt$(totalNet)} valueColor="var(--green)" />
                  <Row label="IRS mileage deduction" value={fmt$(totalDeduction)} valueColor="var(--gold)"
                    sub="off your taxable income" />
                  <Row label="Average $/hr (net)" value={fmt$(avgHourly)}
                    valueColor={avgHourly >= 20 ? "var(--green)" : "var(--red)"}
                    sub={`Your day job rate: $${HOURLY_RATE}/hr`} />
                  <Row label="Average per trip"  value={fmt$(totalEarnings / Math.max(totalTrips, 1))} />

                  {/* Time value callout */}
                  <div style={{
                    marginTop: 14, padding: "14px",
                    background: "var(--surface-2)", borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--gold)",
                  }}>
                    <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>
                      TIME VALUE ANALYSIS
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                      {toHM(Math.round(totalHours * 60))} on the road, worth{" "}
                      <strong style={{ color: "var(--text-1)" }}>{fmt$(totalHours * HOURLY_RATE)}</strong> at your day rate.
                      You netted <strong style={{ color: "var(--green)" }}>{fmt$(totalNet)}</strong> —{" "}
                      <strong style={{ color: avgHourly / HOURLY_RATE >= 0.33 ? "var(--yellow)" : "var(--red)" }}>
                        {((avgHourly / HOURLY_RATE) * 100).toFixed(0)}%
                      </strong> of that value.<br /><br />
                      {avgHourly >= 25
                        ? "These are off-hours you'd otherwise not bill. The side income makes sense."
                        : "Prioritize weekend nights and rain — tip rates spike, trips run closer together."}
                    </div>
                  </div>
                </Card>

                {/* Shift scorecard */}
                <Card>
                  <SectionLabel>Shift Scores</SectionLabel>
                  {allCalc.map(({ s, c }, i) => {
                    const v = verdict(c.score);
                    return (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div>
                            <span style={{ fontSize: 13, color: "var(--text-2)", marginRight: 8 }}>{s.date}</span>
                            <PlatformBadge platform={s.platform} />
                          </div>
                          <VerdictBadge score={c.score} />
                        </div>
                        <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{
                            width: `${c.score}%`, height: "100%",
                            background: `linear-gradient(90deg, ${v.color}77, ${v.color})`,
                            borderRadius: 99,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </Card>

                {/* Strategy tips */}
                <Card style={{ border: "1px solid var(--gold-mid)" }}>
                  <SectionLabel>Optimize Your Shifts</SectionLabel>
                  {[
                    "Lunch (11am–1pm) and late-night (9–11pm) are peak windows — you're already timing it right.",
                    `Target ${fmt$(HOURLY_RATE * 0.33)}+ gross per hour to make the time trade-off worthwhile.`,
                    "Tip rates spike on weekends and in bad weather. Those are your high-value windows.",
                    `Every mile is a $${IRS_MILEAGE} tax deduction. Log every shift precisely.`,
                    "Shifts under $20/hr gross are a signal to wrap early — dead time kills your average.",
                  ].map((tip, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 12, paddingBottom: 12,
                      marginBottom: i < 4 ? 12 : 0,
                      borderBottom: i < 4 ? "1px solid var(--border)" : "none",
                    }}>
                      <span style={{ color: "var(--gold)", fontSize: 13, marginTop: 1, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{tip}</span>
                    </div>
                  ))}
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28 + 16, left: "50%", transform: "translateX(-50%)",
          background: "var(--surface)", border: "1px solid var(--border-2)",
          borderRadius: 99, padding: "10px 20px",
          fontSize: 13, color: "var(--text-1)",
          boxShadow: "0 8px 32px #00000088",
          whiteSpace: "nowrap",
          animation: "fadeUp 0.2s ease",
          zIndex: 999,
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
        }
      `}</style>
    </div>
  );
}
