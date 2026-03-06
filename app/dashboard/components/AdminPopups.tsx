"use client"
import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [curIntro, setCurIntro] = useState(teamMeta.actualIntro);
  const [notice, setNotice] = useState("");
  const [eduContent, setEduContent] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("team_settings").select("*");
      if (data) {
        setNotice(data.find(s => s.key === 'global_notice')?.value || "");
        setEduContent(data.find(s => s.key === 'edu_content')?.value || "");
      }
    }
    load();
  }, []);

  const handleApprove = async (agentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("daily_perf")
      .update({ is_approved: !currentStatus })
      .eq("user_id", agentId);

    if (error) {
      alert("승인 처리 중 오류가 발생했습니다.");
    } else {
      alert(!currentStatus ? "실적이 승인되었습니다. (직원 수정 불가)" : "승인이 해제되었습니다.");
      onClose(); 
    }
  };

  const saveSys = async () => {
    await supabase.from("team_settings").upsert([
      { key: 'target_amt', value: String(tarAmt) }, 
      { key: 'target_cnt', value: String(tarCnt) },
      { key: 'team_target_intro', value: String(tarIntro) }, 
      { key: 'actual_intro_cnt', value: String(curIntro) },
      { key: 'global_notice', value: notice }, 
      { key: 'edu_content', value: eduContent }
    ], { onConflict: 'key' });
    alert("시스템 설정이 저장되었습니다.");
    onClose();
  };

  const totalAmt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_amt || 0), 0);
  const totalCnt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_cnt || 0), 0);
  const totalDB = agents.reduce((s:any, a:any) => s + (a.performance?.db_assigned || 0), 0);
  const totalReturn = agents.reduce((s:any, a:any) => s + (a.performance?.db_returned || 0), 0);

  const getRate = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black">
      <style jsx global>{`
        @keyframes pulse-yellow { 0%, 100% { background-color: transparent; } 50% { background-color: #fef08a; } }
        @keyframes pulse-red { 0%, 100% { background-color: transparent; } 50% { background-color: #fecaca; } }
        .animate-pulse-yellow { animation: pulse-yellow 2s infinite; }
        .animate-pulse-red { animation: pulse-red 1.5s infinite; }
      `}</style>

      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-8 md:p-12 relative overflow-y-auto max-h-[90vh] border-4 border-black shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 text-3xl font-black z-50">✕</button>

        {/* 1. 실적 관리 섹션 */}
        {type === 'perf' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black text-black">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="border-4 border-black rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left font-black">
                <thead className="bg-black text-[#d4af37] text-[10px] uppercase">
                  <tr><th className="p-6">Employee Name</th><th className="p-6 text-center">Amount</th><th className="p-6 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {agents.map((a: any) => {
                    const isTenDaysIdle = new Date().getDate() >= 10 && (a.performance.contract_amt || 0) === 0;
                    const isLowAvg = (a.performance.avg_3month_amt || 0) < 30;
                    const blinkClass = isTenDaysIdle ? 'animate-pulse-yellow' : isLowAvg ? 'animate-pulse-red' : '';
                    return (
                      <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${blinkClass}`}>
                        <td className="p-6 font-black text-xl italic">{a.name} CA</td>
                        <td className="p-6 text-center font-black text-2xl italic">{a.performance.contract_amt}만</td>
                        <td className="p-6 text-center">
                          <button onClick={() => handleApprove(a.id, a.performance.is_approved)} className={`px-6 py-2 rounded-full text-xs font-black italic border-2 border-black transition-all ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-white text-black hover:bg-slate-100'}`}>
                            {a.performance.is_approved ? 'APPROVED' : 'APPROVE'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. 활동 관리 섹션 (요청하신 데이터 추가) */}
        {type === 'act' && (
          <div className="space-y-8 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Activity & Funnel</h3>
            {!selectedAgent ? (
               <div className="bg-slate-50 p-10 rounded-[3rem] border-4 border-black grid grid-cols-3 gap-6 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                 <div><p className="text-xs text-slate-400 uppercase mb-2">총 배정 DB</p><p className="text-3xl font-black italic">{totalDB}건</p></div>
                 <div><p className="text-xs text-slate-400 uppercase mb-2">총 반품 DB</p><p className="text-3xl text-rose-500 font-black italic">{totalReturn}건</p></div>
                 <div><p className="text-xs text-slate-400 uppercase mb-2">전체 반품율</p><p className="text-3xl text-rose-600 font-black italic">{getRate(totalReturn, totalDB)}%</p></div>
               </div>
            ) : (
              <div className="space-y-10">
                <div className="flex justify-between items-center bg-black p-8 rounded-[2rem] text-white">
                   <p className="text-3xl font-black italic underline decoration-[#d4af37] underline-offset-8">{selectedAgent.name} CA Report</p>
                   <button onClick={() => handleApprove(selectedAgent.id, selectedAgent.performance.is_approved)} className={`px-10 py-4 rounded-full text-sm font-black italic shadow-xl transition-transform active:scale-95 ${selectedAgent.performance.is_approved ? 'bg-rose-600 text-white' : 'bg-[#d4af37] text-black'}`}>
                    {selectedAgent.performance.is_approved ? 'REVOKE LOCK' : 'CONFIRM & LOCK'}
                   </button>
                </div>

                {/* DB 배정/반품 섹션 */}
                <div className="grid grid-cols-3 gap-6">
                   <div className="bg-blue-50 p-8 rounded-[2rem] border-4 border-black text-center"><p className="text-xs text-blue-400 uppercase mb-2">배정 DB</p><p className="text-3xl text-blue-900 italic font-black">{selectedAgent.performance.db_assigned || 0}건</p></div>
                   <div className="bg-rose-50 p-8 rounded-[2rem] border-4 border-black text-center"><p className="text-xs text-rose-400 uppercase mb-2">반품 DB</p><p className="text-3xl text-rose-900 italic font-black">{selectedAgent.performance.db_returned || 0}건</p></div>
                   <div className="bg-slate-900 p-8 rounded-[2rem] border-4 border-black text-center"><p className="text-xs text-slate-500 uppercase mb-2">반품율</p><p className="text-3xl text-[#d4af37] italic font-black">{getRate(selectedAgent.performance.db_returned, selectedAgent.performance.db_assigned)}%</p></div>
                </div>

                {/* 전화, 만남, 제안, 소개 데이터 (추가됨) */}
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 italic uppercase ml-4">Detailed Activity Metrics</p>
                  <div className="grid grid-cols-4 gap-6">
                    <ActivityCountBox label="전화" val={selectedAgent.performance.call} />
                    <ActivityCountBox label="만남" val={selectedAgent.performance.meet} />
                    <ActivityCountBox label="제안" val={selectedAgent.performance.pt} />
                    <ActivityCountBox label="소개" val={selectedAgent.performance.intro} />
                  </div>
                </div>

                {/* 각 단계별 전환율 (추가됨) */}
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 italic uppercase ml-4">Conversion Funnel (%)</p>
                  <div className="grid grid-cols-4 gap-6">
                    <FunnelBox label="전화→만남" val={getRate(selectedAgent.performance.meet, selectedAgent.performance.call)} />
                    <FunnelBox label="만남→제안" val={getRate(selectedAgent.performance.pt, selectedAgent.performance.meet)} />
                    <FunnelBox label="제안→계약" val={getRate(selectedAgent.performance.contract_cnt, selectedAgent.performance.pt)} />
                    <FunnelBox label="계약→소개" val={getRate(selectedAgent.performance.intro, selectedAgent.performance.contract_cnt)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. 출석/교육 관리 섹션 */}
        {type === 'edu' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Daily Attendance</h3>
            <div className="border-4 border-black rounded-[2.5rem] overflow-hidden font-black">
              <table className="w-full text-left font-black">
                <thead className="bg-black text-[#d4af37] text-xs uppercase font-black">
                  <tr><th className="p-8">Name</th><th className="p-8 text-center">Status</th><th className="p-8 text-center">Time</th></tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {agents.map((a:any) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-8 font-black text-xl italic">{a.name} CA</td>
                      <td className="p-8 text-center"><span className="px-6 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-black uppercase font-black">{a.performance.edu_status || '출석완료'}</span></td>
                      <td className="p-8 text-center font-black italic text-slate-400 font-black">08:55 AM</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. 시스템 설정 섹션 */}
        {type === 'sys' && (
          <div className="space-y-10 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Admin Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 font-black">
              <div className="space-y-6">
                <InputRow label="팀 매출 목표 (만원)" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표 (건)" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표 (명)" val={tarIntro} onChange={setTarIntro} />
                <InputRow label="실제 도입 확정 (명)" val={curIntro} onChange={setCurIntro} />
                <div className="pt-4 space-y-2 font-black">
                  <p className="text-xs text-slate-400 uppercase font-black ml-2 font-black">Global Notice (Ticker)</p>
                  <input type="text" value={notice} onChange={e=>setNotice(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-black rounded-[1.5rem] outline-none font-black italic text-lg" placeholder="공지사항 입력..." />
                </div>
              </div>
              <div className="flex flex-col space-y-4 font-black">
                <p className="text-xs text-slate-400 uppercase font-black ml-2 font-black">Educational Content (Markdown)</p>
                <textarea value={eduContent} onChange={e=>setEduContent(e.target.value)} className="w-full flex-1 min-h-[300px] p-8 bg-slate-50 border-4 border-black rounded-[2rem] outline-none text-lg italic font-black shadow-inner font-black" placeholder="교육 내용을 입력하세요..." />
              </div>
            </div>
            <button onClick={saveSys} className="w-full bg-black text-[#d4af37] py-8 rounded-[2rem] text-3xl italic shadow-[0px_10px_0px_0px_rgba(212,175,55,1)] uppercase font-black hover:translate-y-1 hover:shadow-none transition-all">Update System Configuration</button>
          </div>
        )}
      </div>
    </div>
  )
}

{/* 기존 컴포넌트들 생략 없이 유지 */}
function ActivityCountBox({ label, val }: any) { 
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border-4 border-black text-center font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <p className="text-[10px] text-slate-400 uppercase mb-2 font-black">{label}</p>
      <p className="text-2xl font-black italic">{val || 0}건</p>
    </div>
  ) 
}

function StatBox({ label, cur, tar, unit, color }: any) { 
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1); 
  return (
    <div className="text-center space-y-6 font-black p-4">
      <p className="text-sm text-slate-400 uppercase font-black">{label}</p>
      <p className="text-3xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-10 bg-slate-100 rounded-full border-4 border-black overflow-hidden relative font-black shadow-lg">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs text-white mix-blend-difference font-black">{pct}% COMPLETED</span>
      </div>
    </div>
  ) 
}

function FunnelBox({ label, val }: any) { 
  return (
    <div className="p-6 bg-slate-50 rounded-[1.5rem] border-4 border-black border-dashed text-center font-black">
      <p className="text-3xl italic font-black text-indigo-600 mb-1">{val}%</p>
      <p className="text-[10px] text-slate-400 font-black uppercase font-black">{label}</p>
    </div>
  ) 
}

function InputRow({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[1.5rem] border-4 border-black font-black shadow-md">
      <label className="text-sm italic font-black font-black uppercase">{label}</label>
      <input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-32 p-3 bg-white border-2 border-black rounded-xl text-center outline-none font-black text-xl italic" />
    </div>
  ) 
}