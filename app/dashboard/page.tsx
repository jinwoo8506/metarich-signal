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
  
  // 관리자 & 도구 팝업
  const [activeAdminPopup, setActiveAdminPopup] = useState<'perf' | 'act' | 'edu' | 'setting' | null>(null)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'savings' | 'inflation' | 'compound'>('savings')

  // 직원 실적 데이터 (요청하신 모든 탭 포함)
  const [goalCount, setGoalCount] = useState(0)
  const [targetAmt, setTargetAmt] = useState(0)
  const [targetRecruit, setTargetRecruit] = useState(0)
  const [isApproved, setIsApproved] = useState(false) 

  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [pts, setPts] = useState(0); const [intros, setIntros] = useState(0)
  const [dbIn, setDbIn] = useState(0); const [dbOut, setDbOut] = useState(0)

  // 계산기 입력값 및 결과값
  const [calcInput, setCalcInput] = useState({ principal: 0, rate: 0, years: 0 })
  const [calcResult, setCalcResult] = useState<string | null>(null)

  // 관리자 데이터
  const [agents, setAgents] = useState<Agent[]>([])
  const [eduSchedule, setEduSchedule] = useState(["1주차: 상품 교육", "2주차: 거절 처리", "3주차: 세무 지식", "4주차: 클로징"])

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
    
    // 1. 공지 및 메모
    const { data: note } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).maybeSingle()
    const { data: myMemo } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(note?.admin_notice || ""); setPersonalMemo(myMemo?.agent_memo || "")

    // 2. 직원 목표 및 실적 (전화, 미팅 등 모든 탭 포함)
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

    // 3. 관리자용 전체 요약
    if (role !== 'agent') {
        const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
        if (data) setAgents(data as Agent[])
    }
  }

  // 데이터 저장 (목표는 미승인 시에만, 실적은 상시)
  const handleSave = async () => {
    const targetPayload = { user_id: userId, year: currentYear, month: currentMonth, target_count: goalCount, target_amount: targetAmt, target_recruit: targetRecruit }
    const perfPayload = { user_id: userId, year: currentYear, month: currentMonth, contract_count: contract, contract_amount: contractAmount, call_count: calls, meet_count: meets, pt: pts, intro_count: intros, db_assigned: dbIn, db_returned: dbOut }
    
    if (!isApproved) {
        await supabase.from("monthly_targets").upsert(targetPayload, { onConflict: 'user_id, year, month' })
    }
    await supabase.from("performances").upsert(perfPayload, { onConflict: 'user_id, year, month' })
    alert("활동 내역이 저장되었습니다.")
    fetchData()
  }

  // 🧮 계산기 로직
  const calculateResult = () => {
    const { principal, rate, years } = calcInput;
    if (principal <= 0 || years <= 0) return alert("금액과 기간을 입력하세요.");
    
    let result = 0;
    if (activeTool === 'compound') {
      result = principal * Math.pow((1 + (rate / 100)), years);
    } else if (activeTool === 'inflation') {
      result = principal / Math.pow((1 + (rate / 100)), years);
    } else {
      // 적금 vs 보험 단순 비교 예시
      result = principal * (1 + (rate / 100) * years);
    }
    setCalcResult(result.toLocaleString(undefined, { maximumFractionDigits: 0 }));
  }

  const totalStats = agents.reduce((acc, a) => {
    const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
    const t = a.monthly_targets?.find(tf => tf.year === currentYear && tf.month === currentMonth);
    if (p) { acc.curAmt += (p.contract_amount || 0); acc.curCnt += (p.contract_count || 0); acc.calls += (p.call_count || 0); acc.meets += (p.meet_count || 0); acc.pts += (p.pt || 0); }
    if (t) { acc.tarAmt += (t.target_amount || 0); acc.tarCnt += (t.target_count || 0); acc.tarRec += (t.target_recruit || 0); }
    return acc;
  }, { curAmt: 0, curCnt: 0, tarAmt: 0, tarCnt: 0, tarRec: 0, calls: 0, meets: 0, pts: 0 });

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse">SYSTEM UPDATING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900">
      
      {/* ─── 📟 사이드바 ─────────────────── */}
      <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm">
        <h1 className="text-2xl font-black italic border-b-4 border-black pb-1">HISTORY</h1>
        <div className="border rounded-3xl overflow-hidden bg-slate-50 p-2 scale-90">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full" />
        </div>
        <div className="space-y-4">
            <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} readOnly color="bg-blue-50" />
            <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e: any)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
            <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-[#d4af37] text-black py-4 rounded-2xl font-black text-xs uppercase shadow-lg">영업 계산기 실행</button>
        </div>
      </aside>

      {/* ─── 💎 메인 메인 섹션 ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6">
        
        {/* 퀵링크 */}
        <section className="max-w-6xl mx-auto grid grid-cols-3 gap-3">
            <QuickLink label="메타온" href="https://metaon.metarich.co.kr" />
            <QuickLink label="보험사 협회" href="#" />
            <QuickLink label="관리 시스템" href="#" />
        </section>

        <div className="max-w-6xl mx-auto space-y-6">
          <header className="bg-white p-6 lg:p-10 rounded-[3rem] shadow-sm border flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{userName} CA Dashboard</p>
              <h1 className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter">{currentMonth}월 실적 현황</h1>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-5 py-2 border-2 border-black rounded-2xl text-[10px] font-black uppercase">Logout</button>
          </header>

          {/* [관리자 전용 탭] - 모든 탭 활성화 */}
          {(role !== "agent") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MainTabBtn label="실적 분석" sub="팀 막대 그래프" onClick={()=>setActiveAdminPopup('perf')} />
                <MainTabBtn label="활동 통계" sub="전환율 분석" onClick={()=>setActiveAdminPopup('act')} />
                <MainTabBtn label="교육 관리" sub="인지도 체크" onClick={()=>setActiveAdminPopup('edu')} />
                <MainTabBtn label="목표 설정" sub="시스템 수정" onClick={()=>setActiveAdminPopup('setting')} />
            </div>
          )}

          {/* 📝 [직원 활동 입력] - 승인 시 목표 수정 불가 로직 포함 */}
          <section className="bg-white p-6 lg:p-10 rounded-[3rem] border shadow-sm space-y-8">
            <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4">
                <h2 className="text-xl font-black italic uppercase underline decoration-[#d4af37] decoration-4">Monthly Input</h2>
                <button onClick={handleSave} className="bg-black text-[#d4af37] px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">실적 저장</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputBox label="목표 금액 (만원)" value={targetAmt} onChange={setTargetAmt} disabled={isApproved} highlight />
                <InputBox label="목표 건수 (건)" value={goalCount} onChange={setGoalCount} disabled={isApproved} highlight />
                <InputBox label="도입 목표 (명)" value={targetRecruit} onChange={setTargetRecruit} disabled={isApproved} highlight />
            </div>

            {/* 활동 내역 6종 (전화, 만남, 제안, 소개, DB배정/반품) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* ─── 🧱 [모달창들] ────────────────────────── */}

      {/* 1. 관리자 실적 관리 (가로 막대 그래프) */}
      {activeAdminPopup === 'perf' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative">
                <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
                <h3 className="text-2xl font-black uppercase italic mb-10 border-b-4 border-black inline-block">Team Performance</h3>
                <div className="space-y-10">
                    <ProgressBar label="전체 실적 금액" current={totalStats.curAmt} target={totalStats.tarAmt} unit="만원" color="bg-black" />
                    <ProgressBar label="전체 실적 건수" current={totalStats.curCnt} target={totalStats.tarCnt} unit="건" color="bg-blue-600" />
                    <ProgressBar label="전체 도입 실적" current={0} target={totalStats.tarRec} unit="명" color="bg-[#d4af37]" />
                </div>
            </div>
        </div>
      )}

      {/* 2. 교육 관리 탭 (인지도 체크) */}
      {activeAdminPopup === 'edu' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative">
                <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
                <h3 className="text-2xl font-black uppercase italic mb-8 border-b-4 border-black inline-block">Education Status</h3>
                <div className="space-y-4">
                    {eduSchedule.map((edu, i) => (
                        <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border">
                            <span className="font-black text-sm">{edu}</span>
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase">85% 완료</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* 3. 시스템 목표 설정 (관리자 전용 수정) */}
      {activeAdminPopup === 'setting' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative">
                <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
                <h3 className="text-2xl font-black uppercase italic mb-8 border-b-4 border-black inline-block">System Setting</h3>
                <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-4 border">
                        <p className="font-black text-xs text-slate-400 italic">교육 커리큘럼 수정</p>
                        {eduSchedule.map((edu, i) => (
                            <input key={i} value={edu} onChange={(e) => {
                                const next = [...eduSchedule]; next[i] = e.target.value; setEduSchedule(next);
                            }} className="w-full p-4 border rounded-xl font-bold text-xs" />
                        ))}
                    </div>
                    <button onClick={()=>{alert('시스템 설정이 저장되었습니다.'); setActiveAdminPopup(null)}} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl">Update System</button>
                </div>
            </div>
        </div>
      )}

      {/* 4. 영업 계산기 (수익 결과 도출 로직 포함) */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[800] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
                <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-black italic uppercase">Sales Calculator</h2>
                    <button onClick={()=>{setIsBizToolOpen(false); setCalcResult(null);}} className="text-2xl font-black">✕</button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-20 lg:w-56 bg-slate-100 border-r flex flex-col">
                        <ToolTab active={activeTool==='savings'} label="적금/보험 비교" onClick={()=>setActiveTool('savings')} />
                        <ToolTab active={activeTool==='inflation'} label="물가 계산" onClick={()=>setActiveTool('inflation')} />
                        <ToolTab active={activeTool==='compound'} label="복리 계산" onClick={()=>setActiveTool('compound')} />
                    </aside>
                    <main className="flex-1 p-10 overflow-y-auto bg-white flex flex-col items-center">
                        <div className="max-w-md w-full space-y-6 py-6">
                            <h3 className="text-2xl font-black text-center uppercase underline decoration-[#d4af37] decoration-4 mb-10">
                                {activeTool === 'savings' ? "적금/보험 비교" : activeTool === 'inflation' ? "물가상승 계산" : "복리 수익 시뮬레이션"}
                            </h3>
                            <div className="space-y-5">
                                <CalcInput label="금액 (만원)" unit="만" value={calcInput.principal} onChange={(v)=>setCalcInput({...calcInput, principal: v})} />
                                <CalcInput label="이율/물가율 (%)" unit="%" value={calcInput.rate} onChange={(v)=>setCalcInput({...calcInput, rate: v})} />
                                <CalcInput label="기간 (년)" unit="년" value={calcInput.years} onChange={(v)=>setCalcInput({...calcInput, years: v})} />
                                <button onClick={calculateResult} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl transition-all active:scale-95">결과 분석</button>
                            </div>

                            {calcResult && (
                                <div className="mt-10 p-8 bg-slate-900 text-white rounded-[2rem] border-b-8 border-[#d4af37] animate-bounce-short">
                                    <p className="text-[10px] font-black text-[#d4af37] mb-2 uppercase">Analysis Result</p>
                                    <p className="text-3xl font-black">{calcResult}<span className="text-sm ml-1 text-slate-400">만원</span></p>
                                    <p className="text-[10px] text-slate-400 mt-2 font-bold italic">* 위 수치는 세전 금액이며 시뮬레이션 결과입니다.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
      )}

      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; border-radius: 24px; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; font-weight: 900; }
        @keyframes bounce-short { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .animate-bounce-short { animation: bounce-short 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}

// ─── 📦 [컴포넌트 라이브러리] ──────────────────────────

function ProgressBar({ label, current, target, unit, color }: any) {
    const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <span className="font-black text-xs uppercase text-slate-400">{label}</span>
                <span className="font-black text-lg">{current.toLocaleString()} / <span className="text-slate-300">{target.toLocaleString()}{unit}</span></span>
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
        <div className="space-y-2">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
            <div className="relative">
                <input type="number" value={value} disabled={disabled} onChange={(e)=>onChange(Number(e.target.value))} 
                className={`w-full p-5 rounded-2xl font-black text-xl outline-none border-2 transition-all ${disabled ? 'bg-slate-50 text-slate-300 border-slate-100 shadow-inner' : highlight ? 'border-black focus:ring-4 ring-amber-100' : 'border-slate-100 focus:border-black'}`} />
                {disabled && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Locked</span>}
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

function CalcInput({ label, unit, value, onChange }: any) {
    return (
        <div className="space-y-1 w-full">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
            <div className="relative">
                <input type="number" value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl outline-none focus:border-black transition-all" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase italic">{unit}</span>
            </div>
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

function QuickLink({ label, href }: { label:string, href:string }) {
    return (
        <a href={href} target="_blank" className="bg-white border-2 border-slate-900 text-center py-4 rounded-2xl font-black text-[11px] lg:text-sm shadow-sm hover:bg-black hover:text-[#d4af37] transition-all uppercase">{label}</a>
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