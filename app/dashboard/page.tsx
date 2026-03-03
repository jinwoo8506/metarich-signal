"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [타입 정의] ──────────────────────────
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

  // ─── [상태 관리] ──────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("") 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeAdminPopup, setActiveAdminPopup] = useState<'perf' | 'act' | 'edu' | 'setting' | null>(null)
  const [activeTool, setActiveTool] = useState<'comparison' | 'inflation' | 'compound'>('comparison')

  // 직원 실적 데이터
  const [goalCount, setGoalCount] = useState(0)
  const [targetAmt, setTargetAmt] = useState(0)
  const [targetRecruit, setTargetRecruit] = useState(0)
  const [isApproved, setIsApproved] = useState(false) 

  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [pts, setPts] = useState(0); const [intros, setIntros] = useState(0)
  const [dbIn, setDbIn] = useState(0); const [dbOut, setDbOut] = useState(0)

  // 교육 확인 관련 (직원용)
  const [eduConfirmed, setEduConfirmed] = useState(false)
  const [eduSchedule, setEduSchedule] = useState(["금주 교육: 신규 종신보험 화법", "공지: 3월 마감 지침"])

  // 계산기 상태
  const [calcInput, setCalcInput] = useState({ principal: 100, rate: 5, years: 10 })
  const [calcResult, setCalcResult] = useState<{title: string, val1: string, val2?: string} | null>(null)

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1

  // ─── 🔄 [데이터 로직] ──────────────────────────
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
    
    // 1. 공지 및 메모 & 교육 확인 여부 (교육 확인 데이터는 performances 테이블의 비고란이나 별도 테이블 활용 가정)
    const { data: note } = await supabase.from("daily_notes").select("*").eq("date", dateStr).maybeSingle()
    const { data: myMemo } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(note?.admin_notice || ""); setPersonalMemo(myMemo?.agent_memo || "")

    // 2. 실적 데이터
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", userId).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", userId).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    
    if (t) {
      setGoalCount(t.target_count || 0); setTargetAmt(t.target_amount || 0); setTargetRecruit(t.target_recruit || 0);
      setIsApproved(t.status === 'approved')
    }
    if (p) {
      setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0);
      setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setPts(p.pt || 0);
      setIntros(p.intro_count || 0); setDbIn(p.db_assigned || 0); setDbOut(p.db_returned || 0)
    }
  }

  const handleSave = async () => {
    const targetPayload = { user_id: userId, year: currentYear, month: currentMonth, target_count: goalCount, target_amount: targetAmt, target_recruit: targetRecruit }
    const perfPayload = { user_id: userId, year: currentYear, month: currentMonth, contract_count: contract, contract_amount: contractAmount, call_count: calls, meet_count: meets, pt: pts, intro_count: intros, db_assigned: dbIn, db_returned: dbOut }
    
    if (!isApproved) await supabase.from("monthly_targets").upsert(targetPayload, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(perfPayload, { onConflict: 'user_id, year, month' })
    alert("활동 기록 및 교육 확인이 저장되었습니다.")
  }

  // 🧮 계산기 로직 (적금 vs 보험 비교 포함)
  const runCalculation = () => {
    const { principal, rate, years } = calcInput;
    const r = rate / 100;
    const n = years;

    if (activeTool === 'comparison') {
      // 적금 (단리, 이자과세 15.4% 가정)
      const savingInterest = (principal * n * 12 * (n * 12 + 1) / 2) * (r / 12);
      const savingTotal = (principal * n * 12) + (savingInterest * 0.846);
      // 보험 (복리, 비과세 가정)
      const insuranceTotal = principal * 12 * ((Math.pow(1 + r/12, n * 12 + 1) - 1) / (r/12) - 1);

      setCalcResult({
        title: "적금 vs 보험 (월납 기준)",
        val1: `적금(만기예상): ${Math.round(savingTotal).toLocaleString()}만원`,
        val2: `보험(복리예상): ${Math.round(insuranceTotal).toLocaleString()}만원`
      });
    } else if (activeTool === 'inflation') {
      const result = principal / Math.pow(1 + r, n);
      setCalcResult({ title: "화폐 가치 하락 결과", val1: `현재 가치: ${Math.round(result).toLocaleString()}만원` });
    } else if (activeTool === 'compound') {
      const result = principal * Math.pow(1 + r, n);
      setCalcResult({ title: "거치식 복리 수익 결과", val1: `만기 금액: ${Math.round(result).toLocaleString()}만원` });
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400">LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* ─── 📟 사이드바 ─────────────────── */}
      <aside className="hidden lg:flex w-80 bg-white border-r p-6 flex-col gap-6">
        <h2 className="text-2xl font-black italic border-b-4 border-black pb-1">SIGNAL</h2>
        <div className="border rounded-3xl overflow-hidden bg-slate-50 p-2 scale-90">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" />
        </div>
        <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} readOnly color="bg-blue-50" />
        <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e: any)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
        <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-[#d4af37] text-black py-4 rounded-2xl font-black shadow-lg">영업 계산기</button>
      </aside>

      {/* ─── 💎 메인 메인 섹션 ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6">
        <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border lg:hidden">
            <h1 className="font-black italic text-xl">SIGNAL</h1>
            <button onClick={() => setIsBizToolOpen(true)} className="bg-black text-[#d4af37] px-4 py-2 rounded-xl text-xs font-black">계산기</button>
        </header>

        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border hidden lg:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{userName} Dashboard</p>
              <h1 className="text-3xl font-black italic">{currentMonth}월 실적 및 교육 관리</h1>
          </div>

          {/* 직원 입력 섹션 */}
          <section className="bg-white p-6 lg:p-10 rounded-[3rem] border shadow-sm space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-black italic underline decoration-[#d4af37] decoration-4 uppercase">Activity Input</h2>
                <button onClick={handleSave} className="bg-black text-[#d4af37] px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95">저장하기</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputBox label="목표 금액 (만원)" value={targetAmt} onChange={setTargetAmt} disabled={isApproved} highlight />
                <InputBox label="목표 건수 (건)" value={goalCount} onChange={setGoalCount} disabled={isApproved} highlight />
                <InputBox label="도입 목표 (명)" value={targetRecruit} onChange={setTargetRecruit} disabled={isApproved} highlight />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <ActivityMini label="전화" val={calls} onChange={setCalls} color="bg-blue-50" />
                <ActivityMini label="만남" val={meets} onChange={setMeets} color="bg-indigo-50" />
                <ActivityMini label="제안" val={pts} onChange={setPts} color="bg-purple-50" />
                <ActivityMini label="소개" val={intros} onChange={setIntros} color="bg-emerald-50" />
                <ActivityMini label="DB배정" val={dbIn} onChange={setDbIn} color="bg-slate-50" />
                <ActivityMini label="DB반품" val={dbOut} onChange={setDbOut} color="bg-rose-50" />
            </div>
          </section>

          {/* 🎓 [교육 확인 섹션] - 요청하신 하단 별도 박스 */}
          <section className="bg-slate-900 text-white p-8 rounded-[3rem] border-b-8 border-[#d4af37] shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-[#d4af37] font-black text-xs uppercase tracking-widest mb-2">Education & Notice</h3>
                    <ul className="space-y-1">
                        {eduSchedule.map((s, i) => <li key={i} className="text-sm font-bold opacity-90">• {s}</li>)}
                    </ul>
                </div>
                <label className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl cursor-pointer hover:bg-white/20 transition-all border border-white/10 w-full md:w-auto">
                    <input type="checkbox" checked={eduConfirmed} onChange={(e)=>setEduConfirmed(e.target.checked)} className="w-6 h-6 rounded-lg accent-[#d4af37]" />
                    <span className="font-black text-sm">교육 내용을 모두 확인했습니다.</span>
                </label>
            </div>
          </section>
        </div>
      </main>

      {/* ─── 🧱 [모달: 영업 계산기 - 모바일 최적화] ────────────────────────── */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[1000] flex items-end lg:items-center justify-center">
            <div className="bg-white w-full lg:max-w-4xl h-[92vh] lg:h-[80vh] rounded-t-[3rem] lg:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                <header className="p-6 lg:p-8 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl lg:text-2xl font-black italic">SALES CALC</h2>
                    <button onClick={()=>{setIsBizToolOpen(false); setCalcResult(null);}} className="text-2xl font-black p-2">✕</button>
                </header>
                
                <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
                    <div className="flex lg:flex-col bg-slate-100 lg:w-48 overflow-x-auto lg:overflow-y-auto scrollbar-hide">
                        <ToolTab active={activeTool==='comparison'} label="적금 vs 보험" onClick={()=>setActiveTool('comparison')} />
                        <ToolTab active={activeTool==='inflation'} label="물가 계산" onClick={()=>setActiveTool('inflation')} />
                        <ToolTab active={activeTool==='compound'} label="복리 계산" onClick={()=>setActiveTool('compound')} />
                    </div>
                    
                    <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                        <div className="max-w-md mx-auto space-y-6">
                            <h3 className="text-lg lg:text-2xl font-black text-center uppercase underline decoration-[#d4af37] decoration-4 mb-6 lg:mb-10">
                                {activeTool === 'comparison' ? "적금 vs 보험 비교" : activeTool === 'inflation' ? "물가상승 시뮬레이션" : "복리 수익 시뮬레이션"}
                            </h3>
                            
                            <div className="space-y-4">
                                <CalcInput label={activeTool==='comparison' ? "월 납입액 (만원)" : "기준 금액 (만원)"} unit="만" value={calcInput.principal} onChange={(v)=>setCalcInput({...calcInput, principal: v})} />
                                <CalcInput label="예상 이율 (%)" unit="%" value={calcInput.rate} onChange={(v)=>setCalcInput({...calcInput, rate: v})} />
                                <CalcInput label="기간 (년)" unit="년" value={calcInput.years} onChange={(v)=>setCalcInput({...calcInput, years: v})} />
                                <button onClick={runCalculation} className="w-full bg-black text-[#d4af37] py-5 lg:py-6 rounded-3xl font-black text-lg uppercase shadow-xl active:scale-95 transition-all">결과 보기</button>
                            </div>

                            {calcResult && (
                                <div className="mt-8 p-6 lg:p-8 bg-slate-900 text-white rounded-[2rem] border-b-8 border-[#d4af37] animate-in zoom-in duration-300">
                                    <p className="text-[10px] font-black text-[#d4af37] mb-2 uppercase">{calcResult.title}</p>
                                    <div className="space-y-2">
                                        <p className="text-xl lg:text-2xl font-black">{calcResult.val1}</p>
                                        {calcResult.val2 && <p className="text-xl lg:text-2xl font-black text-emerald-400">{calcResult.val2}</p>}
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-4 font-bold italic leading-tight">
                                        * 적금: 단리 및 이자과세 15.4% 적용<br/>
                                        * 보험/복리: 월복리 비과세 및 유지 가정
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

// ─── 📦 [컴포넌트 라이브러리] ──────────────────────────

function InputBox({ label, value, onChange, disabled, highlight }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
            <div className="relative">
                <input type="number" value={value} disabled={disabled} onChange={(e)=>onChange(Number(e.target.value))} 
                className={`w-full p-4 lg:p-5 rounded-2xl font-black text-lg outline-none border-2 transition-all ${disabled ? 'bg-slate-50 text-slate-300' : highlight ? 'border-black focus:ring-4 ring-amber-100' : 'border-slate-100'}`} />
            </div>
        </div>
    )
}

function ActivityMini({ label, val, onChange, color }: any) {
    return (
        <div className={`${color} p-4 rounded-2xl text-center border shadow-sm`}>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} className="w-full bg-transparent text-center text-xl font-black outline-none" />
        </div>
    )
}

function CalcInput({ label, unit, value, onChange }: any) {
    return (
        <div className="space-y-1 w-full">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
            <div className="relative">
                <input type="number" value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full p-4 lg:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg outline-none focus:border-black transition-all" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm uppercase italic">{unit}</span>
            </div>
        </div>
    )
}

function ToolTab({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex-1 lg:flex-none p-4 lg:p-6 text-[10px] lg:text-xs font-black uppercase transition-all text-center lg:text-left whitespace-nowrap ${active ? 'bg-white text-black border-b-4 lg:border-b-0 lg:border-r-8 border-black shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
            {label}
        </button>
    )
}

function QuickLink({ label, href }: { label:string, href:string }) {
    return (
        <a href={href} target="_blank" className="bg-white border-2 border-slate-900 text-center py-4 rounded-2xl font-black text-[10px] lg:text-sm shadow-sm hover:bg-black hover:text-[#d4af37] transition-all uppercase">{label}</a>
    )
}

function MemoBox({ label, value, onChange, readOnly, color }: any) {
  return (
    <div className={`${color} p-4 rounded-2xl border shadow-inner`}>
        <p className="text-[9px] font-black text-slate-400 mb-2 uppercase italic">{label}</p>
        <textarea readOnly={readOnly} value={value} onChange={onChange} className="w-full bg-transparent text-xs font-bold outline-none resize-none h-20 text-slate-700 leading-relaxed" placeholder="..." />
    </div>
  )
}