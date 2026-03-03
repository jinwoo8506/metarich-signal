"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPE DEFINITIONS] ──────────────────────────
interface Performance {
  year: number; month: number;
  contract_count?: number; contract_amount?: number;
  ap?: number; pt?: number; call_count?: number;
  meet_count?: number; intro_count?: number;
  recruit_count?: number;
  db_assigned?: number; // DB 배정 건수
  db_returned?: number; // DB 반품 건수
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

  // ─── [상태 관리] ──────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("") 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'lumpSum'>('compare')

  const [teamGoal, setTeamGoal] = useState({ amount: 5000, count: 100 })
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  // ─── [계산기 데이터] ──────────────────
  const [calcInputs, setCalcInputs] = useState({
    monthlyPay: 500000,
    savingsYear: 5,
    savingsRate: 3.5,
    depositRate: 4.0,
    insurRefundRate: 125.0,
    inflationBase: 10000000,
    inflationRate: 3.0,
    lumpSumAmount: 50000000,
    lumpSumRate: 4.5,
    lumpSumYear: 10
  });

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1

  // ─── 🔄 [데이터 로직] ──────────────────────────
  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    
    setUserId(session.user.id)
    setRole(userInfo.role)
    setUserName(userInfo.name)
    
    if (userInfo.role === "admin" || userInfo.role === "master") fetchAdminData()
    setLoading(false)
  }

  async function fetchDailyData(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const { data: note } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).maybeSingle()
    const { data: myMemo } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(note?.admin_notice || ""); setPersonalMemo(myMemo?.agent_memo || "")
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, role, performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  const totalStats = useMemo(() => {
    return agents.reduce((acc, a) => {
      const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
      if (p) {
        acc.contracts += (p.contract_count || 0); acc.amounts += (p.contract_amount || 0);
      }
      return acc;
    }, { contracts: 0, amounts: 0 });
  }, [agents, currentYear, currentMonth]);

  const toolResults = useMemo(() => {
    const { monthlyPay, savingsYear, savingsRate, depositRate, insurRefundRate, inflationBase, inflationRate, lumpSumAmount, lumpSumRate, lumpSumYear } = calcInputs;
    const totalPrincipal = monthlyPay * 12 * savingsYear;
    const depositYear = 10 - savingsYear;
    let sInt = 0; for(let i=1; i<=savingsYear*12; i++) sInt += monthlyPay * (savingsRate/100) * (i/12);
    const bankFinal = ((totalPrincipal + sInt) * Math.pow(1 + (depositRate/100), depositYear)) - ((sInt * 0.154));
    const insurFinal = totalPrincipal * (insurRefundRate / 100);
    const futVal = inflationBase * Math.pow(1 + (inflationRate/100), 10);
    const lsFinal = lumpSumAmount * Math.pow(1 + (lumpSumRate/100), lumpSumYear);
    return { bankFinal, insurFinal, totalPrincipal, futVal, lsFinal, lsInt: lsFinal - lumpSumAmount };
  }, [calcInputs]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse italic">SYSTEM LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📟 사이드바 */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-80 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 overflow-y-auto`}>
        <div className="flex justify-between items-center">
            <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase">History</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">✕</button>
        </div>
        
        <div className="border rounded-3xl overflow-hidden shadow-inner bg-slate-50 p-2 calendar-clean">
            <Calendar 
              onChange={(d: any) => setSelectedDate(d)} 
              value={selectedDate} 
              calendarType="gregory" 
              formatDay={(locale, date) => date.getDate().toString()}
              className="border-0 w-full bg-transparent" 
            />
        </div>

        <div className="space-y-4">
            <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} readOnly={role === 'agent'} color="bg-blue-50" />
            <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e: any)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
            <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-[#d4af37] text-black py-5 rounded-2xl font-black text-sm uppercase shadow-lg">Financial Tool</button>
        </div>
      </aside>

      {/* 💎 메인 섹션 */}
      <main className="flex-1 p-4 lg:p-8 space-y-8">
        {/* 퀵링크: 4개로 확장 */}
        <section className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickLink label="메타온" href="https://metaon.metarich.co.kr" />
            <QuickLink label="보험사 연합" href="#" />
            <QuickLink label="보험금 청구" href="#" color="bg-indigo-600 text-white" />
            <QuickLink label="영업 자료실" href="#" />
        </section>

        <header className="bg-white p-8 lg:p-12 rounded-[3.5rem] shadow-sm border flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            {/* 로그인 정보 표기 개선: 이름 + 직책 */}
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">
               User: <span className="text-black">{userName}</span> 
               <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-[11px] border">
                 {role === 'agent' ? '설계사' : '관리자'}
               </span>
            </p>
            <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tighter">{currentMonth}월 성과 모니터링</h1>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-6 py-3 border-2 border-black rounded-2xl text-xs font-black hover:bg-black hover:text-[#d4af37] transition-all uppercase tracking-tighter">Logout System</button>
        </header>

        {/* 팀 모니터링: DB 배정/반품 정보 포함 */}
        <section className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black italic mb-8 border-l-8 border-black pl-5 uppercase">Team Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(a => {
               const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
               return (
                 <div key={a.id} onClick={() => setSelectedAgent(a)} className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 transition-all cursor-pointer shadow-sm hover:border-black group relative overflow-hidden">
                   <div className="flex justify-between items-start mb-6">
                      <p className="font-black text-2xl uppercase italic">{a.name} CA</p>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                         <p className="text-xs font-black text-emerald-500 uppercase">Online</p>
                      </div>
                   </div>
                   
                   {/* 활동 데이터 영역 */}
                   <div className="grid grid-cols-2 gap-3 mb-6">
                      <ActivityMini label="CALL" val={p?.call_count || 0} />
                      <ActivityMini label="MEET" val={p?.meet_count || 0} />
                      <ActivityMini label="PT" val={p?.pt || 0} />
                      <ActivityMini label="INTRO" val={p?.intro_count || 0} />
                   </div>

                   {/* DB 관리 영역: 배정 및 반품 (관리자 핵심 지표) */}
                   <div className="bg-slate-50 p-5 rounded-3xl border border-dashed flex justify-between items-center">
                      <div className="text-center flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">DB 배정</p>
                        <p className="text-lg font-black text-indigo-600">{p?.db_assigned || 0}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="text-center flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">DB 반품</p>
                        <p className="text-lg font-black text-rose-500">{p?.db_returned || 0}</p>
                      </div>
                   </div>
                 </div>
               )
            })}
          </div>
        </section>
      </main>

      {/* 🧱 [SALES TOOLS MODAL] */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[800] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl rounded-[3rem] h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Financial Simulator</h2>
                    <button onClick={() => setIsBizToolOpen(false)} className="text-3xl font-black">✕</button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-20 lg:w-48 bg-slate-100 border-r flex flex-col">
                        <ToolTab active={activeTool === 'compare'} label="은행 vs 보험" onClick={()=>setActiveTool('compare')} />
                        <ToolTab active={activeTool === 'inflation'} label="인플레이션" onClick={()=>setActiveTool('inflation')} />
                        <ToolTab active={activeTool === 'lumpSum'} label="목돈 거치" onClick={()=>setActiveTool('lumpSum')} />
                    </aside>
                    <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                        {activeTool === 'compare' && (
                          <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="bg-slate-50 p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-2 gap-8">
                                <CalcInput label="월 납입액" unit="원" value={calcInputs.monthlyPay} onChange={(v)=>setCalcInputs({...calcInputs, monthlyPay: v})} />
                                <div className="grid grid-cols-2 gap-4">
                                  <CalcInput label="납입 기간" unit="년" value={calcInputs.savingsYear} onChange={(v)=>setCalcInputs({...calcInputs, savingsYear: v})} />
                                  <CalcInput label="보험 환급률" unit="%" value={calcInputs.insurRefundRate} onChange={(v)=>setCalcInputs({...calcInputs, insurRefundRate: v})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="border-2 p-10 rounded-[3.5rem] flex flex-col justify-between">
                                    <p className="text-xs font-black text-slate-400 uppercase mb-6">Bank Result (10Y)</p>
                                    <p className="text-5xl font-black">{Math.floor(toolResults.bankFinal).toLocaleString()}원</p>
                                </div>
                                <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] flex flex-col justify-between border-t-[12px] border-[#d4af37]">
                                    <p className="text-xs font-black text-[#d4af37] uppercase mb-6">Insurance Result (10Y)</p>
                                    <p className="text-6xl font-black text-[#d4af37]">{Math.floor(toolResults.insurFinal).toLocaleString()}원</p>
                                </div>
                            </div>
                          </div>
                        )}
                        {/* 인플레이션 / 목돈 거치 섹션 생략 (이전 코드와 로직 동일) */}
                    </main>
                </div>
            </div>
        </div>
      )}

      <style jsx global>{`
        /* 전체적인 폰트 크기 상향 조정 */
        body { font-size: 16px; }
        .text-[10px] { font-size: 12px !important; }
        .text-[8px] { font-size: 11px !important; }
        .text-xs { font-size: 13px !important; }
        
        .react-calendar { border: none !important; width: 100% !important; border-radius: 24px; font-family: inherit !important; padding: 10px; }
        .react-calendar__month-view__weekdays { display: none !important; }
        .react-calendar__tile { padding: 18px 5px !important; font-size: 15px; font-weight: 800; color: #94a3b8; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 16px; transform: scale(1.1); }
      `}</style>
    </div>
  )
}

