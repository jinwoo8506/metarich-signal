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
interface PerformanceData {
  call: number;
  meet: number;
  pt: number;
  intro: number;
  db_assigned: number;
  db_returned: number;
  contract_cnt: number;
  contract_amt: number;
  target_cnt: number;
  target_amt: number;
}

interface Agent {
  id: string;
  name: string;
  performance?: PerformanceData;
}

// ─── 🧮 [COMPONENTS: CALCULATORS] ──────────────────────────
const CompoundInterestCalc = () => {
  const [p, setP] = useState(100);
  const [r, setR] = useState(5);
  const [t, setT] = useState(10);
  const res = Math.floor(p * Math.pow(1 + r/100, t));
  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-2xl">
      <h4 className="font-black text-[10px] uppercase italic">복리 계산기 (만기액)</h4>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={p} onChange={e=>setP(Number(e.target.value))} className="p-2 rounded-lg border text-center font-bold text-xs" />
        <input type="number" value={r} onChange={e=>setR(Number(e.target.value))} className="p-2 rounded-lg border text-center font-bold text-xs" />
        <input type="number" value={t} onChange={e=>setT(Number(e.target.value))} className="p-2 rounded-lg border text-center font-bold text-xs" />
      </div>
      <p className="text-center font-black text-lg text-indigo-600">{res.toLocaleString()} 만원</p>
    </div>
  );
};

