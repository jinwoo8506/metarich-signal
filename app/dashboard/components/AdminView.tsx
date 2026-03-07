"use client"
import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import CalcModal from "./CalcModal"
import * as XLSX from 'xlsx'
import { jsPDF } from "jspdf"
import "jspdf-autotable"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 3000, targetCnt: 100, targetIntro: 10, actualIntro: 0 });
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [showExportOpt, setShowExportOpt] = useState(false);

  // 활동 관리 탭용 전체 합산 데이터
  const [totalActivity, setTotalActivity] = useState({ call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { fetchTeamData(); }, [monthKey]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt: Number(settings?.find(s => s.key === 'target_amt')?.value) || 3000,
      targetCnt: Number(settings?.find(s => s.key === 'target_cnt')?.value) || 100,
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value) || 10,
      actualIntro: Number(settings?.find(s => s.key === 'actual_intro_cnt')?.value) || 0
    });

    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", monthKey);
    
    if (users) {
      const mappedAgents = users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
          contract_amt: 0, contract_cnt: 0, target_amt: 300, edu_status: '미참여', is_approved: false,
          edu_1: false, edu_2: false, edu_3: false, edu_4: false, edu_5: false
        }
      }));
      setAgents(mappedAgents);

      // 전체 활동 합산 계산
      const totals = mappedAgents.reduce((acc, curr) => ({
        call: acc.call + (curr.performance.call || 0),
        meet: acc.meet + (curr.performance.meet || 0),
        pt: acc.pt + (curr.performance.pt || 0),
        intro: acc.intro + (curr.performance.intro || 0)
      }), { call: 0, meet: 0, pt: 0, intro: 0 });
      setTotalActivity(totals);
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      const wb = XLSX.utils.book_new();
      
      // 1. 팀 전체 요약 데이터 시트
      const summaryData = [{
        구분: "팀 전체 합계",
        전체전화: totalActivity.call,
        전체만남: totalActivity.meet,
        전체제안: totalActivity.pt,
        전체소개: totalActivity.intro
      }];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "팀 전체 요약");

      // 2. 직원별 세부 항목 시트
      const detailData = agents.map(a => ({
        성명: a.name,
        목표금액: a.performance.target_amt,
        실적금액: a.performance.contract_amt,
        실적건수: a.performance.contract_cnt,
        전화: a.performance.call,
        만남: a.performance.meet,
        제안: a.performance.pt,
        소개: a.performance.intro
      }));
      const wsDetail = XLSX.utils.json_to_sheet(detailData);
      XLSX.utils.book_append_sheet(wb, wsDetail, "직원별 세부 실적");

      XLSX.writeFile(wb, `Team_Report_${monthKey}.xlsx`);
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({ 
        head: [['성명', '목표(만)', '실적(만)', '건수', '전화', '만남', '제안', '소개']], 
        body: agents.map(a => [a.name, a.performance.target_amt, a.performance.contract_amt, a.performance.contract_cnt, a.performance.call, a.performance.meet, a.performance.pt, a.performance.intro]) 
      });
      doc.save(`Team_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  return (
    <div className="flex-1 space-y-6 font-black">
      <div className="flex flex-col md:flex-row gap-4 items-center font-black">
        <div className="flex-1 bg-[#d4af37] p-4 rounded-3xl border-2 border-black h-14 relative flex items-center overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute whitespace-nowrap animate-marquee font-black italic uppercase text-black">{globalNotice}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-[2rem] border-2 border-black">
        <div className="flex items-center gap-3 ml-2">
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse" />
          <p className="text-lg italic font-black uppercase tracking-tighter">
            {user.name || "ADMINISTRATOR"} <span className="text-slate-400 ml-1 not-italic text-sm">관리자</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center font-black">
          <a href="https://meta-on.kr/#/login" target="_blank" rel="noreferrer" className="bg-white border-2 border-black px-5 py-3 rounded-2xl text-[11px] italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">메타온</a>
          <a href="https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" target="_blank" rel="noreferrer" className="bg-white border-2 border-black px-5 py-3 rounded-2xl text-[11px] italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">자료실</a>
          <button className="bg-white border-2 border-black px-5 py-3 rounded-2xl text-[11px] italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">업무지원</button>
          <button onClick={() => setIsCalcOpen(true)} className="bg-white border-2 border-black px-5 py-3 rounded-2xl text-[11px] italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">계산기</button>
          
          <div className="relative">
            <button onClick={() => setShowExportOpt(!showExportOpt)} className="bg-black text-[#d4af37] px-5 py-3 rounded-2xl text-[11px] italic shadow-lg font-black uppercase">실적 출력</button>
            {showExportOpt && (
              <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 w-36 overflow-hidden">
                <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b text-left text-xs font-black">EXCEL 출력</button>
                <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-left text-xs font-black">PDF 출력</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'act' && !selectedAgent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <TotalBox label="전체 전화" val={totalActivity.call} />
          <TotalBox label="전체 만남" val={totalActivity.meet} sub={`전환율 ${totalActivity.call > 0 ? ((totalActivity.meet/totalActivity.call)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 제안" val={totalActivity.pt} sub={`전환율 ${totalActivity.meet > 0 ? ((totalActivity.pt/totalActivity.meet)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 소개" val={totalActivity.intro} />
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 font-black">
        {['perf', 'act', 'edu', 'sys'].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} className={`${activeTab === t ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-2xl text-sm italic font-black`}>
            {t==='perf'?'실적 관리':t==='act'?'활동 관리':t==='edu'?'교육 관리':'시스템 설정'}
          </button>
        ))}
      </div>

      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-xl mb-6 border-l-8 border-black pl-4 italic uppercase font-black">Team Monitoring</h2>
        <div className="space-y-6">
          {agents.map(a => {
            const progress = Math.min(((a.performance.contract_amt || 0) / (a.performance.target_amt || 1)) * 100, 100);
            return (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all font-black shadow-sm space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-xl font-black">{a.name} CA</p>
                  <div className="flex gap-10 text-right">
                    <div className="font-black">
                      <p className="text-[10px] text-slate-400 uppercase">Goal</p>
                      <p className="text-[15px] italic">{(a.performance.target_amt || 0).toLocaleString()}만</p>
                    </div>
                    <div className="font-black">
                      <p className="text-[10px] text-indigo-500 uppercase font-black">Actual</p>
                      <p className="text-[18px] text-indigo-600 italic">{(a.performance.contract_amt || 0).toLocaleString()}만</p>
                    </div>
                  </div>
                </div>
                
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-black" style={{ width: `${progress}%` }} />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-dashed border-slate-300">
                  <div className="text-center"><p className="text-[9px] text-slate-400">전화</p><p className="text-sm italic">{a.performance.call}회</p></div>
                  <div className="text-center"><p className="text-[9px] text-slate-400">만남</p><p className="text-sm italic">{a.performance.meet}회</p></div>
                  <div className="text-center"><p className="text-[9px] text-slate-400">제안</p><p className="text-sm italic">{a.performance.pt}회</p></div>
                  <div className="text-center"><p className="text-[9px] text-slate-400">소개</p><p className="text-sm italic">{a.performance.intro}회</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {activeTab && <AdminPopups type={activeTab} agents={agents} selectedAgent={selectedAgent} teamMeta={teamMeta} onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); }} />}
      {isCalcOpen && <CalcModal onClose={() => setIsCalcOpen(false)} />}
    </div>
  )
}

function TotalBox({ label, val, sub }: any) {
  return (
    <div className="bg-black p-5 rounded-[2rem] text-center font-black">
      <p className="text-[#d4af37] text-[10px] uppercase mb-1">{label}</p>
      <p className="text-white text-xl italic">{val}건</p>
      {sub && <p className="text-[#d4af37] text-[9px] mt-1 opacity-80">{sub}</p>}
    </div>
  )
}