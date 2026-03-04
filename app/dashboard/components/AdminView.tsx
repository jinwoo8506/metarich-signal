"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 0, targetCnt: 0, targetIntro: 0 });
  
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { 
    fetchTeamData() 
  }, [monthKey]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'team_target_amt')?.value || 0),
      targetCnt: Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 0),
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value || 0),
    });

    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", monthKey);
    
    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
            call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
            contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10, 
            edu_status: "미참여", is_approved: false 
        }
      })));
    }
  }

  const handleApprove = async (agent: any) => {
    try {
      const { id, created_at, updated_at, ...purePerformance } = agent.performance;
      const { error } = await supabase.from("daily_perf").upsert({
        ...purePerformance,
        user_id: agent.id,
        date: monthKey,
        is_approved: true
      }, { onConflict: 'user_id, date' });

      if (error) throw error;
      alert(`${agent.name} CA의 목표를 승인했습니다.`);
      fetchTeamData();
    } catch (err: any) {
      alert("승인 오류: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 font-black">
      {/* 전사 공지 바 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 z-10 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      {/* 퀵링크 */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-5 rounded-[2.5rem] shadow-sm border font-black">
        <div className="flex items-center gap-2 font-black">
          <p className="text-lg font-black">{user.name} <span className="text-amber-600 italic">MANAGER</span></p>
        </div>
        <div className="flex flex-wrap gap-2 font-black">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="보험금청구" url="#" color="bg-slate-50" />
          <QuickBtn label="자료실" url="#" color="bg-slate-50" />
          <QuickBtn label="영업도구" color="bg-black text-[#d4af37]" onClick={() => setActiveTab('sys')} />
        </div>
      </div>

      {/* 관리 탭 메뉴 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-black">
        <TabBtn label="실적 관리" sub="Team Performance" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="Activity Funnel" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="Edu Attendance" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="시스템 설정" sub="Policy & Target" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 직원 현황 리스트 (그래프 추가됨) */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-xl font-black mb-6 border-l-8 border-black pl-4 uppercase font-black">{selectedDate.getMonth()+1}월 팀 실적 모니터링</h2>
        <div className="space-y-6 font-black">
          {agents.map(a => {
            const pct = a.performance.target_amt > 0 ? Math.min((a.performance.contract_amt / a.performance.target_amt) * 100, 100) : 0;
            return (
              <div key={a.id} 
                   onClick={() => setSelectedAgent(a)} 
                   className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all font-black">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6 mb-4 font-black">
                    <div className="w-36 shrink-0 font-black">
                      <p className="text-lg font-black">{a.name} CA</p>
                      <span className={`text-[10px] px-3 py-1 rounded-full uppercase tracking-tighter font-black ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-amber-100 text-amber-600'}`}>
                        {a.performance.is_approved ? '목표승인완료' : '승인대기중'}
                      </span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 font-black">
                        <DataBox label="목표액" val={`${a.performance.target_amt}만`} />
                        <DataBox label="실적액" val={`${a.performance.contract_amt}만`} color="text-indigo-600" />
                        <DataBox label="목표건" val={`${a.performance.target_cnt}건`} />
                        <DataBox label="실적건" val={`${a.performance.contract_cnt}건`} color="text-emerald-600" />
                    </div>
                    {!a.performance.is_approved && (
                      <button onClick={(e)=>{e.stopPropagation(); handleApprove(a);}} className="bg-black text-[#d4af37] px-8 py-4 rounded-[1.5rem] text-sm font-black italic shadow-lg active:scale-95 transition-all">목표 승인</button>
                    )}
                  </div>
                  {/* 시각적 막대 그래프 */}
                  <div className="relative w-full h-4 bg-white rounded-full border overflow-hidden font-black">
                    <div className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${pct}%` }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black italic">{pct.toFixed(1)}% ACHIEVED</span>
                  </div>
              </div>
            )
          })}
        </div>
      </section>

      {activeTab && <AdminPopups type={activeTab} agents={agents} teamMeta={teamMeta} onClose={() => {setActiveTab(null); fetchTeamData();}} />}
      
      {selectedAgent && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-black" onClick={()=>setSelectedAgent(null)}>
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 relative shadow-2xl font-black font-black" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setSelectedAgent(null)} className="absolute top-8 right-8 text-2xl font-black font-black">✕</button>
            <h3 className="text-2xl italic mb-8 border-b-4 border-black pb-2 inline-block uppercase font-black font-black">{selectedAgent.name} CA 상세</h3>
            <div className="grid grid-cols-2 gap-3 mb-8 text-center font-black">
                <div className="bg-slate-50 p-6 rounded-3xl border font-black font-black"><p className="text-[10px] text-slate-400 mb-1 font-black uppercase">Call</p><p className="text-3xl font-black italic">{selectedAgent.performance?.call || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black font-black"><p className="text-[10px] text-slate-400 mb-1 font-black uppercase">Meet</p><p className="text-3xl font-black italic">{selectedAgent.performance?.meet || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black font-black"><p className="text-[10px] text-slate-400 mb-1 font-black uppercase">PT</p><p className="text-3xl font-black italic">{selectedAgent.performance?.pt || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black font-black"><p className="text-[10px] text-slate-400 mb-1 font-black uppercase">Intro</p><p className="text-3xl font-black italic">{selectedAgent.performance?.intro || 0}</p></div>
            </div>
            <div className="bg-slate-900 text-[#d4af37] p-8 rounded-[2.5rem] flex justify-between items-center font-black">
              <span className="text-xs uppercase font-black tracking-widest italic font-black font-black">Monthly DB Status</span>
              <span className="text-2xl font-black italic font-black">반품 {selectedAgent.performance?.db_returned || 0} / 배정 {selectedAgent.performance?.db_assigned || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2rem] text-center transition-all shadow-sm font-black`}><p className="text-sm font-black italic">{label}</p><p className="text-[9px] font-bold opacity-40 mt-1 uppercase tracking-tighter font-black">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0 font-black`}>{label}</button> }
function DataBox({ label, val, color = "text-black" }: any) { return <div className="bg-white p-3 rounded-2xl border text-center font-black"><p className="text-[9px] text-slate-400 font-black">{label}</p><p className={`text-sm font-black ${color}`}>{val}</p></div> }