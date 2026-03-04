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

  useEffect(() => { fetchTeamData() }, [selectedDate]);

  async function fetchTeamData() {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    const { data: settings } = await supabase.from("team_settings").select("*");
    
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'team_target_amt')?.value || 0),
      targetCnt: Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 0),
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value || 0),
    });

    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_amt: 0, contract_cnt: 0, target_amt: 0, target_cnt: 0, edu_status: "미참여" }
      })));
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* 최상단 전체 공지사항 탭 (Marquee 에러 해결) */}
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] font-black italic shrink-0 z-10">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee font-black text-sm text-black">
            {globalNotice} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {globalNotice}
          </div>
        </div>
      </div>

      {/* 상단 퀵링크 5종 */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-5 rounded-[2.5rem] shadow-sm border font-black">
        <p className="text-lg mr-4">{user.name} <span className="text-amber-600 font-bold">관리자</span></p>
        <div className="flex flex-wrap gap-2">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="보험금청구" url="#" color="bg-slate-50" />
          <QuickBtn label="자료실" url="#" color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => {}} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 관리 탭 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TabBtn label="실적 관리" sub="팀 목표 대비 현황" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="활동 통계 및 DB율" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="참석여부 확인" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="목표 설정" sub="전체 목표 및 공지" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 직원 리스트 */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm">
        <h2 className="text-xl font-black mb-6 border-l-8 border-black pl-4">직원 실적 모니터링</h2>
        <div className="space-y-3">
          {agents.map(a => (
            <div key={a.id} onClick={() => setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2rem] hover:border-black border-2 border-transparent transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="w-32 shrink-0">
                  <p className="font-black text-lg">{a.name} CA</p>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full ${a.performance.edu_status === '참여' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>교육 {a.performance.edu_status}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-2xl border text-center font-black">
                    <p className="text-[8px] text-slate-400">금액 (실적 / 목표)</p>
                    <p className="text-sm text-indigo-600">{a.performance.contract_amt}만 / <span className="text-slate-400">{a.performance.target_amt}만</span></p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border text-center font-black">
                    <p className="text-[8px] text-slate-400">건수 (실적 / 목표)</p>
                    <p className="text-sm text-emerald-600">{a.performance.contract_cnt}건 / <span className="text-slate-400">{a.performance.target_cnt}건</span></p>
                  </div>
                </div>
            </div>
          ))}
        </div>
      </section>

      {activeTab && <AdminPopups type={activeTab} agents={agents} teamMeta={teamMeta} onClose={() => {setActiveTab(null); fetchTeamData();}} />}
      
      {selectedAgent && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-black" onClick={()=>setSelectedAgent(null)}>
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 relative shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-2xl italic mb-8 border-b pb-4">{selectedAgent.name} CA 활동 상세</h3>
            <div className="grid grid-cols-2 gap-3 mb-8 text-center">
                <div className="bg-slate-50 p-4 rounded-2xl border"><p className="text-[10px] text-slate-400">전화</p><p className="text-xl">{selectedAgent.performance.call}</p></div>
                <div className="bg-slate-50 p-4 rounded-2xl border"><p className="text-[10px] text-slate-400">만남</p><p className="text-xl">{selectedAgent.performance.meet}</p></div>
                <div className="bg-slate-50 p-4 rounded-2xl border"><p className="text-[10px] text-slate-400">제안</p><p className="text-xl">{selectedAgent.performance.pt}</p></div>
                <div className="bg-slate-50 p-4 rounded-2xl border"><p className="text-[10px] text-slate-400">소개</p><p className="text-xl">{selectedAgent.performance.intro}</p></div>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border flex justify-between items-center mb-6 font-black">
                <span className="text-xs">DB 배정/반품</span>
                <span className="text-lg">{selectedAgent.performance.db_assigned} / <span className="text-rose-500">{selectedAgent.performance.db_returned}</span></span>
            </div>
            <button onClick={()=>setSelectedAgent(null)} className="w-full bg-black text-white py-4 rounded-2xl font-black">닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2rem] text-center transition-all shadow-sm`}><p className="text-sm font-black italic">{label}</p><p className="text-[9px] font-bold opacity-40 mt-1 uppercase">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-4 py-2 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0`}>{label}</button> }