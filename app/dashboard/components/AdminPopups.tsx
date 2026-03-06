"use client"
import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta?.targetAmt || 0);
  const [tarCnt, setTarCnt] = useState(teamMeta?.targetCnt || 0);
  const [tarIntro, setTarIntro] = useState(teamMeta?.targetIntro || 0);
  const [curIntro, setCurIntro] = useState(teamMeta?.actualIntro || 0);
  const [notice, setNotice] = useState("");
  // [기능복구] 1~5주차 교육 내용 관리 상태
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
      alert(!currentStatus ? "실적이 승인되었습니다." : "승인이 해제되었습니다.");
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

  const totalAmt = agents.reduce((s: any, a: any) => s + (a.performance?.contract_amt || 0), 0);
  const totalCnt = agents.reduce((s: any, a: any) => s + (a.performance?.contract_cnt || 0), 0);
  const totalDB = agents.reduce((s: any, a: any) => s + (a.performance?.db_assigned || 0), 0);
  const totalReturn = agents.reduce((s: any, a: any) => s + (a.performance?.db_returned || 0), 0);

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

        {type === 'sys' && (
          <button onClick={saveSys} className="absolute top-8 right-20 bg-black text-[#d4af37] px-6 py-2 rounded-full text-sm italic font-black uppercase hover:bg-slate-800 transition-all z-50">
            Save Configuration
          </button>
        )}

        {/* [1] 팀 실적 뷰 */}
        {type === 'perf' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            {/* 리스트 테이블 (생략없음) */}
            <div className="border-4 border-black rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-black text-[#d4af37] text-[10px] uppercase">
                  <tr><th className="p-6">Employee</th><th className="p-6 text-center">Amount</th><th className="p-6 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {agents.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-6 text-xl italic">{a.name} CA</td>
                      <td className="p-6 text-center text-2xl italic">{a.performance?.contract_amt || 0}만</td>
                      <td className="p-6 text-center">
                        <button onClick={() => handleApprove(a.id, a.performance?.is_approved)} className={`px-6 py-2 rounded-full text-xs italic border-2 border-black ${a.performance?.is_approved ? 'bg-black text-[#d4af37]' : 'bg-white text-black'}`}>
                          {a.performance?.is_approved ? 'APPROVED' : 'APPROVE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* [2] 활동 뷰 (데이터 연동 문제 해결) */}
        {type === 'act' && (
          <div className="space-y-8">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Activity & Funnel</h3>
            {!selectedAgent ? (
              <div className="bg-slate-50 p-10 rounded-[3rem] border-4 border-black grid grid-cols-3 gap-6 text-center">
                <div><p className="text-xs text-slate-400 uppercase mb-2">총 배정 DB</p><p className="text-3xl italic">{totalDB}건</p></div>
                <div><p className="text-xs text-slate-400 uppercase mb-2">총 반품 DB</p><p className="text-3xl text-rose-500 italic">{totalReturn}건</p></div>
                <div><p className="text-xs text-slate-400 uppercase mb-2">전체 반품율</p><p className="text-3xl text-rose-600 italic">{getRate(totalReturn, totalDB)}%</p></div>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="flex justify-between items-center bg-black p-8 rounded-[2rem] text-white">
                  <p className="text-3xl font-black italic underline decoration-[#d4af37] underline-offset-8">{selectedAgent.name} CA Report</p>
                </div>
                <div className="grid grid-cols-4 gap-6">
                  {/* [기능수정] 데이터 직접 참조 및 기본값 설정 */}
                  <ActivityCountBox label="전화" val={selectedAgent.performance?.call || 0} />
                  <ActivityCountBox label="만남" val={selectedAgent.performance?.meet || 0} />
                  <ActivityCountBox label="제안" val={selectedAgent.performance?.pt || 0} />
                  <ActivityCountBox label="소개" val={selectedAgent.performance?.intro || 0} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* [3] 교육 뷰 (시각화 반영) */}
        {type === 'edu' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Weekly Education</h3>
            {agents.map((a: any) => (
              <div key={a.id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-black space-y-4">
                <p className="font-black italic">{a.name} CA 숙지 현황</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(w => {
                    const isDone = a.performance?.[`edu_${w}`];
                    return (
                      <div key={w} className={`p-4 rounded-xl text-center font-black ${isDone ? 'bg-emerald-500 text-white' : 'bg-rose-200 text-rose-800'}`}>
                        {w === 5 ? '추가' : `${w}주차`}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* [4] 설정 뷰 (교육 내용 입력 필드 포함) */}
        {type === 'sys' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Admin Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <InputRow label="팀 매출 목표 (만원)" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표 (건)" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표 (명)" val={tarIntro} onChange={setTarIntro} />
              </div>
              <div className="space-y-6">
                <input type="text" value={notice} onChange={e => setNotice(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-black rounded-[1.5rem] outline-none font-black" placeholder="공지사항 입력..." />
                {/* [기능복구] 5주차 교육 텍스트 입력창 */}
                {[1, 2, 3, 4, 5].map(w => (
                  <div key={w} className="flex gap-2">
                    <span className="w-16 bg-black text-white text-[10px] flex items-center justify-center rounded-lg">{w === 5 ? '추가' : w + '주차'}</span>
                    <input type="text" value={eduWeeks[w as keyof typeof eduWeeks]} onChange={e => setEduWeeks({ ...eduWeeks, [w]: e.target.value })} className="flex-1 p-3 bg-white border-2 border-black rounded-xl" placeholder="교육 내용" />
                  </div>
                ))}
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
    <div className="bg-white p-6 rounded-[1.5rem] border-4 border-black text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <p className="text-[10px] text-slate-400 uppercase mb-2">{label}</p>
      <p className="text-2xl font-black italic">{val}건</p>
    </div>
  )
}

function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1);
  return (
    <div className="text-center space-y-6 p-4">
      <p className="text-sm text-slate-400 uppercase">{label}</p>
      <p className="text-3xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-10 bg-slate-100 rounded-full border-4 border-black overflow-hidden relative shadow-lg">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs text-white mix-blend-difference">{pct}%</span>
      </div>
    </div>
  )
}

function InputRow({ label, val, onChange }: any) {
  return (
    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[1.5rem] border-4 border-black shadow-md">
      <label className="text-sm italic uppercase">{label}</label>
      <input type="number" value={val} onChange={e => onChange(Number(e.target.value))} className="w-32 p-3 bg-white border-2 border-black rounded-xl text-center outline-none italic" />
    </div>
  )
}