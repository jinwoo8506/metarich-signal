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
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
          contract_amt: 0, contract_cnt: 0, edu_status: '미참여', is_approved: false 
        }
      })));
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      const ws = XLSX.utils.json_to_sheet(agents.map(a => ({ 성명: a.name, 실적: a.performance.contract_amt, 건수: a.performance.contract_cnt })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `Team_Report.xlsx`);
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({ head: [['Name', 'Amt', 'Cnt']], body: agents.map(a => [a.name, a.performance.contract_amt, a.performance.contract_cnt]) });
      doc.save("Report.pdf");
    }
    setShowExportOpt(false);
  };

  return (
    <div className="flex-1 space-y-6 font-black">
      {/* 상단 공지 및 퀵링크 (출력 버튼 이동) */}
      <div className="flex flex-col md:flex-row gap-4 items-center font-black">
        <div className="flex-1 bg-[#d4af37] p-4 rounded-3xl border-2 border-black h-14 relative flex items-center overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute whitespace-nowrap animate-marquee font-black italic uppercase text-black">{globalNotice}</div>
        </div>
        <div className="flex gap-2 relative">
          <button onClick={() => setIsCalcOpen(true)} className="bg-black text-[#d4af37] px-6 py-4 rounded-2xl text-xs italic shadow-lg font-black">영업도구</button>
          <div className="relative">
            <button onClick={() => setShowExportOpt(!showExportOpt)} className="bg-white border-2 border-black px-6 py-4 rounded-2xl text-xs italic shadow-lg font-black">리포트 출력</button>
            {showExportOpt && (
              <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 w-36 overflow-hidden">
                <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b text-left text-xs font-black">EXCEL 출력</button>
                <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-left text-xs font-black">PDF 출력</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="grid grid-cols-4 gap-2 font-black">
        {['perf', 'act', 'edu', 'sys'].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} className={`${activeTab === t ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-2xl text-sm italic font-black`}>
            {t==='perf'?'실적 관리':t==='act'?'활동 관리':t==='edu'?'교육 관리':'시스템 설정'}
          </button>
        ))}
      </div>

      {/* 직원 리스트 (클릭 시 활동 관리로 이동) */}
      <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-xl mb-6 border-l-8 border-black pl-4 italic uppercase font-black">Team Monitoring</h2>
        <div className="space-y-4">
          {agents.map(a => (
            <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all flex justify-between items-center font-black shadow-sm">
              <p className="text-lg font-black">{a.name} CA</p>
              <div className="flex gap-8">
                 <div className="text-center font-black"><p className="text-[9px] text-slate-400">실적</p><p className="text-sm">{a.performance.contract_amt}만</p></div>
                 <div className="text-center font-black"><p className="text-[9px] text-slate-400">전화</p><p className="text-sm">{a.performance.call}회</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {activeTab && <AdminPopups type={activeTab} agents={agents} selectedAgent={selectedAgent} teamMeta={teamMeta} onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); }} />}
      {isCalcOpen && <CalcModal onClose={() => setIsCalcOpen(false)} />}
    </div>
  )
}