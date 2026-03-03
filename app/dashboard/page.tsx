"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPES] ────────────────────────────────────
interface Performance {
  year: number; month: number;
  contract_count?: number; contract_amount?: number;
  ap?: number; pt?: number; call_count?: number;
  meet_count?: number; intro_count?: number;
  recruit_count?: number; db_assigned?: number; db_returned?: number;
}
interface MonthlyTarget {
  year: number; month: number;
  target_count?: number; target_amount?: number; target_recruit?: number;
  status?: string;
}
interface Agent {
  id: string; name: string;
  monthly_targets?: MonthlyTarget[];
  performances?: Performance[];
}

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // ─── [STATE] ──────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("") 
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeAdminPopup, setActiveAdminPopup] = useState<'perf' | 'act' | 'edu' | null>(null)
  const [activeTool, setActiveTool] = useState<'comparison' | 'inflation' | 'compound'>('comparison')

  // 직원 실적 데이터 (6종 활동)
  const [goalCount, setGoalCount] = useState(0)
  const [targetAmt, setTargetAmt] = useState(0)
  const [targetRecruit, setTargetRecruit] = useState(0)
  const [isApproved, setIsApproved] = useState(false) 

  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [pts, setPts] = useState(0); const [intros, setIntros] = useState(0)
  const [dbIn, setDbIn] = useState(0); const [dbOut, setDbOut] = useState(0)

  // 교육 확인 (직원용 별도 박스)
  const [eduConfirmed, setEduConfirmed] = useState(false)
  const [eduSchedule] = useState(["[교육] 신규 단기납 종신 환급률 비교", "[공지] 3월 마감 지침 및 시상 안내"])

  // 계산기 (엑셀 로직 반영)
  const [calcInput, setCalcInput] = useState({ principal: 50, rate: 3, years: 10 })
  const [calcResult, setCalcResult] = useState<{title: string, val1: string, val2?: string, ratio1?: string, ratio2?: string} | null>(null)

  const [agents, setAgents] = useState<Agent[]>([])
  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1

  // ─── 🔄 [DATA FETCH] ───────────────────────────────
  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchData() }, [userId, selectedDate])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    setLoading(false)
  }

  async function fetchData() {
    if (!userId) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    const { data: note } = await supabase.from("daily_notes").select("*").eq("date", dateStr).maybeSingle()
    const { data: myMemo } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(note?.admin_notice || ""); setPersonalMemo(myMemo?.agent_memo || "")

    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", userId).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", userId).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    
    if (t) { setGoalCount(t.target_count || 0); setTargetAmt(t.target_amount || 0); setTargetRecruit(t.target_recruit || 0); setIsApproved(t.status === 'approved') }
    if (p) { setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0); setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setPts(p.pt || 0); setIntros(p.intro_count || 0); setDbIn(p.db_assigned || 0); setDbOut(p.db_returned || 0) }

    if (role !== 'agent') {
        const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
        if (data) setAgents(data as Agent[])
    }
  }

  const handleSave = async () => {
    const targetPayload = { user_id: userId, year: currentYear, month: currentMonth, target_count: goalCount, target_amount: targetAmt, target_recruit: targetRecruit }
    const perfPayload = { user_id: userId, year: currentYear, month: currentMonth, contract_count: contract, contract_amount: contractAmount, call_count: calls, meet_count: meets, pt: pts, intro_count: intros, db_assigned: dbIn, db_returned: dbOut }
    await supabase.from("monthly_targets").upsert(targetPayload, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(perfPayload, { onConflict: 'user_id, year, month' })
    alert("데이터와 교육 확인이 저장되었습니다.")
    fetchData()
  }

  // 🧮 [엑셀 연동 계산 로직]
  const runCalculation = () => {
    const { principal, rate, years } = calcInput; // principal: 월납입액(만원), rate: 이율(%), years: 총기간
    if (principal <= 0 || years <= 0) return alert("금액과 기간을 입력하세요.");

    const r = rate / 100;
    const totalDeposit = principal * 12 * (years / 2); // 엑셀처럼 기간의 절반은 납입, 절반은 거치 가정

    if (activeTool === 'comparison') {
      // 1. 은행(적금+예금) 로직 (엑셀 수식 반영)
      // 적금 기간 (총 기간의 절반)
      const payMonths = (years / 2) * 12;
      const savingInterest = principal * (payMonths * (payMonths + 1) / 2) * (r / 12);
      const afterTaxSaving = (principal * payMonths) + (savingInterest * 0.846);
      
      // 예금 기간 (나머지 절반 거치)
      const restYears = years / 2;
      const depositInterest = afterTaxSaving * r * restYears;
      const finalBank = afterTaxSaving + (depositInterest * 0.846);

      // 2. 보험(복리/비과세) 로직
      // 엑셀 환급률 시뮬레이션: 월복리 
      const mr = r / 12;
      const totalMonths = years * 12;
      const finalIns = (principal * ((Math.pow(1 + mr, totalMonths) - 1) / mr) * (1 + mr)) * 0.93; // 사업비 7% 가정

      setCalcResult({
        title: `${years}년 설계 (납입 ${(years/2)}년+거치 ${(years/2)}년)`,
        val1: `은행(세후): ${Math.round(finalBank).toLocaleString()}만원`,
        val2: `보험(예상): ${Math.round(finalIns).toLocaleString()}만원`,
        ratio1: `환급률: ${((finalBank / (principal * payMonths)) * 100).toFixed(1)}%`,
        ratio2: `환급률: ${((finalIns / (principal * payMonths)) * 100).toFixed(1)}%`
      });
    } else if (activeTool === 'inflation') {
      const res = principal / Math.pow(1 + r, years);
      setCalcResult({ title: "화폐 가치 하락 결과", val1: `미래 실질가치: ${Math.round(res).toLocaleString()}만원` });
    } else if (activeTool === 'compound') {
      const res = principal * Math.pow(1 + r, years);
      setCalcResult({ title: "거치식 복리 만기", val1: `예상 수령액: ${Math.round(res).toLocaleString()}만원` });
    }
  }

  const totalStats = agents.reduce((acc, a) => {
    const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
    const t = a.monthly_targets?.find(tf => tf.year === currentYear && tf.month === currentMonth);
    if (p) { acc.curAmt += (p.contract_amount || 0); acc.curCnt += (p.contract_count || 0); }
    if (t) { acc.tarAmt += (t.target_amount || 0); acc.tarCnt += (t.target_count || 0); acc.tarRec += (t.target_recruit || 0); }
    return acc;
  }, { curAmt: 0, curCnt: 0, tarAmt: 0, tarCnt: 0, tarRec: 0 });

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400">LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* ─── 📟 사이드바 (PC) ───────────────── */}
      <aside className="hidden lg:flex w-80 bg-white border-r p-6 flex-col gap-6">
        <h2 className="text-2xl font-black italic border-b-4 border-black pb-1 uppercase">SIGNAL</h2>
        <div className="border rounded-3xl overflow-hidden bg-slate-50 p-2 shadow-inner">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" />
        </div>
        <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} readOnly color="bg-blue-50" />
        <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e: any)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
        <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-[#d4af37] text-black py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">영업 계산기</button>
      </aside>

      {/* ─── 💎 메인 섹션 ─────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6">
        <header className="flex lg:hidden justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border mb-4">
            <h1 className="font-black italic text-xl">SIGNAL</h1>
            <button onClick={() => setIsBizToolOpen(true)} className="bg-black text-[#d4af37] px-4 py-2 rounded-xl text-xs font-black uppercase">Calculator</button>
        </header>

        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border hidden lg:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{userName} CA Dashboard</p>
              <h1 className="text-3xl font-black italic uppercase">{currentMonth}월 팀 실적 및 활동 지표</h1>
          </div>

          {/* 관리자 탭 (막대 그래프) */}
          {(role !== "agent") && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MainTabBtn label="실적 분석" sub="팀 달성률 막대 그래프" onClick={()=>setActiveAdminPopup('perf')} />
                <MainTabBtn label="활동 통계" sub="전환율 및 효율 분석" onClick={()=>setActiveAdminPopup('act')} />
                <MainTabBtn label="교육 관리" sub="직원 확인 현황" onClick={()=>setActiveAdminPopup('edu')} />
            </div>
          )}

          {/* 직원 활동 입력 섹션 */}
          <section className="bg-white p-6 lg:p-10 rounded-[3rem] border shadow-sm space-y-8">
            <div className="flex justify-between items-center border-b-2 border-slate-50 pb-4">
                <h2 className="text-xl font-black italic underline decoration-[#d4af37] decoration-4 uppercase">Daily Activity</h2>
                <button onClick={handleSave} className="bg-black text-[#d4af37] px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">Save Activity</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputBox label="목표 금액 (만원)" value={targetAmt} onChange={setTargetAmt} disabled={isApproved} highlight />
                <InputBox label="목표 건수 (건)" value={goalCount} onChange={setGoalCount} disabled={isApproved} highlight />
                <InputBox label="도입 목표 (명)" value={targetRecruit} onChange={setTargetRecruit} disabled={isApproved} highlight />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <ActivityMini label="전화" val={calls} onChange={setCalls} color="bg-blue-50" />
                <ActivityMini label="만남" val={meets} onChange={setMeets} color="bg-indigo-50" />
                <ActivityMini label="제안" val={pts} onChange={setPts} color="bg-purple-50" />
                <ActivityMini label="소개" val={intros} onChange={setIntros} color="bg-emerald-50" />
                <ActivityMini label="DB배정" val={dbIn} onChange={setDbIn} color="bg-slate-50" />
                <ActivityMini label="DB반품" val={dbOut} onChange={setDbOut} color="bg-rose-50" />
            </div>
          </section>

          {/* 🎓 [교육 확인 박스] - 하단 배치 */}
          <section className="bg-slate-900 text-white p-8 rounded-[3rem] border-b-8 border-[#d4af37] shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-[#d4af37] font-black text-xs uppercase tracking-widest mb-3 italic">Education Notice</h3>
                    <div className="space-y-2">
                        {eduSchedule.map((s, i) => <p key={i} className="text-sm font-bold text-slate-300">• {s}</p>)}
                    </div>
                </div>
                <label className="flex items-center gap-4 bg-white/10 p-5 rounded-3xl cursor-pointer border border-white/5 hover:bg-white/20 w-full md:w-auto transition-all">
                    <input type="checkbox" checked={eduConfirmed} onChange={(e)=>setEduConfirmed(e.target.checked)} className="w-6 h-6 rounded-lg accent-[#d4af37]" />
                    <span className="font-black text-sm uppercase italic">상기 교육 내용을 모두 숙지함</span>
                </label>
            </div>
          </section>
        </div>
      </main>

      {/* ─── 🧱 [관리자 모달: 실적 막대 그래프] ─────────────────── */}
      {activeAdminPopup === 'perf' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative">
                <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
                <h3 className="text-2xl font-black uppercase italic mb-10 border-b-4 border-black inline-block">Team Progress</h3>
                <div className="space-y-12">
                    <ProgressBar label="전체 실적 금액 달성률" current={totalStats.curAmt} target={totalStats.tarAmt} unit="만원" color="bg-black" />
                    <ProgressBar label="전체 건수 달성률" current={totalStats.curCnt} target={totalStats.tarCnt} unit="건" color="bg-blue-600" />
                    <ProgressBar label="도입 목표 달성률" current={0} target={totalStats.tarRec} unit="명" color="bg-[#d4af37]" />
                </div>
            </div>
        </div>
      )}

      {/* ─── 🧱 [모달: 영업 계산기 - 모바일 최적화] ─────────────────── */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[1000] flex items-end lg:items-center justify-center">
            <div className="bg-white w-full lg:max-w-4xl h-[92vh] lg:h-[85vh] rounded-t-[3rem] lg:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                <header className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-black italic uppercase">Insurance Comparison Tool</h2>
                    <button onClick={()=>{setIsBizToolOpen(false); setCalcResult(null);}} className="text-2xl font-black p-2">✕</button>
                </header>
                
                <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
                    <div className="flex lg:flex-col bg-slate-100 lg:w-56 overflow-x-auto scrollbar-hide border-b lg:border-r">
                        <ToolTab active={activeTool==='comparison'} label="적금 vs 보험 비교" onClick={()=>setActiveTool('comparison')} />
                        <ToolTab active={activeTool==='inflation'} label="물가(가치) 계산" onClick={()=>setActiveTool('inflation')} />
                        <ToolTab active={activeTool==='compound'} label="거치식 복리 수익" onClick={()=>setActiveTool('compound')} />
                    </div>
                    
                    <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-white">
                        <div className="max-w-md mx-auto space-y-6">
                            <h3 className="text-lg font-black text-center uppercase italic underline decoration-[#d4af37] decoration-4 mb-8">
                                {activeTool === 'comparison' ? "적금(납입+거치) vs 보험 비교" : activeTool === 'inflation' ? "미래가치 계산기" : "복리 수익 시뮬레이션"}
                            </h3>
                            
                            <div className="space-y-4">
                                <CalcInput label={activeTool==='comparison' ? "월 납입액 (만원)" : "기준 금액 (만원)"} unit="만" value={calcInput.principal} onChange={(v: number)=>setCalcInput({...calcInput, principal: v})} />
                                <CalcInput label="적용 이율 (%)" unit="%" value={calcInput.rate} onChange={(v: number)=>setCalcInput({...calcInput, rate: v})} />
                                <CalcInput label="총 기간 (년)" unit="년" value={calcInput.years} onChange={(v: number)=>setCalcInput({...calcInput, years: v})} />
                                <button onClick={runCalculation} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl active:scale-95 transition-all">결과 산출하기</button>
                            </div>

                            {calcResult && (
                                <div className="mt-8 p-6 lg:p-10 bg-slate-900 text-white rounded-[2.5rem] border-b-8 border-[#d4af37] shadow-2xl animate-in zoom-in">
                                    <p className="text-[10px] font-black text-[#d4af37] mb-3 uppercase tracking-tighter">{calcResult.title}</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="border-r border-white/10 pr-4">
                                            <p className="text-sm font-bold text-slate-400">BANK (적립+거치)</p>
                                            <p className="text-xl font-black">{calcResult.val1}</p>
                                            <p className="text-xs font-black text-[#d4af37]">{calcResult.ratio1}</p>
                                        </div>
                                        <div className="pl-4">
                                            <p className="text-sm font-bold text-slate-400">INSURANCE (보험)</p>
                                            <p className="text-xl font-black text-emerald-400">{calcResult.val2}</p>
                                            <p className="text-xs font-black text-emerald-400">{calcResult.ratio2}</p>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-6 font-bold italic leading-relaxed">
                                        * 은행: 기간 절반 적금(단리), 절반 예금(단리) 거치 / 이자소득세 15.4% 차감<br/>
                                        * 보험: 전기간 월복리 운용 및 비과세 가정 (사업비 7% 차감 적용)
                                    </p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
      )}

      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; font-size: 0.8rem !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 10px; font-weight: 900; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

// ─── 📦 [REUSABLE COMPONENTS] ──────────────────────────

function ProgressBar({ label, current, target, unit, color }: any) {
    const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end px-2">
                <span className="font-black text-[11px] uppercase text-slate-400">{label}</span>
                <span className="font-black text-lg">{current.toLocaleString()}<span className="text-slate-300 ml-1">/ {target.toLocaleString()}{unit}</span></span>
            </div>
            <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden border p-1.5 shadow-inner">
                <div className={`h-full ${color} rounded-full transition-all duration-1000 flex items-center justify-end px-4`} style={{ width: `${rate}%` }}>
                    {rate > 15 && <span className="text-[10px] font-black text-white italic">{rate.toFixed(1)}%</span>}
                </div>
            </div>
        </div>
    )
}

