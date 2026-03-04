"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [curIntro, setCurIntro] = useState(teamMeta.actualIntro);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("team_settings").select("*");
      if (data) setNotice(data.find(s => s.key === 'global_notice')?.value || "");
    }
    load();
  }, []);

  const saveSys = async () => {
    await supabase.from("team_settings").upsert([
      { key: 'target_amt', value: String(tarAmt) },
      { key: 'target_cnt', value: String(tarCnt) },
      { key: 'team_target_intro', value: String(tarIntro) },
      { key: 'actual_intro_cnt', value: String(curIntro) },
      { key: 'global_notice', value: notice }
    ]);
    alert("설정이 저장되었습니다.");
    onClose();
  };

  const totalAmt = agents.reduce((s:any, a:any) => s + a.performance.contract_amt, 0);
  const totalCnt = agents.reduce((s:any, a:any) => s + a.performance.contract_cnt, 0);

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black text-black">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] border-4 border-black">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>

        {/* 📉 실적 관리: 개인 목표 수정 없이 팀 목표 대비 달성률만 노출 */}
        {type === 'perf' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Team Performance Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ProgressBox label="팀 매출 달성률" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <ProgressBox label="팀 건수 달성률" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-[#d4af37] text-center italic text-2xl">
              1인당 평균 실적: {(totalAmt / (agents.length || 1)).toFixed(0)}만원
            </div>
          </div>
        )}

        {/* 📊 활동 관리: DB 분석 및 활동 로직 유지 */}
        {type === 'act' && (
          <div className="space-y-8">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Activity Analysis</h3>
            {selectedAgent ? (
              <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-black space-y-8">
                <p className="text-2xl underline underline-offset-8 decoration-4">{selectedAgent.name} CA 활동 데이터</p>
                <div className="grid grid-cols-4 gap-4">
                  <DataBox label="배정 DB" val={selectedAgent.performance.db_assigned} />
                  <DataBox label="반품 DB" val={selectedAgent.performance.db_returned} color="text-rose-500" />
                  <DataBox label="콜수" val={selectedAgent.performance.call} />
                  <DataBox label="미팅" val={selectedAgent.performance.meet} />
                </div>
                <div className="flex justify-around pt-8 border-t border-dashed">
                   <p className="text-lg">콜→미팅 전환율: {selectedAgent.performance.call > 0 ? ((selectedAgent.performance.meet/selectedAgent.performance.call)*100).toFixed(1) : 0}%</p>
                </div>
              </div>
            ) : <p className="text-center py-20 text-slate-300 italic text-xl uppercase">직원을 선택하세요.</p>}
          </div>
        )}

        {/* 🎓 교육 관리: 명단 로직 유지 */}
        {type === 'edu' && (
          <div className="space-y-6">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Edu Attendance</h3>
            <div className="border-2 border-black rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-[#d4af37] text-xs uppercase">
                  <tr><th className="p-6">Name</th><th className="p-6 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic">
                  {agents.map((a:any) => (
                    <tr key={a.id}><td className="p-6">{a.name} CA</td><td className="p-6 text-center">{a.performance.edu_status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ⚙️ 시스템 설정: 팀 전체 목표 및 도입 관리 */}
        {type === 'sys' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">System Policy</h3>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4">
                <InputRow label="팀 실적 목표" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표" val={tarIntro} onChange={setTarIntro} />
                <InputRow label="실제 도입 확정" val={curIntro} onChange={setCurIntro} />
              </div>
              <textarea value={notice} onChange={e=>setNotice(e.target.value)} className="w-full h-full p-6 bg-slate-50 border-2 border-black rounded-[2.5rem] outline-none text-sm italic" placeholder="공지사항 입력..." />
            </div>
            <button onClick={saveSys} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl italic shadow-2xl uppercase">Save All Settings</button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProgressBox({ label, cur, tar, unit, color }: any) {
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1);
  return (
    <div className="text-center space-y-4">
      <p className="text-xs text-slate-400 uppercase">{label}</p>
      <p className="text-3xl italic">{cur}{unit} / {tar}{unit} ({pct}%)</p>
      <div className="w-full h-6 bg-slate-100 rounded-full border-2 border-black overflow-hidden relative">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
function DataBox({ label, val, color="text-black" }: any) { return <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[10px] text-slate-400 mb-1">{label}</p><p className={`text-2xl italic ${color}`}>{val}</p></div> }
function InputRow({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border"><label className="text-xs italic">{label}</label><input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-20 p-2 bg-white border rounded-xl text-center outline-none" /></div> }