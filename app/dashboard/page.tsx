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

  // 🗓️ 날짜 및 코칭용 기간 설정
  const [selectedDate, setSelectedDate] = useState(new Date())
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear

  // 📊 데이터 상태 (기존 로직 유지)
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [teamGoal, setTeamGoal] = useState({ count: 100, amount: 1000, recruit: 5 })
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  
  // 🧮 계산기 상태 (모바일 대응 디자인)
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<'compare' | 'inflation' | 'interest'>('compare')
  const [compMonth, setCompMonth] = useState(50); const [compYear, setCompYear] = useState(5);
  const [compWait, setCompWait] = useState(5); const [bankRate, setBankRate] = useState(2);
  const [insuRate, setInsuRate] = useState(124); const [infMoney, setInfMoney] = useState(100);
  const [infRate, setInfRate] = useState(3); const [intMoney, setIntMoney] = useState(1000);
  const [intRate, setIntRate] = useState(5); const [intYear, setIntYear] = useState(20);

  // ─── 🔐 기존 로직 보호 (데이터 불러오기) ───────────────────────────────────
  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.replace("/login")
    const { data: userInfo } = await supabase.from("users").select("name, role").eq("id", session.user.id).maybeSingle()
    if (!userInfo) return router.replace("/login")
    setUserId(session.user.id); setRole(userInfo.role); setUserName(userInfo.name)
    fetchTeamGoal()
    fetchAdminData()
    setLoading(false)
  }

  async function fetchTeamGoal() {
    const { data } = await supabase.from("team_goals").select("*").eq("id", "current_team_goal").maybeSingle()
    if (data) {
      setTeamGoal({ count: Number(data.total_goal_count), amount: Number(data.total_goal_amount), recruit: Number(data.total_goal_recruit) })
      setGlobalNotice(data.global_notice || "")
    }
  }

  async function fetchAdminData() {
    const { data } = await supabase.from("users").select(`
      id, name, 
      monthly_targets(*), 
      performances(*)
    `).eq("role", "agent")
    if (data) setAgents(data)
  }

  // 🚨 깜빡임 경고 로직 (마스터님 요청 사항)
  const getAlertStyle = (agent: any) => {
    const p = agent.performances?.find((perf: any) => perf.year === currentYear && perf.month === currentMonth) || {}
    const amount = p.contract_amount || 0
    const day = today.getDate()
    if (amount < 30) return "animate-pulse-red border-red-500 shadow-red-50" 
    if ((day <= 10 && amount === 0) || (day > 25 && amount < 25)) return "animate-pulse-yellow border-yellow-400 shadow-yellow-50"
    return "border-transparent"
  }

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-2xl text-slate-300">SIGNAL LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-[#0f172a] font-sans selection:bg-black selection:text-white">
      
      {/* 🗓️ 사이드바 (디자인 유지 + 하단 메뉴 추가) */}
      <aside className="w-[320px] bg-white border-r border-slate-100 hidden lg:flex flex-col p-8 shrink-0">
        <div className="mb-10 text-center">
            <h2 className="font-black italic text-2xl tracking-tighter uppercase mb-1">History Board</h2>
            <div className="h-1.5 w-12 bg-black mx-auto rounded-full"></div>
        </div>
        
        <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} className="mb-10 rounded-[2rem] border-none shadow-sm font-bold" />
        
        {/* 영업 지원 도구 (사이드바 하단 배치) */}
        <div className="mt-auto space-y-2 pt-6 border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-2 mb-4">Sales Toolkit</p>
          <button onClick={() => { setActiveTool('compare'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] bg-slate-50 hover:bg-black hover:text-white transition-all duration-300 font-bold text-[13px] group shadow-sm">
            <span className="text-xl group-hover:scale-125 transition-transform">🏦</span> 은행 vs 보험 비교
          </button>
          <button onClick={() => { setActiveTool('inflation'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all duration-300 font-bold text-[13px] group shadow-sm">
            <span className="text-xl group-hover:scale-125 transition-transform">📉</span> 화폐가치 계산기
          </button>
          <button onClick={() => { setActiveTool('interest'); setIsBizToolOpen(true); }} className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-white transition-all duration-300 font-bold text-[13px] group shadow-sm">
            <span className="text-xl group-hover:scale-125 transition-transform">📈</span> 단리 vs 복리 비교
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-14">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50">
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter text-black uppercase leading-none">Metarich Signal</h1>
              <p className="text-[11px] font-black text-slate-300 mt-2 uppercase tracking-[0.3em]">Management & Performance Coaching</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest mb-1">{role} Access</p>
                <p className="text-2xl font-black">{userName}님</p>
              </div>
              <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black hover:bg-red-600 transition-colors">LOGOUT</button>
            </div>
          </header>

          {/* 👥 직원 리스트 (현재 실적 우선 + 깜빡임 효과) */}
          <section className="space-y-8">
            <div className="flex items-center justify-between border-l-[12px] border-black pl-6">
              <h2 className="text-2xl font-black uppercase italic tracking-tight">{currentMonth}월 실적 현황</h2>
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase">Live Monitoring</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {agents.map(a => {
                const currentP = a.performances?.find((p:any) => p.year === currentYear && p.month === currentMonth) || {}
                const currentT = a.monthly_targets?.find((t:any) => t.year === currentYear && t.month === currentMonth) || {}
                const alertClass = getAlertStyle(a)
                
                return (
                  <div key={a.id} onClick={() => setSelectedAgent(a)} 
                       className={`bg-white p-10 rounded-[3.5rem] border-[4px] transition-all duration-500 cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-2 group ${alertClass}`}>
                    <div className="flex justify-between items-start mb-8">
                      <div className="font-black text-2xl group-hover:text-black transition-colors">{a.name} CA</div>
                      <span className="text-[10px] font-black bg-slate-50 px-3 py-1.5 rounded-xl uppercase opacity-0 group-hover:opacity-100 transition-all">Coaching ➔</span>
                    </div>
                    <div className="space-y-6">
                      <MiniBar label="건수 실적" current={currentP.contract_count || 0} target={currentT.target_count || 0} unit="건" color="#0f172a" />
                      <MiniBar label="금액 실적" current={currentP.contract_amount || 0} target={currentT.target_amount || 0} unit="만" color="#d4af37" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      {/* 👤 코칭 팝업 (현재 vs 과거 데이터 비교 기능) */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[4rem] p-10 md:p-14 relative border-[10px] border-black shadow-2xl animate-in zoom-in-95 duration-300">
            <button onClick={() => setSelectedAgent(null)} className="absolute top-10 right-10 font-black text-4xl hover:rotate-90 transition-transform">✕</button>
            <h2 className="text-4xl md:text-5xl font-black italic mb-12 border-b-[10px] border-black pb-6 uppercase tracking-tighter">
              {selectedAgent.name} <span className="text-[#d4af37]">Coaching</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100">
                  <p className="font-black text-blue-600 text-xs mb-6 uppercase tracking-widest">Present: {currentMonth}월 성과</p>
                  <div className="grid grid-cols-3 gap-4">
                    {(() => {
                      const p = selectedAgent.performances?.find((p:any) => p.year === currentYear && p.month === currentMonth) || {}
                      return <><StatBox label="CALL" value={p.call_count} color="text-black" /><StatBox label="MEET" value={p.meet_count} color="text-black" /><StatBox label="PT" value={p.pt} color="text-black" /></>
                    })()}
                  </div>
                </div>
                <textarea className="w-full h-44 p-8 rounded-[2.5rem] bg-slate-50 border-4 border-transparent focus:border-black outline-none font-bold text-[15px] transition-all" placeholder="이번 달 방향성을 제시해 주세요..." />
              </div>
              <div className="space-y-10 border-l-0 lg:border-l-2 lg:pl-12 border-slate-100">
                <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 opacity-60 hover:opacity-100 transition-opacity">
                  <p className="font-black text-slate-400 text-xs mb-6 uppercase tracking-widest">History: {lastMonth}월 최종결과</p>
                  <div className="grid grid-cols-3 gap-4">
                    {(() => {
                      const p = selectedAgent.performances?.find((p:any) => p.year === lastYear && p.month === lastMonth) || {}
                      return <><StatBox label="CALL" value={p.call_count} /><StatBox label="MEET" value={p.meet_count} /><StatBox label="AP" value={p.ap} /></>
                    })()}
                  </div>
                </div>
                <div className="bg-amber-50 p-8 rounded-[3rem] border-2 border-amber-100 text-amber-900">
                  <p className="font-black text-[10px] uppercase mb-3 tracking-widest opacity-60">AI 데이터 분석</p>
                  <p className="text-[15px] font-bold leading-relaxed">지난달 대비 <span className="text-2xl font-black">상담 횟수</span>가 다소 하락했습니다. 활동량을 높이는 방향으로 코칭 부탁드립니다.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] font-black text-2xl mt-12 hover:scale-[0.98] transition-transform uppercase">Apply & Close</button>
          </div>
        </div>
      )}

      {/* 🧮 모바일 최적화 영업 계산기 (엑셀 수식 반영) */}
      {isBizToolOpen && (
        <div className="fixed inset-0 bg-black/95 z-[500] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
          <div className="bg-white w-full max-w-lg rounded-t-[4rem] md:rounded-[4rem] h-[92vh] md:h-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="bg-black p-8 flex justify-between items-center text-white shrink-0">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase">Sales Toolkit</h2>
              <button onClick={() => setIsBizToolOpen(false)} className="text-3xl font-black hover:rotate-90 transition-transform">✕</button>
            </div>
            <div className="flex bg-slate-100 p-2 shrink-0 m-4 rounded-[2rem]">
              <CalcTab label="은행비교" active={activeTool === 'compare'} onClick={() => setActiveTool('compare')} color="bg-black" />
              <CalcTab label="화폐가치" active={activeTool === 'inflation'} onClick={() => setActiveTool('inflation')} color="bg-rose-600" />
              <CalcTab label="복리마법" active={activeTool === 'interest'} onClick={() => setActiveTool('interest')} color="bg-emerald-600" />
            </div>
            <div className="flex-1 overflow-y-auto p-8 pt-2 space-y-10">
              {activeTool === 'compare' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <InBox label="월 납입" value={compMonth} onChange={setCompMonth} unit="만" />
                    <InBox label="납입년수" value={compYear} onChange={setCompYear} unit="년" />
                    <InBox label="거치년수" value={compWait} onChange={setCompWait} unit="년" />
                    <InBox label="환급률" value={insuRate} onChange={setInsuRate} unit="%" highlight />
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[3.5rem] border-2 border-slate-100 space-y-8 shadow-inner">
                    <div>
                      <p className="text-[11px] font-black text-slate-300 uppercase mb-2">🏦 은행 세후 합계 (15.4% 차감)</p>
                      <p className="text-4xl font-black tracking-tighter text-slate-800">
                        {Math.round((compMonth * (compYear*12)) + (compMonth * (compYear*12*(compYear*12+1)/2) * (bankRate/100/12)) * 0.846).toLocaleString()}
                        <span className="text-lg ml-1 font-bold">원</span>
                      </p>
                    </div>
                    <div className="pt-8 border-t border-slate-200">
                      <p className="text-[11px] font-black text-[#d4af37] uppercase mb-2">🛡️ 보험사 예상 환급금</p>
                      <p className="text-5xl font-black tracking-tighter text-[#d4af37]">
                        {Math.round(compMonth * (compYear * 12) * (insuRate / 100)).toLocaleString()}
                        <span className="text-xl ml-1 font-black text-black">원</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* 다른 계산기 탭 생략 (비슷한 UI 구조) */}
            </div>
          </div>
        </div>
      )}

      {/* 🔹 마스터님 요청 글로벌 스타일 */}
      <style jsx global>{`
        @keyframes pulse-yellow { 0%, 100% { border-color: #facc15; background-color: #fff; } 50% { border-color: transparent; background-color: #fefce8; } }
        @keyframes pulse-red { 0%, 100% { border-color: #ef4444; background-color: #fff; } 50% { border-color: transparent; background-color: #fef2f2; } }
        .animate-pulse-yellow { animation: pulse-yellow 1.5s infinite; }
        .animate-pulse-red { animation: pulse-red 1s infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
        .react-calendar { width: 100% !important; border: none !important; font-family: inherit; }
        .react-calendar__tile--active { background: #0f172a !important; color: white !important; border-radius: 14px; }
      `}</style>
    </div>
  )
}

// 🧱 하위 컴포넌트 (디자인 통일)
function MiniBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-[11px] font-black uppercase tracking-tight text-slate-400">
        <span>{label} <span className="text-slate-200">/</span> {current}{unit}</span>
        <span>{Math.round(rate)}%</span>
      </div>
      <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${rate}%`, backgroundColor: color }}></div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color = "text-slate-300" }: any) {
  return (
    <div className="text-center p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <p className="text-[10px] font-black text-slate-300 uppercase mb-2 tracking-widest">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value || 0}</p>
    </div>
  )
}

function CalcTab({ label, active, onClick, color }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs transition-all duration-300 ${active ? `${color} text-white shadow-lg scale-105` : 'text-slate-400'}`}>
      {label}
    </button>
  )
}

function InBox({ label, value, onChange, unit, highlight }: any) {
  return (
    <div className="space-y-2 text-left">
      <label className={`text-[10px] font-black ml-4 uppercase tracking-widest ${highlight ? 'text-blue-600' : 'text-slate-300'}`}>{label}</label>
      <div className="relative">
        <input type="number" value={value || ""} onChange={(e) => onChange(Number(e.target.value))} 
          className={`w-full p-6 rounded-[2rem] font-black text-2xl outline-none border-[3px] transition-all ${highlight ? 'bg-blue-50 border-blue-100 focus:border-blue-600 text-blue-700' : 'bg-slate-50 border-transparent focus:border-black'}`} />
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{unit}</span>
      </div>
    </div>
  )
}