function InputBox({ label, value, onChange, disabled, highlight }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
            <input type="number" value={value} disabled={disabled} onChange={(e)=>onChange(Number(e.target.value))} 
            className={`w-full p-4 lg:p-5 rounded-2xl font-black text-lg outline-none border-2 transition-all ${disabled ? 'bg-slate-50 text-slate-300 border-slate-100' : highlight ? 'border-black focus:ring-4 ring-amber-100 shadow-md' : 'border-slate-100'}`} />
        </div>
    )
}

function ActivityMini({ label, val, onChange, color }: any) {
    return (
        <div className={`${color} p-4 rounded-3xl text-center border shadow-sm`}>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">{label}</p>
            <input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} className="w-full bg-transparent text-center text-xl font-black outline-none" />
        </div>
    )
}

function CalcInput({ label, unit, value, onChange }: { label: string, unit: string, value: number, onChange: (v: number) => void }) {
    return (
        <div className="space-y-1 w-full text-left">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
            <div className="relative">
                <input type="number" value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-xl outline-none focus:border-black transition-all" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm italic">{unit}</span>
            </div>
        </div>
    )
}

function ToolTab({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex-1 lg:flex-none p-5 lg:p-7 text-[10px] lg:text-xs font-black uppercase transition-all whitespace-nowrap ${active ? 'bg-white text-black border-b-4 lg:border-b-0 lg:border-r-8 border-black shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            {label}
        </button>
    )
}

function MainTabBtn({ label, sub, onClick }: any) {
    return (
        <button onClick={onClick} className="bg-white border-2 border-black p-5 rounded-[2.5rem] text-center transition-all hover:bg-black group shadow-sm active:scale-95">
            <p className="text-xs font-black uppercase group-hover:text-[#d4af37]">{label}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 group-hover:text-slate-500">{sub}</p>
        </button>
    )
}

function MemoBox({ label, value, onChange, readOnly, color }: any) {
  return (
    <div className={`${color} p-5 rounded-3xl border shadow-inner`}>
        <p className="text-[9px] font-black text-slate-400 mb-2 uppercase italic tracking-widest">{label}</p>
        <textarea readOnly={readOnly} value={value} onChange={onChange} className="w-full bg-transparent text-xs font-bold outline-none resize-none h-24 text-slate-700 leading-relaxed" placeholder="..." />
    </div>
  )
}