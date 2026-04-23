"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AdminView.tsx (Updated: 조직 관리 & 영업도구 통합)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import FinancialCalc from "./FinancialCalc" // 영업도구(계산기) 컴포넌트
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { exportExcel } from "./exportExcel"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 3000, targetCnt: 100, targetIntro: 10, actualIntro: 0 });
  const [showExportOpt, setShowExportOpt] = useState(false);

  // 활동 관리 탭용 전체 합산 데이터
  const [totalActivity, setTotalActivity] = useState({ call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { fetchTeamData(); }, [monthKey, user]);

  async function fetchTeamData() {
    // 1. 공지사항 및 팀 설정 로드
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt:   Number(settings?.find(s => s.key === 'target_amt')?.value)         || 3000,
      targetCnt:   Number(settings?.find(s => s.key === 'target_cnt')?.value)         || 100,
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value) || 10,
      actualIntro: Number(settings?.find(s => s.key === 'actual_intro_cnt')?.value)  || 0,
    });

    // 2. 권한별 유저 필터링 로직 (마스터/사업부장/지점장)
    let userQuery = supabase.from("users").select("*");
    
    if (user?.role_level !== 'master' && user?.role !== 'master') {
      if (user?.role_level === 'director' || user?.role === 'leader') {
        userQuery = userQuery.eq('department_name', user.department_name); 
      } else if (user?.role_level === 'manager' || user?.role === 'manager') {
        userQuery = userQuery.eq('branch_name', user.branch_name);
      }
    }

    const { data: users } = await userQuery;
    const { data: allPerfs } = await supabase.from("daily_perf").select("*");

    if (users) {
      const mappedAgents = users.map(u => {
        const userHistory = allPerfs?.filter(p => p.user_id === u.id) || [];
        const currentPerf = userHistory.find(p => p.date === monthKey) || {
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10,
          edu_status: '미참여', is_approved: u.is_approved || false,
        };

        const validHistory = userHistory.filter(h => Number(h.contract_amt) > 0);
        const sorted = [...validHistory].sort((a, b) => Number(b.contract_amt) - Number(a.contract_amt));
        
        return {
          ...u,
          performance: currentPerf,
          best: sorted[0] || null,
          worst: sorted[sorted.length - 1] || null
        };
      });
      setAgents(mappedAgents);

      const totals = mappedAgents.filter(a => a.is_approved).reduce((acc, curr) => ({
        call:  acc.call  + Number(curr.performance.call  || 0),
        meet:  acc.meet  + Number(curr.performance.meet  || 0),
        pt:    acc.pt    + Number(curr.performance.pt    || 0),
        intro: acc.intro + Number(curr.performance.intro || 0),
      }), { call: 0, meet: 0, pt: 0, intro: 0 });
      setTotalActivity(totals);
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      exportExcel({ agents, teamMeta, monthKey })
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [['성명', '소속', '직책', '실적(만)', '건수', '전화', '만남', '제안']],
        body: agents.map(a => [
          a.name,
          `${a.department_name || ''} ${a.branch_name || ''}`,
          a.role_level || a.role || '설계사',
          Number(a.performance.contract_amt || 0),
          Number(a.performance.contract_cnt || 0),
          Number(a.performance.call || 0),
          Number(a.performance.meet || 0),
          Number(a.performance.pt || 0),
        ]),
      });
      doc.save(`Team_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // 🟠 영업도구(계산기) 활성화 시 화면 전환
  if (activeTab === 'finance') {
    return (
      <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 font-black">
        <div className="flex justify-between items-center p-6 bg-white border-b-2 border-black">
          <h2 className="text-xl italic uppercase">Sales Calculator</h2>
          <button onClick={() => setActiveTab(null)} className="bg-black text-[#d4af37] px-6 py-2 rounded-full font-black italic text-xs border-2 border-[#d4af37] hover:invert transition-all">
            CLOSE ×
          </button>
        </div>
        <FinancialCalc />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6 text-black pb-20">
      {/* 🔴 상단 공지사항 */}
      <div onClick={() => setIsNoticeExpanded(!isNoticeExpanded)} className={`bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all duration-300 ${isNoticeExpanded ? 'min-h-[3.5rem] h-auto' : 'h-14 overflow-hidden'}`}>
        <div className={`font-black italic uppercase text-black w-full text-sm md:text-base ${isNoticeExpanded ? 'whitespace-normal leading-relaxed' : 'whitespace-nowrap animate-marquee'}`}>
          {globalNotice}
        </div>
      </div>

      {/* 🟡 퀵링크 섹션 (직원과 동일하게 5개 구성 유지) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-[2rem] border-2 border-black shadow-sm">
        <QuickLink href="https://meta-on.kr/#/login" label="메타온" />
        <QuickLink href="https://xn--on3bi2e18htop.com/" label="보험사" />
        <QuickLink href="https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" label="자료실" />
        <button onClick={() => setActiveTab('finance')} className="bg-black text-[#d4af37] border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-slate-800 transition-all shadow-sm font-black uppercase">
          영업도구
        </button>
        <div className="relative">
          <button onClick={() => setShowExportOpt(!showExportOpt)} className="w-full h-full bg-emerald-600 text-white p-4 rounded-2xl text-[11px] md:text-xs italic shadow-lg font-black uppercase border-2 border-black">
            리포트 출력
          </button>
          {showExportOpt && (
            <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 w-48 overflow-hidden">
              <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b text-left text-[11px] font-black uppercase">EXCEL Export</button>
              <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-left text-[11px] font-black uppercase">PDF Export</button>
            </div>
          )}
        </div>
      </div>

      {/* 🟢 활동 데이터 합산 (활동 관리 탭 클릭 시 상단 노출) */}
      {activeTab === 'act' && !selectedAgent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <TotalBox label="전체 전화" val={totalActivity.call} />
          <TotalBox label="전체 만남" val={totalActivity.meet} sub={`전환율 ${totalActivity.call > 0 ? ((totalActivity.meet/totalActivity.call)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 제안" val={totalActivity.pt} sub={`전환율 ${totalActivity.meet > 0 ? ((totalActivity.pt/totalActivity.meet)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 소개" val={totalActivity.intro} />
        </div>
      )}

      {/* 🔵 메인 탭 메뉴 */}
      <div className="grid grid-cols-5 gap-2 font-black">
        {['perf', 'act', 'edu', 'sys', 'users'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`${activeTab === t ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black py-4 px-1 rounded-2xl text-[10px] md:text-sm italic font-black text-center transition-all ${t === 'users' ? 'border-dashed border-indigo-500' : ''}`}>
            {t==='perf'?'실적 관리':t==='act'?'활동 관리':t==='edu'?'교육 관리':t==='sys'?'시스템 설정':'조직 관리'}
          </button>
        ))}
      </div>

      {/* 🟣 에이전트 모니터링 리스트 */}
      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-black shadow-sm font-black">
        <h2 className="text-lg md:text-xl mb-6 border-l-8 border-black pl-4 italic uppercase font-black">
          {user?.role_level === 'master' ? 'All Centers' : (user?.department_name || 'My Unit')} Monitoring
        </h2>
        <div className="space-y-4 md:space-y-6">
          {agents.filter(a => a.is_approved).map(a => {
            const amtRate = Math.round(((Number(a.performance.contract_amt) || 0) / (Number(a.performance.target_amt) || 1)) * 100);
            const cntRate = Math.round(((Number(a.performance.contract_cnt) || 0) / (Number(a.performance.target_cnt) || 1)) * 100);

            return (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }}
                className="p-5 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all font-black shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-md italic uppercase">{a.role_level || a.role || 'planner'}</span>
                      <p className="text-xl font-black">{a.name} <span className="text-sm text-slate-400 font-normal">({a.branch_name || '미소속'})</span></p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RecordBadge type="BEST" amt={a.best?.contract_amt} date={a.best ? formatDate(a.best.date) : ""} />
                      <RecordBadge type="LOW" amt={a.worst?.contract_amt} date={a.worst ? formatDate(a.worst.date) : ""} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <MonitorBar label="매출 달성률" rate={amtRate} current={a.performance.contract_amt} target={a.performance.target_amt} unit="만" />
                  <MonitorBar label="건수 달성률" rate={cntRate} current={a.performance.contract_cnt} target={a.performance.target_cnt} unit="건" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ⚪ 팝업 모듈 (AdminPopups.tsx 사용) */}
      {activeTab && !['finance'].includes(activeTab) && (
        <AdminPopups
          type={activeTab}
          agents={agents}
          selectedAgent={selectedAgent}
          teamMeta={teamMeta}
          onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); }}
        />
      )}
    </div>
  )
}

