"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [teamTotals, setTeamTotals] = useState({ amt: 0, cnt: 0, call: 0 });

  useEffect(() => { fetchTeamData() }, [selectedDate]);

  async function fetchTeamData() {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    const { data: settings } = await supabase.from("team_settings").select("*");
    
    const gTarAmt = Number(settings?.find(s => s.key === 'team_target_amt')?.value || 300);
    const gTarCnt = Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 10);

    if (users) {
      const merged = users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_amt: 0, contract_cnt: 0, edu_status: "미참여" },
        target_amt: gTarAmt,
        target_cnt: gTarCnt
      }));
      setAgents(merged);
      
      // 전체 직원의 데이터를 합산한 팀 전체 실적 계산
      setTeamTotals({
        amt: merged.reduce((s, a) => s + a.performance.contract_amt, 0),
        cnt: merged.reduce((s, a) => s + a.performance.contract_cnt, 0),
        call: merged.reduce((s, a) => s + a.performance.call, 0)
      });
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 관리자 퀵링크 및 정보 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#d4af37] rounded-full flex items-center justify-center text-black font-black italic">M</div>
          <p className="font-black text-lg">{user.name} <span className="text-amber-600 font-bold">관리자님</span> 환영합니다.</p>
        </div>
        <div className="flex gap-2">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="공지·시스템" onClick={() => setActiveTab('sys')} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 실적 요약 (전체 직원의 데이터 합계) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TabBtn label="실적 관리" sub={`합계: ${teamTotals.amt}만`} active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub={`통합 CALL: ${teamTotals.call}`} active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="참석여부 확인" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="시스템 설정" sub="팀 목표 및 공지" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 직원 리스트 (목표 및 실적 즉시 노출) */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm">
        <h2 className="text-xl font-black mb-6 border-l-8 border-black pl-4 uppercase">직원 활동 현황</h2>
        <div className="space-y-3">
          {agents.map(a => (
            <div key={a.id} onClick={() => setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2rem] hover:border-black border-2 border-transparent transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="w-32 shrink-0">
                  <p className="font-black text-lg">{a.name} CA</p>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full ${a.performance.edu_status === '참여' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>교육 {a.performance.edu_status}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-black mb-1">
                    <span>금액 실적: {a.performance.contract_amt} / {a.target_amt}만</span>
                    <span>건수: {a.performance.contract_cnt} / {a.target_cnt}건</span>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden border">
                    <div className="h-full bg-black" style={{ width: `${(a.performance.contract_amt/a.target_amt)*100}%` }} />
                  </div>
                </div>
                <div className="flex gap-4 shrink-0 font-black text-xs text-center border-l border-dashed pl-6">
                  <div><p className="text-[8px] text-slate-400 uppercase">Call</p><p>{a.performance.call}</p></div>
                  <div><p className="text-[8px] text-slate-400 uppercase">Meet</p><p>{a.performance.meet}</p></div>
                </div>
            </div>
          ))}
        </div>
      </section>

      {activeTab && <AdminPopups type={activeTab} agents={agents} teamTotals={teamTotals} onClose={() => {setActiveTab(null); fetchTeamData();}} />}
      {selectedAgent && <AgentDetailPopup agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2rem] text-center transition-all shadow-sm`}><p className="text-sm font-black italic">{label}</p><p className="text-[9px] font-bold opacity-40 mt-1 uppercase">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url ? window.open(url, "_blank") : onClick()} className={`${color} px-5 py-3 rounded-2xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:scale-105`}>{label}</button> }

function AgentDetailPopup({ agent, onClose }: any) {
  const p = agent.performance;
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 relative shadow-2xl overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-8 right-8 text-2xl">✕</button>
        <h3 className="text-3xl italic mb-8">{agent.name} 상세 활동 데이터</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatBox label="전화" val={p.call} unit="회" />
            <StatBox label="만남" val={p.meet} unit="회" />
            <StatBox label="제안" val={p.pt} unit="회" />
            <StatBox label="소개" val={p.intro} unit="명" />
        </div>
        <div className="p-6 bg-slate-50 rounded-2xl border space-y-3">
            <p className="text-xs text-slate-400">DB 배정/반품 내역</p>
            <div className="flex justify-between items-center text-xl">
                <span>배정 {p.db_assigned}</span>
                <span className="text-rose-500">반품 {p.db_returned}</span>
            </div>
        </div>
      </div>
    </div>
  )
}
function StatBox({ label, val, unit }: any) { return <div className="bg-slate-50 p-4 rounded-2xl border text-center font-black"><p className="text-[9px] text-slate-400 mb-1">{label}</p><p className="text-xl">{val}<span className="text-[10px] ml-1">{unit}</span></p></div> }