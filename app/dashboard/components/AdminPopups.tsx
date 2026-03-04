"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, selectedDate, onClose }: any) {
  const [targetAmt, setTargetAmt] = useState(teamMeta.targetAmt);
  const [targetCnt, setTargetCnt] = useState(teamMeta.targetCnt);
  const [notice, setNotice] = useState("");
  const [avgData, setAvgData] = useState<any>(null);

  // 1. 3개월 평균 데이터 로직 복구
  useEffect(() => {
    if (type === '3m_avg') fetch3MonthAvg();
    const loadSys = async () => {
      const { data } = await supabase.from("team_settings").select("*");
      setNotice(data?.find(s => s.key === 'global_notice')?.value || "");
    };
    loadSys();
  }, [type]);

  async function fetch3MonthAvg() {
    const dates = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    }
    const { data } = await supabase.from("daily_perf").select("*").in("date", dates);
    if (data && data.length > 0) {
      const sum = data.reduce((acc, curr) => ({
        amt: acc.amt + curr.contract_amt, cnt: acc.cnt + curr.contract_cnt,
        call: acc.call + curr.call, meet: acc.meet + curr.meet, pt: acc.pt + curr.pt
      }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0 });
      setAvgData({ 
        amt: Math.round(sum.amt / 3), cnt: (sum.cnt / 3).toFixed(1), 
        call: Math.round(sum.call / 3), meet: Math.round(sum.meet / 3) 
      });
    }
  }

  // 2. 활동 관리 합계 로직 복구
  const sum = (key: string) => agents.reduce((s: any, a: any) => s + (Number(a.performance?.[key]) || 0), 0);
  const totalAmt = sum('contract_amt');
  const totalCnt = sum('contract_cnt');

  const saveSys = async () => {
    await supabase.from("team_settings").upsert([
      { key: 'target_amt', value: String(targetAmt) },
      { key: 'target_cnt', value: String(targetCnt) },
      { key: 'global_notice', value: notice }
    ]);
    alert("팀 운영 지침이 반영되었습니다.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 font-black">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[4rem] p-10 overflow-y-auto relative shadow-2xl border-4 border-black">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black hover:rotate-90 transition-all">✕</button>

        {/* 📈 실적 관리: 팀 전체 합산 실적 & 달성률 */}
        {type === 'perf' && (
          <div className="space-y-12 animate-in fade-in">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Team Total Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <ProgressBox label="팀 전체 실적 달성률" cur={totalAmt} tar={teamMeta.targetAmt} unit="만" color="bg-indigo-600" />
              <ProgressBox label="팀 전체 건수 달성률" cur={totalCnt} tar={teamMeta.targetCnt} unit="건" color="bg-emerald-600" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <SummaryCard label="1인당 생산성" val={`${(totalAmt / (agents.length || 1)).toFixed(0)}만원`} bg="bg-slate-900" text="text-[#d4af37]" />
              <SummaryCard label="건당 평균 금액" val={`${totalCnt > 0 ? (totalAmt / totalCnt).toFixed(0) : 0}만원`} bg="bg-slate-100" text="text-black" />
            </div>
          </div>
        )}

        {/* 📊 활동 관리: 직원 클릭 시 DB 현황 및 활동 복구 */}
        {type === 'act' && (
          <div className="space-y-10 animate-in slide-in-from-top-4">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Activity & DB Status</h3>
            {selectedAgent ? (
              <div className="space-y-8 bg-slate-50 p-10 rounded-[3rem] border-2 border-black">
                <p className="text-2xl font-black underline underline-offset-8 decoration-4">{selectedAgent.name} CA 활동 분석</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <MiniBox label="배정 DB" val={selectedAgent.performance.db_assigned} />
                   <MiniBox label="반품 DB" val={selectedAgent.performance.db_returned} color="text-rose-500" />
                   <MiniBox label="전화량" val={selectedAgent.performance.call} />
                   <MiniBox label="미팅수" val={selectedAgent.performance.meet} />
                </div>
                {/* 퍼널 분석 복구 */}
                <div className="pt-6 flex justify-between items-center text-center px-10 border-t border-dashed border-slate-300">
                  <Funnel label="CALL→MEET" val={selectedAgent.performance.call > 0 ? ((selectedAgent.performance.meet/selectedAgent.performance.call)*100).toFixed(1) : 0} />
                  <Funnel label="MEET→PT" val={selectedAgent.performance.meet > 0 ? ((selectedAgent.performance.pt/selectedAgent.performance.meet)*100).toFixed(1) : 0} />
                  <Funnel label="PT→CONTRACT" val={selectedAgent.performance.pt > 0 ? ((selectedAgent.performance.contract_cnt/selectedAgent.performance.pt)*100).toFixed(1) : 0} />
                </div>
              </div>
            ) : (
              <p className="text-center py-24 text-slate-300 italic text-2xl uppercase tracking-widest">직원을 선택하여 상세 활동을 분석하세요.</p>
            )}
          </div>
        )}

        {/* 📊 3개월 평균 탭 복구 */}
        {type === '3m_avg' && (
          <div className="space-y-10 animate-in zoom-in-95 text-center">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase mb-10">Team 3-Month Analysis</h3>
            {avgData ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <AvgBox label="월평균 실적" val={`${avgData.amt}만`} />
                <AvgBox label="월평균 건수" val={`${avgData.cnt}건`} />
                <AvgBox label="월평균 전화" val={`${avgData.call}회`} />
                <AvgBox label="월평균 미팅" val={`${avgData.meet}회`} />
              </div>
            ) : <p className="py-20 text-slate-400 font-black">데이터를 분석 중입니다...</p>}
          </div>
        )}

        {/* ⚙️ 시스템 설정 */}
        {type === 'sys' && (
          <div className="space-y-10 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Team System Policy</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <InputItem label="팀 전체 실적 목표 (만)" val={targetAmt} onChange={setTargetAmt} />
                <InputItem label="팀 전체 건수 목표 (건)" val={targetCnt} onChange={setTargetCnt} />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-400 border-b pb-1 uppercase font-black tracking-widest">Notice for Staff</p>
                <textarea value={notice} onChange={e=>setNotice(e.target.value)} className="w-full h-32 p-5 bg-slate-50 border-2 border-transparent focus:border-black rounded-[2rem] outline-none text-sm font-black italic shadow-inner" placeholder="직원 화면 상단 마퀴에 표시될 내용을 입력하세요." />
              </div>
            </div>
            <button onClick={saveSys} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl font-black shadow-2xl italic hover:bg-slate-800 transition-colors uppercase">Apply Changes</button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProgressBox({ label, cur, tar, unit, color }: any) {
  const pct = Math.min(Math.round((cur / tar) * 100), 100);
  return (
    <div className="space-y-6 text-center">
      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{label}</p>
      <p className="text-5xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-8 bg-slate-100 rounded-full border-4 border-black overflow-hidden relative shadow-inner">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-difference">{pct}% ACHIEVED</span>
      </div>
    </div>
  )
}

function SummaryCard({ label, val, bg, text }: any) { return <div className={`${bg} ${text} p-10 rounded-[3rem] text-center shadow-xl`}><p className="text-[10px] uppercase mb-2 opacity-50 font-black tracking-widest">{label}</p><p className="text-3xl font-black italic">{val}</p></div> }
function MiniBox({ label, val, color="text-black" }: any) { return <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[10px] text-slate-400 mb-1 font-black">{label}</p><p className={`text-2xl font-black italic ${color}`}>{val}</p></div> }
function Funnel({ label, val }: any) { return <div><p className="text-2xl font-black italic text-indigo-600">{val}%</p><p className="text-[9px] text-slate-400 font-black">{label}</p></div> }
function AvgBox({ label, val }: any) { return <div className="bg-slate-900 text-[#d4af37] p-8 rounded-[2.5rem] shadow-xl italic"><p className="text-[10px] text-white/40 mb-2 uppercase font-black">{label}</p><p className="text-2xl font-black">{val}</p></div> }
function InputItem({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-black transition-all font-black"><label className="text-xs font-black italic">{label}</label><input type="number" value={val} onChange={(e) => onChange(Number(e.target.value))} className="w-28 p-3 bg-white border-2 border-slate-100 rounded-xl text-center outline-none focus:border-black font-black" /></div> }