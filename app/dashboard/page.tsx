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
  status?: string; admin_comment?: string;
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

  // 공통 상태 및 모달 제어
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)
  
  // 관리자 팝업 제어
  const [activeAdminPopup, setActiveAdminPopup] = useState<'perf' | 'act' | 'edu' | 'setting' | null>(null)
  const [adminSideTab, setAdminSideTab] = useState<'activity' | 'performance'>('activity')

  // 팀 목표 설정 상태 (설정 탭에서 수정 가능)
  const [teamGoal, setTeamGoal] = useState({ amount: 5000, count: 100, recruit: 10 })

  // [기존 실적 데이터 상태]
  const [goal, setGoal] = useState(0)
  const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0)
  const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0)
  const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0)
  const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0)
  const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0)
  const [dbReturned, setDbReturned] = useState(0)
  const [isApproved, setIsApproved] = useState(false)

  // 관리자 데이터
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1
  const todayDate = new Date().getDate()

  // ─── 🔄 [LOGIC] ──────────────────────────

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    if (userInfo.role === "admin" || userInfo.role === "master") fetchAdminData()
    if (userInfo.role === "agent" || userInfo.role === "master") fetchAgentData(session.user.id)
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
    if (t) { setGoal(t.target_count || 0); setTargetAmount(t.target_amount || 0); setIsApproved(t.status === 'approved') }
    if (p) { setAp(p.ap || 0); setPt(p.pt || 0); setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0); setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setIntros(p.intro_count || 0); setRecruits(p.recruit_count || 0); setDbAssigned(p.db_assigned || 0); setDbReturned(p.db_returned || 0) }
  }

  const handleAgentSave = async () => {
    const payloadT = { user_id: userId, year: currentYear, month: currentMonth, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year: currentYear, month: currentMonth, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("성공적으로 업데이트되었습니다.")
  }

  // 관리자용 전체 통계 계산
  const totalStats = agents.reduce((acc, a) => {
    const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
    if (p) {
      acc.calls += (p.call_count || 0); acc.meets += (p.meet_count || 0);
      acc.pts += (p.pt || 0); acc.intros += (p.intro_count || 0);
      acc.dbIn += (p.db_assigned || 0); acc.dbOut += (p.db_returned || 0);
      acc.contracts += (p.contract_count || 0); acc.amounts += (p.contract_amount || 0);
    }
    return acc;
  }, { calls: 0, meets: 0, pts: 0, intros: 0, dbIn: 0, dbOut: 0, contracts: 0, amounts: 0 });

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 italic animate-pulse">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📱 모바일 헤더 */}
      <div className="lg:hidden bg-white border-b px-5 py-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <h1 className="text-xl font-black italic tracking-tighter">SIGNAL</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-black text-[#d4af37] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Menu</button>
      </div>

      {/* ─── 📟 사이드바 (관리자 분석 통합) ─────────────────── */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-80 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 overflow-y-auto shadow-2xl lg:shadow-none`}>
        <div className="flex justify-between items-center">
            <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase">History</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-2xl">✕</button>
        </div>
        
        <div className="hidden lg:block border rounded-3xl overflow-hidden shadow-inner bg-slate-50 p-2 scale-90 origin-top">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full bg-transparent" />
        </div>

        {/* [요청사항 1] 관리자 하단 활동/실적 관리 2개 탭 */}
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
                  <StatItem label="DB IN/OUT" val={`${totalStats.dbIn}/${totalStats.dbOut}`} colSpan />
                </div>
              ) : (
                <div className="space-y-2">
                  <StatItem label="팀 전체 건수" val={`${totalStats.contracts}건`} />
                  <StatItem label="팀 전체 금액" val={`${totalStats.amounts.toLocaleString()}만`} />
                  <div className="bg-emerald-50 p-3 rounded-2xl text-center">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">팀 목표 달성률</p>
                    <p className="text-xl font-black text-emerald-700">{((totalStats.amounts / teamGoal.amount) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
            <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} onChange={(e: any)=>setDailySpecialNote(e.target.value)} readOnly={role === 'agent'} color="bg-blue-50" />
            <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e: any)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
            <button onClick={handleAgentSave} className="w-full bg-black text-[#d4af37] py-5 rounded-[1.5rem] font-black text-sm uppercase shadow-xl tracking-widest">Update Signal</button>
        </div>
      </aside>

      {/* ─── 💎 메인 섹션 ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-x-hidden">
        
        {/* [요청사항 2] 3월 실적현황 및 목표대비 달성률 상단 배치 */}
        <section className="max-w-6xl mx-auto space-y-4">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{currentMonth}월 팀 실적 대시보드</p>
              <h1 className="text-3xl font-black italic uppercase">Team Signal Status</h1>
            </div>
            <div className="flex gap-4">
               <div className="text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase">금액</p>
                 <p className="text-xl font-black">{((totalStats.amounts / teamGoal.amount)*100).toFixed(0)}%</p>
               </div>
               <div className="text-center border-x px-4">
                 <p className="text-[9px] font-black text-slate-400 uppercase">건수</p>
                 <p className="text-xl font-black">{((totalStats.contracts / teamGoal.count)*100).toFixed(0)}%</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase">도입</p>
                 <p className="text-xl font-black">0%</p>
               </div>
            </div>
          </div>

          {/* [요청사항 2] 클릭 시 팝업으로 뜨는 4개 탭 */}
          {(role === "admin" || role === "master") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MainTabBtn label="실적 관리" sub="팀 목표/분석" onClick={()=>setActiveAdminPopup('perf')} />
                <MainTabBtn label="활동 관리" sub="전환율/상세" onClick={()=>setActiveAdminPopup('act')} />
                <MainTabBtn label="교육 관리" sub="인지도 체크" onClick={()=>setActiveAdminPopup('edu')} />
                <MainTabBtn label="목표 설정" sub="설정 및 수정" onClick={()=>setActiveAdminPopup('setting')} />
            </div>
          )}
        </section>

        {/* 직원 목록 (부진자 깜빡임 효과) */}
        <section className="max-w-6xl mx-auto">
          <h2 className="text-xl font-black italic mb-6 border-l-8 border-black pl-4 uppercase">Agent Monitoring</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map(a => {
               const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
               const isNoPerf = todayDate >= 10 && (!p || (p.contract_count || 0) === 0);
               const isLowAvg = (p?.contract_amount || 0) < 30;
               const isWarning = isNoPerf || isLowAvg;

               return (
                 <div key={a.id} onClick={() => setSelectedAgent(a)} 
                  className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer shadow-sm group 
                    ${isWarning ? 'animate-pulse border-rose-500 bg-rose-50 shadow-rose-100' : 'hover:border-black'}`}>
                   <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="font-black text-xl underline underline-offset-8 decoration-[#d4af37] decoration-4 uppercase">{a.name} CA</p>
                        {isWarning && <p className="text-[9px] font-black text-rose-500 mt-2 uppercase tracking-tighter">⚠️ 실적 부진/코칭 필요</p>}
                      </div>
                      <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-full uppercase tracking-widest">COACH</span>
                   </div>
                   <div className="space-y-4">
                      <MiniProgress label="체결 건수" val={p?.contract_count || 0} max={10} color="bg-black" />
                      <MiniProgress label="실적 금액" val={p?.contract_amount || 0} max={300} color="bg-[#d4af37]" />
                   </div>
                 </div>
               )
            })}
          </div>
        </section>
      </main>

      {/* ─── 🧱 [MODALS & POPUPS] ────────────────────────── */}

      {/* [요청사항 3] 직원 클릭 시 상세 코칭 팝업 */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[600] flex justify-end">
            <div className="bg-white w-full max-w-2xl h-full p-8 lg:p-12 overflow-y-auto animate-in slide-in-from-right duration-300">
                <button onClick={() => setSelectedAgent(null)} className="mb-8 font-black text-xs uppercase underline">← Back to Monitor</button>
                <header className="mb-10">
                    <h2 className="text-4xl font-black italic border-b-8 border-black inline-block mb-2 uppercase">{selectedAgent.name} Analysis</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">지난달 및 3개월 평균 데이터 자동 비교 분석</p>
                </header>
                
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <CompareCard label="상담 AP" current={12} prev={8} unit="회" />
                        <CompareCard label="체결 실적" current={240} prev={310} unit="만" />
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-[3rem] border-b-8 border-[#d4af37]">
                        <p className="text-[#d4af37] text-xs font-black mb-6 uppercase italic tracking-widest">Coaching & Feedback</p>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 mb-2 uppercase">Improved (개선점)</p>
                                <p className="text-sm font-medium leading-relaxed">지난달 대비 고객 만남(MEET) 횟수가 20% 상승했습니다. 현장 활동량은 매우 양호합니다.</p>
                            </div>
                            <div className="h-px bg-slate-800" />
                            <div>
                                <p className="text-[10px] font-black text-rose-400 mb-2 uppercase">Weakness (보충점)</p>
                                <p className="text-sm font-medium leading-relaxed">활동량 대비 클로징 금액이 낮습니다. 3개월 평균 대비 객단가가 하락 중이므로 고액 보장 제안법 코칭이 시급합니다.</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setSelectedAgent(null)} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase">Close</button>
                </div>
            </div>
        </div>
      )}

      {/* [요청사항 2] 메인 4개 탭 팝업 모달 */}
      {activeAdminPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[700] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-[3rem] p-8 lg:p-12 relative overflow-y-auto max-h-[90vh]">
                <button onClick={() => setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
                
                {activeAdminPopup === 'perf' && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black uppercase italic border-b-4 border-black pb-2">실적 상세 분석</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <GoalBox label="팀 목표금액" val={`${totalStats.amounts} / ${teamGoal.amount}만`} />
                            <GoalBox label="팀 목표건수" val={`${totalStats.contracts} / ${teamGoal.count}건`} />
                            <GoalBox label="팀 도입실적" val={`0 / ${teamGoal.recruit}명`} />
                        </div>
                    </div>
                )}

                {activeAdminPopup === 'act' && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black uppercase italic border-b-4 border-black pb-2">활동 전환율 통계</h3>
                        <div className="space-y-6">
                            <RatioBar label="전화 대비 만남 (목표 30%)" val={totalStats.calls ? (totalStats.meets/totalStats.calls)*100 : 0} color="bg-blue-500" />
                            <RatioBar label="만남 대비 제안 (목표 50%)" val={totalStats.meets ? (totalStats.pts/totalStats.meets)*100 : 0} color="bg-indigo-500" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                <SmallStat label="총 전화" val={totalStats.calls} />
                                <SmallStat label="총 만남" val={totalStats.meets} />
                                <SmallStat label="총 제안" val={totalStats.pts} />
                                <SmallStat label="총 소개" val={totalStats.intros} />
                            </div>
                        </div>
                    </div>
                )}

                {activeAdminPopup === 'edu' && (
                    <div className="space-y-8 text-center py-10">
                        <h3 className="text-2xl font-black uppercase italic border-b-4 border-black pb-2 text-left">교육 인지도 관리</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">매주 진행되는 교육 컨텐츠에 대한 직원별 인지도 체크</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            {agents.map(a => (
                                <div key={a.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                                    <span className="font-black text-sm uppercase">{a.name} CA</span>
                                    <select className="bg-white border rounded-xl px-3 py-1.5 text-[10px] font-black">
                                        <option>인지 완료</option>
                                        <option>재교육 필요</option>
                                        <option>미참여</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeAdminPopup === 'setting' && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black uppercase italic border-b-4 border-black pb-2">팀 목표 설정 및 수정</h3>
                        <div className="space-y-6">
                            <AdminInput label="팀 전체 목표 금액 (만원)" val={teamGoal.amount} onChange={(v)=>setTeamGoal({...teamGoal, amount:v})} />
                            <AdminInput label="팀 전체 목표 건수 (건)" val={teamGoal.count} onChange={(v)=>setTeamGoal({...teamGoal, count:v})} />
                            <AdminInput label="팀 전체 도입 목표 (명)" val={teamGoal.recruit} onChange={(v)=>setTeamGoal({...teamGoal, recruit:v})} />
                            <button onClick={() => {alert('설정이 저장되었습니다.'); setActiveAdminPopup(null);}} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl active:scale-95 transition-all">Save Changes</button>
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

function StatItem({ label, val, colSpan }: any) {
  return (
    <div className={`bg-slate-50 p-3 rounded-2xl border ${colSpan ? 'col-span-2' : ''}`}>
      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-xs font-black">{val}</p>
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

function MiniProgress({ label, val, max, color }: any) {
  const rate = Math.min((val / (max || 1)) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[9px] font-black mb-1.5 uppercase tracking-tighter">
        <span className="text-slate-400">{label}</span>
        <span>{val} / {max}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}

function CompareCard({ label, current, prev, unit }: any) {
    const isUp = current >= prev;
    return (
        <div className="bg-slate-50 p-6 rounded-3xl border">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</p>
            <div className="flex justify-between items-end">
                <p className="text-2xl font-black">{current.toLocaleString()}{unit}</p>
                <p className={`text-[11px] font-black ${isUp ? 'text-emerald-500':'text-rose-500'}`}>
                    {isUp ? '▲':'▼'} {Math.abs(current-prev)}{unit}
                </p>
            </div>
        </div>
    )
}

function GoalBox({ label, val }: any) {
    return (
        <div className="bg-slate-900 p-6 rounded-3xl text-center">
            <p className="text-[#d4af37] text-[10px] font-black uppercase mb-1">{label}</p>
            <p className="text-white text-lg font-black">{val}</p>
        </div>
    )
}

function RatioBar({ label, val, color }: any) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-black uppercase">
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
        <div className="text-center p-4 bg-slate-50 rounded-2xl">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className="text-lg font-black">{val}</p>
        </div>
    )
}

function AdminInput({ label, val, onChange }: { label: string; val: number; onChange: (v: number) => void }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black ml-4 uppercase text-slate-400 tracking-widest">{label}</label>
            <input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black text-xl outline-none focus:border-black transition-all" />
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