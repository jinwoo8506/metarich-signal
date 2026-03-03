"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPE DEFINITIONS] ──────────────────────────
interface Performance {
  year: number; month: number;
  contract_count: number;     // 현재 건수
  contract_amount: number;    // 현재 금액
  target_count: number;       // 목표 건수
  target_amount: number;      // 목표 금액
  call_count: number; 
  meet_count: number; 
  pt: number; 
  intro_count: number;
  db_assigned: number; 
  db_returned: number;
}
interface Agent {
  id: string; name: string; role: string;
  performances?: Performance[];
}

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'lumpSum'>('compare')

  // ─── [직원 전용 입력 상태] ──────────────────────
  const [myPerf, setMyPerf] = useState<Performance>({
    year: new Date().getFullYear(), month: new Date().getMonth() + 1,
    contract_count: 0, contract_amount: 0,
    target_count: 0, target_amount: 0,
    call_count: 0, meet_count: 0, pt: 0, intro_count: 0,
    db_assigned: 0, db_returned: 0
  })

  const [agents, setAgents] = useState<Agent[]>([])
  const currentMonth = selectedDate.getMonth() + 1

  // ─── 🔄 [데이터 로직] ──────────────────────────
  useEffect(() => { checkUser() }, [])
  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("id, name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setRole(userInfo.role); setUserName(userInfo.name)
    if (userInfo.role !== "agent") fetchAdminData()
    setLoading(false)
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, role, performances(*)`)
    if (data) setAgents(data as Agent[])
  }

  const formatKRW = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val)) + "원";

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic text-slate-400 animate-pulse uppercase tracking-widest">System Loading...</div>

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📟 사이드바 */}
      <aside className="w-full lg:w-[340px] bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-50">
        <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter">History</h2>
        <div className="minimal-calendar bg-slate-50 p-4 rounded-[2rem] border border-slate-100 shadow-inner scale-95 origin-top">
            <Calendar 
                onChange={(d: any) => setSelectedDate(d)} 
                value={selectedDate} 
                calendarType="gregory" 
                formatDay={(locale, date) => date.getDate().toString()}
            />
        </div>
        <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-black text-[#d4af37] py-5 rounded-3xl font-black text-sm uppercase shadow-xl hover:-translate-y-1 transition-all">Open Sales Calculator</button>
      </aside>

      {/* 💎 메인 대시보드 */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto w-full">
        <header className="flex justify-between items-end border-b-2 border-slate-200 pb-6">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{userName} Dashboard</p>
            <h1 className="text-4xl font-black uppercase italic">{currentMonth}월 실적 현황</h1>
          </div>
        </header>

        {/* ─── [직원 로그인 시: 입력 & 시각화] ─── */}
        {role === "agent" && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-widest">Amount Progress</h3>
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <InputUnit label="목표 금액" val={myPerf.target_amount} onChange={(v: number)=>setMyPerf({...myPerf, target_amount: v})} color="text-slate-400" />
                        <InputUnit label="현재 금액" val={myPerf.contract_amount} onChange={(v: number)=>setMyPerf({...myPerf, contract_amount: v})} color="text-indigo-600" />
                     </div>
                     <BigProgressBar label="금액 달성률" current={myPerf.contract_amount} target={myPerf.target_amount} color="bg-indigo-500" />
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-widest">Count Progress</h3>
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <InputUnit label="목표 건수" val={myPerf.target_count} onChange={(v: number)=>setMyPerf({...myPerf, target_count: v})} color="text-slate-400" />
                        <InputUnit label="현재 건수" val={myPerf.contract_count} onChange={(v: number)=>setMyPerf({...myPerf, contract_count: v})} color="text-emerald-500" />
                     </div>
                     <BigProgressBar label="건수 달성률" current={myPerf.contract_count} target={myPerf.target_count} color="bg-emerald-500" />
                  </div>
               </div>
            </div>

            {/* 활동 지표 1줄 배열 (md:grid-cols-6) */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
               <h3 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-widest">Activity Metrics</h3>
               <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <InputUnit label="전화" val={myPerf.call_count} onChange={(v: number)=>setMyPerf({...myPerf, call_count: v})} />
                  <InputUnit label="미팅" val={myPerf.meet_count} onChange={(v: number)=>setMyPerf({...myPerf, meet_count: v})} />
                  <InputUnit label="제안" val={myPerf.pt} onChange={(v: number)=>setMyPerf({...myPerf, pt: v})} />
                  <InputUnit label="도입" val={myPerf.intro_count} onChange={(v: number)=>setMyPerf({...myPerf, intro_count: v})} />
                  <InputUnit label="DB배정" val={myPerf.db_assigned} onChange={(v: number)=>setMyPerf({...myPerf, db_assigned: v})} color="text-blue-600" />
                  <InputUnit label="반품" val={myPerf.db_returned} onChange={(v: number)=>setMyPerf({...myPerf, db_returned: v})} color="text-rose-500" />
               </div>
               <button onClick={()=>alert('저장되었습니다.')} className="w-full mt-8 bg-black text-white py-5 rounded-2xl font-black uppercase hover:opacity-80 transition-all shadow-xl">Save All Data</button>
            </div>
          </div>
        )}

        {/* ─── [관리자 로그인 시: 시각적 모니터링] ─── */}
        {(role === "admin" || role === "master") && (
          <section className="space-y-8">
            <h2 className="text-xl font-black italic border-l-8 border-black pl-4 uppercase">Team Achievement Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {agents.filter(a => a.role === 'agent').map(a => {
                const p = a.performances?.[0] || myPerf;
                return (
                  <div key={a.id} className="bg-white p-8 rounded-[3rem] shadow-md border-2 border-transparent hover:border-black transition-all">
                    <div className="flex justify-between items-center mb-8">
                      <p className="text-2xl font-black uppercase tracking-tighter">{a.name} <span className="text-slate-300 text-sm italic italic tracking-normal ml-2">Performance</span></p>
                    </div>
                    <div className="space-y-6">
                      <AdminBarChart label="Sales Amount" current={p.contract_amount} target={p.target_amount} unit="원" color="bg-indigo-500" />
                      <AdminBarChart label="Contract Count" current={p.contract_count} target={p.target_count} unit="건" color="bg-emerald-500" />
                    </div>
                    <div className="grid grid-cols-6 gap-2 mt-8 pt-6 border-t border-slate-100">
                      <MiniStat label="CALL" val={p.call_count} />
                      <MiniStat label="MEET" val={p.meet_count} />
                      <MiniStat label="PT" val={p.pt} />
                      <MiniStat label="INTRO" val={p.intro_count} />
                      <MiniStat label="DB" val={p.db_assigned} color="text-blue-600" />
                      <MiniStat label="RET" val={p.db_returned} color="text-rose-500" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <style jsx global>{`
        .minimal-calendar .react-calendar { border: none !important; width: 100% !important; background: transparent !important; }
        .minimal-calendar .react-calendar__month-view__weekdays { display: none !important; }
        .minimal-calendar .react-calendar__tile { padding: 12px 8px !important; font-size: 13px; font-weight: 700; color: #94a3b8; }
        .minimal-calendar .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; }
      `}</style>
    </div>
  )
}

// ─── 📦 [SUB COMPONENTS - FIXED TYPES] ───────────────────────

function InputUnit({ label, val, onChange, color }: { label: string, val: number | undefined, onChange: (v: number) => void, color?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
      <input type="number" value={val || 0} onChange={(e)=>onChange(Number(e.target.value))} 
        className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl font-black text-center text-lg outline-none transition-all ${color}`} />
    </div>
  )
}

function BigProgressBar({ label, current, target, color }: { label: string, current: number, target: number, color: string }) {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[11px] font-black uppercase text-slate-400">{label}</span>
        <span className="text-2xl font-black italic">{percent.toFixed(1)}%</span>
      </div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function AdminBarChart({ label, current, target, unit, color }: { label: string, current: number, target: number, unit: string, color: string }) {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-900">{current.toLocaleString()}{unit} / {target.toLocaleString()}{unit}</span>
      </div>
      <div className="relative w-full h-8 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
        <div className={`absolute h-full ${color} opacity-20 transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }} />
        <div className={`absolute h-full ${color} w-1.5 top-0 transition-all duration-1000 ease-out`} style={{ left: `${percent}%`, marginLeft: '-1.5px' }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black italic tracking-wider">{percent.toFixed(1)}%</span>
      </div>
    </div>
  )
}

function MiniStat({ label, val, color }: { label: string, val: number, color?: string }) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-black text-slate-300 uppercase mb-1">{label}</p>
      <p className={`text-xs font-black ${color || 'text-slate-800'}`}>{val}</p>
    </div>
  )
}