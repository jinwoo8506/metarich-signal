"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AdminView.tsx (Updated: DB 필드 통합 및 기능 완전 유지)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import FinancialCalc from "./FinancialCalc"
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
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [showExportOpt, setShowExportOpt] = useState(false);
  const [totalActivity, setTotalActivity] = useState({ call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  // 마스터 권한 체크 (이메일 및 역할 기반)
  const currentUserEmail = user?.email?.toLowerCase()?.trim() || "";
  const isMaster = currentUserEmail === 'qodbtjq@naver.com' || user?.role === 'master' || user?.role_level === 'master';

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

    // 2. 유저 쿼리: 실적 대상인 모든 유저를 가져오되 권한별 필터링
    let userQuery = supabase.from("users").select("*");
    
    if (!isMaster) {
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

      // 3. 활동 합산
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
          `${a.department || ''} ${a.team || ''}`,
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

  // 영업도구(계산기) 실행 시 렌더링
  if (activeTab === 'finance') {
    return (
      <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-end p-4">
          <button onClick={() => setActiveTab(null)} className="bg-black text-[#d4af37] px-6 py-2 rounded-full font-black italic text-xs border-2 border-[#d4af37] hover:invert transition-all">
            CLOSE CALCULATOR ×
          </button>
        </div>
        <FinancialCalc />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6 text-black">
      {/* 상단 공지사항 */}
      <div onClick={() => setIsNoticeExpanded(!isNoticeExpanded)} className={`bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all duration-300 ${isNoticeExpanded ? 'min-h-[3.5rem] h-auto' : 'h-14 overflow-hidden'}`}>
        <div className={`font-black italic uppercase text-black w-full text-sm md:text-base ${isNoticeExpanded ? 'whitespace-normal leading-relaxed' : 'whitespace-nowrap animate-marquee'}`}>
          {globalNotice}
        </div>
      </div>

      {/* 퀵링크 섹션 (영업도구 포함 5개 유지) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-[2rem] border-2 border-black">
        <QuickLink href="https://meta-on.kr/#/login" label="메타온" />
        <QuickLink href="https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" label="자료실" />
        <button onClick={() => setActiveTab('finance')} className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">
          영업도구
        </button>
        <div className="relative col-span-2">
          <button onClick={() => setShowExportOpt(!showExportOpt)} className="w-full h-full bg-black text-[#d4af37] p-4 rounded-2xl text-[11px] md:text-xs italic shadow-lg font-black uppercase">
            실적 리포트 출력
          </button>
          {showExportOpt && (
            <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 w-full overflow-hidden">
              <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b text-left text-[11px] font-black uppercase">EXCEL Export</button>
              <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-left text-[11px] font-black uppercase">PDF Export</button>
            </div>
          )}
        </div>
      </div>

      {/* 활동 합산 데이터 */}
      {activeTab === 'act' && !selectedAgent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <TotalBox label="전체 전화" val={totalActivity.call} />
          <TotalBox label="전체 만남" val={totalActivity.meet} sub={`전환율 ${totalActivity.call > 0 ? ((totalActivity.meet/totalActivity.call)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 제안" val={totalActivity.pt} sub={`전환율 ${totalActivity.meet > 0 ? ((totalActivity.pt/totalActivity.meet)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 소개" val={totalActivity.intro} />
        </div>
      )}

      {/* 탭 메뉴 */}
      <div className="grid grid-cols-5 gap-2 font-black">
        {[
          { id: 'perf', label: '실적 관리' },
          { id: 'act', label: '활동 관리' },
          { id: 'edu', label: '교육 관리' },
          { id: 'sys', label: '시스템 설정' },
          { id: 'users', label: '조직 관리' }
        ].filter(t => t.id !== 'users' || isMaster).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`${activeTab === tab.id ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black py-4 px-1 rounded-2xl text-[10px] md:text-sm italic font-black text-center transition-all ${tab.id === 'users' ? 'border-dashed border-indigo-500' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 팀 모니터링 섹션 */}
      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-lg md:text-xl mb-6 border-l-8 border-black pl-4 italic uppercase font-black">
          {isMaster ? 'All Centers' : (user.department_name || 'My Unit')} Monitoring
        </h2>
        <div className="space-y-4 md:space-y-6">
          {agents.filter(a => a.is_approved).map(a => {
            const amtRate = Math.round(((Number(a.performance.contract_amt) || 0) / (Number(a.performance.target_amt) || 1)) * 100);
            const cntRate = Math.round(((Number(a.performance.contract_cnt) || 0) / (Number(a.performance.target_cnt) || 1)) * 100);
            return (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="p-5 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all font-black shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md italic uppercase bg-black text-white`}>
                        {a.role_level || a.role || 'planner'}
                      </span>
                      <p className="text-xl font-black">{a.name} <span className="text-sm text-slate-400 font-normal">({a.branch_name || '미소속'})</span></p>
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

      {/* 팝업 모듈 통합 */}
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
    <div className="space-y-3">
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

function QuickLink({ href, label }: any) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">
      {label}
    </a>
  );
}

function TotalBox({ label, val, sub }: any) {
  return (
    <div className="bg-black p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] text-center font-black border-2 border-[#d4af37]">
      <p className="text-[#d4af37] text-[8px] md:text-[10px] uppercase mb-1">{label}</p>
      <p className="text-white text-lg md:text-xl italic">{val}건</p>
      {sub && <p className="text-[#d4af37] text-[8px] md:text-[9px] mt-1 opacity-80">{sub}</p>}
    </div>
  )
}