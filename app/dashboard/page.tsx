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

  // 🗓️ 날짜별 교육/특이사항용
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")

  // 📊 실적 데이터
  const [goal, setGoal] = useState(0); const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0); const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0); const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0); const [dbReturned, setDbReturned] = useState(0)
  const [isApproved, setIsApproved] = useState(false)

  // 👥 팀 관리 및 공지
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [isTeamGoalModalOpen, setIsTeamGoalModalOpen] = useState(false)
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [isNoticeOpen, setIsNoticeOpen] = useState(false) // 공지 팝업 상태
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [editingComment, setEditingComment] = useState("")

  const year = 2026; const month = 2

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) { await supabase.auth.signOut(); return router.replace("/login") }
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    
    const { data: gNotice } = await supabase.from("team_goals").select("global_notice").eq("id", "current_team_goal").maybeSingle()
    if (gNotice?.global_notice) setGlobalNotice(gNotice.global_notice)

    if (userInfo.role === "admin" || userInfo.role === "master") { fetchAdminData(); fetchTeamGoal(); }
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
        if (data.global_notice) setGlobalNotice(data.global_notice)
    }
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(target_count, target_amount, status, admin_comment), performances(*)`).eq("role", "agent")
    if (data) setAgents(data)
  }

  async function fetchAgentData(id: string) {
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", id).eq("year", year).eq("month", month).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", id).eq("year", year).eq("month", month).maybeSingle()
    if (t) { setGoal(t.target_count || 0); setTargetAmount(t.target_amount || 0); setIsApproved(t.status === 'approved') }
    if (p) { setAp(p.ap || 0); setPt(p.pt || 0); setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0); setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setIntros(p.intro_count || 0); setRecruits(p.recruit_count || 0); setDbAssigned(p.db_assigned || 0); setDbReturned(p.db_returned || 0); }
  }

  const handleAgentSave = async () => {
    const payloadT = { user_id: userId, year, month, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year, month, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("데이터 저장 완료")
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-3xl italic">SIGNAL LOADING...</div>

  const totalDoneC = agents.reduce((sum, a) => sum + (a.performances[0]?.contract_count || 0), 0)
  const totalDoneA = agents.reduce((sum, a) => sum + (a.performances[0]?.contract_amount || 0), 0)
  const totalDoneR = agents.reduce((sum, a) => sum + (a.performances[0]?.recruit_count || 0), 0)

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex text-slate-900 font-sans text-base md:text-lg">
      
      {/* 🗓️ 사이드바 (모바일에서는 숨김 유지) */}
      <aside className="w-80 bg-white border-r p-6 hidden lg:flex flex-col gap-6 overflow-y-auto shrink-0 shadow-2xl">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 tracking-tighter text-center uppercase">History Board</h2>
        <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} formatDay={(l, date) => date.getDate().toString()} />
        <div className="space-y-4">
          <div className="space-y-2"><label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">📋 교육/특별사항</label><textarea readOnly={role === 'agent'} value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} className="w-full p-4 rounded-3xl bg-blue-50 text-sm h-28 outline-none font-bold border-2 border-blue-100" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">🔒 개인 메모</label><textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} className="w-full p-4 rounded-3xl bg-slate-50 text-sm h-28 outline-none font-bold border-2 border-slate-200" /></div>
          <button onClick={async () => { const dateStr = selectedDate.toISOString().split('T')[0]; await supabase.from("daily_notes").upsert({ user_id: userId, date: dateStr, agent_memo: personalMemo, ...((role !== 'agent') && { admin_notice: dailySpecialNote }) }, { onConflict: 'user_id, date' }); alert("저장 완료") }} className="w-full bg-black text-[#d4af37] py-4 rounded-3xl font-black text-xs shadow-xl uppercase">Save Date Info</button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-14 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
          
          <header className="bg-black text-white p-6 md:p-10 rounded-[2rem] md:rounded-[4rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-b-4 md:border-b-8 border-[#d4af37]">
            <div className="text-center md:text-left"><h1 className="text-2xl md:text-4xl font-black italic text-[#d4af37] tracking-tighter">METARICH SIGNAL</h1><p className="text-[10px] text-white/40 font-bold uppercase mt-1">v3.9 Responsive Edition</p></div>
            <div className="flex items-center gap-4 md:gap-8">
                <div className="text-right"><p className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">{role}</p><p className="text-xl md:text-3xl font-black">{userName}님</p></div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 px-5 py-3 md:px-8 md:py-4 rounded-2xl md:rounded-3xl text-[10px] md:text-xs font-black">LOGOUT</button>
            </div>
          </header>

          {/* 📢 개편된 공지사항: 눈 안 아픈 클릭형 */}
          <section onClick={() => setIsNoticeOpen(true)} className="bg-white hover:bg-slate-50 cursor-pointer rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl border-l-8 border-[#d4af37] flex items-center justify-between transition-all">
            <div className="flex items-center gap-4 overflow-hidden">
              <span className="text-xl md:text-2xl">📢</span>
              <span className="font-bold text-sm md:text-lg truncate tracking-tight">{globalNotice}</span>
            </div>
            <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full shrink-0 uppercase">Click to View</span>
          </section>

          {(role === "admin" || role === "master") && (
            <section className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[5rem] shadow-xl border-4 border-slate-50">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                  <h2 className="text-base md:text-xl font-black text-black uppercase tracking-widest border-l-8 md:border-l-[12px] border-black pl-4 md:pl-6 italic">Team Goal</h2>
                  <button onClick={() => setIsTeamGoalModalOpen(true)} className="text-[10px] font-black bg-black text-[#d4af37] px-4 py-2 md:px-6 md:py-3 rounded-full shadow-lg">EDIT</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:grid-cols-3 md:gap-16">
                <ProgressBar label="전체 건수" current={totalDoneC} target={teamGoal.count} unit="건" color="black" />
                <ProgressBar label="전체 금액" current={totalDoneA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                <ProgressBar label="전체 도입" current={totalDoneR} target={teamGoal.recruit} unit="명" color="#2563eb" />
              </div>
            </section>
          )}

          {/* Agent Management */}
          {(role === "admin" || role === "master") && (
            <section className="space-y-6 md:space-y-8">
                <h2 className="text-xl md:text-2xl font-black uppercase italic border-l-8 md:border-l-[12px] border-slate-300 pl-4 md:pl-6">Agent Management</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                    {agents.map(a => {
                        const t = a.monthly_targets[0] || {}; const p = a.performances[0] || {};
                        return (
                            <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }}
                                 className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[4rem] border-4 border-white hover:border-black transition-all cursor-pointer shadow-lg">
                                <div className="font-black text-xl md:text-2xl mb-4 md:mb-8">{a.name} CA</div>
                                <div className="space-y-4 md:space-y-6">
                                    <MiniBar label="건수" current={p.contract_count || 0} target={t.target_count || 1} color="black" />
                                    <MiniBar label="금액" current={p.contract_amount || 0} target={t.target_amount || 1} color="#d4af37" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
          )}

          {/* Activity Board */}
          {(role === "agent" || role === "master") && (
             <section className="space-y-8 md:space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                 <h2 className="text-2xl md:text-4xl font-black italic uppercase border-b-4 md:border-b-8 border-black pb-2 md:pb-4">Activity Board</h2>
                 <button onClick={handleAgentSave} className="w-full md:w-auto bg-black text-[#d4af37] px-8 py-4 md:px-10 md:py-5 rounded-2xl md:rounded-[2.5rem] font-black text-xs md:text-sm shadow-xl">UPDATE PERFORMANCE</button>
               </div>
               {/* 모바일에서는 3열, PC에서는 6열 */}
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
                 <ActivityTab label="📞 CALL" value={calls} onChange={setCalls} color="bg-emerald-50" textColor="text-emerald-800" borderColor="border-emerald-200" />
                 <ActivityTab label="🤝 MEET" value={meets} onChange={setMeets} color="bg-amber-50" textColor="text-amber-800" borderColor="border-amber-200" />
                 <ActivityTab label="📝 PT" value={pt} onChange={setPt} color="bg-purple-50" textColor="text-purple-800" borderColor="border-purple-200" />
                 <ActivityTab label="🎁 INTRO" value={intros} onChange={setIntros} color="bg-rose-50" textColor="text-rose-800" borderColor="border-rose-200" />
                 <ActivityTab label="📥 DB 배정" value={dbAssigned} onChange={setDbAssigned} color="bg-blue-50" textColor="text-blue-800" borderColor="border-blue-200" />
                 <ActivityTab label="📤 DB 반품" value={dbReturned} onChange={setDbReturned} color="bg-slate-100" textColor="text-slate-800" borderColor="border-slate-300" />
               </div>
               <div className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[5rem] shadow-xl border-4 border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
                 <div className="space-y-6 md:space-y-10">
                   <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase border-l-8 md:border-l-[12px] border-slate-300 pl-4 md:pl-6 italic">Goal & Recruit</h3>
                   <InBox label="목표 건수" value={goal} onChange={setGoal} unit="건" disabled={isApproved} />
                   <InBox label="목표 금액" value={targetAmount} onChange={setTargetAmount} unit="만원" disabled={isApproved} />
                   <InBox label="도입 실적" value={recruits} onChange={setRecruits} unit="명" disabled={isApproved} highlight />
                 </div>
                 <div className="space-y-6 md:space-y-10">
                   <h3 className="text-xl md:text-2xl font-black text-[#d4af37] uppercase border-l-8 md:border-l-[12px] border-[#d4af37] pl-4 md:pl-6 italic">Current Result</h3>
                   <InBox label="완료 건수" value={contract} onChange={setContract} unit="건" />
                   <InBox label="완료 금액" value={contractAmount} onChange={setContractAmount} unit="만원" />
                   <InBox label="상담 회수 (AP)" value={ap} onChange={setAp} unit="회" />
                 </div>
               </div>
             </section>
          )}
        </div>
      </main>

      {/* 👤 공지사항 상세 팝업 (추가됨) */}
      {isNoticeOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 md:p-12 relative shadow-2xl border-4 border-[#d4af37]">
            <button onClick={()=>setIsNoticeOpen(false)} className="absolute top-6 right-6 font-black text-2xl">✕</button>
            <h2 className="text-xl md:text-2xl font-black mb-6 italic border-b-4 border-black pb-2 uppercase tracking-tighter text-[#d4af37]">Global Notice</h2>
            <div className="text-base md:text-lg font-bold leading-relaxed whitespace-pre-wrap py-4">
              {globalNotice}
            </div>
            <button onClick={()=>setIsNoticeOpen(false)} className="w-full bg-black text-white py-4 rounded-2xl font-black text-sm mt-6 uppercase">Close</button>
          </div>
        </div>
      )}

      {/* 코칭 팝업 (모바일 대응 수정) */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] md:rounded-[5rem] p-6 md:p-14 relative overflow-y-auto max-h-[90vh] border-4 md:border-[10px] border-black">
              <button onClick={()=>setSelectedAgent(null)} className="absolute top-6 right-6 md:top-12 md:right-12 font-black text-3xl md:text-5xl">✕</button>
              <h2 className="text-2xl md:text-5xl font-black mb-8 md:mb-12 italic uppercase border-b-8 md:border-b-[12px] border-black pb-4 md:pb-6">{selectedAgent.name} Coaching</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
                 <CoachStat label="완료 건수" value={`${selectedAgent.performances[0]?.contract_count || 0}건`} color="text-black" />
                 <CoachStat label="건당 단가" value={`${Math.round((selectedAgent.performances[0]?.contract_amount || 0) / (selectedAgent.performances[0]?.contract_count || 1))}만`} color="text-blue-600" />
                 <CoachStat label="체결 효율" value={`${(selectedAgent.performances[0]?.meet_count / (selectedAgent.performances[0]?.contract_count || 1)).toFixed(1)}회`} color="text-rose-600" />
                 <CoachStat label="DB 배정" value={`${selectedAgent.performances[0]?.db_assigned || 0}개`} color="text-slate-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                 <div className="space-y-6">
                    <h4 className="font-black text-lg border-l-8 border-black pl-4 uppercase">Target Edit</h4>
                    <InBox label="목표 건수" value={selectedAgent.monthly_targets[0]?.target_count || 0} onChange={(v:any)=>{ const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id); updated[idx].monthly_targets[0].target_count = v; setAgents(updated); }} unit="건" />
                    <InBox label="목표 금액" value={selectedAgent.monthly_targets[0]?.target_amount || 0} onChange={(v:any)=>{ const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id); updated[idx].monthly_targets[0].target_amount = v; setAgents(updated); }} unit="만원" />
                 </div>
                 <div className="space-y-6">
                    <h4 className="font-black text-lg border-l-8 border-[#d4af37] pl-4 uppercase">Coaching Note</h4>
                    <textarea value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} className="w-full bg-slate-50 p-6 rounded-3xl font-bold text-base h-40 md:h-56 outline-none border-4 border-transparent focus:border-black" placeholder="피드백 입력..." />
                 </div>
              </div>
              <button onClick={async () => { const t = selectedAgent.monthly_targets[0]; await supabase.from("monthly_targets").upsert({ user_id: selectedAgent.id, year, month, target_count: Number(t.target_count), target_amount: Number(t.target_amount), status: 'approved', admin_comment: editingComment }); await supabase.from("performances").upsert({ user_id: selectedAgent.id, year, month, recruit_count: Number(selectedAgent.performances[0].recruit_count) }); alert("승인 완료"); setSelectedAgent(null); fetchAdminData(); }} className="w-full bg-black text-[#d4af37] py-6 md:py-8 rounded-[2rem] md:rounded-[3rem] font-black text-xl md:text-3xl mt-8">SAVE COACHING</button>
          </div>
        </div>
      )}

      {/* 전략 수정 팝업 (모바일 대응) */}
      {isTeamGoalModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2rem] md:rounded-[5rem] p-8 md:p-16 relative shadow-2xl border-4 md:border-8 border-[#d4af37]">
            <button onClick={() => setIsTeamGoalModalOpen(false)} className="absolute top-6 right-6 font-black text-3xl">✕</button>
            <h2 className="text-xl md:text-3xl font-black mb-8 italic uppercase tracking-tighter">Team Strategy & Notice</h2>
            <div className="space-y-6 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-600 ml-4 uppercase tracking-widest">📢 공지사항 문구</label>
                <textarea value={globalNotice} onChange={(e)=>setGlobalNotice(e.target.value)} className="w-full p-4 rounded-2xl bg-blue-50 font-black text-base outline-none border-4 border-blue-100 focus:border-blue-600 h-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InBox label="목표 건수" value={teamGoal.count} onChange={(v:any)=>setTeamGoal({...teamGoal, count: v})} unit="건" />
                <InBox label="목표 금액" value={teamGoal.amount} onChange={(v:any)=>setTeamGoal({...teamGoal, amount: v})} unit="만원" />
              </div>
              <InBox label="전체 도입 목표" value={teamGoal.recruit} onChange={(v:any)=>setTeamGoal({...teamGoal, recruit: v})} unit="명" />
            </div>
            <button onClick={async () => {
              await supabase.from("team_goals").upsert({ id: "current_team_goal", year, month, total_goal_count: Number(teamGoal.count), total_goal_amount: Number(teamGoal.amount), total_goal_recruit: Number(teamGoal.recruit), global_notice: globalNotice })
              alert("업데이트 완료"); setIsTeamGoalModalOpen(false); fetchTeamGoal();
            }} className="w-full bg-black text-[#d4af37] py-5 md:py-8 rounded-[2rem] font-black text-lg md:text-2xl">UPDATE STRATEGY</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .react-calendar { width: 100% !important; border: none !important; border-radius: 20px; font-family: inherit; font-size: 1rem !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 1rem; }
      `}</style>
    </div>
  )
}

