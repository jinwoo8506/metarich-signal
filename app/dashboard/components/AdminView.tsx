"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import CalcModal from "./CalcModal"
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 300, targetCnt: 10, targetIntro: 0 });
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  
  // 3개월 평균 팝업 상태
  const [showAvgPopup, setShowAvgPopup] = useState(false);
  const [avgTab, setAvgTab] = useState('perf');
  const [teamAvg, setTeamAvg] = useState({ amt: 0, cnt: 0, perAmt: 0, call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { 
    fetchTeamData();
    fetchTeamAvg();
  }, [monthKey]);

  async function fetchTeamData() {
    // 1. 시스템 설정 불러오기 (공지 및 목표)
    const { data: settings } = await supabase.from("team_settings").select("*");
    const notice = settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.";
    const tAmt = Number(settings?.find(s => s.key === 'target_amt')?.value) || 300;
    const tCnt = Number(settings?.find(s => s.key === 'target_cnt')?.value) || 10;
    
    setGlobalNotice(notice);
    setTeamMeta({ targetAmt: tAmt, targetCnt: tCnt, targetIntro: 0 });

    // 2. 직원 데이터 매칭 (시스템 설정값 우선 반영)
    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", monthKey);
    
    if (users) {
      setAgents(users.map(u => {
        const p = perfs?.find(perf => perf.user_id === u.id);
        return {
          ...u,
          performance: p ? {
            ...p,
            // 실적 데이터가 있더라도 시스템 설정의 목표치를 우선 노출 (요청사항 반영)
            target_amt: tAmt,
            target_cnt: tCnt
          } : { 
            call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
            contract_amt: 0, contract_cnt: 0, 
            target_amt: tAmt, 
            target_cnt: tCnt, 
            is_approved: false 
          }
        };
      }));
    }
  }

  async function fetchTeamAvg() {
    const dates = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    }
    const { data } = await supabase.from("daily_perf").select("*").in("date", dates);

    if (data && data.length > 0) {
      const sum = data.reduce((acc, curr) => ({
        amt: acc.amt + curr.contract_amt, cnt: acc.cnt + curr.contract_cnt,
        call: acc.call + curr.call, meet: acc.meet + curr.meet, pt: acc.pt + curr.pt, intro: acc.intro + curr.intro
      }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, intro: 0 });

      const monthCount = 3;
      setTeamAvg({
        amt: Math.round(sum.amt / monthCount),
        cnt: Number((sum.cnt / monthCount).toFixed(1)),
        perAmt: sum.cnt > 0 ? Math.round(sum.amt / sum.cnt) : 0,
        call: Math.round(sum.call / monthCount),
        meet: Math.round(sum.meet / monthCount),
        pt: Math.round(sum.pt / monthCount),
        intro: Math.round(sum.intro / monthCount)
      });
    }
  }

  const handleApprove = async (agent: any) => {
    const { id, created_at, updated_at, ...purePerformance } = agent.performance;
    const { error } = await supabase.from("daily_perf").upsert({ 
      ...purePerformance, 
      user_id: agent.id, 
      date: monthKey, 
      is_approved: true 
    }, { onConflict: 'user_id, date' });
    
    if (!error) { 
      alert(`${agent.name} 실적 승인 완료`); 
      fetchTeamData(); 
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-24 px-1 font-black relative">
      {/* 상단 공지사항 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center gap-4 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-2 py-0.5 rounded-full text-[12px] italic shrink-0">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-[14px] text-black font-black italic">{globalNotice}</div>
        </div>
      </div>

      {/* 프로필 및 퀵링크 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2.5rem] border font-black shadow-sm">
        <p className="text-[20px] font-black">{user.name} <span className="text-amber-600 italic">MGR</span></p>
        <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar font-black">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="보험금청구" url="#" color="bg-slate-50" />
          <QuickBtn label="자료실" url="#" color="bg-slate-50" />
          <QuickBtn label="영업도구" color="bg-black text-[#d4af37]" onClick={() => setIsCalcOpen(true)} />
        </div>
      </div>

      {/* 관리자 탭 메뉴 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 font-black">
        <TabBtn label="실적 관리" sub="PERF" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
        <TabBtn label="활동 관리" sub="ACT" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
        <TabBtn label="교육 관리" sub="EDU" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
        <TabBtn label="시스템 설정" sub="SYS" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
      </div>

      {/* 팀 리스트 모니터링 */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-[20px] font-black border-l-8 border-black pl-4 uppercase mb-6">팀 모니터링 ({selectedDate.getMonth()+1}월)</h2>
        <div className="space-y-4">
          {agents.map(a => (
            <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('perf'); }} className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="lg:w-36">
                    <p className="text-[18px] font-black">{a.name} CA</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-amber-100 text-amber-600'}`}>
                      {a.performance.is_approved ? 'CONFIRMED' : 'WAITING'}
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <DataBox label="실적액" val={`${a.performance.contract_amt}만 / ${a.performance.target_amt}만`} color="text-indigo-600" />
                      <DataBox label="실적건" val={`${a.performance.contract_cnt}건 / ${a.performance.target_cnt}건`} color="text-emerald-600" />
                      <DataBox label="전화" val={`${a.performance.call}회`} />
                      <DataBox label="만남" val={`${a.performance.meet}회`} />
                  </div>
                  {!a.performance.is_approved && (
                    <button onClick={(e)=>{e.stopPropagation(); handleApprove(a);}} className="bg-black text-[#d4af37] px-6 py-4 rounded-2xl text-[12px] font-black italic">승인하기</button>
                  )}
                </div>
            </div>
          ))}
        </div>
      </section>

      {/* [수정] 3개월 평균 플로팅 사이드 버튼 */}
      <button 
        onClick={() => setShowAvgPopup(true)}
        className="fixed bottom-24 right-6 bg-[#d4af37] text-black w-20 h-20 rounded-full border-4 border-black shadow-2xl font-black italic text-[12px] flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        3M AVG
      </button>

      {/* 3개월 평균 지표 팝업 */}
      {showAvgPopup && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md p-8 rounded-[3rem] border-2 border-[#d4af37] font-black shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-[#d4af37] italic uppercase text-[14px]">Team 3-Month Summary</h3>
               <button onClick={()=>setShowAvgPopup(false)} className="text-[#d4af37] text-2xl">✕</button>
            </div>
            <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
              <button onClick={()=>setAvgTab('perf')} className={`text-[15px] italic ${avgTab==='perf' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/30'}`}>실적 평균</button>
              <button onClick={()=>setAvgTab('act')} className={`text-[15px] italic ${avgTab==='act' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/30'}`}>활동 평균</button>
            </div>
            {avgTab === 'perf' ? (
              <div className="grid grid-cols-1 gap-4">
                <AvgBox label="매출 평균" val={`${teamAvg.amt.toLocaleString()}만`} />
                <AvgBox label="건수 평균" val={`${teamAvg.cnt}건`} />
                <AvgBox label="건당 평균" val={`${teamAvg.perAmt.toLocaleString()}만`} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <AvgBox label="평균 전화" val={`${teamAvg.call}회`} />
                <AvgBox label="평균 만남" val={`${teamAvg.meet}회`} />
                <AvgBox label="평균 제안" val={`${teamAvg.pt}회`} />
                <AvgBox label="평균 소개" val={`${teamAvg.intro}회`} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 팝업 연동 - 엑셀/PDF 버튼은 AdminPopups 내부로 전달됨 */}
      {activeTab && (
        <AdminPopups 
          type={activeTab} 
          agents={agents} 
          selectedAgent={selectedAgent}
          teamMeta={teamMeta} 
          onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); }} 
        />
      )}
      {isCalcOpen && <CalcModal onClose={() => setIsCalcOpen(false)} />}
    </div>
  )
}

function AvgBox({ label, val }: any) { return <div className="text-center bg-white/5 p-5 rounded-[2rem] border border-white/10"><p className="text-[10px] text-white/40 uppercase mb-2">{label}</p><p className="text-[18px] text-[#d4af37] italic">{val}</p></div> }
function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-4 rounded-2xl text-center shadow-sm shrink-0`}><p className="text-[14px] italic">{label}</p><p className="text-[10px] opacity-30 uppercase">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[12px] border shadow-sm shrink-0`}>{label}</button> }
function DataBox({ label, val, color = "text-black" }: any) { return <div className="bg-white p-3 rounded-2xl border text-center"><p className="text-[10px] text-slate-400 mb-1 leading-none">{label}</p><p className={`text-[13px] font-black ${color}`}>{val}</p></div> }