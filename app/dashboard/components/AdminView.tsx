"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null); // 직원 팝업용
  const [globalNotice, setGlobalNotice] = useState("");
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 0, targetCnt: 0, targetIntro: 0 });
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  useEffect(() => { fetchTeamData() }, [selectedDate]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'team_target_amt')?.value || 0),
      targetCnt: Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 0),
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value || 0),
    });

    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    
    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_amt: 0, contract_cnt: 0, target_amt: 0, target_cnt: 0, is_approved: false, edu_status: "미참여" }
      })));
    }
  }

  const handleApprove = async (agentId: string) => {
    const { error } = await supabase.from("daily_perf").update({ is_approved: true }).eq("user_id", agentId).eq("date", dateStr);
    if (!error) {
      alert("실적이 승인되었습니다.");
      fetchTeamData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 font-black">
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 z-10">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-black">{globalNotice}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TabBtn label="실적 관리" sub="팀 전체 목표/진행율" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="통계 및 DB반품율" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="참석여부 유지" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="목표 설정" sub="공지 및 도입목표수정" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm">
        <h2 className="text-xl font-black mb-6 border-l-8 border-black pl-4">직원 실적 모니터링</h2>
        <div className="space-y-4">
          {agents.map(a => (
            <div key={a.id} onClick={() => setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer flex flex-col lg:flex-row lg:items-center gap-6 transition-all">
                <div className="w-32 shrink-0">
                  <p className="text-lg">{a.name} CA</p>
                  <span className={`text-[9px] px-2 py-1 rounded-full ${a.performance.is_approved ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-600'}`}>
                    {a.performance.is_approved ? '승인완료' : '승인대기'}
                  </span>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-2xl border text-center">
                    <p className="text-[8px] text-slate-400">금액: {a.performance.contract_amt}만</p>
                    <p className="text-[8px] text-slate-300">목표: {a.performance.target_amt}만</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border text-center">
                    <p className="text-[8px] text-slate-400">건수: {a.performance.contract_cnt}건</p>
                    <p className="text-[8px] text-slate-300">목표: {a.performance.target_cnt}건</p>
                  </div>
                </div>
                {!a.performance.is_approved && (
                  <button onClick={(e)=>{e.stopPropagation(); handleApprove(a.id);}} className="bg-black text-[#d4af37] px-8 py-4 rounded-[1.5rem] text-sm font-black italic">승인하기</button>
                )}
            </div>
          ))}
        </div>
      </section>

      {/* 관리자 전체 팝업 */}
      {activeTab && <AdminPopups type={activeTab} agents={agents} teamMeta={teamMeta} onClose={() => {setActiveTab(null); fetchTeamData();}} />}
      
      {/* 개별 직원 활동내용 팝업 (수정됨) */}
      {selectedAgent && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-black" onClick={()=>setSelectedAgent(null)}>
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 relative shadow-2xl" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setSelectedAgent(null)} className="absolute top-8 right-8 text-2xl">✕</button>
            <h3 className="text-2xl italic mb-8 border-b-4 border-black pb-2 inline-block uppercase">{selectedAgent.name} ACTIVITY</h3>
            <div className="grid grid-cols-2 gap-3 mb-8 text-center">
                <div className="bg-slate-50 p-5 rounded-2xl border"><p className="text-[10px] text-slate-400 mb-1">전화</p><p className="text-2xl">{selectedAgent.performance?.call || 0}</p></div>
                <div className="bg-slate-50 p-5 rounded-2xl border"><p className="text-[10px] text-slate-400 mb-1">만남</p><p className="text-2xl">{selectedAgent.performance?.meet || 0}</p></div>
                <div className="bg-slate-50 p-5 rounded-2xl border"><p className="text-[10px] text-slate-400 mb-1">제안</p><p className="text-2xl">{selectedAgent.performance?.pt || 0}</p></div>
                <div className="bg-slate-50 p-5 rounded-2xl border"><p className="text-[10px] text-slate-400 mb-1">소개</p><p className="text-2xl">{selectedAgent.performance?.intro || 0}</p></div>
            </div>
            <div className="bg-slate-900 text-[#d4af37] p-6 rounded-3xl flex justify-between items-center">
              <span className="text-xs">DB 반품 실적</span>
              <span className="text-xl">배정 {selectedAgent.performance?.db_assigned || 0} / 반품 {selectedAgent.performance?.db_returned || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2rem] text-center transition-all shadow-sm`}><p className="text-sm font-black italic">{label}</p><p className="text-[9px] font-bold opacity-40 mt-1 uppercase">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-4 py-2 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0`}>{label}</button> }