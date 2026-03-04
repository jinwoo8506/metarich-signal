"use client"
import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [curIntro, setCurIntro] = useState(teamMeta.actualIntro);
  const [notice, setNotice] = useState("");
  const [eduContent, setEduContent] = useState(""); // 직원 화면 교육 내용

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
    ]);
    alert("시스템 설정이 저장되었습니다.");
    onClose();
  };

  // 실적 취합 계산
  const totalAmt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_amt || 0), 0);
  const totalCnt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_cnt || 0), 0);
  const totalDB = agents.reduce((s:any, a:any) => s + (a.performance?.db_assigned || 0), 0);
  const totalReturn = agents.reduce((s:any, a:any) => s + (a.performance?.db_returned || 0), 0);

  const getRate = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] border-4 border-black">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>

        {/* 1. 실적 관리 - 팀 목표 달성율 & 인당 생산성 */}
        {type === 'perf' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] text-[#d4af37] text-center italic">
                <p className="text-xs opacity-50 uppercase mb-2">인당 생산성</p>
                <p className="text-3xl">{(totalAmt / (agents.length || 1)).toFixed(0)}만원</p>
              </div>
              <div className="bg-slate-100 p-8 rounded-[2.5rem] text-black text-center italic">
                <p className="text-xs opacity-50 uppercase mb-2">1건당 평균 실적</p>
                <p className="text-3xl">{totalCnt > 0 ? (totalAmt / totalCnt).toFixed(0) : 0}만원</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. 활동 관리 - 전환율 & DB 반품율 */}
        {type === 'act' && (
          <div className="space-y-8">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Activity & Funnel</h3>
            <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-black grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xs text-slate-400">총 배정 DB</p><p className="text-2xl">{totalDB}건</p></div>
              <div><p className="text-xs text-slate-400">총 반품 DB</p><p className="text-2xl text-rose-500">{totalReturn}건</p></div>
              <div><p className="text-xs text-slate-400">전체 반품율</p><p className="text-2xl text-rose-600 font-black">{getRate(totalReturn, totalDB)}%</p></div>
            </div>
            {selectedAgent && (
              <div className="bg-white p-10 rounded-[3rem] border shadow-xl space-y-10">
                <p className="text-2xl font-black underline decoration-4">{selectedAgent.name} CA 전환율 분석</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <FunnelBox label="전화→만남" val={getRate(selectedAgent.performance.meet, selectedAgent.performance.call)} />
                  <FunnelBox label="만남→제안(PT)" val={getRate(selectedAgent.performance.pt, selectedAgent.performance.meet)} />
                  <FunnelBox label="제안→계약" val={getRate(selectedAgent.performance.contract_cnt, selectedAgent.performance.pt)} />
                  <FunnelBox label="소개율" val={getRate(selectedAgent.performance.intro, selectedAgent.performance.contract_cnt)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. 교육 관리 - 유지 */}
        {type === 'edu' && (
          <div className="space-y-6">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Attendance</h3>
            <div className="border-2 border-black rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left font-black">
                <thead className="bg-slate-900 text-[#d4af37] text-xs uppercase"><tr><th className="p-6">Name</th><th className="p-6 text-center">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{agents.map((a:any) => (<tr key={a.id}><td className="p-6">{a.name} CA</td><td className="p-6 text-center">{a.performance.edu_status}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. 시스템 설정 - 교육 내용 입력 추가 */}
        {type === 'sys' && (
          <div className="space-y-10">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">Settings</h3>
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4">
                <InputRow label="팀 실적 목표" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표" val={tarIntro} onChange={setTarIntro} />
                <InputRow label="실제 도입 확정" val={curIntro} onChange={setCurIntro} />
              </div>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 uppercase">교육 공지 (직원 체크리스트용)</p>
                <textarea value={eduContent} onChange={e=>setEduContent(e.target.value)} className="w-full h-40 p-6 bg-slate-50 border-2 border-black rounded-[2.5rem] outline-none text-sm italic" placeholder="직원 화면에 나타날 교육 내용을 입력하세요." />
              </div>
            </div>
            <button onClick={saveSys} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl italic shadow-2xl uppercase">Save All</button>
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
      <p className="text-2xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-8 bg-slate-100 rounded-full border-2 border-black overflow-hidden relative">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white mix-blend-difference">{pct}%</span>
      </div>
    </div>
  )
}
function MiniBox({ label, val, color="text-black" }: any) { return <div className="bg-white p-6 rounded-3xl border shadow-sm text-center font-black"><p className="text-[10px] text-slate-400 mb-1">{label}</p><p className={`text-2xl italic ${color}`}>{val}</p></div> }
function FunnelBox({ label, val }: any) { return <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-2xl italic font-black text-indigo-600">{val}%</p><p className="text-[10px] text-slate-400 font-black">{label}</p></div> }
function InputRow({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border"><label className="text-xs italic font-black">{label}</label><input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-20 p-2 bg-white border rounded-xl text-center outline-none font-black" /></div> }