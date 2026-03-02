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

  // ─── 🔄 [LOGIC] ──────────────────────────

  useEffect(() => { checkUser() }, [])

  // 뒤로가기 종료 방지
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
    if (!userInfo) return router.replace("/login")
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    if (userInfo.role === "admin" || userInfo.role === "master") fetchAdminData()
    setLoading(false)
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role", "agent")
    if (data) setAgents(data as Agent[])
  }

  // 통계 계산 로직 (전체 직원 합산)
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

      {/* ─── 📟 사이드바 (관리자 코칭 전용) ─────────────────── */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-85 bg-white border-r z-[110] transition-transform duration-300 p-6 flex flex-col gap-6 shadow-2xl lg:shadow-none`}>
        <div className="flex justify-between items-center">
            <h2 className="font-black text-2xl italic tracking-tighter">COACHING BOX</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">✕</button>
        </div>
        
        <div className="hidden lg:block border rounded-3xl overflow-hidden bg-slate-50 p-2 scale-90 origin-top shadow-inner">
            <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} calendarType="gregory" className="border-0 w-full bg-transparent" />
        </div>

        {/* 탭 버튼: 활동관리 vs 실적관리 */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setAdminSideTab('activity')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${adminSideTab==='activity'?'bg-white shadow-sm':'text-slate-400'}`}>활동관리</button>
            <button onClick={() => setAdminSideTab('performance')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${adminSideTab==='performance'?'bg-white shadow-sm':'text-slate-400'}`}>실적관리</button>
        </div>

        {/* 사이드바 탭 내용 */}
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
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                        <p className="text-[10px] font-black text-slate-400">3개월 평균 대비</p>
                        <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-emerald-600">▲ 12.5% 상승</span>
                            <span className="text-[10px] text-slate-300">최근 평균: 4,200만</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </aside>

      {/* ─── 💎 메인 섹션 ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-x-hidden">
        
        {/* 전체 실적관리 4개 탭 헤더 */}
        <section className="max-w-6xl mx-auto">
            <div className="bg-white p-2 rounded-[2rem] shadow-sm border flex gap-1 mb-8">
                <MainTabBtn active={adminMainTab==='perf'} onClick={()=>setAdminMainTab('perf')} label="실적관리" sub="목표/도입" />
                <MainTabBtn active={adminMainTab==='act'} onClick={()=>setAdminMainTab('act')} label="활동관리" sub="전환율/상세" />
                <MainTabBtn active={adminMainTab==='edu'} onClick={()=>setAdminMainTab('edu')} label="교육관리" sub="인지도체크" />
                <MainTabBtn active={adminMainTab==='setting'} onClick={()=>setAdminMainTab('setting')} label="목표설정" sub="팀관리" />
            </div>

            {/* 탭별 본문 내용 */}
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
                        <div className="bg-white p-8 rounded-[3rem] border grid grid-cols-2 gap-4">
                            <ActivityBox label="전화" val={totalStats.calls} />
                            <ActivityBox label="만남" val={totalStats.meets} />
                            <ActivityBox label="제안" val={totalStats.pts} />
                            <ActivityBox label="소개" val={totalStats.intros} />
                        </div>
                    </div>
                )}

                {adminMainTab === 'edu' && (
                    <div className="bg-white p-8 rounded-[3rem] border">
                        <h3 className="text-sm font-black mb-6 uppercase tracking-widest italic">Weekly Education Check</h3>
                        <div className="space-y-3">
                            {['1주차: 상품 비교 분석', '2주차: 가망고객 발굴법', '3주차: 클로징 화법', '4주차: 보상 청구 실무'].map((edu, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <span className="font-bold text-sm">{edu}</span>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">인지도: 85%</span>
                                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[85%]" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {adminMainTab === 'setting' && (
                    <div className="bg-white p-8 rounded-[3rem] border max-w-2xl">
                        <h3 className="text-sm font-black mb-6 uppercase tracking-widest">팀 목표치 수정</h3>
                        <div className="space-y-4">
                            <InputBox label="팀 전체 목표 금액" val={teamGoal.amount} onChange={(v)=>setTeamGoal({...teamGoal, amount:v})} unit="만원" />
                            <InputBox label="팀 전체 목표 건수" val={teamGoal.count} onChange={(v)=>setTeamGoal({...teamGoal, count:v})} unit="건" />
                            <button className="w-full bg-black text-[#d4af37] py-5 rounded-2xl font-black text-xs mt-4">설정 저장하기</button>
                        </div>
                    </div>
                )}
            </div>
        </section>

        {/* 직원 리스트 (전화/미팅 바로 보기 포함) */}
        <section className="max-w-6xl mx-auto mt-12">
            <h2 className="text-2xl font-black italic mb-6 border-l-8 border-black pl-4">AGENT MONITORING</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(agent => {
                    const p = agent.performances?.find(pf => pf.year === currentYear && pf.month === currentMonth);
                    const t = agent.monthly_targets?.find(mt => mt.year === currentYear && mt.month === currentMonth);
                    return (
                        <div key={agent.id} onClick={() => setSelectedAgent(agent)} className="bg-white p-6 rounded-[2.5rem] border hover:border-black transition-all cursor-pointer group shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="font-black text-xl group-hover:underline underline-offset-4">{agent.name} CA</p>
                                    <p className="text-[10px] font-bold text-slate-400">목표: {t?.target_count || 0}건 / {t?.target_amount || 0}만</p>
                                </div>
                                <span className="bg-slate-100 text-[9px] font-black px-3 py-1.5 rounded-full uppercase">Detail</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-emerald-50 p-3 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-emerald-600 mb-1 uppercase">Call</p>
                                    <p className="text-lg font-black text-emerald-700">{p?.call_count || 0}</p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-amber-600 mb-1 uppercase">Meeting</p>
                                    <p className="text-lg font-black text-amber-700">{p?.meet_count || 0}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
      </main>

      {/* ─── 🧱 [AGENTS COACHING MODAL] ─────────────────── */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-end">
            <div className="bg-white w-full max-w-2xl h-full p-8 lg:p-12 overflow-y-auto animate-in slide-in-from-right duration-300">
                <button onClick={() => setSelectedAgent(null)} className="mb-8 font-black text-sm uppercase flex items-center gap-2">← Back to Dashboard</button>
                
                <header className="mb-10">
                    <h2 className="text-4xl font-black italic border-b-8 border-black inline-block mb-2 uppercase">{selectedAgent.name} CA Report</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Performance Analysis & Coaching Point</p>
                </header>

                <div className="space-y-10">
                    {/* 실적 비교 섹션 */}
                    <section>
                        <h3 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-tighter">1. 전월 대비 성과 비교 (최근 3개월)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <CompareCard label="체결 금액" current={250} prev={180} unit="만" />
                            <CompareCard label="활동량(Calls)" current={120} prev={145} unit="건" />
                        </div>
                    </section>

                    {/* 코칭 포인트 자동 생성 섹션 */}
                    <section className="bg-slate-900 text-white p-8 rounded-[3rem] border-b-8 border-[#d4af37]">
                        <h3 className="text-[#d4af37] text-xs font-black mb-6 uppercase tracking-widest">2. Coaching Point</h3>
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-black text-emerald-400 mb-2 uppercase italic">✓ 개선된 부분 (Great Job!)</p>
                                <p className="text-sm font-medium leading-relaxed">전월 대비 상담 금액이 38% 상승했습니다. 특히 고단가 제안(PT)의 성공률이 높아진 것이 주요 요인으로 분석됩니다.</p>
                            </div>
                            <div className="h-px bg-slate-800" />
                            <div>
                                <p className="text-xs font-black text-rose-400 mb-2 uppercase italic">! 보완이 필요한 부분 (Action Item)</p>
                                <p className="text-sm font-medium leading-relaxed">전체적인 Call 양이 전월 대비 17% 감소했습니다. 신규 DB 배정 대비 첫 통화 시점이 늦어지고 있으니 활동 스케줄을 재점검하십시오.</p>
                            </div>
                        </div>
                    </section>

                    <button onClick={() => setSelectedAgent(null)} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg uppercase shadow-xl active:scale-95 transition-all">Report Close</button>
                </div>
            </div>
        </div>
      )}

      {/* 뒤로가기 종료 모달 */}
      {isExitModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl text-center">
            <h3 className="text-xl font-black italic uppercase mb-2">Exit Signal?</h3>
            <p className="text-xs font-bold text-slate-400 mb-8">어플리케이션을 종료하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsExitModalOpen(false)} className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase">취소</button>
              <button onClick={() => { setIsExitModalOpen(false); router.push("/login"); }} className="flex-1 bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-lg">종료</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── 📦 [COACHING UI COMPONENTS] ──────────────────────────

function StatRow({ label, val, unit, color = "text-slate-900" }: any) {
    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
            <span className={`text-sm font-black ${color}`}>{val.toLocaleString()}{unit}</span>
        </div>
    )
}

function MainTabBtn({ active, onClick, label, sub }: any) {
    return (
        <button onClick={onClick} className={`flex-1 py-4 px-2 rounded-2xl transition-all text-center ${active?'bg-black text-white shadow-xl':'text-slate-400'}`}>
            <p className="text-[11px] font-black uppercase mb-0.5">{label}</p>
            <p className={`text-[8px] font-bold uppercase opacity-50 ${active?'text-[#d4af37]':''}`}>{sub}</p>
        </button>
    )
}

function GoalCard({ label, val, max, unit }: any) {
    const rate = Math.min((val / (max || 1)) * 100, 100);
    return (
        <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</p>
            <p className="text-2xl font-black mb-4">{val.toLocaleString()}<span className="text-xs text-slate-300 ml-1">/ {max.toLocaleString()}{unit}</span></p>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${rate >= 100 ? 'bg-emerald-500':'bg-black'}`} style={{ width: `${rate}%` }} />
            </div>
            <p className="text-right text-[10px] font-black mt-2 italic">{rate.toFixed(1)}% ACHIEVED</p>
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

function ActivityBox({ label, val }: any) {
    return (
        <div className="bg-slate-50 p-4 rounded-2xl text-center">
            <p className="text-[9px] font-black text-slate-400 mb-1 uppercase tracking-tighter">{label}</p>
            <p className="text-xl font-black">{val}</p>
        </div>
    )
}

function InputBox({ label, val, onChange, unit }: any) {
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
    const isUp = diff >= 0;
    return (
        <div className="bg-slate-50 p-5 rounded-2xl border">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-tighter">{label}</p>
            <div className="flex justify-between items-end">
                <p className="text-xl font-black">{current.toLocaleString()}{unit}</p>
                <p className={`text-[10px] font-black ${isUp ? 'text-emerald-500':'text-rose-500'}`}>
                    {isUp ? '▲':'▼'} {Math.abs(diff).toLocaleString()}{unit}
                </p>
            </div>
        </div>
    )
}