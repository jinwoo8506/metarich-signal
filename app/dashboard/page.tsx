"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPE DEFINITIONS] ──────────────────────────
interface Agent {
  id: string; name: string;
  performances?: any[];
}

export default function IntegratedDashboard() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // ─── [상태 관리] ──────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("") // 개인 메모
  const [adminNotice, setAdminNotice] = useState("이번 달 목표 달성을 위해 화이팅합시다!") // 관리자 코멘트
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // 관리자 팝업 및 도구 상태
  const [activeAdminPopup, setActiveAdminPopup] = useState<string | null>(null)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])

  // 직원용 지표 입력 상태
  const [perfInput, setPerfInput] = useState({
    target_amt: 0, current_amt: 0, target_cnt: 0, current_cnt: 0,
    call: 0, meet: 0, pt: 0, intro: 0, db: 0, ret: 0
  })

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("id, name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    
    setRole(userInfo.role); setUserName(userInfo.name)
    if (userInfo.role === "admin" || userInfo.role === "master") {
      const { data } = await supabase.from("users").select(`id, name, performances(*)`).eq("role", "agent")
      if (data) setAgents(data)
    }
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse italic uppercase">System Connecting...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* ─── 📟 [사이드바] (달력 + 계산기 + 코멘트 + 메모) ─────────────────── */}
      <aside className={`fixed lg:relative inset-y-0 left-0 w-80 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 shadow-sm ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter">History</h2>
        
        {/* 1. 숫자만 있는 달력 */}
        <div className="border border-slate-100 rounded-3xl overflow-hidden bg-white p-2 shadow-sm">
          <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full" formatDay={(locale, date) => date.getDate().toString()} />
        </div>

        {/* 2. 영업 계산기 버튼 */}
        <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] transition-all">
          Open Sales Calculator
        </button>

        {/* 3. 관리자용 코멘트 (관리자만 수정 가능) */}
        <MemoBox 
            label="Admin Comment" 
            value={adminNotice} 
            onChange={(e: any) => setAdminNotice(e.target.value)} 
            readOnly={role === 'agent'} 
            color="bg-blue-50/50" 
            placeholder={role === 'agent' ? "관리자 코멘트가 없습니다." : "직원들에게 전달할 메시지를 입력하세요."}
        />

        {/* 4. 개인 메모용 (누구나 수정 가능) */}
        <MemoBox 
            label="Personal Memo" 
            value={personalMemo} 
            onChange={(e: any) => setPersonalMemo(e.target.value)} 
            color="bg-slate-50" 
            placeholder="나만의 메모를 남기세요."
        />
      </aside>

      {/* ─── 💎 [메인 영역] ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-10 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* 상단 퀵링크 4개 (보험금청구 추가) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickLink label="메타온" href="https://metaon.metarich.co.kr" />
          <QuickLink label="보험사" href="#" />
          <QuickLink label="보험금청구" href="#" />
          <QuickLink label="자료실" href="#" />
        </div>

        {/* 전체 공지사항 (상단 배치) */}
        <section className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-lg flex items-center gap-6 overflow-hidden relative">
            <div className="bg-[#d4af37] text-black px-4 py-1 rounded-full text-[10px] font-black uppercase italic animate-bounce">Notice</div>
            <marquee className="font-bold text-sm tracking-tight">
                {adminNotice || "공지사항이 없습니다. 이번 달 주요 전달 사항을 확인해 주세요."}
            </marquee>
        </section>

        {/* 타이틀 & 로그아웃 */}
        <header className="flex justify-between items-center px-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{userName}님 반가워요!</p>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Dashboard</h1>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-5 py-2 border-2 border-black rounded-xl text-[10px] font-black hover:bg-black hover:text-[#d4af37] transition-all">LOGOUT</button>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* 👮 [관리자 전용 화면] */}
        {/* ---------------------------------------------------------------- */}
        {(role === "admin" || role === "master") && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="팀 금액 달성" val="72%" color="text-black" />
              <SummaryCard label="팀 건수 달성" val="85%" color="text-blue-600" />
              <SummaryCard label="팀 도입 현황" val="3건" color="text-[#d4af37]" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MainTabBtn label="실적 관리" onClick={()=>setActiveAdminPopup('perf')} />
              <MainTabBtn label="활동 관리" onClick={()=>setActiveAdminPopup('act')} />
              <MainTabBtn label="교육 관리" onClick={()=>setActiveAdminPopup('edu')} />
              <MainTabBtn label="시스템 설정" onClick={()=>setActiveAdminPopup('setting')} />
            </div>

            <section className="space-y-4">
              <h2 className="text-xl font-black italic border-l-8 border-black pl-4 uppercase">Team Monitoring</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {agents.map(a => (
                  <div key={a.id} className="bg-white p-6 rounded-[2.5rem] border hover:border-black transition-all shadow-sm">
                    <p className="font-black text-lg mb-4">{a.name} CA</p>
                    <div className="space-y-3">
                       <MiniProgress label="금액" val={45} max={100} color="bg-black" />
                       <MiniProgress label="건수" val={8} max={10} color="bg-[#d4af37]" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 👤 [직원 전용 화면] */}
        {/* ---------------------------------------------------------------- */}
        {role === "agent" && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <AgentProgressBox label="Amount" unit="만" cur={perfInput.current_amt} tar={perfInput.target_amt} 
                onCur={(v)=>setPerfInput({...perfInput, current_amt:v})} onTar={(v)=>setPerfInput({...perfInput, target_amt:v})} color="text-indigo-600" />
              <AgentProgressBox label="Count" unit="건" cur={perfInput.current_cnt} tar={perfInput.target_cnt} 
                onCur={(v)=>setPerfInput({...perfInput, current_cnt:v})} onTar={(v)=>setPerfInput({...perfInput, target_cnt:v})} color="text-emerald-500" />
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <h3 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-widest italic">Activity Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <AgentInput label="전화" val={perfInput.call} onChange={(v)=>setPerfInput({...perfInput, call:v})} />
                <AgentInput label="미팅" val={perfInput.meet} onChange={(v)=>setPerfInput({...perfInput, meet:v})} />
                <AgentInput label="제안" val={perfInput.pt} onChange={(v)=>setPerfInput({...perfInput, pt:v})} />
                <AgentInput label="도입" val={perfInput.intro} onChange={(v)=>setPerfInput({...perfInput, intro:v})} />
                <AgentInput label="DB배정" val={perfInput.db} onChange={(v)=>setPerfInput({...perfInput, db:v})} color="text-blue-600" />
                <AgentInput label="반품" val={perfInput.ret} onChange={(v)=>setPerfInput({...perfInput, ret:v})} color="text-rose-500" />
              </div>
              <button className="w-full mt-10 bg-black text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl">Save Data</button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 10px; font-weight: 900; }
        .react-calendar__month-view__days__day { font-size: 0.8rem; font-weight: 700; }
      `}</style>
    </div>
  )
}

