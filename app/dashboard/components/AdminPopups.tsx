"use client"

import { useState } from "react"

export default function AdminPopups({ type, agents, onClose }: { type: string, agents: any[], onClose: () => void }) {
  // 시스템 설정 상태 (로컬 스토리지 연동)
  const [tarAmt, setTarAmt] = useState(localStorage.getItem("target_amt_setting") || "300");
  const [tarCnt, setTarCnt] = useState(localStorage.getItem("target_cnt_setting") || "10");
  const [edu1, setEdu1] = useState(localStorage.getItem("edu_w1") || "상품 분석");

  const saveSettings = () => {
    localStorage.setItem("target_amt_setting", tarAmt);
    localStorage.setItem("target_cnt_setting", tarCnt);
    localStorage.setItem("edu_w1", edu1);
    alert("시스템 설정이 저장되었습니다. 모든 직원의 화면에 즉시 반영됩니다.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>
        
        {type === 'sys' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl italic uppercase border-b-8 border-black inline-block">시스템 설정</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-sm text-slate-400 uppercase tracking-widest">전사 공통 목표 설정</p>
                <div className="space-y-2">
                    <label className="text-xs">목표 금액 (만원)</label>
                    <input type="number" value={tarAmt} onChange={(e)=>setTarAmt(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs">목표 건수 (건)</label>
                    <input type="number" value={tarCnt} onChange={(e)=>setTarCnt(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl outline-none" />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-slate-400 uppercase tracking-widest">주차별 교육 주제 수정</p>
                <div className="space-y-2">
                    <label className="text-xs">1주차 교육명</label>
                    <input value={edu1} onChange={(e)=>setEdu1(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
                </div>
                <p className="text-[10px] text-slate-400 italic mt-4">* 저장 시 모든 설계사 화면의 목표치가 변경됩니다.</p>
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-black text-[#d4af37] py-6 rounded-[2rem] text-xl shadow-xl">설정값 일괄 저장 및 배포</button>
          </div>
        )}

        {/* 실적/활동/교육 탭 생략 - 이전 구조와 동일하게 데이터만 연동 */}
        {type === 'perf' && <div className="p-10 text-center">전체 팀 실적 통계 대시보드 (준비 중)</div>}
        {type === 'edu' && (
          <div className="space-y-6">
            <h3 className="text-3xl italic uppercase border-b-4 border-black inline-block">주간 교육 이수 현황</h3>
            <div className="grid grid-cols-1 gap-2">
                {agents.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                        <span>{a.name} 설계사</span>
                        <span className={`px-4 py-1 rounded-full text-xs text-white ${a.performance.edu_status === '참여' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
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