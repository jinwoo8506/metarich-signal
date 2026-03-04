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

  useEffect(() => { 
    fetchTeamData();
  }, [selectedDate]); // 날짜 바뀔 때마다 다시 로드

  async function fetchTeamData() {
    // 1. 팀 설정 로드
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'team_target_amt')?.value || 0),
      targetCnt: Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 0),
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value || 0),
    });

    // 2. 전체 직원 정보와 해당 날짜의 실적 결합
    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", dateStr);
    
    if (users) {
      const combined = users.map(u => {
        const p = perfs?.find(perf => perf.user_id === u.id);
        return {
          ...u,
          performance: p || { 
            call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
            contract_amt: 0, contract_cnt: 0, is_approved: false 
          }
        };
      });
      setAgents(combined);
    }
  }

  // 승인 로직 (수파베이스 업데이트 조건 강화)
  const handleApprove = async (agentId: string) => {
    const { error } = await supabase
      .from("daily_perf")
      .update({ is_approved: true })
      .match({ user_id: agentId, date: dateStr }); // user_id와 date가 일치하는 행만 업데이트

    if (error) {
      console.error("승인 오류:", error);
      alert("승인 처리 중 오류가 발생했습니다.");
    } else {
      alert("정상적으로 승인되었습니다.");
      fetchTeamData(); // 화면 즉시 갱신
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 font-black">
      {/* 1. 상단 공지사항 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 z-10 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-black font-black italic">{globalNotice}</div>
        </div>
      </div>

      {/* 2. 복구된 상단 퀵링크 (관리자용) */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-5 rounded-[2.5rem] shadow-sm border">
        <div className="flex items-center gap-2">
          <p className="text-lg font-black">{user.name} <span className="text-amber-600 italic">MANAGER</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사 통합" url="#" color="bg-slate-50" />
          <QuickBtn label="전산 매뉴얼" url="#" color="bg-slate-50" />
          <QuickBtn label="관리자 도구" color="bg-black text-[#d4af37]" onClick={() => setActiveTab('sys')} />
        </div>
      </div>

      {/* 3. 관리 탭 메뉴 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TabBtn label="실적 관리" sub="팀 통계 및 생산성" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="활동 퍼널 및 DB분석" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="출결 현황 모니터링" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="목표 설정" sub="목표/실적/교육 수정" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 4. 직원 실적 모니터링 섹션 */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black border-l-8 border-black pl-4 uppercase">CA Monitoring</h2>
            <p className="text-[10px] text-slate-400 font-black italic uppercase">Selected Date: {dateStr}</p>
        </div>
        
        <div className="space-y-4">
          {agents.length > 0 ? agents.map(a => (
            <div key={a.id} className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent flex flex-col lg:flex-row lg:items-center gap-6 hover:bg-slate-100 transition-all">
                <div className="w-36 shrink-0">
                  <p className="text-lg font-black">{a.name} CA</p>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter ${a.performance.is_approved ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-600 border border-amber-200'}`}>
                    {a.performance.is_approved ? '승인완료' : '승인대기'}
                  </span>
                </div>
                
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DataCard label="금액" val={`${a.performance.contract_amt}만`} />
                  <DataCard label="건수" val={`${a.performance.contract_cnt}건`} />
                  <DataCard label="전화" val={a.performance.call} />
                  <DataCard label="만남" val={a.performance.meet} />
                </div>

                {!a.performance.is_approved ? (
                  <button 
                    onClick={() => handleApprove(a.id)} 
                    className="bg-black text-[#d4af37] px-8 py-4 rounded-[1.5rem] text-sm font-black italic shadow-lg active:scale-95 transition-all hover:bg-slate-800"
                  >
                    승인하기
                  </button>
                ) : (
                  <div className="px-8 py-4 text-emerald-600 text-xs font-black italic uppercase">Approved</div>
                )}
            </div>
          )) : (
            <div className="text-center py-20 text-slate-300 font-black italic">데이터를 불러오는 중입니다...</div>
          )}
        </div>
      </section>

      {/* 팝업 모달 */}
      {activeTab && <AdminPopups type={activeTab} agents={agents} teamMeta={teamMeta} onClose={() => {setActiveTab(null); fetchTeamData();}} />}
    </div>
  )
}

// 헬퍼 컴포넌트
function TabBtn({ label, sub, active, onClick }: any) { 
  return (
    <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37] border-black' : 'bg-white text-black border-slate-200'} border-2 p-5 rounded-[2rem] text-center transition-all shadow-sm hover:scale-[1.02]`}>
      <p className="text-sm font-black italic">{label}</p>
      <p className="text-[9px] font-bold opacity-40 mt-1 uppercase tracking-tighter">{sub}</p>
    </button> 
  )
}

function QuickBtn({ label, url, onClick, color }: any) { 
  return (
    <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:invert shrink-0`}>
      {label}
    </button> 
  )
}

function DataCard({ label, val }: any) {
  return (
    <div className="bg-white p-3 rounded-2xl border text-center">
      <p className="text-[9px] text-slate-400 font-black uppercase mb-1">{label}</p>
      <p className="text-sm font-black">{val}</p>
    </div>
  )
}