/** 헬퍼 컴포넌트 **/
function MonitorBar({ label, rate, current, target, unit }: any) {
  const styles = rate >= 80 ? { bar: "bg-blue-500", text: "text-blue-600" } : rate >= 65 ? { bar: "bg-orange-500", text: "text-orange-600" } : rate >= 30 ? { bar: "bg-yellow-400", text: "text-yellow-500" } : { bar: "bg-red-500", text: "text-red-600" };
  return (
    <div className="space-y-3 font-black">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-black">{label}</span>
          <span className="text-[12px] font-black">{Number(current||0).toLocaleString()} / {Number(target||0).toLocaleString()} {unit}</span>
        </div>
        <span className={`text-3xl italic font-black ${styles.text}`}>{rate}%</span>
      </div>
      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-black/5">
        <div className={`${styles.bar} h-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </div>
  );
}

function RecordBadge({ type, amt, date }: any) {
  const isBest = type === "BEST";
  if (!amt) return null;
  return (
    <div className={`text-[9px] md:text-[10px] px-3 py-1 rounded-full font-black border shadow-sm ${isBest ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
      {isBest ? '🏆' : '📉'} {type}: {Number(amt).toLocaleString()}만 ({date})
    </div>
  );
}

function QuickLink({ href, label }: any) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase flex items-center justify-center">
      {label}
    </a>
  );
}

function TotalBox({ label, val, sub }: any) {
  return (
    <div className="bg-black p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] text-center font-black border-2 border-[#d4af37] shadow-xl">
      <p className="text-[#d4af37] text-[8px] md:text-[10px] uppercase mb-1">{label}</p>
      <p className="text-white text-lg md:text-xl italic">{val}건</p>
      {sub && <p className="text-[#d4af37] text-[8px] md:text-[9px] mt-1 opacity-80">{sub}</p>}
    </div>
  )
}