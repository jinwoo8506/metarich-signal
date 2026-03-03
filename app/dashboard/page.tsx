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

// ─── 🛡️ [TYPES & INTERFACES] ──────────────────────────
interface Agent {
  id: string; name: string;
  performance?: {
    call: number; meet: number; pt: number; intro: number;
    db_assigned: number; db_returned: number;
    contract_cnt: number; contract_amt: number;
  };
}

// ─── 🧮 [COMPONENTS: CALCULATORS] ──────────────────────────
const CompoundInterestCalc = () => {
  const [p, setP] = useState(100); const [r, setR] = useState(5); const [t, setT] = useState(10);
  const res = Math.floor(p * Math.pow(1 + r/100, t));
  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-2xl">
      <h4 className="font-black text-xs uppercase italic">복리 계산기 (만기액)</h4>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={p} onChange={e=>setP(Number(e.target.value))} className="p-2 rounded-lg border text-center font-bold" placeholder="원금" />
        <input type="number" value={r} onChange={e=>setR(Number(e.target.value))} className="p-2 rounded-lg border text-center font-bold" placeholder="이율%" />
        <input type="number" value={t} onChange={e=>setT(Number(e.target.value))} className="p-2 rounded-lg border text-center font-bold" placeholder="기간" />
      </div>
      <p className="text-center font-black text-xl text-indigo-600">{res.toLocaleString()} 만원</p>
    </div>
  );
};

