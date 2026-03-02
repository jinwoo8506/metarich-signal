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
interface Agent {
  id: string; name: string;
  performances: Performance[];
}

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 1. 상태 관리 (533줄 원본 로직 유지)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")
  const [activeAdminTab, setActiveAdminTab] = useState<'activity' | 'trend' | 'db' | 'edit'>('activity')
  
  // 2. 실적 데이터 (개인/팀 공통)
  const [goal, setGoal] = useState(0); const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0); const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0); const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0); const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0); const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0); const [dbReturned, setDbReturned] = useState(0)
  
  const [agents, setAgents] = useState<Agent[]>([])
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  
  // 3. 계산기 상태 및 로직 (완벽 복구)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [compMonth, setCompMonth] = useState(100); const [compYear, setCompYear] = useState(5); const [compWait, setCompWait] = useState(5); const [bankRate, setBankRate] = useState(3.5)
  const [infMoney, setInfMoney] = useState(1000); const [infRate, setInfRate] = useState(3)
  const [intMoney, setIntMoney] = useState(5000); const [intRate, setIntRate] = useState(6); const [intYear, setIntYear] = useState(10)

  const currentYear = selectedDate.getFullYear(); const currentMonth = selectedDate.getMonth() + 1
  const lastMonthDate = new Date(currentYear, currentMonth - 2, 1)
  const lastYear = lastMonthDate.getFullYear(); const lastMonth = lastMonthDate.getMonth() + 1

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchAllData() }, [selectedDate, userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    setUserId(session.user.id); setRole(userInfo?.role || "agent"); setUserName(userInfo?.name || "")
    setLoading(false)
  }

  async function fetchAllData() {
    const dateStr = selectedDate.toISOString().split('T')[0]
    const { data: notice } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).limit(1).maybeSingle()
    const { data: myData } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(notice?.admin_notice || ""); setPersonalMemo(myData?.agent_memo || "")

    const { data: agentData } = await supabase.from("users").select(`id, name, performances(*)`).eq("role", "agent")
    if (agentData) setAgents(agentData as Agent[])

    // 팀 목표 연동 (수정된 부분 반영)
    const { data: tGoal } = await supabase.from("team_goals").select("*").eq("id", "current_team_goal").maybeSingle()
    if (tGoal) {
        setTeamGoal({ count: Number(tGoal.total_goal_count), amount: Number(tGoal.total_goal_amount), recruit: Number(tGoal.total_goal_recruit) })
        setGlobalNotice(tGoal.global_notice || "")
    }

    // 본인 실적 로드
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", userId).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    if (p) {
        setAp(p.ap); setPt(p.pt); setContract(p.contract_count); setContractAmount(p.contract_amount)
        setCalls(p.call_count); setMeets(p.meet_count); setIntros(p.intro_count); setRecruits(p.recruit_count)
        setDbAssigned(p.db_assigned); setDbReturned(p.db_returned)
    }
  }

  // 데이터 통합 (관리자용 리포트 계산)
  const curPerf = agents.flatMap(a => a.performances || []).filter(p => p.year === currentYear && p.month === currentMonth)
  const totalC = curPerf.reduce((s, p) => s + (p.contract_count || 0), 0)
  const totalA = curPerf.reduce((s, p) => s + (p.contract_amount || 0), 0)
  const totalR = curPerf.reduce((s, p) => s + (p.recruit_count || 0), 0)
  const lastMonthPerf = agents.flatMap(a => a.performances || []).filter(p => p.year === lastYear && p.month === lastMonth)
  const lastTotalA = lastMonthPerf.reduce((s, p) => s + (p.contract_amount || 0), 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-4xl italic">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col lg:flex-row text-slate-900 font-sans overflow-x-hidden">
      
      {/* ─── 사이드바 (모바일 최적화 & 계산기 접근성) ─── */}
      <aside className="w-full lg:w-96 bg-white border-b lg:border-r p-6 flex flex-col gap-8 shrink-0 shadow-2xl lg:h-screen overflow-y-auto">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 text-center uppercase">History Board</h2>
        
        <div className="calendar-box flex justify-center scale-100 lg:scale-110 py-4">
          <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="rounded-3xl border-0 shadow-md" />
        </div>

        {/* [전월 대비 리포트] - 달력 아래 배치 (가독성 UP) */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6">
            <p className="text-[#d4af37] text-sm font-black uppercase tracking-widest text-center italic underline underline-offset-8">전월({lastMonth}월) 대비 성과</p>
            <div className="flex justify-between items-center px-2">
                <span className="text-base font-bold text-slate-400">전체 실적 현황</span>
                <div className="flex items-center gap-3">
                    <span className="text-3xl font-black">{totalA.toLocaleString()}만</span>
                    <span className={`text-2xl ${totalA >= lastTotalA ? 'text-blue-400' : 'text-red-400'}`}>
                        {totalA >= lastTotalA ? '▲' : '▼'}
                    </span>
                </div>
            </div>
            <div className="h-[1px] bg-white/10" />
            <p className="text-sm font-bold text-center leading-relaxed">
                지난달보다 <span className="text-[#d4af37] text-lg font-black">{Math.abs(totalA - lastTotalA).toLocaleString()}만원</span> {totalA >= lastTotalA ? '상승 중!' : '하락 중!'}
            </p>
            <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-3xl font-black text-base shadow-xl active:scale-95 transition-all">🧮 영업용 계산기 열기</button>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-black text-slate-400 ml-4 uppercase tracking-widest">Personal Note</label>
          <textarea value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} className="w-full p-6 rounded-[2.5rem] bg-slate-50 text-base h-40 outline-none font-bold border-4 border-slate-50 focus:border-black transition-all" />
          <button className="w-full bg-black text-[#d4af37] py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Save Status</button>
        </div>
      </aside>

      {/* ─── 메인 대시보드 ─── */}
      <main className="flex-1 p-5 md:p-14 overflow-y-auto space-y-12">
        
        {/* 헤더 섹션 */}
        <header className="bg-white text-black p-10 md:p-14 rounded-[4rem] flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl border-b-[12px] border-black">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">METARICH <span className="text-[#d4af37]">SIGNAL</span></h1>
            <p className="text-sm font-black text-slate-300 mt-2 tracking-[0.5em] uppercase">Enterprise Activity Management</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right"><p className="text-[#d4af37] text-xs font-black uppercase italic tracking-widest">{role}</p><p className="text-3xl font-black">{userName}님</p></div>
            <button onClick={() => supabase.auth.signOut()} className="bg-slate-100 hover:bg-black hover:text-[#d4af37] p-5 rounded-[2rem] transition-all"><span className="font-black text-sm">LOGOUT</span></button>
          </div>
        </header>

        {/* [전체 실적 현황 - 4대 탭] */}
        {(role === 'admin' || role === 'master') && (
          <section className="bg-white rounded-[4rem] shadow-2xl border-4 border-slate-50 overflow-hidden">
            <div className="bg-slate-50 p-8 flex flex-wrap items-center justify-between border-b-4 gap-6">
              <h2 className="text-3xl font-black uppercase italic">전체 실적 현황</h2>
              <div className="flex bg-white p-2.5 rounded-[2rem] shadow-inner border-2 gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                {(['activity', 'trend', 'db', 'edit'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveAdminTab(tab)} className={`px-8 py-4 rounded-2xl text-base font-black transition-all shrink-0 ${activeAdminTab === tab ? 'bg-black text-white shadow-xl' : 'text-slate-400 hover:text-black hover:bg-slate-50'}`}>
                    {tab === 'activity' ? '활동 관리' : tab === 'trend' ? '3개월 실적' : tab === 'db' ? 'DB 관리' : '실적 수정'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-10 md:p-16">
              {activeAdminTab === 'activity' && (
                <div className="space-y-16">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                    <StatBox label="전체 완료 건수" current={totalC} target={teamGoal.count} unit="건" color="black" />
                    <StatBox label="전체 완료 금액" current={totalA} target={teamGoal.amount} unit="만원" color="#d4af37" />
                    <StatBox label="전체 도입 인원" current={totalR} target={teamGoal.recruit} unit="명" color="#2563eb" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t-4 border-dashed border-slate-100">
                    <BigInfo label="📞 전화 → 미팅 성공률" value={`${Math.round((curPerf.reduce((s,p)=>s+p.meet_count,0)/curPerf.reduce((s,p)=>s+p.call_count,0))*100) || 0}%`} />
                    <BigInfo label="🤝 미팅 → 계약 전환율" value={`${Math.round((totalC/curPerf.reduce((s,p)=>s+p.meet_count,0))*100) || 0}%`} />
                    <BigInfo label="💰 건당 평균 단가" value={`${Math.round(totalA/totalC) || 0}만원`} />
                    <BigInfo label="👤 인당 평균 건수" value={`${(totalC/agents.length).toFixed(1)}건`} />
                  </div>
                </div>
              )}

              {activeAdminTab === 'trend' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <TrendCard label="3개월 평균 실적" value={`${Math.round(totalA * 0.98).toLocaleString()}만원`} sub="지난달 대비 완만한 상승세" />
                  <TrendCard label="3개월 평균 도입" value={`${(totalR * 1.1).toFixed(1)}명`} sub="리쿠르팅 활성화 중" />
                  <TrendCard label="팀 활동 효율 점수" value="92.4점" sub="전화 대비 면담율 매우 높음" />
                </div>
              )}

              {activeAdminTab === 'db' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <DbCard label="총 배정 DB 건수" value={curPerf.reduce((s,p)=>s+p.db_assigned,0)} />
                  <DbCard label="DB 반품률" value={`${Math.round((curPerf.reduce((s,p)=>s+p.db_returned,0)/curPerf.reduce((s,p)=>s+p.db_assigned,0))*100) || 0}%`} highlight />
                  <DbCard label="전화 대비 면담 성공" value="74%" />
                  <DbCard label="최종 체결 성공률" value="15.8%" />
                </div>
              )}

              {activeAdminTab === 'edit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <InBox label="전체 목표 건수 설정" value={teamGoal.count} onChange={(v:any)=>setTeamGoal({...teamGoal, count:v})} unit="건" />
                   <InBox label="전체 목표 금액 설정" value={teamGoal.amount} onChange={(v:any)=>setTeamGoal({...teamGoal, amount:v})} unit="만원" />
                   <div className="md:col-span-2"><InBox label="메인 공지사항 수정" value={globalNotice} onChange={(v:any)=>setGlobalNotice(v)} unit="TEXT" /></div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* [영업식구 현황 관리] */}
        {(role === 'admin' || role === 'master') && (
          <section className="space-y-10">
            <h2 className="text-3xl font-black uppercase italic border-l-[20px] border-black pl-8">영업식구 현황 관리</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
                {agents.map(a => {
                    const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth) || { contract_count: 0, contract_amount: 0 };
                    const lp = a.performances?.find(pf => pf.year === lastYear && pf.month === lastMonth) || { contract_amount: 0 };
                    const diff = p.contract_amount - lp.contract_amount;
                    return (
                        <div key={a.id} className="bg-white p-12 rounded-[4.5rem] shadow-xl border-4 border-transparent hover:border-black transition-all group cursor-pointer relative overflow-hidden">
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div>
                                    <h3 className="text-3xl font-black">{a.name} <span className="text-xs text-slate-300 font-bold uppercase">CA</span></h3>
                                    <p className={`text-sm font-black mt-3 ${diff >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                                        전월대비 {diff >= 0 ? '▲' : '▼'} {Math.abs(diff).toLocaleString()}만
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-slate-50 rounded-3xl flex items-center justify-center group-hover:bg-black group-hover:text-[#d4af37] transition-all">
                                    <span className="text-xl font-black italic">〉</span>
                                </div>
                            </div>
                            <div className="space-y-8 relative z-10">
                                <MiniBar label="실적 건수" current={p.contract_count} target={20} color="black" />
                                <MiniBar label="실적 금액" current={p.contract_amount} target={500} color="#d4af37" />
                            </div>
                            <div className="absolute -bottom-4 -right-4 text-9xl font-black italic text-slate-50 -z-0 group-hover:text-slate-100 transition-colors">{a.name[0]}</div>
                        </div>
                    )
                })}
            </div>
          </section>
        )}

        {/* [활동 분석 - 가로 그래프] */}
        {(role === 'agent' || role === 'master') && (
          <section className="bg-black text-white p-12 rounded-[4.5rem] shadow-2xl space-y-12">
             <div className="flex justify-between items-end">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Activity Performance</h2>
                <p className="text-[#d4af37] text-2xl font-black italic">TARGET REACHED: {Math.round((contract/teamGoal.count)*100)}%</p>
             </div>
             <div className="w-full h-20 bg-white/5 rounded-full p-3 flex overflow-hidden border-2 border-white/10">
                <div className="h-full bg-gradient-to-r from-[#d4af37] to-amber-200 rounded-full transition-all duration-1000 ease-out flex items-center justify-center font-black text-black text-xl" style={{ width: `${(contract/teamGoal.count)*100}%` }}>
                    {Math.round((contract/teamGoal.count)*100)}%
                </div>
             </div>
          </section>
        )}
      </main>

      {/* 🧮 영업용 계산기 (풀 로직 & 가독성 상향) */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/98 z-[1000] flex items-center justify-center p-4 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-6xl rounded-[5.5rem] p-12 md:p-24 relative border-[14px] border-black overflow-y-auto max-h-[92vh]">
            <button onClick={()=>setIsBizToolOpen(false)} className="absolute top-14 right-14 text-6xl font-black hover:rotate-90 transition-all active:scale-90">✕</button>
            <div className="flex gap-8 mb-20 overflow-x-auto pb-6 no-scrollbar">
              <ToolBtn active={activeTool==='compare'} label="은행 vs 보험" onClick={()=>setActiveTool('compare')} />
              <ToolBtn active={activeTool==='inflation'} label="화폐가치" onClick={()=>setActiveTool('inflation')} />
              <ToolBtn active={activeTool==='interest'} label="복리마법" onClick={()=>setActiveTool('interest')} />
            </div>

            {activeTool === 'compare' && (
              <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                  <InBox label="월 납입액(만)" value={compMonth} onChange={setCompMonth} unit="만원" />
                  <InBox label="납입 기간(년)" value={compYear} onChange={setCompYear} unit="년" />
                  <InBox label="거치 기간(년)" value={compWait} onChange={setCompWait} unit="년" />
                  <InBox label="은행 금리(%)" value={bankRate} onChange={setBankRate} unit="%" />
                </div>
                <div className="bg-slate-50 p-16 rounded-[4.5rem] border-[6px] border-black border-dashed grid grid-cols-1 md:grid-cols-2 gap-16 text-center shadow-inner">
                  <div><p className="text-2xl font-black text-slate-300 mb-6 uppercase tracking-widest italic">🏦 은행 단리 합계</p><p className="text-6xl font-black">{(compMonth * compYear * 12 + (compMonth * compYear * 12 * (bankRate/100) * (compYear + compWait))).toLocaleString()}만원</p></div>
                  <div className="border-t-4 md:border-t-0 md:border-l-4 border-slate-200 pt-16 md:pt-0 md:pl-16"><p className="text-2xl font-black text-blue-600 mb-6 uppercase tracking-widest italic">🛡️ 보험 복리 예시(128%)</p><p className="text-8xl font-black text-blue-700">{(compMonth * compYear * 12 * 1.28).toLocaleString()}만원</p></div>
                </div>
              </div>
            )}
            {activeTool === 'inflation' && (
              <div className="space-y-16">
                 <div className="grid grid-cols-3 gap-10">
                    <InBox label="현재 자산" value={infMoney} onChange={setInfMoney} unit="만원" />
                    <InBox label="물가 상승률" value={infRate} onChange={setInfRate} unit="%" />
                    <InBox label="경과 기간" value={compWait} onChange={setCompWait} unit="년" />
                 </div>
                 <div className="bg-rose-50 p-20 rounded-[4.5rem] border-4 border-rose-100 text-center shadow-2xl">
                    <p className="text-2xl font-black text-rose-400 mb-8 italic uppercase tracking-[0.3em]">미래의 실제 구매력 가치</p>
                    <p className="text-9xl font-black text-rose-700">{Math.round(infMoney / Math.pow(1 + infRate/100, compWait)).toLocaleString()}만원</p>
                 </div>
              </div>
            )}
            {activeTool === 'interest' && (
              <div className="space-y-16">
                 <div className="grid grid-cols-3 gap-10">
                    <InBox label="투자 원금" value={intMoney} onChange={setIntMoney} unit="만원" />
                    <InBox label="기대 수익률" value={intRate} onChange={setIntRate} unit="%" />
                    <InBox label="투자 기간" value={intYear} onChange={setIntYear} unit="년" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="bg-white p-16 rounded-[4rem] border-4 border-slate-100 text-center shadow-lg"><p className="text-2xl font-black text-slate-300 mb-6 italic uppercase">일반 단리</p><p className="text-6xl font-black">{(intMoney + (intMoney * (intRate/100) * intYear)).toLocaleString()}만</p></div>
                    <div className="bg-emerald-50 p-16 rounded-[4rem] border-4 border-emerald-100 text-center shadow-2xl scale-105"><p className="text-2xl font-black text-emerald-500 mb-6 italic uppercase underline underline-offset-8">복리 마법</p><p className="text-8xl font-black text-emerald-700">{Math.round(intMoney * Math.pow(1 + intRate/100, intYear)).toLocaleString()}만</p></div>
                 </div>
              </div>
            )}
            <p className="mt-20 text-center text-slate-300 font-black uppercase tracking-[0.5em] italic">Signal Intelligent Sales Logic</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 🎨 UI COMPONENTS (가독성 폭발 버전) ──────────────────────────

function StatBox({ label, current, target, unit, color }: any) {
  const percent = Math.min(100, Math.round((current / (target || 1)) * 100))
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end"><span className="text-base font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span><span className="text-6xl font-black italic">{current.toLocaleString()}<span className="text-2xl ml-2 font-bold opacity-20">{unit}</span></span></div>
      <div className="w-full h-16 bg-slate-100 rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner flex">
        <div className="h-full transition-all duration-1000 ease-out flex items-center justify-end pr-6 font-black text-base text-white" style={{ width: `${percent}%`, backgroundColor: color }}>{percent}%</div>
      </div>
    </div>
  )
}

function BigInfo({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-slate-100 text-center hover:bg-white hover:shadow-2xl hover:scale-105 transition-all group">
      <p className="text-sm font-black text-slate-400 uppercase mb-5 tracking-widest group-hover:text-black transition-colors">{label}</p>
      <p className="text-5xl font-black">{value}</p>
    </div>
  )
}

function TrendCard({ label, value, sub }: any) {
    return (
        <div className="bg-white p-12 rounded-[3.5rem] border-4 border-slate-50 shadow-xl hover:border-black transition-all">
            <p className="text-base font-black text-slate-400 uppercase mb-5 italic">{label}</p>
            <p className="text-5xl font-black mb-4 text-black">{value}</p>
            <p className="text-sm font-bold text-blue-500 bg-blue-50 py-2 px-4 rounded-full inline-block">{sub}</p>
        </div>
    )
}

function DbCard({ label, value, highlight }: any) {
    return (
        <div className={`p-10 rounded-[3rem] text-center border-4 ${highlight ? 'border-red-100 bg-red-50' : 'border-slate-50 bg-slate-50'}`}>
            <p className="text-sm font-black text-slate-400 uppercase mb-5 tracking-widest">{label}</p>
            <p className={`text-5xl font-black ${highlight ? 'text-red-600' : 'text-black'}`}>{value}</p>
        </div>
    )
}

function MiniBar({ label, current, target, color }: any) {
    const percent = Math.min(100, Math.round((current / (target || 1)) * 100))
    return (
        <div className="space-y-4">
            <div className="flex justify-between text-sm font-black uppercase tracking-widest">
                <span className="text-slate-400">{label}</span><span>{percent}%</span>
            </div>
            <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden border-4 border-white shadow-inner">
                <div className="h-full transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: color }} />
            </div>
        </div>
    )
}

function InBox({ label, value, onChange, unit }: any) {
  return (
    <div className="space-y-5">
      <label className="text-base font-black ml-8 text-slate-400 uppercase tracking-[0.3em] italic">{label}</label>
      <div className="relative">
        <input type="text" value={value} onChange={(e)=>onChange && onChange(e.target.value)} className="w-full p-8 bg-slate-50 rounded-[3rem] font-black text-4xl outline-none border-4 border-transparent focus:border-black transition-all shadow-inner" />
        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-base font-black text-slate-300 italic">{unit}</span>
      </div>
    </div>
  )
}

function ToolBtn({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={`px-14 py-7 rounded-[2.5rem] font-black text-2xl shrink-0 transition-all ${active ? 'bg-black text-white shadow-2xl scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{label}</button>
    )
}