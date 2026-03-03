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
  target_call?: number; target_meet?: number; target_pt?: number; target_intro?: number;
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

  // ─── [상태 관리: 공통 및 모달] ──────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("") // 전사 공지용
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // 관리자 팝업 & 계산기 상태
  const [activeAdminPopup, setActiveAdminPopup] = useState<'perf' | 'act' | 'edu' | 'setting' | null>(null)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compound' | 'inflation' | 'retirement'>('compound')
  const [adminSideTab, setAdminSideTab] = useState<'activity' | 'performance'>('activity')

  // 팀 목표 및 교육 설정
  const [teamGoal, setTeamGoal] = useState({ amount: 5000, count: 100, recruit: 10 })
  const [eduSchedule, setEduSchedule] = useState(["1주차: 신상품 화법", "2주차: 약관 분석", "3주차: 거절 처리", "4주차: 클로징 기법"])

  // [본인 실적 데이터]
  const [goal, setGoal] = useState(0); const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0); const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0); const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0); const [dbReturned, setDbReturned] = useState(0)

  // 관리자 모니터링 데이터
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1
  const todayDate = new Date().getDate()

  // ─── 🔄 [데이터 로드 로직] ──────────────────────────
  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    if (userInfo.role === "admin" || userInfo.role === "master") fetchAdminData()
    fetchAgentData(session.user.id)
    setLoading(false)
  }

  async function fetchDailyData(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const { data: note } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).maybeSingle()
    const { data: myMemo } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(note?.admin_notice || ""); setPersonalMemo(myMemo?.agent_memo || "")
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  async function fetchAgentData(id: string) {
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    if (t) { setGoal(t.target_count || 0); setTargetAmount(t.target_amount || 0) }
    if (p) { setAp(p.ap || 0); setPt(p.pt || 0); setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0); setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setIntros(p.intro_count || 0); setRecruits(p.recruit_count || 0); setDbAssigned(p.db_assigned || 0); setDbReturned(p.db_returned || 0) }
  }

  const totalStats = agents.reduce((acc, a) => {
    const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
    if (p) {
      acc.calls += (p.call_count || 0); acc.meets += (p.meet_count || 0);
      acc.pts += (p.pt || 0); acc.intros += (p.intro_count || 0);
      acc.contracts += (p.contract_count || 0); acc.amounts += (p.contract_amount || 0);
    }
    return acc;
  }, { calls: 0, meets: 0, pts: 0, intros: 0, contracts: 0, amounts: 0 });

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 italic animate-pulse tracking-tighter">SIGNAL SYSTEM LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📱 모바일 헤더 */}
      <div className="lg:hidden bg-white border-b px-5 py-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <h1 className="text-xl font-black italic tracking-tighter">SIGNAL</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-black text-[#d4af37] px-3 py-2 rounded-xl text-[10px] font-black uppercase">Menu</button>
      </div>

      {/* ─── 📟 사이드바 (분석 및 메모) ─────────────────── */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-80 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 overflow-y-auto shadow-2xl lg:shadow-none`}>
        <div className="flex justify-between items-center">
            <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase">History</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-2xl">✕</button>
        </div>
        
        <div className="border rounded-3xl overflow-hidden shadow-inner bg-slate-50 p-2 scale-95 origin-top">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full bg-transparent" />
        </div>

        {/* [관리자 하단 통계] 활동/실적 관리 탭 */}
        {(role === 'admin' || role === 'master') && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setAdminSideTab('activity')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${adminSideTab==='activity'?'bg-white shadow-sm':'text-slate-400'}`}>활동관리</button>
              <button onClick={() => setAdminSideTab('performance')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${adminSideTab==='performance'?'bg-white shadow-sm':'text-slate-400'}`}>실적관리</button>
            </div>
            <div className="px-1 space-y-2">
              {adminSideTab === 'activity' ? (
                <div className="grid grid-cols-2 gap-2">
                  <StatItem label="CALL" val={totalStats.calls} />
                  <StatItem label="MEET" val={totalStats.meets} />
                  <StatItem label="PT" val={totalStats.pts} />
                  <StatItem label="INTRO" val={totalStats.intros} />
                </div>
              ) : (
                <div className="space-y-2 text-center bg-slate-900 text-white p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-[#d4af37] uppercase">팀 목표 달성률</p>
                  <p className="text-xl font-black">{((totalStats.amounts / teamGoal.amount) * 100).toFixed(1)}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
            <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} readOnly={role === 'agent'} color="bg-blue-50" />
            <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e: any)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
            <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-[#d4af37] text-black py-4 rounded-2xl font-black text-xs uppercase shadow-lg hover:scale-[1.02] transition-all">Open Sales Calculator</button>
        </div>
      </aside>

      {/* ─── 💎 메인 섹션 ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6">
        
        {/* [복구] 최상단 퀵링크 탭 */}
        <section className="max-w-6xl mx-auto grid grid-cols-3 gap-2 lg:gap-4">
            <QuickLink label="메타온" href="https://metaon.metarich.co.kr" />
            <QuickLink label="보험사" href="#" onClick={() => alert('보험사 시스템 연동 중')} />
            <QuickLink label="자료실" href="#" onClick={() => alert('공유 자료실 이동')} />
        </section>

        <div className="max-w-6xl mx-auto space-y-6">
          <header className="bg-white p-6 lg:p-10 rounded-[3rem] shadow-sm border flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{userName} CA 실적현황</p>
              <h1 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tighter">{currentMonth}월 실적 목표대비 달성률</h1>
            </div>
            <div className="flex gap-4 items-center">
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-5 py-2.5 border-2 border-black rounded-2xl text-[10px] font-black hover:bg-black hover:text-[#d4af37] transition-all uppercase">Logout</button>
            </div>
          </header>

          {/* 달성률 요약 */}
          <section className="grid grid-cols-3 gap-4">
              <SummaryCard label="금액 달성" val={`${((totalStats.amounts / teamGoal.amount)*100).toFixed(0)}%`} color="text-black" />
              <SummaryCard label="건수 달성" val={`${((totalStats.contracts / teamGoal.count)*100).toFixed(0)}%`} color="text-blue-600" />
              <SummaryCard label="도입 달성" val="0%" color="text-[#d4af37]" />
          </section>

          {/* 관리자 4개 탭 팝업 */}
          {(role === "admin" || role === "master") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MainTabBtn label="실적 관리" sub="금액/건수/도입" onClick={()=>setActiveAdminPopup('perf')} />
                <MainTabBtn label="활동 관리" sub="전화→미팅 전환율" onClick={()=>setActiveAdminPopup('act')} />
                <MainTabBtn label="교육 관리" sub="주차별 인지도" onClick={()=>setActiveAdminPopup('edu')} />
                <MainTabBtn label="목표 설정" sub="전체 목표/교육 수정" onClick={()=>setActiveAdminPopup('setting')} />
            </div>
          )}
        </div>

        {/* 직원 모니터링 리스트 */}
        <section className="max-w-6xl mx-auto">
          <h2 className="text-xl font-black italic mb-6 border-l-8 border-black pl-4 uppercase">Team Monitoring</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map(a => {
               const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
               const isNoPerf = todayDate >= 10 && (!p || (p.contract_count || 0) === 0);
               return (
                 <div key={a.id} onClick={() => setSelectedAgent(a)} 
                  className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer shadow-sm group hover:border-black ${isNoPerf ? 'animate-pulse border-rose-500 bg-rose-50':''}`}>
                   <div className="flex justify-between items-start mb-6">
                      <p className="font-black text-xl underline underline-offset-8 decoration-[#d4af37] decoration-4 uppercase">{a.name} CA</p>
                      <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-full uppercase tracking-widest">COACH</span>
                   </div>
                   <div className="space-y-4">
                      <MiniProgress label="건수" val={p?.contract_count || 0} max={10} color="bg-black" />
                      <MiniProgress label="금액" val={p?.contract_amount || 0} max={300} color="bg-[#d4af37]" />
                   </div>
                 </div>
               )
            })}
          </div>
        </section>
      </main>

      {/* ─── 🧱 [MODALS] ────────────────────────── */}

      {/* [영업 계산기 모달 복구] */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[800] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] h-[85vh] flex flex-col overflow-hidden relative shadow-2xl">
                <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Sales Calculation Tool</h2>
                    <button onClick={() => setIsBizToolOpen(false)} className="text-2xl font-black">✕</button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <aside className="w-20 lg:w-48 bg-slate-100 border-r flex flex-col">
                        <ToolTab active={activeTool === 'compound'} label="복리/단리" onClick={()=>setActiveTool('compound')} />
                        <ToolTab active={activeTool === 'inflation'} label="인플레이션" onClick={()=>setActiveTool('inflation')} />
                        <ToolTab active={activeTool === 'retirement'} label="은퇴 준비" onClick={()=>setActiveTool('retirement')} />
                    </aside>
                    <main className="flex-1 p-8 overflow-y-auto bg-white">
                        <div className="max-w-md mx-auto space-y-8 py-10">
                            <h3 className="text-3xl font-black text-center mb-10 uppercase italic underline decoration-[#d4af37]">Ready for Analysis</h3>
                            <div className="space-y-6">
                                <CalcInput label="월 저축 금액 (만원)" unit="만" />
                                <CalcInput label="기대 수익률 (%)" unit="%" />
                                <CalcInput label="저축 기간 (년)" unit="년" />
                                <button className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl">Calculate Result</button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
      )}

      {/* [직원 상세 코칭 팝업] */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[900] flex justify-end">
            <div className="bg-white w-full max-w-2xl h-full p-8 lg:p-12 overflow-y-auto animate-in slide-in-from-right duration-300">
                <button onClick={() => setSelectedAgent(null)} className="mb-8 font-black text-xs uppercase underline">← Back to List</button>
                <header className="mb-10">
                    <h2 className="text-4xl font-black italic border-b-8 border-black inline-block mb-2 uppercase">{selectedAgent.name} Analysis</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">목표 대비 활동 실적 및 지난달 비교 코칭</p>
                </header>
                
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <ActivityGoalCard label="📞 CALL (목표 50)" current={selectedAgent.performances?.find(p=>p.month===currentMonth)?.call_count || 0} target={50} unit="건" />
                        <ActivityGoalCard label="🤝 MEET (목표 20)" current={selectedAgent.performances?.find(p=>p.month===currentMonth)?.meet_count || 0} target={20} unit="건" />
                        <ActivityGoalCard label="📝 PT (목표 15)" current={selectedAgent.performances?.find(p=>p.month===currentMonth)?.pt || 0} target={15} unit="건" />
                        <ActivityGoalCard label="🎁 INTRO (목표 5)" current={selectedAgent.performances?.find(p=>p.month===currentMonth)?.intro_count || 0} target={5} unit="건" />
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-[3rem] border-b-8 border-[#d4af37]">
                        <p className="text-[#d4af37] text-xs font-black mb-6 uppercase italic tracking-widest">Feedback & Coaching</p>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <span className="text-emerald-400 font-black">▲ 개선:</span>
                                <p className="text-sm text-slate-300">지난달 대비 PT(제안) 횟수가 크게 증가했습니다. 집중도가 좋아졌습니다.</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-rose-400 font-black">▼ 부족:</span>
                                <p className="text-sm text-slate-300">활동량은 많으나 건당 체결 금액이 3개월 평균보다 낮습니다. 고액 계약 클로징이 필요합니다.</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setSelectedAgent(null)} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase">Close Analysis</button>
                </div>
            </div>
        </div>
      )}

      {/* [관리자 4개 탭 팝업 모달] */}
      {activeAdminPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-[3rem] p-8 lg:p-12 relative overflow-y-auto max-h-[90vh]">
                <button onClick={() => setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
                
                {activeAdminPopup === 'edu' && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black uppercase italic border-b-4 border-black pb-2">교육 인지도 관리</h3>
                        <div className="space-y-4">
                            {eduSchedule.map((title, idx) => (
                                <div key={idx} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center border">
                                    <p className="font-black text-sm uppercase">{title}</p>
                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase">80% 숙지</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeAdminPopup === 'setting' && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black uppercase italic border-b-4 border-black pb-2">전체 목표 및 교육 수정</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest border-b">1. 팀 목표 수정</p>
                                <AdminInput label="팀 목표 금액" val={teamGoal.amount} onChange={(v)=>setTeamGoal({...teamGoal, amount:v})} />
                                <AdminInput label="팀 목표 건수" val={teamGoal.count} onChange={(v)=>setTeamGoal({...teamGoal, count:v})} />
                            </div>
                            <div className="space-y-4">
                                <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest border-b">2. 교육 제목 설정</p>
                                {eduSchedule.map((title, i) => (
                                    <input key={i} value={title} onChange={(e) => {
                                        const next = [...eduSchedule]; next[i] = e.target.value; setEduSchedule(next);
                                    }} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-xs" />
                                ))}
                            </div>
                        </div>
                        <button onClick={() => {alert('저장되었습니다.'); setActiveAdminPopup(null);}} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl">Update System</button>
                    </div>
                )}
                
                {activeAdminPopup === 'act' && (
                    <div className="space-y-8">
                         <h3 className="text-2xl font-black uppercase italic border-b-4 border-black pb-2">상세 활동 및 전환율</h3>
                         <div className="space-y-6">
                            <RatioBar label="전화 → 미팅 (전환율)" val={totalStats.calls ? (totalStats.meets/totalStats.calls)*100 : 0} color="bg-indigo-500" />
                            <RatioBar label="미팅 → 제안 (전환율)" val={totalStats.meets ? (totalStats.pts/totalStats.meets)*100 : 0} color="bg-blue-500" />
                            <div className="grid grid-cols-4 gap-4 mt-8">
                                <SmallStat label="총 CALL" val={totalStats.calls} />
                                <SmallStat label="총 MEET" val={totalStats.meets} />
                                <SmallStat label="총 PT" val={totalStats.pts} />
                                <SmallStat label="총 INTRO" val={totalStats.intros} />
                            </div>
                         </div>
                    </div>
                )}

                {activeAdminPopup === 'perf' && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black uppercase italic border-b-4 border-black pb-2">전체 실적 현황</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <GoalBox label="팀 누적 금액" val={`${totalStats.amounts.toLocaleString()}만`} />
                            <GoalBox label="팀 누적 건수" val={`${totalStats.contracts}건`} />
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; font-weight: 900; }
      `}</style>
    </div>
  )
}

// ─── 📦 [REUSABLE COMPONENTS] ──────────────────────────

function QuickLink({ label, href, onClick }: any) {
    return (
        <a href={href} target={href !== "#" ? "_blank" : undefined} onClick={onClick} 
           className="bg-white border-2 border-slate-900 text-center py-4 rounded-2xl font-black text-[11px] lg:text-sm shadow-sm hover:bg-black hover:text-[#d4af37] transition-all uppercase">
            {label}
        </a>
    )
}

function SummaryCard({ label, val, color }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl border text-center shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{val}</p>
        </div>
    )
}

function MainTabBtn({ label, sub, onClick }: any) {
    return (
        <button onClick={onClick} className="bg-white border-2 border-slate-900 p-5 rounded-[2rem] text-center transition-all hover:bg-black group">
            <p className="text-xs font-black uppercase group-hover:text-[#d4af37]">{label}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 group-hover:text-slate-500">{sub}</p>
        </button>
    )
}

function ToolTab({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`p-4 lg:p-6 text-[10px] lg:text-xs font-black uppercase transition-all ${active ? 'bg-white text-black border-r-4 border-black':'text-slate-400 hover:bg-slate-50'}`}>
            {label}
        </button>
    )
}

function CalcInput({ label, unit }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400 tracking-widest">{label}</label>
            <div className="relative">
                <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-2xl outline-none focus:border-black transition-all" />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase">{unit}</span>
            </div>
        </div>
    )
}

function ActivityGoalCard({ label, current, target, unit }: any) {
    const rate = Math.min((current / (target || 1)) * 100, 100);
    return (
        <div className="bg-slate-50 p-5 rounded-3xl border">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</p>
            <div className="flex justify-between items-end mb-2">
                <p className="text-xl font-black">{current}{unit}</p>
                <p className="text-[10px] font-bold text-slate-400">Target {target}</p>
            </div>
            <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border">
                <div className="h-full bg-black" style={{ width: `${rate}%` }} />
            </div>
        </div>
    )
}

function MiniProgress({ label, val, max, color }: any) {
  const rate = Math.min((val / (max || 1)) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[9px] font-black mb-1.5 uppercase">
        <span className="text-slate-400">{label}</span>
        <span>{val} / {max}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}

function AdminInput({ label, val, onChange }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
            <input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} className="w-full p-4 bg-slate-50 border rounded-2xl font-black outline-none focus:border-black" />
        </div>
    )
}

function RatioBar({ label, val, color }: any) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-black uppercase tracking-tighter">
                <span>{label}</span>
                <span>{val.toFixed(1)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${val}%` }} />
            </div>
        </div>
    )
}

function SmallStat({ label, val }: any) {
    return (
        <div className="text-center p-4 bg-slate-50 rounded-2xl border">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className="text-lg font-black">{val}</p>
        </div>
    )
}

function GoalBox({ label, val }: any) {
    return (
        <div className="bg-slate-900 p-6 rounded-3xl text-center border-b-8 border-[#d4af37]">
            <p className="text-[#d4af37] text-[10px] font-black uppercase mb-1">{label}</p>
            <p className="text-white text-lg font-black">{val}</p>
        </div>
    )
}

function StatItem({ label, val }: any) {
  return (
    <div className="bg-slate-50 p-3 rounded-2xl border">
      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-xs font-black">{val}</p>
    </div>
  )
}

function MemoBox({ label, value, onChange, readOnly, color }: any) {
  return (
    <div className={`${color} p-5 rounded-2xl border`}>
        <p className="text-[9px] font-black text-slate-400 mb-2 uppercase italic tracking-widest">{label}</p>
        <textarea readOnly={readOnly} value={value} onChange={onChange} className="w-full bg-transparent text-xs font-bold outline-none resize-none h-24 text-slate-700 leading-relaxed" placeholder="..." />
    </div>
  )
}