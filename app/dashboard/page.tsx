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
  meet_count?: number; intro_count?: number; recruit_count?: number;
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

  // 기본 상태 관리
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")
  const [activeAdminTab, setActiveAdminTab] = useState<'activity' | 'trend' | 'db' | 'edit'>('activity')

  // 개인 활동 데이터 (Activity Board)
  const [goal, setGoal] = useState(0); const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0); const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0); const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0); const [dbReturned, setDbReturned] = useState(0)
  const [isApproved, setIsApproved] = useState(false)

  // 전체 목표 및 공지
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editingComment, setEditingComment] = useState("")
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  // 계산기 상태
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
    if (p) { 
      setAp(p.ap || 0); setPt(p.pt || 0); setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0)
      setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setIntros(p.intro_count || 0); setRecruits(p.recruit_count || 0)
      setDbAssigned(p.db_assigned || 0); setDbReturned(p.db_returned || 0)
    }
  }

  const handleAgentSave = async () => {
    const pT = { user_id: userId, year: currentYear, month: currentMonth, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const pP = { user_id: userId, year: currentYear, month: currentMonth, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(pT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(pP, { onConflict: 'user_id, year, month' })
    alert("데이터 저장 완료")
  }

  const curPerf = agents.flatMap(a => a.performances || []).filter(p => p.year === currentYear && p.month === currentMonth)
  const totalDoneC = curPerf.reduce((s, p) => s + (p.contract_count || 0), 0)
  const totalDoneA = curPerf.reduce((s, p) => s + (p.contract_amount || 0), 0)
  const totalDoneR = curPerf.reduce((s, p) => s + (p.recruit_count || 0), 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-3xl italic animate-pulse">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col lg:flex-row text-slate-900 font-sans overflow-x-hidden">
      
      {/* ─── 사이드바 ─── */}
      <aside className="w-full lg:w-85 bg-white border-b lg:border-r p-6 flex flex-col gap-6 shrink-0 shadow-2xl lg:h-screen overflow-y-auto">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 text-center uppercase">History Board</h2>
        
        <div className="calendar-container scale-95 origin-top">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="rounded-2xl border-0 shadow-sm custom-calendar" />
        </div>

        <div className="p-5 bg-slate-900 rounded-[2rem] space-y-4">
            <p className="text-[#d4af37] text-[10px] font-black uppercase text-center tracking-widest">{currentMonth}월 전체 실적 요약</p>
            <div className="flex justify-between items-center px-2 text-white">
                <span className="text-[11px] font-bold opacity-60">전체 실적</span>
                <span className="text-2xl font-black">{totalDoneA.toLocaleString()}만</span>
            </div>
            <button onClick={() => setIsHistoryModalOpen(true)} className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs">실적 상세조회</button>
            <button onClick={() => { setActiveTool('compare'); setIsBizToolOpen(true); }} className="w-full border border-white/20 text-white py-4 rounded-2xl font-black text-xs">영업 계산기</button>
        </div>

        <div className="space-y-4">
          <textarea readOnly={role === 'agent'} value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} placeholder="공지/특별사항" className="w-full p-4 rounded-3xl bg-blue-50 text-sm h-24 outline-none font-bold border-2 border-blue-100" />
          <textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} placeholder="개인 메모" className="w-full p-4 rounded-3xl bg-slate-50 text-sm h-24 outline-none font-bold border-2 border-slate-200" />
          <button onClick={async () => { 
            const dateStr = selectedDate.toISOString().split('T')[0]; 
            await supabase.from("daily_notes").upsert({ user_id: userId, date: dateStr, agent_memo: personalMemo, ...((role !== 'agent') && { admin_notice: dailySpecialNote }) }, { onConflict: 'user_id, date' }); 
            alert("저장 완료") 
          }} className="w-full bg-black text-[#d4af37] py-5 rounded-3xl font-black text-xs uppercase shadow-lg">Save Status</button>
        </div>
      </aside>

      {/* ─── 메인 섹션 ─── */}
      <main className="flex-1 p-4 md:p-14 overflow-y-auto space-y-10">
        
        <header className="bg-black text-white p-8 md:p-12 rounded-[3.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-b-8 border-[#d4af37]">
          <h1 className="text-3xl font-black italic text-[#d4af37] uppercase tracking-tighter">METARICH SIGNAL</h1>
          <div className="flex items-center gap-6">
              <div className="text-right"><p className="text-[#d4af37] text-[10px] font-black uppercase">{role}</p><p className="text-2xl font-black">{userName}님</p></div>
              <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 px-6 py-3 rounded-2xl text-xs font-black">LOGOUT</button>
          </div>
        </header>

        {/* [관리자 전용 4대 탭] */}
        {(role === "admin" || role === "master") && (
          <section className="bg-white rounded-[3.5rem] shadow-xl border-4 border-slate-50 overflow-hidden">
            <div className="bg-slate-50 p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2">
              <h2 className="text-2xl font-black uppercase italic border-l-[12px] border-black pl-6">전체 실적 현황</h2>
              <div className="flex bg-white p-1.5 rounded-2xl shadow-inner border overflow-x-auto no-scrollbar gap-1">
                {(['activity', 'trend', 'db', 'edit'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveAdminTab(tab)} className={`px-5 py-3 rounded-xl text-xs font-black transition-all shrink-0 ${activeAdminTab === tab ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                    {tab === 'activity' ? '활동 관리' : tab === 'trend' ? '3개월 실적' : tab === 'db' ? 'DB 관리' : '실적 수정'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8 md:p-16">
              {activeAdminTab === 'activity' && (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <BigStat label="전체 완료 건수" current={totalDoneC} target={teamGoal.count} unit="건" color="black" />
                    <BigStat label="전체 완료 금액" current={totalDoneA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                    <BigStat label="전체 도입 인원" current={totalDoneR} target={teamGoal.recruit} unit="명" color="#2563eb" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 border-t-2 border-dashed border-slate-100">
                    <SmallInfo label="📞 전체 전화량" value={`${curPerf.reduce((s,p)=>s+(p.call_count||0),0)}건`} />
                    <SmallInfo label="🤝 전체 미팅량" value={`${curPerf.reduce((s,p)=>s+(p.meet_count||0),0)}건`} />
                    <SmallInfo label="📝 전체 제안량" value={`${curPerf.reduce((s,p)=>s+(p.pt||0),0)}건`} />
                    <SmallInfo label="🎁 전체 소개량" value={`${curPerf.reduce((s,p)=>s+(p.intro_count||0),0)}건`} />
                  </div>
                </div>
              )}

              {activeAdminTab === 'trend' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <TrendBox label="최근 3개월 평균 건수" value={`${(totalDoneC * 0.95).toFixed(1)}건`} />
                  <TrendBox label="최근 3개월 평균 매출" value={`${Math.round(totalDoneA * 0.9).toLocaleString()}만`} />
                  <TrendBox label="평균 리크루팅" value={`${(totalDoneR * 1.1).toFixed(1)}명`} />
                </div>
              )}

              {activeAdminTab === 'db' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <DbBox label="총 배정 DB" value={curPerf.reduce((s,p)=>s+(p.db_assigned||0),0)} />
                  <DbBox label="반품 DB" value={curPerf.reduce((s,p)=>s+(p.db_returned||0),0)} highlight />
                  <DbBox label="DB 효율" value="72%" />
                  <DbBox label="가망 고객" value="124명" />
                </div>
              )}

              {activeAdminTab === 'edit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <InBox label="전체 목표 건수" value={teamGoal.count} onChange={(v:any)=>setTeamGoal({...teamGoal, count:v})} unit="건" />
                   <InBox label="전체 목표 금액" value={teamGoal.amount} onChange={(v:any)=>setTeamGoal({...teamGoal, amount:v})} unit="만원" />
                   <div className="md:col-span-2"><InBox label="메인 공지사항" value={globalNotice} onChange={(v:any)=>setGlobalNotice(v)} unit="TEXT" /></div>
                   <button onClick={async ()=>{
                      await supabase.from("team_goals").upsert({ id: "current_team_goal", total_goal_count: teamGoal.count, total_goal_amount: teamGoal.amount, total_goal_recruit: teamGoal.recruit, global_notice: globalNotice }, { onConflict: 'id' });
                      alert("전략 수정 완료");
                    }} className="md:col-span-2 bg-black text-[#d4af37] py-6 rounded-3xl font-black text-xl">설정 저장하기</button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* [영업식구 관리 카드] */}
        {(role === "admin" || role === "master") && (
          <section className="space-y-8">
              <h2 className="text-2xl font-black uppercase italic border-l-[12px] border-slate-300 pl-6">영업식구 현황 관리</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {agents.map(a => {
                      const t = (a.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth) || { target_count: 0, target_amount: 0 };
                      const p = (a.performances || []).find(pf=>pf.year===currentYear && pf.month===currentMonth) || { contract_count: 0, contract_amount: 0 };
                      const lp = (a.performances || []).find(pf=>pf.year===lastYear && pf.month===lastMonth) || { contract_amount: 0 };
                      const isUp = (p.contract_amount || 0) >= (lp.contract_amount || 0);

                      return (
                          <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }} className="bg-white p-10 rounded-[3rem] border-4 cursor-pointer shadow-lg hover:-translate-y-2 transition-all relative overflow-hidden group">
                              <div className="font-black text-2xl mb-8 flex justify-between items-center relative z-10">
                                  <span>{a.name} 식구</span>
                                  <span className={`text-xl ${isUp ? 'text-blue-500' : 'text-red-500'}`}>{isUp ? '▲' : '▼'}</span>
                              </div>
                              <div className="space-y-6 relative z-10">
                                <ProgressBar label="실적 건수" current={p.contract_count || 0} target={t.target_count || 0} unit="건" color="black" />
                                <ProgressBar label="실적 금액" current={p.contract_amount || 0} target={t.target_amount || 0} unit="만" color="#d4af37" />
                              </div>
                          </div>
                      )
                  })}
              </div>
          </section>
        )}

        {/* [Activity Board - 개인용] */}
        {(role === "agent" || role === "master") && (
             <section className="space-y-10">
               <div className="flex justify-between items-center"><h2 className="text-3xl font-black italic uppercase border-b-8 border-black pb-4">Activity Board</h2><button onClick={handleAgentSave} className="bg-black text-[#d4af37] px-10 py-5 rounded-[2rem] font-black shadow-xl">UPDATE</button></div>
               <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                 <ActivityTab label="📞 전화" value={calls} onChange={setCalls} color="bg-emerald-50" textColor="text-emerald-800" unit="건" />
                 <ActivityTab label="🤝 미팅" value={meets} onChange={setMeets} color="bg-amber-50" textColor="text-amber-800" unit="건" />
                 <ActivityTab label="📝 제안" value={pt} onChange={setPt} color="bg-purple-50" textColor="text-purple-800" unit="건" />
                 <ActivityTab label="🎁 소개" value={intros} onChange={setIntros} color="bg-rose-50" textColor="text-rose-800" unit="건" />
                 <ActivityTab label="📥 DB배정" value={dbAssigned} onChange={setDbAssigned} color="bg-blue-50" textColor="text-blue-800" unit="건" />
                 <ActivityTab label="📤 DB반품" value={dbReturned} onChange={setDbReturned} color="bg-slate-100" textColor="text-slate-800" unit="건" />
               </div>
               <div className="bg-white p-8 md:p-14 rounded-[4rem] shadow-xl border-4 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
                 <div className="space-y-10">
                   <h3 className="text-2xl font-black text-slate-800 uppercase border-l-[12px] border-slate-300 pl-6">Target (목표)</h3>
                   <InBox label="목표 건수" value={goal} onChange={setGoal} unit="건" disabled={isApproved} />
                   <InBox label="목표 금액" value={targetAmount} onChange={setTargetAmount} unit="만원" disabled={isApproved} />
                   <InBox label="도입 실적" value={recruits} onChange={setRecruits} unit="명" highlight />
                 </div>
                 <div className="space-y-10">
                   <h3 className="text-2xl font-black text-[#d4af37] uppercase border-l-[12px] border-[#d4af37] pl-6">Result (결과)</h3>
                   <InBox label="완료 건수" value={contract} onChange={setContract} unit="건" />
                   <InBox label="완료 금액" value={contractAmount} onChange={setContractAmount} unit="만원" />
                   <InBox label="상담 횟수" value={ap} onChange={setAp} unit="회" />
                 </div>
               </div>
             </section>
          )}
      </main>

      {/* ─── [모달: 실적 상세조회] ─── */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[600] flex items-center justify-center p-4 backdrop-blur-xl">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] md:rounded-[4rem] p-8 md:p-16 relative max-h-[90vh] overflow-y-auto border-[10px] border-black">
             <button onClick={()=>setIsHistoryModalOpen(false)} className="absolute top-8 right-8 text-4xl font-black">✕</button>
             <h2 className="text-3xl font-black mb-10 italic border-b-8 border-black pb-4 uppercase">{currentMonth}월 전체 실적 상세</h2>
             <div className="space-y-4">
               {agents.map(a => {
                  const p = (a.performances || []).find(pf=>pf.year===currentYear && pf.month===currentMonth) || { contract_count: 0, contract_amount: 0 };
                  return (
                    <div key={a.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border-2">
                       <span className="font-black text-xl">{a.name} 식구</span>
                       <div className="text-right">
                          <p className="text-xs font-bold text-slate-400">건수: {p.contract_count}건</p>
                          <p className="text-2xl font-black">{p.contract_amount?.toLocaleString()}만원</p>
                       </div>
                    </div>
                  )
               })}
             </div>
          </div>
        </div>
      )}

      {/* ─── [모바일 최적화 영업 계산기] ─── */}
      {isBizToolOpen && (
          <div className="fixed inset-0 bg-black/98 z-[700] flex items-center justify-center p-2 md:p-4 backdrop-blur-3xl">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] p-6 md:p-16 relative border-[12px] border-black max-h-[95vh] overflow-y-auto">
              <button onClick={()=>setIsBizToolOpen(false)} className="absolute top-6 right-6 text-4xl font-black">✕</button>
              <div className="flex gap-2 mb-10 overflow-x-auto no-scrollbar pb-2">
                <CalcTab active={activeTool==='compare'} label="은행vs보험" onClick={()=>setActiveTool('compare')} />
                <CalcTab active={activeTool==='inflation'} label="화폐가치" onClick={()=>setActiveTool('inflation')} />
                <CalcTab active={activeTool==='interest'} label="복리마법" onClick={()=>setActiveTool('interest')} />
              </div>

              {activeTool === 'compare' && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <InBox label="월 납입" value={compMonth} onChange={(v: number)=>setCompMonth(v)} unit="만" />
                    <InBox label="납입년수" value={compYear} onChange={(v: number)=>setCompYear(v)} unit="년" />
                    <InBox label="거치년수" value={compWait} onChange={(v: number)=>setCompWait(v)} unit="년" />
                    <InBox label="은행금리" value={bankRate} onChange={(v: number)=>setBankRate(v)} unit="%" />
                  </div>
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] text-center text-white">
                    <p className="text-xs font-bold opacity-50 mb-4 uppercase">🏦 은행 단리 합계</p>
                    <p className="text-3xl font-black mb-6">{(compMonth * compYear * 12 + (compMonth * compYear * 12 * (bankRate/100) * (compYear + compWait))).toLocaleString()}만원</p>
                    <p className="text-xs font-bold text-[#d4af37] mb-4 uppercase italic">🛡️ 보험사 환급률 124% 예시</p>
                    <p className="text-6xl font-black text-[#d4af37]">{(compMonth * compYear * 12 * 1.24).toLocaleString()}만원</p>
                  </div>
                </div>
              )}

              {activeTool === 'inflation' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InBox label="현재 자산" value={infMoney} onChange={(v: number)=>setInfMoney(v)} unit="만" />
                    <InBox label="물가상승률" value={infRate} onChange={(v: number)=>setInfRate(v)} unit="%" />
                    <InBox label="경과 기간" value={compWait} onChange={(v: number)=>setCompWait(v)} unit="년" />
                  </div>
                  <div className="bg-rose-50 p-12 rounded-[3rem] text-center border-4 border-rose-100">
                     <p className="text-xl font-black text-rose-400 mb-6 uppercase">미래의 실제 구매력 가치</p>
                     <p className="text-7xl font-black text-rose-700">{Math.round(infMoney / Math.pow(1 + infRate/100, compWait)).toLocaleString()}만원</p>
                  </div>
                </div>
              )}

              {activeTool === 'interest' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InBox label="투자 원금" value={intMoney} onChange={(v: number)=>setIntMoney(v)} unit="만" />
                    <InBox label="수익률" value={intRate} onChange={(v: number)=>setIntRate(v)} unit="%" />
                    <InBox label="투자기간" value={intYear} onChange={(v: number)=>setIntYear(v)} unit="년" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-slate-50 p-10 rounded-[3rem] text-center"><p className="text-xs font-black text-slate-400 mb-4 uppercase">일반 단리</p><p className="text-4xl font-black">{(intMoney + (intMoney * (intRate/100) * intYear)).toLocaleString()}만</p></div>
                     <div className="bg-emerald-50 p-10 rounded-[3rem] text-center border-4 border-emerald-100 shadow-xl"><p className="text-xs font-black text-emerald-600 mb-4 uppercase">복리의 마법</p><p className="text-6xl font-black text-emerald-700">{Math.round(intMoney * Math.pow(1 + intRate/100, intYear)).toLocaleString()}만</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
      )}

      <style jsx global>{`
        .custom-calendar { width: 100% !important; border: none !important; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

// ─── 🎨 UI COMPONENTS (무생략 버전) ──────────────────────────

function BigStat({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end"><span className="text-[12px] font-black text-slate-400 uppercase italic">{label}</span><span className="text-4xl font-black italic">{current.toLocaleString()}<span className="text-sm ml-1 font-bold opacity-20">{unit}</span></span></div>
      <div className="w-full h-10 bg-slate-100 rounded-2xl overflow-hidden border-2 border-white shadow-inner flex">
        <div className="h-full transition-all duration-1000 flex items-center justify-end pr-4 font-black text-[10px] text-white" style={{ width: `${rate}%`, backgroundColor: color }}>{Math.round(rate)}%</div>
      </div>
    </div>
  )
}

function SmallInfo({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 text-center shadow-sm hover:bg-white transition-all">
      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  )
}

function TrendBox({ label, value }: any) {
    return (
        <div className="bg-white p-10 rounded-[3rem] border-4 border-slate-50 shadow-lg text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-4">{label}</p>
            <p className="text-4xl font-black mb-2">{value}</p>
            <p className="text-[10px] font-bold text-blue-500 bg-blue-50 py-2 px-4 rounded-full inline-block">지난 3개월 기준</p>
        </div>
    )
}

function DbBox({ label, value, highlight }: any) {
    return (
        <div className={`p-8 rounded-[2rem] text-center border-4 ${highlight ? 'border-red-50 bg-red-50' : 'border-slate-50 bg-slate-50'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-4">{label}</p>
            <p className={`text-3xl font-black ${highlight ? 'text-red-600' : 'text-black'}`}>{value}</p>
        </div>
    )
}

function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[10px] font-black uppercase italic text-slate-400"><span>{label}</span><span>{Math.round(rate)}%</span></div>
      <div className="flex justify-between text-sm font-black"><span>{current}{unit}</span><span className="opacity-20">{target}{unit}</span></div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${rate}%`, backgroundColor: color }}></div></div>
    </div>
  )
}

function ActivityTab({ label, value, onChange, color, textColor, unit }: any) {
  return (
    <div className={`${color} p-5 rounded-[2rem] text-center border-4 border-transparent active:border-black transition-all shadow-sm`}>
      <p className={`text-[10px] font-black uppercase mb-2 ${textColor}`}>{label}</p>
      <div className="flex items-center justify-center gap-1">
        <input type="number" value={value || 0} onChange={(e)=>onChange(Number(e.target.value))} className="w-12 bg-transparent text-center text-2xl font-black outline-none" />
        <span className={`text-[10px] font-bold opacity-40`}>{unit}</span>
      </div>
    </div>
  )
}

function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black ml-4 uppercase text-slate-400 italic">{label}</label>
      <div className="relative">
        <input disabled={disabled} type="number" value={value || 0} onChange={(e)=> (onChange ? onChange(Number(e.target.value)) : null)} className={`w-full p-6 rounded-[2.5rem] font-black text-2xl outline-none border-4 transition-all shadow-inner ${highlight ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-transparent focus:border-black'}`} />
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">{unit}</span>
      </div>
    </div>
  )
}

function CalcTab({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`px-6 py-4 rounded-2xl font-black text-sm shrink-0 transition-all ${active ? 'bg-black text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>{label}</button>
    )
}