export default function IntegratedBusinessDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── [STATE: UI & DATA] ──────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [adminNotice, setAdminNotice] = useState("이번 달 목표 달성을 위해 화이팅합시다! 실적 입력은 매일 오후 6시까지 완료해 주세요.");
  const [activeAdminPopup, setActiveAdminPopup] = useState<string | null>(null);
  const [isBizToolOpen, setIsBizToolOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const [perfInput, setPerfInput] = useState<PerformanceData>({
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
    
    if (userInfo.role === 'admin' || userInfo.role === 'master') {
      const { data: teamData } = await supabase.from("users").select("id, name").eq("role", "agent");
      if (teamData) {
        setAgents(teamData.map(a => ({ 
            ...a, 
            performance: { call: 20, meet: 8, pt: 4, intro: 2, db_assigned: 15, db_returned: 2, contract_cnt: 5, contract_amt: 250, target_cnt: 10, target_amt: 300 } 
        })));
      }
    }
    setLoading(false);
  }

  const handleSaveData = async () => {
    if (!userId) return;
    const { error } = await supabase.from("daily_perf").upsert({
      user_id: userId,
      date: selectedDate.toISOString().split('T')[0],
      ...perfInput
    });
    if (error) alert("저장 실패: " + error.message);
    else alert("기록이 성공적으로 저장되었습니다.");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse uppercase">Syncing System...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      
      {/* 📟 [SIDEBAR] */}
      <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm">
        <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter text-center lg:text-left">History</h2>
        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
          <Calendar 
            onChange={(d: any) => setSelectedDate(d)} 
            value={selectedDate} 
            formatDay={(_, date) => date.getDate().toString()} 
            className="border-0 w-full" 
          />
        </div>
        <button onClick={() => setIsBizToolOpen(true)} className="w-full bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] transition-all">Sales Tools</button>
        
        <div className="bg-blue-50/50 p-5 rounded-3xl border shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2 tracking-widest">Admin Comment</p>
          <textarea 
            readOnly={role === 'agent'} 
            value={adminNotice} 
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotice(e.target.value)}
            className="w-full bg-transparent text-xs font-bold outline-none resize-none h-20 text-slate-700 leading-relaxed" 
            placeholder="관리자 코멘트가 없습니다." 
          />
        </div>
      </aside>

      {/* 💎 [MAIN AREA] */}
      <main className="flex-1 p-4 lg:p-10 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* 1. Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-white" />
          <QuickBtn label="보험사" url="https://www.e-insunet.co.kr" color="bg-white" />
          <QuickBtn label="보험금청구" url="https://www.sosclaim.co.kr" color="bg-white text-blue-600" />
          <QuickBtn label="자료실" url="#" color="bg-white text-slate-300" />
        </div>

        {/* 2. Scrolling Notice */}
        <section className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-lg flex items-center gap-6 overflow-hidden relative">
            <div className="bg-[#d4af37] text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic z-10 shadow-lg shrink-0">Notice</div>
            <div className="flex-1 overflow-hidden relative h-6">
                <div className="whitespace-nowrap animate-marquee font-bold text-sm tracking-tight absolute">
                    {adminNotice || "이번 달 주요 전달 사항을 확인해 주세요."}
                </div>
            </div>
        </section>

        {/* 3. Role-based Dashboard */}
        {(role === 'admin' || role === 'master') ? (
          <div className="space-y-6 animate-in fade-in">
            <header className="flex justify-between items-end px-4">
                <h1 className="text-3xl font-black italic uppercase">Manager View</h1>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="text-[10px] font-black bg-black text-white px-4 py-2 rounded-xl">LOGOUT</button>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <TabBtn label="실적 관리" sub="목표대비 82%" onClick={()=>setActiveAdminPopup('perf')} />
              <TabBtn label="활동 관리" sub="DB 전환율 분석" onClick={()=>setActiveAdminPopup('act')} />
              <TabBtn label="교육 관리" sub="주차별 리스트" onClick={()=>setActiveAdminPopup('edu')} />
              <TabBtn label="시스템 설정" sub="목표/교육 수정" onClick={()=>setActiveAdminPopup('setting')} />
            </div>

            <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase italic mb-6 border-l-8 border-black pl-4">Team Monitoring</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map(a => (
                        <div key={a.id} onClick={()=>setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-black cursor-pointer transition-all shadow-sm">
                            <div className="flex justify-between mb-4">
                                <p className="font-black text-lg">{a.name} CA</p>
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
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <header className="flex justify-between items-center px-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{userName} CA</p>
                  <h1 className="text-3xl font-black italic uppercase">Performance</h1>
                </div>
                <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="px-5 py-2 border-2 border-black rounded-xl text-[10px] font-black hover:bg-black hover:text-[#d4af37] transition-all">LOGOUT</button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ProgCard 
                  label="Amount (만원)" cur={perfInput.contract_amt} tar={perfInput.target_amt} unit="만" color="text-indigo-600" 
                  onChangeCur={(v: number)=>setPerfInput({...perfInput, contract_amt:v})} 
                  onChangeTar={(v: number)=>setPerfInput({...perfInput, target_amt:v})} 
                />
                <ProgCard 
                  label="Contracts (건수)" cur={perfInput.contract_cnt} tar={perfInput.target_cnt} unit="건" color="text-emerald-500" 
                  onChangeCur={(v: number)=>setPerfInput({...perfInput, contract_cnt:v})} 
                  onChangeTar={(v: number)=>setPerfInput({...perfInput, target_cnt:v})} 
                />
            </div>

            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100">
                <h3 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-[0.2em] italic text-center">Activity Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <MetricInput label="전화" val={perfInput.call} onChange={(v: number)=>setPerfInput({...perfInput, call:v})} />
                    <MetricInput label="미팅" val={perfInput.meet} onChange={(v: number)=>setPerfInput({...perfInput, meet:v})} />
                    <MetricInput label="제안" val={perfInput.pt} onChange={(v: number)=>setPerfInput({...perfInput, pt:v})} />
                    <MetricInput label="소개/도입" val={perfInput.intro} onChange={(v: number)=>setPerfInput({...perfInput, intro:v})} />
                    <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v: number)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
                    <MetricInput label="반품" val={perfInput.db_returned} onChange={(v: number)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
                </div>
                <button onClick={handleSaveData} className="w-full mt-10 bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] hover:bg-slate-800 shadow-2xl transition-all">Save Daily Data</button>
            </div>
          </div>
        )}
      </main>

      {/* ─── 🧱 [MODALS: ADMIN POPUPS] ────────────────────────── */}
      {activeAdminPopup && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] p-10 relative overflow-y-auto max-h-[90vh] shadow-2xl">
            <button onClick={()=>setActiveAdminPopup(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
            
            {activeAdminPopup === 'perf' && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black italic uppercase border-b-4 border-black inline-block">Performance Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-slate-50 p-6 rounded-3xl h-[350px]">
                            <Bar 
                              data={{ 
                                labels: ['목표 건수', '현재 건수', '목표 금액', '현재 금액'], 
                                datasets: [{ label: '팀 전체 실적', data: [100, 82, 5000, 4100], backgroundColor: ['#eee', '#000', '#eee', '#d4af37'] }] 
                              }} 
                              options={{ maintainAspectRatio: false }} 
                            />
                        </div>
                        <div className="space-y-6 flex flex-col justify-center">
                            <StatBox label="전체 달성률" val="82%" sub="지난 달 대비 5% 상승" />
                            <StatBox label="팀 평균 실적" val="410 만원" sub="인당 평균 금액" />
                        </div>
                    </div>
                </div>
            )}

            {activeAdminPopup === 'act' && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black italic uppercase border-b-4 border-blue-600 inline-block">Activity Flow</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-slate-50 p-6 rounded-3xl h-[300px] flex items-center justify-center">
                            <Pie data={{ labels: ['정상DB', '반품'], datasets: [{ data: [85, 15], backgroundColor: ['#000', '#ff4d4d'] }] }} />
                        </div>
                        <div className="bg-slate-50 p-6 rounded-3xl h-[300px]">
                            <Line 
                              data={{ 
                                labels: ['CALL', 'MEET', 'PT', 'INTRO'], 
                                datasets: [{ label: '활동 전환율', data: [100, 45, 25, 12], borderColor: '#000', tension: 0.4, fill: true, backgroundColor: 'rgba(0,0,0,0.05)' }] 
                              }} 
                              options={{ maintainAspectRatio: false }} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeAdminPopup === 'edu' && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black italic uppercase border-b-4 border-black inline-block text-center">Education & Lists</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b-2 border-black uppercase text-[10px] font-black">
                                <tr><th className="py-4">주차</th><th className="py-4">교육 주제</th><th className="py-4">이수율</th><th className="py-4">공지 확인</th><th className="py-4">상태</th></tr>
                            </thead>
                            <tbody className="text-sm font-bold">
                                {[1,2,3,4].map(w => (
                                    <tr key={w} className="border-b hover:bg-slate-50">
                                        <td className="py-4">{w}주차</td>
                                        <td className="py-4">신상품 암보험 셀링 포인트</td>
                                        <td className="py-4 font-black">{95 - w*3}%</td>
                                        <td className="py-4">90%</td>
                                        <td className="py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px]">COMPLETED</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeAdminPopup === 'setting' && (
                <div className="space-y-8">
                    <h3 className="text-3xl font-black italic uppercase border-b-4 border-black inline-block">System Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4 border">
                            <p className="font-black text-xs uppercase text-slate-400">팀 전체 목표 설정</p>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold">전체 목표 금액 (만원)</label>
                                <input className="w-full p-4 rounded-2xl border-2 focus:border-black outline-none font-black" defaultValue="5000" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold">전체 목표 건수</label>
                                <input className="w-full p-4 rounded-2xl border-2 focus:border-black outline-none font-black" defaultValue="100" />
                            </div>
                            <button className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase text-xs">Update Target</button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 🧱 [MODALS: BIZ TOOLS] ────────────────────────── */}
      {isBizToolOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-6 relative shadow-2xl">
                <button onClick={()=>setIsBizToolOpen(false)} className="absolute top-6 right-6 font-black text-xl">✕</button>
                <h3 className="text-xl font-black italic uppercase border-b-2 border-black pb-2 text-center">Business Calculators</h3>
                <CompoundInterestCalc />
                <div className="p-4 bg-slate-50 rounded-2xl border">
                    <h4 className="font-black text-[10px] uppercase italic mb-2">인플레이션 가치</h4>
                    <p className="text-[11px] text-slate-500 font-bold leading-tight">물가상승률 3% 가정 시 현재 1억원의 20년 후 가치: <span className="text-rose-500 font-black italic">5,436만원</span></p>
                </div>
                <div className="p-4 bg-slate-900 text-white rounded-2xl">
                    <h4 className="font-black text-[10px] uppercase italic mb-2 text-[#d4af37]">TAX 정보</h4>
                    <p className="text-[10px] font-bold opacity-80">개인사업자 종합소득세 간이 계산기 업데이트 예정...</p>
                </div>
            </div>
        </div>
      )}

      {/* ─── 🧱 [MODAL: AGENT DETAIL VIEW] ────────────────────────── */}
      {selectedAgent && (
        <div className="fixed inset-0 z-[210] bg-black/90 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative shadow-2xl">
                <button onClick={()=>setSelectedAgent(null)} className="absolute top-8 right-8 font-black text-xl">✕</button>
                <div className="space-y-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-[#d4af37] font-black text-2xl italic">
                          {selectedAgent.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black italic uppercase">{selectedAgent.name} CA Detail</h2>
                            <p className="text-xs font-bold text-slate-400">Current Month Activity Analytics</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <StatItem label="CALL" val={selectedAgent.performance?.call} />
                        <StatItem label="MEET" val={selectedAgent.performance?.meet} />
                        <StatItem label="PT" val={selectedAgent.performance?.pt} />
                        <StatItem label="INTRO" val={selectedAgent.performance?.intro} />
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Database Status</p>
                        <div className="flex justify-between items-end border-b pb-4">
                            <span className="font-bold text-slate-600">배정 DB 건수</span>
                            <span className="font-black text-xl text-blue-600">{selectedAgent.performance?.db_assigned} 건</span>
                        </div>
                        <div className="flex justify-between items-end border-b pb-4">
                            <span className="font-bold text-slate-600">반품 DB 건수</span>
                            <span className="font-black text-xl text-rose-500">{selectedAgent.performance?.db_returned} 건</span>
                        </div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="font-bold text-slate-600 uppercase">DB Loss Rate</span>
                            <span className="font-black text-2xl italic">
                              {selectedAgent.performance?.db_assigned ? ((selectedAgent.performance.db_returned / selectedAgent.performance.db_assigned) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ─── 🎨 [CSS ANIMATIONS] ────────────────────────── */}
      <style jsx global>{`
        @keyframes marquee { 0% { left: 100%; } 100% { left: -100%; } }
        .animate-marquee { animation: marquee 25s linear infinite; }
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 10px; font-weight: 900; }
        .react-calendar__navigation button:enabled:hover { background-color: #f8fafc; border-radius: 10px; }
      `}</style>
    </div>
  )
}

// ─── 📦 [SUB-COMPONENTS] ──────────────────────────

function QuickBtn({ label, color, url }: { label: string; color: string; url: string }) {
    const handleNav = () => {
        if (!url || url === "#") { alert("해당 자료는 준비 중입니다."); return; }
        window.open(url, "_blank", "noopener,noreferrer");
    };
    return (
        <button onClick={handleNav} className={`${color} border-2 border-black py-4 rounded-2xl font-black text-[11px] uppercase shadow-sm hover:bg-black hover:text-[#d4af37] transition-all active:scale-95`}>
            {label}
        </button>
    )
}

function TabBtn({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="bg-white border-2 border-black p-6 rounded-[2.5rem] text-center hover:bg-black group transition-all shadow-sm">
            <p className="text-sm font-black uppercase group-hover:text-[#d4af37] italic transition-colors">{label}</p>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase group-hover:text-slate-500">{sub}</p>
        </button>
    )
}

function MiniBar({ label, val, color }: { label: string; val: number; color: string }) {
    return (
        <div className="w-full">
            <div className="flex justify-between text-[8px] font-black mb-1 uppercase text-slate-400"><span>{label}</span><span>{val}%</span></div>
            <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border"><div className={`h-full ${color}`} style={{ width: `${val}%` }} /></div>
        </div>
    )
}

function MetricInput({ label, val, onChange, color }: { label: string; val: number; onChange: (v: number) => void; color?: string }) {
    return (
        <div className="space-y-2 text-center">
            <label className="text-[10px] font-black text-slate-300 uppercase">{label}</label>
            <input 
              type="number" 
              value={val || ''} 
              onChange={e=>onChange(Number(e.target.value))} 
              className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl font-black text-center text-xl outline-none transition-all ${color}`} 
            />
        </div>
    )
}

function ProgCard({ label, cur, tar, unit, color, onChangeCur, onChangeTar }: { 
    label: string; cur: number; tar: number; unit: string; color: string; 
    onChangeCur: (v: number) => void; onChangeTar: (v: number) => void 
}) {
    const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
    return (
        <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{label}</p>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-300 uppercase ml-2">Target</p>
                    <input type="number" value={tar} onChange={e=>onChangeTar(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center border-2 border-transparent focus:border-slate-200 outline-none" />
                </div>
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-300 uppercase ml-2">Current</p>
                    <input type="number" value={cur} onChange={e=>onChangeCur(Number(e.target.value))} className={`w-full p-4 bg-slate-50 rounded-2xl font-black text-center border-2 border-transparent focus:border-black outline-none ${color}`} />
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-end font-black px-2">
                    <span className="text-[9px] text-slate-400 uppercase">{unit} 달성률</span>
                    <span className="text-3xl italic">{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                </div>
            </div>
        </div>
    )
}

function StatBox({ label, val, sub }: { label: string; val: string; sub: string }) {
    return (
        <div className="p-6 bg-slate-50 rounded-3xl border shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className="text-3xl font-black italic">{val}</p>
            <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">{sub}</p>
        </div>
    )
}

function StatItem({ label, val }: { label: string; val: any }) {
    return (
        <div className="bg-slate-50 p-4 rounded-2xl text-center border shadow-sm hover:border-black transition-all">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className="text-lg font-black italic">{val || 0}</p>
        </div>
    )
}