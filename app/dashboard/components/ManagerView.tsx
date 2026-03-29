"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ManagerView.tsx (지점장: 지점 목표 관리 및 설계사 활동 밀착 모니터링)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import FinancialCalc from "./FinancialCalc"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { exportExcel } from "./exportExcel"

export default function ManagerView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);
  const [showExportOpt, setShowExportOpt] = useState(false);

  // 지점 전체 통계
  const [branchTotal, setBranchTotal] = useState({ 
    amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, 
    targetAmt: 2000, // 지점 기본 목표 (DB 연동 가능)
  });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { fetchBranchData(); }, [monthKey, user]);

  async function fetchBranchData() {
    // 1. 공지사항 로드
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    const branchTarget = Number(settings?.find(s => s.key === `target_amt_${user.branch_name}`)?.value) || 2000;

    // 2. 우리 지점 인원만 필터링
    const { data: users } = await supabase.from("users")
      .select("*")
      .eq('branch_name', user.branch_name);

    const { data: allPerfs } = await supabase.from("daily_perf").select("*");

    if (users) {
      const mappedAgents = users.map(u => {
        const userHistory = allPerfs?.filter(p => p.user_id === u.id) || [];
        const currentPerf = userHistory.find(p => p.date === monthKey) || {
          call: 0, meet: 0, pt: 0, intro: 0, 
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10
        };
        
        return { ...u, performance: currentPerf };
      });
      setAgents(mappedAgents);

      // 3. 지점 합산 데이터 계산
      const totals = mappedAgents.reduce((acc, curr) => ({
        amt:   acc.amt   + Number(curr.performance.contract_amt || 0),
        cnt:   acc.cnt   + Number(curr.performance.contract_cnt || 0),
        call:  acc.call  + Number(curr.performance.call  || 0),
        meet:  acc.meet  + Number(curr.performance.meet  || 0),
        pt:    acc.pt    + Number(curr.performance.pt    || 0),
      }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0 });

      setBranchTotal({ ...totals, targetAmt: branchTarget });
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') exportExcel({ agents, monthKey });
    else {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [['성명', '실적(만)', '건수', '전화', '만남', '제안']],
        body: agents.map(a => [
          a.name, a.performance.contract_amt, a.performance.contract_cnt,
          a.performance.call, a.performance.meet, a.performance.pt
        ]),
      });
      doc.save(`${user.branch_name}_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  if (activeTab === 'finance') {
    return (
      <div className="flex-1 animate-in fade-in duration-500">
        <div className="flex justify-end p-4"><button onClick={() => setActiveTab(null)} className="bg-black text-[#d4af37] px-6 py-2 rounded-full font-black italic text-xs border-2 border-[#d4af37]">CLOSE ×</button></div>
        <FinancialCalc />
      </div>
    );
  }

  const branchRate = Math.round((branchTotal.amt / branchTotal.targetAmt) * 100);

  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6 text-black">
      {/* 1. 지점 목표 달성 현황 (Manager 전용 메인 위젯) */}
      <section className="bg-black p-8 rounded-[3rem] text-white border-4 border-[#d4af37] shadow-xl">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-[#d4af37] text-xs italic mb-1 uppercase">{user.branch_name} Goal Progress</p>
            <h2 className="text-3xl italic font-black">{branchTotal.amt.toLocaleString()} / {branchTotal.targetAmt.toLocaleString()} <span className="text-sm font-normal not-italic">만</span></h2>
          </div>
          <div className="text-right">
            <span className="text-5xl italic font-black text-[#d4af37]">{branchRate}%</span>
          </div>
        </div>
        <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/20">
          <div className="bg-[#d4af37] h-full transition-all duration-1000" style={{ width: `${Math.min(branchRate, 100)}%` }} />
        </div>
      </section>

      {/* 2. 지점 활동 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <ActivityCard label="Total Call" val={branchTotal.call} unit="건" color="bg-blue-50 text-blue-600" />
        <ActivityCard label="Total Meet" val={branchTotal.meet} unit="건" color="bg-orange-50 text-orange-600" />
        <ActivityCard label="Total PT" val={branchTotal.pt} unit="건" color="bg-purple-50 text-purple-600" />
      </div>

      {/* 3. 퀵메뉴 (영업도구 및 출력) */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        <button onClick={() => setActiveTab('finance')} className="whitespace-nowrap bg-white border-2 border-black px-6 py-4 rounded-2xl text-xs italic font-black uppercase hover:bg-black hover:text-[#d4af37] transition-all">영업용 계산기</button>
        <button onClick={() => setShowExportOpt(!showExportOpt)} className="whitespace-nowrap bg-white border-2 border-black px-6 py-4 rounded-2xl text-xs italic font-black uppercase relative">
          리포트 출력
          {showExportOpt && (
            <div className="absolute top-full left-0 mt-2 bg-white border-2 border-black rounded-xl shadow-2xl z-50 min-w-[120px] text-black overflow-hidden">
              <button onClick={() => handleExport('excel')} className="w-full p-3 border-b hover:bg-slate-100 text-[10px]">EXCEL</button>
              <button onClick={() => handleExport('pdf')} className="w-full p-3 hover:bg-slate-100 text-[10px]">PDF</button>
            </div>
          )}
        </button>
        <div className="whitespace-nowrap bg-slate-100 border-2 border-transparent px-6 py-4 rounded-2xl text-xs italic font-black uppercase text-slate-400">지점 인원: {agents.length}명</div>
      </div>

      {/* 4. 우리 지점 설계사별 세부 현황 */}
      <section className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
        <h2 className="text-lg mb-6 border-l-8 border-black pl-4 italic uppercase font-black">Agent Activity</h2>
        <div className="space-y-4">
          {agents.map(a => (
            <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="group p-5 bg-white rounded-[2rem] border-2 border-slate-100 hover:border-black transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xl font-black">{a.name}</p>
                  <p className="text-[10px] text-slate-400 italic">Target: {a.performance.target_amt}만</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-blue-600">{Number(a.performance.contract_amt).toLocaleString()}만</p>
                  <p className="text-[10px] text-slate-400">{a.performance.contract_cnt}건 완료</p>
                </div>
              </div>
              
              {/* 활동지표 미니바 */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed">
                <MiniStat label="CALL" val={a.performance.call} />
                <MiniStat label="MEET" val={a.performance.meet} />
                <MiniStat label="PT" val={a.performance.pt} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 팝업 모듈 */}
      {activeTab && !['finance'].includes(activeTab) && (
        <AdminPopups
          type={activeTab}
          agents={agents}
          selectedAgent={selectedAgent}
          onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchBranchData(); }}
        />
      )}
    </div>
  )
}

/** 헬퍼 컴포넌트 **/
function ActivityCard({ label, val, unit, color }: any) {
  return (
    <div className={`${color} p-4 rounded-2xl border border-black/5 text-center`}>
      <p className="text-[8px] font-black uppercase opacity-60 mb-1">{label}</p>
      <p className="text-lg italic font-black">{val}{unit}</p>
    </div>
  )
}

function MiniStat({ label, val }: any) {
  return (
    <div className="text-center">
      <span className="text-[8px] text-slate-400 block">{label}</span>
      <span className="text-xs font-black italic">{val}</span>
    </div>
  )
}