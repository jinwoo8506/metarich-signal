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
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false); 
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
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10, edu_status: '미참여', is_approved: false
        }
      }));
      setAgents(mappedAgents);

      // 전체 활동 합산 계산
      const totals = mappedAgents.reduce((acc, curr) => ({
        call: acc.call + Number(curr.performance.call || 0),
        meet: acc.meet + Number(curr.performance.meet || 0),
        pt: acc.pt + Number(curr.performance.pt || 0),
        intro: acc.intro + Number(curr.performance.intro || 0)
      }), { call: 0, meet: 0, pt: 0, intro: 0 });
      setTotalActivity(totals);
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      const wb = XLSX.utils.book_new();

      // [시트 1: 📊 팀 전체 현황] - 전문가 레이아웃 적용
      const teamRows = [
        ["", "", "", "", "", "", "", "", ""],
        ["", "🏆  영업팀 실적 현황 리포트"],
        ["", "※ 본 리포트는 팀 전체 목표 대비 실적 현황을 요약합니다."],
        ["", ""],
        ["", "▌ 팀 핵심 KPI"],
        ["", "목표 금액(만)", "실적 금액(만)", "목표 건수", "실적 건수", "금액 달성률"],
        ["", 
          teamMeta.targetAmt, 
          agents.reduce((acc, a) => acc + Number(a.performance.contract_amt || 0), 0), 
          teamMeta.targetCnt, 
          agents.reduce((acc, a) => acc + Number(a.performance.contract_cnt || 0), 0),
          ((agents.reduce((acc, a) => acc + Number(a.performance.contract_amt || 0), 0) / (teamMeta.targetAmt || 1))).toFixed(3)
        ],
        ["", ""],
        ["", "▌ 팀원별 목표 vs 실적 현황"],
        ["", "이름", "목표금액(만)", "실적금액(만)", "금액달성률", "목표건수", "실적건수", "건수달성률", "초과/미달(만)"]
      ];

      agents.forEach(a => {
        const p = a.performance;
        const targetAmt = Number(p.target_amt || 1);
        const targetCnt = Number(p.target_cnt || 1);
        const contractAmt = Number(p.contract_amt || 0);
        const contractCnt = Number(p.contract_cnt || 0);

        teamRows.push([
          "", 
          a.name, 
          targetAmt, 
          contractAmt, 
          (contractAmt / targetAmt).toFixed(2), 
          targetCnt, 
          contractCnt, 
          (contractCnt / targetCnt).toFixed(2), 
          contractAmt - targetAmt
        ]);
      });

      const ws1 = XLSX.utils.aoa_to_sheet(teamRows);
      ws1["!cols"] = [{ wch: 3 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws1, "📊 팀 전체 현황");

      // [시트 2: 👤 개인별 상세 현황]
      const detailRows = [
        ["", "", "", "", "", "", "", "", ""],
        ["", "👤  팀원별 개인 실적 상세 리포트"],
        ["", ""],
      ];

      agents.forEach(a => {
        const p = a.performance;
        const actTotal = Number(p.call || 0) + Number(p.meet || 0) + Number(p.pt || 0) + Number(p.intro || 0);
        
        detailRows.push(["", `◆  ${a.name}  |  영업사원 개인 현황`]);
        detailRows.push(["", "구분", "금액(만원)", "건수", "전화", "만남", "제안", "소개", "DB배정", "반품"]);
        detailRows.push(["", "목표", p.target_amt, p.target_cnt, "", "", "", "", "", ""]);
        detailRows.push(["", "실적", p.contract_amt, p.contract_cnt, p.call, p.meet, p.pt, p.intro, p.db_assigned, p.db_returned]);
        detailRows.push(["", "활동합계", "", "", "", "", "", "", "", actTotal]);
        detailRows.push(["", "", "", "", "", "", "", "", "", ""]); // 여백
      });

      const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
      ws2["!cols"] = [{ wch: 3 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws2, "👤 개인별 상세 현황");

      XLSX.writeFile(wb, `Team_Report_${monthKey}.xlsx`);
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({ 
        head: [['성명', '목표(만)', '실적(만)', '건수', '전화', '만남', '제안', '소개']], 
        body: agents.map(a => [
          a.name, 
          Number(a.performance.target_amt || 0), 
          Number(a.performance.contract_amt || 0), 
          Number(a.performance.contract_cnt || 0), 
          Number(a.performance.call || 0), 
          Number(a.performance.meet || 0), 
          Number(a.performance.pt || 0), 
          Number(a.performance.intro || 0)
        ]) 
      });
      doc.save(`Team_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6">
      <div 
        onClick={() => setIsNoticeExpanded(!isNoticeExpanded)}
        className={`bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all duration-300 ${isNoticeExpanded ? 'min-h-[3.5rem] h-auto' : 'h-14 overflow-hidden'}`}
      >
        <div className={`font-black italic uppercase text-black w-full text-sm md:text-base ${isNoticeExpanded ? 'whitespace-normal leading-relaxed' : 'whitespace-nowrap animate-marquee'}`}>
          {globalNotice}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-[2rem] border-2 border-black">
        <a href="https://meta-on.kr/#/login" target="_blank" rel="noreferrer" className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">메타온</a>
        <a href="https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" target="_blank" rel="noreferrer" className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">자료실</a>
        <button onClick={() => setIsCalcOpen(true)} className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">업무지원(계산기)</button>
        
        <div className="relative">
          <button onClick={() => setShowExportOpt(!showExportOpt)} className="w-full bg-black text-[#d4af37] p-4 rounded-2xl text-[11px] md:text-xs italic shadow-lg font-black uppercase">실적 출력</button>
          {showExportOpt && (
            <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 w-full overflow-hidden">
              <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b text-left text-[11px] font-black">EXCEL 출력</button>
              <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-left text-[11px] font-black">PDF 출력</button>
            </div>
          )}
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
          <button key={t} onClick={()=>setActiveTab(t)} className={`${activeTab === t ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black py-4 px-1 rounded-2xl text-[10px] md:text-sm italic font-black text-center transition-all`}>
            {t==='perf'?'실적 관리':t==='act'?'활동 관리':t==='edu'?'교육 관리':'시스템 설정'}
          </button>
        ))}
      </div>

      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-lg md:text-xl mb-6 border-l-8 border-black pl-4 italic uppercase font-black">Team Monitoring</h2>
        <div className="space-y-4 md:space-y-6">
          {agents.map(a => {
            const progress = Math.min(((Number(a.performance.contract_amt) || 0) / (Number(a.performance.target_amt) || 1)) * 100, 100);
            return (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="p-5 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all font-black shadow-sm space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-lg md:text-xl font-black">{a.name} CA</p>
                  <div className="flex gap-4 md:gap-10 text-right">
                    <div className="font-black">
                      <p className="text-[8px] md:text-[10px] text-slate-400 uppercase">Goal</p>
                      <p className="text-[12px] md:text-[15px] italic">{(Number(a.performance.target_amt) || 0).toLocaleString()}만</p>
                    </div>
                    <div className="font-black">
                      <p className="text-[8px] md:text-[10px] text-indigo-500 uppercase font-black">Actual</p>
                      <p className="text-[14px] md:text-[18px] text-indigo-600 italic">{(Number(a.performance.contract_amt) || 0).toLocaleString()}만</p>
                    </div>
                  </div>
                </div>
                
                <div className="w-full h-2 md:h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>

                <div className="grid grid-cols-4 gap-1 md:gap-2 pt-2 border-t border-dashed border-slate-300">
                  <div className="text-center"><p className="text-[8px] md:text-[9px] text-slate-400">전화</p><p className="text-[11px] md:text-sm italic">{a.performance.call}회</p></div>
                  <div className="text-center"><p className="text-[8px] md:text-[9px] text-slate-400">만남</p><p className="text-[11px] md:text-sm italic">{a.performance.meet}회</p></div>
                  <div className="text-center"><p className="text-[8px] md:text-[9px] text-slate-400">제안</p><p className="text-[11px] md:text-sm italic">{a.performance.pt}회</p></div>
                  <div className="text-center"><p className="text-[8px] md:text-[9px] text-slate-400">소개</p><p className="text-[11px] md:text-sm italic">{a.performance.intro}회</p></div>
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
    <div className="bg-black p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] text-center font-black">
      <p className="text-[#d4af37] text-[8px] md:text-[10px] uppercase mb-1">{label}</p>
      <p className="text-white text-lg md:text-xl italic">{val}건</p>
      {sub && <p className="text-[#d4af37] text-[8px] md:text-[9px] mt-1 opacity-80">{sub}</p>}
    </div>
  )
}