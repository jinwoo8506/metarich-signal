"use client"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AdminView.tsx
// 관리자 화면 전담 파일 — UI/기능 수정은 이 파일만 건드리면 됩니다
// 엑셀 출력 내용/스타일 수정은 exportExcel.ts 파일을 수정하세요
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import CalcModal from "./CalcModal"
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

  // 활동 관리 탭용 전체 합산 데이터
  const [totalActivity, setTotalActivity] = useState({ call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { fetchTeamData(); }, [monthKey]);

  async function fetchTeamData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt:   Number(settings?.find(s => s.key === 'target_amt')?.value)        || 3000,
      targetCnt:   Number(settings?.find(s => s.key === 'target_cnt')?.value)        || 100,
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value) || 10,
      actualIntro: Number(settings?.find(s => s.key === 'actual_intro_cnt')?.value)  || 0,
    });

    const { data: users } = await supabase.from("users").select("*").eq("role", "agent");
    const { data: allPerfs } = await supabase.from("daily_perf").select("*");

    if (users) {
      const mappedAgents = users.map(u => {
        // 해당 직원의 전체 히스토리
        const userHistory = allPerfs?.filter(p => p.user_id === u.id) || [];
        // 현재 선택된 달의 실적
        const currentPerf = userHistory.find(p => p.date === monthKey) || {
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10,
          edu_status: '미참여', is_approved: false,
        };

        // 기네스/최저 데이터 산출 (매출액 0 초과 기준)
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

      // 전체 활동 합산 계산
      const totals = mappedAgents.reduce((acc, curr) => ({
        call:  acc.call  + Number(curr.performance.call  || 0),
        meet:  acc.meet  + Number(curr.performance.meet  || 0),
        pt:    acc.pt    + Number(curr.performance.pt    || 0),
        intro: acc.intro + Number(curr.performance.intro || 0),
      }), { call: 0, meet: 0, pt: 0, intro: 0 });
      setTotalActivity(totals);
    }
  }

  // ── 출력 핸들러 ──────────────────────────────────────────────────
  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      exportExcel({ agents, teamMeta, monthKey })
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [['성명', '목표(만)', '실적(만)', '건수', '전화', '만남', '제안', '소개']],
        body: agents.map(a => [
          a.name,
          Number(a.performance.target_amt   || 0),
          Number(a.performance.contract_amt  || 0),
          Number(a.performance.contract_cnt  || 0),
          Number(a.performance.call          || 0),
          Number(a.performance.meet          || 0),
          Number(a.performance.pt            || 0),
          Number(a.performance.intro         || 0),
        ]),
      });
      doc.save(`Team_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  // 날짜 변환 함수 (YYYY-MM-DD -> YY.MM)
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6">

      {/* 상단 공지사항 */}
      <div
        onClick={() => setIsNoticeExpanded(!isNoticeExpanded)}
        className={`bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all duration-300 ${isNoticeExpanded ? 'min-h-[3.5rem] h-auto' : 'h-14 overflow-hidden'}`}
      >
        <div className={`font-black italic uppercase text-black w-full text-sm md:text-base ${isNoticeExpanded ? 'whitespace-normal leading-relaxed' : 'whitespace-nowrap animate-marquee'}`}>
          {globalNotice}
        </div>
      </div>

      {/* 퀵링크 섹션: 총 4개 버튼 유지 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-[2rem] border-2 border-black">
        <a href="https://meta-on.kr/#/login" target="_blank" rel="noreferrer"
          className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">
          메타온
        </a>
        <a href="https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" target="_blank" rel="noreferrer"
          className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">
          자료실
        </a>
        <button onClick={() => setIsCalcOpen(true)}
          className="bg-white border-2 border-black p-4 rounded-2xl text-[11px] md:text-xs text-center italic hover:bg-black hover:text-[#d4af37] transition-all shadow-sm font-black uppercase">
          업무지원(계산기)
        </button>

        <div className="relative">
          <button onClick={() => setShowExportOpt(!showExportOpt)}
            className="w-full bg-black text-[#d4af37] p-4 rounded-2xl text-[11px] md:text-xs italic shadow-lg font-black uppercase">
            실적 출력
          </button>
          {showExportOpt && (
            <div className="absolute top-full right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-2xl z-50 w-full overflow-hidden">
              <button onClick={() => handleExport('excel')}
                className="w-full p-4 hover:bg-slate-50 border-b text-left text-[11px] font-black">
                EXCEL 출력
              </button>
              <button onClick={() => handleExport('pdf')}
                className="w-full p-4 hover:bg-slate-50 text-left text-[11px] font-black">
                PDF 출력
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 활동 관리 탭 클릭 시 상단에 총 합산 데이터 표기 */}
      {activeTab === 'act' && !selectedAgent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <TotalBox label="전체 전화" val={totalActivity.call} />
          <TotalBox label="전체 만남" val={totalActivity.meet}
            sub={`전환율 ${totalActivity.call > 0 ? ((totalActivity.meet/totalActivity.call)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 제안" val={totalActivity.pt}
            sub={`전환율 ${totalActivity.meet > 0 ? ((totalActivity.pt/totalActivity.meet)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 소개" val={totalActivity.intro} />
        </div>
      )}

      {/* 메인 탭 메뉴 */}
      <div className="grid grid-cols-4 gap-2 font-black">
        {['perf', 'act', 'edu', 'sys'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`${activeTab === t ? 'bg-black text-[#d4af37]' : 'bg-white text-black'} border-2 border-black py-4 px-1 rounded-2xl text-[10px] md:text-sm italic font-black text-center transition-all`}>
            {t==='perf'?'실적 관리':t==='act'?'활동 관리':t==='edu'?'교육 관리':'시스템 설정'}
          </button>
        ))}
      </div>

      {/* 팀 모니터링 섹션 */}
      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border shadow-sm font-black">
        <h2 className="text-lg md:text-xl mb-6 border-l-8 border-black pl-4 italic uppercase font-black">Team Monitoring</h2>
        <div className="space-y-4 md:space-y-6">
          {agents.map(a => {
            const amtRate = Math.min(((Number(a.performance.contract_amt) || 0) / (Number(a.performance.target_amt) || 1)) * 100, 100);
            const cntRate = Math.min(((Number(a.performance.contract_cnt) || 0) / (Number(a.performance.target_cnt) || 1)) * 100, 100);

            return (
              <div
                key={a.id}
                onClick={() => { setSelectedAgent(a); setActiveTab('act'); }}
                className="p-5 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-transparent hover:border-black cursor-pointer transition-all font-black shadow-sm space-y-4"
              >
                {/* 상단: 이름 및 기네스/최저 표시 (날짜 표기 포함) */}
                <div className="flex justify-between items-center">
                  <p className="text-lg md:text-xl font-black">{a.name} CA</p>
                  <div className="flex gap-2">
                    {a.best && (
                      <div className="text-[10px] bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-black border border-amber-200 shadow-sm">
                        🏆 BEST: {Number(a.best.contract_amt).toLocaleString()}만 ({formatDate(a.best.date)})
                      </div>
                    )}
                    {a.worst && (
                      <div className="text-[10px] bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-black border border-rose-200 shadow-sm">
                        📉 LOW: {Number(a.worst.contract_amt).toLocaleString()}만 ({formatDate(a.worst.date)})
                      </div>
                    )}
                  </div>
                </div>

                {/* 중앙: 실적 및 목표 가로 막대 그래프 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] italic">
                      <span className="text-slate-500 uppercase font-black">매출 달성률 ({amtRate.toFixed(0)}%)</span>
                      <span className="font-black text-indigo-600">{(Number(a.performance.contract_amt)||0).toLocaleString()} / {(Number(a.performance.target_amt)||0).toLocaleString()} 만</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${amtRate}%` }} />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] italic">
                      <span className="text-slate-500 uppercase font-black">건수 달성률 ({cntRate.toFixed(0)}%)</span>
                      <span className="font-black text-emerald-600">{(Number(a.performance.contract_cnt)||0)} / {(Number(a.performance.target_cnt)||0)} 건</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${cntRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 팝업 및 모달 모듈 */}
      {activeTab && (
        <AdminPopups
          type={activeTab}
          agents={agents}
          selectedAgent={selectedAgent}
          teamMeta={teamMeta}
          onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); }}
        />
      )}
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