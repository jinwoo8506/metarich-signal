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
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-8 md:p-12 relative overflow-y-auto max-h-[90vh] border-4 border-black">
        <button onClick={onClose} className="absolute top-8 right-8 text-3xl font-black">✕</button>

        {/* 1. 실적 관리 (기존 유지) */}
        {type === 'perf' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
          </div>
        )}

        {/* 2. 활동 관리 - 개인별 실제 건수 + 전환율 상세 */}
        {type === 'act' && (
          <div className="space-y-8 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Activity & Funnel</h3>
            
            {!selectedAgent ? (
               <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-black grid grid-cols-3 gap-4 text-center">
                 <div><p className="text-xs text-slate-400 font-black">총 배정 DB</p><p className="text-2xl font-black">{totalDB}건</p></div>
                 <div><p className="text-xs text-slate-400 font-black">총 반품 DB</p><p className="text-2xl text-rose-500 font-black">{totalReturn}건</p></div>
                 <div><p className="text-xs text-slate-400 font-black">전체 반품율</p><p className="text-2xl text-rose-600 font-black">{getRate(totalReturn, totalDB)}%</p></div>
               </div>
            ) : (
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border-4 border-black shadow-2xl space-y-10 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-6 font-black">
                   <p className="text-2xl font-black underline decoration-4 underline-offset-8">{selectedAgent.name} CA 리포트</p>
                   <p className="text-emerald-500 font-black italic uppercase">Detailed Activity</p>
                </div>

                {/* 개인 DB 통계 (배정/반품/반품율) */}
                <div className="grid grid-cols-3 gap-4">
                   <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 text-center font-black">
                      <p className="text-[10px] text-blue-400 font-black mb-1 uppercase">개인 배정건</p>
                      <p className="text-2xl text-blue-800 italic font-black">{selectedAgent.performance.db_assigned || 0}건</p>
                   </div>
                   <div className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-100 text-center font-black">
                      <p className="text-[10px] text-rose-400 font-black mb-1 uppercase">개인 반품건</p>
                      <p className="text-2xl text-rose-800 italic font-black">{selectedAgent.performance.db_returned || 0}건</p>
                   </div>
                   <div className="bg-slate-900 p-6 rounded-3xl text-center font-black">
                      <p className="text-[10px] text-slate-500 font-black mb-1 uppercase">개인 반품율</p>
                      <p className="text-2xl text-[#d4af37] italic font-black">{getRate(selectedAgent.performance.db_returned, selectedAgent.performance.db_assigned)}%</p>
                   </div>
                </div>

                {/* 핵심 활동 실제 건수 표기 (요청하신 부분) */}
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 italic uppercase ml-2 font-black">Actual Activity Count</p>
                  <div className="grid grid-cols-4 gap-4">
                    <ActivityCountBox label="전화" val={selectedAgent.performance.call} />
                    <ActivityCountBox label="만남" val={selectedAgent.performance.meet} />
                    <ActivityCountBox label="제안" val={selectedAgent.performance.pt} />
                    <ActivityCountBox label="소개" val={selectedAgent.performance.intro} />
                  </div>
                </div>

                {/* 영업 단계 전환율 분석 */}
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 italic uppercase ml-2 font-black">Funnel Conversion Rate</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* 3. 교육 관리 (기존 유지) */}
        {type === 'edu' && (
          <div className="space-y-6">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Attendance</h3>
            <div className="border-2 border-black rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left font-black">
                <thead className="bg-slate-900 text-[#d4af37] text-xs uppercase"><tr><th className="p-6">Name</th><th className="p-6 text-center">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{agents.map((a:any) => (<tr key={a.id}><td className="p-6">{a.name} CA</td><td className="p-6 text-center font-black">{a.performance.edu_status}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. 시스템 설정 (기존 유지) */}
        {type === 'sys' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Settings</h3>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4 font-black">
                <InputRow label="팀 실적 목표" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표" val={tarIntro} onChange={setTarIntro} />
                <InputRow label="실제 도입 확정" val={curIntro} onChange={setCurIntro} />
                <div className="pt-4 space-y-2 font-black">
                  <p className="text-xs text-slate-400 uppercase font-black">상단 전체 공지(전광판)</p>
                  <input type="text" value={notice} onChange={e=>setNotice(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl outline-none font-black italic" />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 uppercase font-black">교육 공지 (직원용)</p>
                <textarea value={eduContent} onChange={e=>setEduContent(e.target.value)} className="w-full h-64 p-6 bg-slate-50 border-2 border-black rounded-[2.5rem] outline-none text-sm italic font-black" />
              </div>
            </div>
            <button onClick={saveSys} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl italic shadow-2xl uppercase font-black">Save All Settings</button>
          </div>
        )}
      </div>
    </div>
  )
}

// 신규 추가: 실제 건수를 보여주는 박스
function ActivityCountBox({ label, val }: any) {
  return (
    <div className="bg-slate-50 p-5 rounded-3xl border-2 border-black text-center font-black">
      <p className="text-[10px] text-slate-400 uppercase mb-1 font-black">{label}</p>
      <p className="text-xl font-black italic">{val || 0}건</p>
    </div>
  )
}

function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1);
  return (
    <div className="text-center space-y-4 font-black">
      <p className="text-xs text-slate-400 uppercase font-black">{label}</p>
      <p className="text-2xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-8 bg-slate-100 rounded-full border-2 border-black overflow-hidden relative">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white mix-blend-difference font-black">{pct}%</span>
      </div>
    </div>
  )
}

function FunnelBox({ label, val }: any) { 
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center font-black">
      <p className="text-2xl italic font-black text-indigo-600">{val}%</p>
      <p className="text-[10px] text-slate-400 font-black uppercase">{label}</p>
    </div>
  )
}

function InputRow({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border font-black">
      <label className="text-xs italic font-black">{label}</label>
      <input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-24 p-2 bg-white border rounded-xl text-center outline-none font-black" />
    </div>
  )
}