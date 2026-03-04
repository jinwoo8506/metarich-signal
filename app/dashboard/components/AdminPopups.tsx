"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from("team_settings").select("*");
      if (data) setNotice(data.find(s => s.key === 'global_notice')?.value || "");
    };
    loadSettings();
  }, []);

  const saveSettings = async () => {
    const settings = [
        { key: 'team_target_amt', value: String(tarAmt) },
        { key: 'team_target_cnt', value: String(tarCnt) },
        { key: 'team_target_intro', value: String(tarIntro) },
        { key: 'global_notice', value: notice }
    ];
    await supabase.from("team_settings").upsert(settings);
    alert("전체 목표 및 공지사항이 업데이트되었습니다.");
    onClose();
  };

  const sum = (key: string) => agents.reduce((s:any, a:any) => s + (a.performance[key] || 0), 0);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl">✕</button>

        {/* 1. 실적관리 탭 */}
        {type === 'perf' && (
          <div className="space-y-8">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatBox label="팀 전체 목표금액 대비" cur={sum('contract_amt')} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="팀 전체 목표건수 대비" cur={sum('contract_cnt')} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="팀 전체 도입 대비" cur={sum('intro')} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
          </div>
        )}

        {/* 2. 활동관리 탭 */}
        {type === 'act' && (
          <div className="space-y-8">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">Activity & DB Analytics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MiniBox label="총 전화" val={sum('call')} />
              <MiniBox label="총 만남" val={sum('meet')} />
              <MiniBox label="총 제안" val={sum('pt')} />
              <MiniBox label="상담전환율" val={`${sum('call') > 0 ? ((sum('meet')/sum('call'))*100).toFixed(1) : 0}%`} />
            </div>
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center">
              <div>
                <p className="text-[#d4af37] text-[10px] font-black uppercase">DB Status</p>
                <p className="text-3xl font-black mt-2">배정 {sum('db_assigned')} / 반품 {sum('db_returned')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-50 font-black">전체 반품율</p>
                <p className="text-5xl font-black italic text-rose-500">{sum('db_assigned') > 0 ? ((sum('db_returned')/sum('db_assigned'))*100).toFixed(1) : 0}%</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. 교육관리 탭 (유지) */}
        {type === 'edu' && (
          <div className="space-y-6">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">Education Check</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {agents.map((a:any)=>(
                <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border text-center font-black">
                  <p className="text-sm mb-2">{a.name}</p>
                  <span className={`text-[10px] px-3 py-1 rounded-full text-white ${a.performance.edu_status==='참여'?'bg-indigo-600':'bg-slate-300'}`}>{a.performance.edu_status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. 목표설정 탭 (전체 목표 및 공지 수정) */}
        {type === 'sys' && (
          <div className="space-y-10">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">팀 목표 및 시스템 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-xs text-slate-400 border-b pb-1">전체 목표 수치 설정</p>
                <InputItem label="전체 목표 금액" val={tarAmt} onChange={setTarAmt} />
                <InputItem label="전체 목표 건수" val={tarCnt} onChange={setTarCnt} />
                <InputItem label="전체 도입 목표" val={tarIntro} onChange={setTarIntro} />
              </div>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 border-b pb-1">시스템 메시지 설정</p>
                <textarea value={notice} onChange={(e)=>setNotice(e.target.value)} className="w-full h-32 p-4 bg-slate-50 border rounded-2xl outline-none font-black text-xs" placeholder="공지사항 및 주차별 교육 내용 통합 수정" />
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-black text-[#d4af37] py-6 rounded-[2rem] text-xl italic font-black shadow-xl">APPLY SETTINGS</button>
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
      <p className="text-xl">{cur}{unit} / <span className="text-slate-300">{tar}</span></p>
      <p className={`text-4xl italic my-2 ${color.replace('bg-', 'text-')}`}>{pct.toFixed(1)}%</p>
      <div className="w-full h-2 bg-white rounded-full overflow-hidden border"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
function MiniBox({ label, val }: any) { return <div className="bg-slate-50 p-4 rounded-2xl border text-center font-black"><p className="text-[10px] text-slate-400 mb-1">{label}</p><p className="text-xl">{val}</p></div> }
function InputItem({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl font-black"><label className="text-xs">{label}</label><input type="number" value={val} onChange={(e)=>onChange(Number(e.target.value))} className="w-24 p-2 bg-white border rounded-xl text-center outline-none border-black" /></div> }