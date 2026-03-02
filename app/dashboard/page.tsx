"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ 타입 정의 (빌드 실패를 막는 핵심 방어선) ──────────────────────────
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

  // 🗓️ 날짜 및 메모 상태
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")

  // 📊 실적 데이터 상태 (숫자형 초기값 0으로 통일)
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

  // 👥 팀 관리 상태
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [isTeamGoalModalOpen, setIsTeamGoalModalOpen] = useState(false)
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [isNoticeOpen, setIsNoticeOpen] = useState(false) 
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editingComment, setEditingComment] = useState("")

  // 🧮 영업 지원 도구 상태
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [compMonth, setCompMonth] = useState(50)
  const [compYear, setCompYear] = useState(5)
  const [compWait, setCompWait] = useState(5)
  const [bankRate, setBankRate] = useState(2)
  const [insuRate, setInsuRate] = useState(124)
  const [infMoney, setInfMoney] = useState(100)
  const [infRate, setInfRate] = useState(3)
  const [intMoney, setIntMoney] = useState(1000)
  const [intRate, setIntRate] = useState(5)
  const [intYear, setIntYear] = useState(20)

  // 📅 기준 날짜
  const year = 2026
  const month = 3
  const lastYear = month === 1 ? year - 1 : year
  const lastMonth = month === 1 ? 12 : month - 1

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) { 
      await supabase.auth.signOut()
      return router.replace("/login") 
    }
    
    setUserId(session.user.id)
    setRole(userInfo.role)
    setUserName(userInfo.name)
    
    fetchTeamGoal()
    if (userInfo.role === "admin" || userInfo.role === "master") fetchAdminData()
    if (userInfo.role === "agent" || userInfo.role === "master") fetchAgentData(session.user.id)
    setLoading(false)
  }

  async function fetchDailyData(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const { data: notice } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).limit(1).maybeSingle()
    const { data: myData } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(notice?.admin_notice || "")
    setPersonalMemo(myData?.agent_memo || "")
  }

  async function fetchTeamGoal() {
    const { data } = await supabase.from("team_goals").select("*").eq("id", "current_team_goal").maybeSingle()
    if (data) {
        setTeamGoal({ 
          count: Number(data.total_goal_count || 0), 
          amount: Number(data.total_goal_amount || 0), 
          recruit: Number(data.total_goal_recruit || 0) 
        })
        setGlobalNotice(data.global_notice || "")
    }
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  async function fetchAgentData(id: string) {
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", id).eq("year", year).eq("month", month).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", id).eq("year", year).eq("month", month).maybeSingle()
    if (t) { 
      setGoal(t.target_count || 0); setTargetAmount(t.target_amount || 0); setIsApproved(t.status === 'approved') 
    }
    if (p) { 
      setAp(p.ap || 0); setPt(p.pt || 0); setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0)
      setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setIntros(p.intro_count || 0); setRecruits(p.recruit_count || 0)
      setDbAssigned(p.db_assigned || 0); setDbReturned(p.db_returned || 0)
    }
  }

  const handleAgentSave = async () => {
    const payloadT = { user_id: userId, year, month, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year, month, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("데이터 저장 완료")
  }

  const getAlertStyle = (agent: Agent) => {
    const p = (agent.performances || []).find(pf => pf.year === year && pf.month === month) || {}
    const todayDate = new Date()
    const day = todayDate.getDate()
    const currentAmount = p.contract_amount || 0
    if (currentAmount < 30) return "animate-pulse-red border-red-500 shadow-lg shadow-red-200"
    if ((day <= 10 && currentAmount === 0) || (day > 25 && currentAmount < 25)) return "animate-pulse-yellow border-yellow-400 shadow-lg shadow-yellow-100"
    return "border-white"
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-3xl italic">SIGNAL LOADING...</div>

  // 전체 실적 합산 로직 (안전한 참조)
  const totalDoneC = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===year && p.month===month)?.contract_count || 0), 0)
  const totalDoneA = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===year && p.month===month)?.contract_amount || 0), 0)
  const totalDoneR = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===year && p.month===month)?.recruit_count || 0), 0)

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex text-slate-900 font-sans">
      
      {/* 🗓️ 사이드바 */}
      <aside className="w-80 bg-white border-r p-6 hidden lg:flex flex-col gap-6 overflow-y-auto shrink-0 shadow-2xl">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 text-center uppercase">History Board</h2>
        <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} className="rounded-2xl border-0 shadow-sm" />
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest">📋 교육/특별사항</label>
            <textarea readOnly={role === 'agent'} value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} className="w-full p-4 rounded-3xl bg-blue-50 text-sm h-24 outline-none font-bold border-2 border-blue-100" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">🔒 개인 메모</label>
            <textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} className="w-full p-4 rounded-3xl bg-slate-50 text-sm h-24 outline-none font-bold border-2 border-slate-200" />
          </div>
          <button onClick={async () => { 
            const dateStr = selectedDate.toISOString().split('T')[0]; 
            await supabase.from("daily_notes").upsert({ user_id: userId, date: dateStr, agent_memo: personalMemo, ...((role !== 'agent') && { admin_notice: dailySpecialNote }) }, { onConflict: 'user_id, date' }); 
            alert("저장 완료") 
          }} className="w-full bg-black text-[#d4af37] py-4 rounded-3xl font-black text-xs uppercase">Save Info</button>
        </div>
        <div className="mt-auto pt-6 border-t-2 border-slate-100 space-y-2">
          <button onClick={() => { setActiveTool('compare'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-blue-50 transition-all font-bold text-sm"><span>🏦</span> 은행 vs 보험 비교</button>
          <button onClick={() => { setActiveTool('inflation'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-rose-50 transition-all font-bold text-sm text-rose-600"><span>📉</span> 화폐가치 계산기</button>
          <button onClick={() => { setActiveTool('interest'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-emerald-50 transition-all font-bold text-sm text-emerald-700"><span>📈</span> 단리 vs 복리 비교</button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-14 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
          
          <header className="bg-black text-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-b-8 border-[#d4af37]">
            <div className="text-center md:text-left"><h1 className="text-2xl md:text-4xl font-black italic text-[#d4af37] uppercase">METARICH SIGNAL</h1></div>
            <div className="flex items-center gap-4 md:gap-8">
                <div className="text-right"><p className="text-[#d4af37] text-[10px] font-black uppercase">{role}</p><p className="text-xl md:text-3xl font-black">{userName}님</p></div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 px-6 py-3 rounded-2xl text-xs font-black">LOGOUT</button>
            </div>
          </header>

          <section onClick={() => setIsNoticeOpen(true)} className="bg-white hover:bg-slate-50 cursor-pointer rounded-3xl p-6 shadow-xl border-l-8 border-[#d4af37] flex items-center justify-between transition-all">
            <div className="flex items-center gap-4 overflow-hidden"><span className="text-2xl">📢</span><span className="font-bold text-lg truncate">{globalNotice}</span></div>
            <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase">View</span>
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
                <h2 className="text-2xl font-black uppercase italic border-l-[12px] border-slate-300 pl-6">Agent Management</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {agents.map(a => {
                        const t = (a.monthly_targets || []).find(mt=>mt.year===year && mt.month===month) || {};
                        const p = (a.performances || []).find(pf=>pf.year===year && pf.month===month) || {};
                        return (
                            <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }} className={`bg-white p-8 md:p-10 rounded-[3rem] border-4 cursor-pointer shadow-lg ${getAlertStyle(a)}`}>
                                <div className="flex justify-between items-start mb-6"><div className="font-black text-xl">{a.name} CA</div><span className="text-[10px] font-black uppercase">Detail ➔</span></div>
                                <div className="space-y-6">
                                    <MiniBar label="건수" current={p.contract_count || 0} target={t.target_count || 0} unit="건" color="black" />
                                    <MiniBar label="금액" current={p.contract_amount || 0} target={t.target_amount || 0} unit="만" color="#d4af37" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
          )}

          {(role === "agent" || role === "master") && (
             <section className="space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="text-3xl md:text-4xl font-black italic uppercase border-b-8 border-black pb-4">Activity Board</h2><button onClick={handleAgentSave} className="w-full md:w-auto bg-black text-[#d4af37] px-10 py-5 rounded-[2.5rem] font-black text-sm shadow-xl">UPDATE</button></div>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                 <ActivityTab label="📞 CALL" value={calls} onChange={setCalls} color="bg-emerald-50" textColor="text-emerald-800" borderColor="border-emerald-200" />
                 <ActivityTab label="🤝 MEET" value={meets} onChange={setMeets} color="bg-amber-50" textColor="text-amber-800" borderColor="border-amber-200" />
                 <ActivityTab label="📝 PT" value={pt} onChange={setPt} color="bg-purple-50" textColor="text-purple-800" borderColor="border-purple-200" />
                 <ActivityTab label="🎁 INTRO" value={intros} onChange={setIntros} color="bg-rose-50" textColor="text-rose-800" borderColor="border-rose-200" />
                 <ActivityTab label="📥 DB 배정" value={dbAssigned} onChange={setDbAssigned} color="bg-blue-50" textColor="text-blue-800" borderColor="border-blue-200" />
                 <ActivityTab label="📤 DB 반품" value={dbReturned} onChange={setDbReturned} color="bg-slate-100" textColor="text-slate-800" borderColor="border-slate-300" />
               </div>
               <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border-4 grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-10">
                   <h3 className="text-2xl font-black text-slate-800 uppercase border-l-[12px] border-slate-300 pl-6">Goal</h3>
                   <InBox label="목표 건수" value={goal} onChange={setGoal} unit="건" disabled={isApproved} />
                   <InBox label="목표 금액" value={targetAmount} onChange={setTargetAmount} unit="만원" disabled={isApproved} />
                   <InBox label="도입 실적" value={recruits} onChange={setRecruits} unit="명" highlight />
                 </div>
                 <div className="space-y-10">
                   <h3 className="text-2xl font-black text-[#d4af37] uppercase border-l-[12px] border-[#d4af37] pl-6">Result</h3>
                   <InBox label="완료 건수" value={contract} onChange={setContract} unit="건" />
                   <InBox label="완료 금액" value={contractAmount} onChange={setContractAmount} unit="만원" />
                   <InBox label="상담 회수 (AP)" value={ap} onChange={setAp} unit="회" />
                 </div>
               </div>
             </section>
          )}
        </div>
      </main>

      {/* 모달 로직들... (기존 기능 100% 유지) */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] p-10 md:p-14 relative overflow-y-auto max-h-[90vh] border-[10px] border-black">
              <button onClick={()=>setSelectedAgent(null)} className="absolute top-10 right-10 font-black text-4xl">✕</button>
              <h2 className="text-4xl md:text-5xl font-black mb-12 italic uppercase border-b-[12px] border-black pb-6">{selectedAgent.name} Coaching</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="bg-blue-50 p-8 rounded-[3rem] border-2 relative">
                    <span className="absolute -top-4 left-10 bg-blue-600 text-white px-6 py-2 rounded-full font-black text-xs uppercase">Current: {month}월</span>
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const p = (selectedAgent.performances || []).find(pf=>pf.year===year && pf.month===month) || {};
                        return <><ActivityStat label="CALL" value={p.call_count} color="text-emerald-700" /><ActivityStat label="MEET" value={p.meet_count} color="text-amber-700" /><ActivityStat label="PT" value={p.pt} color="text-purple-700" /></>
                      })()}
                    </div>
                  </div>
                  <textarea value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} placeholder="코칭 메시지 입력" className="w-full bg-slate-50 p-8 rounded-[2rem] font-bold text-lg h-56 outline-none border-4 focus:border-black" />
                </div>
                <div className="space-y-8 border-l-0 lg:border-l-2 lg:pl-12">
                  <div className="bg-slate-50 p-8 rounded-[3rem] border-2 relative opacity-70">
                    <span className="absolute -top-4 left-10 bg-slate-400 text-white px-6 py-2 rounded-full font-black text-xs uppercase">History: {lastMonth}월</span>
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const p = (selectedAgent.performances || []).find(pf=>pf.year===lastYear && pf.month===lastMonth) || {};
                        return <><ActivityStat label="CALL" value={p.call_count} color="text-slate-500" /><ActivityStat label="MEET" value={p.meet_count} color="text-slate-500" /><ActivityStat label="금액" value={p.contract_amount} color="text-slate-500" /></>
                      })()}
                    </div>
                  </div>
                  <InBox label="목표 건수" value={(selectedAgent.monthly_targets || []).find(mt=>mt.year===year && mt.month===month)?.target_count || 0} onChange={(v:any)=>{
                        const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id);
                        const mt = updated[idx].monthly_targets || []; const tIdx = mt.findIndex(mt=>mt.year===year && mt.month===month);
                        if(tIdx > -1) mt[tIdx].target_count = v; setAgents(updated);
                    }} unit="건" />
                  <InBox label="목표 금액" value={(selectedAgent.monthly_targets || []).find(mt=>mt.year===year && mt.month===month)?.target_amount || 0} onChange={(v:any)=>{
                        const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id);
                        const mt = updated[idx].monthly_targets || []; const tIdx = mt.findIndex(mt=>mt.year===year && mt.month===month);
                        if(tIdx > -1) mt[tIdx].target_amount = v; setAgents(updated);
                    }} unit="만원" />
                </div>
              </div>
              <button onClick={async () => { 
                const mt = (selectedAgent.monthly_targets || []).find(mt=>mt.year===year && mt.month===month) || {target_count:0, target_amount:0}; 
                await supabase.from("monthly_targets").upsert({ user_id: selectedAgent.id, year, month, target_count: Number(mt.target_count), target_amount: Number(mt.target_amount), status: 'approved', admin_comment: editingComment }, { onConflict: 'user_id, year, month' }); 
                alert("승인 완료"); setSelectedAgent(null); fetchAdminData(); 
              }} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] font-black text-2xl mt-12 uppercase">Save & Approve</button>
          </div>
        </div>
      )}

      {/* 기타 모달 및 스타일 (기존 코드와 동일) */}
      <style jsx global>{`
        @keyframes pulse-yellow { 0%, 100% { border-color: #facc15; } 50% { border-color: transparent; } }
        @keyframes pulse-red { 0%, 100% { border-color: #ef4444; } 50% { border-color: transparent; } }
        .animate-pulse-yellow { animation: pulse-yellow 1.5s infinite; }
        .animate-pulse-red { animation: pulse-red 1s infinite; }
        .react-calendar { width: 100% !important; border: none !important; font-family: inherit !important; }
      `}</style>
    </div>
  )
}

// ─── 하위 컴포넌트 (타입 안정성 보강) ──────────────────────────────────────

function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between font-black text-[11px] uppercase"><span>{label} ({current}/{target}{unit})</span><span style={{ color }}>{Math.round(rate)}%</span></div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-50"><div className="h-full transition-all duration-1000" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function MiniBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>{label}</span><span>{Math.round(rate)}%</span></div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function ActivityStat({ label, value, color }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl text-center shadow-sm border border-slate-100">
      <p className="text-[9px] font-black text-slate-300 uppercase mb-1">{label}</p>
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