// ─── 📦 [REUSABLE COMPONENTS] ──────────────────────────

function QuickLink({ label, href, color }: any) {
    return (
        <a href={href} className={`${color || 'bg-white text-slate-900'} border-2 border-black text-center py-5 rounded-2xl font-black text-sm shadow-sm hover:scale-[1.02] transition-all uppercase`}>
            {label}
        </a>
    )
}

function ActivityMini({ label, val }: { label:string, val:number }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</span>
            <span className="text-base font-black text-slate-800">{val}</span>
        </div>
    )
}

function CalcInput({ label, unit, value, onChange }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-black ml-4 uppercase text-slate-400 tracking-tighter">{label}</label>
            <div className="relative">
                <input type="number" value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full p-5 bg-white border-2 border-slate-200 rounded-3xl font-black text-2xl outline-none focus:border-black transition-all" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black uppercase text-xs text-slate-300">{unit}</span>
            </div>
        </div>
    )
}

function ToolTab({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`p-8 text-xs font-black uppercase transition-all ${active ? 'bg-white text-black border-r-4 border-black shadow-sm':'text-slate-400 hover:bg-slate-50'}`}>
            {label}
        </button>
    )
}

function MemoBox({ label, value, onChange, readOnly, color }: any) {
  return (
    <div className={`${color} p-6 rounded-[2rem] border shadow-sm`}>
        <p className="text-[10px] font-black text-slate-400 mb-3 uppercase italic tracking-widest">{label}</p>
        <textarea readOnly={readOnly} value={value} onChange={onChange} className="w-full bg-transparent text-sm font-bold outline-none resize-none h-24 text-slate-700 leading-relaxed" placeholder="..." />
    </div>
  )
}