"use client"

import React, { useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, teamTotals, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(agents[0]?.target_amt || 300);
  const [tarCnt, setTarCnt] = useState(agents[0]?.target_cnt || 10);
  const [notice, setNotice] = useState("");

  const saveSettings = async () => {
    const settings = [
        { key: 'team_target_amt', value: String(tarAmt) },
        { key: 'team_target_cnt', value: String(tarCnt) }
    ];
    const { error } = await supabase.from("team_settings").upsert(settings);
    if (!error) {
        alert("팀 전체 목표가 설정되었습니다. 직원 화면에 즉시 반영됩니다.");
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>
        
        {/* 시스템 설정 및 공지 통합 */}
        {type === 'sys' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">시스템 설정 및 공지</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <p className="text-sm text-slate-400 uppercase tracking-widest border-b">팀 전체 월간 목표 설정</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs">전체 목표 금액 (만원)</label>
                    <input type="number" value={tarAmt} onChange={(e)=>setTarAmt(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl font-black outline-none" />
                  </div>
                  <div>
                    <label className="text-xs">전체 목표 건수 (건)</label>
                    <input type="number" value={tarCnt} onChange={(e)=>setTarCnt(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl font-black outline-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-sm text-slate-400 uppercase tracking-widest border-b">팀 공지사항 전달</p>
                <textarea value={notice} onChange={(e)=>setNotice(e.target.value)} className="w-full h-40 p-4 bg-slate-50 border rounded-2xl outline-none text-sm font-bold" placeholder="직원 화면에 노출될 공지를 입력하세요." />
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-black text-[#d4af37] py-6 rounded-[2rem] text-xl shadow-xl">전체 목표 및 공지 배포하기</button>
          </div>
        )}

        {/* 실적 관리: 팀 전체 데이터 합계 노출 */}
        {type === 'perf' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl italic border-b-8 border-indigo-600 inline-block uppercase">팀 통합 실적 분석</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-indigo-50 rounded-[3rem] border border-indigo-100 text-center">
                    <p className="text-xs text-indigo-600 mb-2 font-black">팀 전체 실적 합계</p>
                    <p className="text-5xl font-black italic">{teamTotals.amt}만</p>
                </div>
                <div className="p-8 bg-emerald-50 rounded-[3rem] border border-emerald-100 text-center">
                    <p className="text-xs text-emerald-600 mb-2 font-black">팀 전체 건수 합계</p>
                    <p className="text-5xl font-black italic">{teamTotals.cnt}건</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-200 text-center">
                    <p className="text-xs text-slate-400 mb-2 font-black">평균 달성률</p>
                    <p className="text-5xl font-black italic">{((teamTotals.amt/tarAmt/agents.length)*100 || 0).toFixed(0)}%</p>
                </div>
            </div>
          </div>
        )}

        {/* 교육 관리 및 참석 명단 */}
        {type === 'edu' && (
          <div className="space-y-10 text-center">
            <header><h3 className="text-4xl italic border-b-8 border-black inline-block uppercase">교육 이수 관리</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((a:any) => (
                    <div key={a.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border">
                        <span className="font-black">{a.name} CA</span>
                        <span className={`px-4 py-2 rounded-xl text-[10px] text-white font-black ${a.performance.edu_status === '참여' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                            {a.performance.edu_status}
                        </span>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}