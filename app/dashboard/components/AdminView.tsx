"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);

  useEffect(() => { fetchTeamData() }, [selectedDate]);

  async function fetchTeamData() {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    const { data: settings } = await supabase.from("team_settings").select("*");
    
    // 관리자가 설정한 팀 공통 목표 로드
    const gTarAmt = Number(settings?.find(s => s.key === 'team_target_amt')?.value || 300);
    const gTarCnt = Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 10);

    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
          contract_amt: 0, contract_cnt: 0, edu_status: "미참여" 
        },
        target_amt: gTarAmt,
        target_cnt: gTarCnt
      })));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 관리자 상단 정보 및 퀵링크 (공통) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#d4af37] rounded-full flex items-center justify-center text-black font-black italic">M</div>
          <p className="font-black text-lg">{user.name} <span className="text-amber-600">관리자님</span> 환영합니다.</p>
        </div>
        <div className="flex gap-2">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="공지사항" onClick={() => setActiveTab('sys')} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 4대 관리 탭 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TabBtn label="실적 관리" sub="팀 전체 달성률" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="데이터 및 전환율" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="참석여부 체크" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="시스템 설정" sub="목표 및 일정수정" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 직원별 실시간 현황 (목표/실적 즉시 노출) */}
      <section className="bg-white p-8 rounded-[3.5rem] shadow-sm border">
        <h2 className="text-xl font-black mb-8 border-l-8 border-black pl-4 italic uppercase">팀원 활동 모니터링</h2>
        <div className="space-y-4">
          {agents.map(a => {
            const amtPct = Math.min((a.performance.contract_amt / a.target_amt) * 100, 100);
            return (
              <div key={a.id} onClick={() => setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2.5rem] hover:border-black border-2 border-transparent transition-all cursor-pointer group">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="w-32 shrink-0">
                    <p className="font-black text-lg group-hover:italic">{a.name} CA</p>
                    <p className={`text-[9px] font-black uppercase ${a.performance.edu_status === '참여' ? 'text-indigo-600' : 'text-slate-400'}`}>교육: {a.performance.edu_status}</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-[10px] font-black">
                      <span>목표: {a.target_amt}만 / 현재: {a.performance.contract_amt}만</span>
                      <span>{amtPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 bg-white rounded-full overflow-hidden border">
                      <div className="h-full bg-black transition-all duration-1000" style={{ width: `${amtPct}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-4 shrink-0 font-black text-xs text-center border-l border-dashed pl-6 border-slate-300">
                    <div className="w-12"><p className="text-[8px] text-slate-400">금액</p><p>{a.performance.contract_amt}만</p></div>
                    <div className="w-12"><p className="text-[8px] text-slate-400">건수</p><p>{a.performance.contract_cnt}/{a.target_cnt}</p></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {activeTab && <AdminPopups type={activeTab} agents={agents} onClose={() => {setActiveTab(null); fetchTeamData();}} />}
      {selectedAgent && <AgentDetailPopup agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2.5rem] text-center transition-all shadow-sm`}>
      <p className="text-sm font-black italic">{label}</p>
      <p className="text-[9px] font-bold opacity-40 mt-1 uppercase tracking-tighter">{sub}</p>
    </button>
  )
}

function AgentDetailPopup({ agent, onClose }: any) {
  const p = agent.performance;
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-black" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 relative shadow-2xl" onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-10 right-10 text-2xl font-black">✕</button>
        <div className="text-center mb-10">
            <p className="text-indigo-600 text-[10px] tracking-widest mb-1 uppercase">Member Intelligence</p>
            <h3 className="text-4xl italic">{agent.name} <span className="text-xl">CA 활동 상세</span></h3>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
            <StatBox label="전화량" val={p.call} unit="회" />
            <StatBox label="상담/미팅" val={p.meet} unit="회" />
            <StatBox label="제안/PT" val={p.pt} unit="회" />
            <StatBox label="도입/소개" val={p.intro} unit="명" />
        </div>
        <div className="bg-slate-50 p-8 rounded-[2.5rem] border space-y-4">
            <div className="flex justify-between"><span className="text-xs text-slate-400">DB 배정 / 반품</span><span className="text-lg">{p.db_assigned} / <span className="text-rose-500">{p.db_returned}</span></span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-400">교육 참여 여부</span><span className={`text-sm ${p.edu_status==='참여'?'text-blue-600':'text-rose-500'}`}>{p.edu_status}</span></div>
        </div>
      </div>
    </div>
  )
}
function StatBox({ label, val, unit }: any) {
    return <div className="bg-slate-50 p-5 rounded-3xl border text-center">
        <p className="text-[9px] text-slate-400 mb-1 uppercase">{label}</p>
        <p className="text-2xl font-black">{val}<span className="text-xs ml-1">{unit}</span></p>
    </div>
}
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url ? window.open(url, "_blank") : onClick()} className={`${color} px-5 py-3 rounded-2xl font-black text-[11px] shadow-sm transition-all hover:scale-105`}>{label}</button> }