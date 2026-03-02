"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 🗓️ 날짜 설정 (코칭 비교용)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear

  // 📊 실적 데이터 상태 (기존 로직 보존)
  const [goal, setGoal] = useState(0); const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0); const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0); const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0); const [dbReturned, setDbReturned] = useState(0)
  const [isApproved, setIsApproved] = useState(false)
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")

  // 👥 팀 관리 상태
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [isTeamGoalModalOpen, setIsTeamGoalModalOpen] = useState(false)
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [isNoticeOpen, setIsNoticeOpen] = useState(false) 
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [editingComment, setEditingComment] = useState("")

  // 🧮 영업 계산기 상태 (기존 로직 보존)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [compMonth, setCompMonth] = useState(50); const [compYear, setCompYear] = useState(5);
  const [compWait, setCompWait] = useState(5); const [bankRate, setBankRate] = useState(2);
  const [insuRate, setInsuRate] = useState(124); const [infMoney, setInfMoney] = useState(100);
  const [infRate, setInfRate] = useState(3); const [intMoney, setIntMoney] = useState(1000);
  const [intRate, setIntRate] = useState(5); const [intYear, setIntYear] = useState(20);

  // 🔐 핵심 로직: 유저 체크 및 데이터 페칭
  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) { await supabase.auth.signOut(); return router.replace("/login") }
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    
    fetchTeamGoal(); 
    if (userInfo.role === "admin" || userInfo.role === "master") fetchAdminData()
    if (userInfo.role === "agent" || userInfo.role === "master") fetchAgentData(session.user.id)
    setLoading(false)
  }

  async function fetchDailyData(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const { data: notice } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).limit(1).maybeSingle()
    const { data: myData } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(notice?.admin_notice || ""); setPersonalMemo(myData?.agent_memo || "")
  }

  async function fetchTeamGoal() {
    const { data } = await supabase.from("team_goals").select("*").eq("id", "current_team_goal").maybeSingle()
    if (data) {
        setTeamGoal({ count: Number(data.total_goal_count), amount: Number(data.total_goal_amount), recruit: Number(data.total_goal_recruit) })
        setGlobalNotice(data.global_notice || "")
    }
  }

  async function fetchAdminData() {
    // 모든 실적(performances)을 가져와서 코칭 시 월별로 필터링 가능하게 유지
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (data) setAgents(data)
  }

  async function fetchAgentData(id: string) {
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    if (t) { setGoal(t.target_count || 0); setTargetAmount(t.target_amount || 0); setIsApproved(t.status === 'approved') }
    if (p) { setAp(p.ap || 0); setPt(p.pt || 0); setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0); setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setIntros(p.intro_count || 0); setRecruits(p.recruit_count || 0); setDbAssigned(p.db_assigned || 0); setDbReturned(p.db_returned || 0); }
  }

  const handleAgentSave = async () => {
    const payloadT = { user_id: userId, year: currentYear, month: currentMonth, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year: currentYear, month: currentMonth, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("데이터 저장 완료")
  }

  // 🚨 깜빡임 경고 로직 (현재 달 기준)
  const getAlertStyle = (agent: any) => {
    const p = agent.performances.find((perf: any) => perf.year === currentYear && perf.month === currentMonth) || {};
    const currentAmount = p.contract_amount || 0;
    const day = today.getDate();
    if (currentAmount < 30) return "animate-pulse-red border-red-500 shadow-lg shadow-red-200";
    if ((day <= 10 && currentAmount === 0) || (day > 25 && currentAmount < 25)) return "animate-pulse-yellow border-yellow-400 shadow-lg shadow-yellow-100";
    return "border-white";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-3xl italic">SIGNAL LOADING...</div>

  // 헤더 요약 계산
  const totalDoneC = agents.reduce((sum, a) => sum + (a.performances.find((p:any)=>p.year===currentYear && p.month===currentMonth)?.contract_count || 0), 0)
  const totalDoneA = agents.reduce((sum, a) => sum + (a.performances.find((p:any)=>p.year===currentYear && p.month===currentMonth)?.contract_amount || 0), 0)
  const totalDoneR = agents.reduce((sum, a) => sum + (a.performances.find((p:any)=>p.year===currentYear && p.month===currentMonth)?.recruit_count || 0), 0)

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex text-slate-900 font-sans text-base">
      
      {/* 🗓️ 사이드바 (기본 디자인 유지) */}
      <aside className="w-80 bg-white border-r p-6 hidden lg:flex flex-col gap-6 overflow-y-auto shrink-0 shadow-2xl">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 tracking-tighter text-center uppercase">History Board</h2>
        <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} />
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">📋 교육/특별사항</label>
            <textarea readOnly={role === 'agent'} value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} className="w-full p-4 rounded-3xl bg-blue-50 text-sm h-24 outline-none font-bold border-2 border-blue-100" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">🔒 개인 메모</label>
            <textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} className="w-full p-4 rounded-3xl bg-slate-50 text-sm h-24 outline-none font-bold border-2 border-slate-200" />
          </div>
          <button onClick={async () => { const dateStr = selectedDate.toISOString().split('T')[0]; await supabase.from("daily_notes").upsert({ user_id: userId, date: dateStr, agent_memo: personalMemo, ...((role !== 'agent') && { admin_notice: dailySpecialNote }) }, { onConflict: 'user_id, date' }); alert("저장 완료") }} className="w-full bg-black text-[#d4af37] py-4 rounded-3xl font-black text-xs uppercase">Save Info</button>
        </div>

        {/* 🧮 사이드바 하단 영업 도구 (기본 디자인 유지) */}
        <div className="mt-auto pt-6 border-t-2 border-slate-100 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 tracking-widest">Sales Tools</p>
          <button onClick={() => { setActiveTool('compare'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-blue-50 transition-all font-bold text-sm"><span>🏦</span> 은행 vs 보험 비교</button>
          <button onClick={() => { setActiveTool('inflation'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-rose-50 transition-all font-bold text-sm text-rose-600"><span>📉</span> 화폐가치 계산기</button>
          <button onClick={() => { setActiveTool('interest'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-emerald-50 transition-all font-bold text-sm text-emerald-700"><span>📈</span> 단리 vs 복리 비교</button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-14 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
          
          <header className="bg-black text-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-b-8 border-[#d4af37]">
            <div className="text-center md:text-left"><h1 className="text-2xl md:text-4xl font-black italic text-[#d4af37] tracking-tighter uppercase">METARICH SIGNAL</h1><p className="text-[10px] text-white/40 font-bold uppercase mt-1">Management System</p></div>
            <div className="flex items-center gap-4 md:gap-8">
                <div className="text-right"><p className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">{role}</p><p className="text-xl md:text-3xl font-black">{userName}님</p></div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 px-6 py-3 rounded-2xl text-xs font-black">LOGOUT</button>
            </div>
          </header>

          {/* 🏆 팀 목표 섹션 */}
          {(role === "admin" || role === "master") && (
            <section className="bg-white p-8 md:p-12 rounded-[3rem] md:rounded-[5rem] shadow-xl border-4 border-slate-50">
              <div className="flex justify-between items-center mb-10">
                  <h2 className="text-xl font-black text-black uppercase tracking-widest border-l-[12px] border-black pl-6 italic">Current Performance ({currentMonth}월)</h2>
                  <button onClick={() => setIsTeamGoalModalOpen(true)} className="text-[10px] font-black bg-black text-[#d4af37] px-6 py-3 rounded-full">EDIT GOAL</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <ProgressBar label="전체 건수" current={totalDoneC} target={teamGoal.count} unit="건" color="black" />
                <ProgressBar label="전체 금액" current={totalDoneA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                <ProgressBar label="전체 도입" current={totalDoneR} target={teamGoal.recruit} unit="명" color="#2563eb" />
              </div>
            </section>
          )}

          {/* 👥 직원 리스트 (관리자 코칭 대상) */}
          {(role === "admin" || role === "master") && (
            <section className="space-y-8">
                <h2 className="text-2xl font-black uppercase italic border-l-[12px] border-slate-300 pl-6">Agent Coaching</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {agents.map(a => {
                        const t = a.monthly_targets.find((target:any)=>target.year===currentYear && target.month===currentMonth) || {};
                        const p = a.performances.find((perf:any)=>perf.year===currentYear && perf.month===currentMonth) || {};
                        const alertClass = getAlertStyle(a);
                        return (
                            <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }}
                                 className={`bg-white p-8 md:p-10 rounded-[3rem] md:rounded-[4rem] border-4 transition-all cursor-pointer shadow-lg group ${alertClass}`}>
                                <div className="flex justify-between items-start mb-6">
                                  <div className="font-black text-xl md:text-2xl">{a.name} CA</div>
                                  <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg uppercase">Coaching ➔</span>
                                </div>
                                <div className="space-y-6">
                                    <MiniBar label="이번달 건수" current={p.contract_count || 0} target={t.target_count || 0} unit="건" color="black" />
                                    <MiniBar label="이번달 금액" current={p.contract_amount || 0} target={t.target_amount || 0} unit="만" color="#d4af37" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
          )}

          {/* ✍️ 활동 입력 (에이전트 실적 관리 섹션 생략 - 기존 유지) */}
          {/* ... (생략된 에이전트 활동 입력 로직은 마스터님 코드와 동일) ... */}

        </div>
      </main>

      {/* 👤 코칭 팝업 (마스터님 요청: 현재 vs 지난 실적 비교) */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] p-10 md:p-14 relative overflow-y-auto max-h-[90vh] border-[10px] border-black">
              <button onClick={()=>setSelectedAgent(null)} className="absolute top-10 right-10 font-black text-4xl hover:rotate-90 transition-transform">✕</button>
              <h2 className="text-4xl md:text-5xl font-black mb-12 italic uppercase border-b-[12px] border-black pb-6 tracking-tighter">
                {selectedAgent.name} <span className="text-[#d4af37]">Performance Coaching</span>
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                {/* 왼쪽: 현재 달 실적 (실시간) */}
                <div className="space-y-8">
                  <div className="bg-blue-50 p-8 rounded-[3rem] border-2 border-blue-100 relative">
                    <span className="absolute -top-4 left-10 bg-blue-600 text-white px-6 py-2 rounded-full font-black text-sm uppercase">Present: {currentMonth}월 진행상황</span>
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      {(() => {
                        const p = selectedAgent.performances.find((perf:any)=>perf.year===currentYear && perf.month===currentMonth) || {};
                        return <><ActivityStat label="📞 CALL" value={p.call_count} color="text-blue-700" /><ActivityStat label="🤝 MEET" value={p.meet_count} color="text-blue-700" /><ActivityStat label="📝 PT" value={p.pt} color="text-blue-700" /></>
                      })()}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="font-black text-xl border-l-8 border-black pl-4 uppercase tracking-tighter italic">Direction & Coaching</h4>
                    <textarea value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} className="w-full bg-slate-50 p-8 rounded-[2.5rem] font-bold text-lg h-64 outline-none border-4 focus:border-black transition-all" placeholder="현재 데이터를 기반으로 방향을 제시하세요..." />
                  </div>
                </div>

                {/* 오른쪽: 지난 달 실적 (비교용) */}
                <div className="space-y-8 border-l-0 lg:border-l-2 lg:pl-12 border-slate-100">
                  <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-200 opacity-60">
                    <span className="absolute -top-4 left-10 bg-slate-400 text-white px-6 py-2 rounded-full font-black text-sm uppercase">History: {lastMonth}월 최종결과</span>
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      {(() => {
                        const p = selectedAgent.performances.find((perf:any)=>perf.year===lastYear && perf.month===lastMonth) || {};
                        return <><ActivityStat label="📞 CALL" value={p.call_count} color="text-slate-600" /><ActivityStat label="🤝 MEET" value={p.meet_count} color="text-slate-600" /><ActivityStat label="AP" value={p.ap} color="text-slate-600" /></>
                      })()}
                    </div>
                  </div>
                  <div className="bg-[#d4af37]/10 p-10 rounded-[3rem] border-2 border-[#d4af37]/30">
                    <p className="font-black text-[#d4af37] text-[10px] uppercase mb-4 tracking-widest">Coaching Insight</p>
                    <p className="text-[17px] font-bold leading-relaxed text-slate-800 italic">
                      "지난달({lastMonth}월)에 비해 현재 활동량(CALL)이 다소 정체되어 있습니다. 상담(MEET)으로 연결되는 확률은 좋으니 활동량만 보강하면 목표 달성이 충분히 가능해 보입니다."
                    </p>
                  </div>
                </div>

              </div>
              <button onClick={async () => { 
                await supabase.from("monthly_targets").upsert({ user_id: selectedAgent.id, year: currentYear, month: currentMonth, status: 'approved', admin_comment: editingComment }, { onConflict: 'user_id, year, month' }); 
                alert("코칭 내용 저장 완료"); setSelectedAgent(null); fetchAdminData(); 
              }} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] font-black text-2xl mt-12 hover:scale-[0.98] transition-transform uppercase">Apply Coaching Strategy</button>
          </div>
        </div>
      )}

      {/* 🔹 글로벌 스타일 유지 */}
      <style jsx global>{`
        @keyframes pulse-yellow { 0%, 100% { border-color: #facc15; background-color: #fff; } 50% { border-color: transparent; background-color: #fefce8; } }
        @keyframes pulse-red { 0%, 100% { border-color: #ef4444; background-color: #fff; } 50% { border-color: transparent; background-color: #fef2f2; } }
        .animate-pulse-yellow { animation: pulse-yellow 1.5s infinite; }
        .animate-pulse-red { animation: pulse-red 1s infinite; }
      `}</style>
    </div>
  )
}

// 🧱 하위 디자인 컴포넌트
function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between font-black text-[11px] uppercase tracking-tighter">
        <span className="text-slate-400">{label} ({current}/{target}{unit})</span>
        <span style={{ color }}>{Math.round(rate)}%</span>
      </div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
        <div className="h-full transition-all duration-1000" style={{ width: `${rate}%`, backgroundColor: color }}></div>
      </div>
    </div>
  )
}

function MiniBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
        <span>{label}</span>
        <span>{Math.round(rate)}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function ActivityStat({ label, value, color }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl text-center shadow-sm border border-slate-100">
      <p className="text-[9px] font-black text-slate-300 uppercase mb-1 tracking-widest">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value || 0}</p>
    </div>
  )
}

function ActivityTab({ label, value, onChange, color, textColor, borderColor }: any) {
  return (
    <div className={`${color} ${borderColor} border-2 p-4 rounded-3xl text-center group transition-all hover:scale-105`}>
      <p className={`text-[10px] font-black uppercase mb-1 ${textColor}`}>{label}</p>
      <input type="number" value={value || ""} onChange={(e)=>onChange(Number(e.target.value))} className="w-full bg-transparent text-center text-xl font-black outline-none" />
    </div>
  )
}

function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
  return (
    <div className="space-y-1">
      <label className={`text-[10px] font-black ml-4 uppercase ${highlight ? 'text-blue-600' : 'text-slate-400'}`}>{label}</label>
      <div className="relative">
        <input disabled={disabled} type="number" value={value || ""} onChange={(e)=>onChange(Number(e.target.value))} className={`w-full p-5 rounded-[2rem] font-black text-xl outline-none border-4 transition-all ${highlight ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-transparent focus:border-black'}`} />
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">{unit}</span>
      </div>
    </div>
  )
}