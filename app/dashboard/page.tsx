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

  // 공통 상태 및 모달 제어
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false) // 뒤로가기 종료 모달

  // 실적 데이터 상태 (기존 page533 데이터 구조 유지)
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

  // 팀 목표 및 관리자 상태
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  // 비즈니스 툴(계산기) 상태
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [calc, setCalc] = useState({
    compMonth: 50, compYear: 5, compWait: 5, bankRate: 2,
    infMoney: 100, infRate: 3, intMoney: 1000, intRate: 5, intYear: 20
  })

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1

  // ─── 🔄 [EFFECTS & LOGIC] ──────────────────────────

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  // [추가] 뒤로가기 종료 방지 로직
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      setIsExitModalOpen(true);
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
    const { data: note } = await supabase.from("daily_notes").select("admin_notice").eq("date", dateStr).maybeSingle()
    const { data: myMemo } = await supabase.from("daily_notes").select("agent_memo").eq("user_id", userId).eq("date", dateStr).maybeSingle()
    setDailySpecialNote(note?.admin_notice || ""); setPersonalMemo(myMemo?.agent_memo || "")
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
    const payloadT = { user_id: userId, year: currentYear, month: currentMonth, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year: currentYear, month: currentMonth, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("데이터 저장 완료")
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-2xl italic animate-pulse">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📱 모바일 네비게이션 헤더 */}
      <div className="lg:hidden bg-white border-b px-5 py-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <h1 className="text-xl font-black italic tracking-tighter">SIGNAL</h1>
        <div className="flex gap-2">
            <button onClick={() => setIsBizToolOpen(true)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Biz Tool</button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-black text-[#d4af37] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Menu</button>
        </div>
      </div>

      {/* ─── 📟 사이드바 (달력 모바일 제거) ─────────────────── */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-80 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 overflow-y-auto shadow-2xl lg:shadow-none`}>
        <div className="flex justify-between items-center">
            <h2 className="font-black text-2xl italic border-b-4 border-black pb-1">HISTORY</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-2xl">✕</button>
        </div>
        
        {/* 모바일에서는 달력을 숨기고 데스크탑에서만 노출 */}
        <div className="hidden lg:block calendar-wrapper border rounded-3xl overflow-hidden shadow-inner bg-slate-50 p-2 scale-90 origin-top">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full bg-transparent" />
        </div>

        <div className="space-y-4">
            <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} onChange={(e)=>setDailySpecialNote(e.target.value)} readOnly={role === 'agent'} color="bg-blue-50" />
            <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
            <button onClick={handleAgentSave} className="w-full bg-black text-[#d4af37] py-5 rounded-[1.5rem] font-black text-sm uppercase shadow-xl active:scale-95 transition-all">Update Signal</button>
        </div>
      </aside>

      {/* ─── 💎 메인 섹션 ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6">
        
        {/* 🔗 상단 퀵 링크 버튼 (메타온, 보험사, 자료실) */}
        <section className="max-w-6xl mx-auto grid grid-cols-3 gap-2 lg:gap-4 animate-in fade-in duration-500">
            <QuickLink label="메타온" href="https://metaon.metarich.co.kr" />
            <QuickLink label="보험사" href="#" onClick={() => alert('보험사 링크 준비 중')} />
            <QuickLink label="자료실" href="#" onClick={() => alert('자료실 링크 준비 중')} />
        </section>

        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* 유저 헤더 */}
          <header className="bg-white p-6 lg:p-10 rounded-[2.5rem] shadow-sm border flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{role} Auth</p>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{userName}님 <span className="text-slate-200">|</span> {currentMonth}월 실적</h1>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-6 py-3 border rounded-2xl text-[10px] font-black text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all uppercase">Logout</button>
          </header>

          {/* 🧑‍💻 직원 전용 화면 (Activity Board) */}
          {(role === "agent" || role === "master") && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
              {/* 활동 수치 입력 그룹 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <ActivityBtn label="📞 CALL" val={calls} set={setCalls} bg="bg-emerald-50" text="text-emerald-700" />
                <ActivityBtn label="🤝 MEET" val={meets} set={setMeets} bg="bg-amber-50" text="text-amber-700" />
                <ActivityBtn label="📝 PT" val={pt} set={setPt} bg="bg-indigo-50" text="text-indigo-700" />
                <ActivityBtn label="🎁 INTRO" val={intros} set={setIntros} bg="bg-rose-50" text="text-rose-700" />
                <ActivityBtn label="📥 DB IN" val={dbAssigned} set={setDbAssigned} bg="bg-sky-50" text="text-sky-700" />
                <ActivityBtn label="📤 DB OUT" val={dbReturned} set={setDbReturned} bg="bg-slate-200" text="text-slate-700" />
              </div>

              {/* 실적 상세 입력 카드 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white p-8 lg:p-12 rounded-[3rem] border shadow-sm space-y-6">
                  <h3 className="text-xl font-black italic border-l-8 border-black pl-4 uppercase tracking-tighter">Target Setting</h3>
                  <InputCard label="목표 건수" val={goal} set={setGoal} unit="건" disabled={isApproved} />
                  <InputCard label="목표 금액" val={targetAmount} set={setTargetAmount} unit="만" disabled={isApproved} />
                  <InputCard label="도입 실적" val={recruits} set={setRecruits} unit="명" isSpecial />
                </section>
                <section className="bg-white p-8 lg:p-12 rounded-[3rem] border shadow-sm space-y-6">
                  <h3 className="text-xl font-black italic border-l-8 border-[#d4af37] pl-4 uppercase tracking-tighter">Current Status</h3>
                  <InputCard label="완료 건수" val={contract} set={setContract} unit="건" isDark />
                  <InputCard label="완료 금액" val={contractAmount} set={setContractAmount} unit="만" isDark />
                  <InputCard label="상담 횟수" val={ap} set={setAp} unit="회" isDark />
                </section>
              </div>
            </div>
          )}

          {/* 👨‍💼 관리자 전용 화면 */}
          {(role === "admin" || role === "master") && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <h2 className="text-2xl font-black italic border-b-4 border-slate-200 pb-2 uppercase tracking-tighter">Agent Monitoring</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                 {agents.map(a => {
                    const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
                    const t = a.monthly_targets?.find(mt => mt.year === currentYear && mt.month === currentMonth);
                    return (
                      <div key={a.id} onClick={() => setSelectedAgent(a)} className="bg-white p-8 rounded-[2.5rem] border hover:border-black transition-all cursor-pointer shadow-sm group">
                        <div className="flex justify-between items-center mb-6">
                          <span className="font-black text-xl underline decoration-[#d4af37] decoration-4 underline-offset-4">{a.name} CA</span>
                          <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase group-hover:bg-black group-hover:text-white transition-colors">Detail</span>
                        </div>
                        <div className="space-y-4">
                           <MiniProgress label="체결 건수" val={p?.contract_count || 0} max={t?.target_count || 10} color="bg-slate-900" />
                           <MiniProgress label="체결 금액" val={p?.contract_amount || 0} max={t?.target_amount || 500} color="bg-[#d4af37]" />
                        </div>
                      </div>
                    )
                 })}
               </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── 🧱 [최적화된 모달 섹션] ─────────────────── */}

      {/* 1. 비즈니스 계산기 모달 */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-6 lg:p-10 relative overflow-y-auto max-h-[90vh] shadow-2xl">
             <button onClick={() => setIsBizToolOpen(false)} className="absolute top-6 right-6 text-2xl font-black">✕</button>
             <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                {['compare', 'inflation', 'interest'].map((t) => (
                  <button key={t} onClick={()=>setActiveTool(t as any)} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-black text-xs transition-all ${activeTool===t?'bg-black text-[#d4af37]':'bg-slate-100 text-slate-400'}`}>
                    {t === 'compare' ? '은행 vs 보험' : t === 'inflation' ? '화폐가치' : '복리마법'}
                  </button>
                ))}
             </div>

             {activeTool === 'compare' && (
               <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <CalcIn label="월 납입" val={calc.compMonth} set={(v)=>setCalc({...calc, compMonth:v})} unit="만" />
                    <CalcIn label="납입년수" val={calc.compYear} set={(v)=>setCalc({...calc, compYear:v})} unit="년" />
                    <CalcIn label="거치년수" val={calc.compWait} set={(v)=>setCalc({...calc, compWait:v})} unit="년" />
                    <CalcIn label="은행금리" val={calc.bankRate} set={(v)=>setCalc({...calc, bankRate:v})} unit="%" />
                 </div>
                 <div className="bg-slate-900 p-8 rounded-[2rem] space-y-6 border-b-8 border-[#d4af37]">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">은행 총 수령액 (단리)</p>
                        <p className="text-3xl lg:text-4xl font-black text-white">{(calc.compMonth * calc.compYear * 12 + (calc.compMonth * calc.compYear * 12 * (calc.bankRate/100) * (calc.compYear + calc.compWait))).toLocaleString()}만원</p>
                    </div>
                    <div className="text-center pt-6 border-t border-slate-700">
                        <p className="text-[10px] font-black text-[#d4af37] uppercase mb-1">보험 예상액 (124% 가정)</p>
                        <p className="text-3xl lg:text-4xl font-black text-[#d4af37]">{(calc.compMonth * calc.compYear * 12 * 1.24).toLocaleString()}만원</p>
                    </div>
                 </div>
               </div>
             )}
             {/* inflation, interest 로직도 calc 상태를 이용해 UI 구성 가능 */}
          </div>
        </div>
      )}

      {/* 2. 뒤로가기 종료 확인 모달 */}
      {isExitModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-3xl">👋</div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase">Exit Signal?</h3>
              <p className="text-xs font-bold text-slate-400 leading-relaxed">어플리케이션을 종료하시겠습니까?</p>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setIsExitModalOpen(false)} className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase">취소</button>
              <button onClick={() => { setIsExitModalOpen(false); router.push("/login"); }} className="flex-1 bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-lg">종료</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 관리자 코칭 모달 (기본 구조 유지) */}
      {selectedAgent && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative border-4 border-black text-slate-900 overflow-y-auto max-h-[90vh]">
                <button onClick={()=>setSelectedAgent(null)} className="absolute top-8 right-8 font-black text-2xl">✕</button>
                <h2 className="text-2xl font-black mb-8 italic uppercase border-b-8 border-black pb-4">{selectedAgent.name} Coaching</h2>
                {/* 기존 코칭 로직 삽입 가능 */}
                <button onClick={() => setSelectedAgent(null)} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-xl mt-10 uppercase">Close Report</button>
            </div>
          </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; font-weight: 900; }
      `}</style>
    </div>
  )
}

// ─── 📦 [UI COMPONENTS LIBRARY] ──────────────────────────

function QuickLink({ label, href, onClick }: any) {
    return (
        <a href={href} target={href !== "#" ? "_blank" : undefined} onClick={onClick} 
           className="bg-white border-2 border-slate-900 text-center py-3.5 lg:py-5 rounded-2xl font-black text-[11px] lg:text-sm shadow-sm hover:bg-slate-900 hover:text-[#d4af37] transition-all uppercase tracking-tighter">
            {label}
        </a>
    )
}

function ActivityBtn({ label, val, set, bg, text }: any) {
  return (
    <div className={`${bg} ${text} p-4 lg:p-5 rounded-[1.8rem] text-center shadow-sm active:scale-90 transition-transform cursor-pointer border-2 border-transparent`}>
      <p className="text-[9px] font-black uppercase mb-1 opacity-60 tracking-tighter">{label}</p>
      <input type="number" value={val} onChange={(e)=>set(Number(e.target.value))} className="w-full bg-transparent text-center text-2xl font-black outline-none leading-none" />
    </div>
  )
}

function InputCard({ label, val, set, unit, disabled, isDark, isSpecial }: any) {
  return (
    <div className="w-full">
      <label className="text-[9px] font-black ml-4 uppercase text-slate-400 tracking-widest mb-1.5 block">{label}</label>
      <div className="relative">
        <input disabled={disabled} type="number" value={val} onChange={(e)=>set(Number(e.target.value))} 
          className={`w-full p-4 lg:p-5 rounded-[1.8rem] font-black text-xl lg:text-2xl outline-none border-2 transition-all 
            ${disabled ? 'bg-slate-50 text-slate-300 border-transparent' : 
              isDark ? 'bg-slate-900 text-[#d4af37] border-slate-900' : 
              isSpecial ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-white border-slate-100 focus:border-black'}`} />
        <span className={`absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-300'}`}>{unit}</span>
      </div>
    </div>
  )
}

function MemoBox({ label, value, onChange, readOnly, color }: any) {
  return (
    <div className={`${color} p-4 lg:p-5 rounded-2xl border`}>
        <p className="text-[9px] font-black text-slate-400 mb-2 uppercase italic tracking-widest">{label}</p>
        <textarea readOnly={readOnly} value={value} onChange={onChange} className="w-full bg-transparent text-xs font-bold outline-none resize-none h-20 text-slate-700 leading-relaxed" placeholder="..." />
    </div>
  )
}

function CalcIn({ label, val, set, unit }: any) {
  return (
    <div className="bg-slate-50 p-3 lg:p-4 rounded-2xl border">
      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <input type="number" value={val} onChange={(e)=>set(Number(e.target.value))} className="w-full bg-transparent text-lg font-black outline-none" />
        <span className="text-[9px] font-bold text-slate-300">{unit}</span>
      </div>
    </div>
  )
}

function MiniProgress({ label, val, max, color }: any) {
  const rate = Math.min((val / (max || 1)) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[9px] font-black mb-1.5 uppercase">
        <span className="text-slate-400 tracking-tighter">{label}</span>
        <span className="text-slate-900">{val} <span className="text-slate-300">/ {max}</span></span>
      </div>
      <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}