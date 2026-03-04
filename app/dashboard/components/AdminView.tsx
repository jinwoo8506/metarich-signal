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
    
    // 관리자가 설정한 공통 목표치 (시스템 설정 탭 연동용)
    const gTarAmt = Number(localStorage.getItem("target_amt_setting") || 300);
    const gTarCnt = Number(localStorage.getItem("target_cnt_setting") || 10);

    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
          contract_amt: 0, contract_cnt: 0, target_amt: gTarAmt, target_cnt: gTarCnt, edu_status: "미참여" 
        }
      })));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 관리자 헤더 및 퀵링크 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#d4af37] rounded-full flex items-center justify-center text-black font-black italic">M</div>
          <p className="font-black text-lg">{user.name} <span className="text-amber-600">관리자님</span> 환영합니다.</p>
        </div>
        <div className="flex gap-2">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="전체공지" onClick={() => setActiveTab('sys')} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TabBtn label="실적 관리" sub="팀 목표 및 달성률" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="전환율 및 DB 통계" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="주차별 일정 및 체크" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="시스템 설정" sub="공통 목표 및 공지" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      <section className="bg-white p-8 rounded-[3rem] shadow-sm border">
        <h2 className="text-xl font-black mb-8 border-l-8 border-black pl-4 italic">직원별 실시간 현황</h2>
        <div className="space-y-4">
          {agents.map(a => {
            const amtPct = Math.min((a.performance.contract_amt / a.performance.target_amt) * 100, 100);
            return (
              <div key={a.id} onClick={() => setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2rem] hover:border-black border-2 border-transparent transition-all cursor-pointer">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="w-32 shrink-0">
                    <p className="font-black text-lg">{a.name} <span className="text-[10px] text-slate-400 font-bold">CA</span></p>
                    <p className="text-[9px] font-black text-indigo-600">{a.performance.edu_status} 완료</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-[10px] font-black">
                      <span>목표 {a.performance.target_amt}만 / 현재 {a.performance.contract_amt}만</span>
                      <span>{amtPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 bg-white rounded-full overflow-hidden border">
                      <div className="h-full bg-black transition-all duration-1000" style={{ width: `${amtPct}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-4 shrink-0 font-black text-xs text-center">
                    <div className="w-12"><p className="text-[8px] text-slate-400">전화</p><p>{a.performance.call}</p></div>
                    <div className="w-12"><p className="text-[8px] text-slate-400">만남</p><p>{a.performance.meet}</p></div>
                    <div className="w-12"><p className="text-[8px] text-slate-400">건수</p><p>{a.performance.contract_cnt}건</p></div>
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
    <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2rem] text-center transition-all shadow-sm`}>
      <p className="text-sm font-black italic">{label}</p>
      <p className="text-[9px] font-bold opacity-40 mt-1 uppercase">{sub}</p>
    </button>
  )
}

function AgentDetailPopup({ agent, onClose }: any) {
  const p = agent.performance;
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative shadow-2xl overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-8 right-8 text-2xl">✕</button>
        <div className="text-center mb-10">
            <p className="text-indigo-600 text-[10px] tracking-widest mb-1">INDIVIDUAL DATA REPORT</p>
            <h3 className="text-4xl italic">{agent.name} <span className="text-xl">설계사 상세현황</span></h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatBox label="전화량" val={p.call} unit="회" />
            <StatBox label="상담/미팅" val={p.meet} unit="회" />
            <StatBox label="제안/PT" val={p.pt} unit="회" />
            <StatBox label="도입/소개" val={p.intro} unit="명" />
        </div>

        <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-black/5 space-y-6">
            <div className="grid grid-cols-2 gap-8 text-center">
                <div><p className="text-[10px] text-slate-400 mb-1 uppercase">DB 배정 현황</p><p className="text-2xl text-blue-600">{p.db_assigned} <span className="text-sm">건</span></p></div>
                <div><p className="text-[10px] text-slate-400 mb-1 uppercase">DB 반품 현황</p><p className="text-2xl text-rose-600">{p.db_returned} <span className="text-sm">건</span></p></div>
            </div>
            <div className="pt-6 border-t border-dashed border-slate-300">
                <p className="text-[10px] text-slate-400 mb-2 uppercase">교육 이수 상태</p>
                <div className={`py-4 rounded-xl text-center text-white ${p.edu_status === '참여' ? 'bg-indigo-600' : 'bg-slate-400'}`}>{p.edu_status}</div>
            </div>
        </div>
      </div>
    </div>
  )
}
function StatBox({ label, val, unit }: any) {
    return <div className="bg-slate-50 p-4 rounded-2xl border text-center">
        <p className="text-[9px] text-slate-400 mb-1">{label}</p>
        <p className="text-xl font-black">{val}<span className="text-[10px] ml-1">{unit}</span></p>
    </div>
}
function QuickBtn({ label, url, onClick, color }: any) {
  return <button onClick={() => url ? window.open(url, "_blank") : onClick()} className={`${color} px-5 py-3 rounded-2xl font-black text-[11px] shadow-sm transition-all hover:scale-105`}>{label}</button>
}