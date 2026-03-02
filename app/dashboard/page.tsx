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
  ap?: number; pt?: number; call_count?: number;
  meet_count?: number; intro_count?: number;
  recruit_count?: number; db_assigned?: number; db_returned?: number;
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

  // 날짜 및 메모
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")

  // 실적 데이터 상태 (Agent용)
  const [performance, setPerformance] = useState({
    goal: 0, targetAmount: 0, contract: 0, contractAmount: 0,
    ap: 0, pt: 0, calls: 0, meets: 0, intros: 0, recruits: 0,
    dbAssigned: 0, dbReturned: 0, isApproved: false
  })

  // 관리자 데이터 상태
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editingComment, setEditingComment] = useState("")

  // 모달 상태
  const [modals, setModals] = useState({
    history: false, bizTool: false, notice: false, teamGoal: false, sideBar: false
  })
  const [historyType, setHistoryType] = useState<'team' | 'agent'>('agent')
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')

  // 계산기 변수
  const [calc, setCalc] = useState({
    compMonth: 50, compYear: 5, compWait: 5, bankRate: 2,
    infMoney: 100, infRate: 3, intMoney: 1000, intRate: 5, intYear: 20
  })

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1
  const lastYear = new Date(currentYear, currentMonth - 2, 1).getFullYear()
  const lastMonth = new Date(currentYear, currentMonth - 2, 1).getMonth() + 1

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) { await supabase.auth.signOut(); return router.replace("/login") }
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    fetchTeamGoal()
    if (userInfo.role !== "agent") fetchAdminData()
    if (userInfo.role !== "admin") fetchAgentData(session.user.id)
    setLoading(false)
  }

  async function fetchDailyData(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const { data: notice } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).maybeSingle()
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
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  async function fetchAgentData(id: string) {
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    setPerformance({
      goal: t?.target_count || 0, targetAmount: t?.target_amount || 0, isApproved: t?.status === 'approved',
      contract: p?.contract_count || 0, contractAmount: p?.contract_amount || 0, ap: p?.ap || 0, pt: p?.pt || 0,
      calls: p?.call_count || 0, meets: p?.meet_count || 0, intros: p?.intro_count || 0, recruits: p?.recruit_count || 0,
      dbAssigned: p?.db_assigned || 0, dbReturned: p?.db_returned || 0
    })
  }

  const handleAgentSave = async () => {
    const payloadT = { user_id: userId, year: currentYear, month: currentMonth, target_count: performance.goal, target_amount: performance.targetAmount, status: performance.isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year: currentYear, month: currentMonth, ...performance }
    delete (payloadP as any).goal; delete (payloadP as any).targetAmount; delete (payloadP as any).isApproved;
    
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("데이터 저장 완료")
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-2xl animate-pulse">SIGNAL LOADING...</div>

  const totalDoneC = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.contract_count || 0), 0)
  const totalDoneA = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.contract_amount || 0), 0)
  const totalDoneR = agents.reduce((sum, a) => sum + ((a.performances || []).find(p=>p.year===currentYear && p.month===currentMonth)?.recruit_count || 0), 0)

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row text-slate-900 font-sans">
      
      {/* 📱 Mobile Header */}
      <div className="lg:hidden bg-black text-white p-4 flex justify-between items-center sticky top-0 z-[100]">
        <h1 className="font-black italic text-xl text-[#d4af37]">SIGNAL</h1>
        <button onClick={() => setModals({...modals, sideBar: !modals.sideBar})} className="p-2 bg-[#d4af37] text-black rounded-lg font-bold text-xs">MENU</button>
      </div>

      {/* ─── 📟 SIDEBAR (Desktop & Mobile Overlay) ─────────────────── */}
      <aside className={`${modals.sideBar ? 'flex' : 'hidden'} lg:flex fixed lg:relative inset-0 z-[200] lg:z-auto w-full lg:w-80 bg-white border-r p-6 flex-col gap-6 overflow-y-auto shadow-2xl`}>
        <div className="flex justify-between items-center lg:block">
          <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 uppercase text-center w-full">History Board</h2>
          <button onClick={() => setModals({...modals, sideBar: false})} className="lg:hidden font-black text-2xl p-2">✕</button>
        </div>
        
        <div className="calendar-container scale-95 lg:scale-100 origin-top">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" formatDay={(l, date) => date.getDate().toString()} className="rounded-2xl border-0 shadow-sm custom-calendar" />
        </div>

        <div className="p-5 bg-slate-900 rounded-[2rem] space-y-3 shadow-xl">
            <p className="text-[#d4af37] text-[10px] font-black uppercase text-center tracking-widest">{currentMonth}월 실적 리포트</p>
            <button onClick={() => { setHistoryType('agent'); setModals({...modals, history: true, sideBar: false}); }} className="w-full bg-white text-black py-3 rounded-2xl font-black text-xs hover:bg-[#d4af37] transition-all">내 실적 상세</button>
            {role !== 'agent' && (
                <button onClick={() => { setHistoryType('team'); setModals({...modals, history: true, sideBar: false}); }} className="w-full border-2 border-[#d4af37] text-[#d4af37] py-3 rounded-2xl font-black text-xs hover:bg-[#d4af37] hover:text-black transition-all">전월 팀 전체 실적</button>
            )}
        </div>

        <div className="space-y-3">
          <textarea readOnly={role === 'agent'} value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} placeholder="교육/특별사항" className="w-full p-4 rounded-2xl bg-blue-50 text-sm h-24 outline-none font-bold border-2 border-blue-100 resize-none" />
          <textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} placeholder="개인 메모" className="w-full p-4 rounded-2xl bg-slate-50 text-sm h-24 outline-none font-bold border-2 border-slate-200 resize-none" />
          <button onClick={async () => { 
            const dateStr = selectedDate.toISOString().split('T')[0]; 
            await supabase.from("daily_notes").upsert({ user_id: userId, date: dateStr, agent_memo: personalMemo, ...((role !== 'agent') && { admin_notice: dailySpecialNote }) }, { onConflict: 'user_id, date' }); 
            alert("저장 완료") 
          }} className="w-full bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-lg">Save Information</button>
        </div>

        <div className="mt-auto pt-6 border-t-2 border-slate-100 space-y-2">
          {['compare', 'inflation', 'interest'].map((tool) => (
            <button key={tool} onClick={() => { setActiveTool(tool as any); setModals({...modals, bizTool: true, sideBar: false}); }} className="w-full p-4 rounded-xl hover:bg-slate-50 font-bold text-sm text-left flex items-center gap-3 transition-all">
              {tool === 'compare' ? '🏦 은행 vs 보험 비교' : tool === 'inflation' ? '📉 화폐가치 계산기' : '📈 단리 vs 복리 마법'}
            </button>
          ))}
        </div>
      </aside>

      {/* ─── 💎 MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6 lg:space-y-10">
          
          {/* Header Card */}
          <header className="bg-black text-white p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-b-8 border-[#d4af37]">
            <h1 className="text-2xl lg:text-4xl font-black italic text-[#d4af37] uppercase tracking-tighter">METARICH SIGNAL</h1>
            <div className="flex items-center gap-4 lg:gap-8">
                <div className="text-right"><p className="text-[#d4af37] text-[10px] font-black uppercase opacity-70">{role}</p><p className="text-xl lg:text-2xl font-black">{userName}님</p></div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-xl text-[10px] font-black transition-colors">LOGOUT</button>
            </div>
          </header>

          {/* Global Notice */}
          <section onClick={() => setModals({...modals, notice: true})} className="bg-white rounded-2xl p-5 shadow-sm border-l-8 border-[#d4af37] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
            <span className="font-bold text-sm lg:text-lg truncate">📢 {globalNotice}</span>
          </section>

          {/* ─── 👨‍💼 ADMIN SECTION ──────────────────── */}
          {(role !== "agent") && (
            <>
              <section className="bg-white p-8 lg:p-12 rounded-[3rem] shadow-sm border-4 border-slate-50">
                <div className="flex justify-between items-center mb-8"><h2 className="text-lg font-black uppercase border-l-[8px] border-black pl-4 italic">Team Monthly Goal</h2><button onClick={() => setModals({...modals, teamGoal: true})} className="text-[10px] font-black bg-black text-[#d4af37] px-5 py-2 rounded-full">EDIT</button></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <ProgressBar label="전체 건수" current={totalDoneC} target={teamGoal.count} unit="건" color="#0f172a" />
                  <ProgressBar label="전체 금액" current={totalDoneA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                  <ProgressBar label="전체 도입" current={totalDoneR} target={teamGoal.recruit} unit="명" color="#3b82f6" />
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-xl font-black uppercase italic border-l-[8px] border-slate-300 pl-4">에이전트 실적 현황</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {agents.map(a => {
                        const t = (a.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth) || { target_count: 0, target_amount: 0 };
                        const p = (a.performances || []).find(pf=>pf.year===currentYear && pf.month===currentMonth) || { contract_count: 0, contract_amount: 0, call_count: 0, meet_count: 0 };
                        const isAlert = (p.contract_amount || 0) < 30;
                        return (
                            <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }} className={`bg-white p-6 lg:p-8 rounded-[2.5rem] border-4 cursor-pointer shadow-md transition-all hover:-translate-y-1 ${isAlert ? 'animate-pulse-red border-red-500 shadow-red-100' : 'border-white'}`}>
                                <div className="font-black text-lg mb-4 flex justify-between items-center"><span>{a.name} CA</span> <span className="text-[9px] bg-slate-100 px-2 py-1 rounded text-slate-400 font-bold uppercase tracking-widest">Detail</span></div>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-slate-50 p-3 rounded-xl text-center"><p className="text-[9px] font-black text-slate-400">CALL</p><p className="font-black">{p.call_count || 0}</p></div>
                                    <div className="bg-slate-50 p-3 rounded-xl text-center"><p className="text-[9px] font-black text-slate-400">MEET</p><p className="font-black">{p.meet_count || 0}</p></div>
                                </div>
                                <MiniBar label="건수" current={p.contract_count || 0} target={t.target_count || 0} unit="건" color="#0f172a" />
                                <MiniBar label="금액" current={p.contract_amount || 0} target={t.target_amount || 0} unit="만" color="#d4af37" />
                            </div>
                        )
                    })}
                </div>
              </section>
            </>
          )}

          {/* ─── 🧑‍💻 AGENT SECTION ──────────────────── */}
          {(role !== "admin") && (
             <section className="space-y-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-black pb-4"><h2 className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter">My Activity Board</h2><button onClick={handleAgentSave} className="w-full md:w-auto bg-black text-[#d4af37] px-8 py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform">UPDATE PERFORMANCE</button></div>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                 <ActivityTab label="📞 전화" value={performance.calls} onChange={(v:number)=>setPerformance({...performance, calls:v})} color="bg-emerald-50" textColor="text-emerald-800" unit="건" />
                 <ActivityTab label="🤝 미팅" value={performance.meets} onChange={(v:number)=>setPerformance({...performance, meets:v})} color="bg-amber-50" textColor="text-amber-800" unit="건" />
                 <ActivityTab label="📝 제안" value={performance.pt} onChange={(v:number)=>setPerformance({...performance, pt:v})} color="bg-purple-50" textColor="text-purple-800" unit="건" />
                 <ActivityTab label="🎁 소개" value={performance.intros} onChange={(v:number)=>setPerformance({...performance, intros:v})} color="bg-rose-50" textColor="text-rose-800" unit="건" />
                 <ActivityTab label="📥 DB배정" value={performance.dbAssigned} onChange={(v:number)=>setPerformance({...performance, dbAssigned:v})} color="bg-blue-50" textColor="text-blue-800" unit="건" />
                 <ActivityTab label="📤 DB반품" value={performance.dbReturned} onChange={(v:number)=>setPerformance({...performance, dbReturned:v})} color="bg-slate-100" textColor="text-slate-800" unit="건" />
               </div>
               <div className="bg-white p-6 lg:p-12 rounded-[3rem] shadow-sm border-4 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
                 <div className="space-y-6">
                   <h3 className="text-xl font-black text-slate-800 uppercase border-l-[10px] border-slate-200 pl-4">목표 설정</h3>
                   <InBox label="이번달 목표 건수" value={performance.goal} onChange={(v:number)=>setPerformance({...performance, goal:v})} unit="건" disabled={performance.isApproved} />
                   <InBox label="이번달 목표 금액" value={performance.targetAmount} onChange={(v:number)=>setPerformance({...performance, targetAmount:v})} unit="만원" disabled={performance.isApproved} />
                   <InBox label="리쿠르팅 도입 실적" value={performance.recruits} onChange={(v:number)=>setPerformance({...performance, recruits:v})} unit="명" highlight />
                 </div>
                 <div className="space-y-6">
                   <h3 className="text-xl font-black text-[#d4af37] uppercase border-l-[10px] border-[#d4af37] pl-4">현재 실적</h3>
                   <InBox label="체결 완료 건수" value={performance.contract} onChange={(v:number)=>setPerformance({...performance, contract:v})} unit="건" />
                   <InBox label="체결 완료 금액" value={performance.contractAmount} onChange={(v:number)=>setPerformance({...performance, contractAmount:v})} unit="만원" />
                   <InBox label="상담 회수(AP)" value={performance.ap} onChange={(v:number)=>setPerformance({...performance, ap:v})} unit="회" />
                 </div>
               </div>
             </section>
          )}
        </div>

        {/* ─── 🧱 MODALS ────────────────────────────────────────────── */}
        
        {/* Agent Detail Modal (Admin View) */}
        {selectedAgent && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] p-6 lg:p-12 relative overflow-y-auto max-h-[95vh] border-[6px] border-black">
                <button onClick={()=>setSelectedAgent(null)} className="absolute top-6 right-6 font-black text-3xl">✕</button>
                <h2 className="text-2xl lg:text-3xl font-black mb-8 italic uppercase border-b-8 border-black pb-4">{selectedAgent.name} 코칭 리포트</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                      <h3 className="text-sm font-black bg-black text-[#d4af37] px-4 py-2 inline-block rounded-lg uppercase italic">{currentMonth}월 실적 현황</h3>
                      <div className="grid grid-cols-3 gap-3">
                          {(() => {
                              const p = (selectedAgent.performances || []).find(pf=>pf.year===currentYear && pf.month===currentMonth) || { call_count:0, meet_count:0, contract_amount:0 };
                              return (
                                  <>
                                      <div className="bg-slate-50 p-4 rounded-2xl text-center"><p className="text-[9px] font-black text-slate-400">CALL</p><p className="text-xl font-black">{p.call_count}건</p></div>
                                      <div className="bg-slate-50 p-4 rounded-2xl text-center"><p className="text-[9px] font-black text-slate-400">MEET</p><p className="text-xl font-black">{p.meet_count}건</p></div>
                                      <div className="bg-slate-50 p-4 rounded-2xl text-center"><p className="text-[9px] font-black text-slate-400">AMOUNT</p><p className="text-xl font-black text-[#d4af37]">{p.contract_amount}만</p></div>
                                  </>
                              )
                          })()}
                      </div>
                      <textarea value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} placeholder="직원에게 전달할 피드백이나 코칭 메시지를 입력하세요" className="w-full bg-slate-50 p-6 rounded-2xl font-bold text-base h-40 outline-none border-2 focus:border-black resize-none" />
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-sm font-black bg-slate-200 px-4 py-2 inline-block rounded-lg uppercase italic">{lastMonth}월 실적 히스토리</h3>
                    <div className="grid grid-cols-3 gap-3 opacity-60">
                          {(() => {
                              const p = (selectedAgent.performances || []).find(pf=>pf.year===lastYear && pf.month===lastMonth) || { call_count:0, meet_count:0, contract_amount:0 };
                              return (
                                  <>
                                      <div className="bg-slate-100 p-4 rounded-2xl text-center font-bold text-sm">📞 {p.call_count}</div>
                                      <div className="bg-slate-100 p-4 rounded-2xl text-center font-bold text-sm">🤝 {p.meet_count}</div>
                                      <div className="bg-slate-100 p-4 rounded-2xl text-center font-bold text-sm">💰 {p.contract_amount}만</div>
                                  </>
                              )
                          })()}
                    </div>
                    <div className="border-t-2 pt-6 space-y-4">
                      <p className="font-black text-[10px] uppercase text-slate-400 tracking-tighter">목표 조정 승인</p>
                      <InBox label="최종 건수" value={(selectedAgent.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth)?.target_count || 0} 
                          onChange={(v: number) => {
                              const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id);
                              if (idx === -1) return;
                              if (!updated[idx].monthly_targets) updated[idx].monthly_targets = [];
                              const tIdx = updated[idx].monthly_targets!.findIndex(mt=>mt.year===currentYear && mt.month===currentMonth);
                              if(tIdx > -1) updated[idx].monthly_targets![tIdx].target_count = v;
                              else updated[idx].monthly_targets!.push({year: currentYear, month: currentMonth, target_count: v});
                              setAgents(updated);
                          }} unit="건" />
                    </div>
                  </div>
                </div>
                <button onClick={async () => { 
                  const mt = (selectedAgent.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth) || {target_count:0, target_amount:0}; 
                  await supabase.from("monthly_targets").upsert({ user_id: selectedAgent.id, year: currentYear, month: currentMonth, target_count: Number(mt.target_count), target_amount: Number(mt.target_amount), status: 'approved', admin_comment: editingComment }, { onConflict: 'user_id, year, month' }); 
                  alert("저장 및 승인 완료"); setSelectedAgent(null); fetchAdminData(); 
                }} className="w-full bg-black text-[#d4af37] py-6 rounded-2xl font-black text-xl mt-8 uppercase shadow-xl active:scale-95 transition-transform">Save & Approve</button>
            </div>
          </div>
        )}

        {/* History Modal */}
        {modals.history && (
            <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-3xl rounded-[2.5rem] p-6 lg:p-10 relative border-4 border-black max-h-[90vh] overflow-y-auto">
                    <button onClick={()=>setModals({...modals, history: false})} className="absolute top-6 right-6 font-black text-2xl">✕</button>
                    <h2 className="text-xl lg:text-2xl font-black mb-8 italic uppercase border-b-4 border-black pb-2">
                        {historyType === 'team' ? `${lastMonth}월 팀 전체 실적` : `${currentMonth}월 성과 분석`}
                    </h2>
                    <div className="space-y-4">
                        {historyType === 'team' ? (
                            agents.map(a => {
                                const p = (a.performances || []).find(pf=>pf.year===lastYear && pf.month===lastMonth) || { contract_count:0, contract_amount:0, recruit_count:0 };
                                return (
                                    <div key={a.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-slate-50 rounded-xl gap-2 border">
                                        <span className="font-black text-lg underline decoration-[#d4af37] decoration-4">{a.name} CA</span>
                                        <div className="flex gap-4 font-bold text-xs text-slate-500 uppercase">
                                            <span>건수: {p.contract_count}</span> <span className="text-amber-600">금액: {p.contract_amount}만</span> <span className="text-blue-600">도입: {p.recruit_count}</span>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <HistoryCard label="달성률" value={`${performance.goal > 0 ? Math.round((performance.contract/performance.goal)*100) : 0}%`} color="bg-black text-[#d4af37]" />
                                <HistoryCard label="AP 상담" value={`${performance.ap}회`} color="bg-slate-100" />
                                <HistoryCard label="DB 효율" value={`${performance.dbAssigned > 0 ? Math.round((performance.contract/performance.dbAssigned)*100) : 0}%`} color="bg-slate-100" />
                                <HistoryCard label="평균 단가" value={`${performance.contract > 0 ? Math.round(performance.contractAmount/performance.contract) : 0}만`} color="bg-slate-100" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Business Tool Modal */}
        {modals.bizTool && (
          <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] p-6 lg:p-12 relative border-[6px] border-black">
              <button onClick={()=>setModals({...modals, bizTool: false})} className="absolute top-6 right-6 text-2xl font-black">✕</button>
              <div className="flex flex-wrap gap-2 mb-8">
                {['compare', 'inflation', 'interest'].map((t) => (
                  <button key={t} onClick={()=>setActiveTool(t as any)} className={`px-5 lg:px-8 py-3 rounded-full font-black text-xs lg:text-sm transition-all ${activeTool===t?'bg-black text-[#d4af37]':'bg-slate-100 text-slate-400'}`}>
                    {t === 'compare' ? 'BANK vs INSURANCE' : t === 'inflation' ? 'INFLATION' : 'COMPOUND INTEREST'}
                  </button>
                ))}
              </div>
              {activeTool === 'compare' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <InBox label="월 납입액" value={calc.compMonth} onChange={(v:any)=>setCalc({...calc, compMonth:v})} unit="만원" />
                    <InBox label="납입 기간" value={calc.compYear} onChange={(v:any)=>setCalc({...calc, compYear:v})} unit="년" />
                    <InBox label="거치 기간" value={calc.compWait} onChange={(v:any)=>setCalc({...calc, compWait:v})} unit="년" />
                    <InBox label="은행 금리" value={calc.bankRate} onChange={(v:any)=>setCalc({...calc, bankRate:v})} unit="%" />
                  </div>
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-2 gap-8 text-center text-white border-b-8 border-[#d4af37]">
                    <div><p className="text-[10px] font-black text-[#d4af37] mb-2 uppercase tracking-widest">BANK (Simple)</p><p className="text-3xl lg:text-5xl font-black">{(calc.compMonth * calc.compYear * 12 + (calc.compMonth * calc.compYear * 12 * (calc.bankRate/100) * (calc.compYear + calc.compWait))).toLocaleString()}만원</p></div>
                    <div className="border-t lg:border-t-0 lg:border-l border-slate-700 pt-6 lg:pt-0 lg:pl-8"><p className="text-[10px] font-black text-blue-400 mb-2 uppercase tracking-widest">INSURANCE (124%)</p><p className="text-3xl lg:text-5xl font-black text-blue-400">{(calc.compMonth * calc.compYear * 12 * 1.24).toLocaleString()}만원</p></div>
                  </div>
                </div>
              )}
              {/* Inflation & Interest tools omitted for brevity, but same InBox/Calc structure applies */}
            </div>
          </div>
        )}

      </main>

      <style jsx global>{`
        @keyframes pulse-red { 0%, 100% { border-color: #ef4444; background-color: #fff1f2; } 50% { border-color: #fca5a5; background-color: #fff; } }
        .animate-pulse-red { animation: pulse-red 1.5s infinite; }
        .custom-calendar { width: 100% !important; border: none !important; font-family: inherit !important; }
        .react-calendar__tile { padding: 10px 5px !important; font-weight: 800 !important; font-size: 13px !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; }
        .react-calendar__navigation button { font-weight: 900 !important; font-size: 16px !important; }
      `}</style>
    </div>
  )
}

// ─── 📦 UI COMPONENTS ───────────────────────────────────────

function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between font-black text-[10px] lg:text-[11px] uppercase tracking-tighter text-slate-500"><span>{label} ({current}/{target}{unit})</span><span style={{ color }}>{Math.round(rate)}%</span></div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className="h-full transition-all duration-1000 ease-out" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function MiniBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-1 mb-3">
      <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>{label}</span><span>{Math.round(rate)}%</span></div>
      <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function ActivityTab({ label, value, onChange, color, textColor, unit }: any) {
  return (
    <div className={`${color} p-4 rounded-[1.5rem] text-center border-2 border-transparent hover:border-slate-200 active:scale-95 transition-all shadow-sm`}>
      <p className={`text-[9px] lg:text-[10px] font-black uppercase mb-1 ${textColor}`}>{label}</p>
      <div className="flex items-center justify-center gap-0.5">
        <input type="number" value={value || 0} onChange={(e)=>onChange(Number(e.target.value))} className="w-10 bg-transparent text-center text-lg lg:text-xl font-black outline-none" />
        <span className={`text-[10px] font-bold ${textColor} opacity-60`}>{unit}</span>
      </div>
    </div>
  )
}

function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-black ml-2 uppercase text-slate-400 tracking-tight">{label}</label>
      <div className="relative">
        <input disabled={disabled} type="number" value={value || 0} onChange={(e)=> (onChange ? onChange(Number(e.target.value)) : null)} className={`w-full p-4 lg:p-5 rounded-2xl font-black text-xl lg:text-2xl outline-none border-4 transition-all ${highlight ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-transparent focus:border-black focus:bg-white'}`} />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 pointer-events-none">{unit}</span>
      </div>
    </div>
  )
}

function HistoryCard({ label, value, color }: any) {
  return (
    <div className={`p-6 rounded-2xl text-center shadow-sm ${color}`}>
        <p className="text-[9px] font-black uppercase mb-1 opacity-70">{label}</p>
        <p className="text-2xl lg:text-3xl font-black italic tracking-tighter">{value}</p>
    </div>
  )
}