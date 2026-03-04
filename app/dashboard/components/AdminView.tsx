"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import CalcModal from "./CalcModal"
import * as XLSX from 'xlsx'; // npm install xlsx
import { jsPDF } from "jspdf"; // npm install jspdf jspdf-autotable
import "jspdf-autotable";

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 0, targetCnt: 0, targetIntro: 0 });
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // 3개월 평균 데이터 상태
  const [avgTab, setAvgTab] = useState('perf');
  const [teamAvg, setTeamAvg] = useState({ amt: 0, cnt: 0, perAmt: 0, call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { 
    fetchTeamData();
    fetchTeamAvg();
  }, [monthKey]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");

    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", monthKey);
    
    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10, is_approved: false }
      })));
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

  // [신규] 엑셀 다운로드 기능
  const downloadExcel = () => {
    const excelData = agents.map(a => ({
      성명: a.name,
      실적금액: a.performance.contract_amt,
      실적건수: a.performance.contract_cnt,
      전화: a.performance.call,
      만남: a.performance.meet,
      제안: a.performance.pt,
      소개: a.performance.intro,
      승인상태: a.performance.is_approved ? "승인" : "미승인"
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TeamPerformance");
    XLSX.writeFile(workbook, `팀실적_${monthKey}.xlsx`);
  };

  // [신규] PDF 다운로드 기능
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(`${monthKey} Team Performance Report`, 14, 15);
    const tableColumn = ["Name", "Amount", "Count", "Call", "Meet", "Approved"];
    const tableRows = agents.map(a => [
      a.name, a.performance.contract_amt, a.performance.contract_cnt, 
      a.performance.call, a.performance.meet, a.performance.is_approved ? "Yes" : "No"
    ]);
    (doc as any).autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`Report_${monthKey}.pdf`);
  };

  const handleApprove = async (agent: any) => {
    const { id, created_at, updated_at, ...purePerformance } = agent.performance;
    const { error } = await supabase.from("daily_perf").upsert({ ...purePerformance, user_id: agent.id, date: monthKey, is_approved: true }, { onConflict: 'user_id, date' });
    if (!error) { alert(`${agent.name} 승인완료`); fetchTeamData(); }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-24 px-1 font-black">
      {/* 상단 공지사항 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center gap-4 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-2 py-0.5 rounded-full text-[12px] italic shrink-0 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5"><div className="absolute whitespace-nowrap animate-marquee text-[14px] text-black font-black italic">{globalNotice}</div></div>
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

      {/* 실적 모니터링 및 다운로드 버튼 */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm font-black">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[20px] font-black border-l-8 border-black pl-4 uppercase">팀 모니터링</h2>
          <div className="flex gap-2">
            <button onClick={downloadExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[11px] font-black italic">EXCEL</button>
            <button onClick={downloadPDF} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[11px] font-black italic">PDF</button>
          </div>
        </div>
        <div className="space-y-4">
          {agents.map(a => (
            <div key={a.id} onClick={() => setSelectedAgent(a)} className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="lg:w-36"><p className="text-[18px] font-black">{a.name} CA</p><span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-amber-100 text-amber-600'}`}>{a.performance.is_approved ? 'CONFIRMED' : 'WAITING'}</span></div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <DataBox label="실적액" val={`${a.performance.contract_amt}만`} color="text-indigo-600" />
                      <DataBox label="실적건" val={`${a.performance.contract_cnt}건`} color="text-emerald-600" />
                      <DataBox label="전화" val={`${a.performance.call}회`} />
                      <DataBox label="만남" val={`${a.performance.meet}회`} />
                  </div>
                  {!a.performance.is_approved && <button onClick={(e)=>{e.stopPropagation(); handleApprove(a);}} className="bg-black text-[#d4af37] px-6 py-4 rounded-2xl text-[12px] font-black italic">승인</button>}
                </div>
            </div>
          ))}
        </div>
      </section>

      {/* 하단 3개월 평균 지표 */}
      <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white font-black shadow-2xl">
        <h3 className="text-[#d4af37] italic mb-6 uppercase text-[12px] tracking-widest">Team 3-Month Avg</h3>
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
          <button onClick={()=>setAvgTab('perf')} className={`text-[15px] font-black italic ${avgTab==='perf' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/30'}`}>팀 실적 평균</button>
          <button onClick={()=>setAvgTab('act')} className={`text-[15px] font-black italic ${avgTab==='act' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/30'}`}>팀 활동 평균</button>
        </div>
        {avgTab === 'perf' ? (
          <div className="grid grid-cols-3 gap-4">
            <AvgBox label="매출 평균" val={`${teamAvg.amt.toLocaleString()}만`} />
            <AvgBox label="건수 평균" val={`${teamAvg.cnt}건`} />
            <AvgBox label="건당 평균" val={`${teamAvg.perAmt.toLocaleString()}만`} />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <AvgBox label="전화" val={`${teamAvg.call}회`} />
            <AvgBox label="만남" val={`${teamAvg.meet}회`} />
            <AvgBox label="제안" val={`${teamAvg.pt}회`} />
            <AvgBox label="소개" val={`${teamAvg.intro}회`} />
          </div>
        )}
      </div>

      {activeTab && <AdminPopups type={activeTab} agents={agents} teamMeta={teamMeta} onClose={() => setActiveTab(null)} />}
      {isCalcOpen && <CalcModal onClose={() => setIsCalcOpen(false)} />}
    </div>
  )
}

function AvgBox({ label, val }: any) { return <div className="text-center bg-white/5 p-5 rounded-[2rem] border border-white/10 font-black"><p className="text-[10px] text-white/40 uppercase mb-2 font-black">{label}</p><p className="text-[18px] text-[#d4af37] font-black italic">{val}</p></div> }
function TabBtn({ label, sub, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-4 rounded-2xl text-center font-black shadow-sm shrink-0`}><p className="text-[14px] font-black italic">{label}</p><p className="text-[10px] font-bold opacity-30 uppercase">{sub}</p></button> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[12px] border shadow-sm shrink-0`}>{label}</button> }
function DataBox({ label, val, color = "text-black" }: any) { return <div className="bg-white p-3 rounded-2xl border text-center font-black"><p className="text-[10px] text-slate-400 font-black mb-1">{label}</p><p className={`text-[14px] font-black ${color}`}>{val}</p></div> }