// ─── 📦 [COMPONENTS] ──────────────────────────

function QuickLink({ label, href }: any) {
  return (
    <a href={href} className="bg-white border-2 border-black text-center py-4 rounded-2xl font-black text-[11px] shadow-sm hover:bg-black hover:text-[#d4af37] transition-all uppercase">{label}</a>
  )
}

function MemoBox({ label, value, onChange, readOnly, color, placeholder }: any) {
  return (
    <div className={`${color} p-5 rounded-3xl border shadow-sm`}>
        <div className="flex justify-between items-center mb-2">
            <p className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">{label}</p>
            {readOnly && <span className="text-[8px] font-black text-blue-400 uppercase">ReadOnly</span>}
        </div>
        <textarea 
            readOnly={readOnly} 
            value={value} 
            onChange={onChange} 
            className="w-full bg-transparent text-xs font-bold outline-none resize-none h-20 text-slate-700 leading-relaxed" 
            placeholder={placeholder} 
        />
    </div>
  )
}

function SummaryCard({ label, val, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border text-center shadow-sm">
      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{val}</p>
    </div>
  )
}

function MainTabBtn({ label, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-white border-2 border-black py-4 rounded-2xl text-[11px] font-black uppercase hover:bg-black hover:text-[#d4af37] transition-all">
      {label}
    </button>
  )
}

function MiniProgress({ label, val, max, color }: any) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-[8px] font-black mb-1 uppercase text-slate-400">
        <span>{label}</span>
        <span>{val}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${(val/max)*100}%` }} />
      </div>
    </div>
  )
}

function AgentInput({ label, val, onChange, color }: any) {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-300 uppercase ml-2">{label}</label>
        <input type="number" value={val || ''} onChange={(e)=>onChange(Number(e.target.value))} 
          className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl font-black text-center text-xl outline-none transition-all ${color}`} />
      </div>
    )
}

function AgentProgressBox({ label, unit, cur, tar, onCur, onTar, color }: any) {
    const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
    return (
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label} Progress</p>
        <div className="grid grid-cols-2 gap-4">
          <input type="number" value={tar || ''} onChange={(e)=>onTar(Number(e.target.value))} placeholder="목표" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center text-lg outline-none" />
          <input type="number" value={cur || ''} onChange={(e)=>onCur(Number(e.target.value))} placeholder="현재" className={`w-full p-4 bg-slate-50 rounded-2xl font-black text-center text-lg outline-none ${color}`} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-end font-black">
            <span className="text-[9px] text-slate-400 uppercase">{unit} 달성률</span>
            <span className="text-3xl italic">{pct.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    )
}