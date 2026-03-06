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
      { key: 'target_amt', value: String(tarAmt) }, { key: 'target_cnt', value: String(tarCnt) },
      { key: 'team_target_intro', value: String(tarIntro) }, { key: 'actual_intro_cnt', value: String(curIntro) },
      { key: 'global_notice', value: notice }, { key: 'edu_content', value: eduContent }
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
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 font-black">
      <style jsx global>{`
        @keyframes pulse-yellow { 0%, 100% { background-color: transparent; } 50% { background-color: #fef08a; } }
        @keyframes pulse-red { 0%, 100% { background-color: transparent; } 50% { background-color: #fecaca; } }
        .animate-pulse-yellow { animation: pulse-yellow 2s infinite; }
        .animate-pulse-red { animation: pulse-red 1.5s infinite; }
      `}</style>

      <div className="bg-white w-full max-w-5xl rounded-[3rem] p-6 md:p-10 relative overflow-hidden max-h-[95vh] border-4 border-black shadow-2xl flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-8 text-3xl font-black z-10">✕</button>

        {/* 1. 실적 관리 영역 */}
        {type === 'perf' && (
          <div className="space-y-6 flex flex-col h-full">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase font-black w-fit">Team Performance</h3>
            <div className="grid grid-cols-3 gap-4">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>

            <div className="border-2 border-black rounded-[2rem] overflow-hidden flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-[#d4af37] text-[10px] uppercase sticky top-0">
                  <tr>
                    <th className="p-4">이름</th>
                    <th className="p-4 text-center">실적</th>
                    <th className="p-4 text-center">관리 승인</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((a: any) => {
                    const isTenDaysIdle = new Date().getDate() >= 10 && (a.performance.contract_amt || 0) === 0;
                    const isLowAvg = (a.performance.avg_3month_amt || 0) < 30;
                    const blinkClass = isTenDaysIdle ? 'animate-pulse-yellow' : isLowAvg ? 'animate-pulse-red' : '';
                    return (
                      <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${blinkClass}`}>
                        <td className="p-4 font-black">{a.name} CA</td>
                        <td className="p-4 text-center italic font-black">{a.performance.contract_amt}만</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleApprove(a.id, a.performance.is_approved)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 transition-all ${
                              a.performance.is_approved 
                              ? 'bg-black text-[#d4af37] border-black' 
                              : 'bg-white text-black border-black hover:bg-slate-100'
                            }`}
                          >
                            {a.performance.is_approved ? '승인완료' : '승인하기'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. 활동 관리 영역 (버튼 상단 배치) */}
        {type === 'act' && (
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex justify-between items-end border-b-8 border-black pb-2">
              <h3 className="text-3xl italic uppercase font-black">Activity & Funnel</h3>
              {selectedAgent && (
                <button 
                  onClick={() => handleApprove(selectedAgent.id, selectedAgent.performance.is_approved)}
                  className={`px-6 py-2 rounded-full text-xs font-black shadow-lg transition-all active:scale-95 ${
                    selectedAgent.performance.is_approved 
                    ? 'bg-rose-600 text-white hover:bg-rose-700' 
                    : 'bg-black text-[#d4af37] hover:bg-slate-800'
                  }`}
                >
                  {selectedAgent.performance.is_approved ? '승인 해제하기 (수정가능)' : '실적 최종 승인 (수정불가)'}
                </button>
              )}
            </div>
            
            {!selectedAgent ? (
               <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-black grid grid-cols-3 gap-4 text-center font-black">
                 <div><p className="text-[10px] text-slate-400 uppercase">총 배정 DB</p><p className="text-xl">{totalDB}건</p></div>
                 <div><p className="text-[10px] text-slate-400 uppercase">총 반품 DB</p><p className="text-xl text-rose-500">{totalReturn}건</p></div>
                 <div><p className="text-[10px] text-slate-400 uppercase">전체 반품율</p><p className="text-xl text-rose-600">{getRate(totalReturn, totalDB)}%</p></div>
               </div>
            ) : (
              <div className="space-y-6 overflow-y-auto pr-2">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border-2 border-black">
                   <p className="text-xl font-black underline decoration-2 underline-offset-4">{selectedAgent.name} CA 활동 보고서</p>
                   <span className={`text-[10px] font-black italic ${selectedAgent.performance.is_approved ? 'text-black' : 'text-slate-400'}`}>
                      {selectedAgent.performance.is_approved ? '● 데이터 잠금됨' : '○ 수정 가능 상태'}
                   </span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-black">
                   <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 text-center">
                      <p className="text-[10px] text-blue-400 mb-1">개인 배정</p>
                      <p className="text-xl text-blue-800 italic">{selectedAgent.performance.db_assigned || 0}건</p>
                   </div>
                   <div className="bg-rose-50 p-4 rounded-2xl border-2 border-rose-100 text-center">
                      <p className="text-[10px] text-rose-400 mb-1">개인 반품</p>
                      <p className="text-xl text-rose-800 italic">{selectedAgent.performance.db_returned || 0}건</p>
                   </div>
                   <div className="bg-slate-900 p-4 rounded-2xl text-center">
                      <p className="text-[10px] text-slate-500 mb-1">개인 반품율</p>
                      <p className="text-xl text-[#d4af37] italic">{getRate(selectedAgent.performance.db_returned, selectedAgent.performance.db_assigned)}%</p>
                   </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <ActivityCountBox label="전화" val={selectedAgent.performance.call} />
                  <ActivityCountBox label="만남" val={selectedAgent.performance.meet} />
                  <ActivityCountBox label="제안" val={selectedAgent.performance.pt} />
                  <ActivityCountBox label="소개" val={selectedAgent.performance.intro} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FunnelBox label="전화→만남" val={getRate(selectedAgent.performance.meet, selectedAgent.performance.call)} />
                  <FunnelBox label="만남→제안" val={getRate(selectedAgent.performance.pt, selectedAgent.performance.meet)} />
                  <FunnelBox label="제안→계약" val={getRate(selectedAgent.performance.contract_cnt, selectedAgent.performance.pt)} />
                  <FunnelBox label="계약→소개" val={getRate(selectedAgent.performance.intro, selectedAgent.performance.contract_cnt)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. 교육 관리 영역 */}
        {type === 'edu' && (
          <div className="space-y-6 flex flex-col h-full">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase font-black w-fit">Attendance</h3>
            <div className="border-2 border-black rounded-[2rem] overflow-hidden flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-[#d4af37] text-xs uppercase sticky top-0">
                  <tr><th className="p-4">이름</th><th className="p-4 text-center">출석 상태</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((a:any) => (
                    <tr key={a.id}><td className="p-4 font-black">{a.name} CA</td><td className="p-4 text-center font-black">{a.performance.edu_status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. 시스템 설정 영역 */}
        {type === 'sys' && (
          <div className="space-y-6 overflow-y-auto h-full pr-2">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase font-black">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <InputRow label="팀 실적 목표" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표" val={tarIntro} onChange={setTarIntro} />
                <InputRow label="실제 도입 확정" val={curIntro} onChange={setCurIntro} />
                <div className="pt-2 space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black">상단 전체 공지(전광판)</p>
                  <input type="text" value={notice} onChange={e=>setNotice(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-black rounded-xl outline-none font-black italic" />
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <p className="text-[10px] text-slate-400 uppercase font-black">교육 공지 (직원용)</p>
                <textarea value={eduContent} onChange={e=>setEduContent(e.target.value)} className="w-full flex-1 min-h-[150px] p-4 bg-slate-50 border-2 border-black rounded-2xl outline-none text-sm italic font-black" />
              </div>
            </div>
            <button onClick={saveSys} className="w-full bg-black text-[#d4af37] py-6 rounded-2xl text-xl italic shadow-xl uppercase font-black hover:bg-slate-800 transition-all">설정 저장하기</button>
          </div>
        )}
      </div>
    </div>
  )
}

// 하위 컴포넌트들 (기존 기능 그대로 유지)
function ActivityCountBox({ label, val }: any) {
  return (
    <div className="bg-slate-50 p-3 rounded-2xl border-2 border-black text-center font-black">
      <p className="text-[9px] text-slate-400 uppercase font-black">{label}</p>
      <p className="text-lg font-black italic">{val || 0}건</p>
    </div>
  )
}

function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1);
  return (
    <div className="text-center space-y-2 font-black">
      <p className="text-[10px] text-slate-400 uppercase font-black">{label}</p>
      <p className="text-lg font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-6 bg-slate-100 rounded-full border-2 border-black overflow-hidden relative">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white mix-blend-difference font-black">{pct}%</span>
      </div>
    </div>
  )
}

function FunnelBox({ label, val }: any) { 
  return (
    <div className="p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-center font-black">
      <p className="text-xl italic font-black text-indigo-600">{val}%</p>
      <p className="text-[9px] text-slate-400 uppercase font-black">{label}</p>
    </div>
  )
}

function InputRow({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border-2 border-slate-100 font-black">
      <label className="text-[10px] italic font-black">{label}</label>
      <input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-20 p-1 bg-white border border-black rounded-lg text-center outline-none font-black" />
    </div>
  )
}