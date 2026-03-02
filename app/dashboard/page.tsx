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

  // 🗓️ 날짜 및 기간 설정 (코칭용)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear

  // 📊 데이터 상태
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [lastMonthPerf, setLastMonthPerf] = useState<any>(null) // 지난달 데이터 저장용
  
  // 🧮 계산기 상태
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [compMonth, setCompMonth] = useState(50); const [compYear, setCompYear] = useState(5);
  const [compWait, setCompWait] = useState(5); const [bankRate, setBankRate] = useState(2);
  const [insuRate, setInsuRate] = useState(124); const [infMoney, setInfMoney] = useState(100);
  const [infRate, setInfRate] = useState(3); const [intMoney, setIntMoney] = useState(1000);
  const [intRate, setIntRate] = useState(5); const [intYear, setIntYear] = useState(20);

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    fetchAdminData()
    setLoading(false)
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`
      id, name, 
      monthly_targets(target_count, target_amount, status, admin_comment, year, month), 
      performances(*)
    `).eq("role", "agent")
    if (data) setAgents(data)
  }

  // 🚨 경고 알림 스타일 로직
  const getAlertStyle = (agent: any) => {
    const p = agent.performances.find((perf: any) => perf.year === currentYear && perf.month === currentMonth) || {}
    const amount = p.contract_amount || 0
    const day = today.getDate()
    if (amount < 30) return "animate-pulse-red border-red-500 shadow-red-100" // 30만 미만 빨간색
    if ((day <= 10 && amount === 0) || (day > 25 && amount < 25)) return "animate-pulse-yellow border-yellow-400 shadow-yellow-100"
    return "border-slate-100"
  }

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-2xl">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 overflow-hidden">
      
      {/* 🗓️ 사이드바 (데스크탑) */}
      <aside className="w-80 bg-white border-r hidden lg:flex flex-col p-6 shadow-xl shrink-0">
        <h2 className="font-black italic text-2xl border-b-4 border-black pb-3 mb-6 uppercase tracking-tighter">History Board</h2>
        <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} className="mb-6 rounded-2xl border-none shadow-sm" />
        
        {/* 영업 지원 도구 메뉴 - 사이드바 하단 배치 */}
        <div className="mt-auto space-y-3 pt-6 border-t-2 border-slate-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sales Toolkit</p>
          <button onClick={() => { setActiveTool('compare'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-black hover:text-white transition-all font-bold text-sm group">
            <span className="group-hover:scale-125 transition-transform">🏦</span> 은행 vs 보험 비교
          </button>
          <button onClick={() => { setActiveTool('inflation'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all font-bold text-sm group">
            <span className="group-hover:scale-125 transition-transform">📉</span> 화폐가치 계산기
          </button>
          <button onClick={() => { setActiveTool('interest'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all font-bold text-sm group">
            <span className="group-hover:scale-125 transition-transform">📈</span> 단리 vs 복리 비교
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter text-black uppercase">Metarich Signal</h1>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase">Management & Coaching System</p>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest leading-none">{role}</p>
              <p className="text-2xl font-black">{userName}님</p>
            </div>
          </header>

          {/* 👥 직원 리스트 (현재 실적 우선) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-l-8 border-black pl-4">
              <h2 className="text-xl font-black uppercase italic">Current Performance ({currentMonth}월)</h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase animate-pulse">실시간 경고 시스템 작동중</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map(a => {
                const currentP = a.performances.find((p:any) => p.year === currentYear && p.month === currentMonth) || {}
                const currentT = a.monthly_targets.find((t:any) => t.year === currentYear && t.month === currentMonth) || {}
                const alertClass = getAlertStyle(a)
                
                return (
                  <div key={a.id} onClick={() => setSelectedAgent(a)} 
                       className={`bg-white p-8 rounded-[3rem] border-4 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 ${alertClass}`}>
                    <div className="flex justify-between items-start mb-6">
                      <span className="font-black text-xl">{a.name} CA</span>
                      <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase">Detail View</span>
                    </div>
                    <div className="space-y-4">
                      <MiniBar label="이번달 건수" current={currentP.contract_count || 0} target={currentT.target_count || 0} unit="건" color="black" />
                      <MiniBar label="이번달 금액" current={currentP.contract_amount || 0} target={currentT.target_amount || 0} unit="만" color="#d4af37" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      {/* 👤 코칭 팝업: 현재 vs 과거 비교 */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-2 md:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] p-6 md:p-12 relative my-auto border-[10px] border-black shadow-2xl">
            <button onClick={() => setSelectedAgent(null)} className="absolute top-8 right-8 font-black text-3xl hover:rotate-90 transition-transform">✕</button>
            
            <h2 className="text-4xl font-black italic mb-10 border-b-8 border-black pb-4 uppercase leading-none">
              {selectedAgent.name} <span className="text-[#d4af37]">Performance Coaching</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* Left: 현재 데이터 (방향 제시용) */}
              <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100">
                  <h3 className="font-black text-blue-600 mb-4 uppercase text-sm tracking-widest">Current: {currentMonth}월 진행현황</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(() => {
                      const p = selectedAgent.performances.find((p:any) => p.year === currentYear && p.month === currentMonth) || {}
                      return (
                        <>
                          <StatBox label="CALL" value={p.call_count} color="text-emerald-600" />
                          <StatBox label="MEET" value={p.meet_count} color="text-amber-600" />
                          <StatBox label="PT" value={p.pt} color="text-purple-600" />
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="p-2 space-y-4">
                  <h4 className="font-black text-xs uppercase text-slate-400">이번달 전략 코멘트</h4>
                  <textarea defaultValue={selectedAgent.monthly_targets.find((t:any) => t.year === currentYear && t.month === currentMonth)?.admin_comment} 
                    className="w-full h-32 p-6 rounded-3xl bg-slate-50 border-4 border-transparent focus:border-black outline-none font-bold text-sm" placeholder="현재 흐름에 따른 피드백을 입력하세요..." />
                </div>
              </div>

              {/* Right: 과거 데이터 (비교용) */}
              <div className="space-y-8 border-l-0 lg:border-l-4 lg:pl-10 border-slate-100">
                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100">
                  <h3 className="font-black text-slate-400 mb-4 uppercase text-sm tracking-widest">History: {lastMonth}월 최종결과</h3>
                  <div className="grid grid-cols-3 gap-4 opacity-60">
                    {(() => {
                      const p = selectedAgent.performances.find((p:any) => p.year === lastYear && p.month === lastMonth) || {}
                      return (
                        <>
                          <StatBox label="CALL" value={p.call_count} />
                          <StatBox label="MEET" value={p.meet_count} />
                          <StatBox label="AP" value={p.ap} />
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="bg-amber-50 p-8 rounded-[2.5rem] border-2 border-amber-100">
                  <p className="font-black text-amber-800 text-xs uppercase mb-2">분석 결과</p>
                  <p className="text-sm font-bold text-amber-900 leading-relaxed">
                    지난달 대비 상담(MEET) 횟수가 <span className="text-xl font-black">20%</span> 낮아졌습니다. 
                    지난달의 활동량을 회복한다면 목표 달성이 가능해 보입니다.
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedAgent(null)} className="w-full bg-black text-[#d4af37] py-6 rounded-[2.5rem] font-black text-xl mt-10 hover:scale-[0.98] transition-transform uppercase">Apply Coaching Strategy</button>
          </div>
        </div>
      )}

      {/* 🧮 모바일 최적화 영업 계산기 모달 */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 z-[500] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3rem] h-[90vh] md:h-auto overflow-hidden flex flex-col shadow-2xl border-x-4 border-t-4 md:border-4 border-black">
            <div className="bg-black p-6 flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">Signal Sales Tool</h2>
              <button onClick={() => setIsBizToolOpen(false)} className="text-2xl font-black">✕</button>
            </div>

            {/* 계산기 탭 메뉴 */}
            <div className="flex bg-slate-100 p-2 shrink-0">
              <CalcTab label="은행비교" active={activeTool === 'compare'} onClick={() => setActiveTool('compare')} color="bg-black" />
              <CalcTab label="화폐가치" active={activeTool === 'inflation'} onClick={() => setActiveTool('inflation')} color="bg-rose-600" />
              <CalcTab label="복리마법" active={activeTool === 'interest'} onClick={() => setActiveTool('interest')} color="bg-blue-600" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white">
              {activeTool === 'compare' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-2 gap-4">
                    <InBox label="월 납입" value={compMonth} onChange={setCompMonth} unit="만" />
                    <InBox label="기간(년)" value={compYear} onChange={setCompYear} unit="년" />
                    <InBox label="거치(년)" value={compWait} onChange={setCompWait} unit="년" />
                    <InBox label="환급률" value={insuRate} onChange={setInsuRate} unit="%" highlight />
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">🏦 은행 세후 합계</p>
                      <p className="text-3xl font-black text-slate-800 tracking-tight">
                        {Math.round((compMonth * (compYear*12)) + (compMonth * (compYear*12*(compYear*12+1)/2) * (bankRate/100/12)) * 0.846).toLocaleString()}
                        <span className="text-sm ml-1 uppercase">won</span>
                      </p>
                    </div>
                    <div className="pt-6 border-t border-slate-200">
                      <p className="text-[10px] font-black text-[#d4af37] uppercase">🛡️ 보험사 예상 환급</p>
                      <p className="text-4xl font-black text-[#d4af37] tracking-tight">
                        {Math.round(compMonth * (compYear * 12) * (insuRate / 100)).toLocaleString()}
                        <span className="text-sm ml-1 uppercase font-black text-black">won</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* 화폐가치/복리 계산기는 유사 패턴으로 모바일 폰트 최적화 유지 */}
              {activeTool === 'inflation' && (
                 <div className="space-y-10 text-center animate-in slide-in-from-bottom-2">
                    <div className="max-w-[200px] mx-auto space-y-4">
                      <InBox label="현재 금액" value={infMoney} onChange={setInfMoney} unit="만" />
                      <InBox label="물가상승률" value={infRate} onChange={setInfRate} unit="%" />
                    </div>
                    <div className="space-y-4">
                      {[10, 20, 30].map(yr => (
                        <div key={yr} className="flex justify-between items-center p-6 bg-rose-50 rounded-3xl border-2 border-rose-100">
                          <span className="font-black text-rose-700">{yr}년 뒤 가치</span>
                          <span className="text-2xl font-black">{Math.round(infMoney / Math.pow(1 + (infRate/100), yr)).toLocaleString()}만</span>
                        </div>
                      ))}
                    </div>
                 </div>
              )}
              {activeTool === 'interest' && (
                 <div className="space-y-8 animate-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-4">
                      <InBox label="거치 원금" value={intMoney} onChange={setIntMoney} unit="만" />
                      <InBox label="수익률" value={intRate} onChange={setIntRate} unit="%" />
                      <div className="col-span-2"><InBox label="거치 기간" value={intYear} onChange={setIntYear} unit="년" /></div>
                    </div>
                    <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100">
                      <p className="text-[10px] font-black uppercase opacity-60 mb-2">복리의 마법 결과 (단리 대비 수익)</p>
                      <p className="text-5xl font-black tracking-tighter">
                        +{Math.round((intMoney * Math.pow(1+(intRate/100), intYear)) - (intMoney + (intMoney*(intRate/100)*intYear))).toLocaleString()}만
                      </p>
                    </div>
                 </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t flex gap-4 md:hidden">
              <p className="text-[10px] font-black text-slate-400 italic">※ 위 수치는 단순 참고용 예시이며 가입 조건에 따라 다를 수 있습니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 전역 스타일 */}
      <style jsx global>{`
        @keyframes pulse-yellow { 0%, 100% { border-color: #facc15; background-color: #fff; } 50% { border-color: transparent; background-color: #fefce8; } }
        @keyframes pulse-red { 0%, 100% { border-color: #ef4444; background-color: #fff; } 50% { border-color: transparent; background-color: #fef2f2; } }
        .animate-pulse-yellow { animation: pulse-yellow 1.5s infinite; }
        .animate-pulse-red { animation: pulse-red 1s infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}

// 🧱 하위 컴포넌트 (UI 일관성 유지)
function MiniBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase">
        <span className="text-slate-400">{label} ({current}/{target}{unit})</span>
        <span>{Math.round(rate)}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
        <div className="h-full transition-all duration-1000" style={{ width: `${rate}%`, backgroundColor: color }}></div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color = "text-slate-400" }: any) {
  return (
    <div className="text-center p-3 bg-white rounded-2xl border shadow-sm">
      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value || 0}</p>
    </div>
  )
}

function CalcTab({ label, active, onClick, color }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${active ? `${color} text-white shadow-lg scale-105` : 'text-slate-400'}`}>
      {label}
    </button>
  )
}

function InBox({ label, value, onChange, unit, highlight }: any) {
  return (
    <div className="space-y-1 text-left">
      <label className={`text-[9px] font-black ml-3 uppercase ${highlight ? 'text-blue-600' : 'text-slate-400'}`}>{label}</label>
      <div className="relative">
        <input type="number" value={value || ""} onChange={(e) => onChange(Number(e.target.value))} 
          className={`w-full p-4 rounded-2xl font-black text-xl outline-none border-2 transition-all ${highlight ? 'bg-blue-50 border-blue-200 focus:border-blue-600' : 'bg-slate-50 border-transparent focus:border-black'}`} />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">{unit}</span>
      </div>
    </div>
  )
}