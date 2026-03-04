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
  
  // [수정] 직원 화면과 동일한 강력한 날짜 포맷 적용
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { 
    fetchTeamData() 
  }, [monthKey]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'team_target_amt')?.value || 0),
      targetCnt: Number(settings?.find(s => s.key === 'team_target_cnt')?.value || 0),
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value || 0),
    });

    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", monthKey);
    
    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
            call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
            contract_amt: 0, contract_cnt: 0, target_amt: 10, target_cnt: 300, is_approved: false 
        }
      })));
    }
  }

  // 승인 로직 강화
  const handleApprove = async (agent: any) => {
    // 1. 현재 데이터 상태 확인 후 is_approved만 true로 바꾼 객체 생성
    const updateData = {
        ...agent.performance,
        user_id: agent.id,
        date: monthKey,
        is_approved: true
    };

    // 2. upsert를 사용하여 업데이트 또는 생성
    const { error } = await supabase.from("daily_perf").upsert(updateData);

    if (error) {
      console.error("Approve Error:", error);
      alert("승인 처리 중 오류가 발생했습니다.");
    } else {
      alert(`${agent.name}님의 ${selectedDate.getMonth() + 1}월 실적이 승인되었습니다.`);
      fetchTeamData(); // 즉시 새로고침
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 font-black">
      {/* 상단 노티스 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 z-10 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5 font-black">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      {/* 퀵링크 (직원과 동일한 5개 버튼) */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-5 rounded-[2.5rem] shadow-sm border font-black">
        <div className="flex items-center gap-2">
          <p className="text-lg font-black">{user.name} <span className="text-amber-600 italic">MANAGER</span></p>
        </div>
        <div className="flex flex-wrap gap-2 font-black">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="보험금청구" url="#" color="bg-slate-50" />
          <QuickBtn label="자료실" url="#" color="bg-slate-50" />
          <QuickBtn label="영업도구" color="bg-black text-[#d4af37]" onClick={() => setActiveTab('sys')} />
        </div>
      </div>

      {/* 관리 탭 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-black">
        <TabBtn label="실적 관리" sub="월간 생산성" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="월간 퍼널 분석" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="월간 출결 현황" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="지침 설정" sub="목표/교육/공지" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 모니터링 섹션 */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-xl font-black mb-6 border-l-8 border-black pl-4 uppercase font-black">{selectedDate.getMonth()+1}월 CA 실적 모니터링</h2>
        <div className="space-y-4 font-black">
          {agents.map(a => (
            <div key={a.id} 
                 onClick={() => setSelectedAgent(a)} 
                 className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer flex flex-col lg:flex-row lg:items-center gap-6 transition-all font-black">
                <div className="w-36 shrink-0 font-black">
                  <p className="text-lg font-black">{a.name} CA</p>
                  <span className={`text-[10px] px-3 py-1 rounded-full uppercase tracking-tighter font-black ${a.performance.is_approved ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-600 border border-amber-200'}`}>
                    {a.performance.is_approved ? '승인완료' : '승인대기'}
                  </span>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 font-black">
                    <DataBox label="금액" val={`${a.performance.contract_amt}만`} />
                    <DataBox label="건수" val={`${a.performance.contract_cnt}건`} />
                    <DataBox label="전화" val={a.performance.call} />
                    <DataBox label="만남" val={a.performance.meet} />
                </div>
                {!a.performance.is_approved && (
                  <button onClick={(e)=>{e.stopPropagation(); handleApprove(a);}} className="bg-black text-[#d4af37] px-8 py-4 rounded-[1.5rem] text-sm font-black italic shadow-lg active:scale-95 transition-all font-black">월간승인</button>
                )}
            </div>
          ))}
        </div>
      </section>

      {/* 관리자 팝업들 */}
      {activeTab && <AdminPopups type={activeTab} agents={agents} teamMeta={teamMeta} onClose={() => {setActiveTab(null); fetchTeamData();}} />}
      
      {/* 직원 개별 활동 상세 팝업 */}
      {selectedAgent && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 font-black" onClick={()=>setSelectedAgent(null)}>
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 relative shadow-2xl font-black" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setSelectedAgent(null)} className="absolute top-8 right-8 text-2xl font-black">✕</button>
            <h3 className="text-2xl italic mb-8 border-b-4 border-black pb-2 inline-block uppercase font-black">{selectedAgent.name} CA 활동 내역</h3>
            <div className="grid grid-cols-2 gap-3 mb-8 text-center font-black">
                <div className="bg-slate-50 p-6 rounded-3xl border font-black"><p className="text-[10px] text-slate-400 mb-1 font-black">총 전화</p><p className="text-3xl font-black italic">{selectedAgent.performance?.call || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black"><p className="text-[10px] text-slate-400 mb-1 font-black">총 만남</p><p className="text-3xl font-black italic">{selectedAgent.performance?.meet || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black"><p className="text-[10px] text-slate-400 mb-1 font-black">총 제안</p><p className="text-3xl font-black italic">{selectedAgent.performance?.pt || 0}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border font-black"><p className="text-[10px] text-slate-400 mb-1 font-black">총 소개</p><p className="text-3xl font-black italic">{selectedAgent.performance?.intro || 0}</p></div>
            </div>
            <div className="bg-slate-900 text-[#d4af37] p-8 rounded-[2.5rem] flex justify-between items-center font-black">
              <span className="text-xs uppercase font-black tracking-widest italic">DB assigned Analysis</span>
              <span className="text-2xl font-black italic">반품 {selectedAgent.performance?.db_returned || 0} / 배정 {selectedAgent.performance?.db_assigned || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-[2rem] text-center transition-all shadow-sm font-black`}><p className="text-sm font-black italic font-black">{label}</p><p className="text-[9px] font-bold opacity-40 mt-1 uppercase tracking-tighter font-black">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0 font-black`}>{label}</button> }
function DataBox({ label, val }: any) { return <div className="bg-white p-3 rounded-2xl border text-center font-black"><p className="text-[9px] text-slate-400 font-black">{label}: {val}</p></div> }