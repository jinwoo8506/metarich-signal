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
    
    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10, edu_status: "미참여" 
        }
      })));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 4대 핵심 관리 탭 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TabBtn label="실적 관리" sub="금액·건수·도입 달성률" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="전환율·DB·성공률 분석" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="주차별 일정·참석 체크" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="시스템 설정" sub="공지 및 프로젝트 관리" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 팀 모니터링 리스트 (가로 막대 그래프 적용) */}
      <section className="bg-white p-8 rounded-[3rem] shadow-sm border">
        <h2 className="text-xl font-black uppercase italic mb-8 border-l-8 border-black pl-4">Team Performance Monitor</h2>
        <div className="space-y-6">
          {agents.map(a => {
            const amtPct = Math.min((a.performance.contract_amt / a.performance.target_amt) * 100, 100);
            const cntPct = Math.min((a.performance.contract_cnt / a.performance.target_cnt) * 100, 100);
            
            return (
              <div key={a.id} 
                onClick={() => setSelectedAgent(a)}
                className="group bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-black transition-all cursor-pointer shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="w-40 shrink-0">
                    <p className="font-black text-lg group-hover:italic">{a.name} CA</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{a.performance.edu_status} 상태</p>
                  </div>
                  
                  {/* 가로 실적 막대 */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span>Amount ({a.performance.contract_amt}만)</span>
                        <span>{amtPct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden border">
                        <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${amtPct}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span>Contracts ({a.performance.contract_cnt}건)</span>
                        <span>{cntPct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden border">
                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${cntPct}%` }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 text-center shrink-0 lg:ml-4">
                    <div className="px-3 border-x border-slate-200"><p className="text-[8px] font-black text-slate-400">CALL</p><p className="font-black text-sm">{a.performance.call}</p></div>
                    <div className="px-3 border-r border-slate-200"><p className="text-[8px] font-black text-slate-400">MEET</p><p className="font-black text-sm">{a.performance.meet}</p></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 관리용 팝업 (실적/활동/교육/시스템) */}
      {activeTab && <AdminPopups type={activeTab} agents={agents} onClose={() => setActiveTab(null)} />}
      
      {/* 직원 상세 팝업 */}
      {selectedAgent && <AgentDetailPopup agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-6 rounded-[2.5rem] text-center transition-all shadow-sm`}>
      <p className="text-sm font-black uppercase italic">{label}</p>
      <p className={`text-[9px] font-bold mt-1 uppercase ${active ? 'text-slate-400' : 'text-slate-400'}`}>{sub}</p>
    </button>
  )
}

// 직원 클릭 시 나타나는 상세 현황 팝업
function AgentDetailPopup({ agent, onClose }: any) {
  const p = agent.performance;
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-10 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 font-black text-xl">✕</button>
        <header className="mb-10 text-center">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Individual Analytics</p>
            <h3 className="text-4xl font-black italic">{agent.name} CA</h3>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-8">
            <DetailStat label="DB Assigned" val={p.db_assigned} unit="건" />
            <DetailStat label="DB Returned" val={p.db_returned} unit="건" color="text-rose-500" />
            <DetailStat label="Activity Intro" val={p.intro} unit="도입" />
            <DetailStat label="Education Status" val={p.edu_status} unit="" color="text-blue-600" />
        </div>

        <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border">
            <div className="flex justify-between items-end"><span className="text-xs font-black uppercase">종합 활동 진행률</span><span className="font-black italic text-2xl">{( (p.call+p.meet+p.pt)/100*100 ).toFixed(1)}%</span></div>
            <div className="w-full h-3 bg-white rounded-full overflow-hidden border">
                <div className="h-full bg-black transition-all duration-1000" style={{ width: '75%' }} />
            </div>
            <p className="text-[10px] text-center font-bold text-slate-400 italic">"입력 데이터 기반 실시간 성과 지표입니다."</p>
        </div>
      </div>
    </div>
  )
}

function DetailStat({ label, val, unit, color }: any) {
    return (
        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
            <p className={`text-xl font-black ${color || 'text-black'}`}>{val} <span className="text-xs">{unit}</span></p>
        </div>
    )
}