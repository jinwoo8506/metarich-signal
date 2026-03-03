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
  call_count?: number; meet_count?: number; pt?: number;
  intro_count?: number; db_assigned?: number; db_returned?: number;
}
interface Agent {
  id: string; name: string;
  monthly_targets?: any[];
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

  // 활동 데이터
  const [goalCount, setGoalCount] = useState(0); const [targetAmt, setTargetAmt] = useState(0)
  const [contract, setContract] = useState(0); const [calls, setCalls] = useState(0)
  const [meets, setMeets] = useState(0); const [pts, setPts] = useState(0)

  // 계산기 입력값
  const [calc, setCalc] = useState({
    principal: 50,    // 월납입액 또는 기준금액
    payYears: 5,      // 납입기간
    totalYears: 10,   // 총기간 (거치 포함)
    bankRate: 3.5,    // 은행이율
    insReturnRate: 125, // 보험 환급률 (%)
    inflationRate: 3.0  // 물가상승률
  })
  const [calcResult, setCalcResult] = useState<any>(null)

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
    setDailySpecialNote(note?.admin_notice || "")
    if (role !== 'agent') {
      const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
      if (data) setAgents(data as Agent[])
    }
  }

  // 🧮 [상담용 계산기 로직]
  const runCalculation = () => {
    if (activeTool === 'comparison') {
      // 1. 은행 (납입기간 동안 적금 + 나머지 기간 예금 거치)
      const monthlyPrincipal = calc.principal * 10000;
      const payMonths = calc.payYears * 12;
      const r = (calc.bankRate / 100) / 12;
      
      const totalPay = monthlyPrincipal * payMonths;
      const savingInt = monthlyPrincipal * (payMonths * (payMonths + 1) / 2) * r;
      const afterTaxSaving = totalPay + (savingInt * 0.846);
      
      const restYears = calc.totalYears - calc.payYears;
      const finalBank = restYears > 0 
        ? afterTaxSaving + (afterTaxSaving * (calc.bankRate/100) * restYears * 0.846) 
        : afterTaxSaving;

      // 2. 보험 (입력한 환급률 적용)
      const finalIns = totalPay * (calc.insReturnRate / 100);

      setCalcResult({
        title: `${calc.totalYears}년 비교 (납입 ${calc.payYears}년)`,
        bankFinal: Math.round(finalBank / 10000).toLocaleString() + "만원",
        insFinal: Math.round(finalIns / 10000).toLocaleString() + "만원",
        diff: Math.round((finalIns - finalBank) / 10000).toLocaleString() + "만원",
        bankRatio: ((finalBank / totalPay) * 100).toFixed(1) + "%"
      });
    } else if (activeTool === 'inflation') {
      // 물가 계산기: 현재 금액의 미래 가치 하락
      const futureVal = (calc.principal * 10000) / Math.pow(1 + (calc.inflationRate/100), calc.totalYears);
      setCalcResult({
        title: `${calc.totalYears}년 후 자산 가치`,
        val1: `현재 가치: ${calc.principal}만원`,
        val2: `미래 실질가치: ${Math.round(futureVal/10000).toLocaleString()}만원`,
        loss: `가치 하락분: ${Math.round((calc.principal * 10000 - futureVal)/10000).toLocaleString()}만원`
      });
    } else if (activeTool === 'compound') {
      // 복리 계산기: 목돈 일시납 거치
      const finalCompound = (calc.principal * 10000) * Math.pow(1 + (calc.bankRate/100), calc.totalYears);
      setCalcResult({
        title: `${calc.principal}만원 일시납 ${calc.totalYears}년 거치`,
        val1: `원금: ${calc.principal.toLocaleString()}만원`,
        val2: `복리 만기금: ${Math.round(finalCompound/10000).toLocaleString()}만원`,
        gain: `순수 수익: ${Math.round((finalCompound - calc.principal*10000)/10000).toLocaleString()}만원`
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900">
      
      {/* ─── 📟 사이드바 (날짜 숫자만 표시 스타일 적용) ───────────────── */}
      <aside className="hidden lg:flex w-80 bg-white border-r p-6 flex-col gap-6">
        <h2 className="text-2xl font-black italic border-b-4 border-black pb-1 uppercase">SIGNAL</h2>
        <div className="calendar-container border rounded-3xl overflow-hidden bg-slate-50 p-2 shadow-inner">
            <Calendar 
                onChange={(d: any) => setSelectedDate(d)} 
                value={selectedDate} 
                calendarType="gregory"
                formatDay={(locale, date) => date.getDate().toString()} // '일' 제거
            />
        </div>
        <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-[#d4af37] text-black py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase italic">Sales Tool</button>
      </aside>

      {/* ─── 💎 메인 섹션 ─────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-x-hidden">
        <header className="flex lg:hidden justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border mb-4">
            <h1 className="font-black italic text-xl">SIGNAL</h1>
            <button onClick={() => setIsBizToolOpen(true)} className="bg-black text-[#d4af37] px-4 py-2 rounded-xl text-xs font-black uppercase">Tools</button>
        </header>

        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border hidden lg:block">
              <h1 className="text-3xl font-black italic uppercase">{currentMonth}월 실적 및 활동 관리</h1>
          </div>

          {/* 활동 입력 섹션 */}
          <section className="bg-white p-6 lg:p-10 rounded-[3rem] border shadow-sm space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-black italic underline decoration-[#d4af37] decoration-4 uppercase">Daily Activity</h2>
                <button onClick={() => alert('저장되었습니다')} className="bg-black text-[#d4af37] px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95">Save</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ActivityMini label="전화" val={calls} color="bg-blue-50" />
                <ActivityMini label="만남" val={meets} color="bg-indigo-50" />
                <ActivityMini label="제안" val={pts} color="bg-purple-50" />
                <ActivityMini label="계약" val={contract} color="bg-emerald-50" />
            </div>
          </section>

          {/* 하단 공지/교육 확인 */}
          <section className="bg-slate-900 text-white p-8 rounded-[3rem] border-b-8 border-[#d4af37] shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                  <h3 className="text-[#d4af37] font-black text-xs uppercase tracking-widest mb-2 italic">Notice</h3>
                  <p className="text-slate-300 font-bold">{dailySpecialNote || "등록된 공지사항이 없습니다."}</p>
              </div>
              <button className="bg-white/10 hover:bg-white/20 px-6 py-4 rounded-2xl font-black text-sm uppercase italic border border-white/5 transition-all">I Checked Education</button>
          </section>
        </div>
      </main>

      {/* ─── 🧱 [모달: 상담용 계산기] ─────────────────── */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[1000] flex items-end lg:items-center justify-center">
            <div className="bg-white w-full lg:max-w-4xl h-[92vh] lg:h-[85vh] rounded-t-[3rem] lg:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
                <header className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-black italic uppercase">Sales Analysis</h2>
                    <button onClick={()=>{setIsBizToolOpen(false); setCalcResult(null);}} className="text-2xl font-black p-2">✕</button>
                </header>
                
                <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
                    <div className="flex lg:flex-col bg-slate-100 lg:w-56 overflow-x-auto scrollbar-hide border-b lg:border-r">
                        <ToolTab active={activeTool==='comparison'} label="적금 vs 보험" onClick={()=>setActiveTool('comparison')} />
                        <ToolTab active={activeTool==='inflation'} label="물가 계산기" onClick={()=>setActiveTool('inflation')} />
                        <ToolTab active={activeTool==='compound'} label="복리(일시납)" onClick={()=>setActiveTool('compound')} />
                    </div>
                    
                    <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-white">
                        <div className="max-w-md mx-auto space-y-6">
                            {activeTool === 'comparison' && (
                              <div className="space-y-4">
                                <CalcInput label="월 납입액 (만원)" unit="만" value={calc.principal} onChange={(v)=>setCalc({...calc, principal: v})} />
                                <div className="grid grid-cols-2 gap-4">
                                  <CalcInput label="납입 기간 (년)" unit="년" value={calc.payYears} onChange={(v)=>setCalc({...calc, payYears: v})} />
                                  <CalcInput label="총 기간 (년)" unit="년" value={calc.totalYears} onChange={(v)=>setCalc({...calc, totalYears: v})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <CalcInput label="은행 이율 (%)" unit="%" value={calc.bankRate} onChange={(v)=>setCalc({...calc, bankRate: v})} />
                                  <CalcInput label="보험 환급률 (%)" unit="%" value={calc.insReturnRate} onChange={(v)=>setCalc({...calc, insReturnRate: v})} />
                                </div>
                              </div>
                            )}

                            {activeTool === 'inflation' && (
                              <div className="space-y-4">
                                <CalcInput label="기준 금액 (만원)" unit="만" value={calc.principal} onChange={(v)=>setCalc({...calc, principal: v})} />
                                <CalcInput label="물가 상승률 (%)" unit="%" value={calc.inflationRate} onChange={(v)=>setCalc({...calc, inflationRate: v})} />
                                <CalcInput label="기간 (년)" unit="년" value={calc.totalYears} onChange={(v)=>setCalc({...calc, totalYears: v})} />
                              </div>
                            )}

                            {activeTool === 'compound' && (
                              <div className="space-y-4">
                                <CalcInput label="일시납 금액 (만원)" unit="만" value={calc.principal} onChange={(v)=>setCalc({...calc, principal: v})} />
                                <CalcInput label="거치 기간 (년)" unit="년" value={calc.totalYears} onChange={(v)=>setCalc({...calc, totalYears: v})} />
                                <CalcInput label="복리 이율 (%)" unit="%" value={calc.bankRate} onChange={(v)=>setCalc({...calc, bankRate: v})} />
                              </div>
                            )}

                            <button onClick={runCalculation} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl active:scale-95 transition-all">결과 보기</button>

                            {calcResult && (
                                <div className="mt-8 p-8 bg-slate-900 text-white rounded-[2.5rem] border-b-8 border-[#d4af37] shadow-2xl animate-in zoom-in duration-300">
                                    <p className="text-[10px] font-black text-[#d4af37] mb-4 uppercase tracking-widest">{calcResult.title}</p>
                                    {activeTool === 'comparison' ? (
                                      <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                          <span className="text-slate-400 font-bold">은행 (세후/환급률)</span>
                                          <span className="font-black">{calcResult.bankFinal} ({calcResult.bankRatio})</span>
                                        </div>
                                        <div className="flex justify-between items-center text-emerald-400">
                                          <span className="font-bold">보험 (비과세/환급률)</span>
                                          <span className="font-black">{calcResult.insFinal} ({calc.insReturnRate}%)</span>
                                        </div>
                                        <p className="text-center text-xs font-bold pt-4 text-slate-500 italic">은행보다 약 {calcResult.diff} 더 수령 가능</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-4 text-center">
                                        <p className="text-slate-400 font-bold">{calcResult.val1}</p>
                                        <p className="text-3xl font-black text-emerald-400">{calcResult.val2}</p>
                                        <p className="text-sm font-bold text-rose-400">{calcResult.loss || calcResult.gain}</p>
                                      </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
      )}

      <style jsx global>{`
        /* 달력 날짜 숫자만 표시 */
        .react-calendar__month-view__days__day { font-weight: 800 !important; color: #1e293b; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; }
        .react-calendar__navigation button { font-weight: 900 !important; text-transform: uppercase; }
        .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

// ─── 📦 [COMPONENTS] ──────────────────────────

function ActivityMini({ label, val, color }: any) {
    return (
        <div className={`${color} p-5 rounded-3xl text-center border shadow-sm`}>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className="text-2xl font-black">{val}</p>
        </div>
    )
}

function CalcInput({ label, unit, value, onChange }: any) {
    return (
        <div className="space-y-1 w-full">
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

function MemoBox({ label, value, onChange, readOnly, color }: any) {
  return (
    <div className={`${color} p-5 rounded-3xl border shadow-inner`}>
        <p className="text-[9px] font-black text-slate-400 mb-2 uppercase italic tracking-widest">{label}</p>
        <textarea readOnly={readOnly} value={value} onChange={onChange} className="w-full bg-transparent text-xs font-bold outline-none resize-none h-24 text-slate-700 leading-relaxed" placeholder="..." />
    </div>
  )
}