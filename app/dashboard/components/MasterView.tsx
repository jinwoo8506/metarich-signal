"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MasterView.tsx (Redesigned: Clean Modern Dashboard)
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
  const [showExportOpt, setShowExportOpt] = useState(false);
  const [totalActivity, setTotalActivity] = useState({ call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  const rankMap: { [key: string]: string } = {
    'master': '마스터',
    'director': '본부장',
    'leader': '사업부장',
    'manager': '지점장',
    'agent': '설계사'
  };

  useEffect(() => { fetchTeamData(); }, [monthKey, user]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt:   Number(settings?.find(s => s.key === 'target_amt')?.value)         || 3000,
      targetCnt:   Number(settings?.find(s => s.key === 'target_cnt')?.value)         || 100,
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value) || 10,
      actualIntro: Number(settings?.find(s => s.key === 'actual_intro_cnt')?.value)  || 0,
    });

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
        return { ...u, performance: currentPerf, best: sorted[0] || null, worst: sorted[sorted.length - 1] || null };
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
    if (type === 'excel') exportExcel({ agents, teamMeta, monthKey });
    else {
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

  if (activeTab === 'finance') {
    return (
      <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="flex justify-between items-center p-6 bg-white border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Sales Calculator</h2>
          <button onClick={() => setActiveTab(null)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-slate-700 transition-all">
            닫기 ×
          </button>
        </div>
        <FinancialCalc />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 font-sans text-slate-900 pb-20 animate-in fade-in duration-500">
      {/* 🔴 상단 공지사항 */}
      <div onClick={() => setIsNoticeExpanded(!isNoticeExpanded)} className={`bg-blue-600 p-4 rounded-2xl flex items-center shadow-lg shadow-blue-600/20 cursor-pointer transition-all duration-500 ${isNoticeExpanded ? 'min-h-[4rem] h-auto' : 'h-14 overflow-hidden'}`}>
        <div className="flex items-center gap-4 w-full">
          <span className="bg-white text-blue-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0">NOTICE</span>
          <div className={`font-medium text-white w-full text-sm md:text-base ${isNoticeExpanded ? 'whitespace-normal leading-relaxed' : 'whitespace-nowrap animate-marquee'}`}>
            {globalNotice}
          </div>
        </div>
      </div>

      {/* 🟡 상단 유저 정보 및 퀵링크 */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🛡️</div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{user.department_name || "시그널그룹"} · {user.branch_name || "통합관리"}</p>
            <h2 className="text-xl font-bold text-slate-800">{user.name} <span className="text-blue-600 text-sm font-medium ml-1">{rankMap[user.role] || '관리자'}님</span></h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center">
          <QuickBtn label="메타온" url="https://meta-on.kr/#/login" color="bg-slate-50 text-slate-600" />
          <QuickBtn label="보험사 공시" url="https://xn--on3bi2e18htop.com/" color="bg-slate-50 text-slate-600" />
          <QuickBtn label="업무 자료실" url="https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" color="bg-slate-50 text-slate-600" />
          <QuickBtn label="영업 도구" onClick={() => setActiveTab('finance')} color="bg-slate-800 text-white" />
          <div className="relative">
            <QuickBtn label="리포트 출력" onClick={() => setShowExportOpt(!showExportOpt)} color="bg-blue-600 text-white border-none shadow-md shadow-blue-600/20" />
            {showExportOpt && (
              <div className="absolute top-full right-0 mt-3 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 w-48 overflow-hidden animate-in zoom-in-95 duration-200">
                <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b border-slate-100 text-left text-xs font-bold text-slate-700">엑셀(Excel)로 저장</button>
                <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-left text-xs font-bold text-slate-700">PDF 문서로 저장</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🟢 전체 활동 통계 (활동 관리 탭 활성 시 상단 노출) */}
      {activeTab === 'act' && !selectedAgent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
          <TotalBox label="전체 전화" val={totalActivity.call} color="bg-slate-900" />
          <TotalBox label="전체 미팅" val={totalActivity.meet} sub={`전환율 ${totalActivity.call > 0 ? ((totalActivity.meet/totalActivity.call)*100).toFixed(1) : 0}%`} color="bg-slate-800" />
          <TotalBox label="전체 제안" val={totalActivity.pt} sub={`전환율 ${totalActivity.meet > 0 ? ((totalActivity.pt/totalActivity.meet)*100).toFixed(1) : 0}%`} color="bg-slate-800" />
          <TotalBox label="전체 소개" val={totalActivity.intro} color="bg-slate-900" />
        </div>
      )}

      {/* 🔵 메인 관리 메뉴 */}
      <div className="flex flex-wrap p-1 bg-slate-100 rounded-2xl">
        {[
          { id: 'perf', label: '실적 모니터링' },
          { id: 'act', label: '활동량 분석' },
          { id: 'edu', label: '교육 이수현황' },
          { id: 'sys', label: '시스템 설정' },
          { id: 'users', label: '조직/권한 관리' }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 min-w-[100px] py-3.5 rounded-xl text-xs md:text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 🟣 에이전트 모니터링 섹션 */}
      <section className="space-y-6">
        <div className="flex justify-between items-end border-b border-slate-100 pb-4 ml-1">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">실시간 조직 모니터링</h2>
            <p className="text-sm text-slate-400 mt-1">{user?.role === 'master' ? '시그널그룹 전체' : (user?.department_name || '소속 조직')} 인원들의 활동을 분석합니다.</p>
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{agents.filter(a => a.is_approved).length} ACTIVE MEMBERS</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {agents.filter(a => a.is_approved).map(a => {
            const amtRate = Math.round(((Number(a.performance.contract_amt) || 0) / (Number(a.performance.target_amt) || 1)) * 100);
            const cntRate = Math.round(((Number(a.performance.contract_cnt) || 0) / (Number(a.performance.target_cnt) || 1)) * 100);

            return (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }}
                className="group p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 cursor-pointer transition-all duration-300 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg group-hover:bg-blue-50 transition-colors">👤</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-lg leading-none">{a.name}</p>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{rankMap[a.role] || '설계사'}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 font-medium">{a.branch_name || '지점 미소속'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <RecordBadge type="BEST" amt={a.best?.contract_amt} date={a.best ? formatDate(a.best.date) : ""} />
                    <RecordBadge type="LOW" amt={a.worst?.contract_amt} date={a.worst ? formatDate(a.worst.date) : ""} />
                  </div>
                </div>
                
                <div className="space-y-5 pt-2">
                  <MonitorBar label="매출 달성률" rate={amtRate} current={a.performance.contract_amt} target={a.performance.target_amt} unit="만" />
                  <MonitorBar label="건수 달성률" rate={cntRate} current={a.performance.contract_cnt} target={a.performance.target_cnt} unit="건" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ⚪ 팝업 모듈 */}
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
  const styles = rate >= 80 ? { bar: "bg-blue-500", text: "text-blue-600" } : rate >= 65 ? { bar: "bg-amber-500", text: "text-amber-600" } : rate >= 30 ? { bar: "bg-orange-400", text: "text-orange-500" } : { bar: "bg-rose-500", text: "text-rose-600" };
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</span>
          <span className="text-sm font-bold text-slate-700">{Number(current||0).toLocaleString()} / {Number(target||0).toLocaleString()}{unit}</span>
        </div>
        <span className={`text-2xl font-bold tracking-tight ${styles.text}`}>{rate}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div className={`${styles.bar} h-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </div>
  );
}

function RecordBadge({ type, amt, date }: any) {
  const isBest = type === "BEST";
  if (!amt) return null;
  return (
    <div className={`text-[9px] px-2.5 py-1 rounded-lg font-bold border transition-colors ${isBest ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
      {isBest ? '🏆' : '📊'} {type}: {Number(amt).toLocaleString()}만 <span className="opacity-50 ml-0.5">({date})</span>
    </div>
  );
}

function QuickBtn({ label, url, onClick, color }: any) { 
  const handleClick = () => { if (onClick) onClick(); else if (url && url !== "#") window.open(url, "_blank"); };
  return (
    <button onClick={handleClick} className={`${color} px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-200/10`}>
      {label}
    </button> 
  )
}

function TotalBox({ label, val, sub, color }: any) {
  return (
    <div className={`${color} p-6 rounded-2xl text-center shadow-lg border border-white/5`}>
      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">{label}</p>
      <p className="text-white text-2xl font-bold tracking-tight">{val}<span className="text-xs ml-0.5 opacity-40">건</span></p>
      {sub && <p className="text-blue-400 text-[10px] mt-2 font-bold">{sub}</p>}
    </div>
  )
}