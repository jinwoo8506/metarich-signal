"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 🛡️ [TYPE DEFINITIONS] ──────────────────────────
interface Performance {
  year: number; month: number;
  contract_count: number; contract_amount: number;
  ap: number; pt: number; call_count: number;
  meet_count: number; intro_count: number;
  recruit_count: number; db_assigned: number; db_returned: number;
}
interface MonthlyTarget {
  year: number; month: number;
  target_count: number; target_amount: number; target_recruit: number;
  status: string;
}
interface Agent {
  id: string; name: string;
  monthly_targets: MonthlyTarget[];
  performances: Performance[];
}

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 기본 상태
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)
  
  // 관리자 모드 탭 제어
  const [adminSideTab, setAdminSideTab] = useState<'activity' | 'performance'>('activity')
  const [adminMainTab, setAdminMainTab] = useState<'perf' | 'act' | 'edu' | 'setting'>('perf')

  // 데이터 상태
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 5000, recruit: 10 })

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth() + 1
  const todayDate = new Date().getDate()

  // ─── 🔄 [LOGIC] ──────────────────────────

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    if (userInfo.role === "admin" || userInfo.role === "master") fetchAdminData()
    setLoading(false)
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  // 실적 부진/경고 판별 함수
  const getAgentStatus = (agent: Agent) => {
    const p = agent.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
    const recent3Months = agent.performances?.slice(-3);
    const avgAmount = recent3Months && recent3Months.length > 0 
      ? recent3Months.reduce((sum, curr) => sum + (curr.contract_amount || 0), 0) / recent3Months.length 
      : 0;

    const isNoPerformanceAfter10th = todayDate >= 10 && (!p || (p.contract_count || 0) === 0);
    const isLowAverage = avgAmount < 30;

    return { isNoPerformanceAfter10th, isLowAverage, avgAmount };
  }

  const totalStats = agents.reduce((acc, agent) => {
    const p = agent.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
    if (p) {
      acc.calls += (p.call_count || 0); acc.meets += (p.meet_count || 0);
      acc.pts += (p.pt || 0); acc.intros += (p.intro_count || 0);
      acc.dbIn += (p.db_assigned || 0); acc.dbOut += (p.db_returned || 0);
      acc.contracts += (p.contract_count || 0); acc.amounts += (p.contract_amount || 0);
    }
    return acc;
  }, { calls: 0, meets: 0, pts: 0, intros: 0, dbIn: 0, dbOut: 0, contracts: 0, amounts: 0 });

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic animate-pulse">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📱 모바일 헤더 */}
      <div className="lg:hidden bg-white border-b px-5 py-4 flex justify-between items-center sticky top-0 z-[100]">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">Signal Admin</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-black text-[#d4af37] px-4 py-2 rounded-xl text-[10px] font-black uppercase">Admin Panel</button>
      </div>

      {/* ─── 📟 사이드바 (관리 전용) ─────────────────── */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-85 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 shadow-2xl lg:shadow-none`}>
        <div className="flex justify-between items-center">
            <h2 className="font-black text-2xl italic tracking-tighter">COACHING BOX</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">✕</button>
        </div>
        
        <div className="hidden lg:block border rounded-3xl bg-slate-50 p-2 scale-90 origin-top shadow-inner">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full bg-transparent" />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setAdminSideTab('activity')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${adminSideTab==='activity'?'bg-white shadow-sm':'text-slate-400'}`}>활동관리</button>
            <button onClick={() => setAdminSideTab('performance')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${adminSideTab==='performance'?'bg-white shadow-sm':'text-slate-400'}`}>실적관리</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
            {adminSideTab === 'activity' ? (
                <div className="space-y-3">
                    <StatRow label="전체 전화" val={totalStats.calls} unit="건" />
                    <StatRow label="전체 만남" val={totalStats.meets} unit="건" />
                    <StatRow label="전체 제안" val={totalStats.pts} unit="건" />
                    <StatRow label="전체 소개" val={totalStats.intros} unit="건" />
                    <div className="h-px bg-slate-100 my-4" />
                    <StatRow label="DB 배정" val={totalStats.dbIn} unit="건" color="text-blue-600" />
                    <StatRow label="DB 반품" val={totalStats.dbOut} unit="건" color="text-red-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-black p-5 rounded-3xl text-center">
                        <p className="text-[10px] text-[#d4af37] font-black mb-1">팀 전체 달성액</p>
                        <p className="text-2xl font-black text-white">{totalStats.amounts.toLocaleString()}만원</p>
                    </div>
                </div>
            )}
        </div>
      </aside>

      {/* ─── 💎 메인 섹션 (4개 탭) ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6">
        
        <section className="max-w-6xl mx-auto">
            <div className="bg-white p-2 rounded-[2rem] shadow-sm border flex gap-1 mb-8">
                <MainTabBtn active={adminMainTab==='perf'} onClick={()=>setAdminMainTab('perf')} label="실적관리" sub="목표/도입" />
                <MainTabBtn active={adminMainTab==='act'} onClick={()=>setAdminMainTab('act')} label="활동관리" sub="전환율/상세" />
                <MainTabBtn active={adminMainTab==='edu'} onClick={()=>setAdminMainTab('edu')} label="교육관리" sub="인지도체크" />
                <MainTabBtn active={adminMainTab==='setting'} onClick={()=>setAdminMainTab('setting')} label="목표설정" sub="팀관리" />
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {adminMainTab === 'perf' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GoalCard label="팀 목표 금액" val={totalStats.amounts} max={teamGoal.amount} unit="만원" />
                        <GoalCard label="팀 목표 건수" val={totalStats.contracts} max={teamGoal.count} unit="건" />
                        <GoalCard label="팀 도입 목표" val={0} max={teamGoal.recruit} unit="명" />
                    </div>
                )}

                {adminMainTab === 'act' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[3rem] border">
                            <h3 className="text-sm font-black mb-6 uppercase tracking-widest">활동 전환율 통계</h3>
                            <div className="space-y-6">
                                <ProgressLine label="전화 대비 만남 (목표 30%)" val={totalStats.calls ? (totalStats.meets/totalStats.calls)*100 : 0} color="bg-blue-500" />
                                <ProgressLine label="만남 대비 제안 (목표 50%)" val={totalStats.meets ? (totalStats.pts/totalStats.meets)*100 : 0} color="bg-purple-500" />
                            </div>
                        </div>
                    </div>
                )}

                {adminMainTab === 'setting' && (
                    <div className="bg-white p-8 rounded-[3rem] border max-w-2xl">
                        <h3 className="text-sm font-black mb-6 uppercase tracking-widest">팀 목표치 수정</h3>
                        <div className="space-y-4">
                            {/* v: number 타입을 명시하여 빌드 에러 해결 */}
                            <InputBox label="팀 전체 목표 금액" val={teamGoal.amount} onChange={(v: number)=>setTeamGoal({...teamGoal, amount:v})} unit="만원" />
                            <InputBox label="팀 전체 목표 건수" val={teamGoal.count} onChange={(v: number)=>setTeamGoal({...teamGoal, count:v})} unit="건" />
                            <button className="w-full bg-black text-[#d4af37] py-5 rounded-2xl font-black text-xs mt-4 uppercase">Save Changes</button>
                        </div>
                    </div>
                )}
            </div>
        </section>

        {/* ─── 직원 모니터링 (경고 깜빡임 효과 포함) ─── */}
        <section className="max-w-6xl mx-auto mt-12">
            <h2 className="text-2xl font-black italic mb-6 border-l-8 border-black pl-4 uppercase">Agent Monitoring</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(agent => {
                    const p = agent.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
                    const { isNoPerformanceAfter10th, isLowAverage } = getAgentStatus(agent);
                    const isWarning = isNoPerformanceAfter10th || isLowAverage;

                    return (
                        <div key={agent.id} onClick={() => setSelectedAgent(agent)} 
                            className={`bg-white p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group shadow-sm 
                            ${isWarning ? 'border-rose-500 animate-pulse bg-rose-50 shadow-rose-100' : 'hover:border-black'}`}>
                            
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="font-black text-xl group-hover:underline uppercase">{agent.name} CA</p>
                                    {isWarning && (
                                        <p className="text-[9px] font-black text-rose-600 uppercase mt-1">
                                            {isNoPerformanceAfter10th ? "⚠️ 10일 이후 무실적" : "⚠️ 3개월 평균 30만 미만"}
                                        </p>
                                    )}
                                </div>
                                <span className="bg-white text-[9px] font-black px-3 py-1.5 rounded-full border">COACHING</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/60 p-3 rounded-2xl text-center border">
                                    <p className="text-[9px] font-black text-slate-400 mb-1">CALL</p>
                                    <p className="text-lg font-black">{p?.call_count || 0}</p>
                                </div>
                                <div className="bg-white/60 p-3 rounded-2xl text-center border">
                                    <p className="text-[9px] font-black text-slate-400 mb-1">MEET</p>
                                    <p className="text-lg font-black">{p?.meet_count || 0}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
      </main>

      {/* ─── 직원 코칭 상세 리포트 ─── */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex justify-end">
            <div className="bg-white w-full max-w-2xl h-full p-8 lg:p-12 overflow-y-auto animate-in slide-in-from-right duration-300">
                <button onClick={() => setSelectedAgent(null)} className="mb-8 font-black text-xs uppercase underline tracking-widest">← Back to Dashboard</button>
                
                <header className="mb-10">
                    <h2 className="text-4xl font-black italic border-b-8 border-black inline-block mb-2 uppercase">{selectedAgent.name} CA</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Detail Performance & Coaching Guide</p>
                </header>

                <div className="space-y-8">
                    {/* 실적 분석 섹션 */}
                    <div className="grid grid-cols-2 gap-4">
                        <CompareCard label="당월 체결액" current={selectedAgent.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth)?.contract_amount || 0} prev={300} unit="만" />
                        <CompareCard label="상담 AP 건수" current={selectedAgent.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth)?.ap || 0} prev={10} unit="회" />
                    </div>

                    {/* 자동 생성 코칭 카드 */}
                    <div className="bg-slate-900 text-white p-8 rounded-[3rem] border-b-8 border-[#d4af37]">
                        <p className="text-[#d4af37] text-xs font-black mb-6 uppercase italic">Analysis Report</p>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 mb-2 uppercase">Good Point</p>
                                <p className="text-sm font-medium leading-relaxed">상담 대비 체결 전환율이 팀 평균보다 15% 높습니다. 제안 내용의 질이 매우 우수합니다.</p>
                            </div>
                            <div className="h-px bg-slate-800" />
                            <div>
                                <p className="text-[10px] font-black text-rose-400 mb-2 uppercase">Weak Point</p>
                                <p className="text-sm font-medium leading-relaxed">활동 초기(Call) 단계가 저조합니다. 활동량 부족이 향후 실적 절벽으로 이어질 수 있으니 즉시 CALL 보강이 필요합니다.</p>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setSelectedAgent(null)} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase">Close Report</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}

// ─── 📦 [UI COMPONENTS] ──────────────────────────

function StatRow({ label, val, unit, color = "text-slate-900" }: any) {
    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
            <span className={`text-sm font-black ${color}`}>{val.toLocaleString()}{unit}</span>
        </div>
    )
}

function MainTabBtn({ active, onClick, label, sub }: any) {
    return (
        <button onClick={onClick} className={`flex-1 py-4 rounded-2xl transition-all ${active?'bg-black text-white shadow-xl':'text-slate-400 hover:bg-slate-50'}`}>
            <p className="text-[11px] font-black uppercase">{label}</p>
            <p className="text-[8px] font-bold uppercase opacity-50">{sub}</p>
        </button>
    )
}

function GoalCard({ label, val, max, unit }: any) {
    const rate = Math.min((val / (max || 1)) * 100, 100);
    return (
        <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</p>
            <p className="text-2xl font-black mb-4">{val.toLocaleString()}<span className="text-xs text-slate-300 ml-1">/ {max.toLocaleString()}{unit}</span></p>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-black transition-all duration-1000" style={{ width: `${rate}%` }} />
            </div>
        </div>
    )
}

function ProgressLine({ label, val, color }: any) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase">
                <span>{label}</span>
                <span>{val.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${val}%` }} />
            </div>
        </div>
    )
}

function InputBox({ label, val, onChange, unit }: { label: string; val: number; onChange: (v: number) => void; unit: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black ml-4 text-slate-400 uppercase tracking-widest">{label}</label>
            <div className="relative">
                <input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-black p-4 rounded-2xl font-black outline-none" />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">{unit}</span>
            </div>
        </div>
    )
}

function CompareCard({ label, current, prev, unit }: any) {
    const diff = current - prev;
    return (
        <div className="bg-slate-50 p-5 rounded-2xl border">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">{label}</p>
            <div className="flex justify-between items-end">
                <p className="text-xl font-black">{current.toLocaleString()}{unit}</p>
                <p className={`text-[10px] font-black ${diff >= 0 ? 'text-emerald-500':'text-rose-500'}`}>
                    {diff >= 0 ? '▲':'▼'} {Math.abs(diff).toLocaleString()}
                </p>
            </div>
        </div>
    )
}