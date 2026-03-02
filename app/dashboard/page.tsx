"use client"

import React, { useEffect, useState } from "react"
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
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)

  // 관리자 모드 전용 탭 상태
  const [adminSideTab, setAdminSideTab] = useState<'activity' | 'performance'>('activity')
  const [adminMainTab, setAdminMainTab] = useState<'perf' | 'act' | 'edu' | 'setting'>('perf')

  // [기존 실적 데이터 상태]
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

  // 계산기 상태
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [calc, setCalc] = useState({
    compMonth: 50, compYear: 5, compWait: 5, bankRate: 2,
    infMoney: 100, infRate: 3, intMoney: 1000, intRate: 5, intYear: 20
  })

  // 관리자 데이터
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1
  const todayDate = new Date().getDate()

  // ─── 🔄 [EFFECTS & LOGIC] ──────────────────────────

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (userId) fetchDailyData(selectedDate) }, [selectedDate, userId])

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => { setIsExitModalOpen(true); window.history.pushState(null, "", window.location.href); };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) { await supabase.auth.signOut(); return router.replace("/login") }
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
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

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  async function fetchAgentData(id: string) {
    const { data: t } = await supabase.from("monthly_targets").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    const { data: p } = await supabase.from("performances").select("*").eq("user_id", id).eq("year", currentYear).eq("month", currentMonth).maybeSingle()
    if (t) { setGoal(t.target_count || 0); setTargetAmount(t.target_amount || 0); setIsApproved(t.status === 'approved') }
    if (p) { setAp(p.ap || 0); setPt(p.pt || 0); setContract(p.contract_count || 0); setContractAmount(p.contract_amount || 0); setCalls(p.call_count || 0); setMeets(p.meet_count || 0); setIntros(p.intro_count || 0); setRecruits(p.recruit_count || 0); setDbAssigned(p.db_assigned || 0); setDbReturned(p.db_returned || 0) }
  }

  const handleAgentSave = async () => {
    const payloadT = { user_id: userId, year: currentYear, month: currentMonth, target_count: Number(goal), target_amount: Number(targetAmount), status: isApproved ? 'approved' : 'pending' }
    const payloadP = { user_id: userId, year: currentYear, month: currentMonth, ap: Number(ap), pt: Number(pt), contract_count: Number(contract), contract_amount: Number(contractAmount), call_count: Number(calls), meet_count: Number(meets), intro_count: Number(intros), recruit_count: Number(recruits), db_assigned: Number(dbAssigned), db_returned: Number(dbReturned) }
    await supabase.from("monthly_targets").upsert(payloadT, { onConflict: 'user_id, year, month' })
    await supabase.from("performances").upsert(payloadP, { onConflict: 'user_id, year, month' })
    alert("성공적으로 업데이트되었습니다.")
  }

  // 전체 통계 계산 로직 (관리자용)
  const totalStats = agents.reduce((acc, a) => {
    const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
    if (p) {
      acc.calls += (p.call_count || 0); acc.meets += (p.meet_count || 0);
      acc.pts += (p.pt || 0); acc.intros += (p.intro_count || 0);
      acc.dbIn += (p.db_assigned || 0); acc.dbOut += (p.db_returned || 0);
      acc.contracts += (p.contract_count || 0); acc.amounts += (p.contract_amount || 0);
    }
    return acc;
  }, { calls: 0, meets: 0, pts: 0, intros: 0, dbIn: 0, dbOut: 0, contracts: 0, amounts: 0 });

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 italic animate-pulse">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📱 모바일 헤더 */}
      <div className="lg:hidden bg-white border-b px-5 py-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <h1 className="text-xl font-black italic tracking-tighter">SIGNAL</h1>
        <div className="flex gap-2">
            <button onClick={() => setIsBizToolOpen(true)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">Biz Tool</button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-black text-[#d4af37] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Menu</button>
        </div>
      </div>

      {/* ─── 📟 사이드바 (관리자 기능 통합) ─────────────────── */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-80 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 overflow-y-auto shadow-2xl lg:shadow-none`}>
        <div className="flex justify-between items-center">
            <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase">History</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-2xl">✕</button>
        </div>
        
        <div className="hidden lg:block border rounded-3xl overflow-hidden shadow-inner bg-slate-50 p-2 scale-90 origin-top">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full bg-transparent" />
        </div>

        {/* [추가] 관리자 사이드바 2개 탭 (활동/실적) */}
        {(role === 'admin' || role === 'master') && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setAdminSideTab('activity')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${adminSideTab==='activity'?'bg-white shadow-sm':'text-slate-400'}`}>활동관리</button>
              <button onClick={() => setAdminSideTab('performance')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${adminSideTab==='performance'?'bg-white shadow-sm':'text-slate-400'}`}>실적관리</button>
            </div>
            <div className="px-2 space-y-2">
              {adminSideTab === 'activity' ? (
                <>
                  <StatMini label="전체 전화" val={totalStats.calls} />
                  <StatMini label="전체 만남" val={totalStats.meets} />
                  <StatMini label="전체 제안" val={totalStats.pts} />
                  <StatMini label="DB 배정/반품" val={`${totalStats.dbIn}/${totalStats.dbOut}`} />
                </>
              ) : (
                <>
                  <StatMini label="전체 건수" val={totalStats.contracts} />
                  <StatMini label="전체 금액" val={`${totalStats.amounts}만`} />
                  <p className="text-[9px] font-bold text-emerald-600 text-center mt-2">최근 3개월 대비 12% 상승</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
            <MemoBox label="ADMIN NOTICE" value={dailySpecialNote} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setDailySpecialNote(e.target.value)} readOnly={role === 'agent'} color="bg-blue-50" />
            <MemoBox label="PERSONAL MEMO" value={personalMemo} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setPersonalMemo(e.target.value)} color="bg-slate-50" />
            <button onClick={handleAgentSave} className="w-full bg-black text-[#d4af37] py-5 rounded-[1.5rem] font-black text-sm uppercase shadow-xl active:scale-95 transition-all tracking-widest">Update Signal</button>
        </div>
      </aside>

      {/* ─── 💎 메인 섹션 ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-x-hidden">
        
        <section className="max-w-6xl mx-auto grid grid-cols-3 gap-2 lg:gap-4">
            <QuickLink label="메타온" href="https://metaon.metarich.co.kr" />
            <QuickLink label="보험사" href="#" onClick={() => alert('보험사 링크 준비 중')} />
            <QuickLink label="자료실" href="#" onClick={() => alert('자료실 링크 준비 중')} />
        </section>

        <div className="max-w-6xl mx-auto space-y-8">
          <header className="bg-white p-6 lg:p-10 rounded-[2.5rem] shadow-sm border flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{userName} CA Dashboard</p>
              <h1 className="text-2xl lg:text-3xl font-black">{currentMonth}월 실적 현황</h1>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-5 py-2.5 border rounded-2xl text-[10px] font-black text-slate-400 hover:text-red-500 transition-all uppercase">Logout</button>
          </header>

          {/* [추가] 관리자 4개 탭 헤더 (관리자/마스터 전용) */}
          {(role === "admin" || role === "master") && (
            <div className="bg-white p-2 rounded-[2rem] border flex gap-1 shadow-sm">
                <TabBtn active={adminMainTab==='perf'} onClick={()=>setAdminMainTab('perf')} label="실적관리" />
                <TabBtn active={adminMainTab==='act'} onClick={()=>setAdminMainTab('act')} label="활동관리" />
                <TabBtn active={adminMainTab==='edu'} onClick={()=>setAdminMainTab('edu')} label="교육관리" />
                <TabBtn active={adminMainTab==='setting'} onClick={()=>setAdminMainTab('setting')} label="목표설정" />
            </div>
          )}

          {/* 직원 전용 화면 또는 관리자 요약 화면 */}
          {(role === "agent" || (role === "master" && !selectedAgent)) && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <ActivityBtn label="📞 CALL" val={calls} set={setCalls} bg="bg-emerald-50" text="text-emerald-700" />
                <ActivityBtn label="🤝 MEET" val={meets} set={setMeets} bg="bg-amber-50" text="text-amber-700" />
                <ActivityBtn label="📝 PT" val={pt} set={setPt} bg="bg-indigo-50" text="text-indigo-700" />
                <ActivityBtn label="🎁 INTRO" val={intros} set={setIntros} bg="bg-rose-50" text="text-rose-700" />
                <ActivityBtn label="📥 DB IN" val={dbAssigned} set={setDbAssigned} bg="bg-sky-50" text="text-sky-700" />
                <ActivityBtn label="📤 DB OUT" val={dbReturned} set={setDbReturned} bg="bg-slate-200" text="text-slate-700" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white p-8 lg:p-12 rounded-[3rem] border shadow-sm space-y-6">
                  <h3 className="text-lg font-black italic border-l-8 border-black pl-4 uppercase">Target Settings</h3>
                  <InputCard label="목표 건수" val={goal} set={setGoal} unit="건" disabled={isApproved} />
                  <InputCard label="목표 금액" val={targetAmount} set={setTargetAmount} unit="만" disabled={isApproved} />
                  <InputCard label="도입 실적" val={recruits} set={setRecruits} unit="명" isSpecial />
                </section>
                <section className="bg-white p-8 lg:p-12 rounded-[3rem] border shadow-sm space-y-6">
                  <h3 className="text-lg font-black italic border-l-8 border-[#d4af37] pl-4 uppercase">Real Performance</h3>
                  <InputCard label="완료 건수" val={contract} set={setContract} unit="건" isDark />
                  <InputCard label="완료 금액" val={contractAmount} set={setContractAmount} unit="만" isDark />
                  <InputCard label="상담 횟수" val={ap} set={setAp} unit="회" isDark />
                </section>
              </div>
            </div>
          )}

          {/* 관리자: 직원 모니터링 (부진자 깜빡임 효과 포함) */}
          {(role === "admin" || role === "master") && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map(a => {
                 const p = a.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
                 const t = a.monthly_targets?.find(mt => mt.year === currentYear && mt.month === currentMonth);
                 
                 // 부진자 판별 (10일 이후 0건 또는 3개월 평균 30만 미만 - 평균은 예시 로직)
                 const isNoPerf = todayDate >= 10 && (!p || (p.contract_count || 0) === 0);
                 const isLowAvg = (p?.contract_amount || 0) < 30; // 단순화된 로직
                 const isWarning = isNoPerf || isLowAvg;

                 return (
                   <div key={a.id} onClick={() => setSelectedAgent(a)} 
                    className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer shadow-sm group 
                      ${isWarning ? 'animate-pulse border-rose-500 bg-rose-50 shadow-rose-100' : 'hover:border-black'}`}>
                     <div className="flex justify-between items-start mb-6">
                        <p className="font-black text-xl underline underline-offset-8 decoration-[#d4af37] decoration-4 uppercase">{a.name} CA</p>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400">목표: {t?.target_count || 0}건 / {t?.target_amount || 0}만</p>
                            <p className="text-[10px] font-black text-emerald-600 mt-1">C:{p?.call_count || 0} / M:{p?.meet_count || 0}</p>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <MiniProgress label="체결" val={p?.contract_count || 0} max={t?.target_count || 10} color="bg-black" />
                        <MiniProgress label="금액" val={p?.contract_amount || 0} max={t?.target_amount || 300} color="bg-[#d4af37]" />
                     </div>
                   </div>
                 )
              })}
            </div>
          )}
        </div>
      </main>

      {/* 🧱 [MODALS] */}
      {/* 비즈니스 계산기 */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-6 lg:p-10 relative overflow-y-auto max-h-[90vh]">
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
                     <CalcIn label="월 납입" val={calc.compMonth} set={(v: number)=>setCalc({...calc, compMonth:v})} unit="만" />
                     <CalcIn label="납입년수" val={calc.compYear} set={(v: number)=>setCalc({...calc, compYear:v})} unit="년" />
                     <CalcIn label="거치년수" val={calc.compWait} set={(v: number)=>setCalc({...calc, compWait:v})} unit="년" />
                     <CalcIn label="은행금리" val={calc.bankRate} set={(v: number)=>setCalc({...calc, bankRate:v})} unit="%" />
                  </div>
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] text-center space-y-6 border-b-8 border-[#d4af37]">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">은행 총 수령액 (단리)</p>
                        <p className="text-3xl font-black text-white">{(calc.compMonth * calc.compYear * 12 + (calc.compMonth * calc.compYear * 12 * (calc.bankRate/100) * (calc.compYear + calc.compWait))).toLocaleString()}만원</p>
                    </div>
                    <div className="pt-6 border-t border-slate-700">
                        <p className="text-[10px] font-black text-[#d4af37] uppercase mb-1">보험 예상액 (124% 가정)</p>
                        <p className="text-3xl font-black text-[#d4af37]">{(calc.compMonth * calc.compYear * 12 * 1.24).toLocaleString()}만원</p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* 직원 클릭 상세 코칭 모달 (관리자용) */}
      {selectedAgent && (role === 'admin' || role === 'master') && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[600] flex justify-end">
            <div className="bg-white w-full max-w-xl h-full p-8 lg:p-12 overflow-y-auto animate-in slide-in-from-right duration-300">
                <button onClick={() => setSelectedAgent(null)} className="mb-8 font-black text-xs uppercase underline">← Close Dashboard</button>
                <header className="mb-10">
                    <h2 className="text-4xl font-black italic border-b-8 border-black inline-block mb-2 uppercase">{selectedAgent.name} Report</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Detail Performance & Coaching Point</p>
                </header>
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-[3rem] border-b-8 border-[#d4af37]">
                        <p className="text-[#d4af37] text-xs font-black mb-4 uppercase italic tracking-widest">Coaching Analysis</p>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p><span className="text-emerald-400 font-black">✓ 개선:</span> 전월 대비 상담 횟수가 안정화되었습니다.</p>
                            <p><span className="text-rose-400 font-black">! 보완:</span> 전화 대비 만남 전환율이 15%로 낮습니다. 도입부 화법 점검이 필요합니다.</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedAgent(null)} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase">Close</button>
                </div>
            </div>
        </div>
      )}

      {isExitModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl text-center">
            <h3 className="text-xl font-black italic uppercase mb-2">Exit?</h3>
            <p className="text-xs font-bold text-slate-400 mb-8">어플리케이션을 종료하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsExitModalOpen(false)} className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase">취소</button>
              <button onClick={() => { setIsExitModalOpen(false); router.push("/login"); }} className="flex-1 bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase">종료</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px; }
      `}</style>
    </div>
  )
}

// ─── 📦 [REUSABLE COMPONENTS] ──────────────────────────

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button onClick={onClick} className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase transition-all ${active?'bg-black text-white shadow-lg':'text-slate-400'}`}>
            {label}
        </button>
    )
}