export default function FinalBusinessDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── [STATE: UI & DATA] ──────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeAdminPopup, setActiveAdminPopup] = useState<string | null>(null);
  const [isBizToolOpen, setIsBizToolOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // 직원용 지표 상태 (Supabase 연동용)
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300
  });

  // ─── 🔄 [DATABASE LOGIC] ──────────────────────────
  useEffect(() => { checkUser() }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.replace("/login");
    const { data: userInfo } = await supabase.from("users").select("id, name, role").eq("id", session.user.id).maybeSingle();
    if (!userInfo) return router.replace("/login");
    
    setUserId(userInfo.id); setRole(userInfo.role); setUserName(userInfo.name);
    fetchDashboardData(userInfo.id, userInfo.role);
    setLoading(false);
  }

  async function fetchDashboardData(uid: string, urole: string) {
    if (urole === 'agent') {
      const { data } = await supabase.from("daily_perf").select("*").eq("user_id", uid).eq("date", selectedDate.toISOString().split('T')[0]).maybeSingle();
      if (data) setPerfInput(prev => ({ ...prev, ...data }));
    } else {
      const { data } = await supabase.from("users").select("id, name").eq("role", "agent");
      if (data) setAgents(data.map(a => ({ ...a, performance: { call: 15, meet: 5, pt: 3, intro: 1, db_assigned: 10, db_returned: 2, contract_cnt: 4, contract_amt: 120 } })));
    }
  }

  const handleSaveData = async () => {
    const { error } = await supabase.from("daily_perf").upsert({
      user_id: userId,
      date: selectedDate.toISOString().split('T')[0],
      ...perfInput
    });
    if (error) alert("저장 실패: " + error.message);
    else alert("오늘의 실적이 성공적으로 기록되었습니다.");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse italic uppercase">Syncing...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900">
      
      {/* ─── 📟 [사이드바] ─────────────────── */}
      <aside className={`fixed lg:relative w-80 bg-white border-r z-[110] p-6 flex flex-col gap-6 shadow-sm transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter">History</h2>
        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm"><Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} formatDay={(_, date) => date.getDate().toString()} className="border-0 w-full" /></div>
        <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] transition-all">Sales Tools</button>
        <div className="bg-blue-50/50 p-5 rounded-3xl border shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2 tracking-widest">Team Notice</p>
          <p className="text-xs font-bold text-slate-600 leading-relaxed">이번 주 목표 달성률 80% 달성 시 팀 전체 인센티브가 지급됩니다!</p>
        </div>
      </aside>

      {/* ─── 💎 [메인 영역] ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 lg:p-10 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* 퀵링크 4종 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickBtn label="메타온" color="bg-white" />
          <QuickBtn label="보험사" color="bg-white" />
          <QuickBtn label="보험금청구" color="bg-white text-blue-600" />
          <QuickBtn label="자료실" color="bg-white text-slate-400" />
        </div>

        {/* 👮 [관리자 대시보드] */}
        {(role === 'admin' || role === 'master') && (
          <div className="space-y-6 animate-in fade-in">
            <header className="flex justify-between items-end px-4">
                <h1 className="text-3xl font-black italic uppercase">Manager View</h1>
                <button onClick={() => router.replace("/")} className="text-[10px] font-black bg-black text-white px-4 py-2 rounded-xl">LOGOUT</button>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <TabBtn label="실적 관리" sub="목표대비 82%" onClick={()=>setActiveAdminPopup('perf')} />
              <TabBtn label="활동 관리" sub="DB 전환율 분석" onClick={()=>setActiveAdminPopup('act')} />
              <TabBtn label="교육 관리" sub="주차별 이수 현황" onClick={()=>setActiveAdminPopup('edu')} />
              <TabBtn label="시스템 설정" sub="목표/교육 수정" onClick={()=>setActiveAdminPopup('setting')} />
            </div>

            <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase italic mb-6 border-l-8 border-black pl-4">Team Monitoring</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map(a => (
                        <div key={a.id} onClick={()=>setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-black cursor-pointer transition-all">
                            <div className="flex justify-between mb-4">
                                <p className="font-black text-lg underline decoration-[#d4af37] underline-offset-4">{a.name} CA</p>
                                <span className="text-[9px] font-black bg-white px-2 py-1 rounded-full border">ACTIVE</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-slate-400 mb-4">
                                <p>DB배정: <span className="text-black">{a.performance?.db_assigned}</span></p>
                                <p>반품: <span className="text-rose-500">{a.performance?.db_returned}</span></p>
                            </div>
                            <div className="space-y-2">
                                <MiniBar label="금액 달성" val={75} color="bg-black" />
                                <MiniBar label="건수 달성" val={90} color="bg-[#d4af37]" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
          </div>
        )}

        {/* 👤 [직원 입력 화면] */}
        {role === 'agent' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <header className="px-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{userName} CA</p>
                <h1 className="text-3xl font-black italic uppercase">Activity & Performance</h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ProgCard label="Amount (만원)" cur={perfInput.contract_amt} tar={perfInput.target_amt} unit="만" color="text-indigo-600" 
                    onChangeCur={v=>setPerfInput({...perfInput, contract_amt:v})} onChangeTar={v=>setPerfInput({...perfInput, target_amt:v})} />
                <ProgCard label="Contracts (건수)" cur={perfInput.contract_cnt} tar={perfInput.target_cnt} unit="건" color="text-emerald-500" 
                    onChangeCur={v=>setPerfInput({...perfInput, contract_cnt:v})} onChangeTar={v=>setPerfInput({...perfInput, target_cnt:v})} />
            </div>

            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100">
                <h3 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-[0.2em] italic">Daily Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <MetricInput label="전화" val={perfInput.call} onChange={v=>setPerfInput({...perfInput, call:v})} />
                    <MetricInput label="미팅" val={perfInput.meet} onChange={v=>setPerfInput({...perfInput, meet:v})} />
                    <MetricInput label="제안" val={perfInput.pt} onChange={v=>setPerfInput({...perfInput, pt:v})} />
                    <MetricInput label="소개/도입" val={perfInput.intro} onChange={v=>setPerfInput({...perfInput, intro:v})} />
                    <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={v=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
                    <MetricInput label="반품" val={perfInput.db_returned} onChange={v=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
                </div>
                <button onClick={handleSaveData} className="w-full mt-10 bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] hover:bg-slate-800 shadow-2xl transition-all">Save Daily Data</button>
            </div>
          </div>
        )}
      </main>

      {/* ─── 🧱 [MODALS: ADMIN POPUPS] ────────────────────────── */}
      {activeAdminPopup && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] p-10 relative overflow-y-auto max-h-[90vh]">
            <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
            
            {activeAdminPopup === 'perf' && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black italic uppercase underline decoration-[#d4af37]">Performance Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 h-[400px]">
                        <div className="bg-slate-50 p-6 rounded-3xl"><Bar data={{ labels: ['목표 건수', '현재 건수', '목표 금액', '현재 금액'], datasets: [{ label: '팀 전체 실적', data: [100, 85, 5000, 4200], backgroundColor: ['#eee', '#000', '#eee', '#d4af37'] }] }} options={{ maintainAspectRatio: false }} /></div>
                        <div className="space-y-6 flex flex-col justify-center">
                            <StatBox label="전체 달성률" val="82%" sub="지난 달 대비 5% 상승" />
                            <StatBox label="최고 실적자" val="김태희 CA" sub="금액 달성 140%" />
                        </div>
                    </div>
                </div>
            )}

            {activeAdminPopup === 'act' && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black italic uppercase underline decoration-blue-500">Activity Flow</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 h-[400px]">
                        <div className="bg-slate-50 p-6 rounded-3xl flex items-center"><Pie data={{ labels: ['정상DB', '반품'], datasets: [{ data: [80, 20], backgroundColor: ['#000', '#ff4d4d'] }] }} /></div>
                        <div className="bg-slate-50 p-6 rounded-3xl flex items-center"><Line data={{ labels: ['CALL', 'MEET', 'PT', 'INTRO'], datasets: [{ label: '전환율 Flow', data: [100, 40, 20, 10], borderColor: '#000', tension: 0.4 }] }} /></div>
                    </div>
                </div>
            )}

            {activeAdminPopup === 'edu' && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black italic uppercase">Education Tracking</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-black uppercase text-[10px] font-black">
                                <tr><th className="py-4">주차</th><th className="py-4">교육 주제</th><th className="py-4">이수율</th><th className="py-4">전달사항 확인</th><th className="py-4">관리</th></tr>
                            </thead>
                            <tbody className="text-sm font-bold">
                                {[1,2,3,4].map(w => (
                                    <tr key={w} className="border-b">
                                        <td className="py-4">{w}주차</td>
                                        <td className="py-4">신상품 암보험 약관 분석</td>
                                        <td className="py-4 font-black">{90 - w*5}%</td>
                                        <td className="py-4">85%</td>
                                        <td className="py-4"><button className="bg-black text-white px-3 py-1 rounded-lg text-[10px]">EDIT</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeAdminPopup === 'setting' && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black italic uppercase">System Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                            <p className="font-black text-xs uppercase">팀 전체 목표 설정</p>
                            <input className="w-full p-4 rounded-xl border" placeholder="전체 목표 금액 (만원)" defaultValue="5000" />
                            <input className="w-full p-4 rounded-xl border" placeholder="전체 목표 건수" defaultValue="100" />
                            <button className="w-full bg-black text-white py-3 rounded-xl font-black text-xs uppercase">Save Settings</button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 🧱 [MODALS: BIZ TOOLS / CALCULATORS] ────────────────────────── */}
      {isBizToolOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-6 relative shadow-2xl">
                <button onClick={()=>setIsBizToolOpen(false)} className="absolute top-6 right-6 font-black">✕</button>
                <h3 className="text-xl font-black italic uppercase border-b-2 border-black pb-2">Business Calculators</h3>
                <CompoundInterestCalc />
                <div className="p-4 bg-slate-50 rounded-2xl">
                    <h4 className="font-black text-xs uppercase italic mb-2">인플레이션 가치 계산</h4>
                    <p className="text-[10px] text-slate-400 font-bold leading-tight">물가상승률 3% 가정 시 현재 1억원의 20년 후 가치: <span className="text-rose-500 text-sm font-black italic">5,436만원</span></p>
                </div>
                <div className="p-4 bg-slate-900 text-white rounded-2xl">
                    <h4 className="font-black text-xs uppercase italic mb-2 text-[#d4af37]">간편 세금 계산기</h4>
                    <p className="text-[10px] font-bold">종합소득세율 및 공제액 간이 계산 기능 제공 예정...</p>
                </div>
            </div>
        </div>
      )}

      {/* ─── 👤 [MODAL: AGENT DETAIL VIEW] ────────────────────────── */}
      {selectedAgent && (
        <div className="fixed inset-0 z-[210] bg-black/90 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative">
                <button onClick={()=>setSelectedAgent(null)} className="absolute top-8 right-8 font-black text-xl">✕</button>
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-black rounded-full" />
                        <div>
                            <h2 className="text-2xl font-black">{selectedAgent.name} CA Activity</h2>
                            <p className="text-xs font-bold text-slate-400">Current Month Status Report</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <StatItem label="CALL" val={selectedAgent.performance?.call} />
                        <StatItem label="MEET" val={selectedAgent.performance?.meet} />
                        <StatItem label="PT" val={selectedAgent.performance?.pt} />
                        <StatItem label="INTRO" val={selectedAgent.performance?.intro} />
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                        <p className="text-[10px] font-black text-slate-400">DB ANALYSIS</p>
                        <div className="flex justify-between items-end">
                            <p className="font-black">총 배정 <span className="text-blue-600">{selectedAgent.performance?.db_assigned}</span> / 반품 <span className="text-rose-500">{selectedAgent.performance?.db_returned}</span></p>
                            <p className="text-lg font-black italic">손실률: {((selectedAgent.performance?.db_returned! / selectedAgent.performance?.db_assigned!) * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes marquee { 0% { left: 100%; } 100% { left: -100%; } }
        .animate-marquee { animation: marquee 25s linear infinite; }
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 10px; font-weight: 900; }
      `}</style>
    </div>
  )
}

