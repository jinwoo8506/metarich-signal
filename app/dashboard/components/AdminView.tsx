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
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 3000, targetCnt: 100 });
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [showExportOpt, setShowExportOpt] = useState(false);

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { fetchTeamData(); }, [monthKey]);

  async function fetchTeamData() {
    // 1. 시스템 설정 로드 (공지 및 팀 전체 목표)
    const { data: settings } = await supabase.from("team_settings").select("*");
    const notice = settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.";
    const tAmt = Number(settings?.find(s => s.key === 'target_amt')?.value) || 3000;
    const tCnt = Number(settings?.find(s => s.key === 'target_cnt')?.value) || 100;
    
    setGlobalNotice(notice);
    setTeamMeta({ targetAmt: tAmt, targetCnt: tCnt });

    // 2. 직원 데이터 및 실적 로드
    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: perfs } = await supabase.from("daily_perf").select("*").eq("date", monthKey);
    
    if (users) {
      setAgents(users.map(u => ({
        ...u,
        performance: perfs?.find(p => p.user_id === u.id) || { 
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
          contract_amt: 0, contract_cnt: 0, is_approved: false 
        }
      })));
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      const data = agents.map(a => ({ 성명: a.name, 실적: a.performance.contract_amt, 건수: a.performance.contract_cnt, 전화: a.performance.call, 미팅: a.performance.meet }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TeamPerformance");
      XLSX.writeFile(wb, `Team_Report_${monthKey}.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.text(`Team Report - ${monthKey}`, 14, 15);
      const rows = agents.map(a => [a.name, `${a.performance.contract_amt}만`, `${a.performance.contract_cnt}건`, a.performance.call, a.performance.is_approved ? "YES" : "NO"]);
      (doc as any).autoTable({ head: [['Name', 'Amt', 'Cnt', 'Call', 'Approve']], body: rows, startY: 20 });
      doc.save(`Team_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  const handleApprove = async (agent: any) => {
    const { id, created_at, updated_at, ...purePerf } = agent.performance;
    await supabase.from("daily_perf").upsert({ ...purePerf, user_id: agent.id, date: monthKey, is_approved: true }, { onConflict: 'user_id, date' });
    fetchTeamData();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-2 font-black">
      {/* 🗓️ 사이드바 (달력 아래 3개월 평균 배치) */}
      <div className="w-full lg:w-72 space-y-4">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm border-black/5">
          <p className="text-[10px] text-slate-400 mb-4 uppercase tracking-widest font-black">Calendar & Analysis</p>
          <div className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 italic">Calendar Widget</div>
          
          <button 
            onClick={() => setActiveTab('3m_avg')}
            className="w-full mt-6 bg-slate-900 text-[#d4af37] py-5 rounded-2xl text-sm italic shadow-xl hover:scale-105 transition-transform font-black"
          >
            3-MONTH AVG SUMMARY 📊
          </button>
        </div>
      </div>

      {/* 🚀 메인 컨텐츠 */}
      <div className="flex-1 space-y-6">
        {/* 상단 공지 및 퀵링크 (출력 버튼 포함) */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 bg-[#d4af37] p-4 rounded-3xl border-2 border-black overflow-hidden h-14 relative flex items-center">
            <div className="absolute whitespace-nowrap animate-marquee font-black italic text-black">{globalNotice}</div>
          </div>
          
          <div className="flex gap-2 relative h-14">
            <QuickBtn label="영업도구" color="bg-black text-[#d4af37]" onClick={() => setIsCalcOpen(true)} />
            <div className="relative">
              <QuickBtn label="리포트 출력" color="bg-white border-2 border-black" onClick={() => setShowExportOpt(!showExportOpt)} />
              {showExportOpt && (
                <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 w-36 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b text-xs font-black text-left">📥 EXCEL 다운로드</button>
                  <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-xs font-black text-left">📥 PDF 다운로드</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 메인 탭 */}
        <div className="grid grid-cols-4 gap-2">
          <TabBtn label="실적 관리" active={activeTab === 'perf'} onClick={()=>setActiveTab('perf')} />
          <TabBtn label="활동 관리" active={activeTab === 'act'} onClick={()=>setActiveTab('act')} />
          <TabBtn label="교육 관리" active={activeTab === 'edu'} onClick={()=>setActiveTab('edu')} />
          <TabBtn label="시스템 설정" active={activeTab === 'sys'} onClick={()=>setActiveTab('sys')} />
        </div>

        {/* 팀 모니터링 (직원 클릭 시 활동 관리로 이동) */}
        <section className="bg-white p-8 rounded-[3.5rem] border shadow-sm">
          <h2 className="text-xl mb-6 border-l-8 border-black pl-4 font-black uppercase italic">Team Real-time Monitor</h2>
          <div className="space-y-4">
            {agents.map(a => (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-lg font-black">{a.name} CA</p>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-black ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-amber-100 text-amber-600'}`}>
                    {a.performance.is_approved ? 'CONFIRMED' : 'WAITING'}
                  </span>
                </div>
                <div className="flex gap-4">
                   <MiniInfo label="실적" val={`${a.performance.contract_amt}만`} />
                   <MiniInfo label="건수" val={`${a.performance.contract_cnt}건`} />
                   <MiniInfo label="만남" val={`${a.performance.meet}회`} />
                </div>
                {!a.performance.is_approved && (
                  <button onClick={(e)=>{e.stopPropagation(); handleApprove(a);}} className="bg-black text-[#d4af37] px-5 py-2 rounded-xl text-xs italic font-black">승인</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {activeTab && (
        <AdminPopups 
          type={activeTab} 
          agents={agents} 
          selectedAgent={selectedAgent}
          teamMeta={teamMeta} 
          selectedDate={selectedDate}
          onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); }} 
        />
      )}
      {isCalcOpen && <CalcModal onClose={() => setIsCalcOpen(false)} />}
    </div>
  )
}

function MiniInfo({ label, val }: any) { return <div className="text-center w-16"><p className="text-[9px] text-slate-400 font-black">{label}</p><p className="text-sm font-black">{val}</p></div> }
function TabBtn({ label, active, onClick }: any) { return <button onClick={onClick} className={`${active ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black p-5 rounded-2xl font-black text-sm italic transition-all shadow-sm shrink-0`}>{label}</button> }
function QuickBtn({ label, color, onClick }: any) { return <button onClick={onClick} className={`${color} px-6 py-4 rounded-2xl font-black text-xs shrink-0 shadow-lg hover:scale-105 transition-transform italic`}>{label}</button> }