// 하위 컴포넌트 (반응형 수치 적용)
function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-2 md:space-y-4">
      <div className="flex justify-between font-black uppercase text-xs md:text-base"><span>{label}</span><span>{current}/{target}{unit}</span></div>
      <div className="w-full h-4 md:h-6 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className="h-full transition-all duration-1000" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}
function MiniBar({ label, current, target, color }: any) {
    const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
    return (
        <div className="w-full space-y-1 md:space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase"><span>{label}</span><span>{Math.round(rate)}%</span></div>
            <div className="w-full h-2 md:h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
        </div>
    )
}
function CoachStat({ label, value, color }: any) {
    return (
        <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[3rem] border-2 md:border-4 border-slate-100 text-center shadow-sm">
            <p className="text-[8px] md:text-xs font-black text-slate-400 uppercase mb-1 tracking-widest">{label}</p>
            <p className={`text-base md:text-3xl font-black ${color} italic`}>{value}</p>
        </div>
    )
}
function ActivityTab({ label, value, onChange, color, textColor, borderColor }: any) {
    return (
      <div className={`${color} ${borderColor} border-4 md:border-[6px] p-3 md:p-6 rounded-[1.5rem] md:rounded-[3rem] shadow-md active:scale-95 transition-transform`}>
        <label className="text-[8px] md:text-xs font-black block mb-1 md:mb-3 uppercase opacity-60 tracking-tighter">{label}</label>
        <input type="number" value={value === 0 ? "" : value} onChange={(e) => onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))} className={`w-full text-lg md:text-3xl font-black outline-none bg-transparent italic ${textColor}`} placeholder="0" />
      </div>
    )
}
function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
    return (
      <div className="space-y-1 md:space-y-2">
        <label className={`text-[10px] font-black ml-4 uppercase ${highlight ? 'text-blue-600' : 'text-slate-400'}`}>{label}</label>
        <div className="relative">
          <input type="number" value={value === 0 ? "" : value} onChange={(e) => onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))} disabled={disabled} className={`w-full p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-base md:text-2xl outline-none border-4 md:border-[6px] border-transparent ${disabled ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 focus:border-black'} ${highlight && !disabled ? 'bg-blue-50' : ''}`} placeholder="0" />
          <span className="absolute right-6 md:right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">{unit}</span>
        </div>
      </div>
    )
}