"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement);

// ─── 🛡️ [TYPES] ──────────────────────────
interface PerformanceData {
  call: number; meet: number; pt: number; intro: number;
  db_assigned: number; db_returned: number;
  contract_cnt: number; contract_amt: number;
  target_cnt: number; target_amt: number;
  edu_done: boolean;
}

interface Agent {
  id: string; name: string; performance?: PerformanceData;
}

export default function IntegratedBusinessDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── [STATE] ──────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sideTab, setSideTab] = useState<'perf' | 'act'>('perf');
  const [activeAdminPopup, setActiveAdminPopup] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isTargetLocked, setIsTargetLocked] = useState(false);

  const [perfInput, setPerfInput] = useState<PerformanceData>({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300,
    edu_done: false
  });

  // ─── 🔄 [DATA FETCHING] ──────────────────────────
  useEffect(() => { checkUser() }, []);
  useEffect(() => { if (userId) fetchDailyData(); }, [selectedDate, userId]);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.replace("/login");
    const { data: userInfo } = await supabase.from("users").select("id, name, role").eq("id", session.user.id).maybeSingle();
    if (!userInfo) return router.replace("/login");
    setUserId(userInfo.id); setRole(userInfo.role); setUserName(userInfo.name);
    fetchTeamData();
    setLoading(false);
  }

  async function fetchDailyData() {
    if (!userId) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data } = await supabase.from("daily_perf").select("*").eq("user_id", userId).eq("date", dateStr).maybeSingle();
    if (data) { 
      setPerfInput(data); 
      setIsTargetLocked(true); 
    } else { 
      setPerfInput({ call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, edu_done: false }); 
      setIsTargetLocked(false); 
    }
  }

  const fetchTeamData = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data: users } = await supabase.from("users").select("id, name").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    if (users) setAgents(users.map(u => ({ ...u, performance: perfs?.find(p => p.user_id === u.id) })));
  };

  const savePerformance = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { error } = await supabase.from("daily_perf").upsert({ 
        user_id: userId, date: dateStr, ...perfInput 
    });
    if (error) alert("실적 저장 실패");
    else { alert("실적이 관리자에게 전송되었습니다."); setIsTargetLocked(true); fetchTeamData(); }
  };

  const saveEducation = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { error } = await supabase.from("daily_perf").upsert({ 
        user_id: userId, date: dateStr, edu_done: perfInput.edu_done 
    });
    if (error) alert("교육 상태 저장 실패");
    else { alert("교육 이수 현황이 업데이트되었습니다."); fetchTeamData(); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400">LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📟 [SIDEBAR] */}
      <aside className="w-full lg:w-80 bg-white border-b lg:border-r p-6 flex flex-col gap-6 shadow-sm z-40">
        <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter">History</h2>
        <div className="border rounded-[2rem] overflow-hidden shadow-sm">
          <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} formatDay={(_, date) => date.getDate().toString()} className="border-0 w-full" />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={()=>setSideTab('perf')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${sideTab === 'perf' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>나의 실적</button>
            <button onClick={()=>setSideTab('act')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${sideTab === 'act' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>나의 활동</button>
        </div>

        <div className="bg-slate-50 p-5 rounded-[2rem] border border-dashed border-slate-300">
            <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-3 tracking-widest">Personal Summary</p>
            {sideTab === 'perf' ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-end"><span className="text-[10px] font-bold text-slate-400 uppercase">오늘 실적</span><span className="text-lg font-black italic">{(perfInput.contract_amt || 0).toLocaleString()}만</span></div>
                    <div className="flex justify-between items-end"><span className="text-[10px] font-bold text-slate-400 uppercase">오늘 건수</span><span className="text-lg font-black italic">{(perfInput.contract_cnt || 0)}건</span></div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-white rounded-2xl border border-slate-100"><p className="text-slate-400 uppercase text-[9px] mb-1">전화</p><p className="font-black text-sm">{perfInput.call}</p></div>
                    <div className="p-3 bg-white rounded-2xl border border-slate-100"><p className="text-slate-400 uppercase text-[9px] mb-1">만남</p><p className="font-black text-sm">{perfInput.meet}</p></div>
                </div>
            )}
        </div>
      </aside>

      {/* 💎 [MAIN AREA] */}
      <main className="flex-1 p-4 lg:p-10 space-y-6 max-w-full lg:max-w-[1600px] mx-auto w-full">
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-white" />
          <QuickBtn label="보험사" url="https://www.e-insunet.co.kr" color="bg-white" />
          <QuickBtn label="보험금청구" url="https://www.sosclaim.co.kr" color="bg-white text-blue-600" />
          <QuickBtn label="복리계산기" onClick={() => setActiveAdminPopup('calc')} color="bg-black text-[#d4af37]" />
        </div>

        {(role === 'admin' || role === 'master') ? (
          /* 👑 [ADMIN VIEW] */
          <div className="space-y-6">
            <header className="flex justify-between items-end px-4">
                <h1 className="text-3xl font-black italic uppercase">Manager Portal</h1>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="text-xs font-black border-2 border-black px-4 py-2 rounded-xl">LOGOUT</button>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <TabBtn label="실적 관리" sub="팀 목표 현황" onClick={()=>setActiveAdminPopup('perf')} />
              <TabBtn label="활동 관리" sub="영업 활동 효율" onClick={()=>setActiveAdminPopup('act')} />
              <TabBtn label="교육 관리" sub="이수 명단 체크" onClick={()=>setActiveAdminPopup('edu')} />
              <TabBtn label="시스템 설정" sub="Settings" onClick={()=>setActiveAdminPopup('setting')} />
            </div>

            <section className="bg-white p-8 rounded-[3.5rem] shadow-sm border">
                <h2 className="text-xl font-black uppercase italic mb-6 border-l-8 border-black pl-4">Agent Live Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((a: Agent) => (
                        <div key={a.id} onClick={()=>setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <p className="font-black text-xl">{a.name} CA</p>
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${a.performance?.edu_done ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {a.performance?.edu_done ? '교육완료' : '미이수'}
                                </span>
                            </div>
                            {a.performance ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>실적: {a.performance.contract_amt}만</span>
                                        <span>{Math.floor((a.performance.contract_amt/a.performance.target_amt)*100)}%</span>
                                    </div>
                                    <MiniBar label="달성률" val={Math.min((a.performance.contract_amt/a.performance.target_amt)*100, 100)} color="bg-black" />
                                </div>
                            ) : <p className="text-[10px] font-bold text-slate-400 italic uppercase tracking-widest">Ready to report</p>}
                        </div>
                    ))}
                </div>
            </section>
          </div>
        ) : (
          /* 👤 [AGENT VIEW] */
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <header className="px-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{userName} CA</p>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">Daily Performance</h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProgCard 
                  label="목표 금액 (만원)" 
                  cur={perfInput.contract_amt} 
                  tar={perfInput.target_amt} 
                  unit="만원" 
                  color="text-indigo-600" 
                  isLocked={isTargetLocked} 
                  onChangeCur={(v: number)=>setPerfInput({...perfInput, contract_amt:v})} 
                  onChangeTar={(v: number)=>setPerfInput({...perfInput, target_amt:v})} 
                />
                <ProgCard 
                  label="목표 건수 (건수)" 
                  cur={perfInput.contract_cnt} 
                  tar={perfInput.target_cnt} 
                  unit="건수" 
                  color="text-emerald-500" 
                  isLocked={isTargetLocked} 
                  onChangeCur={(v: number)=>setPerfInput({...perfInput, contract_cnt:v})} 
                  onChangeTar={(v: number)=>setPerfInput({...perfInput, target_cnt:v})} 
                />
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-sm border">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-8 text-center tracking-widest italic">Activity Data</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <MetricInput label="전화" val={perfInput.call} onChange={(v: number)=>setPerfInput({...perfInput, call:v})} />
                    <MetricInput label="만남" val={perfInput.meet} onChange={(v: number)=>setPerfInput({...perfInput, meet:v})} />
                    <MetricInput label="제안" val={perfInput.pt} onChange={(v: number)=>setPerfInput({...perfInput, pt:v})} />
                    <MetricInput label="소개" val={perfInput.intro} onChange={(v: number)=>setPerfInput({...perfInput, intro:v})} />
                    <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v: number)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
                    <MetricInput label="반품" val={perfInput.db_returned} onChange={(v: number)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
                </div>
                <button onClick={savePerformance} className="w-full mt-10 bg-black text-white py-6 rounded-[2rem] font-black uppercase text-lg tracking-[0.2em] hover:invert transition-all">실적 데이터 저장</button>
            </div>

            <div className="bg-indigo-50 p-10 rounded-[3rem] border-2 border-indigo-100 space-y-6">
                <h3 className="text-xl font-black italic uppercase text-indigo-900 flex items-center gap-3"><span>📚</span> Weekly Education</h3>
                <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm">
                  <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"암보험 신상품 비교 분석 및 고객 맞춤형 화법 교육"</p>
                </div>
                <label className="flex items-center gap-4 bg-white p-6 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors border">
                    <input type="checkbox" checked={perfInput.edu_done} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setPerfInput({...perfInput, edu_done: e.target.checked})} className="w-7 h-7 border-indigo-600 text-indigo-600 rounded" />
                    <span className="font-black text-indigo-900 italic uppercase">본인은 위 교육을 성실히 이수하였음을 확인합니다.</span>
                </label>
                <button onClick={saveEducation} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase text-lg tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-lg">교육 이수 상태 저장</button>
            </div>
          </div>
        )}
      </main>

      {/* ─── 🧱 [MODALS: 관리자 기능 및 계산기] ────────────────────────── */}
      {activeAdminPopup && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] p-10 relative overflow-y-auto max-h-[90vh] shadow-2xl">
            <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-3xl font-black">✕</button>
            
            {activeAdminPopup === 'perf' && (
                <div className="space-y-10">
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter">Team Performance Management</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="h-[400px] bg-slate-50 p-6 rounded-3xl border">
                            <Bar data={{ labels: agents.map(a=>a.name), datasets: [{ label: '실적(만원)', data: agents.map(a=>a.performance?.contract_amt || 0), backgroundColor: '#000' }] }} options={{ maintainAspectRatio: false }} />
                        </div>
                        <div className="space-y-6">
                            <StatCard label="팀 전체 당일 실적" val={`${agents.reduce((acc, a) => acc + (a.performance?.contract_amt || 0), 0).toLocaleString()}만`} />
                            <StatCard label="팀 전체 당일 건수" val={`${agents.reduce((acc, a) => acc + (a.performance?.contract_cnt || 0), 0)}건`} />
                            <StatCard label="평균 달성률" val={`${Math.floor(agents.reduce((acc, a) => acc + (a.performance ? (a.performance.contract_amt/a.performance.target_amt)*100 : 0), 0) / (agents.length || 1))}%`} />
                        </div>
                    </div>
                </div>
            )}

            {activeAdminPopup === 'act' && (
                <div className="space-y-10">
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter">Activity Analytics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-3xl border">
                            <div className="w-[300px] h-[300px]"><Pie data={{ labels: ['정상DB', '반품'], datasets: [{ data: [agents.reduce((acc, a)=>acc+(a.performance?.db_assigned||0), 0), agents.reduce((acc, a)=>acc+(a.performance?.db_returned||0), 0)], backgroundColor: ['#000', '#ff4d4d'] }] }} options={{ maintainAspectRatio: false }} /></div>
                        </div>
                        <div className="h-[400px] bg-slate-50 p-6 rounded-3xl border">
                            <Line data={{ labels: ['전화', '만남', '제안'], datasets: [{ label: '팀 전체 활동량', data: [agents.reduce((acc, a)=>acc+(a.performance?.call||0), 0), agents.reduce((acc, a)=>acc+(a.performance?.meet||0), 0), agents.reduce((acc, a)=>acc+(a.performance?.pt||0), 0)], borderColor: '#000', tension: 0.3 }] }} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>
            )}

            {activeAdminPopup === 'edu' && (
                <div className="space-y-10">
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter">Education Tracking List</h3>
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-4 border">
                        {agents.map((a: Agent) => (
                            <div key={a.id} className="flex justify-between items-center p-5 bg-white rounded-2xl border shadow-sm">
                                <span className="font-black text-xl">{a.name} CA</span>
                                <div className="flex items-center gap-4">
                                    <span className={`font-black px-6 py-2 rounded-full text-xs uppercase ${a.performance?.edu_done ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {a.performance?.edu_done ? 'COMPLETED' : 'INCOMPLETE'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeAdminPopup === 'calc' && (
                <div className="flex items-center justify-center py-10">
                    <div className="w-full max-w-md"><FinanceCalculator /></div>
                </div>
            )}
          </div>
        </div>
      )}

      {/* 👤 [AGENT DETAIL: 클릭 시 팝업] */}
      {selectedAgent && (
        <div className="fixed inset-0 z-[210] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-10 relative border-4 border-black">
                <button onClick={()=>setSelectedAgent(null)} className="absolute top-10 right-10 text-3xl font-black">✕</button>
                <div className="space-y-10">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center text-[#d4af37] font-black text-4xl">{selectedAgent.name.charAt(0)}</div>
                        <div>
                            <h2 className="text-4xl font-black uppercase italic tracking-tighter">{selectedAgent.name} CA</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detail Activity Status</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatItem label="CALL" val={selectedAgent.performance?.call} />
                        <StatItem label="MEET" val={selectedAgent.performance?.meet} />
                        <StatItem label="PT" val={selectedAgent.performance?.pt} />
                        <StatItem label="INTRO" val={selectedAgent.performance?.intro} />
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[3rem] space-y-6 border">
                        <div className="flex justify-between font-black uppercase italic items-center"><span>Reported Amount</span><span className="text-3xl text-indigo-600">{selectedAgent.performance?.contract_amt.toLocaleString()}만</span></div>
                        <div className="flex justify-between font-black uppercase italic items-center"><span>Reported Count</span><span className="text-3xl text-emerald-600">{selectedAgent.performance?.contract_cnt}건</span></div>
                        <div className="pt-4">
                           <MiniBar label="Goal Progress" val={selectedAgent.performance ? (selectedAgent.performance.contract_amt/selectedAgent.performance.target_amt)*100 : 0} color="bg-black" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}

// ─── 📦 [SUB-COMPONENTS WITH TYPES] ──────────────────────────

function QuickBtn({ label, color, onClick, url }: { label: string, color: string, onClick?: () => void, url?: string }) {
  return <button onClick={()=>{ if(url) window.open(url, "_blank"); if(onClick) onClick(); }} className={`${color} border-2 border-black py-4 rounded-2xl font-black text-xs uppercase shadow-sm active:scale-95 transition-all`}>{label}</button>
}

function TabBtn({ label, sub, onClick }: { label: string, sub: string, onClick: () => void }) {
    return (
        <button onClick={onClick} className="bg-white border-2 border-black p-6 rounded-[2.5rem] text-center hover:bg-black group transition-all active:scale-95 shadow-sm">
            <p className="text-base font-black uppercase group-hover:text-[#d4af37] italic transition-colors">{label}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase group-hover:text-slate-500">{sub}</p>
        </button>
    )
}

function MiniBar({ label, val, color }: { label: string, val: number, color: string }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-black mb-1.5 uppercase text-slate-400"><span>{label}</span><span>{Math.floor(val)}%</span></div>
      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner"><div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${val}%` }} /></div>
    </div>
  )
}

function MetricInput({ label, val, onChange, color }: { label: string, val: number, onChange: (v: number) => void, color?: string }) {
  return (
    <div className="space-y-2 text-center">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <input type="number" value={val || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-[2rem] font-black text-center text-xl outline-none transition-all ${color}`} />
    </div>
  )
}

function ProgCard({ label, cur, tar, unit, color, isLocked, onChangeCur, onChangeTar }: { label: string, cur: number, tar: number, unit: string, color: string, isLocked: boolean, onChangeCur: (v: number) => void, onChangeTar: (v: number) => void }) {
    const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
    return (
        <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-6">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center italic">{label}</p>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-300 ml-2 uppercase">Target {isLocked && '🔒'}</p>
                    <input type="number" value={tar} disabled={isLocked} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>onChangeTar(Number(e.target.value))} className={`w-full p-4 bg-slate-50 rounded-2xl font-black text-center border-2 outline-none text-xl transition-all ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-100 border-transparent' : 'border-dashed border-slate-300 focus:border-black'}`} />
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-300 ml-2 uppercase">Current</p>
                    <input type="number" value={cur} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>onChangeCur(Number(e.target.value))} className={`w-full p-4 bg-slate-50 rounded-2xl font-black text-center border-2 border-transparent focus:border-black outline-none text-xl ${color}`} />
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-end font-black italic">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">{unit} Progress</span>
                    <span className="text-4xl text-slate-900">{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000`} style={{ width: `${pct}%` }} /></div>
            </div>
        </div>
    )
}

function StatCard({ label, val }: { label: string, val: string }) {
    return <div className="bg-slate-50 p-6 rounded-[2rem] border shadow-sm"><p className="text-xs font-black text-slate-400 uppercase mb-1">{label}</p><p className="text-3xl font-black italic uppercase tracking-tighter">{val}</p></div>
}

function StatItem({ label, val }: { label: string, val?: number }) {
    return <div className="p-5 bg-slate-50 rounded-2xl border text-center shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p><p className="text-xl font-black">{val || 0}</p></div>
}

function FinanceCalculator() {
    const [p, setP] = useState(100); const [r, setR] = useState(5); const [t, setT] = useState(10);
    const res = Math.floor(p * Math.pow(1 + (r / 100), t));
    return (
        <div className="p-10 bg-slate-900 rounded-[3.5rem] space-y-8 border-4 border-[#d4af37]">
            <h4 className="font-black italic uppercase text-white text-xl tracking-tighter">Finance Simulator</h4>
            <div className="space-y-5">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#d4af37] ml-2">PRINCIPAL (만원)</p>
                    <input type="number" value={p} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setP(Number(e.target.value))} className="w-full p-4 rounded-2xl border-none font-black text-center text-xl outline-none" placeholder="원금" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-[#d4af37] ml-2">RATE (%)</p>
                        <input type="number" value={r} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setR(Number(e.target.value))} className="w-full p-4 rounded-2xl border-none font-black text-center text-xl outline-none" placeholder="수익률" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-[#d4af37] ml-2">TERM (년)</p>
                        <input type="number" value={t} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setT(Number(e.target.value))} className="w-full p-4 rounded-2xl border-none font-black text-center text-xl outline-none" placeholder="기간" />
                    </div>
                </div>
                <div className="bg-white/10 p-8 rounded-3xl text-center border border-white/20">
                    <p className="text-[10px] font-black text-white/50 uppercase mb-2">Estimated Maturity Value</p>
                    <p className="text-4xl font-black text-[#d4af37] italic tracking-tighter">{res.toLocaleString()} <span className="text-sm not-italic">만원</span></p>
                </div>
            </div>
        </div>
    )
}