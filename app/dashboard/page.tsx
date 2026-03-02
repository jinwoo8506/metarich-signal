"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPE DEFINITIONS] ──────────────────────────
interface Performance {
  year: number; month: number;
  contract_count?: number; contract_amount?: number;
  ap?: number; pt?: number; call_count?: number; meet_count?: number;
  intro_count?: number; recruit_count?: number;
  db_assigned?: number; db_returned?: number;
}
interface MonthlyTarget {
  year: number; month: number;
  target_count?: number; target_amount?: number;
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

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")

  const [goal, setGoal] = useState(0); const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0); const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0); const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0); const [dbReturned, setDbReturned] = useState(0)
  const [isApproved, setIsApproved] = useState(false)

  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [isTeamGoalModalOpen, setIsTeamGoalModalOpen] = useState(false)
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [isNoticeOpen, setIsNoticeOpen] = useState(false) 
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editingComment, setEditingComment] = useState("")

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyType, setHistoryType] = useState<'team' | 'agent' | 'db'>('agent')

  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [compMonth, setCompMonth] = useState(50); const [compYear, setCompYear] = useState(5); const [compWait, setCompWait] = useState(5); const [bankRate, setBankRate] = useState(2)
  const [infMoney, setInfMoney] = useState(100); const [infRate, setInfRate] = useState(3)
  const [intMoney, setIntMoney] = useState(1000); const [intRate, setIntRate] = useState(5); const [intYear, setIntYear] = useState(20)

  const currentYear = selectedDate.getFullYear(); const currentMonth = selectedDate.getMonth() + 1
  const prevMonthDate = new Date(currentYear, currentMonth - 2, 1)
  const lastYear = prevMonthDate.getFullYear(); const lastMonth = prevMonthDate.getMonth() + 1

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) { await supabase.auth.signOut(); return router.replace("/login") }
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    fetchTeamGoal()
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
        setTeamGoal({ count: Number(data.total_goal_count || 0), amount: Number(data.total_goal_amount || 0), recruit: Number(data.total_goal_recruit || 0) })
        setGlobalNotice(data.global_notice || "")
    }
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  async function fetchAgentData(id: string) {
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    if (t) { setGoal(t.target_count || 0); setTargetAmount(t.target_amount || 0); setIsApproved(t.status === 'approved') }
    else { setGoal(0); setTargetAmount(0); setIsApproved(false) }
    if (p) { 
      setAp(p.ap || 0); setPt(p.pt || 0); setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0)
      setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setIntros(p.intro_count || 0); setRecruits(p.recruit_count || 0)
      setDbAssigned(p.db_assigned || 0); setDbReturned(p.db_returned || 0)
    } else {
      setAp(0); setPt(0); setContract(0); setContractAmount(0); setCalls(0); setMeets(0); setIntros(0); setRecruits(0); setDbAssigned(0); setDbReturned(0)
    }
  }

  const handleAgentSave = async () => {
    const payloadT = { user_id: userId, year: currentYear, month: currentMonth, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year: currentYear, month: currentMonth, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("데이터 저장 완료")
  }

  const getAlertStyle = (agent: Agent) => {
    const p = (agent.performances || []).find(pf => pf.year === currentYear && pf.month === currentMonth) || { contract_amount: 0 }
    if ((p.contract_amount || 0) < 30) return "animate-pulse-red border-red-500 shadow-lg shadow-red-200"
    return "border-white"
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-3xl italic">SIGNAL LOADING...</div>

  const totalDoneC = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.contract_count || 0), 0)
  const totalDoneA = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.contract_amount || 0), 0)
  const totalDoneR = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.recruit_count || 0), 0)

  // 전월 대비 비교 로직
  const lastTotalDoneA = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===lastYear && p.month===lastMonth)?.contract_amount || 0), 0)
  const diffA = totalDoneA - lastTotalDoneA

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col lg:flex-row text-slate-900 font-sans">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 overflow-y-auto shrink-0 shadow-2xl lg:h-screen">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 text-center uppercase">History Board</h2>
        
        <div className="calendar-container">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" formatDay={(locale, date) => date.getDate().toString()} className="rounded-2xl border-0 shadow-sm custom-calendar" />
        </div>

        {/* [전월 대비 비교 섹션] */}
        <div className="p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">전월({lastMonth}월) 대비 동향</p>
            <div className="flex justify-between items-center">
                <span className="font-bold">팀 실적</span>
                <span className={`font-black ${diffA >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {diffA >= 0 ? '▲' : '▼'} {Math.abs(diffA).toLocaleString()}만
                </span>
            </div>
            <p className="text-[10px] font-bold text-slate-500">
                {diffA >= 0 ? "지난달보다 페이스가 좋습니다! 👍" : "지난달보다 분발이 필요합니다! 🔥"}
            </p>
        </div>

        <div className="p-4 bg-slate-900 rounded-[2rem] space-y-3">
            <p className="text-[#d4af37] text-[10px] font-black uppercase text-center tracking-tighter">{currentMonth}월 리포트 & 툴</p>
            <button onClick={() => { setHistoryType('agent'); setIsHistoryModalOpen(true); }} className="w-full bg-white text-black py-3 rounded-2xl font-black text-xs hover:bg-[#d4af37] transition-all">활동 분석표</button>
            <button onClick={() => { setHistoryType('db'); setIsHistoryModalOpen(true); }} className="w-full border-2 border-[#d4af37] text-[#d4af37] py-3 rounded-2xl font-black text-xs hover:bg-[#d4af37] hover:text-black transition-all">DB 효율 분석</button>
            <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black text-xs">🧮 영업용 계산기</button>
        </div>

        <div className="space-y-4">
          <textarea readOnly={role === 'agent'} value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} placeholder="교육/특별사항" className="w-full p-4 rounded-3xl bg-blue-50 text-sm h-24 outline-none font-bold border-2 border-blue-100" />
          <textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} placeholder="개인 메모" className="w-full p-4 rounded-3xl bg-slate-50 text-sm h-24 outline-none font-bold border-2 border-slate-200" />
          <button onClick={async () => { 
            const dateStr = selectedDate.toISOString().split('T')[0]; 
            await supabase.from("daily_notes").upsert({ user_id: userId, date: dateStr, agent_memo: personalMemo, ...((role !== 'agent') && { admin_notice: dailySpecialNote }) }, { onConflict: 'user_id, date' }); 
            alert("저장 완료") 
          }} className="w-full bg-black text-[#d4af37] py-4 rounded-3xl font-black text-xs uppercase">Save Info</button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="flex-1 p-5 md:p-14 overflow-y-auto pb-24 md:pb-14">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
          <header className="bg-black text-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-b-8 border-[#d4af37]">
            <h1 className="text-2xl md:text-4xl font-black italic text-[#d4af37] uppercase">METARICH SIGNAL</h1>
            <div className="flex items-center gap-4 md:gap-8">
                <div className="text-right"><p className="text-[#d4af37] text-[10px] font-black uppercase">{role}</p><p className="text-xl md:text-3xl font-black">{userName}님</p></div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 px-6 py-3 rounded-2xl text-xs font-black">LOGOUT</button>
            </div>
          </header>

          <section onClick={() => setIsNoticeOpen(true)} className="bg-white rounded-3xl p-6 shadow-xl border-l-8 border-[#d4af37] flex items-center justify-between cursor-pointer">
            <span className="font-bold text-lg truncate">📢 {globalNotice}</span>
          </section>

          {/* [전체 실적 현황] - 이름 변경 및 폰트 확대 */}
          {(role === "admin" || role === "master") && (
            <section className="bg-white p-8 md:p-12 rounded-[3rem] md:rounded-[5rem] shadow-xl border-4 border-slate-50">
              <div className="flex justify-between items-center mb-10">
                  <button onClick={() => setIsTeamGoalModalOpen(true)} className="text-sm font-black bg-black text-[#d4af37] px-8 py-4 rounded-full">실적 관리</button>
                  <h2 className="text-2xl md:text-3xl font-black uppercase border-r-[12px] border-black pr-6 italic text-right">전체 실적 현황</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <ProgressBar label="전체 건수" current={totalDoneC} target={teamGoal.count} unit="건" color="black" />
                <ProgressBar label="전체 금액" current={totalDoneA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                <ProgressBar label="전체 도입" current={totalDoneR} target={teamGoal.recruit} unit="명" color="#2563eb" />
              </div>
            </section>
          )}

          {/* [영업식구 현황 관리] - 이름 변경 */}
          {(role === "admin" || role === "master") && (
            <section className="space-y-8">
                <h2 className="text-2xl font-black uppercase italic border-l-[12px] border-slate-300 pl-6">영업식구 현황 관리</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-slate-900">
                    {agents.map(a => {
                        const t = (a.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth) || { target_count: 0, target_amount: 0, admin_comment: "" };
                        const p = (a.performances || []).find(pf=>pf.year===currentYear && pf.month===currentMonth) || { contract_count: 0, contract_amount: 0, call_count: 0, meet_count: 0 };
                        return (
                            <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }} className={`bg-white p-8 md:p-10 rounded-[3rem] border-4 cursor-pointer shadow-lg transition-all hover:-translate-y-2 ${getAlertStyle(a)}`}>
                                <div className="font-black text-xl mb-6 flex justify-between"><span>{a.name} CA</span> <span className="text-[10px] text-slate-400 font-bold uppercase">Detail 〉</span></div>
                                <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl">
                                    <div className="flex justify-between text-sm font-bold"><span>📞 전화</span><span>{p.call_count || 0}건</span></div>
                                    <div className="flex justify-between text-sm font-bold"><span>🤝 미팅</span><span>{p.meet_count || 0}건</span></div>
                                </div>
                                <MiniBar label="실적 건수" current={p.contract_count || 0} target={t.target_count || 0} unit="건" color="black" />
                                <MiniBar label="실적 금액" current={p.contract_amount || 0} target={t.target_amount || 0} unit="만" color="#d4af37" />
                            </div>
                        )
                    })}
                </div>
            </section>
          )}

          {/* Activity Board & 그래프 */}
          {(role === "agent" || role === "master") && (
             <section className="space-y-12">
                <div className="flex justify-between items-center"><h2 className="text-3xl md:text-4xl font-black italic uppercase border-b-8 border-black pb-4">Activity Board</h2><button onClick={handleAgentSave} className="bg-black text-[#d4af37] px-10 py-5 rounded-[2.5rem] font-black text-sm shadow-xl">UPDATE</button></div>
                
                {/* 달성률 가로 막대 그래프 */}
                <div className="bg-white p-8 rounded-[2rem] shadow-lg border-2 border-black">
                    <ProgressBar label="이번 달 목표 달성률" current={contract} target={goal} unit="건" color="#000" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <ActivityTab label="📞 전화" value={calls} onChange={setCalls} color="bg-emerald-50" textColor="text-emerald-800" unit="건" />
                  <ActivityTab label="🤝 미팅" value={meets} onChange={setMeets} color="bg-amber-50" textColor="text-amber-800" unit="건" />
                  <ActivityTab label="📝 제안" value={pt} onChange={setPt} color="bg-purple-50" textColor="text-purple-800" unit="건" />
                  <ActivityTab label="🎁 소개" value={intros} onChange={setIntros} color="bg-rose-50" textColor="text-rose-800" unit="건" />
                  <ActivityTab label="📥 DB배정" value={dbAssigned} onChange={setDbAssigned} color="bg-blue-50" textColor="text-blue-800" unit="건" />
                  <ActivityTab label="📤 DB반품" value={dbReturned} onChange={setDbReturned} color="bg-slate-100" textColor="text-slate-800" unit="건" />
                </div>
                <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border-4 grid grid-cols-1 md:grid-cols-2 gap-12 text-slate-900">
                  <div className="space-y-10">
                    <h3 className="text-2xl font-black text-slate-800 uppercase border-l-[12px] border-slate-300 pl-6">목표 설정</h3>
                    <InBox label="목표 건수" value={goal} onChange={setGoal} unit="건" disabled={isApproved} />
                    <InBox label="목표 금액" value={targetAmount} onChange={setTargetAmount} unit="만원" disabled={isApproved} />
                    <InBox label="도입 실적" value={recruits} onChange={setRecruits} unit="명" highlight />
                  </div>
                  <div className="space-y-10">
                    <h3 className="text-2xl font-black text-[#d4af37] uppercase border-l-[12px] border-[#d4af37] pl-6">현재 실적</h3>
                    <InBox label="완료 건수" value={contract} onChange={setContract} unit="건" />
                    <InBox label="완료 금액" value={contractAmount} onChange={setContractAmount} unit="만원" />
                    <InBox label="상담 횟수" value={ap} onChange={setAp} unit="회" />
                  </div>
                </div>
             </section>
          )}
        </div>

        {/* 🚀 MODALS */}
        {isHistoryModalOpen && (
            <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 relative border-8 border-black max-h-[85vh] overflow-y-auto text-slate-900">
                    <button onClick={()=>setIsHistoryModalOpen(false)} className="absolute top-8 right-8 font-black text-3xl">✕</button>
                    <h2 className="text-3xl font-black mb-8 italic uppercase border-b-8 border-black pb-4">
                        {historyType === 'db' ? `${currentMonth}월 DB 효율 & 프로세스 관리` : `${currentMonth}월 성과 비교 리포트`}
                    </h2>
                    
                    {historyType === 'db' ? (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-100 text-center"><p className="text-[10px] font-black mb-2 uppercase">DB 가동률</p><p className="text-3xl font-black">{dbAssigned > 0 ? Math.round(((dbAssigned-dbReturned)/dbAssigned)*100) : 0}%</p></div>
                                <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-100 text-center"><p className="text-[10px] font-black mb-2 uppercase">전화 대비 면담</p><p className="text-3xl font-black">{calls > 0 ? Math.round((meets/calls)*100) : 0}%</p></div>
                                <div className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-100 text-center"><p className="text-[10px] font-black mb-2 uppercase">DB 반품률</p><p className="text-3xl font-black text-red-600">{dbAssigned > 0 ? Math.round((dbReturned/dbAssigned)*100) : 0}%</p></div>
                                <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 text-center"><p className="text-[10px] font-black mb-2 uppercase">평균 면담 횟수</p><p className="text-3xl font-black">{agents.length > 0 ? (meets/agents.length).toFixed(1) : 0}건</p></div>
                            </div>
                            <div className="p-8 bg-slate-900 text-white rounded-[2rem] space-y-4">
                                <p className="font-bold text-center text-[#d4af37]">💡 DB 성과 코칭 가이드</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-white/10 p-4 rounded-xl italic">"전화 대비 면담률이 30% 미만일 경우 스크립트 점검이 필요합니다."</div>
                                    <div className="bg-white/10 p-4 rounded-xl italic">"반품률이 20%를 초과할 경우 DB 분배 기준을 재검토해야 합니다."</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-8 bg-black text-white rounded-[2rem] text-center"><p className="text-[10px] text-[#d4af37] font-black mb-2 uppercase">달성률</p><p className="text-4xl font-black">{goal > 0 ? Math.round((contract/goal)*100) : 0}%</p></div>
                                <div className="p-8 bg-slate-100 rounded-[2rem] text-center"><p className="text-[10px] text-slate-400 font-black mb-2 uppercase">총 AP</p><p className="text-4xl font-black">{ap}회</p></div>
                                <div className="p-8 bg-slate-100 rounded-[2rem] text-center"><p className="text-[10px] text-slate-400 font-black mb-2 uppercase">DB 효율</p><p className="text-4xl font-black">{dbAssigned > 0 ? Math.round((contract/dbAssigned)*100) : 0}%</p></div>
                                <div className="p-8 bg-slate-100 rounded-[2rem] text-center"><p className="text-[10px] text-slate-400 font-black mb-2 uppercase">평균 단가</p><p className="text-4xl font-black">{contract > 0 ? Math.round(contractAmount/contract) : 0}만</p></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {isBizToolOpen && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[4rem] p-10 md:p-14 relative border-[8px] border-black text-slate-900 overflow-y-auto max-h-[90vh]">
              <button onClick={()=>setIsBizToolOpen(false)} className="absolute top-10 right-10 text-3xl font-black">✕</button>
              <div className="flex gap-4 mb-10 overflow-x-auto pb-2">
                <button onClick={()=>setActiveTool('compare')} className={`px-8 py-4 rounded-full font-black text-lg shrink-0 ${activeTool==='compare'?'bg-black text-white':'bg-slate-100'}`}>은행 vs 보험</button>
                <button onClick={()=>setActiveTool('inflation')} className={`px-8 py-4 rounded-full font-black text-lg shrink-0 ${activeTool==='inflation'?'bg-black text-white':'bg-slate-100'}`}>화폐가치</button>
                <button onClick={()=>setActiveTool('interest')} className={`px-8 py-4 rounded-full font-black text-lg shrink-0 ${activeTool==='interest'?'bg-black text-white':'bg-slate-100'}`}>복리마법</button>
              </div>
              {activeTool === 'compare' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <InBox label="월 납입액" value={compMonth} onChange={(v: number)=>setCompMonth(v)} unit="만원" />
                    <InBox label="납입 기간" value={compYear} onChange={(v: number)=>setCompYear(v)} unit="년" />
                    <InBox label="거치 기간" value={compWait} onChange={(v: number)=>setCompWait(v)} unit="년" />
                    <InBox label="은행 금리" value={bankRate} onChange={(v: number)=>setBankRate(v)} unit="%" />
                  </div>
                  <div className="bg-slate-50 p-10 rounded-[3rem] border-4 border-dashed grid grid-cols-1 md:grid-cols-2 gap-10 text-center">
                    <div><p className="text-lg font-black text-slate-400 mb-4 uppercase">은행 (단리 합계)</p><p className="text-4xl font-black">{(compMonth * compYear * 12 + (compMonth * compYear * 12 * (bankRate/100) * (compYear + compWait))).toLocaleString()}만원</p></div>
                    <div><p className="text-lg font-black text-blue-600 mb-4 uppercase italic">보험 (예시 124%)</p><p className="text-5xl font-black text-blue-700">{(compMonth * compYear * 12 * 1.24).toLocaleString()}만원</p></div>
                  </div>
                </div>
              )}
              {activeTool === 'inflation' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    <InBox label="현재 자산" value={infMoney} onChange={(v: number)=>setInfMoney(v)} unit="만원" />
                    <InBox label="물가 상승률" value={infRate} onChange={(v: number)=>setInfRate(v)} unit="%" />
                    <InBox label="경과 시간" value={compWait} onChange={(v: number)=>setCompWait(v)} unit="년" />
                  </div>
                  <div className="bg-rose-50 p-12 rounded-[3rem] border-4 border-rose-100 text-center">
                     <p className="text-xl font-black text-rose-400 mb-6 italic uppercase tracking-widest">미래의 실제 가치</p>
                     <p className="text-7xl font-black text-rose-700">{Math.round(infMoney / Math.pow(1 + infRate/100, compWait)).toLocaleString()}만원</p>
                  </div>
                </div>
              )}
              {activeTool === 'interest' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    <InBox label="투자 원금" value={intMoney} onChange={(v: number)=>setIntMoney(v)} unit="만원" />
                    <InBox label="기대 수익률" value={intRate} onChange={(v: number)=>setIntRate(v)} unit="%" />
                    <InBox label="투자 기간" value={intYear} onChange={(v: number)=>setIntYear(v)} unit="년" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
                     <div className="bg-white p-10 rounded-[3rem] border-2 shadow-sm"><p className="text-lg font-black text-slate-400 mb-4 uppercase">일반 단리</p><p className="text-5xl font-black">{(intMoney + (intMoney * (intRate/100) * intYear)).toLocaleString()}만</p></div>
                     <div className="bg-emerald-50 p-10 rounded-[3rem] border-2 border-emerald-100"><p className="text-lg font-black text-emerald-500 mb-4 uppercase italic">복리 마법</p><p className="text-5xl font-black text-emerald-700">{Math.round(intMoney * Math.pow(1 + intRate/100, intYear)).toLocaleString()}만</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── 🎨 UI COMPONENTS ──────────────────────────
function ProgressBar({ label, current, target, unit, color }: any) {
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end"><span className="text-xs font-black text-slate-400 uppercase">{label}</span><span className="text-xl font-black italic">{current.toLocaleString()} / {target.toLocaleString()}{unit}</span></div>
      <div className="w-full h-10 bg-slate-100 rounded-2xl overflow-hidden shadow-inner flex border-2 border-slate-50">
        <div className="h-full transition-all duration-1000 ease-out flex items-center justify-end pr-3 font-black text-xs text-white" style={{ width: `${percent}%`, backgroundColor: color }}>{percent}%</div>
      </div>
    </div>
  )
}
function MiniBar({ label, current, target, unit, color }: any) {
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-300"><span>{label}</span><span>{percent}%</span></div>
            <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border"><div className="h-full transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: color }} /></div>
        </div>
    )
}
function ActivityTab({ label, value, onChange, color, textColor, unit }: any) {
  return (
    <div className={`${color} p-4 rounded-3xl text-center border-2 border-transparent hover:border-black transition-all shadow-sm`}>
      <p className={`text-[10px] font-black mb-2 ${textColor} uppercase`}>{label}</p>
      <div className="flex items-center justify-center gap-1">
        <input type="number" value={value || 0} onChange={(e)=>onChange(Number(e.target.value))} className="w-10 bg-transparent text-center font-black text-xl outline-none" />
        <span className="text-[10px] opacity-50">{unit}</span>
      </div>
    </div>
  )
}
function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-black ml-4 ${highlight ? 'text-blue-600' : 'text-slate-400'} uppercase tracking-widest`}>{label}</label>
      <div className="relative group">
        <input type="number" disabled={disabled} value={value || 0} onChange={(e)=>onChange && onChange(Number(e.target.value))} className={`w-full p-6 ${disabled ? 'bg-slate-50 opacity-50' : 'bg-slate-100'} rounded-[2rem] font-black text-2xl outline-none border-4 border-transparent focus:border-black transition-all`} />
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">{unit}</span>
      </div>
    </div>
  )
}