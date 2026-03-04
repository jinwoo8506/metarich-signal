"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 0, targetCnt: 0, targetIntro: 0 });
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  useEffect(() => { fetchTeamData() }, [selectedDate]);

  async function fetchTeamData() {
    // 설정 및 공지 로드
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'team_target_amt')?.value || 0),
      targetCnt: Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 0),
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value || 0),
    });

    // 직원 및 실적 데이터 로드
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
    if (error) alert("승인 처리 실패");
    else {
      alert("실적이 정상적으로 승인되었습니다.");
      fetchTeamData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 font-black">
      {/* 1. 최상단 전체 공지사항 탭 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 z-10">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-black">
            {globalNotice} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {globalNotice}
          </div>
        </div>
      </div>

      {/* 2. 상단 퀵링크 5종 */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-5 rounded-[2.5rem] shadow-sm border">
        <p className="text-lg mr-4">{user.name} <span className="text-amber-600 font-bold">관리자</span></p>
        <div className="flex flex-wrap gap-2">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="보험금청구" url="#" color="bg-slate-50" />
          <QuickBtn label="자료실" url="#" color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => {}} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 3. 관리 탭 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TabBtn label="실적 관리" sub="팀 전체 목표/진행율" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="통계 및 DB반품율" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="참석여부 유지" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="목표 설정" sub="공지 및 전체목표수정" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 4. 직원 리스트 (목표/실적 상하 분리 및 승인 버튼) */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm">
        <h2 className="text-xl font-black mb-6 border-l-8 border-black pl-4">직원 실적 승인 및 모니터링</h2>
        <div className="space-y-4">
          {agents.map(a => (
            <div key={a.id} className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="w-32 shrink-0">
                  <p className="font-black text-lg">{a.name} CA</p>
                  <span className={`text-[9px] px-2 py-1 rounded-full font-black ${a.performance.is_approved ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-600'}`}>
                    {a.performance.is_approved ? '승인완료' : '승인대기'}
                  </span>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 font-black">
                  <div className="bg-white p-3 rounded-2xl border text-center">
                    <p className="text-[8px] text-slate-400">금액</p>
                    <p className="text-sm text-indigo-600">{a.performance.contract_amt}만</p>
                    <div className="h-px bg-slate-100 my-1" />
                    <p className="text-sm text-slate-400">{a.performance.target_amt}만</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border text-center">
                    <p className="text-[8px] text-slate-400">건수</p>
                    <p className="text-sm text-emerald-600">{a.performance.contract_cnt}건</p>
                    <div className="h-px bg-slate-100 my-1" />
                    <p className="text-sm text-slate-400">{a.performance.target_cnt}건</p>
                  </div>
                </div>
                {!a.performance.is_approved && (
                  <button onClick={()=>handleApprove(a.id)} className="bg-black text-[#d4af37] px-8 py-4 rounded-[1.5rem] text-sm hover:scale-105 transition-all shrink-0 font-black italic">APPROVE</button>
                )}
            </div>
          ))}
        </div>
      </section>

      {activeTab && <AdminPopups type={activeTab} agents={agents} teamMeta={teamMeta} onClose={() => {setActiveTab(null); fetchTeamData();}} />}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2rem] text-center transition-all shadow-sm`}><p className="text-sm font-black italic">{label}</p><p className="text-[9px] font-bold opacity-40 mt-1 uppercase">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-4 py-2 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0`}>{label}</button> }