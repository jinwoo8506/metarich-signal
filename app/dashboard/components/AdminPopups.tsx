"use client"

import React, { useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [notice, setNotice] = useState("");

  const saveSettings = async () => {
    const settings = [
        { key: 'team_target_amt', value: String(tarAmt) },
        { key: 'team_target_cnt', value: String(tarCnt) },
        { key: 'team_target_intro', value: String(tarIntro) },
        { key: 'global_notice', value: notice }
    ];
    await supabase.from("team_settings").upsert(settings);
    alert("목표 및 공지사항이 배포되었습니다.");
    onClose();
  };

  const totalAmt = agents.reduce((s:any, a:any) => s + a.performance.contract_amt, 0);
  const totalCnt = agents.reduce((s:any, a:any) => s + a.performance.contract_cnt, 0);
  const totalIntro = agents.reduce((s:any, a:any) => s + a.performance.intro, 0);
  const totalCall = agents.reduce((s:any, a:any) => s + a.performance.call, 0);
  const totalMeet = agents.reduce((s:any, a:any) => s + a.performance.meet, 0);
  const totalPt = agents.reduce((s:any, a:any) => s + a.performance.pt, 0);
  const totalDBA = agents.reduce((s:any, a:any) => s + a.performance.db_assigned, 0);
  const totalDBR = agents.reduce((s:any, a:any) => s + a.performance.db_returned, 0);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>

        {/* 1. 실적관리: 팀 전체 목표 합계 대비 진행률 */}
        {type === 'perf' && (
          <div className="space-y-8">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatBox label="전체 목표금액 대비" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="전체 목표건수 대비" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="전체 도입 대비" cur={totalIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
          </div>
        )}

        {/* 2. 활동관리: 통계 및 DB 비율 */}
        {type === 'act' && (
          <div className="space-y-8">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">Activity Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MiniBox label="총 전화" val={totalCall} />
              <MiniBox label="총 만남" val={totalMeet} />
              <MiniBox label="총 제안" val={totalPt} />
              <MiniBox label="상담전환율" val={`${totalCall > 0 ? ((totalMeet/totalCall)*100).toFixed(1) : 0}%`} />
            </div>
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center">
              <div>
                <p className="text-[#d4af37] text-[10px] uppercase font-black">DB Efficiency</p>
                <p className="text-3xl font-black mt-2">배정 {totalDBA} / 반품 {totalDBR}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-50 font-black">반품율</p>
                <p className="text-5xl font-black italic text-rose-500">{totalDBA > 0 ? ((totalDBR/totalDBA)*100).toFixed(1) : 0}%</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. 교육관리 */}
        {type === 'edu' && (
          <div className="space-y-6 text-center">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase mb-8">Education Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {agents.map((a:any)=>(
                <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border font-black">
                  <p className="text-sm mb-2">{a.name}</p>
                  <span className={`text-[10px] px-3 py-1 rounded-full text-white ${a.performance.edu_status==='참여'?'bg-indigo-600':'bg-slate-300'}`}>{a.performance.edu_status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. 목표 설정 */}
        {type === 'sys' && (
          <div className="space-y-10">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">목표 및 공지 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">
              <div className="space-y-4">
                <p className="text-xs text-slate-400 border-b pb-1">팀 목표 수치</p>
                <InputItem label="전체 목표 금액" val={tarAmt} onChange={setTarAmt} />
                <InputItem label="전체 목표 건수" val={tarCnt} onChange={setTarCnt} />
                <InputItem label="전체 도입 목표" val={tarIntro} onChange={setTarIntro} />
              </div>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 border-b pb-1">공지 및 교육</p>
                <textarea value={notice} onChange={(e)=>setNotice(e.target.value)} className="w-full h-24 p-4 bg-slate-50 border rounded-2xl outline-none text-xs font-black" placeholder="전체 공지사항 입력" />
                <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none text-xs font-black" placeholder="주차별 교육 내용 수정" />
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-black text-[#d4af37] py-6 rounded-[2rem] text-xl shadow-xl hover:scale-[1.01] active:scale-95 transition-all">설정 배포하기</button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
  return (
    <div className="bg-slate-50 p-6 rounded-[2.5rem] border text-center font-black">
      <p className="text-[10px] text-slate-400 mb-2">{label}</p>
      <p className="text-2xl">{cur}{unit} / <span className="text-slate-300 font-bold">{tar}</span></p>
      <p className={`text-3xl italic my-2 ${color.replace('bg-', 'text-')}`}>{pct.toFixed(1)}%</p>
      <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
function MiniBox({ label, val }: any) { return <div className="bg-slate-50 p-4 rounded-2xl border text-center font-black"><p className="text-[10px] text-slate-400 mb-1">{label}</p><p className="text-xl">{val}</p></div> }
function InputItem({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl"><label className="text-xs">{label}</label><input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} className="w-24 p-2 bg-white border rounded-xl text-center outline-none border-black font-black" /></div> }