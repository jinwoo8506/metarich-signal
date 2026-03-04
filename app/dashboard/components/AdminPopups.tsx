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
      { key: 'target_amt', value: String(tarAmt) }, { key: 'target_cnt', value: String(tarCnt) },
      { key: 'team_target_intro', value: String(tarIntro) }, { key: 'actual_intro_cnt', value: String(curIntro) },
      { key: 'global_notice', value: notice }
    ]);
    alert("팀 운영 설정이 저장되었습니다.");
    onClose();
  };

  const totalAmt = agents.reduce((s:any, a:any) => s + a.performance.contract_amt, 0);
  const totalCnt = agents.reduce((s:any, a:any) => s + a.performance.contract_cnt, 0);

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] border-4 border-black font-black">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>

        {/* 📉 실적 관리: 개인 목표가 아닌 시스템 설정의 팀 전체 목표 기준 */}
        {type === 'perf' && (
          <div className="space-y-10 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Team Productivity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">
              <StatBox label="팀 전체 매출 달성률" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="팀 전체 건수 달성률" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-[#d4af37] text-center italic text-2xl font-black">
              1인당 평균 실적: {(totalAmt / (agents.length || 1)).toFixed(0)}만원
            </div>
          </div>
        )}

        {/* 📊 활동 관리: DB 분석 및 퍼널 로직 복구 */}
        {type === 'act' && (
          <div className="space-y-8 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Activity Analysis</h3>
            {selectedAgent ? (
              <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-black space-y-8 font-black">
                <p className="text-2xl underline decoration-4 font-black">{selectedAgent.name} CA 데이터</p>
                <div className="grid grid-cols-4 gap-4 font-black">
                  <MiniBox label="배정 DB" val={selectedAgent.performance.db_assigned} />
                  <MiniBox label="반품 DB" val={selectedAgent.performance.db_returned} color="text-rose-500" />
                  <MiniBox label="콜수" val={selectedAgent.performance.call} />
                  <MiniBox label="미팅" val={selectedAgent.performance.meet} />
                </div>
              </div>
            ) : <p className="text-center py-20 text-slate-300 italic text-xl font-black uppercase tracking-widest">직원을 선택하세요.</p>}
          </div>
        )}

        {/* 🎓 교육 관리: 명단 로직 */}
        {type === 'edu' && (
          <div className="space-y-6 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Edu List</h3>
            <div className="border-2 border-black rounded-[2.5rem] overflow-hidden font-black">
              <table className="w-full text-left font-black">
                <thead className="bg-slate-900 text-[#d4af37] text-xs font-black uppercase italic">
                  <tr><th className="p-6">Name</th><th className="p-6 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-black italic">
                  {agents.map((a:any) => (
                    <tr key={a.id}><td className="p-6 font-black">{a.name} CA</td><td className="p-6 text-center font-black">{a.performance.edu_status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ⚙️ 시스템 설정: 모든 도입 데이터 필드 복구 */}
        {type === 'sys' && (
          <div className="space-y-10 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">System Policy</h3>
            <div className="grid grid-cols-2 gap-10 font-black">
              <div className="space-y-4">
                <InputRow label="팀 실적 목표" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표" val={tarIntro} onChange={setTarIntro} />
                <InputRow label="실제 도입 확정" val={curIntro} onChange={setCurIntro} />
              </div>
              <textarea value={notice} onChange={e=>setNotice(e.target.value)} className="w-full h-full p-6 bg-slate-50 border-2 border-black rounded-[2.5rem] outline-none text-sm font-black italic" placeholder="공지사항 입력..." />
            </div>
            <button onClick={saveSys} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl font-black italic shadow-2xl uppercase">Save Team Settings</button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1);
  return (
    <div className="text-center space-y-4 font-black">
      <p className="text-xs text-slate-400 uppercase font-black">{label}</p>
      <p className="text-3xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-8 bg-slate-100 rounded-full border-2 border-black overflow-hidden relative">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white mix-blend-difference font-black">{pct}%</span>
      </div>
    </div>
  )
}
function MiniBox({ label, val, color="text-black" }: any) { return <div className="bg-white p-6 rounded-3xl border shadow-sm text-center font-black"><p className="text-[10px] text-slate-400 mb-1 font-black">{label}</p><p className={`text-2xl font-black italic ${color}`}>{val}</p></div> }
function InputRow({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border font-black"><label className="text-xs italic font-black">{label}</label><input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-20 p-2 bg-white border rounded-xl text-center outline-none font-black" /></div> }