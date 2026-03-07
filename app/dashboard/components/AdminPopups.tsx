"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [curIntro, setCurIntro] = useState(teamMeta.actualIntro);
  const [notice, setNotice] = useState("");
  const [eduWeeks, setEduWeeks] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("team_settings").select("*");
      if (data) {
        setNotice(data.find(s => s.key === 'global_notice')?.value || "");
        const savedEdu = data.find(s => s.key === 'edu_content')?.value;
        if (savedEdu) {
          try {
            setEduWeeks(JSON.parse(savedEdu));
          } catch (e) {
            setEduWeeks({ 1: "", 2: "", 3: "", 4: "", 5: "" });
          }
        }
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
      { key: 'edu_content', value: JSON.stringify(eduWeeks) }
    ], { onConflict: 'key' });
    alert("시스템 설정이 저장되었습니다.");
    onClose();
  };

  const totalAmt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_amt || 0), 0);
  const totalCnt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_cnt || 0), 0);
  const totalDB = agents.reduce((s:any, a:any) => s + (a.performance?.db_assigned || 0), 0);
  const totalReturn = agents.reduce((s:any, a:any) => s + (a.performance?.db_returned || 0), 0);

  const totalCall = agents.reduce((s:any, a:any) => s + (a.performance?.call || 0), 0);
  const totalMeet = agents.reduce((s:any, a:any) => s + (a.performance?.meet || 0), 0);
  const totalPt = agents.reduce((s:any, a:any) => s + (a.performance?.pt || 0), 0);
  const totalIntro = agents.reduce((s:any, a:any) => s + (a.performance?.intro || 0), 0);

  const getRate = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 font-black">
      <style jsx global>{`
        @keyframes pulse-yellow { 0%, 100% { background-color: transparent; } 50% { background-color: #fef08a; } }
        @keyframes pulse-red { 0%, 100% { background-color: transparent; } 50% { background-color: #fecaca; } }
        .animate-pulse-yellow { animation: pulse-yellow 2s infinite; }
        .animate-pulse-red { animation: pulse-red 1.5s infinite; }
      `}</style>

      <div className="bg-white w-full max-w-5xl rounded-[2rem] md:rounded-[4rem] p-6 md:p-12 relative overflow-y-auto max-h-[90vh] border-4 border-black shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 md:top-8 md:right-8 text-2xl md:text-3xl font-black z-50">✕</button>

        {type === 'sys' && (
          <button onClick={saveSys} className="absolute top-6 right-16 md:top-8 md:right-20 bg-black text-[#d4af37] px-4 md:px-6 py-2 rounded-full text-xs italic font-black uppercase hover:bg-slate-800 transition-all z-50">
            Save Configuration
          </button>
        )}

        {type === 'perf' && (
          <div className="space-y-6 md:space-y-10">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase font-black">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 font-black text-black">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="border-2 md:border-4 border-black rounded-2xl md:rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left font-black">
                <thead className="bg-black text-[#d4af37] text-[9px] md:text-[10px] uppercase">
                  <tr><th className="p-4 md:p-6">Employee Name</th><th className="p-4 md:p-6 text-center">Amount</th><th className="p-4 md:p-6 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {agents.map((a: any) => {
                    const isTenDaysIdle = new Date().getDate() >= 10 && (a.performance.contract_amt || 0) === 0;
                    const isLowAvg = (a.performance.avg_3month_amt || 0) < 30;
                    const blinkClass = isTenDaysIdle ? 'animate-pulse-yellow' : isLowAvg ? 'animate-pulse-red' : '';
                    return (
                      <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${blinkClass}`}>
                        <td className="p-4 md:p-6 font-black text-sm md:text-xl italic">{a.name} CA</td>
                        <td className="p-4 md:p-6 text-center font-black text-lg md:text-2xl italic">{a.performance.contract_amt}만</td>
                        <td className="p-4 md:p-6 text-center">
                          <button onClick={() => handleApprove(a.id, a.performance.is_approved)} className={`px-4 md:px-6 py-1 md:py-2 rounded-full text-[10px] md:text-xs font-black italic border-2 border-black transition-all ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-white text-black hover:bg-slate-100'}`}>
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

        {type === 'act' && (
          <div className="space-y-6 md:space-y-8 font-black">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase font-black">Activity & Funnel</h3>
            {!selectedAgent ? (
              <div className="space-y-6 md:space-y-12 animate-in fade-in duration-500">
                <div className="bg-slate-50 p-6 md:p-10 rounded-2xl md:rounded-[3rem] border-2 md:border-4 border-black grid grid-cols-3 gap-2 md:gap-6 text-center shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] md:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                   <div><p className="text-[9px] md:text-xs text-slate-400 uppercase mb-2">총 배정 DB</p><p className="text-lg md:text-3xl font-black italic">{totalDB}건</p></div>
                   <div><p className="text-[9px] md:text-xs text-slate-400 uppercase mb-2">총 반품 DB</p><p className="text-lg md:text-3xl text-rose-500 font-black italic">{totalReturn}건</p></div>
                   <div><p className="text-[9px] md:text-xs text-slate-400 uppercase mb-2">전체 반품율</p><p className="text-lg md:text-3xl text-rose-600 font-black italic">{getRate(totalReturn, totalDB)}%</p></div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] md:text-sm text-slate-400 italic uppercase ml-4">Team Total Activity</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
                    <ActivityCountBox label="전화 합계" val={`총 ${totalCall}건`} />
                    <ActivityCountBox label="만남 합계" val={`총 ${totalMeet}건`} />
                    <ActivityCountBox label="제안 합계" val={`총 ${totalPt}건`} />
                    <ActivityCountBox label="소개 합계" val={`총 ${totalIntro}건`} />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] md:text-sm text-slate-400 italic uppercase ml-4">Team Conversion Funnel (%)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
                    <FunnelBox label="전화→만남" val={getRate(totalMeet, totalCall)} />
                    <FunnelBox label="만남→제안" val={getRate(totalPt, totalMeet)} />
                    <FunnelBox label="제안→계약" val={getRate(totalCnt, totalPt)} />
                    <FunnelBox label="계약→소개" val={getRate(totalIntro, totalCnt)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col md:flex-row justify-between items-center bg-black p-6 md:p-8 rounded-2xl md:rounded-[2rem] text-white gap-4">
                   <p className="text-xl md:text-3xl font-black italic underline decoration-[#d4af37] underline-offset-8">{selectedAgent.name} CA Report</p>
                   <button onClick={() => handleApprove(selectedAgent.id, selectedAgent.performance.is_approved)} className={`w-full md:w-auto px-6 py-3 rounded-full text-xs font-black italic shadow-xl transition-transform active:scale-95 ${selectedAgent.performance.is_approved ? 'bg-rose-600 text-white' : 'bg-[#d4af37] text-black'}`}>
                    {selectedAgent.performance.is_approved ? 'REVOKE LOCK' : 'CONFIRM & LOCK'}
                   </button>
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-6">
                   <div className="bg-blue-50 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-black text-center"><p className="text-[9px] md:text-xs text-blue-400 uppercase mb-2">배정 DB</p><p className="text-lg md:text-3xl text-blue-900 italic font-black">{selectedAgent.performance.db_assigned || 0}건</p></div>
                   <div className="bg-rose-50 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-black text-center"><p className="text-[9px] md:text-xs text-rose-400 uppercase mb-2">반품 DB</p><p className="text-lg md:text-3xl text-rose-900 italic font-black">{selectedAgent.performance.db_returned || 0}건</p></div>
                   <div className="bg-slate-900 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-black text-center"><p className="text-[9px] md:text-xs text-slate-500 uppercase mb-2">반품율</p><p className="text-lg md:text-3xl text-[#d4af37] italic font-black">{getRate(selectedAgent.performance.db_returned, selectedAgent.performance.db_assigned)}%</p></div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] md:text-sm text-slate-400 italic uppercase ml-4">Detailed Activity Metrics</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
                    <ActivityCountBox label="전화" val={`${selectedAgent.performance.call}건`} />
                    <ActivityCountBox label="만남" val={`${selectedAgent.performance.meet}건`} />
                    <ActivityCountBox label="제안" val={`${selectedAgent.performance.pt}건`} />
                    <ActivityCountBox label="소개" val={`${selectedAgent.performance.intro}건`} />
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] md:text-sm text-slate-400 italic uppercase ml-4">Conversion Funnel (%)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
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

        {type === 'edu' && (
          <div className="space-y-6 md:space-y-10">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase font-black">Daily Attendance & Training</h3>
            <div className="border-2 md:border-4 border-black rounded-2xl md:rounded-[2.5rem] overflow-hidden font-black">
              <table className="w-full text-left font-black">
                <thead className="bg-black text-[#d4af37] text-[9px] md:text-[10px] uppercase font-black">
                  <tr>
                    <th className="p-4 md:p-6">Name</th>
                    <th className="p-4 md:p-6 text-center">Status</th>
                    <th className="p-4 md:p-6 text-center">1W</th>
                    <th className="p-4 md:p-6 text-center">2W</th>
                    <th className="p-4 md:p-6 text-center">3W</th>
                    <th className="p-4 md:p-6 text-center">4W</th>
                    <th className="p-4 md:p-6 text-center">Plus</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {agents.map((a:any) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-4 md:p-6 font-black text-sm md:text-lg italic">{a.name} CA</td>
                      <td className="p-4 md:p-6 text-center">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase">
                          {a.performance.edu_status || '출석완료'}
                        </span>
                      </td>
                      {[1, 2, 3, 4, 5].map((w) => (
                        <td key={w} className="p-1 md:p-6 text-center">
                          <div className={`w-6 h-6 md:w-8 md:h-8 mx-auto rounded-lg border-2 flex items-center justify-center font-black ${a.performance[`edu_${w}`] ? 'bg-black text-[#d4af37] border-black' : 'bg-white text-transparent border-slate-200'}`}>✓</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {type === 'sys' && (
          <div className="space-y-6 md:space-y-10 font-black">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase font-black">Admin Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 font-black">
              <div className="space-y-4">
                <InputRow label="팀 매출 목표 (만원)" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표 (건)" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표 (명)" val={tarIntro} onChange={setTarIntro} />
                <InputRow label="실제 도입 확정 (명)" val={curIntro} onChange={setCurIntro} />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase font-black ml-2">Global Notice (Ticker)</p>
                  <input type="text" value={notice} onChange={e=>setNotice(e.target.value)} className="w-full p-4 md:p-6 bg-slate-50 border-2 md:border-4 border-black rounded-2xl outline-none font-black italic text-sm md:text-lg" placeholder="공지사항 입력..." />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase font-black ml-2">Weekly Education Curriculum</p>
                  {[1, 2, 3, 4, 5].map((w) => (
                    <div key={w} className="flex gap-2 mb-2">
                       <span className="text-[9px] w-16 flex items-center justify-center bg-black text-white rounded-lg italic">{w===5 ? '추가' : w+'주차'}</span>
                       <input type="text" value={eduWeeks[w as keyof typeof eduWeeks]} onChange={e => setEduWeeks({...eduWeeks, [w]: e.target.value})} className="flex-1 p-2 bg-slate-50 border-2 border-black rounded-xl outline-none italic text-sm" placeholder={`${w===5 ? '추가 교육' : w+'주차 교육'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityCountBox({ label, val }: any) { 
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border-2 md:border-4 border-black text-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <p className="text-[9px] text-slate-400 uppercase mb-1 md:mb-2 font-black">{label}</p>
      <p className="text-sm md:text-xl font-black italic">{val || 0}</p>
    </div>
  ) 
}

function StatBox({ label, cur, tar, unit, color }: any) { 
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1); 
  return (
    <div className="text-center space-y-2 md:space-y-6 font-black p-3 md:p-4">
      <p className="text-[10px] text-slate-400 uppercase font-black">{label}</p>
      <p className="text-lg md:text-3xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-8 md:h-10 bg-slate-100 rounded-full border-2 md:border-4 border-black overflow-hidden relative font-black shadow-lg">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] md:text-xs text-white mix-blend-difference font-black">{pct}% COMPLETED</span>
      </div>
    </div>
  ) 
}

function FunnelBox({ label, val }: any) { 
  return (
    <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border-2 md:border-4 border-black border-dashed text-center font-black">
      <p className="text-lg md:text-3xl italic font-black text-indigo-600 mb-1">{val}%</p>
      <p className="text-[9px] text-slate-400 font-black uppercase">{label}</p>
    </div>
  ) 
}

function InputRow({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-4 md:p-6 rounded-2xl border-2 md:border-4 border-black font-black shadow-md">
      <label className="text-[10px] md:text-sm italic font-black uppercase">{label}</label>
      <input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-20 md:w-32 p-2 md:p-3 bg-white border-2 border-black rounded-xl text-center outline-none font-black text-sm md:text-xl italic" />
    </div>
  ) 
}