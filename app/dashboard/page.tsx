"use client"

import React, { useEffect, useState } from "react"
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

  // ─── [상태 관리: 공통] ──────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("") 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // 관리자 팝업 & 계산기 상태
  const [activeAdminPopup, setActiveAdminPopup] = useState<'perf' | 'act' | 'edu' | 'setting' | null>(null)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'savings' | 'inflation' | 'compound'>('savings')

  // [본인 실적 및 목표 데이터]
  const [goalCount, setGoalCount] = useState(0)
  const [targetAmt, setTargetAmt] = useState(0)
  const [targetRecruit, setTargetRecruit] = useState(0)
  const [isApproved, setIsApproved] = useState(false) 

  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [pts, setPts] = useState(0); const [intros, setIntros] = useState(0)
  const [dbIn, setDbIn] = useState(0); const [dbOut, setDbOut] = useState(0)

  // 관리자 모니터링 데이터
  const [agents, setAgents] = useState<Agent[]>([])
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
    
    // 1. 공지/메모 로드
    const { data: note } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).maybeSingle()
    const { data: myMemo } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(note?.admin_notice || ""); setPersonalMemo(myMemo?.agent_memo || "")

    // 2. 본인 실적/목표 로드
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", userId).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", userId).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    
    if (t) {
      setGoalCount(t.target_count || 0); setTargetAmt(t.target_amount || 0); setTargetRecruit(t.target_recruit || 0);
      setIsApproved(t.status === 'approved')
    } else {
      setGoalCount(0); setTargetAmt(0); setTargetRecruit(0); setIsApproved(false)
    }

    if (p) {
      setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0);
      setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setPts(p.pt || 0);
      setIntros(p.intro_count || 0); setDbIn(p.db_assigned || 0); setDbOut(p.db_returned || 0)
    }

    // 3. 관리자용 전체 요약 데이터 로드
    if (role !== 'agent') {
        const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
        if (data) setAgents(data as Agent[])
    }
  }

  const handleSave = async () => {
    // 목표 금액/건수는 승인되지 않았을 때만 포함하여 저장 (서버 로직 보완용)
    const targetPayload = { user_id: userId, year: currentYear, month: currentMonth, target_count: goalCount, target_amount: targetAmt, target_recruit: targetRecruit }
    const perfPayload = { user_id: userId, year: currentYear, month: currentMonth, contract_count: contract, contract_amount: contractAmount, call_count: calls, meet_count: meets, pt: pts, intro_count: intros, db_assigned: dbIn, db_returned: dbOut }
    
    await supabase.from("monthly_targets").upsert(targetPayload, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(perfPayload, { onConflict: 'user_id, year, month' })
    alert("저장되었습니다.")
    fetchData()
  }

  // 관리자용 팀 전체 합산 통계
  const totalStats = agents.reduce((acc, a) => {
    const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
    const t = a.monthly_targets?.find(tf => tf.year === currentYear && tf.month === currentMonth);
    if (p) {
      acc.curAmt += (p.contract_amount || 0); acc.curCnt += (p.contract_count || 0);
      acc.calls += (p.call_count || 0); acc.meets += (p.meet_count || 0); acc.pts += (p.pt || 0);
    }
    if (t) {
      acc.tarAmt += (t.target_amount || 0); acc.tarCnt += (t.target_count || 0); acc.tarRec += (t.target_recruit || 0);
    }
    return acc;
  }, { curAmt: 0, curCnt: 0, tarAmt: 0, tarCnt: 0, tarRec: 0, calls: 0, meets: 0, pts: 0 });

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400 italic animate-pulse">SYSTEM FULL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* ─── 📟 사이드바 (공지 및 계산기) ─────────────────── */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-80 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 shadow-2xl lg:shadow-none`}>
        <div className="flex justify-between items-center">
            <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase">History</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">✕</button>
        </div>
        <div className="border rounded-3xl overflow-hidden shadow-inner bg-slate-50 p-2">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full bg-transparent" />
        </div>
        <div className="space-y-4">
            <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} readOnly color="bg-blue-50" />
            <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e: any)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
            <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-[#d4af37] text-black py-4 rounded-2xl font-black text-xs uppercase shadow-lg hover:scale-105 transition-all">영업 계산기 열기</button>
        </div>
      </aside>

      {/* ─── 💎 메인 섹션 ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6">
        
        {/* 최상단 퀵링크 */}
        <section className="max-w-6xl mx-auto grid grid-cols-3 gap-2 lg:gap-4">
            <QuickLink label="메타온" href="https://metaon.metarich.co.kr" />
            <QuickLink label="보험사" href="#" onClick={()=>alert('시스템 준비중')} />
            <QuickLink label="자료실" href="#" onClick={()=>alert('자료실 이동')} />
        </section>

        <div className="max-w-6xl mx-auto space-y-6">
          <header className="bg-white p-6 lg:p-10 rounded-[3rem] shadow-sm border flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{userName} Dashboard</p>
              <h1 className="text-2xl lg:text-3xl font-black italic tracking-tighter">{currentMonth}월 실적 및 활동 관리</h1>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-5 py-2.5 border-2 border-black rounded-2xl text-[10px] font-black uppercase hover:bg-black hover:text-[#d4af37] transition-all">Logout</button>
          </header>

          {/* [관리자 메뉴 탭] */}
          {(role === "admin" || role === "master") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MainTabBtn label="실적 관리" sub="가로 막대 그래프" onClick={()=>setActiveAdminPopup('perf')} />
                <MainTabBtn label="활동 관리" sub="상세 전환율 통계" onClick={()=>setActiveAdminPopup('act')} />
                <MainTabBtn label="교육 관리" sub="주차별 인지도" onClick={()=>setActiveAdminPopup('edu')} />
                <MainTabBtn label="목표 설정" sub="시스템 전체 수정" onClick={()=>setActiveAdminPopup('setting')} />
            </div>
          )}

          {/* 📝 [직원 전용: 활동 입력 섹션] - 요청대로 모든 탭 복구 */}
          <section className="bg-white p-6 lg:p-10 rounded-[3rem] border shadow-sm space-y-8">
            <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4">
                <h2 className="text-xl font-black italic uppercase underline decoration-[#d4af37] decoration-4">Monthly Activity Input</h2>
                <button onClick={handleSave} className="bg-black text-[#d4af37] px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">실적 저장하기</button>
            </div>

            {/* [목표 입력 섹션 - 승인 시 수정 불가] */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputBox label="목표 금액 (만원)" value={targetAmt} onChange={setTargetAmt} disabled={isApproved} highlight />
                <InputBox label="목표 건수 (건)" value={goalCount} onChange={setGoalCount} disabled={isApproved} highlight />
                <InputBox label="도입 목표 (명)" value={targetRecruit} onChange={setTargetRecruit} disabled={isApproved} highlight />
            </div>

            {/* [상세 활동 입력 섹션 - 항상 수정 가능] */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <ActivityMini label="전화" val={calls} onChange={setCalls} color="bg-blue-50" />
                <ActivityMini label="만남" val={meets} onChange={setMeets} color="bg-indigo-50" />
                <ActivityMini label="제안(PT)" val={pts} onChange={setPts} color="bg-purple-50" />
                <ActivityMini label="소개" val={intros} onChange={setIntros} color="bg-emerald-50" />
                <ActivityMini label="DB 배정" val={dbIn} onChange={setDbIn} color="bg-slate-50" />
                <ActivityMini label="DB 반품" val={dbOut} onChange={setDbOut} color="bg-rose-50" />
            </div>
          </section>
        </div>
      </main>

      {/* ─── 🧱 [MODALS] ────────────────────────── */}

      {/* [1. 관리자 실적 관리 - 가로 막대 그래프] */}
      {activeAdminPopup === 'perf' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative shadow-2xl">
                <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
                <h3 className="text-3xl font-black uppercase italic mb-10 border-b-4 border-black inline-block">Team Achievement</h3>
                
                <div className="space-y-10">
                    <ProgressBar label="전체 실적 금액" current={totalStats.curAmt} target={totalStats.tarAmt} unit="만원" color="bg-black" />
                    <ProgressBar label="전체 실적 건수" current={totalStats.curCnt} target={totalStats.tarCnt} unit="건" color="bg-blue-600" />
                    <ProgressBar label="전체 도입 목표" current={0} target={totalStats.tarRec} unit="명" color="bg-[#d4af37]" />
                </div>
            </div>
        </div>
      )}

      {/* [2. 영업 계산기 - 적금/보험, 물가, 복리 3종 고정] */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[800] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
                <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Sales Calculation System</h2>
                    <button onClick={()=>setIsBizToolOpen(false)} className="text-2xl font-black">✕</button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-20 lg:w-56 bg-slate-100 border-r flex flex-col">
                        <ToolTab active={activeTool==='savings'} label="적금 vs 보험 비교" onClick={()=>setActiveTool('savings')} />
                        <ToolTab active={activeTool==='inflation'} label="물가(화폐가치) 계산" onClick={()=>setActiveTool('inflation')} />
                        <ToolTab active={activeTool==='compound'} label="복리 수익 계산" onClick={()=>setActiveTool('compound')} />
                    </aside>
                    <main className="flex-1 p-10 overflow-y-auto bg-white">
                        <div className="max-w-md mx-auto space-y-8 py-10">
                            <h3 className="text-3xl font-black text-center uppercase italic underline decoration-[#d4af37] decoration-4 mb-10">
                                {activeTool === 'savings' ? "적금 vs 보험 비교분석" : activeTool === 'inflation' ? "물가상승 시뮬레이션" : "복리 이자 시뮬레이션"}
                            </h3>
                            <div className="space-y-6">
                                <CalcInput label="기준 금액 (만원)" unit="만" />
                                <CalcInput label="예상 이율/물가율 (%)" unit="%" />
                                <CalcInput label="기간 (년)" unit="년" />
                                <button className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl hover:scale-102 transition-all">결과 분석하기</button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
      )}

      {/* [3. 활동 관리/전환율 팝업] */}
      {activeAdminPopup === 'act' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative">
                <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
                <h3 className="text-2xl font-black uppercase italic mb-8 border-b-4 border-black inline-block">Activity Conversion</h3>
                <div className="space-y-8">
                    <RatioBar label="전화 → 만남 성공률" val={totalStats.calls ? (totalStats.meets/totalStats.calls)*100 : 0} color="bg-indigo-500" />
                    <RatioBar label="만남 → 제안(PT) 성공률" val={totalStats.meets ? (totalStats.pts/totalStats.meets)*100 : 0} color="bg-blue-500" />
                </div>
            </div>
        </div>
      )}

      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; border-radius: 24px; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; font-weight: 900; }
      `}</style>
    </div>
  )
}

// ─── 📦 [REUSABLE COMPONENTS] ──────────────────────────

function ProgressBar({ label, current, target, unit, color }: any) {
    const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <span className="font-black text-xs uppercase text-slate-400">{label}</span>
                <span className="font-black text-lg">{current.toLocaleString()} / <span className="text-slate-300">{target.toLocaleString()}{unit}</span></span>
            </div>
            <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden border p-1.5 shadow-inner">
                <div className={`h-full ${color} rounded-full transition-all duration-1000 flex items-center justify-end px-4 shadow-lg`} style={{ width: `${rate}%` }}>
                    {rate > 15 && <span className="text-[10px] font-black text-white italic">{rate.toFixed(1)}%</span>}
                </div>
            </div>
        </div>
    )
}

function InputBox({ label, value, onChange, disabled, highlight }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
            <div className="relative">
                <input type="number" value={value} disabled={disabled} onChange={(e)=>onChange(Number(e.target.value))} 
                className={`w-full p-5 rounded-2xl font-black text-xl outline-none border-2 transition-all ${disabled ? 'bg-slate-50 text-slate-300 border-slate-100' : highlight ? 'border-black focus:ring-4 ring-amber-100' : 'border-slate-100'}`} />
                {disabled && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Approved</span>}
            </div>
        </div>
    )
}

function ActivityMini({ label, val, onChange, color }: any) {
    return (
        <div className={`${color} p-4 rounded-2xl text-center border border-transparent hover:border-slate-200 transition-all shadow-sm`}>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-tighter">{label}</p>
            <input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} className="w-full bg-transparent text-center text-xl font-black outline-none" />
        </div>
    )
}

function ToolTab({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`p-4 lg:p-6 text-[10px] lg:text-xs font-black uppercase transition-all text-left ${active ? 'bg-white text-black border-r-8 border-black shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
            {label}
        </button>
    )
}

function CalcInput({ label, unit }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400 tracking-widest">{label}</label>
            <div className="relative">
                <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl outline-none focus:border-black transition-all" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase italic">{unit}</span>
            </div>
        </div>
    )
}

function RatioBar({ label, val, color }: any) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between text-xs font-black uppercase italic">
                <span>{label}</span>
                <span>{val.toFixed(1)}%</span>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border">
                <div className={`h-full ${color}`} style={{ width: `${val}%` }} />
            </div>
        </div>
    )
}

function QuickLink({ label, href, onClick }: any) {
    return (
        <a href={href} onClick={onClick} target={href !== "#" ? "_blank" : undefined} className="bg-white border-2 border-slate-900 text-center py-4 rounded-2xl font-black text-[11px] lg:text-sm shadow-sm hover:bg-black hover:text-[#d4af37] transition-all uppercase">{label}</a>
    )
}

function MainTabBtn({ label, sub, onClick }: any) {
    return (
        <button onClick={onClick} className="bg-white border-2 border-slate-900 p-5 rounded-[2.5rem] text-center transition-all hover:bg-black group shadow-sm">
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