// ─── 📦 [SUB-COMPONENTS] ──────────────────────────

function QuickBtn({ label, color }: any) {
    return <button className={`${color} border-2 border-black py-4 rounded-2xl font-black text-[11px] uppercase shadow-sm hover:invert transition-all`}>{label}</button>
}

function TabBtn({ label, sub, onClick }: any) {
    return (
        <button onClick={onClick} className="bg-white border-2 border-black p-6 rounded-[2.5rem] text-center hover:bg-black group transition-all">
            <p className="text-sm font-black uppercase group-hover:text-[#d4af37] italic">{label}</p>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase group-hover:text-slate-500">{sub}</p>
        </button>
    )
}

function MiniBar({ label, val, color }: any) {
    return (
        <div className="w-full">
            <div className="flex justify-between text-[8px] font-black mb-1 uppercase text-slate-400"><span>{label}</span><span>{val}%</span></div>
            <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border"><div className={`h-full ${color}`} style={{ width: `${val}%` }} /></div>
        </div>
    )
}

function MetricInput({ label, val, onChange, color }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase ml-2">{label}</label>
            <input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl font-black text-center text-xl outline-none transition-all ${color}`} />
        </div>
    )
}

function ProgCard({ label, cur, tar, unit, color, onChangeCur, onChangeTar }: any) {
    const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
    return (
        <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <div className="grid grid-cols-2 gap-4">
                <input type="number" value={tar} onChange={e=>onChangeTar(Number(e.target.value))} className="p-4 bg-slate-50 rounded-2xl font-black text-center" />
                <input type="number" value={cur} onChange={e=>onChangeCur(Number(e.target.value))} className={`p-4 bg-slate-50 rounded-2xl font-black text-center ${color}`} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-end font-black"><span className="text-[9px] text-slate-400 uppercase">{unit} 달성률</span><span className="text-3xl italic">{pct.toFixed(1)}%</span></div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000`} style={{ width: `${pct}%` }} /></div>
            </div>
        </div>
    )
}

function StatBox({ label, val, sub }: any) {
    return (
        <div className="p-6 bg-slate-50 rounded-3xl border">
            <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
            <p className="text-3xl font-black italic">{val}</p>
            <p className="text-[10px] font-bold text-indigo-600 mt-1">{sub}</p>
        </div>
    )
}

function StatItem({ label, val }: any) {
    return (
        <div className="bg-slate-50 p-4 rounded-2xl text-center border">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className="text-lg font-black italic">{val}</p>
        </div>
    )
}