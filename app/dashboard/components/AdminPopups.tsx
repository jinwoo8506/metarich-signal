"use client"

import React, { useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, onClose }: { type: string, agents: any[], onClose: () => void }) {
  // 시스템 설정 상태
  const [tarAmt, setTarAmt] = useState(agents[0]?.target_amt || 300);
  const [tarCnt, setTarCnt] = useState(agents[0]?.target_cnt || 10);
  const [tarIntro, setTarIntro] = useState(2);

  const saveTeamSettings = async () => {
    // 팀 전체 목표 DB 저장
    const settings = [
        { key: 'team_target_amt', value: String(tarAmt) },
        { key: 'team_target_cnt', value: String(tarCnt) },
        { key: 'team_target_intro', value: String(tarIntro) }
    ];
    const { error } = await supabase.from("team_settings").upsert(settings);
    
    if (error) alert("설정 저장 실패");
    else {
        alert("팀 전체 목표가 설정되었습니다. 모든 직원 화면에 즉시 반영됩니다.");
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>
        
        {/* 1. 시스템 설정: 목표 및 교육 수정 */}
        {type === 'sys' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl italic uppercase border-b-8 border-black inline-block">시스템 설정</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <p className="text-sm text-slate-400 uppercase tracking-widest border-b pb-2">전사 팀 목표 설정</p>
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                        <label className="text-xs">전체 목표 금액 (만원)</label>
                        <input type="number" value={tarAmt} onChange={(e)=>setTarAmt(Number(e.target.value))} className="w-24 p-2 bg-white border-2 border-black rounded-xl text-center outline-none" />
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                        <label className="text-xs">전체 목표 건수 (건)</label>
                        <input type="number" value={tarCnt} onChange={(e)=>setTarCnt(Number(e.target.value))} className="w-24 p-2 bg-white border-2 border-black rounded-xl text-center outline-none" />
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                        <label className="text-xs">전체 목표 도입 (명)</label>
                        <input type="number" value={tarIntro} onChange={(e)=>setTarIntro(Number(e.target.value))} className="w-24 p-2 bg-white border-2 border-black rounded-xl text-center outline-none" />
                    </div>
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-sm text-slate-400 uppercase tracking-widest border-b pb-2">주차별 교육내용 수정</p>
                <div className="space-y-3">
                    <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none text-sm" defaultValue="1주차: 상품 약관 분석" />
                    <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none text-sm" defaultValue="2주차: 거절 처리 화법" />
                    <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none text-sm" defaultValue="3주차: 세무 및 증여" />
                    <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none text-sm" defaultValue="4주차: 클로징 기법" />
                </div>
              </div>
            </div>
            <button onClick={saveTeamSettings} className="w-full bg-black text-[#d4af37] py-6 rounded-[2rem] text-xl shadow-xl hover:bg-slate-800 transition-all">설정값 일괄 저장 및 직원 배포</button>
          </div>
        )}

        {/* 2. 교육 관리: 참석 명단 확인 */}
        {type === 'edu' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl italic uppercase border-b-8 border-indigo-600 inline-block">교육 이수 현황</h3></header>
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] mb-6 flex justify-between items-center">
                <p className="text-xl font-black">이번 주차 교육 참여 인원</p>
                <p className="text-5xl font-black text-[#d4af37]">{agents.filter(a=>a.performance.edu_status === '참여').length} <span className="text-xl text-white">/ {agents.length} 명</span></p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agents.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border">
                        <span className="font-black">{a.name} CA</span>
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black ${a.performance.edu_status === '참여' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {a.performance.edu_status}
                        </span>
                    </div>
                ))}
            </div>
          </div>
        )}
        
        {/* 실적/활동 통계는 요약 그래프 등으로 확장 가능 (현재 구조 유지) */}
        {(type === 'perf' || type === 'act') && (
            <div className="p-20 text-center text-slate-300">
                <p className="text-4xl italic mb-4 font-black">데이터 분석 모듈</p>
                <p className="text-sm">실시간 팀 통계 및 활동 성공률 분석 데이터를 준비 중입니다.</p>
            </div>
        )}
      </div>
    </div>
  )
}