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
  edu_done: boolean; // 교육 이수 여부 추가
}

interface Agent {
  id: string; name: string; performance?: PerformanceData;
}

// ─── 🧮 [COMPONENTS: BUSINESS CALCULATOR] ──────────────────────────
const BusinessCalculator = () => {
  const [p, setP] = useState(100); 
  const [r, setR] = useState(5);   
  const [t, setT] = useState(10);  
  const [result, setResult] = useState(0);

  useEffect(() => {
    const total = p * Math.pow(1 + (r / 100), t);
    setResult(Math.floor(total));
  }, [p, r, t]);

  return (
    <div className="space-y-4 p-5 bg-slate-50 rounded-[2rem] border-2 border-slate-200">
      <h4 className="font-black text-xs uppercase italic text-slate-800 ml-2">비과세 복리 시뮬레이션</h4>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 ml-2">원금(만원)</label>
          <input type="number" value={p} onChange={e=>setP(Number(e.target.value))} className="w-full p-3 rounded-xl border font-black outline-none focus:border-black" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 ml-2">수익률(%)</label>
            <input type="number" value={r} onChange={e=>setR(Number(e.target.value))} className="w-full p-3 rounded-xl border font-black outline-none focus:border-black" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 ml-2">기간(년)</label>
            <input type="number" value={t} onChange={e=>setT(Number(e.target.value))} className="w-full p-3 rounded-xl border font-black outline-none focus:border-black" />
          </div>
        </div>
      </div>
      <div className="bg-white p-4 rounded-2xl text-center border shadow-sm">
        <p className="text-[9px] font-black text-slate-400 uppercase">예상 수령액</p>
        <p className="text-2xl font-black text-indigo-600 italic">{result.toLocaleString()} 만원</p>
      </div>
    </div>
  );
};

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
  const [isBizToolOpen, setIsBizToolOpen] = useState(false);
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
    if (userInfo.role !== 'agent') fetchTeamData();
    setLoading(false);
  }

  async function fetchDailyData() {
    if (!userId) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data } = await supabase.from("daily_perf").select("*").eq("user_id", userId).eq("date", dateStr).maybeSingle();
    if (data) { setPerfInput(data); setIsTargetLocked(true); } 
    else { setPerfInput({ call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, edu_done: false }); setIsTargetLocked(false); }
  }

  const fetchTeamData = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data: users } = await supabase.from("users").select("id, name").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    if (users) setAgents(users.map(u => ({ ...u, performance: perfs?.find(p => p.user_id === u.id) })));
  };

  const handleSaveData = async () => {
    if (!userId) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { error } = await supabase.from("daily_perf").upsert({ user_id: userId, date: dateStr, ...perfInput });
    if (error) alert("저장 실패");
    else { alert("데이터와 교육 이수 현황이 저장되었습니다."); setIsTargetLocked(true); if (role !== 'agent') fetchTeamData(); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400">LOADING...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📟 [SIDEBAR] */}
      <aside className="w-full lg:w-80 bg-white border-b lg:border-r p-5 lg:p-6 flex flex-col gap-6 shadow-sm z-40">
        <h2 className="font-black text-xl lg:text-2xl italic border-b-4 border-black pb-1 uppercase">History</h2>
        <div className="border rounded-[2rem] overflow-hidden bg-white">
          <Calendar onChange={(d: any) => setSelectedDate(d)} value={selectedDate} formatDay={(_, date) => date.getDate().toString()} className="border-0 w-full text-sm" />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={()=>setSideTab('perf')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${sideTab === 'perf' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>실적 요약</button>
            <button onClick={()=>setSideTab('act')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${sideTab === 'act' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>활동 평균</button>
        </div>
        <div className="bg-slate-50 p-5 rounded-[2rem] border border-dashed border-slate-300">
            {sideTab === 'perf' ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-end"><span className="text-[10px] font-bold text-slate-400 uppercase italic">3M Avg Amt</span><span className="text-lg font-black italic">4,250만</span></div>
                    <div className="flex justify-between items-end"><span className="text-[10px] font-bold text-slate-400 uppercase italic">3M Avg Cnt</span><span className="text-lg font-black italic">12.5건</span></div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 text-center text-xs font-black">
                    <div className="p-3 bg-white rounded-2xl border border-slate-100"><p className="text-slate-400 uppercase text-[9px] mb-1">DB 배정</p>25</div>
                    <div className="p-3 bg-white rounded-2xl border border-slate-100"><p className="text-slate-400 uppercase text-[9px] mb-1">반품</p>3</div>
                </div>
            )}
        </div>
        <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">Sales Calculator</button>
      </aside>

      {/* 💎 [MAIN AREA] */}
      <main className="flex-1 p-4 lg:p-10 space-y-6 max-w-full lg:max-w-[1600px] mx-auto w-full">
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-white" />
          <QuickBtn label="보험사" url="https://www.e-insunet.co.kr" color="bg-white" />
          <QuickBtn label="보험금청구" url="https://www.sosclaim.co.kr" color="bg-white text-blue-600" />
          <QuickBtn label="자료실" url="#" color="bg-white text-slate-300" />
        </div>

        {(role === 'admin' || role === 'master') ? (
          /* 👑 [ADMIN VIEW] */
          <div className="space-y-6">
            <header className="flex justify-between items-end px-4">
                <h1 className="text-3xl font-black italic uppercase">Team Monitoring</h1>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="text-[10px] font-black border-2 border-black px-4 py-2 rounded-xl">LOGOUT</button>
            </header>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <TabBtn label="실적 관리" sub="Team Goal" onClick={()=>setActiveAdminPopup('perf')} />
              <TabBtn label="활동 관리" sub="DB Analysis" onClick={()=>setActiveAdminPopup('act')} />
              <TabBtn label="교육 현황" sub="Edu Status" onClick={()=>setActiveAdminPopup('edu')} />
              <TabBtn label="설정" sub="Settings" onClick={()=>setActiveAdminPopup('setting')} />
            </div>
            <section className="bg-white p-6 lg:p-8 rounded-[3rem] shadow-sm border">
                <h2 className="text-xl font-black uppercase italic mb-6 border-l-8 border-black pl-4">Agent Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {agents.map(a => (
                        <div key={a.id} onClick={()=>setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all shadow-sm">
                            <div className="flex justify-between mb-4">
                                <p className="font-black text-xl">{a.name} CA</p>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${a.performance?.edu_done ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {a.performance?.edu_done ? '교육완료' : '교육미이수'}
                                </span>
                            </div>
                            {a.performance ? <MiniBar label="달성률" val={Math.min((a.performance.contract_amt/a.performance.target_amt)*100, 100)} color="bg-black" /> : <p className="text-[10px] font-bold text-rose-400">데이터 없음</p>}
                        </div>
                    ))}
                </div>
            </section>
          </div>
        ) : (
          /* 👤 [AGENT VIEW] */
          <div className="max-w-3xl mx-auto space-y-6 lg:space-y-10">
            <header className="px-4 flex justify-between items-end">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{userName} CA</p>
                <h1 className="text-4xl font-black italic uppercase">My Report</h1>
              </div>
              <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="text-[10px] font-black border-2 border-black px-3 py-1.5 rounded-lg">LOGOUT</button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                <ProgCard label="목표 금액 (만원)" cur={perfInput.contract_amt} tar={perfInput.target_amt} unit="만원" color="text-indigo-600" isLocked={isTargetLocked} onChangeCur={(v)=>setPerfInput({...perfInput, contract_amt:v})} onChangeTar={(v)=>setPerfInput({...perfInput, target_amt:v})} />
                <ProgCard label="목표 건수 (건수)" cur={perfInput.contract_cnt} tar={perfInput.target_cnt} unit="건수" color="text-emerald-500" isLocked={isTargetLocked} onChangeCur={(v)=>setPerfInput({...perfInput, contract_cnt:v})} onChangeTar={(v)=>setPerfInput({...perfInput, target_cnt:v})} />
            </div>

            <div className="bg-white p-6 lg:p-10 rounded-[3rem] shadow-sm border">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-8 tracking-[0.3em] italic text-center">Activity Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                    <MetricInput label="전화" val={perfInput.call} onChange={(v)=>setPerfInput({...perfInput, call:v})} />
                    <MetricInput label="미팅" val={perfInput.meet} onChange={(v)=>setPerfInput({...perfInput, meet:v})} />
                    <MetricInput label="제안" val={perfInput.pt} onChange={(v)=>setPerfInput({...perfInput, pt:v})} />
                    <MetricInput label="소개" val={perfInput.intro} onChange={(v)=>setPerfInput({...perfInput, intro:v})} />
                    <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
                    <MetricInput label="반품" val={perfInput.db_returned} onChange={(v)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
                </div>
            </div>

            {/* 📚 [NEW: 직원용 교육 관리 섹션] */}
            <div className="bg-indigo-50 p-8 rounded-[3rem] border-2 border-indigo-100 space-y-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-lg">📚</div>
                  <h3 className="text-xl font-black italic uppercase text-indigo-900">Weekly Education</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-indigo-200">
                  <p className="text-xs font-black text-indigo-400 uppercase mb-2">이번 주 교육 주제</p>
                  <p className="text-lg font-bold text-slate-800 leading-snug">"신상품 암보험 비교 설명 및 거절 처리 화법 익히기"</p>
                </div>
                <div className="flex items-center justify-between bg-white/50 p-4 rounded-2xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={perfInput.edu_done} 
                      onChange={(e)=>setPerfInput({...perfInput, edu_done: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-2 border-indigo-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-base font-black text-indigo-900 uppercase italic">본인은 위 교육 내용을 완수하였습니다.</span>
                  </label>
                </div>
                <button onClick={handleSaveData} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase text-lg tracking-[0.3em] hover:bg-indigo-700 active:scale-95 transition-all shadow-xl">
                  Save All Data & Edu
                </button>
            </div>
          </div>
        )}
      </main>

      {/* ─── 🧱 [MODALS] ────────────────────────── */}
      {isBizToolOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-6 relative shadow-2xl border-2 border-black">
                <button onClick={()=>setIsBizToolOpen(false)} className="absolute top-8 right-8 font-black text-2xl">✕</button>
                <BusinessCalculator />
            </div>
        </div>
      )}
    </div>
  )
}

// ─── 📦 [SUB-COMPONENTS] ──────────────────────────
function QuickBtn({ label, color, url }: { label: string, color: string, url: string }) {
  return <button onClick={()=>{ if(url !== '#') window.open(url, "_blank"); }} className={`${color} border-2 border-black py-4 rounded-2xl font-black text-xs uppercase shadow-sm active:scale-95 transition-all`}>{label}</button>
}

function TabBtn({ label, sub, onClick }: { label: string, sub: string, onClick: () => void }) {
    return (
        <button onClick={onClick} className="bg-white border-2 border-black p-5 rounded-[2rem] text-center hover:bg-black group transition-all shadow-sm active:scale-95">
            <p className="text-sm font-black uppercase group-hover:text-[#d4af37] italic transition-colors">{label}</p>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{sub}</p>
        </button>
    )
}

function MiniBar({ label, val, color }: { label: string, val: number, color: string }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-black mb-1.5 uppercase text-slate-400"><span>{label}</span><span>{Math.floor(val)}%</span></div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${val}%` }} /></div>
    </div>
  )
}

function MetricInput({ label, val, onChange, color }: { label: string, val: number, onChange: (v: number) => void, color?: string }) {
  return (
    <div className="space-y-2 text-center">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-[2rem] font-black text-center text-xl outline-none ${color}`} />
    </div>
  )
}

function ProgCard({ label, cur, tar, unit, color, isLocked, onChangeCur, onChangeTar }: { 
    label: string, cur: number, tar: number, unit: string, color: string, isLocked: boolean,
    onChangeCur: (v: number) => void, onChangeTar: (v: number) => void 
}) {
    const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
    return (
        <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">{label}</p>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-300 uppercase ml-2">Target {isLocked && '🔒'}</p>
                    <input type="number" value={tar} disabled={isLocked} onChange={e=>onChangeTar(Number(e.target.value))} className={`w-full p-4 bg-slate-50 rounded-2xl font-black text-center border-2 outline-none text-xl ${isLocked ? 'opacity-50 bg-slate-100 border-transparent' : 'border-dashed border-slate-300 focus:border-black'}`} />
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-300 uppercase ml-2">Current</p>
                    <input type="number" value={cur} onChange={e=>onChangeCur(Number(e.target.value))} className={`w-full p-4 bg-slate-50 rounded-2xl font-black text-center border-2 border-transparent focus:border-black outline-none text-xl ${color}`} />
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-end font-black italic">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">{unit} Progress</span>
                    <span className="text-3xl text-slate-900">{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000`} style={{ width: `${pct}%` }} /></div>
            </div>
        </div>
    )
}