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

  // 🗓️ 날짜별 교육/특이사항용 (사이드바)
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

  // 👥 팀 관리 및 흐르는 공지
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [isTeamGoalModalOpen, setIsTeamGoalModalOpen] = useState(false)
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다. 오늘 하루도 화이팅하세요!")
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
    
    // 전체 흐르는 공지 가져오기
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
    <div className="min-h-screen bg-[#f1f5f9] flex text-slate-900 font-sans text-lg">
      
      {/* 🗓️ 사이드바: 날짜별 교육/특별사항/메모 */}
      <aside className="w-96 bg-white border-r p-8 hidden lg:flex flex-col gap-8 overflow-y-auto shrink-0 shadow-2xl">
        <h2 className="font-black italic text-3xl border-b-4 border-black pb-4 tracking-tighter text-center uppercase">History Board</h2>
        <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} formatDay={(l, date) => date.getDate().toString()} />
        <div className="space-y-6">
          <div className="space-y-2"><label className="text-xs font-black text-blue-700 uppercase tracking-widest">📋 {selectedDate.toLocaleDateString()} 교육/특별사항</label><textarea readOnly={role === 'agent'} value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} className="w-full p-5 rounded-[2rem] bg-blue-50 text-base h-32 outline-none font-bold border-2 border-blue-100" placeholder="날짜별 공지 내용..." /></div>
          <div className="space-y-2"><label className="text-xs font-black text-slate-800 uppercase tracking-widest">🔒 개인 메모</label><textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} className="w-full p-5 rounded-[2rem] bg-slate-50 text-base h-32 outline-none font-bold border-2 border-slate-200" placeholder="나만의 기록..." /></div>
          <button onClick={async () => { const dateStr = selectedDate.toISOString().split('T')[0]; await supabase.from("daily_notes").upsert({ user_id: userId, date: dateStr, agent_memo: personalMemo, ...((role !== 'agent') && { admin_notice: dailySpecialNote }) }, { onConflict: 'user_id, date' }); alert("해당 날짜 데이터 저장 완료") }} className="w-full bg-black text-[#d4af37] py-5 rounded-[2rem] font-black text-sm shadow-xl">SAVE DATE INFO</button>
        </div>
      </aside>

      <main className="flex-1 p-8 md:p-14 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <header className="bg-black text-white p-10 rounded-[4rem] flex justify-between items-center shadow-2xl border-b-8 border-[#d4af37]">
            <div><h1 className="text-4xl font-black italic text-[#d4af37] tracking-tighter">METARICH SIGNAL</h1><p className="text-xs text-white/40 font-bold uppercase mt-2">v3.8 Master Marquee Edition</p></div>
            <div className="text-right flex items-center gap-8">
                <div><p className="text-[#d4af37] text-xs font-black uppercase tracking-widest">{role}</p><p className="text-3xl font-black">{userName}님</p></div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 px-8 py-4 rounded-3xl text-xs font-black">LOGOUT</button>
            </div>
          </header>

          {/* 🚀 [NEW] 전체 공지사항 흐르는 자막 (Marquee) */}
          <section className="bg-black rounded-3xl py-4 overflow-hidden shadow-2xl border-y-4 border-[#d4af37]">
            <div className="flex whitespace-nowrap animate-marquee">
              <span className="text-2xl font-black text-white italic px-10">📢 {globalNotice}</span>
              <span className="text-2xl font-black text-white italic px-10">📢 {globalNotice}</span>
              <span className="text-2xl font-black text-white italic px-10">📢 {globalNotice}</span>
            </div>
          </section>

          {(role === "admin" || role === "master") && (
            <section className="bg-white p-12 rounded-[5rem] shadow-xl border-4 border-slate-50 relative overflow-hidden">
              <div className="flex justify-between items-center mb-10">
                  <h2 className="text-xl font-black text-black uppercase tracking-widest border-l-[12px] border-black pl-6 italic">Team Goal Progress</h2>
                  <button onClick={() => setIsTeamGoalModalOpen(true)} className="text-xs font-black bg-black text-[#d4af37] px-6 py-3 rounded-full shadow-lg">EDIT TEAM STRATEGY</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                <ProgressBar label="전체 건수" current={totalDoneC} target={teamGoal.count} unit="건" color="black" />
                <ProgressBar label="전체 금액" current={totalDoneA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                <ProgressBar label="전체 도입" current={totalDoneR} target={teamGoal.recruit} unit="명" color="#2563eb" />
              </div>
            </section>
          )}

          {/* 직원 관리 섹션 (생략... 이전과 동일하게 유지) */}
          {(role === "admin" || role === "master") && (
            <section className="space-y-8">
                <h2 className="text-2xl font-black uppercase italic border-l-[12px] border-slate-300 pl-6">Agent Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {agents.map(a => {
                        const t = a.monthly_targets[0] || {}; const p = a.performances[0] || {};
                        return (
                            <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }}
                                 className="bg-white p-10 rounded-[4rem] border-4 border-white hover:border-black transition-all cursor-pointer shadow-lg group">
                                <div className="font-black text-2xl mb-8">{a.name} CA</div>
                                <div className="space-y-6">
                                    <MiniBar label="건수 달성" current={p.contract_count || 0} target={t.target_count || 1} unit="건" color="black" />
                                    <MiniBar label="금액 달성" current={p.contract_amount || 0} target={t.target_amount || 1} unit="만" color="#d4af37" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
          )}

          {/* 설계사 활동 입력 (생략... 이전과 동일하게 유지) */}
          {(role === "agent" || role === "master") && (
             <section className="space-y-12">
               <div className="flex justify-between items-center px-4"><h2 className="text-4xl font-black italic uppercase border-b-8 border-black pb-4">Activity Board</h2><button onClick={handleAgentSave} className="bg-black text-[#d4af37] px-10 py-5 rounded-[2.5rem] font-black text-sm shadow-xl">UPDATE PERFORMANCE</button></div>
               <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                 <ActivityTab label="📞 CALL" value={calls} onChange={setCalls} color="bg-emerald-50" textColor="text-emerald-800" borderColor="border-emerald-200" />
                 <ActivityTab label="🤝 MEET" value={meets} onChange={setMeets} color="bg-amber-50" textColor="text-amber-800" borderColor="border-amber-200" />
                 <ActivityTab label="📝 PT" value={pt} onChange={setPt} color="bg-purple-50" textColor="text-purple-800" borderColor="border-purple-200" />
                 <ActivityTab label="🎁 INTRO" value={intros} onChange={setIntros} color="bg-rose-50" textColor="text-rose-800" borderColor="border-rose-200" />
                 <ActivityTab label="📥 DB 배정" value={dbAssigned} onChange={setDbAssigned} color="bg-blue-50" textColor="text-blue-800" borderColor="border-blue-200" />
                 <ActivityTab label="📤 DB 반품" value={dbReturned} onChange={setDbReturned} color="bg-slate-100" textColor="text-slate-800" borderColor="border-slate-300" />
               </div>
               <div className="bg-white p-12 rounded-[5rem] shadow-xl border-4 border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-20">
                 <div className="space-y-10">
                   <h3 className="text-2xl font-black text-slate-800 uppercase border-l-[12px] border-slate-300 pl-6 italic">Goal & Recruit</h3>
                   <InBox label="목표 건수" value={goal} onChange={setGoal} unit="건" disabled={isApproved} />
                   <InBox label="목표 금액" value={targetAmount} onChange={setTargetAmount} unit="만원" disabled={isApproved} />
                   <InBox label="도입 실적" value={recruits} onChange={setRecruits} unit="명" disabled={isApproved} highlight />
                 </div>
                 <div className="space-y-10">
                   <h3 className="text-2xl font-black text-[#d4af37] uppercase border-l-[12px] border-[#d4af37] pl-6 italic">Current Result</h3>
                   <InBox label="완료 건수" value={contract} onChange={setContract} unit="건" />
                   <InBox label="완료 금액" value={contractAmount} onChange={setContractAmount} unit="만원" />
                   <InBox label="상담 회수 (AP)" value={ap} onChange={setAp} unit="회" />
                 </div>
               </div>
             </section>
          )}
        </div>
      </main>

      {/* 👤 코칭 팝업 (생략... 이전과 동일하게 유지) */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-5xl rounded-[5rem] p-14 relative overflow-y-auto max-h-[95vh] border-[10px] border-black">
             <button onClick={()=>setSelectedAgent(null)} className="absolute top-12 right-12 font-black text-5xl">✕</button>
             <h2 className="text-5xl font-black mb-12 italic uppercase border-b-[12px] border-black pb-6">{selectedAgent.name} Coaching</h2>
             {/* 팝업 상세 내용 동일 */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                <CoachStat label="완료 건수" value={`${selectedAgent.performances[0]?.contract_count || 0}건`} color="text-black" />
                <CoachStat label="건당 단가" value={`${Math.round((selectedAgent.performances[0]?.contract_amount || 0) / (selectedAgent.performances[0]?.contract_count || 1))}만`} color="text-blue-600" />
                <CoachStat label="체결 효율" value={`${(selectedAgent.performances[0]?.meet_count / (selectedAgent.performances[0]?.contract_count || 1)).toFixed(1)}회`} color="text-rose-600" />
                <CoachStat label="DB 배정" value={`${selectedAgent.performances[0]?.db_assigned || 0}개`} color="text-slate-500" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                    <h4 className="font-black text-xl border-l-[10px] border-black pl-5">Target Edit</h4>
                    <InBox label="목표 건수" value={selectedAgent.monthly_targets[0]?.target_count || 0} onChange={(v:any)=>{ const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id); updated[idx].monthly_targets[0].target_count = v; setAgents(updated); }} unit="건" />
                    <InBox label="목표 금액" value={selectedAgent.monthly_targets[0]?.target_amount || 0} onChange={(v:any)=>{ const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id); updated[idx].monthly_targets[0].target_amount = v; setAgents(updated); }} unit="만원" />
                    <InBox label="도입 실적" value={selectedAgent.performances[0]?.recruit_count || 0} onChange={(v:any)=>{ const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id); updated[idx].performances[0].recruit_count = v; setAgents(updated); }} unit="명" />
                </div>
                <div className="space-y-8">
                    <h4 className="font-black text-xl border-l-[10px] border-[#d4af37] pl-5">Coaching Note</h4>
                    <textarea value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} className="w-full bg-slate-50 p-8 rounded-[3rem] font-bold text-lg h-56 outline-none border-4 border-transparent focus:border-black" placeholder="피드백 입력..." />
                </div>
             </div>
             <button onClick={async () => { const t = selectedAgent.monthly_targets[0]; await supabase.from("monthly_targets").upsert({ user_id: selectedAgent.id, year, month, target_count: Number(t.target_count), target_amount: Number(t.target_amount), status: 'approved', admin_comment: editingComment }); await supabase.from("performances").upsert({ user_id: selectedAgent.id, year, month, recruit_count: Number(selectedAgent.performances[0].recruit_count) }); alert("승인 완료"); setSelectedAgent(null); fetchAdminData(); }} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] font-black text-3xl mt-12">SAVE COACHING</button>
          </div>
        </div>
      )}

      {/* 🏆 팀 전략 및 [흐르는 공지] 수정 팝업 */}
      {isTeamGoalModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-2xl rounded-[5rem] p-16 relative shadow-2xl border-8 border-[#d4af37]">
            <button onClick={() => setIsTeamGoalModalOpen(false)} className="absolute top-12 right-12 font-black text-4xl">✕</button>
            <h2 className="text-4xl font-black mb-12 italic uppercase tracking-tighter">Team Strategy & Global Notice</h2>
            <div className="space-y-8 mb-14">
              <div className="space-y-2">
                <label className="text-xs font-black text-blue-600 ml-4 uppercase">📢 흐르는 공지사항 문구</label>
                <input type="text" value={globalNotice} onChange={(e)=>setGlobalNotice(e.target.value)} className="w-full p-6 rounded-[2rem] bg-blue-50 font-black text-xl outline-none border-4 border-blue-100 focus:border-blue-600" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <InBox label="전체 목표 건수" value={teamGoal.count} onChange={(v:any)=>setTeamGoal({...teamGoal, count: v})} unit="건" />
                <InBox label="전체 목표 금액" value={teamGoal.amount} onChange={(v:any)=>setTeamGoal({...teamGoal, amount: v})} unit="만원" />
              </div>
              <InBox label="전체 도입 목표" value={teamGoal.recruit} onChange={(v:any)=>setTeamGoal({...teamGoal, recruit: v})} unit="명" />
            </div>
            <button onClick={async () => {
              await supabase.from("team_goals").upsert({ id: "current_team_goal", year, month, total_goal_count: Number(teamGoal.count), total_goal_amount: Number(teamGoal.amount), total_goal_recruit: Number(teamGoal.recruit), global_notice: globalNotice })
              alert("팀 전략 및 공지 업데이트 완료"); setIsTeamGoalModalOpen(false); fetchTeamGoal();
            }} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] font-black text-2xl">UPDATE STRATEGY</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { display: inline-flex; animation: marquee 25s linear infinite; }
        .react-calendar { width: 100% !important; border: none !important; border-radius: 30px; font-family: inherit; font-size: 1.2rem !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 1.5rem; }
      `}</style>
    </div>
  )
}

// 하위 컴포넌트 ProgressBar, MiniBar, ActivityStat, CoachStat, ActivityTab, InBox 등 이전과 동일 (크기 1.2배 유지)
function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between font-black uppercase text-lg"><span>{label}</span><span>{current}/{target}{unit}</span></div>
      <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className="h-full transition-all duration-1000" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}
function MiniBar({ label, current, target, unit, color }: any) {
    const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between text-xs font-black uppercase"><span>{label}</span><span>{Math.round(rate)}%</span></div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
        </div>
    )
}
function CoachStat({ label, value, color, sub }: any) {
    return (
        <div className="bg-slate-50 p-6 rounded-[3rem] border-4 border-slate-100 text-center shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</p>
            <p className={`text-3xl font-black ${color} italic`}>{value}</p>
            {sub && <p className="text-[10px] font-bold text-slate-400 mt-2">{sub}</p>}
        </div>
    )
}
function ActivityTab({ label, value, onChange, color, textColor, borderColor }: any) {
    return (
      <div className={`${color} ${borderColor} border-[6px] p-6 rounded-[3rem] shadow-md active:scale-95 transition-transform`}>
        <label className="text-xs font-black block mb-3 uppercase opacity-60 tracking-tighter">{label}</label>
        <input type="number" value={value === 0 ? "" : value} onChange={(e) => onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))} className={`w-full text-3xl font-black outline-none bg-transparent italic ${textColor}`} placeholder="0" />
      </div>
    )
}
function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
    return (
      <div className="space-y-2">
        <label className={`text-xs font-black ml-4 uppercase ${highlight ? 'text-blue-600' : 'text-slate-400'}`}>{label}</label>
        <div className="relative">
          <input type="number" value={value === 0 ? "" : value} onChange={(e) => onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))} disabled={disabled} className={`w-full p-6 rounded-[2.5rem] font-black text-2xl outline-none border-[6px] border-transparent ${disabled ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 focus:border-black'} ${highlight && !disabled ? 'bg-blue-50' : ''}`} placeholder="0" />
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">{unit}</span>
        </div>
      </div>
    )
}
function ActivityStat({ label, value, color }: any) {
    return (
        <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value || 0}</p>
        </div>
    )
}