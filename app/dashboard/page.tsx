"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPES] ──────────────────────────
interface Performance {
  year: number; month: number;
  contract_count: number; contract_amount: number;
  ap: number; pt: number; call_count: number; meet_count: number;
  intro_count: number; recruit_count: number;
  db_assigned: number; db_returned: number;
}

interface MonthlyTarget {
  year: number; month: number;
  target_count: number; target_amount: number;
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

  // 날짜 설정
  const [selectedDate, setSelectedDate] = useState(new Date())
  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1
  const prevDate = new Date(currentYear, currentMonth - 2, 1)
  const lastYear = prevDate.getFullYear()
  const lastMonth = prevDate.getMonth() + 1

  // 데이터 상태
  const [agents, setAgents] = useState<Agent[]>([])
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [globalNotice, setGlobalNotice] = useState("")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [editingComment, setEditingComment] = useState("")
  
  // 영업식구 본인 입력 데이터 상태
  const [goal, setGoal] = useState(0); const [targetAmount, setTargetAmount] = useState(0);
  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0);
  const [ap, setAp] = useState(0); const [pt, setPt] = useState(0);
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0);
  const [intros, setIntros] = useState(0); const [recruits, setRecruits] = useState(0);
  const [dbAssigned, setDbAssigned] = useState(0); const [dbReturned, setDbReturned] = useState(0);
  const [isApproved, setIsApproved] = useState(false);
  const [personalMemo, setPersonalMemo] = useState("");
  const [dailySpecialNote, setDailySpecialNote] = useState("");

  // 관리자 탭 & 모달 상태
  const [adminTab, setAdminTab] = useState<'activity' | 'trend' | 'db' | 'edit'>('activity')
  const [reportTab, setReportTab] = useState<'team' | 'activity'>('team')
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')

  // 계산기 변수들
  const [compMonth, setCompMonth] = useState(50); const [compYear, setCompYear] = useState(5);
  const [compWait, setCompWait] = useState(5); const [bankRate, setBankRate] = useState(2);
  const [infMoney, setInfMoney] = useState(100); const [infRate, setInfRate] = useState(3);
  const [intMoney, setIntMoney] = useState(1000); const [intRate, setIntRate] = useState(5); const [intYear, setIntYear] = useState(20);

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, id, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    fetchTeamData()
    if (userInfo.role === "agent" || userInfo.role === "master") fetchAgentData(session.user.id)
    setLoading(false)
  }

  async function fetchDailyData(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const { data: notice } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).limit(1).maybeSingle()
    const { data: myData } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(notice?.admin_notice || ""); setPersonalMemo(myData?.agent_memo || "")
  }

  async function fetchTeamData() {
    const { data: agentsData } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (agentsData) setAgents(agentsData as Agent[])
    const { data: goalData } = await supabase.from("team_goals").select("*").eq("id", "current_team_goal").maybeSingle()
    if (goalData) {
      setTeamGoal({ count: goalData.total_goal_count, amount: goalData.total_goal_amount, recruit: goalData.total_goal_recruit })
      setGlobalNotice(goalData.global_notice || "")
    }
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
    const payloadT = { user_id: userId, year: currentYear, month: currentMonth, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year: currentYear, month: currentMonth, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("데이터 저장 완료")
  }

  const getMonthlyTotal = (year: number, month: number) => {
    return agents.reduce((acc, a) => {
      const p = a.performances?.find(pf => pf.year === year && pf.month === month) || { contract_count:0, contract_amount:0, recruit_count:0, call_count:0, meet_count:0, pt:0, db_assigned:0, db_returned:0 }
      return {
        count: acc.count + (p.contract_count || 0), amount: acc.amount + (p.contract_amount || 0), recruit: acc.recruit + (p.recruit_count || 0),
        calls: acc.calls + (p.call_count || 0), meets: acc.meets + (p.meet_count || 0), pts: acc.pts + (p.pt || 0), dbA: acc.dbA + (p.db_assigned || 0), dbR: acc.dbR + (p.db_returned || 0)
      }
    }, { count:0, amount:0, recruit:0, calls:0, meets:0, pts:0, dbA:0, dbR:0 })
  }

  const curTotal = getMonthlyTotal(currentYear, currentMonth)
  const lastTotal = getMonthlyTotal(lastYear, lastMonth)

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-3xl italic">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex text-slate-900 font-sans">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-80 bg-white border-r p-6 hidden lg:flex flex-col gap-6 shadow-2xl shrink-0 overflow-y-auto">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 text-center uppercase">History Board</h2>
        <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" formatDay={(l, date) => date.getDate().toString()} className="rounded-2xl border-0 shadow-sm custom-calendar" />

        <div className="p-4 bg-slate-900 rounded-[2rem] space-y-3">
            <p className="text-[#d4af37] text-[10px] font-black uppercase text-center tracking-tighter">Report Center</p>
            <button onClick={() => setIsReportModalOpen(true)} className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs hover:bg-[#d4af37] transition-all uppercase">실적 리포트</button>
        </div>

        <div className="space-y-4">
          <textarea readOnly={role === 'agent'} value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} placeholder="오늘의 교육/공지사항" className="w-full p-4 rounded-3xl bg-blue-50 text-sm h-24 outline-none font-bold border-2 border-blue-100" />
          <textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} placeholder="개인 메모" className="w-full p-4 rounded-3xl bg-slate-50 text-sm h-24 outline-none font-bold border-2 border-slate-200" />
          <button onClick={async () => { 
            const dateStr = selectedDate.toISOString().split('T')[0]; 
            await supabase.from("daily_notes").upsert({ user_id: userId, date: dateStr, agent_memo: personalMemo, ...((role !== 'agent') && { admin_notice: dailySpecialNote }) }, { onConflict: 'user_id, date' }); 
            alert("저장 완료") 
          }} className="w-full bg-black text-[#d4af37] py-4 rounded-3xl font-black text-xs uppercase">Save Data</button>
        </div>

        <div className="mt-auto space-y-2 border-t-2 pt-6">
          <button onClick={() => { setActiveTool('compare'); setIsBizToolOpen(true); }} className="w-full p-4 rounded-2xl hover:bg-blue-50 font-bold text-sm text-left">🏦 은행 vs 보험 비교</button>
          <button onClick={() => { setActiveTool('inflation'); setIsBizToolOpen(true); }} className="w-full p-4 rounded-2xl hover:bg-rose-50 font-bold text-sm text-rose-600 text-left">📉 화폐가치 계산기</button>
          <button onClick={() => { setActiveTool('interest'); setIsBizToolOpen(true); }} className="w-full p-4 rounded-2xl hover:bg-emerald-50 font-bold text-sm text-emerald-700 text-left">📈 단리 vs 복리 마법</button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 p-5 md:p-14 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <header className="bg-black text-white p-10 rounded-[4rem] flex justify-between items-center shadow-2xl border-b-8 border-[#d4af37]">
            <h1 className="text-4xl font-black italic text-[#d4af37] uppercase">METARICH SIGNAL</h1>
            <div className="flex items-center gap-8">
                <div className="text-right"><p className="text-[#d4af37] text-[10px] font-black uppercase">{role}</p><p className="text-3xl font-black">{userName}님</p></div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-red-600 px-6 py-3 rounded-2xl text-xs font-black">LOGOUT</button>
            </div>
          </header>

          {/* ─── 전체 실적 현황 (관리자용) ─── */}
          {(role === 'admin' || role === 'master') && (
            <section className="bg-white p-10 md:p-14 rounded-[4rem] shadow-xl border-4 border-slate-50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <h2 className="text-3xl font-black uppercase italic border-l-[15px] border-black pl-6">전체 실적 현황</h2>
                <div className="flex bg-slate-100 p-2 rounded-3xl gap-1">
                  <TabBtn active={adminTab==='activity'} label="활동 관리" onClick={()=>setAdminTab('activity')} />
                  <TabBtn active={adminTab==='trend'} label="3개월 실적" onClick={()=>setAdminTab('trend')} />
                  <TabBtn active={adminTab==='db'} label="DB 관리" onClick={()=>setAdminTab('db')} />
                  <TabBtn active={adminTab==='edit'} label="실적 관리" onClick={()=>setAdminTab('edit')} color="bg-black text-[#d4af37]" />
                </div>
              </div>

              {adminTab === 'activity' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <BigStat label="총 완료 건수" value={curTotal.count} unit="건" color="black" last={lastTotal.count} />
                  <BigStat label="총 완료 금액" value={curTotal.amount} unit="만원" color="#d4af37" last={lastTotal.amount} />
                  <BigStat label="총 신규 도입" value={curTotal.recruit} unit="명" color="#2563eb" last={lastTotal.recruit} />
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-center">
                     <p className="text-[10px] font-black text-[#d4af37] mb-2 uppercase">체결 전환율</p>
                     <p className="text-4xl font-black">{curTotal.meets > 0 ? ((curTotal.count / curTotal.meets) * 100).toFixed(1) : 0}%</p>
                     <p className="text-[10px] mt-2 opacity-50">건당 평균: {curTotal.count > 0 ? Math.round(curTotal.amount / curTotal.count) : 0}만</p>
                  </div>
                </div>
              )}

              {adminTab === 'trend' && (
                <div className="space-y-6">
                  <p className="font-black text-slate-400 uppercase text-xs">최근 3개월 실적 추이 및 월평균</p>
                  <div className="grid grid-cols-3 gap-6">
                    <TrendBox label="평균 건수" value={curTotal.count} last={lastTotal.count} unit="건" />
                    <TrendBox label="평균 금액" value={curTotal.amount} last={lastTotal.amount} unit="만원" />
                    <TrendBox label="평균 도입" value={curTotal.recruit} last={lastTotal.recruit} unit="명" />
                  </div>
                </div>
              )}

              {adminTab === 'db' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100">
                    <p className="text-xs font-black text-emerald-600 mb-2">DB 효율 (배정 대비 체결)</p>
                    <p className="text-4xl font-black">{curTotal.dbA > 0 ? ((curTotal.count / curTotal.dbA) * 100).toFixed(1) : 0}%</p>
                  </div>
                  <div className="p-8 bg-blue-50 rounded-[2.5rem] border-2 border-blue-100">
                    <p className="text-xs font-black text-blue-600 mb-2">전화 → 만남 성공률</p>
                    <p className="text-4xl font-black">{curTotal.calls > 0 ? ((curTotal.meets / curTotal.calls) * 100).toFixed(1) : 0}%</p>
                  </div>
                  <div className="p-8 bg-rose-50 rounded-[2.5rem] border-2 border-rose-100">
                    <p className="text-xs font-black text-rose-600 mb-2">DB 반품율</p>
                    <p className="text-4xl font-black">{curTotal.dbA > 0 ? ((curTotal.dbR / curTotal.dbA) * 100).toFixed(1) : 0}%</p>
                  </div>
                </div>
              )}

              {adminTab === 'edit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <InBox label="전체 목표 건수" value={teamGoal.count} onChange={(v:number)=>setTeamGoal({...teamGoal, count:v})} unit="건" />
                    <InBox label="전체 목표 금액" value={teamGoal.amount} onChange={(v:number)=>setTeamGoal({...teamGoal, amount:v})} unit="만원" />
                    <button onClick={async ()=>{
                      await supabase.from("team_goals").upsert({ id: "current_team_goal", total_goal_count: teamGoal.count, total_goal_amount: teamGoal.amount, total_goal_recruit: teamGoal.recruit, global_notice: globalNotice }, { onConflict: 'id' });
                      alert("전략 수정 완료")
                    }} className="w-full bg-black text-[#d4af37] py-5 rounded-3xl font-black uppercase">Save Strategy</button>
                  </div>
                  <textarea value={globalNotice} onChange={(e)=>setGlobalNotice(e.target.value)} placeholder="팀 공지사항을 입력하세요..." className="w-full p-8 bg-slate-50 border-2 rounded-[2.5rem] font-bold text-lg outline-none focus:border-black" />
                </div>
              )}
            </section>
          )}

          {/* ─── 영업식구 현황 관리 (관리자용 리스트) ─── */}
          {(role === 'admin' || role === 'master') && (
            <section className="space-y-8">
              <h2 className="text-3xl font-black uppercase italic border-l-[15px] border-slate-300 pl-6 text-slate-400">영업식구 현황 관리</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {agents.map(a => {
                  const t = a.monthly_targets?.find(mt=>mt.year===currentYear && mt.month===currentMonth) || { target_count: 0, target_amount: 0, admin_comment: "" };
                  const p = a.performances?.find(pf=>pf.year===currentYear && pf.month===currentMonth) || { contract_count: 0, contract_amount: 0, call_count: 0, meet_count: 0 };
                  const lp = a.performances?.find(pf=>pf.year===lastYear && pf.month===lastMonth) || { contract_count: 0 };
                  const isUp = p.contract_count >= lp.contract_count;
                  return (
                    <div key={a.id} onClick={() => { setSelectedAgent(a); setEditingComment(t.admin_comment || ""); }} className="bg-white p-10 rounded-[3.5rem] border-4 border-white shadow-lg transition-all hover:-translate-y-2 cursor-pointer relative overflow-hidden group">
                      {p.contract_count > lp.contract_count && <div className="absolute top-6 right-6 text-emerald-500 font-black animate-bounce text-[10px] italic">CONDITION UP ↑</div>}
                      <div className="font-black text-2xl mb-8">{a.name} CA</div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div><p className="text-[10px] font-black text-slate-400 uppercase">현재 실적</p><p className="text-3xl font-black">{p.contract_count}건</p></div>
                          <div className="text-right text-xs font-bold text-slate-300">지난달 {lp.contract_count}건</div>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${isUp?'bg-black':'bg-rose-400'}`} style={{ width: `${t.target_count > 0 ? (p.contract_count/t.target_count)*100 : 0}%` }}></div>
                        </div>
                        <p className={`text-[10px] font-black italic ${isUp ? 'text-emerald-500':'text-rose-500'}`}>{isUp ? '상승 곡선입니다':'관리가 필요합니다'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ─── 활동 관리 (영업식구 본인용 입력판) ─── */}
          {(role === "agent" || role === "master") && (
             <section className="space-y-12">
               <div className="flex justify-between items-center"><h2 className="text-3xl md:text-4xl font-black italic uppercase border-b-8 border-black pb-4">Activity Board</h2><button onClick={handleAgentSave} className="bg-black text-[#d4af37] px-10 py-5 rounded-[2.5rem] font-black text-sm shadow-xl uppercase">Update My Data</button></div>
               <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                 <ActivityTab label="📞 전화" value={calls} onChange={setCalls} color="bg-emerald-50" textColor="text-emerald-800" unit="건" />
                 <ActivityTab label="🤝 미팅" value={meets} onChange={setMeets} color="bg-amber-50" textColor="text-amber-800" unit="건" />
                 <ActivityTab label="📝 제안" value={pt} onChange={setPt} color="bg-purple-50" textColor="text-purple-800" unit="건" />
                 <ActivityTab label="🎁 소개" value={intros} onChange={setIntros} color="bg-rose-50" textColor="text-rose-800" unit="건" />
                 <ActivityTab label="📥 DB배정" value={dbAssigned} onChange={setDbAssigned} color="bg-blue-50" textColor="text-blue-800" unit="건" />
                 <ActivityTab label="📤 DB반품" value={dbReturned} onChange={setDbReturned} color="bg-slate-100" textColor="text-slate-800" unit="건" />
               </div>
               <div className="bg-white p-12 rounded-[3rem] shadow-xl border-4 grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                   <h3 className="text-2xl font-black text-slate-800 uppercase border-l-[12px] border-slate-300 pl-6">이번달 목표</h3>
                   <InBox label="목표 건수" value={goal} onChange={setGoal} unit="건" disabled={isApproved} />
                   <InBox label="목표 금액" value={targetAmount} onChange={setTargetAmount} unit="만원" disabled={isApproved} />
                   <InBox label="도입 실적" value={recruits} onChange={setRecruits} unit="명" highlight />
                 </div>
                 <div className="space-y-8">
                   <h3 className="text-2xl font-black text-[#d4af37] uppercase border-l-[12px] border-[#d4af37] pl-6">실시간 실적</h3>
                   <InBox label="완료 건수" value={contract} onChange={setContract} unit="건" />
                   <InBox label="완료 금액" value={contractAmount} onChange={setContractAmount} unit="만원" />
                   <InBox label="상담 횟수" value={ap} onChange={setAp} unit="회" />
                 </div>
               </div>
             </section>
          )}
        </div>

        {/* ─── MODALS ─── */}
        {selectedAgent && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] border-[10px] border-black">
                <button onClick={()=>setSelectedAgent(null)} className="absolute top-10 right-10 font-black text-4xl">✕</button>
                <h2 className="text-4xl font-black mb-12 italic border-b-[12px] border-black pb-6 uppercase">{selectedAgent.name} CA 컨디션 분석</h2>
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-6">
                      <div className="flex justify-between items-center bg-slate-100 p-6 rounded-3xl">
                        <span className="font-black text-lg uppercase">전월 대비 활동 지표</span>
                        <span className="text-xs font-bold text-slate-400 italic">{lastMonth}월 vs {currentMonth}월</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <StatDiff label="전화량" cur={selectedAgent.performances?.find(p=>p.year===currentYear&&p.month===currentMonth)?.call_count || 0} last={selectedAgent.performances?.find(p=>p.year===lastYear&&p.month===lastMonth)?.call_count || 0} />
                        <StatDiff label="만남량" cur={selectedAgent.performances?.find(p=>p.year===currentYear&&p.month===currentMonth)?.meet_count || 0} last={selectedAgent.performances?.find(p=>p.year===lastYear&&p.month===lastMonth)?.meet_count || 0} />
                        <StatDiff label="체결액" cur={selectedAgent.performances?.find(p=>p.year===currentYear&&p.month===currentMonth)?.contract_amount || 0} last={selectedAgent.performances?.find(p=>p.year===lastYear&&p.month===lastMonth)?.contract_amount || 0} />
                        <StatDiff label="도입수" cur={selectedAgent.performances?.find(p=>p.year===currentYear&&p.month===currentMonth)?.recruit_count || 0} last={selectedAgent.performances?.find(p=>p.year===lastYear&&p.month===lastMonth)?.recruit_count || 0} />
                      </div>
                  </div>
                  <div className="space-y-6">
                    <p className="font-black text-lg uppercase pl-4 border-l-8 border-[#d4af37]">식구 집중 코칭</p>
                    <textarea value={editingComment} onChange={(e)=>setEditingComment(e.target.value)} placeholder="피드백을 입력하세요..." className="w-full h-48 bg-slate-50 border-4 rounded-[2.5rem] p-8 font-bold text-lg outline-none focus:border-[#d4af37]" />
                    <button onClick={async ()=>{
                      const mt = (selectedAgent.monthly_targets || []).find(mt=>mt.year===currentYear && mt.month===currentMonth) || {target_count:0, target_amount:0}; 
                      await supabase.from("monthly_targets").upsert({ user_id: selectedAgent.id, year: currentYear, month: currentMonth, target_count: mt.target_count, target_amount: mt.target_amount, admin_comment: editingComment, status: 'approved' }, { onConflict: 'user_id, year, month' });
                      alert("코칭이 전달되었습니다."); setSelectedAgent(null); fetchTeamData();
                    }} className="w-full bg-[#d4af37] text-black py-6 rounded-3xl font-black text-xl uppercase">코칭 저장 및 목표 승인</button>
                  </div>
                </div>
            </div>
          </div>
        )}

        {isReportModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative border-8 border-black">
               <button onClick={()=>setIsReportModalOpen(false)} className="absolute top-10 right-10 text-3xl font-black">✕</button>
               <div className="flex gap-4 mb-10">
                 <button onClick={()=>setReportTab('team')} className={`px-10 py-4 rounded-full font-black text-xl ${reportTab==='team'?'bg-black text-white':'bg-slate-100 text-slate-400'}`}>팀 실적관리</button>
                 <button onClick={()=>setReportTab('activity')} className={`px-10 py-4 rounded-full font-black text-xl ${reportTab==='activity'?'bg-black text-white':'bg-slate-100 text-slate-400'}`}>활동관리</button>
               </div>
               {reportTab === 'team' ? (
                 <div className="space-y-8">
                   <h3 className="text-3xl font-black italic uppercase">{currentMonth}월 팀 퍼포먼스 리포트</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <ReportBox label="총 체결 건수" value={`${curTotal.count}건`} sub={`전월: ${lastTotal.count}건`} />
                     <ReportBox label="총 체결 금액" value={`${curTotal.amount.toLocaleString()}만`} sub={`전월: ${lastTotal.amount.toLocaleString()}만`} />
                     <ReportBox label="목표 달성률" value={`${teamGoal.count > 0 ? Math.round((curTotal.count/teamGoal.count)*100) : 0}%`} sub={`목표: ${teamGoal.count}건`} />
                     <ReportBox label="인당 생산성" value={`${agents.length > 0 ? Math.round(curTotal.amount/agents.length) : 0}만`} sub={`영업식구: ${agents.length}명`} />
                   </div>
                 </div>
               ) : (
                 <div className="space-y-8">
                   <h3 className="text-3xl font-black italic uppercase">{currentMonth}월 활동 효율 분석</h3>
                   <div className="grid grid-cols-3 gap-4">
                     <ReportBox label="만남 성사율" value={`${curTotal.calls > 0 ? Math.round((curTotal.meets/curTotal.calls)*100) : 0}%`} sub={`통화: ${curTotal.calls}건`} />
                     <ReportBox label="제안 성공률" value={`${curTotal.meets > 0 ? Math.round((curTotal.pts/curTotal.meets)*100) : 0}%`} sub={`PT: ${curTotal.pts}건`} />
                     <ReportBox label="평균 단가" value={`${curTotal.count > 0 ? Math.round(curTotal.amount/curTotal.count) : 0}만`} sub={`체결 대비`} />
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {isBizToolOpen && (
          <div className="fixed inset-0 bg-black/95 z-[600] flex items-center justify-center p-4">
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
                     <div className="bg-white p-10 rounded-[3rem] border-2 shadow-sm"><p className="text-lg font-black text-slate-400 mb-4">일반 단리</p><p className="text-5xl font-black">{(intMoney + (intMoney * (intRate/100) * intYear)).toLocaleString()}만</p></div>
                     <div className="bg-emerald-50 p-10 rounded-[3rem] border-4 border-emerald-100 shadow-md"><p className="text-lg font-black text-emerald-600 mb-4">복리의 마법</p><p className="text-5xl font-black text-emerald-700">{Math.round(intMoney * Math.pow(1 + intRate/100, intYear)).toLocaleString()}만</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-calendar { width: 100% !important; border: none !important; font-family: 'Pretendard', sans-serif !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; }
        .react-calendar__month-view__days__day--neighboringMonth { opacity: 0.1; }
      `}</style>
    </div>
  )
}

// ─── UI COMPONENTS ───
function TabBtn({ active, label, onClick, color }: any) {
  return (
    <button onClick={onClick} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${active ? (color || 'bg-white shadow-md text-black') : 'text-slate-400 hover:text-slate-600'}`}>
      {label}
    </button>
  )
}

function BigStat({ label, value, unit, color, last }: any) {
  const isUp = value >= last;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-5xl font-black italic" style={{ color }}>{value.toLocaleString()}</p>
        <span className="text-sm font-black text-slate-300">{unit}</span>
      </div>
      <p className={`text-[10px] font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isUp ? '↑' : '↓'} 전월비 {Math.abs(value - last).toLocaleString()}{unit}
      </p>
    </div>
  )
}

function TrendBox({ label, value, last, unit }: any) {
  const avg = Math.round((value + last) / 2);
  return (
    <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100">
      <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">{label}</p>
      <p className="text-3xl font-black">{avg}{unit}</p>
    </div>
  )
}

function StatDiff({ label, cur, last }: any) {
  const diff = cur - last;
  return (
    <div className="bg-slate-50 p-6 rounded-3xl">
      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <div className="flex justify-between items-center">
        <span className="text-xl font-black">{cur}</span>
        <span className={`text-[10px] font-black ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{diff >= 0 ? '+' : ''}{diff}</span>
      </div>
    </div>
  )
}

function ReportBox({ label, value, sub }: any) {
  return (
    <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 flex justify-between items-center">
      <div><p className="text-xs font-black text-slate-400 uppercase mb-1">{label}</p><p className="text-3xl font-black">{value}</p></div>
      <div className="text-right"><p className="text-xs font-bold text-slate-300 italic">{sub}</p></div>
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
      <label className="text-[10px] font-black ml-4 uppercase text-slate-400">{label}</label>
      <div className="relative">
        <input disabled={disabled} type="number" value={value || 0} onChange={(e)=> (onChange ? onChange(Number(e.target.value)) : null)} className={`w-full p-5 rounded-[2rem] font-black text-2xl outline-none border-4 ${highlight ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-100 border-transparent focus:border-black'}`} />
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">{unit}</span>
      </div>
    </div>
  )
}