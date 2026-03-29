"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LeaderView.tsx (사업부장: 소속 지점별 현황 및 전체 실적 모니터링)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import FinancialCalc from "./FinancialCalc"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { exportExcel } from "./exportExcel"

export default function LeaderView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [branchStats, setBranchStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);
  const [showExportOpt, setShowExportOpt] = useState(false);

  // 사업부 전체 실적 및 활동 합산
  const [totalActivity, setTotalActivity] = useState({ 
    call: 0, meet: 0, pt: 0, intro: 0, amt: 0, cnt: 0 
  });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { fetchDepartmentData(); }, [monthKey, user]);

  async function fetchDepartmentData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");

    const deptName = user.department_name || user.center; 
    const { data: users } = await supabase.from("users").select("*").eq('department_name', deptName);
    const { data: allPerfs } = await supabase.from("daily_perf").select("*");

    if (users) {
      const mappedAgents = users.map(u => {
        const userHistory = allPerfs?.filter(p => p.user_id === u.id) || [];
        const currentPerf = userHistory.find(p => p.date === monthKey) || {
          call: 0, meet: 0, pt: 0, intro: 0, 
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10
        };
        const validHistory = userHistory.filter(h => Number(h.contract_amt) > 0);
        const sorted = [...validHistory].sort((a, b) => Number(b.contract_amt) - Number(a.contract_amt));
        
        return { ...u, performance: currentPerf, best: sorted[0] || null };
      });
      setAgents(mappedAgents);

      const branches: any = {};
      const totals = mappedAgents.reduce((acc, curr) => {
        const bName = curr.branch_name || "미지정";
        if (!branches[bName]) branches[bName] = { name: bName, amt: 0, cnt: 0, members: 0 };
        branches[bName].amt += Number(curr.performance.contract_amt || 0);
        branches[bName].cnt += Number(curr.performance.contract_cnt || 0);
        branches[bName].members += 1;

        return {
          call: acc.call + Number(curr.performance.call || 0),
          meet: acc.meet + Number(curr.performance.meet || 0),
          pt: acc.pt + Number(curr.performance.pt || 0),
          intro: acc.intro + Number(curr.performance.intro || 0),
          amt: acc.amt + Number(curr.performance.contract_amt || 0),
          cnt: acc.cnt + Number(curr.performance.contract_cnt || 0),
        };
      }, { call: 0, meet: 0, pt: 0, intro: 0, amt: 0, cnt: 0 });

      setTotalActivity(totals);
      setBranchStats(Object.values(branches));
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      // 빌드 에러 해결: teamMeta 객체 추가
      exportExcel({ 
        agents, 
        monthKey, 
        teamMeta: { targetAmt: 3000, targetCnt: 100, targetIntro: 10, actualIntro: totalActivity.intro } 
      });
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [['지점', '성명', '직책', '실적(만)', '건수', '전화', '만남']],
        body: agents.map(a => [
          a.branch_name, a.name, a.role,
          Number(a.performance.contract_amt || 0),
          Number(a.performance.contract_cnt || 0),
          Number(a.performance.call || 0),
          Number(a.performance.meet || 0),
        ]),
      });
      doc.save(`Dept_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  if (activeTab === 'finance') {
    return (
      <div className="flex-1 animate-in fade-in duration-500">
        <div className="flex justify-end p-4"><button onClick={() => setActiveTab(null)} className="bg-black text-[#d4af37] px-6 py-2 rounded-full font-black italic text-xs border-2 border-[#d4af37]">CLOSE CALCULATOR ×</button></div>
        <FinancialCalc />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6 text-black">
      <div onClick={() => setIsNoticeExpanded(!isNoticeExpanded)} className={`bg-[#d4af37] p-4 rounded-3xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all ${isNoticeExpanded ? 'h-auto' : 'h-14 overflow-hidden'}`}>
        <div className={`font-black italic uppercase text-black text-sm ${isNoticeExpanded ? '' : 'animate-marquee whitespace-nowrap'}`}>{globalNotice}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TotalBox label="사업부 총 매출" val={`${totalActivity.amt.toLocaleString()}만`} color="border-[#d4af37]" />
        <TotalBox label="총 계약 건수" val={`${totalActivity.cnt}건`} color="border-black" />
        <TotalBox label="전체 가망고객" val={`${totalActivity.meet}명`} color="border-black" />
        <TotalBox label="전체 소개확보" val={`${totalActivity.intro}건`} color="border-black" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-[2rem] border-2 border-black">
        <QuickLink href="https://meta-on.kr/#/login" label="메타온 ERP" />
        <button onClick={() => setActiveTab('finance')} className="bg-white border-2 border-black p-4 rounded-2xl text-xs italic hover:bg-black hover:text-[#d4af37] transition-all font-black uppercase">영업도구</button>
        <button onClick={() => setShowExportOpt(!showExportOpt)} className="bg-black text-[#d4af37] p-4 rounded-2xl text-xs italic font-black uppercase relative">
          실적 리포트
          {showExportOpt && (
            <div className="absolute top-full left-0 mt-2 bg-white border-2 border-black rounded-xl shadow-2xl z-50 w-full text-black">
              <button onClick={() => handleExport('excel')} className="w-full p-3 border-b hover:bg-slate-100">EXCEL Export</button>
              <button onClick={() => handleExport('pdf')} className="w-full p-3 hover:bg-slate-100">PDF Export</button>
            </div>
          )}
        </button>
        <div className="bg-white border-2 border-black p-4 rounded-2xl text-center flex flex-col justify-center">
            <span className="text-[8px] text-slate-400">조직 인원</span>
            <span className="text-sm">{agents.length}명</span>
        </div>
      </div>

      <section className="bg-white p-6 rounded-[2.5rem] border-2 border-black shadow-sm">
        <h2 className="text-lg mb-6 border-l-8 border-black pl-4 italic uppercase font-black">Branch Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branchStats.map(branch => (
            <div key={branch.name} className="p-5 bg-slate-900 text-white rounded-[1.5rem] border-2 border-black">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm italic text-[#d4af37]">{branch.name}</span>
                <span className="text-[10px] opacity-60">{branch.members}명</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[9px] uppercase opacity-50">AMT</p><p className="text-xl italic">{branch.amt.toLocaleString()}만</p></div>
                <div><p className="text-[9px] uppercase opacity-50">CNT</p><p className="text-xl italic">{branch.cnt}건</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
        <h2 className="text-lg mb-6 border-l-8 border-slate-300 pl-4 italic uppercase font-black">Agent Status</h2>
        <div className="space-y-4">
          {agents.map(a => {
            const amtRate = Math.round(((Number(a.performance.contract_amt) || 0) / (Number(a.performance.target_amt) || 1)) * 100);
            return (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="p-5 bg-slate-50 rounded-[1.5rem] hover:border-black border-2 border-transparent cursor-pointer transition-all">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded mr-2 uppercase">{a.role}</span>
                    <span className="text-lg font-black">{a.name}</span>
                  </div>
                  <span className="text-2xl italic font-black text-blue-600">{amtRate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: `${Math.min(amtRate, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {activeTab && !['finance'].includes(activeTab) && (
        <AdminPopups type={activeTab} agents={agents} selectedAgent={selectedAgent} onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchDepartmentData(); }} />
      )}
    </div>
  )
}

function TotalBox({ label, val, color }: any) {
  return (
    <div className={`bg-white p-5 rounded-[2rem] text-center border-4 ${color} shadow-sm`}>
      <p className="text-[10px] uppercase mb-1 text-slate-400">{label}</p>
      <p className="text-xl italic font-black">{val}</p>
    </div>
  )
}

function QuickLink({ href, label }: any) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="bg-white border-2 border-black p-4 rounded-2xl text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all font-black uppercase">
      {label}
    </a>
  );
}