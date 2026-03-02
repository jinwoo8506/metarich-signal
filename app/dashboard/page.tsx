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

  // 🗓️ 날짜 및 메모 상태
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")

  // 📊 실적 데이터 상태
  const [goal, setGoal] = useState(0); const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0); const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0); const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0); const [dbReturned, setDbReturned] = useState(0)
  const [isApproved, setIsApproved] = useState(false)

  // 👥 팀 관리 상태
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [isTeamGoalModalOpen, setIsTeamGoalModalOpen] = useState(false)
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [isNoticeOpen, setIsNoticeOpen] = useState(false) 
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [editingComment, setEditingComment] = useState("")

  // 🧮 영업 지원 도구(계산기) 상태
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [compMonth, setCompMonth] = useState(50); const [compYear, setCompYear] = useState(5);
  const [compWait, setCompWait] = useState(5); const [bankRate, setBankRate] = useState(2);
  const [insuRate, setInsuRate] = useState(124); const [infMoney, setInfMoney] = useState(100);
  const [infRate, setInfRate] = useState(3); const [intMoney, setIntMoney] = useState(1000);
  const [intRate, setIntRate] = useState(5); const [intYear, setIntYear] = useState(20);

  const year = 2026; const month = 3 // 현재 날짜 기준

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

  // 🚨 관리 경고 로직
  const getAlertStyle = (agent: any) => {
    const p = agent.performances[0] || {};
    const today = new Date();
    const day = today.getDate();
    const currentAmount = p.contract_amount || 0;
    
    // 빨간색: 3개월 평균 (현재는 데이터 구조상 이번달 기준) 30만 미만
    if (currentAmount < 30) return "animate-pulse-red border-red-500 shadow-lg shadow-red-200";
    // 노란색: 10일까지 무실적 OR 25일 이후 25만 미만
    if ((day <= 10 && currentAmount === 0) || (day > 25 && currentAmount < 25)) {
      return "animate-pulse-yellow border-yellow-400 shadow-lg shadow-yellow-100";
    }
    return "border-white";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-3xl italic">SIGNAL LOADING...</div>

  const totalDoneC = agents.reduce((sum, a) => sum + (a.performances[0]?.contract_count || 0), 0)
  const totalDoneA = agents.reduce((sum, a) => sum + (a.performances[0]?.contract_amount || 0), 0)
  const totalDoneR = agents.reduce((sum, a) => sum + (a.performances[0]?.recruit_count || 0), 0)

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex text-slate-900 font-sans text-base">
      
      {/* 🗓️ 사이드바 (영업 도구 포함) */}
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

        {/* 🧮 사이드바 하단 영업 도구 메뉴 */}
        <div className="mt-auto pt-6 border-t-2 border-slate-100 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 tracking-widest">Sales Tools</p>
          <button onClick={() => { setActiveTool('compare'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-blue-50 transition-all font-bold text-sm">
            <span>🏦</span> 은행 vs 보험 비교
          </button>
          <button onClick={() => { setActiveTool('inflation'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-rose-50 transition-all font-bold text-sm text-rose-600">
            <span>📉</span> 화폐가치 계산기
          </button>
          <button onClick={() => { setActiveTool('interest'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-emerald-50 transition-all font-bold text-sm text-emerald-700">
            <span>📈</span> 단리 vs 복리 비교
          </button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-14 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
          
          <header className="bg-black text-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-b-8 border-[#d4af37]">
            <div className="text-center md:text-left"><h1 className="text-2xl md:text-4xl font-black italic text-[#d4af37] tracking-tighter uppercase">METARICH SIGNAL</h1><p className="text-[10px] text-white/40 font-bold uppercase mt-1">v4.5 Management System</p></div>
            <div className="flex items-center gap-4 md:gap-8">
                <div className="text-right"><p className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">{role}</p><p className="text-xl md:text-3xl font-black">{userName}님</p></div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 px-6 py-3 rounded-2xl text-xs font-black">LOGOUT</button>
            </div>
          </header>

          {/* 📢 공지사항 */}
          <section onClick={() => setIsNoticeOpen(true)} className="bg-white hover:bg-slate-50 cursor-pointer rounded-3xl p-6 shadow-xl border-l-8 border-[#d4af37] flex items-center justify-between transition-all">
            <div className="flex items-center gap-4 overflow-hidden"><span className="text-2xl">📢</span><span className="font-bold text-lg truncate tracking-tight">{globalNotice}</span></div>
            <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full shrink-0 uppercase">View</span>
          </section>

          {/* 🏆 팀 목표 (관리자 전용) */}
          {(role === "admin" || role === "master") && (
            <section className="bg-white p-8 md:p-12 rounded-[3rem] md:rounded-[5rem] shadow-xl border-4 border-slate-50">
              <div className="flex justify-between items-center mb-10">
                  <h2 className="text-xl font-black text-black uppercase tracking-widest border-l-[12px] border-black pl-6 italic">Team Goal</h2>
                  <button onClick={() => setIsTeamGoalModalOpen(true)} className="text-[10px] font-black bg-black text-[#d4af37] px-6 py-3 rounded-full">EDIT STRATEGY</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <ProgressBar label="전체 건수" current={totalDoneC} target={teamGoal.count} unit="건" color="black" />
                <ProgressBar label="전체 금액" current={totalDoneA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                <ProgressBar label="전체 도입" current={totalDoneR} target={teamGoal.recruit} unit="명" color="#2563eb" />
              </div>
            </section>
          )}

          {/* 👥 직원 리스트 (관리자 전용 & 깜빡임 적용) */}
          {(role === "admin" || role === "master") && (
            <section className="space-y-8">
                <h2 className="text-2xl font-black uppercase italic border-l-[12px] border-slate-300 pl-6">Agent Management</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {agents.map(a => {
                        const t = a.monthly_targets[0] || {}; const p = a.performances[0] || {};
                        const alertClass = getAlertStyle(a);
                        return (
                            <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }}
                                 className={`bg-white p-8 md:p-10 rounded-[3rem] md:rounded-[4rem] border-4 transition-all cursor-pointer shadow-lg group ${alertClass}`}>
                                <div className="flex justify-between items-start mb-6">
                                  <div className="font-black text-xl md:text-2xl">{a.name} CA</div>
                                  <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg uppercase">Detail ➔</span>
                                </div>
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

          {/* ✍️ 활동 입력 (에이전트 전용) */}
          {(role === "agent" || role === "master") && (
             <section className="space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <h2 className="text-3xl md:text-4xl font-black italic uppercase border-b-8 border-black pb-4">Activity Board</h2>
                 <button onClick={handleAgentSave} className="w-full md:w-auto bg-black text-[#d4af37] px-10 py-5 rounded-[2.5rem] font-black text-sm shadow-xl hover:scale-105 transition-transform">UPDATE PERFORMANCE</button>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                 <ActivityTab label="📞 CALL" value={calls} onChange={setCalls} color="bg-emerald-50" textColor="text-emerald-800" borderColor="border-emerald-200" />
                 <ActivityTab label="🤝 MEET" value={meets} onChange={setMeets} color="bg-amber-50" textColor="text-amber-800" borderColor="border-amber-200" />
                 <ActivityTab label="📝 PT" value={pt} onChange={setPt} color="bg-purple-50" textColor="text-purple-800" borderColor="border-purple-200" />
                 <ActivityTab label="🎁 INTRO" value={intros} onChange={setIntros} color="bg-rose-50" textColor="text-rose-800" borderColor="border-rose-200" />
                 <ActivityTab label="📥 DB 배정" value={dbAssigned} onChange={setDbAssigned} color="bg-blue-50" textColor="text-blue-800" borderColor="border-blue-200" />
                 <ActivityTab label="📤 DB 반품" value={dbReturned} onChange={setDbReturned} color="bg-slate-100" textColor="text-slate-800" borderColor="border-slate-300" />
               </div>
               <div className="bg-white p-8 md:p-12 rounded-[3rem] md:rounded-[5rem] shadow-xl border-4 border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-12">
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

      {/* 👤 공지사항 팝업 */}
      {isNoticeOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 relative border-4 border-[#d4af37]">
            <button onClick={()=>setIsNoticeOpen(false)} className="absolute top-6 right-6 font-black text-2xl">✕</button>
            <h2 className="text-2xl font-black mb-6 italic border-b-4 border-black pb-2 uppercase text-[#d4af37]">Global Notice</h2>
            <div className="text-lg font-bold leading-relaxed whitespace-pre-wrap py-4">{globalNotice}</div>
            <button onClick={()=>setIsNoticeOpen(false)} className="w-full bg-black text-white py-4 rounded-2xl font-black mt-6 uppercase">Close</button>
          </div>
        </div>
      )}

      {/* 🧮 영업 지원 도구(계산기) 모달 - 마스터님 이 부분을 확인해주세요! */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* 상단 헤더 */}
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase">
                {activeTool === 'compare' && "Bank vs Insurance Compare"}
                {activeTool === 'inflation' && "Money Value Calculator"}
                {activeTool === 'interest' && "Simple vs Compound Interest"}
              </h2>
              <button onClick={() => setIsBizToolOpen(false)} className="text-4xl font-black hover:text-rose-500 transition-colors">✕</button>
            </div>

            {/* 계산 내용 영역 */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-white">
              {/* 1. 은행 vs 보험 비교 */}
              {activeTool === 'compare' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <InBox label="월 납입액" value={compMonth} onChange={setCompMonth} unit="만원" />
                    <InBox label="납입 기간" value={compYear} onChange={setCompYear} unit="년" />
                    <InBox label="거치 기간" value={compWait} onChange={setCompWait} unit="년" />
                    <InBox label="은행 이율" value={bankRate} onChange={setBankRate} unit="%" />
                  </div>
                  <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-12 shadow-inner">
                    <div className="space-y-4">
                      <p className="font-black text-slate-400 text-xs uppercase tracking-widest">🏦 Bank (세후 만기액)</p>
                      <p className="text-5xl font-black text-slate-800">
                        {Math.round((compMonth * (compYear*12)) + (compMonth * (compYear*12*(compYear*12+1)/2) * (bankRate/100/12)) * 0.846).toLocaleString()}
                        <span className="text-xl ml-1">만원</span>
                      </p>
                    </div>
                    <div className="space-y-4 border-l-0 md:border-l-2 md:pl-12 border-slate-200">
                      <div className="flex justify-between items-end">
                        <p className="font-black text-[#d4af37] text-xs uppercase tracking-widest">🛡️ Insurance (환급액)</p>
                        <div className="flex items-center gap-2 border-b-2 border-[#d4af37] pb-1">
                          <span className="text-[10px] font-black">환급률</span>
                          <input type="number" value={insuRate} onChange={(e)=>setInsuRate(Number(e.target.value))} className="w-14 text-right font-black outline-none bg-transparent text-[#d4af37]" />
                          <span className="text-[10px] font-black text-[#d4af37]">%</span>
                        </div>
                      </div>
                      <p className="text-5xl font-black text-[#d4af37]">
                        {Math.round(compMonth * (compYear * 12) * (insuRate / 100)).toLocaleString()}
                        <span className="text-xl ml-1">만원</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-rose-600 animate-bounce">
                      💰 은행보다 약 {Math.round((compMonth * (compYear * 12) * (insuRate / 100)) - ((compMonth * (compYear*12)) + (compMonth * (compYear*12*(compYear*12+1)/2) * (bankRate/100/12)) * 0.846)).toLocaleString()}만원 더 수령!
                    </p>
                  </div>
                </div>
              )}

              {/* 2. 화폐가치 계산기 */}
              {activeTool === 'inflation' && (
                <div className="space-y-12 text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="max-w-md mx-auto grid grid-cols-2 gap-6 bg-rose-50 p-8 rounded-[2.5rem]">
                    <InBox label="현재 금액" value={infMoney} onChange={setInfMoney} unit="만원" />
                    <InBox label="물가상승률" value={infRate} onChange={setInfRate} unit="%" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[10, 20, 30].map(yr => (
                      <div key={yr} className="bg-white p-10 rounded-[3rem] border-4 border-slate-100 shadow-xl relative overflow-hidden group hover:border-rose-500 transition-all">
                        <div className="absolute top-0 right-0 bg-rose-500 text-white px-6 py-2 rounded-bl-2xl font-black text-[10px] uppercase">{yr} Years Later</div>
                        <p className="font-black text-slate-400 text-xs mb-4 uppercase">실질 가치 하락</p>
                        <p className="text-4xl font-black text-slate-900">{Math.round(infMoney / Math.pow(1 + (infRate/100), yr)).toLocaleString()}<span className="text-lg">만원</span></p>
                        <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${(1 / Math.pow(1 + (infRate/100), yr)) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-400 font-bold italic">"고객님, 가만히 저축만 하시면 돈의 가치가 이렇게 녹아내립니다."</p>
                </div>
              )}

              {/* 3. 단리 vs 복리 비교 */}
              {activeTool === 'interest' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-3 gap-6">
                    <InBox label="거치 원금" value={intMoney} onChange={setIntMoney} unit="만원" />
                    <InBox label="수익률" value={intRate} onChange={setIntRate} unit="%" />
                    <InBox label="기간(년)" value={intYear} onChange={setIntYear} unit="년" />
                  </div>
                  <div className="bg-emerald-50 p-10 rounded-[3rem] border-2 border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-8 shadow-inner">
                    <div className="flex-1">
                      <p className="font-black text-emerald-600 text-xs uppercase mb-2 tracking-widest">복리의 마법 (수익 차이)</p>
                      <p className="text-6xl font-black text-emerald-800">
                        +{Math.round((intMoney * Math.pow(1+(intRate/100), intYear)) - (intMoney + (intMoney*(intRate/100)*intYear))).toLocaleString()}
                        <span className="text-2xl">만원</span>
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border-2 border-emerald-200 text-right space-y-2">
                      <p className="text-sm font-bold text-slate-400">단리 합계: {Math.round(intMoney + (intMoney*(intRate/100)*intYear)).toLocaleString()}만</p>
                      <p className="text-xl font-black text-emerald-600 text-blue-600">복리 합계: {Math.round(intMoney * Math.pow(1+(intRate/100), intYear)).toLocaleString()}만</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 하단 탭 메뉴 */}
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setActiveTool('compare')} className={`flex-1 py-6 rounded-3xl font-black text-sm transition-all ${activeTool === 'compare' ? 'bg-black text-[#d4af37] shadow-xl scale-105' : 'bg-white text-slate-400 border-2'}`}>1. 은행 vs 보험</button>
              <button onClick={() => setActiveTool('inflation')} className={`flex-1 py-6 rounded-3xl font-black text-sm transition-all ${activeTool === 'inflation' ? 'bg-rose-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border-2'}`}>2. 화폐가치</button>
              <button onClick={() => setActiveTool('interest')} className={`flex-1 py-6 rounded-3xl font-black text-sm transition-all ${activeTool === 'interest' ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border-2'}`}>3. 단리 vs 복리</button>
            </div>
          </div>
        </div>
      )}

      {/* 👤 코칭 팝업 (관리자용) */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] p-10 md:p-14 relative overflow-y-auto max-h-[90vh] border-[10px] border-black">
              <button onClick={()=>setSelectedAgent(null)} className="absolute top-10 right-10 font-black text-4xl">✕</button>
              <h2 className="text-4xl md:text-5xl font-black mb-12 italic uppercase border-b-[12px] border-black pb-6">{selectedAgent.name} Coaching</h2>
              
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10 bg-slate-50 p-6 rounded-[2.5rem] border-2">
                <ActivityStat label="📞 CALL" value={selectedAgent.performances[0]?.call_count} color="text-emerald-700" />
                <ActivityStat label="🤝 MEET" value={selectedAgent.performances[0]?.meet_count} color="text-amber-700" />
                <ActivityStat label="📝 PT" value={selectedAgent.performances[0]?.pt} color="text-purple-700" />
                <ActivityStat label="🎁 INTRO" value={selectedAgent.performances[0]?.intro_count} color="text-rose-700" />
                <ActivityStat label="📥 DB배정" value={selectedAgent.performances[0]?.db_assigned} color="text-blue-700" />
                <ActivityStat label="📤 DB반품" value={selectedAgent.performances[0]?.db_returned} color="text-slate-700" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <h4 className="font-black text-xl border-l-8 border-black pl-4 uppercase">Target Setting</h4>
                    <InBox label="목표 건수" value={selectedAgent.monthly_targets[0]?.target_count || 0} onChange={(v:any)=>{ const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id); updated[idx].monthly_targets[0].target_count = v; setAgents(updated); }} unit="건" />
                    <InBox label="목표 금액" value={selectedAgent.monthly_targets[0]?.target_amount || 0} onChange={(v:any)=>{ const updated = [...agents]; const idx = updated.findIndex(ag => ag.id === selectedAgent.id); updated[idx].monthly_targets[0].target_amount = v; setAgents(updated); }} unit="만원" />
                 </div>
                 <div className="space-y-8">
                    <h4 className="font-black text-xl border-l-8 border-[#d4af37] pl-4 uppercase">Coaching Note</h4>
                    <textarea value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} className="w-full bg-slate-50 p-8 rounded-[2rem] font-bold text-lg h-56 outline-none border-4 focus:border-black" placeholder="관리자 코멘트..." />
                 </div>
              </div>
              <button onClick={async () => { 
                const t = selectedAgent.monthly_targets[0]; 
                await supabase.from("monthly_targets").upsert({ user_id: selectedAgent.id, year, month, target_count: Number(t.target_count), target_amount: Number(t.target_amount), status: 'approved', admin_comment: editingComment }, { onConflict: 'user_id, year, month' }); 
                alert("승인 및 저장 완료"); setSelectedAgent(null); fetchAdminData(); 
              }} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] font-black text-3xl mt-12 hover:scale-95 transition-transform uppercase">Save & Approve</button>
          </div>
        </div>
      )}

      {/* ⚙️ 팀 전략 수정 팝업 */}
      {isTeamGoalModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 md:p-16 relative border-8 border-[#d4af37]">
            <button onClick={() => setIsTeamGoalModalOpen(false)} className="absolute top-8 right-8 font-black text-3xl">✕</button>
            <h2 className="text-3xl font-black mb-10 italic uppercase tracking-tighter">Team Strategy Setting</h2>
            <div className="space-y-8 mb-12">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-600 ml-4 uppercase">📢 전사 공지사항</label>
                <textarea value={globalNotice} onChange={(e)=>setGlobalNotice(e.target.value)} className="w-full p-6 rounded-3xl bg-blue-50 font-black text-lg outline-none border-4 border-blue-100 focus:border-blue-600 h-32" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <InBox label="팀 목표 건수" value={teamGoal.count} onChange={(v:any)=>setTeamGoal({...teamGoal, count: v})} unit="건" />
                <InBox label="팀 목표 금액" value={teamGoal.amount} onChange={(v:any)=>setTeamGoal({...teamGoal, amount: v})} unit="만원" />
              </div>
              <InBox label="전체 도입 목표" value={teamGoal.recruit} onChange={(v:any)=>setTeamGoal({...teamGoal, recruit: v})} unit="명" />
            </div>
            <button onClick={async () => {
              const { error } = await supabase.from("team_goals").upsert({ id: "current_team_goal", year, month, total_goal_count: Number(teamGoal.count), total_goal_amount: Number(teamGoal.amount), total_goal_recruit: Number(teamGoal.recruit), global_notice: globalNotice }, { onConflict: 'id' });
              if (!error) { alert("팀 전략 업데이트 성공"); setIsTeamGoalModalOpen(false); fetchTeamGoal(); }
              else { alert("오류: " + error.message); }
            }} className="w-full bg-black text-[#d4af37] py-8 rounded-[2.5rem] font-black text-2xl uppercase">Update Strategy</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .react-calendar { width: 100% !important; border: none !important; border-radius: 24px; font-family: inherit; padding: 10px; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; }
        @keyframes pulse-yellow { 0%, 100% { border-color: #facc15; background-color: white; } 50% { border-color: transparent; background-color: #fefce8; } }
        @keyframes pulse-red { 0%, 100% { border-color: #ef4444; background-color: white; } 50% { border-color: transparent; background-color: #fef2f2; } }
        .animate-pulse-yellow { animation: pulse-yellow 1.5s infinite; }
        .animate-pulse-red { animation: pulse-red 1s infinite; }
      `}</style>
    </div>
  )
}

// 🧱 하위 컴포넌트들
function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between font-black uppercase text-sm"><span>{label}</span><span>{current}/{target}{unit}</span></div>
      <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden shadow-inner border"><div className="h-full transition-all duration-1000" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function MiniBar({ label, current, target, unit, color }: any) {
    const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
    return (
        <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span>{label} <span className="text-slate-400">({current}/{target}{unit})</span></span>
              <span>{Math.round(rate)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border">
              <div className="h-full transition-all duration-500" style={{ width: `${rate}%`, backgroundColor: color }}></div>
            </div>
        </div>
    )
}

function ActivityStat({ label, value, color }: any) {
    return (
        <div className="text-center p-2">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value || 0}</p>
        </div>
    )
}

function ActivityTab({ label, value, onChange, color, textColor, borderColor }: any) {
    return (
      <div className={`${color} ${borderColor} border-4 p-4 md:p-6 rounded-[2rem] shadow-md hover:scale-105 transition-transform`}>
        <label className="text-[9px] font-black block mb-2 uppercase opacity-60 tracking-widest">{label}</label>
        <input type="number" value={value === 0 ? "" : value} onChange={(e) => onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))} className={`w-full text-2xl md:text-3xl font-black outline-none bg-transparent italic ${textColor}`} placeholder="0" />
      </div>
    )
}

function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
    return (
      <div className="space-y-1 w-full">
        <label className={`text-[10px] font-black ml-4 uppercase ${highlight ? 'text-blue-600' : 'text-slate-400'}`}>{label}</label>
        <div className="relative">
          <input type="number" value={value === 0 ? "" : value} onChange={(e) => onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))} disabled={disabled} className={`w-full p-5 md:p-6 rounded-[2rem] font-black text-xl md:text-2xl outline-none border-4 transition-all ${disabled ? 'bg-slate-200 text-slate-500' : 'bg-slate-50 focus:border-black'} ${highlight && !disabled ? 'bg-blue-50 border-blue-100' : 'border-transparent'}`} placeholder="0" />
          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">{unit}</span>
        </div>
      </div>
    )
}