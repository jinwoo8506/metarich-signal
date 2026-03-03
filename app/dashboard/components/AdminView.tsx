"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activePopup, setActivePopup] = useState<string | null>(null);

  useEffect(() => { fetchTeamData() }, [selectedDate]);

  async function fetchTeamData() {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { data: users } = await supabase.from("users").select("id, name").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { call: 0, db_assigned: 0, contract_amt: 0 }
      })));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 공통 퀵링크 (관리자도 동일하게 사용) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-white" />
        <QuickBtn label="보험사" url="https://www.e-insunet.co.kr" color="bg-white" />
        <QuickBtn label="보험금청구" url="https://www.sosclaim.co.kr" color="bg-white text-blue-600" />
        <QuickBtn label="자료실" url="#" color="bg-white text-slate-300" />
      </div>

      <header className="px-4"><h1 className="text-3xl font-black italic uppercase">Manager Portal</h1></header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TabBtn label="실적 관리" sub="팀 통계 현황" onClick={()=>setActivePopup('perf')} />
        <TabBtn label="활동 관리" sub="DB 전환율 분석" onClick={()=>setActivePopup('act')} />
        <TabBtn label="교육 관리" sub="이수 현황 리스트" onClick={()=>setActivePopup('edu')} />
        <TabBtn label="시스템 설정" sub="공지 및 목표수정" onClick={()=>setActivePopup('setting')} />
      </div>

      <section className="bg-white p-8 rounded-[3rem] shadow-sm border">
        <h2 className="text-xl font-black uppercase italic mb-6 border-l-8 border-black pl-4">Team Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(a => (
            <div key={a.id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-black transition-all">
              <div className="flex justify-between mb-4"><p className="font-black text-lg">{a.name} CA</p></div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-slate-400 mb-4">
                <p>DB배정: <span className="text-black">{a.performance?.db_assigned}</span></p>
                <p>계약금액: <span className="text-indigo-600">{a.performance?.contract_amt}만</span></p>
              </div>
              <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border"><div className="h-full bg-black transition-all duration-1000" style={{ width: `${Math.min((a.performance?.contract_amt/300)*100, 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      {activePopup && <AdminPopups type={activePopup} onClose={() => setActivePopup(null)} />}
    </div>
  )
}

function QuickBtn({ label, color, url }: any) {
  return (
    <button onClick={() => url !== "#" ? window.open(url, "_blank") : alert("준비 중")} className={`${color} border-2 border-black py-4 rounded-2xl font-black text-[11px] uppercase shadow-sm hover:bg-black hover:text-[#d4af37] transition-all`}>
      {label}
    </button>
  )
}
function TabBtn({ label, sub, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-white border-2 border-black p-6 rounded-[2.5rem] text-center hover:bg-black group transition-all">
      <p className="text-sm font-black uppercase group-hover:text-[#d4af37] italic">{label}</p>
      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase group-hover:text-slate-500">{sub}</p>
    </button>
  )
}