function StatMini({ label, val }: { label: string; val: any }) {
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
            <span className="text-xs font-black">{val}</span>
        </div>
    )
}

function QuickLink({ label, href, onClick }: { label: string; href: string; onClick?: () => void }) {
    return (
        <a href={href} target={href !== "#" ? "_blank" : undefined} onClick={onClick} 
           className="bg-white border-2 border-slate-900 text-center py-4 rounded-2xl font-black text-[11px] lg:text-sm shadow-sm hover:bg-black hover:text-[#d4af37] transition-all uppercase tracking-tighter">
            {label}
        </a>
    )
}

function ActivityBtn({ label, val, set, bg, text }: { label: string; val: number; set: (v: number) => void; bg: string; text: string }) {
  return (
    <div className={`${bg} ${text} p-4 lg:p-5 rounded-[1.8rem] text-center shadow-sm active:scale-90 transition-transform cursor-pointer border-2 border-transparent`}>
      <p className="text-[9px] font-black uppercase mb-1 opacity-60 tracking-tighter">{label}</p>
      <input type="number" value={val} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set(Number(e.target.value))} className="w-full bg-transparent text-center text-2xl font-black outline-none leading-none" />
    </div>
  )
}

function InputCard({ label, val, set, unit, disabled, isDark, isSpecial }: { label: string; val: number; set: (v: number) => void; unit: string; disabled?: boolean; isDark?: boolean; isSpecial?: boolean }) {
  return (
    <div className="w-full">
      <label className="text-[9px] font-black ml-4 uppercase text-slate-400 tracking-widest mb-1.5 block">{label}</label>
      <div className="relative">
        <input disabled={disabled} type="number" value={val} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set(Number(e.target.value))} 
          className={`w-full p-4 lg:p-6 rounded-[2rem] font-black text-2xl outline-none border-2 transition-all 
            ${disabled ? 'bg-slate-50 text-slate-300 border-transparent' : 
              isDark ? 'bg-slate-900 text-[#d4af37] border-slate-900' : 
              isSpecial ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-white border-slate-100 focus:border-black'}`} />
        <span className={`absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-300'}`}>{unit}</span>
      </div>
    </div>
  )
}

function MemoBox({ label, value, onChange, readOnly, color }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; readOnly?: boolean; color: string }) {
  return (
    <div className={`${color} p-5 rounded-2xl border`}>
        <p className="text-[9px] font-black text-slate-400 mb-2 uppercase italic tracking-widest">{label}</p>
        <textarea readOnly={readOnly} value={value} onChange={onChange} className="w-full bg-transparent text-xs font-bold outline-none resize-none h-24 text-slate-700 leading-relaxed" placeholder="..." />
    </div>
  )
}

function CalcIn({ label, val, set, unit }: { label: string; val: number; set: (v: number) => void; unit: string }) {
  return (
    <div className="bg-slate-50 p-3 rounded-2xl border">
      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <input type="number" value={val} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>set(Number(e.target.value))} className="w-full bg-transparent text-lg font-black outline-none" />
        <span className="text-[9px] font-bold text-slate-300">{unit}</span>
      </div>
    </div>
  )
}

function MiniProgress({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const rate = Math.min((val / (max || 1)) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[9px] font-black mb-1.5 uppercase tracking-tighter">
        <span className="text-slate-400">{label}</span>
        <span>{val} / {max}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}