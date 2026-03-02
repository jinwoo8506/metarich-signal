"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPE DEFINITIONS] ──────────────────────────
interface Performance {
  year: number;
  month: number;
  contract_count?: number;
  contract_amount?: number;
  ap?: number;
  pt?: number;
  call_count?: number;
  meet_count?: number;
  intro_count?: number;
  recruit_count?: number;
  db_assigned?: number;
  db_returned?: number;
}

interface MonthlyTarget {
  year: number;
  month: number;
  target_count?: number;
  target_amount?: number;
  status?: string;
  admin_comment?: string;
}

interface Agent {
  id: string;
  name: string;
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

  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [isTeamGoalModalOpen, setIsTeamGoalModalOpen] = useState(false)
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [isNoticeOpen, setIsNoticeOpen] = useState(false) 
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editingComment, setEditingComment] = useState("")

  // 실적 조회 팝업 상태
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyType, setHistoryType] = useState<'team' | 'agent'>('agent')

  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [compMonth, setCompMonth] = useState(50)
  const [compYear, setCompYear] = useState(5)
  const [compWait, setCompWait] = useState(5)
  const [bankRate, setBankRate] = useState(2)
  const [infMoney, setInfMoney] = useState(100)
  const [infRate, setInfRate] = useState(3)
  const [intMoney, setIntMoney] = useState(1000)
  const [intRate, setIntRate] = useState(5)
  const [intYear, setIntYear] = useState(20)

  // 날짜 계산 (현재 2026년 3월 기준)
  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1
  const prevMonthDate = new Date(currentYear, currentMonth - 2, 1)
  const lastYear = prevMonthDate.getFullYear()
  const lastMonth = prevMonthDate.getMonth() + 1

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
    const currentAmount = p.contract_amount || 0
    if (currentAmount < 30) return "animate-pulse-red border-red-500 shadow-lg shadow-red-200"
    return "border-white"
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-3xl italic">SIGNAL LOADING...</div>

  const totalDoneC = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.contract_count || 0), 0)
  const totalDoneA = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.contract_amount || 0), 0)
  const totalDoneR = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.recruit_count || 0), 0)

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex text-slate-900 font-sans">
      <aside className="w-80 bg-white border-r p-6 hidden lg:flex flex-col gap-6 overflow-y-auto shrink-0 shadow-2xl">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 text-center uppercase">History Board</h2>
        
        <div className="calendar-container">
            <Calendar 
                onChange={(d: any) => setSelectedDate(d)} 
                value={selectedDate} 
                calendarType="gregory" // 일요일부터 시작
                formatDay={(locale, date) => date.getDate().toString()} // 숫자만 표기
                className="rounded-2xl border-0 shadow-sm custom-calendar" 
            />
        </div>

        {/* 실적 조회 섹션 추가 */}
        <div className="p-4 bg-slate-900 rounded-[2rem] space-y-3">
            <p className="text-[#d4af37] text-[10px] font-black uppercase text-center tracking-tighter">{currentMonth}월 실적 리포트</p>
            <button onClick={() => { setHistoryType('agent'); setIsHistoryModalOpen(true); }} className="w-full bg-white text-black py-3 rounded-2xl font-black text-xs hover:bg-[#d4af37] transition-all">실적 상세조회</button>
            {(role === 'admin' || role === 'master') && (
                <button onClick={() => { setHistoryType('team'); setIsHistoryModalOpen(true); }} className="w-full border-2 border-[#d4af37] text-[#d4af37] py-3 rounded-2xl font-black text-xs hover:bg-[#d4af37] hover:text-black transition-all">전월 팀 실적</button>
            )}
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

        <div className="mt-auto pt-6 border-t-2 border-slate-100 space-y-2">
          <button onClick={() => { setActiveTool('compare'); setIsBizToolOpen(true); }} className="w-full p-4 rounded-2xl hover:bg-blue-50 font-bold text-lg text-left">🏦 은행 vs 보험 비교</button>
          <button onClick={() => { setActiveTool('inflation'); setIsBizToolOpen(true); }} className="w-full p-4 rounded-2xl hover:bg-rose-50 font-bold text-lg text-rose-600 text-left">📉 화폐가치 계산기</button>
          <button onClick={() => { setActiveTool('interest'); setIsBizToolOpen(true); }} className="w-full p-4 rounded-2xl hover:bg-emerald-50 font-bold text-lg text-emerald-700 text-left">📈 단리 vs 복리 비교</button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-14 overflow-y-auto">
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

          {(role === "admin" || role === "master") && (
            <section className="bg-white p-8 md:p-12 rounded-[3rem] md:rounded-[5rem] shadow-xl border-4 border-slate-50">
              <div className="flex justify-between items-center mb-10"><h2 className="text-xl font-black uppercase border-l-[12px] border-black pl-6 italic">Team Goal</h2><button onClick={() => setIsTeamGoalModalOpen(true)} className="text-[10px] font-black bg-black text-[#d4af37] px-6 py-3 rounded-full">EDIT</button></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <ProgressBar label="전체 건수" current={totalDoneC} target={teamGoal.count} unit="건" color="black" />
                <ProgressBar label="전체 금액" current={totalDoneA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                <ProgressBar label="전체 도입" current={totalDoneR} target={teamGoal.recruit} unit="명" color="#2563eb" />
              </div>
            </section>
          )}

          {(role === "admin" || role === "master") && (
            <section className="space-y-8">
                <h2 className="text-2xl font-black uppercase italic border-l-[12px] border-slate-300 pl-6">에이전트 현황 관리</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {agents.map(a => {
                        const t = (a.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth) || { target_count: 0, target_amount: 0 };
                        const p = (a.performances || []).find(pf=>pf.year===currentYear && pf.month===currentMonth) || { contract_count: 0, contract_amount: 0, call_count: 0, meet_count: 0 };
                        return (
                            <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }} className={`bg-white p-8 md:p-10 rounded-[3rem] border-4 cursor-pointer shadow-lg transition-all hover:-translate-y-2 ${getAlertStyle(a)}`}>
                                <div className="font-black text-xl mb-6 flex justify-between"><span>{a.name} CA</span> <span className="text-[10px] text-slate-400">상세보기</span></div>
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

          {(role === "agent" || role === "master") && (
             <section className="space-y-12">
               <div className="flex justify-between items-center"><h2 className="text-3xl md:text-4xl font-black italic uppercase border-b-8 border-black pb-4">Activity Board</h2><button onClick={handleAgentSave} className="bg-black text-[#d4af37] px-10 py-5 rounded-[2.5rem] font-black text-sm shadow-xl">UPDATE</button></div>
               <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                 <ActivityTab label="📞 전화" value={calls} onChange={setCalls} color="bg-emerald-50" textColor="text-emerald-800" unit="건" />
                 <ActivityTab label="🤝 미팅" value={meets} onChange={setMeets} color="bg-amber-50" textColor="text-amber-800" unit="건" />
                 <ActivityTab label="📝 제안" value={pt} onChange={setPt} color="bg-purple-50" textColor="text-purple-800" unit="건" />
                 <ActivityTab label="🎁 소개" value={intros} onChange={setIntros} color="bg-rose-50" textColor="text-rose-800" unit="건" />
                 <ActivityTab label="📥 DB배정" value={dbAssigned} onChange={setDbAssigned} color="bg-blue-50" textColor="text-blue-800" unit="건" />
                 <ActivityTab label="📤 DB반품" value={dbReturned} onChange={setDbReturned} color="bg-slate-100" textColor="text-slate-800" unit="건" />
               </div>
               <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border-4 grid grid-cols-1 md:grid-cols-2 gap-12">
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
      </main>

      {/* 🚀 MODALS SECTION */}
      
      {/* 관리자: 직원 코칭 및 전월 실적 비교 모달 */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] p-10 md:p-14 relative overflow-y-auto max-h-[90vh] border-[10px] border-black">
              <button onClick={()=>setSelectedAgent(null)} className="absolute top-10 right-10 font-black text-4xl">✕</button>
              <h2 className="text-4xl font-black mb-12 italic uppercase border-b-[12px] border-black pb-6">{selectedAgent.name} 코칭 & 리포트</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <h3 className="text-xl font-black bg-black text-[#d4af37] px-6 py-2 inline-block rounded-full">이번 달 ({currentMonth}월) 실적</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {(() => {
                            const p = (selectedAgent.performances || []).find(pf=>pf.year===currentYear && pf.month===currentMonth) || { call_count:0, meet_count:0, contract_amount:0 };
                            return (
                                <>
                                    <div className="bg-slate-50 p-6 rounded-3xl text-center"><p className="text-xs font-black text-slate-400">전화</p><p className="text-2xl font-black">{p.call_count}건</p></div>
                                    <div className="bg-slate-50 p-6 rounded-3xl text-center"><p className="text-xs font-black text-slate-400">미팅</p><p className="text-2xl font-black">{p.meet_count}건</p></div>
                                    <div className="bg-slate-50 p-6 rounded-3xl text-center"><p className="text-xs font-black text-slate-400">금액</p><p className="text-2xl font-black text-[#d4af37]">{p.contract_amount}만</p></div>
                                </>
                            )
                        })()}
                    </div>
                    <textarea value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} placeholder="코칭 메시지를 입력하세요" className="w-full bg-slate-50 p-8 rounded-[2rem] font-bold text-lg h-44 outline-none border-4 focus:border-black" />
                </div>
                <div className="space-y-8">
                  <h3 className="text-xl font-black bg-slate-200 px-6 py-2 inline-block rounded-full">지난달 ({lastMonth}월) 실적 히스토리</h3>
                  <div className="grid grid-cols-3 gap-4 opacity-60">
                        {(() => {
                            const p = (selectedAgent.performances || []).find(pf=>pf.year===lastYear && pf.month===lastMonth) || { call_count:0, meet_count:0, contract_amount:0 };
                            return (
                                <>
                                    <div className="bg-slate-100 p-6 rounded-3xl text-center"><p className="text-xs font-black text-slate-400">전화</p><p className="text-xl font-black">{p.call_count}건</p></div>
                                    <div className="bg-slate-100 p-6 rounded-3xl text-center"><p className="text-xs font-black text-slate-400">미팅</p><p className="text-xl font-black">{p.meet_count}건</p></div>
                                    <div className="bg-slate-100 p-6 rounded-3xl text-center"><p className="text-xs font-black text-slate-400">금액</p><p className="text-xl font-black">{p.contract_amount}만</p></div>
                                </>
                            )
                        })()}
                  </div>
                  <div className="border-t-4 pt-8 space-y-4">
                    <p className="font-black text-sm uppercase text-slate-400">목표 조정 (이번달)</p>
                    <InBox label="목표 건수" value={(selectedAgent.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth)?.target_count || 0} 
                        onChange={(v: number) => {
                            const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id);
                            if (idx === -1) return;
                            if (!updated[idx].monthly_targets) updated[idx].monthly_targets = [];
                            const tIdx = updated[idx].monthly_targets!.findIndex(mt=>mt.year===currentYear && mt.month===currentMonth);
                            if(tIdx > -1) updated[idx].monthly_targets![tIdx].target_count = v;
                            else updated[idx].monthly_targets!.push({year: currentYear, month: currentMonth, target_count: v});
                            setAgents(updated);
                        }} unit="건" />
                    <InBox label="목표 금액" value={(selectedAgent.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth)?.target_amount || 0} 
                        onChange={(v: number) => {
                            const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id);
                            if (idx === -1) return;
                            if (!updated[idx].monthly_targets) updated[idx].monthly_targets = [];
                            const tIdx = updated[idx].monthly_targets!.findIndex(mt=>mt.year===currentYear && mt.month===currentMonth);
                            if(tIdx > -1) updated[idx].monthly_targets![tIdx].target_amount = v;
                            else updated[idx].monthly_targets!.push({year: currentYear, month: currentMonth, target_amount: v});
                            setAgents(updated);
                        }} unit="만원" />
                  </div>
                </div>
              </div>
              <button onClick={async () => { 
                const mt = (selectedAgent.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth) || {target_count:0, target_amount:0}; 
                await supabase.from("monthly_targets").upsert({ user_id: selectedAgent.id, year: currentYear, month: currentMonth, target_count: Number(mt.target_count), target_amount: Number(mt.target_amount), status: 'approved', admin_comment: editingComment }, { onConflict: 'user_id, year, month' }); 
                alert("승인 및 저장 완료"); setSelectedAgent(null); fetchAdminData(); 
              }} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] font-black text-2xl mt-12 uppercase">저장 및 승인하기</button>
          </div>
        </div>
      )}

      {/* 실적 히스토리 팝업 */}
      {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 relative border-8 border-black max-h-[85vh] overflow-y-auto">
                  <button onClick={()=>setIsHistoryModalOpen(false)} className="absolute top-8 right-8 font-black text-3xl">✕</button>
                  <h2 className="text-3xl font-black mb-8 italic uppercase border-b-8 border-black pb-4">
                      {historyType === 'team' ? `${lastMonth}월 전체 팀 실적 리포트` : `${currentMonth}월 상세 실적 현황`}
                  </h2>
                  
                  <div className="grid grid-cols-1 gap-6">
                      {historyType === 'team' ? (
                          // 팀 전체 지난달 실적
                          agents.map(a => {
                              const p = (a.performances || []).find(pf=>pf.year===lastYear && pf.month===lastMonth) || { contract_count:0, contract_amount:0, recruit_count:0 };
                              return (
                                  <div key={a.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border-2">
                                      <span className="font-black text-xl">{a.name} CA</span>
                                      <div className="flex gap-8 font-bold">
                                          <span>건수: {p.contract_count}건</span>
                                          <span className="text-[#d4af37]">금액: {p.contract_amount}만원</span>
                                          <span className="text-blue-600">도입: {p.recruit_count}명</span>
                                      </div>
                                  </div>
                              )
                          })
                      ) : (
                          // 개인 이번달 상세 (에이전트용)
                          <div className="space-y-8">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="p-8 bg-black text-white rounded-[2rem] text-center"><p className="text-[10px] text-[#d4af37] font-black mb-2">목표 달성률</p><p className="text-4xl font-black">{goal > 0 ? Math.round((contract/goal)*100) : 0}%</p></div>
                                  <div className="p-8 bg-slate-100 rounded-[2rem] text-center"><p className="text-[10px] text-slate-400 font-black mb-2">총 상담(AP)</p><p className="text-4xl font-black">{ap}회</p></div>
                                  <div className="p-8 bg-slate-100 rounded-[2rem] text-center"><p className="text-[10px] text-slate-400 font-black mb-2">DB 효율</p><p className="text-4xl font-black">{dbAssigned > 0 ? Math.round((contract/dbAssigned)*100) : 0}%</p></div>
                                  <div className="p-8 bg-slate-100 rounded-[2rem] text-center"><p className="text-[10px] text-slate-400 font-black mb-2">평균 단가</p><p className="text-4xl font-black">{contract > 0 ? Math.round(contractAmount/contract) : 0}만</p></div>
                              </div>
                              <p className="text-center font-bold text-slate-400">상세 데이터 분석은 관리자 화면에서 더 자세히 확인 가능합니다.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* 비즈니스 계산기 한글화 & 가독성 개선 */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] p-10 md:p-14 relative border-[8px] border-black">
            <button onClick={()=>setIsBizToolOpen(false)} className="absolute top-10 right-10 text-3xl font-black">✕</button>
            <div className="flex gap-4 mb-10">
              <button onClick={()=>setActiveTool('compare')} className={`px-8 py-4 rounded-full font-black text-lg ${activeTool==='compare'?'bg-black text-white':'bg-slate-100'}`}>은행 vs 보험</button>
              <button onClick={()=>setActiveTool('inflation')} className={`px-8 py-4 rounded-full font-black text-lg ${activeTool==='inflation'?'bg-black text-white':'bg-slate-100'}`}>화폐가치</button>
              <button onClick={()=>setActiveTool('interest')} className={`px-8 py-4 rounded-full font-black text-lg ${activeTool==='interest'?'bg-black text-white':'bg-slate-100'}`}>복리마법</button>
            </div>
            {activeTool === 'compare' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <InBox label="월 납입액" value={compMonth} onChange={(v: number)=>setCompMonth(v)} unit="만원" />
                  <InBox label="납입 기간" value={compYear} onChange={(v: number)=>setCompYear(v)} unit="년" />
                  <InBox label="거치 기간" value={compWait} onChange={(v: number)=>setCompWait(v)} unit="년" />
                  <InBox label="은행 금리" value={bankRate} onChange={(v: number)=>setBankRate(v)} unit="%" />
                </div>
                <div className="bg-slate-50 p-10 rounded-[3rem] border-4 border-dashed grid grid-cols-2 gap-10 text-center">
                  <div><p className="text-lg font-black text-slate-400 mb-4">은행 (단리 합계)</p><p className="text-5xl font-black">{(compMonth * compYear * 12 + (compMonth * compYear * 12 * (bankRate/100) * (compYear + compWait))).toLocaleString()}만원</p></div>
                  <div><p className="text-lg font-black text-blue-600 mb-4">보험 (예시 124%)</p><p className="text-5xl font-black text-blue-700">{(compMonth * compYear * 12 * 1.24).toLocaleString()}만원</p></div>
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
                   <p className="text-xl font-black text-rose-400 mb-6 italic">미래의 실제 가치</p>
                   <p className="text-7xl font-black text-rose-700">{Math.round(infMoney / Math.pow(1 + infRate/100, compWait)).toLocaleString()}만원</p>
                   <p className="mt-6 text-rose-400 font-bold">물가가 매년 {infRate}% 오를 때, {compWait}년 후의 가치입니다.</p>
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
                <div className="grid grid-cols-2 gap-8 text-center">
                   <div className="bg-white p-10 rounded-[3rem] border-2 shadow-sm"><p className="text-lg font-black text-slate-400 mb-4 uppercase">일반 단리</p><p className="text-5xl font-black">{(intMoney + (intMoney * (intRate/100) * intYear)).toLocaleString()}만</p></div>
                   <div className="bg-emerald-50 p-10 rounded-[3rem] border-4 border-emerald-100 shadow-md"><p className="text-lg font-black text-emerald-600 mb-4 uppercase">복리의 마법</p><p className="text-5xl font-black text-emerald-700">{Math.round(intMoney * Math.pow(1 + intRate/100, intYear)).toLocaleString()}만</p></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isNoticeOpen && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 relative border-4 border-[#d4af37]">
            <button onClick={()=>setIsNoticeOpen(false)} className="absolute top-6 right-6 font-black text-xl">✕</button>
            <h2 className="text-2xl font-black mb-6 uppercase text-[#d4af37]">전체 공지사항</h2>
            <div className="text-lg font-bold leading-relaxed whitespace-pre-wrap py-4">{globalNotice}</div>
          </div>
        </div>
      )}

      {/* 팀 목표 수정 모달 (간략) */}
      {isTeamGoalModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 border-[6px] border-black">
            <h2 className="text-2xl font-black mb-8 italic uppercase border-b-4 border-black pb-4">팀 전체 전략 수정</h2>
            <div className="space-y-6">
              <InBox label="전체 목표 건수" value={teamGoal.count} onChange={(v: number)=>setTeamGoal({...teamGoal, count:v})} unit="건" />
              <InBox label="전체 목표 금액" value={teamGoal.amount} onChange={(v: number)=>setTeamGoal({...teamGoal, amount:v})} unit="만원" />
              <InBox label="전체 도입 목표" value={teamGoal.recruit} onChange={(v: number)=>setTeamGoal({...teamGoal, recruit:v})} unit="명" />
              <textarea value={globalNotice} onChange={(e)=>setGlobalNotice(e.target.value)} placeholder="공지사항을 입력하세요" className="w-full bg-slate-50 p-6 rounded-2xl font-bold h-32 outline-none border-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={()=>setIsTeamGoalModalOpen(false)} className="bg-slate-200 py-4 rounded-xl font-black">취소</button>
              <button onClick={async ()=>{
                await supabase.from("team_goals").upsert({ id: "current_team_goal", total_goal_count: teamGoal.count, total_goal_amount: teamGoal.amount, total_goal_recruit: teamGoal.recruit, global_notice: globalNotice }, { onConflict: 'id' });
                alert("수정 완료"); setIsTeamGoalModalOpen(false);
              }} className="bg-black text-[#d4af37] py-4 rounded-xl font-black">전략 적용하기</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse-red { 0%, 100% { border-color: #ef4444; } 50% { border-color: transparent; } }
        .animate-pulse-red { animation: pulse-red 1s infinite; }
        
        /* 달력 스타일 커스텀 */
        .custom-calendar { width: 100% !important; border: none !important; font-family: 'Pretendard', sans-serif !important; }
        .react-calendar__month-view__days__day--neighboringMonth { opacity: 0.2; }
        .react-calendar__tile { padding: 12px 8px !important; font-weight: 800 !important; font-size: 14px !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; }
        
        /* 일요일 빨간색 */
        .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr { color: #ff4d4d; text-decoration: none; }
        .react-calendar__month-view__days__day:nth-child(7n+1) { color: #ff4d4d; }
        
        /* 토요일 파란색 */
        .react-calendar__month-view__weekdays__weekday:nth-child(7) abbr { color: #4d79ff; text-decoration: none; }
        .react-calendar__month-view__days__day:nth-child(7n) { color: #4d79ff; }
        
        .react-calendar__navigation button { font-weight: 900 !important; font-size: 16px !important; }
        .react-calendar__month-view__weekdays { font-weight: 900 !important; font-size: 11px !important; text-transform: uppercase; }
      `}</style>
    </div>
  )
}

// ─── 🏗️ SUB COMPONENTS ──────────────────────────────────────────────────

function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between font-black text-[11px] uppercase"><span>{label} ({current}/{target}{unit})</span><span style={{ color }}>{Math.round(rate)}%</span></div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden"><div className="h-full transition-all duration-700" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function MiniBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-1 mb-4">
      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>{label}</span><span>{Math.round(rate)}%</span></div>
      <div className="flex justify-between text-[11px] font-bold mb-1"><span>현황: {current}{unit}</span><span>목표: {target}{unit}</span></div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function ActivityTab({ label, value, onChange, color, textColor, unit }: any) {
  return (
    <div className={`${color} p-4 rounded-3xl text-center border-2 border-transparent hover:border-slate-200 transition-all`}>
      <p className={`text-[10px] font-black uppercase mb-1 ${textColor}`}>{label}</p>
      <div className="flex items-center justify-center gap-1">
        <input type="number" value={value || 0} onChange={(e)=>onChange(Number(e.target.value))} className="w-12 bg-transparent text-center text-xl font-black outline-none" />
        <span className={`text-[10px] font-bold ${textColor}`}>{unit}</span>
      </div>
    </div>
  )
}

function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-black ml-4 uppercase text-slate-400">{label}</label>
      <div className="relative">
        <input disabled={disabled} type="number" value={value || 0} onChange={(e)=> (onChange ? onChange(Number(e.target.value)) : null)} className={`w-full p-5 rounded-[2rem] font-black text-2xl outline-none border-4 ${highlight ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-transparent focus:border-black'}`} />
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">{unit}</span>
      </div>
    </div>
  )
}