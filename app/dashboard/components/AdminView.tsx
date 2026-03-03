"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activePopup, setActivePopup] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, [selectedDate]);

  async function fetchTeamData() {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { data: users } = await supabase.from("users").select("id, name").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    
    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_amt: 0, contract_cnt: 0, edu_done: false }
      })));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <header className="flex justify-between items-end px-4">
        <h1 className="text-3xl font-black italic uppercase">Manager Portal</h1>
      </header>

      {/* 분석 탭 버튼들 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TabBtn label="실적 관리" sub="팀 통계 현황" onClick={()=>setActivePopup('perf')} />
        <TabBtn label="활동 관리" sub="DB 전환율 분석" onClick={()=>setActivePopup('act')} />
        <TabBtn label="교육 관리" sub="이수 현황 리스트" onClick={()=>setActivePopup('edu')} />
        <TabBtn label="시스템 설정" sub="공지 및 목표수정" onClick={()=>setActivePopup('setting')} />
      </div>

      {/* 팀 실시간 모니터링 섹션 */}
      <section className="bg-white p-8 rounded-[3rem] shadow-sm border">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black uppercase italic border-l-8 border-black pl-4">Team Monitoring</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedDate.toLocaleDateString()}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(a => (
            <div key={a.id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-black transition-all group">
              <div className="flex justify-between mb-4">
                <p className="font-black text-lg group-hover:italic transition-all">{a.name} CA</p>
                <div className="flex gap-1">
                    {a.performance?.edu_done && <span className="text-[8px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">EDU</span>}
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full border bg-white ${a.performance?.call > 0 ? 'text-blue-600 border-blue-200' : 'text-slate-300'}`}>
                    {a.performance?.call > 0 ? 'RECORDED' : 'IDLE'}
                    </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-slate-400 mb-4">
                <p>DB배정: <span className="text-black">{a.performance?.db_assigned}</span></p>
                <p>계약금액: <span className="text-indigo-600">{a.performance?.contract_amt}만</span></p>
              </div>

              {/* 간단 실적 바 */}
              <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border">
                <div className="h-full bg-black transition-all duration-1000" 
                     style={{ width: `${Math.min((a.performance?.contract_amt/300)*100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 상세 분석 팝업 모달 */}
      {activePopup && <AdminPopups type={activePopup} onClose={() => setActivePopup(null)} />}
    </div>
  )
}

function TabBtn({ label, sub, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-white border-2 border-black p-6 rounded-[2.5rem] text-center hover:bg-black group transition-all shadow-sm">
      <p className="text-sm font-black uppercase group-hover:text-[#d4af37] italic transition-colors">{label}</p>
      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase group-hover:text-slate-500">{sub}</p>
    </button>
  )
}