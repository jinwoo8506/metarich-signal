"use client"

import React, { useState, useEffect, useRef } from "react"

/* ─── 색상 토큰 ─────────────────────────────────────────────── */
const C = {
  gold: "#C9A84C",
  goldLight: "#FDF5E0",
  navy: "#0F1E35",
  navyMid: "#1A3052",
  blue: "#1E5FA8",
  blueLight: "#EBF3FB",
  teal: "#0E7E6B",
  tealLight: "#E3F5F1",
  rose: "#C0392B",
  roseLight: "#FDEDED",
  slate: "#4A5568",
  slateLight: "#F7F8FA",
  border: "#E2E8F0",
  text: "#1A202C",
  muted: "#718096",
};

/* ─── 포맷 유틸 ─────────────────────────────────────────────── */
const fmt = (n: number) => Math.floor(n).toLocaleString("ko-KR");
const fmtM = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e8) return (Math.floor(n / 1e8)).toLocaleString("ko-KR") + "억";
  if (abs >= 1e4) return (Math.floor(n / 1e4)).toLocaleString("ko-KR") + "만";
  return fmt(n);
};

/* ─── 공통 섹션 제목 ─────────────────────────────────────────── */
function SectionTitle({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 3, height: 20, background: C.gold, borderRadius: 2 }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: "-0.3px" }}>{label}</span>
      </div>
      {sub && <p style={{ fontSize: 13, color: C.muted, marginTop: 5, marginLeft: 13 }}>{sub}</p>}
    </div>
  );
}

/* ─── 입력 박스 ─────────────────────────────────────────────── */
function InputRow({
  label, val, onChange, unit, min, max, step, hint,
}: {
  label: string; val: number; onChange: (v: number) => void;
  unit?: string; min?: number; max?: number; step?: number; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.slate, marginBottom: 6, letterSpacing: "0px" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 14px", height: 46, transition: "border-color 0.15s" }}>
        <input
          type="number"
          value={val}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, border: "none", outline: "none", fontSize: 16, fontWeight: 700, color: C.text, background: "transparent", minWidth: 0 }}
        />
        {unit && <span style={{ fontSize: 13, color: C.muted, whiteSpace: "nowrap", fontWeight: 600 }}>{unit}</span>}
      </div>
      {hint && <p style={{ fontSize: 12, color: C.blue, marginTop: 4, fontWeight: 600 }}>{hint}</p>}
    </div>
  );
}

/* ─── KPI 카드 ──────────────────────────────────────────────── */
function KPICard({ label, value, unit = "원", accent = C.blue, sub }: {
  label: string; value: number; unit?: string; accent?: string; sub?: string;
}) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", borderTop: `3px solid ${accent}` }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
        {fmt(value)}<span style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginLeft: 3 }}>{unit}</span>
      </p>
      {sub && <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

/* ─── 게이지 바 ─────────────────────────────────────────────── */
function GaugeBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
    </div>
  );
}

/* ─── 계산 버튼 ─────────────────────────────────────────────── */
function CalcBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", height: 46, background: C.navy, color: C.gold, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, letterSpacing: "0.3px", cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.navyMid; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = C.navy; }}
    >
      {label}
    </button>
  );
}

