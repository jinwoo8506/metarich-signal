"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import CalcModal from "./CalcModal" // 계산기 컴포넌트 추가

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 0, targetCnt: 0, targetIntro: 0 });
  
  // 영업도구(계산기) 팝업 상태 추가
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { 
    fetchTeamData() 
    // 모바일 최적화: 팝업이나 계산기가 열릴 때 배경 스크롤 방지
    if (activeTab || selectedAgent || isCalcOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [monthKey, activeTab, selectedAgent, isCalcOpen]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
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
            contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10, 
            edu_status: "미참여", is_approved: false 
        }
      })));
    }
  }

  const handleApprove = async (agent: any) => {
    try {
      const { id, created_at, updated_at, ...purePerformance } = agent.performance;
      const { error } = await supabase.from("daily_perf").upsert({
        ...purePerformance,
        user_id: agent.id,
        date: monthKey,
        is_approved: true
      }, { onConflict: 'user_id, date' });

      if (error) throw error;
      alert(`${agent.name} CA의 목표를 승인했습니다.`);
      fetchTeamData();
    } catch (err: any) {
      alert("승인 오류: " + err.message);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in pb-24 px-1 md:px-0 font-black overflow-x-hidden">
      {/* 상단 공지사항 */}
      <div className="bg-[#d4af37] p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-sm border-2 border-black flex items-center gap-3 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-2 py-0.5 rounded-full text-[9px] md:text-[10px] italic shrink-0 z-10 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-4 md:h-5 font-black">
          <div className="absolute whitespace-nowrap animate-marquee text-xs md:text-sm text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      {/* 관리자 프로필 및 퀵링크 */}
      <div className="flex flex-col gap-4 bg-white p-5 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border font-black">
        <div className="flex items-center justify-between font-black">
          <p className="text-base md:text-lg font-black">{user.name} <span className="text-amber-600 italic">MGR</span></p>
          <div className="md:hidden flex gap-1 italic text-[10px] text-slate-400 font-black">ADMIN VIEW</div>
        </div>
        <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 no-scrollbar font-black max-w-full">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="청구" url="#" color="bg-slate-50" />
          {/* 영업도구 버튼 클릭 시 계산기 오픈 */}
          <QuickBtn label="영업도구" color="bg-black text-[#d4af37]" onClick={() => setIsCalcOpen(true)} />
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 font-black">
        <TabBtn label="실적 관리" sub="PERF" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="ACT" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="EDU" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="시스템 설정" sub="SYS" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 팀 모니터링 섹션 */}
      <section className="bg-white p-4 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-lg md:text-xl font-black mb-4 md:mb-6 border-l-4 md:border-l-8 border-black pl-3 md:pl-4 uppercase font-black">{selectedDate.getMonth()+1}월 팀 모니터링</h2>
        <div className="space-y-4 md:space-y-6 font-black">
          {agents.map(a => {
            const pct = a.performance.target_amt > 0 ? Math.min((a.performance.contract_amt / a.performance.target_amt) * 100, 100) : 0;
            const returnRate = a.performance.db_assigned > 0 ? ((a.performance.db_returned / a.performance.db_assigned) * 100).toFixed(1) : "0";
            
            return (
              <div key={a.id} 
                   onClick={() => setSelectedAgent(a)} 
                   className="bg-slate-50 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all font-black font-black">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 md:gap-6 mb-4 font-black">
                    <div className="flex justify-between items-center lg:w-36 shrink-0 font-black">
                      <div>
                        <p className="text-base md:text-lg font-black">{a.name} CA</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-tighter font-black ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-amber-100 text-amber-600'}`}>
                          {a.performance.is_approved ? 'CONFIRMED' : 'WAITING'}
                        </span>
                      </div>
                      <div className="lg:hidden text-[10px] text-slate-300 italic font-black font-black">DETAILS →</div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 font-black font-black">
                        <DataBox label="실적액" val={`${a.performance.contract_amt}만`} color="text-indigo-600" />
                        <DataBox label="실적건" val={`${a.performance.contract_cnt}건`} color="text-emerald-600" />
                        <DataBox label="배정" val={`${a.performance.db_assigned}건`} />
                        <DataBox label="반품률" val={`${returnRate}%`} color="text-rose-500" />
                    </div>
                    
                    {!a.performance.is_approved && (
                      <button onClick={(e)=>{e.stopPropagation(); handleApprove(a);}} className="w-full lg:w-auto bg-black text-[#d4af37] py-4 rounded-2xl text-xs font-black italic shadow-lg active:scale-95 transition-all font-black">승인하기</button>
                    )}
                  </div>
                  <div className="relative w-full h-3 bg-white rounded-full border overflow-hidden font-black">
                    <div className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${pct}%` }} />
                  </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 기존 탭 관리 팝업 */}
      {activeTab && <AdminPopups type={activeTab} agents={agents} teamMeta={teamMeta} onClose={() => setActiveTab(null)} />}
      
      {/* CA 상세 리포트 팝업 (모바일 바텀시트 스타일) */}
      {selectedAgent && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 font-black" onClick={()=>setSelectedAgent(null)}>
          <div className="bg-white w-full max-w-xl rounded-t-[3rem] md:rounded-[3.5rem] p-8 md:p-10 relative shadow-2xl animate-in slide-in-from-bottom-10 font-black font-black" onClick={e=>e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6 md:hidden" />
            <button onClick={()=>setSelectedAgent(null)} className="hidden md:block absolute top-8 right-8 text-2xl font-black">✕</button>
            <h3 className="text-xl md:text-2xl italic mb-6 border-b-4 border-black pb-2 inline-block uppercase font-black">{selectedAgent.name} CA REPORT</h3>
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 font-black font-black">
                <MiniStat label="CALL" val={selectedAgent.performance?.call} />
                <MiniStat label="MEET" val={selectedAgent.performance?.meet} />
                <MiniStat label="PT" val={selectedAgent.performance?.pt} />
                <MiniStat label="INTRO" val={selectedAgent.performance?.intro} />
            </div>
            <div className="bg-slate-900 text-[#d4af37] p-6 rounded-3xl flex justify-between items-center mb-6 font-black font-black">
              <span className="text-[10px] uppercase font-black tracking-widest italic font-black">DB Status</span>
              <span className="text-xl font-black italic">B {selectedAgent.performance?.db_assigned} / R {selectedAgent.performance?.db_returned}</span>
            </div>
            <button onClick={()=>setSelectedAgent(null)} className="w-full md:hidden bg-black text-white py-5 rounded-2xl font-black font-black font-black">닫기</button>
          </div>
        </div>
      )}

      {/* 영업도구(계산기) 팝업 통합 */}
      {isCalcOpen && <CalcModal onClose={() => setIsCalcOpen(false)} />}
    </div>
  )
}

function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-3 md:p-5 rounded-2xl md:rounded-[2rem] text-center transition-all shadow-sm font-black`}><p className="text-xs md:text-sm font-black italic leading-none font-black">{label}</p><p className="text-[8px] font-bold opacity-40 mt-1 uppercase font-black font-black">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-4 py-2 rounded-xl font-black text-[10px] border border-slate-200 shadow-sm shrink-0 transition-all active:scale-95 font-black`}>{label}</button> }
function DataBox({ label, val, color = "text-black" }: any) { return <div className="bg-white p-2 rounded-xl border text-center font-black"><p className="text-[8px] text-slate-400 font-black mb-0.5 font-black">{label}</p><p className={`text-[11px] md:text-sm font-black ${color} font-black`}>{val}</p></div> }
function MiniStat({ label, val }: any) { return <div className="bg-slate-50 p-4 rounded-2xl border text-center font-black"><p className="text-[9px] text-slate-400 mb-1 font-black font-black">{label}</p><p className="text-2xl font-black italic font-black">{val || 0}</p></div> }