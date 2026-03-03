"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPES] ──────────────────────────────────
interface Performance {
  year: number; month: number;
  contract_count?: number; contract_amount?: number;
  call_count?: number; meet_count?: number; pt?: number; intro_count?: number;
  db_assigned?: number; db_returned?: number;
}
interface Agent {
  id: string; name: string; role: string;
  performances?: Performance[];
}

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // ─── [UI States] ────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("") 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // 팝업 및 계산기 상태
  const [activeAdminPopup, setActiveAdminPopup] = useState<'perf' | 'act' | 'edu' | 'setting' | null>(null)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'lumpSum'>('compare')

  // 데이터 상태
  const [agents, setAgents] = useState<Agent[]>([])
  const [eduChecklist, setEduChecklist] = useState([
    { id: 1, text: "1주차: 신상품 화법 숙지", done: false },
    { id: 2, text: "2주차: 약관 주요 개정사항 확인", done: false },
    { id: 3, text: "3주차: 거절 처리 시나리오 연습", done: false },
  ])

  // ─── [직원 실적 입력 상태] ──────────────────────
  const [myPerf, setMyPerf] = useState<Performance>({
    year: new Date().getFullYear(), month: new Date().getMonth() + 1,
    call_count: 0, meet_count: 0, pt: 0, intro_count: 0,
    contract_count: 0, contract_amount: 0, db_assigned: 0, db_returned: 0
  })

  // ─── [계산기 데이터 세분화] ──────────────────────
  const [calcCompare, setCalcCompare] = useState({ pay: 500000, year: 5, rate: 125 });
  const [calcInflation, setCalcInflation] = useState({ currentVal: 100000000, year: 20, rate: 3 });
  const [calcLumpSum, setCalcLumpSum] = useState({ amount: 50000000, year: 10, rate: 4 });

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1

  useEffect(() => { checkUser() }, [])
  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("id, name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setUserId(userInfo.id); setRole(userInfo.role); setUserName(userInfo.name)
    if (userInfo.role !== "agent") fetchAdminData()
    setLoading(false)
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, role, performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  const handlePerfSubmit = () => {
    alert("오늘의 실적이 저장되었습니다.");
    // 실제 구현 시 supabase.from('performances').upsert(...) 로직 추가
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic">LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📟 사이드바 (밸런스 조정) */}
      <aside className="w-full lg:w-[340px] bg-white border-r p-6 flex flex-col gap-8 shadow-sm">
        <div className="flex justify-between items-center px-2">
            <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter">Plan & Memo</h2>
        </div>
        
        {/* 달력: 숫자만 강조 */}
        <div className="minimal-calendar bg-slate-50 p-4 rounded-[2rem] border border-slate-100 shadow-inner scale-95 origin-top">
            <Calendar 
                onChange={(d: any) => setSelectedDate(d)} 
                value={selectedDate} 
                calendarType="gregory" 
                formatDay={(locale, date) => date.getDate().toString()}
                className="border-0 w-full bg-transparent" 
            />
        </div>

        <div className="space-y-4 flex-1">
            <MemoBox label="NOTICE" value={dailySpecialNote} readOnly={role === 'agent'} color="bg-indigo-50/50" />
            <MemoBox label="MY WORK" value={personalMemo} onChange={(e: any)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
            <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-black text-[#d4af37] py-5 rounded-3xl font-black text-sm uppercase shadow-xl hover:-translate-y-1 transition-all">Sales Calculator</button>
        </div>
      </aside>

      {/* 💎 메인 대시보드 */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 max-w-[1400px] mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b-2 border-slate-200 pb-6">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{userName} Dashboard</p>
            <h1 className="text-4xl font-black uppercase italic leading-none">{currentMonth}월 성과 모니터링</h1>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-6 py-2 bg-slate-100 rounded-full text-[11px] font-black hover:bg-rose-500 hover:text-white transition-all uppercase">Logout</button>
        </header>

        {/* ─── [직원 로그인 시 전용 입력란] ─── */}
        {role === "agent" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* 1. 실적 입력 탭 */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
               <h2 className="text-xl font-black italic border-l-8 border-black pl-4 uppercase">Daily Activity Input</h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InputUnit label="콜(Call)" val={myPerf.call_count} onChange={(v)=>setMyPerf({...myPerf, call_count: v})} />
                  <InputUnit label="미팅" val={myPerf.meet_count} onChange={(v)=>setMyPerf({...myPerf, meet_count: v})} />
                  <InputUnit label="PT" val={myPerf.pt} onChange={(v)=>setMyPerf({...myPerf, pt: v})} />
                  <InputUnit label="도입" val={myPerf.intro_count} onChange={(v)=>setMyPerf({...myPerf, intro_count: v})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <InputUnit label="DB 배정" val={myPerf.db_assigned} onChange={(v)=>setMyPerf({...myPerf, db_assigned: v})} />
                  <InputUnit label="DB 반품" val={myPerf.db_returned} onChange={(v)=>setMyPerf({...myPerf, db_returned: v})} color="text-rose-500" />
               </div>
               <button onClick={handlePerfSubmit} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase hover:bg-black transition-all">실적 저장하기</button>
            </div>

            {/* 2. 교육 숙지 체크리스트 */}
            <div className="bg-[#1a1a1a] p-8 rounded-[3rem] shadow-xl text-white space-y-6">
               <h2 className="text-xl font-black italic border-l-8 border-[#d4af37] pl-4 uppercase text-[#d4af37]">Education Check</h2>
               <div className="space-y-3">
                  {eduChecklist.map(item => (
                    <div key={item.id} onClick={() => setEduChecklist(eduChecklist.map(i => i.id === item.id ? {...i, done: !i.done} : i))}
                      className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border transition-all ${item.done ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${item.done ? 'bg-[#d4af37] border-[#d4af37]' : 'border-white/30'}`}>
                        {item.done && <span className="text-black text-xs font-black">✓</span>}
                      </div>
                      <span className={`font-bold text-sm ${item.done ? 'text-[#d4af37] line-through opacity-70' : 'text-white'}`}>{item.text}</span>
                    </div>
                  ))}
               </div>
               <p className="text-[10px] text-white/40 font-bold text-center uppercase tracking-tighter">* 모든 항목을 숙지한 후 체크해주시기 바랍니다.</p>
            </div>
          </div>
        )}

        {/* ─── [관리자 로그인 시 모니터링] ─── */}
        {(role === "admin" || role === "master") && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black italic border-l-8 border-black pl-4 uppercase">Team Monitoring</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {agents.map(a => {
                const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
                return (
                  <div key={a.id} className="bg-white p-7 rounded-[2.5rem] border-2 border-transparent hover:border-black transition-all shadow-sm">
                    <p className="font-black text-xl mb-4 uppercase">{a.name} <span className="text-slate-300 ml-1">Agent</span></p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <StatBox label="DB배정" val={p?.db_assigned || 0} />
                        <StatBox label="DB반품" val={p?.db_returned || 0} color="text-rose-500" />
                    </div>
                    <div className="space-y-2">
                      <MiniProgress label="CALL" val={p?.call_count || 0} max={50} color="bg-indigo-500" />
                      <MiniProgress label="MEET" val={p?.meet_count || 0} max={20} color="bg-amber-500" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* ─── 🧱 [MODALS] ────────────────────────────────── */}

      {/* 영업 계산기 - 3종 개별 구성 */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Sales Strategy Calculator</h2>
                    <button onClick={() => setIsBizToolOpen(false)} className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full font-black">✕</button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-24 lg:w-56 bg-slate-100 border-r flex flex-col">
                        <ToolTab active={activeTool === 'compare'} label="은행 vs 보험" onClick={()=>setActiveTool('compare')} />
                        <ToolTab active={activeTool === 'inflation'} label="인플레이션" onClick={()=>setActiveTool('inflation')} />
                        <ToolTab active={activeTool === 'lumpSum'} label="목돈 거치" onClick={()=>setActiveTool('lumpSum')} />
                    </aside>
                    <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
                        {activeTool === 'compare' && (
                          <div className="space-y-8 animate-in fade-in duration-500">
                             <h3 className="text-xl font-black uppercase underline decoration-[#d4af37] decoration-4 underline-offset-4 mb-6">은행 적금 vs 보험 환급률 비교</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CalcInput label="월 납입액" unit="원" value={calcCompare.pay} onChange={(v: number)=>setCalcCompare({...calcCompare, pay: v})} />
                                <CalcInput label="납입 기간" unit="년" value={calcCompare.year} onChange={(v: number)=>setCalcCompare({...calcCompare, year: v})} />
                                <CalcInput label="보험 환급률" unit="%" value={calcCompare.rate} onChange={(v: number)=>setCalcCompare({...calcCompare, rate: v})} />
                             </div>
                             <div className="bg-black text-[#d4af37] p-10 rounded-[3rem] text-center">
                                <p className="text-xs font-black mb-2 uppercase opacity-60">예상 보험 환급금</p>
                                <p className="text-5xl font-black">{(calcCompare.pay * 12 * calcCompare.year * (calcCompare.rate/100)).toLocaleString()}원</p>
                             </div>
                          </div>
                        )}
                        {activeTool === 'inflation' && (
                          <div className="space-y-8 animate-in fade-in duration-500">
                             <h3 className="text-xl font-black uppercase underline decoration-rose-500 decoration-4 underline-offset-4 mb-6">화폐 가치 하락 계산 (물가상승)</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CalcInput label="현재 자산 가치" unit="원" value={calcInflation.currentVal} onChange={(v: number)=>setCalcInflation({...calcInflation, currentVal: v})} />
                                <CalcInput label="경과 기간" unit="년" value={calcInflation.year} onChange={(v: number)=>setCalcInflation({...calcInflation, year: v})} />
                                <CalcInput label="평균 물가상승률" unit="%" value={calcInflation.rate} onChange={(v: number)=>setCalcInflation({...calcInflation, rate: v})} />
                             </div>
                             <div className="bg-rose-600 text-white p-10 rounded-[3rem] text-center">
                                <p className="text-xs font-black mb-2 uppercase opacity-60">{calcInflation.year}년 후 실질 화폐 가치</p>
                                <p className="text-5xl font-black">{(calcInflation.currentVal / Math.pow(1 + calcInflation.rate/100, calcInflation.year)).toLocaleString(undefined, {maximumFractionDigits:0})}원</p>
                             </div>
                          </div>
                        )}
                        {activeTool === 'lumpSum' && (
                          <div className="space-y-8 animate-in fade-in duration-500">
                             <h3 className="text-xl font-black uppercase underline decoration-indigo-500 decoration-4 underline-offset-4 mb-6">목돈 일시거치 이자 계산 (복리)</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CalcInput label="거치 금액" unit="원" value={calcLumpSum.amount} onChange={(v: number)=>setCalcLumpSum({...calcLumpSum, amount: v})} />
                                <CalcInput label="거치 기간" unit="년" value={calcLumpSum.year} onChange={(v: number)=>setCalcLumpSum({...calcLumpSum, year: v})} />
                                <CalcInput label="연 복리 이율" unit="%" value={calcLumpSum.rate} onChange={(v: number)=>setCalcLumpSum({...calcLumpSum, rate: v})} />
                             </div>
                             <div className="bg-indigo-700 text-white p-10 rounded-[3rem] text-center">
                                <p className="text-xs font-black mb-2 uppercase opacity-60">만기 시 수령 금액 (세전)</p>
                                <p className="text-5xl font-black">{(calcLumpSum.amount * Math.pow(1 + calcLumpSum.rate/100, calcLumpSum.year)).toLocaleString(undefined, {maximumFractionDigits:0})}원</p>
                             </div>
                          </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
      )}

      {/* ─── [Styles] ──────────────────────────────────── */}
      <style jsx global>{`
        .minimal-calendar .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; background: transparent !important; }
        .minimal-calendar .react-calendar__navigation { margin-bottom: 10px; }
        .minimal-calendar .react-calendar__navigation button { font-weight: 900; color: black; font-size: 14px; }
        .minimal-calendar .react-calendar__month-view__weekdays { display: none !important; }
        .minimal-calendar .react-calendar__tile { padding: 12px 8px !important; font-size: 13px; font-weight: 600; color: #94a3b8; }
        .minimal-calendar .react-calendar__tile--now { background: #e2e8f0 !important; border-radius: 12px; color: black; }
        .minimal-calendar .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; font-weight: 900; }
      `}</style>
    </div>
  )
}

// ─── 📦 [COMPONENTS] ──────────────────────────────────

function InputUnit({ label, val, onChange, color }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{label}</label>
      <input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} 
        className={`w-full p-4 bg-slate-50 border rounded-2xl font-black text-center text-lg outline-none focus:border-black ${color}`} />
    </div>
  )
}

function StatBox({ label, val, color }: any) {
  return (
    <div className="bg-slate-50 p-3 rounded-2xl text-center">
      <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
      <p className={`text-sm font-black ${color || 'text-slate-900'}`}>{val}</p>
    </div>
  )
}

function ToolTab({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`p-8 text-[11px] font-black uppercase transition-all leading-tight border-b border-slate-200/50 ${active ? 'bg-white text-black border-r-8 border-black shadow-sm':'text-slate-400 hover:bg-slate-50'}`}>
            {label}
        </button>
    )
}

function CalcInput({ label, unit, value, onChange }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400 tracking-widest">{label}</label>
            <div className="relative">
                <input type="number" value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-2xl outline-none focus:border-black transition-all" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase text-sm">{unit}</span>
            </div>
        </div>
    )
}

function MiniProgress({ label, val, max, color }: any) {
  const rate = Math.min((val / (max || 1)) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-black mb-1 uppercase">
        <span className="text-slate-400">{label}</span>
        <span>{val}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}

function MemoBox({ label, value, onChange, readOnly, color }: any) {
  return (
    <div className={`${color} p-6 rounded-[2rem] border border-slate-100 shadow-sm`}>
        <p className="text-[10px] font-black text-slate-400 mb-3 uppercase italic tracking-widest">{label}</p>
        <textarea readOnly={readOnly} value={value} onChange={onChange} className="w-full bg-transparent text-xs font-bold outline-none resize-none h-28 text-slate-700 leading-relaxed" placeholder="..." />
    </div>
  )
}