/* ─── 빈 결과 ───────────────────────────────────────────────── */
function Empty({ text }: { text: string }) {
  return (
    <div style={{ flex: 1, border: `2px dashed ${C.border}`, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.slateLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={C.border} strokeWidth="1.5"/><path d="M9 6v4M9 12h.01" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
      <p style={{ fontSize: 13, color: C.muted, textAlign: "center", maxWidth: 220 }}>{text}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════════════════════════════ */
export default function FinancialCalc() {
  const [tab, setTab] = useState("pension");
  const TABS = [
    { id: "pension", label: "은퇴자금/연금" },
    { id: "compare", label: "보험 vs 은행" },
    { id: "inflation", label: "화폐가치 하락" },
    { id: "compound", label: "복리 마법" },
    { id: "variable", label: "코스트 애버리지" },
  ];

  return (
    <div style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", background: "#F5F7FA", minHeight: "100vh", padding: "28px 16px" }}>
      {/* 헤더 */}
      <div style={{ maxWidth: 920, margin: "0 auto 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 4, height: 26, background: C.gold, borderRadius: 2 }} />
          <h1 style={{ fontSize: 21, fontWeight: 800, color: C.navy, letterSpacing: "-0.5px", margin: 0 }}>금융 분석 도구</h1>
          <span style={{ fontSize: 10, color: "#fff", background: C.blue, borderRadius: 5, padding: "2px 8px", fontWeight: 700, letterSpacing: "0.5px" }}>PROFESSIONAL</span>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginLeft: 16 }}>전문가 수준의 재무 시뮬레이션 · 비교 분석 시스템</p>
      </div>

      {/* 탭 */}
      <div style={{ maxWidth: 920, margin: "0 auto 18px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 5, display: "flex", gap: 3 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ flex: 1, height: 36, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? C.navy : "transparent", color: tab === t.id ? C.gold : C.muted, transition: "all 0.18s" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div style={{ maxWidth: 920, margin: "0 auto", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 26, boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
        {tab === "pension"   && <PensionCalc />}
        {tab === "compare"   && <CompareCalc />}
        {tab === "inflation" && <InflationCalc />}
        {tab === "compound"  && <CompoundCalc />}
        {tab === "variable"  && <VariableCalc />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   1. 은퇴자금 / 통합 연금
══════════════════════════════════════════════════════════════ */
function PensionCalc() {
  const [inp, setInp] = useState({ age: 35, workYears: 20, salary: 4000000, retireAge: 65, life: 90, target: 3000000 });
  const [est, setEst] = useState({ national: 0, company: 0 });
  const [res, setRes] = useState<any>(null);

  useEffect(() => {
    const national = inp.salary * inp.workYears * 0.01;
    const months = Math.max((inp.life - inp.retireAge) * 12, 1);
    setEst({ national, company: (inp.salary * inp.workYears) / months });
  }, [inp.salary, inp.workYears, inp.retireAge, inp.life]);

  const calc = () => {
    const monthly = est.national + est.company;
    const months = Math.max((inp.life - inp.retireAge) * 12, 1);
    const totalNeed = inp.target * months;
    const totalHave = monthly * months;
    const gap = Math.max(totalNeed - totalHave, 0);
    const toRetire = Math.max((inp.retireAge - inp.age) * 12, 1);
    setRes({ monthly, totalNeed, totalHave, gap, monthly_req: gap / toRetire, years: inp.life - inp.retireAge });
  };

  const readiness = res ? Math.min(Math.round((res.totalHave / res.totalNeed) * 100), 100) : 0;
  const rColor = readiness >= 80 ? C.teal : readiness >= 50 ? C.gold : C.rose;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "290px 1fr", gap: 28 }}>
      {/* 입력 패널 */}
      <div>
        <SectionTitle label="소득 · 근속 정보" sub="국민연금·퇴직금 추정에 사용됩니다" />
        <InputRow label="현재 나이" val={inp.age} onChange={(v) => setInp({ ...inp, age: v })} unit="세" />
        <InputRow label="총 근속 예상" val={inp.workYears} onChange={(v) => setInp({ ...inp, workYears: v })} unit="년" />
        <InputRow label="평균 월급여" val={inp.salary} onChange={(v) => setInp({ ...inp, salary: v })} unit="원" hint={fmt(inp.salary) + "원"} />

        <div style={{ background: C.tealLight, borderRadius: 10, padding: "12px 14px", margin: "14px 0 18px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.teal, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>자동 산출 — 예상 월 연금</p>
          {[["국민연금 (추정)", est.national], ["퇴직연금 DB형", est.company]].map(([l, v]) => (
            <div key={l as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.text, marginBottom: 3 }}>
              <span>{l}</span><strong>{fmt(v as number)}원</strong>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.teal}30`, paddingTop: 7, marginTop: 5, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>월 합계</span>
            <strong style={{ fontSize: 14, color: C.teal }}>{fmt(est.national + est.company)}원</strong>
          </div>
        </div>

        <SectionTitle label="은퇴 목표 설정" />
        <InputRow label="은퇴 나이" val={inp.retireAge} onChange={(v) => setInp({ ...inp, retireAge: v })} unit="세" />
        <InputRow label="기대 수명" val={inp.life} onChange={(v) => setInp({ ...inp, life: v })} unit="세" />
        <InputRow label="희망 월 생활비" val={inp.target} onChange={(v) => setInp({ ...inp, target: v })} unit="원" hint={fmt(inp.target) + "원"} />
        <div style={{ marginTop: 14 }}><CalcBtn label="부족 자금 분석" onClick={calc} /></div>
      </div>

      {/* 결과 패널 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {res ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <KPICard label="예상 월 수령액" value={res.monthly} accent={C.teal} sub="국민 + 퇴직연금 합산" />
              <KPICard label="총 필요 자금" value={res.totalNeed} accent={C.blue} sub={`${res.years}년 생활비 총액`} />
            </div>

            <div style={{ background: C.slateLight, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>연금 준비율</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: rColor }}>{readiness}%</p>
              </div>
              <GaugeBar pct={readiness} color={rColor} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: C.muted }}>준비 {fmtM(res.totalHave)}원</span>
                <span style={{ fontSize: 11, color: C.muted }}>목표 {fmtM(res.totalNeed)}원</span>
              </div>
            </div>

            <div style={{ background: res.gap > 0 ? C.roseLight : C.tealLight, border: `1px solid ${res.gap > 0 ? C.rose : C.teal}25`, borderRadius: 14, padding: "20px 22px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: res.gap > 0 ? C.rose : C.teal, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>최종 분석 결과</p>
              {res.gap > 0 ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: C.slate }}>총 부족 자금</span>
                    <span style={{ fontSize: 28, fontWeight: 800, color: C.rose, letterSpacing: "-0.5px" }}>{fmtM(res.gap)}원</span>
                  </div>
                  <div style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 3, height: 36, background: C.rose, borderRadius: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>목표 달성을 위한 월 추가 저축</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: C.rose }}>{fmt(res.monthly_req)}원/월</p>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 15, fontWeight: 700, color: C.teal }}>현재 연금으로 은퇴 목표를 충족할 수 있습니다 ✓</p>
              )}
              <p style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.6 }}>
                ※ 퇴직연금(DB형): 퇴직금 일시금(월급 × 근속연수)을 생존 기간으로 나눈 월 환산액 기준
              </p>
            </div>
          </>
        ) : (
          <Empty text="좌측에서 정보를 입력하고 분석 버튼을 눌러 주세요" />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. 보험 vs 은행 비교
══════════════════════════════════════════════════════════════ */
function CompareCalc() {
  const [inp, setInp] = useState({ monthly: 500000, payY: 5, rateS: 3.5, rateI: 124 });
  const [res, setRes] = useState<any>(null);

  const calc = () => {
    const n = inp.payY * 12;
    const r = inp.rateS / 100 / 12;
    const fv = inp.monthly * ((Math.pow(1 + r, n) - 1) / r);
    const interest = fv - inp.monthly * n;
    const bank = inp.monthly * n + Math.floor(interest * (1 - 0.154));
    const insu = Math.floor(inp.monthly * n * (inp.rateI / 100));
    setRes({ bank, insu, principal: inp.monthly * n, diff: insu - bank });
  };

  const maxV = res ? Math.max(res.bank, res.insu, 1) : 1;

  return (
    <div>
      <SectionTitle label="보험 vs 은행 적금 비교" sub="동일한 납입 조건에서 만기 수령액을 비교합니다" />

      {/* 입력 영역: 2행으로 분리 */}
      <div style={{ background: C.slateLight, borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <InputRow label="월 납입액" val={inp.monthly} onChange={(v) => setInp({ ...inp, monthly: v })} unit="원" hint={fmt(inp.monthly) + "원"} />
          <InputRow label="납입 기간" val={inp.payY} onChange={(v) => setInp({ ...inp, payY: v })} unit="년" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <InputRow label="은행 적금 이율 (연)" val={inp.rateS} onChange={(v) => setInp({ ...inp, rateS: v })} unit="%" step={0.1} />
          <InputRow label="보험 환급률" val={inp.rateI} onChange={(v) => setInp({ ...inp, rateI: v })} unit="%" />
        </div>
        <CalcBtn label="결과 비교하기" onClick={calc} />
      </div>

      {res ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.blue }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: C.slate }}>은행 적금 (세후)</p>
            </div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 5 }}>세후 수령액</p>
            <p style={{ fontSize: 30, fontWeight: 800, color: C.text, marginBottom: 14, letterSpacing: "-0.5px" }}>{fmt(res.bank)}원</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>원금 {fmt(res.principal)}원 + 세후 이자 (이자소득세 15.4%)</p>
            <GaugeBar pct={(res.bank / maxV) * 100} color={C.blue} />
          </div>

          <div style={{ background: C.navy, border: "none", borderRadius: 14, padding: "24px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.gold }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: C.gold }}>비과세 보험</p>
            </div>
            <p style={{ fontSize: 13, color: `${C.gold}80`, marginBottom: 5 }}>비과세 수령액</p>
            <p style={{ fontSize: 30, fontWeight: 800, color: C.gold, marginBottom: 14, letterSpacing: "-0.5px" }}>{fmt(res.insu)}원</p>
            <p style={{ fontSize: 13, color: `${C.gold}70`, marginBottom: 8 }}>원금 {fmt(res.principal)}원 × 환급률 {inp.rateI}%</p>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(res.insu / maxV) * 100}%`, background: C.gold, borderRadius: 4, transition: "width 0.6s" }} />
            </div>
          </div>

          <div style={{ gridColumn: "1/-1", background: res.diff >= 0 ? C.tealLight : C.roseLight, border: `1px solid ${res.diff >= 0 ? C.teal : C.rose}25`, borderRadius: 12, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.slate }}>
              {res.diff >= 0 ? "보험이 은행 대비 더 유리합니다" : "보험이 은행 대비 더 적습니다"}
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: res.diff >= 0 ? C.teal : C.rose }}>
              {res.diff >= 0 ? "+" : "-"}{fmt(Math.abs(res.diff))}원
            </p>
          </div>
        </div>
      ) : (
        <Empty text="위 항목을 입력하고 결과 비교하기 버튼을 눌러 주세요" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. 화폐가치 하락
══════════════════════════════════════════════════════════════ */
function InflationCalc() {
  const [inp, setInp] = useState({ amt: 100000000, yrs: 20, inf: 3.0 });
  const [res, setRes] = useState<number | null>(null);

  const calc = () => setRes(Math.floor(inp.amt / Math.pow(1 + inp.inf / 100, inp.yrs)));
  const loss = res !== null ? Math.round(((inp.amt - res) / inp.amt) * 100) : 0;

  return (
    <div>
      <SectionTitle label="화폐 구매력 하락 분석" sub="물가 상승으로 미래에 같은 금액으로 살 수 있는 것이 얼마나 줄어드는지 계산합니다" />

      {/* 입력 영역 */}
      <div style={{ background: C.slateLight, borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
          <InputRow label="현재 금액" val={inp.amt} onChange={(v) => setInp({ ...inp, amt: v })} unit="원" hint={fmt(inp.amt) + "원"} />
          <InputRow label="경과 기간" val={inp.yrs} onChange={(v) => setInp({ ...inp, yrs: v })} unit="년" />
          <InputRow label="연 물가상승률" val={inp.inf} onChange={(v) => setInp({ ...inp, inf: v })} unit="%" step={0.1} />
        </div>
        <CalcBtn label="구매력 계산하기" onClick={calc} />
      </div>

      {res !== null && (
        <>
          <div style={{ background: C.roseLight, border: `1px solid ${C.rose}20`, borderRadius: 16, padding: "32px 36px", marginBottom: 20, textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.rose, marginBottom: 10 }}>{inp.yrs}년 후 실질 구매력</p>
            <p style={{ fontSize: 52, fontWeight: 800, color: C.rose, letterSpacing: "-1.5px", marginBottom: 8 }}>{fmt(res)}원</p>
            <p style={{ fontSize: 15, color: C.slate, lineHeight: 1.7 }}>
              오늘의 <strong>{fmt(inp.amt)}원</strong>과 같은 구매력 —<br />
              명목 금액은 <strong style={{ color: C.rose }}>{loss}% 더 많아야</strong> 합니다.
            </p>
          </div>

          <div style={{ background: C.slateLight, borderRadius: 14, padding: "22px 26px" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.slate, marginBottom: 16 }}>구매력 비교</p>
            {[["현재 구매력", 100, C.teal], [`${inp.yrs}년 후 구매력`, 100 - loss, C.rose]].map(([l, p, color]) => (
              <div key={l as string} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 14, color: C.slate }}>{l}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: color as string }}>{p}%</span>
                </div>
                <GaugeBar pct={p as number} color={color as string} />
              </div>
            ))}
            <p style={{ fontSize: 13, color: C.muted, marginTop: 14 }}>
              손실액: <strong>{fmt(inp.amt - res)}원</strong> / 공식: 현재금액 ÷ (1 + {inp.inf}%)^{inp.yrs}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. 복리 마법
══════════════════════════════════════════════════════════════ */
function CompoundCalc() {
  const [r72, setR72] = useState(6);
  const [inp, setInp] = useState({ principal: 50000000, yrs: 10, rate: 3.5 });
  const [res, setRes] = useState<any>(null);

  const TAX = 0.154;
  const getS = (y: number) => inp.principal + inp.principal * (inp.rate / 100) * y * (1 - TAX);
  const getC = (y: number) => {
    const total = inp.principal * Math.pow(1 + inp.rate / 100, y);
    return inp.principal + (total - inp.principal) * (1 - TAX);
  };

  const calc = () =>
    setRes({ yrs: inp.yrs, s: getS(inp.yrs), c: getC(inp.yrs), s20: getS(20), c20: getC(20), s30: getS(30), c30: getC(30) });

  const double72 = r72 > 0 ? (72 / r72).toFixed(1) : "∞";
  const periods = res
    ? [{ label: `${res.yrs}년`, s: res.s, c: res.c }, { label: "20년", s: res.s20, c: res.c20 }, { label: "30년", s: res.s30, c: res.c30 }]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 72법칙 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.slateLight, borderRadius: 14, padding: "22px 24px" }}>
          <SectionTitle label="72의 법칙" sub="원금이 2배가 되는 기간을 계산합니다" />
          <InputRow label="연 수익률" val={r72} onChange={setR72} unit="%" step={0.5} />
          <p style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>공식: 72 ÷ 수익률(%) = 2배 달성 기간 (년)</p>
        </div>
        <div style={{ background: C.navy, borderRadius: 14, padding: "22px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: `${C.gold}90`, marginBottom: 10 }}>원금 2배 달성 기간</p>
          <p style={{ fontSize: 60, fontWeight: 900, color: C.gold, letterSpacing: "-2px", lineHeight: 1 }}>
            {double72}<span style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginLeft: 6 }}>년</span>
          </p>
          <p style={{ fontSize: 13, color: `${C.gold}60`, marginTop: 12, fontStyle: "italic" }}>"복리는 세계 8대 불가사의다" — 아인슈타인</p>
        </div>
      </div>

      {/* 복리 계산기 */}
      <div>
        <SectionTitle label="단리 vs 복리 시뮬레이션" sub="세후 15.4% 이자소득세 반영" />
        <div style={{ background: C.slateLight, borderRadius: 14, padding: "20px 22px", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <InputRow label="일시납 원금" val={inp.principal} onChange={(v) => setInp({ ...inp, principal: v })} unit="원" hint={fmt(inp.principal) + "원"} />
            <InputRow label="거치 기간" val={inp.yrs} onChange={(v) => setInp({ ...inp, yrs: v })} unit="년" />
            <InputRow label="연 이율" val={inp.rate} onChange={(v) => setInp({ ...inp, rate: v })} unit="%" step={0.1} />
          </div>
          <CalcBtn label="복리 시뮬레이션 실행" onClick={calc} />
        </div>

        {res && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
                <p style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{res.yrs}년 단리 (세후)</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: C.slate }}>{fmt(res.s)}원</p>
              </div>
              <div style={{ background: C.navy, borderRadius: 12, padding: "16px 20px" }}>
                <p style={{ fontSize: 10, color: `${C.gold}80`, marginBottom: 4 }}>{res.yrs}년 복리 (세후)</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>{fmt(res.c)}원</p>
                <p style={{ fontSize: 11, color: `${C.gold}55`, marginTop: 4 }}>단리 대비 +{fmt(res.c - res.s)}원</p>
              </div>
            </div>

            <div style={{ background: C.slateLight, borderRadius: 14, padding: "18px 22px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>기간별 단리 vs 복리 비교</p>
              {periods.map(({ label, s, c }) => {
                const maxV = Math.max(s, c, 1);
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.slate, marginBottom: 5 }}>{label}</p>
                    {[["단리", s, "#A0AEC0", C.slate], ["복리", c, C.blue, C.blue]].map(([lbl, v, barColor, textColor]) => (
                      <div key={lbl as string} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ width: 34, fontSize: 11, color: textColor as string, textAlign: "right", flexShrink: 0, fontWeight: 600 }}>{lbl}</span>
                        <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 16, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${((v as number) / maxV) * 100}%`, background: barColor as string, borderRadius: 4, transition: "width 0.5s" }} />
                        </div>
                        <span style={{ width: 88, fontSize: 11, color: textColor as string, fontWeight: 600 }}>{fmtM(v as number)}원</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. 코스트 애버리지 (DCA)
   — 꺾은선(주가) + 바(수량) 혼합 차트, 상세 테이블
══════════════════════════════════════════════════════════════ */
function VariableCalc() {
  const [monthly, setMonthly] = useState(500000);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월"];
  const PRICES = [1000, 1200, 800, 600, 900, 1100];

  const quantities = PRICES.map((p) => Math.floor(monthly / p));
  const totalInvested = monthly * PRICES.length;
  const totalQty = quantities.reduce((a, b) => a + b, 0);
  const avgPrice = Math.round(totalInvested / totalQty);
  const simpleMean = Math.round(PRICES.reduce((a, b) => a + b, 0) / PRICES.length);

  useEffect(() => {
    let rafId: number;
    const tryRender = () => {
      const canvas = canvasRef.current;
      const ChartJS = (window as any).Chart;
      if (!canvas || !ChartJS) { rafId = requestAnimationFrame(tryRender); return; }

      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

      chartRef.current = new ChartJS(canvas, {
        type: "bar",
        data: {
          labels: MONTHS,
          datasets: [
            {
              type: "line",
              label: "주가",
              data: PRICES,
              borderColor: C.rose,
              backgroundColor: "transparent",
              borderWidth: 2.5,
              pointBackgroundColor: PRICES.map((p) => p <= 700 ? C.blue : C.rose),
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 6,
              yAxisID: "yPrice",
              tension: 0.35,
              order: 1,
            },
            {
              type: "bar",
              label: "매입 수량",
              data: quantities,
              backgroundColor: PRICES.map((p) =>
                p <= 700 ? C.blue + "DD"
                : p >= 1100 ? "#CBD5E0CC"
                : C.gold + "BB"
              ),
              borderRadius: 5,
              yAxisID: "yQty",
              order: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: C.navy,
              titleColor: C.gold,
              bodyColor: "#fff",
              padding: 12,
              callbacks: {
                label: (ctx: any) =>
                  ctx.dataset.yAxisID === "yPrice"
                    ? ` 주가: ${ctx.raw.toLocaleString()}원`
                    : ` 매입 수량: ${ctx.raw.toLocaleString()}좌`,
              },
            },
          },
          scales: {
            yPrice: {
              position: "left",
              grid: { color: "#E2E8F055", lineWidth: 1 },
              border: { dash: [4, 4] },
              ticks: { color: C.rose, font: { size: 11 }, callback: (v: any) => v.toLocaleString() + "원" },
              title: { display: true, text: "주가 (원)", color: C.rose, font: { size: 11 } },
            },
            yQty: {
              position: "right",
              grid: { drawOnChartArea: false },
              ticks: { color: C.blue, font: { size: 11 }, callback: (v: any) => v + "좌" },
              title: { display: true, text: "매입 수량 (좌)", color: C.blue, font: { size: 11 } },
            },
            x: { grid: { display: false }, ticks: { color: C.slate, font: { size: 12, weight: "600" } } },
          },
        },
      });
    };
    rafId = requestAnimationFrame(tryRender);
    return () => { cancelAnimationFrame(rafId); };
  }, [monthly]);

  return (
    <div>
      {/* Chart.js CDN */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" async />

      <SectionTitle label="코스트 애버리지 (Dollar-Cost Averaging) 효과 분석" sub="매월 일정 금액 투자 시 주가 변동에 따른 평균 매입단가 인하 효과를 시각화합니다" />

      {/* 개념 설명 */}
      <div style={{ background: C.blueLight, border: `1px solid ${C.blue}20`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.blue + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke={C.blue} strokeWidth="1.5"/><path d="M7 4.5V8M7 10h.01" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 4 }}>핵심 원리</p>
          <p style={{ fontSize: 12, color: C.slate, lineHeight: 1.7 }}>
            주가가 <strong>낮을 때</strong> 같은 금액으로 <strong style={{ color: C.blue }}>더 많은 수량</strong>을 매입하고,
            주가가 <strong>높을 때</strong>는 <strong style={{ color: "#A0AEC0" }}>적은 수량</strong>을 매입합니다.
            결과적으로 <strong>평균 매입단가</strong>가 단순 평균보다 자동으로 낮아지는 효과가 발생합니다.
          </p>
        </div>
      </div>

      {/* 납입액 설정 */}
      <div style={{ maxWidth: 240, marginBottom: 20 }}>
        <InputRow label="매월 적립액" val={monthly} onChange={setMonthly} unit="원" hint={fmt(monthly) + "원"} />
      </div>

      {/* 차트 */}
      <div style={{ background: C.slateLight, borderRadius: 14, padding: "18px 20px", marginBottom: 18 }}>
        {/* 범례 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
          {[
            { color: C.rose, label: "주가 변동 (꺾은선)", line: true },
            { color: C.blue, label: "저가 매입 (파란 바)", line: false },
            { color: C.gold, label: "중간 매입 (금색 바)", line: false },
            { color: "#CBD5E0", label: "고가 매입 (회색 바)", line: false },
          ].map(({ color, label, line }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.slate }}>
              {line
                ? <div style={{ width: 22, height: 2, background: color, borderRadius: 2 }} />
                : <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />}
              {label}
            </div>
          ))}
        </div>
        <div style={{ position: "relative", height: 260 }}>
          <canvas ref={canvasRef} />
        </div>
        <p style={{ fontSize: 10, color: C.muted, marginTop: 8, textAlign: "center" }}>
          시뮬레이션: 주가 1,000 → 1,200 → 800 → 600 → 900 → 1,100원 / 매월 {fmt(monthly)}원 투자
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>총 확보 수량</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{totalQty.toLocaleString()}<span style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginLeft: 3 }}>좌</span></p>
        </div>
        <div style={{ background: C.navy, borderRadius: 12, padding: "14px 18px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: `${C.gold}80`, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>실제 평균 단가</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>{avgPrice.toLocaleString()}<span style={{ fontSize: 12, color: `${C.gold}60`, fontWeight: 500, marginLeft: 3 }}>원</span></p>
          <p style={{ fontSize: 11, color: `${C.gold}55`, marginTop: 3 }}>단순평균 {simpleMean.toLocaleString()}원</p>
        </div>
        <div style={{ background: C.tealLight, border: `1px solid ${C.teal}25`, borderRadius: 12, padding: "14px 18px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.teal, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>단가 절감 효과</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: C.teal }}>-{(simpleMean - avgPrice).toLocaleString()}<span style={{ fontSize: 12, color: C.teal, fontWeight: 500, marginLeft: 3 }}>원/좌</span></p>
          <p style={{ fontSize: 11, color: C.teal, marginTop: 3 }}>단순평균 대비 절감</p>
        </div>
      </div>

      {/* 월별 테이블 */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.navy }}>
              {["월", "주가", "투자금", "매입 수량", "누적 수량"].map((h, i) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: i === 0 ? "left" : "right", color: C.gold, fontWeight: 700, fontSize: 11, letterSpacing: "0.3px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m, i) => {
              const cumQty = quantities.slice(0, i + 1).reduce((a, b) => a + b, 0);
              const isLow = PRICES[i] <= 700;
              const isHigh = PRICES[i] >= 1100;
              return (
                <tr key={m} style={{ background: i % 2 === 0 ? "#fff" : C.slateLight, borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "9px 16px", color: C.slate, fontWeight: 600 }}>{m}</td>
                  <td style={{ padding: "9px 16px", textAlign: "right" }}>
                    <span style={{ color: isLow ? C.blue : isHigh ? C.muted : C.text, fontWeight: isLow ? 700 : 400 }}>
                      {PRICES[i].toLocaleString()}원
                    </span>
                    {isLow && <span style={{ marginLeft: 6, fontSize: 10, background: C.blue, color: "#fff", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>저가</span>}
                    {isHigh && <span style={{ marginLeft: 6, fontSize: 10, background: "#CBD5E0", color: C.slate, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>고가</span>}
                  </td>
                  <td style={{ padding: "9px 16px", textAlign: "right", color: C.slate }}>{fmt(monthly)}원</td>
                  <td style={{ padding: "9px 16px", textAlign: "right", color: isLow ? C.blue : C.text, fontWeight: isLow ? 700 : 400 }}>{quantities[i].toLocaleString()}좌</td>
                  <td style={{ padding: "9px 16px", textAlign: "right", color: C.text, fontWeight: 600 }}>{cumQty.toLocaleString()}좌</td>
                </tr>
              );
            })}
            <tr style={{ background: C.goldLight, borderTop: `2px solid ${C.gold}` }}>
              <td style={{ padding: "10px 16px", fontWeight: 800, color: C.navy }}>합계</td>
              <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: C.navy }}>평균 {avgPrice.toLocaleString()}원</td>
              <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: C.navy }}>{fmt(totalInvested)}원</td>
              <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: C.navy }}>{totalQty.toLocaleString()}좌</td>
              <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: C.navy }}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}