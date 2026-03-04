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
  
  // 날짜 키 생성 (YYYY-MM-01)
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { 
    fetchTeamData() 
  }, [monthKey]);

  async function fetchTeamData() {
    // 1. 팀 설정 로드
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "등록된 공지가 없습니다.");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'team_target_amt')?.value || 0),
      targetCnt: Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 0),
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value || 0),
    });

    // 2. 직원 목록 및 실적 데이터 조인 로드
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

  // 관리자 승인 (목표 고정)
  const handleApprove = async (agent: any) => {
    try {
      const { id, created_at, ...purePerformance } = agent.performance;
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
      alert("승인 처리 중 오류: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 font-black">
      {/* 상단 공지 바 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 z-10 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      {/* 퀵링크 탭 (영업도구 기능 연결) */}
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

      {/* 관리 4대 탭 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-black">
        <TabBtn label="실적 관리" sub="월간 생산성" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="월간 퍼널 분석" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="월간 출결 현황" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="지침 설정" sub="목표/교육/공지" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 메인 모니터링 리스트 */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-xl font-black mb-6 border-l-8 border-black pl-4 uppercase font-black">{selectedDate.getMonth()+1}월 팀 실적 현황</h2>
        <div className="space-y-4 font-black">
          {agents.map(a => (
            <div key={a.id} 
                 onClick={() => setSelectedAgent(a)} 
                 className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer flex flex-col lg:flex-row lg:items-center gap-6 transition-all font-black">
                <div className="w-36 shrink-0 font-black">
                  <p className="text-lg font-black">{a.name} CA</p>
                  <span className={`text-[10px] px-3 py-1 rounded-full uppercase tracking-tighter font-black ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-amber-100 text-amber-600 border border-amber-200'}`}>
                    {a.performance.is_approved ? '목표확정' : '승인대기'}
                  </span>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 font-black">
                    <DataBox label="달성액" val={`${a.performance.contract_amt}만`} />
                    <DataBox label="달성건" val={`${a.performance.contract_cnt}건`} />
                    <DataBox label="DB배정" val={a.performance.db_assigned} />
                    <DataBox label="교육상태" val={a.performance.edu_status} />
                </div>
                {!a.performance.is_approved && (
                  <button onClick={(e)=>{e.stopPropagation(); handleApprove(a);}} className="bg-black text-[#d4af37] px-8 py-4 rounded-[1.5rem] text-sm font-black italic shadow-lg active:scale-95 transition-all">승인하기</button>
                )}
            </div>
          ))}
        </div>
      </section>

      {/* 통합 팝업 시스템 */}
      {activeTab && (
        <AdminPopups 
          type={activeTab} 
          agents={agents} 
          teamMeta={teamMeta} 
          onClose={() => {setActiveTab(null); fetchTeamData();}} 
        />
      )}
      
      {/* 개별 상세 팝업 */}
      {selectedAgent && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-black" onClick={()=>setSelectedAgent(null)}>
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 relative shadow-2xl font-black" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setSelectedAgent(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
            <h3 className="text-2xl italic mb-8 border-b-4 border-black pb-2 inline-block uppercase font-black">{selectedAgent.name} CA 상세 리포트</h3>
            <div className="grid grid-cols-2 gap-3 mb-8 text-center font-black">
                <div className="bg-slate-50 p-6 rounded-3xl border font-black"><p className="text-[10px] text-slate-400 mb-1 font-black uppercase">Call</p><p className="text-3xl font-black italic">{selectedAgent.performance?.call || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black"><p className="text-[10px] text-slate-400 mb-1 uppercase">Meet</p><p className="text-3xl font-black italic">{selectedAgent.performance?.meet || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black"><p className="text-[10px] text-slate-400 mb-1 uppercase">PT</p><p className="text-3xl font-black italic">{selectedAgent.performance?.pt || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black"><p className="text-[10px] text-slate-400 mb-1 uppercase">Intro</p><p className="text-3xl font-black italic">{selectedAgent.performance?.intro || 0}</p></div>
            </div>
            <div className="bg-slate-900 text-[#d4af37] p-8 rounded-[2.5rem] flex justify-between items-center font-black">
              <span className="text-xs uppercase font-black tracking-widest italic font-black">Total DB Status</span>
              <span className="text-2xl font-black italic font-black">반품 {selectedAgent.performance?.db_returned || 0} / 배정 {selectedAgent.performance?.db_assigned || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2rem] text-center transition-all shadow-sm font-black`}><p className="text-sm font-black italic">{label}</p><p className="text-[9px] font-bold opacity-40 mt-1 uppercase tracking-tighter">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0 font-black`}>{label}</button> }
function DataBox({ label, val }: any) { return <div className="bg-white p-3 rounded-2xl border text-center font-black font-black"><p className="text-[9px] text-slate-400 font-black">{label}: {val}</p></div> }