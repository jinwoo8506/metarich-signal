"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import SalesTools from "./SalesTools"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, edu_status: "미참여"
  });
  const [isToolOpen, setIsToolOpen] = useState(false);
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  useEffect(() => { fetchDailyData() }, [selectedDate]);

  async function fetchDailyData() {
    const { data } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    // 관리자가 설정한 공통 목표치 가져오기 (예시: 로컬스토리지 또는 별도 DB)
    const globalTargetAmt = localStorage.getItem("target_amt_setting") || "300";
    const globalTargetCnt = localStorage.getItem("target_cnt_setting") || "10";

    if (data) {
      setPerfInput({ ...data, target_amt: Number(globalTargetAmt), target_cnt: Number(globalTargetCnt) });
    } else {
      setPerfInput(prev => ({ ...prev, call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_cnt: 0, contract_amt: 0, edu_status: "미참여", target_amt: Number(globalTargetAmt), target_cnt: Number(globalTargetCnt) }));
    }
  }

  const handleSave = async () => {
    const { error } = await supabase.from("daily_perf").upsert({ 
      user_id: user.id, 
      date: dateStr, 
      ...perfInput 
    }, { onConflict: 'user_id,date' });
    
    if (error) alert("저장 중 오류가 발생했습니다: " + error.message);
    else alert(`${selectedDate.toLocaleDateString()} 실적 및 교육 상태가 저장되었습니다.`);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      {/* 상단 정보 및 퀵링크 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-[#d4af37] font-black italic">A</div>
          <p className="font-black text-lg">{user.name} <span className="text-blue-600">설계사님</span> 반갑습니다.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="https://www.e-insunet.co.kr" color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 실적 입력 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgCard label="목표 금액 달성 (만원)" cur={perfInput.contract_amt} tar={perfInput.target_amt} unit="만" color="text-indigo-600" onChangeCur={(v:any)=>setPerfInput({...perfInput, contract_amt:v})} />
        <ProgCard label="목표 건수 달성 (건수)" cur={perfInput.contract_cnt} tar={perfInput.target_cnt} unit="건" color="text-emerald-500" onChangeCur={(v:any)=>setPerfInput({...perfInput, contract_cnt:v})} />
      </div>

      {/* 활동 지표 입력 */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
        <p className="text-[11px] font-black text-slate-400 mb-6 text-center italic tracking-widest">ACTIVITY SMART INPUT</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
          <MetricInput label="미팅" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
          <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
          <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
          <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
          <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
        </div>
      </div>

      {/* 교육 관리 (슬림화 버전) */}
      <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-[#d4af37] font-black italic text-lg uppercase shrink-0">교육 관리</h3>
            <div className="h-4 w-[1px] bg-slate-700 hidden md:block"></div>
            <p className="text-slate-400 text-xs font-bold">이번 주차 교육 일정을 확인하고 참여 여부를 체크하세요.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPerfInput({...perfInput, edu_status: "참여"})} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${perfInput.edu_status === '참여' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>참여</button>
            <button onClick={() => setPerfInput({...perfInput, edu_status: "불참"})} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${perfInput.edu_status === '불참' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'}`}>불참</button>
          </div>
        </div>
      </div>

      {/* 통합 저장 버튼 */}
      <button onClick={handleSave} className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl hover:scale-[1.01] active:scale-95 transition-all">실적 및 활동 저장하기</button>

      {isToolOpen && <SalesTools onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function QuickBtn({ label, url, onClick, color }: any) {
  return (
    <button onClick={() => url ? window.open(url, "_blank") : onClick()} className={`${color} px-5 py-3 rounded-2xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white`}>
      {label}
    </button>
  )
}
function MetricInput({ label, val, onChange, color }: any) {
  return (
    <div className="space-y-1 text-center font-black">
      <label className="text-[9px] text-slate-300 uppercase">{label}</label>
      <input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-3 bg-slate-50 border-2 border-transparent focus:border-black rounded-xl text-center text-lg outline-none ${color}`} />
    </div>
  )
}
function ProgCard({ label, cur, tar, unit, color, onChangeCur }: any) {
  const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
      <p className="text-[10px] font-black text-slate-400 text-center">{label}</p>
      <div className="flex items-center gap-4">
        <input type="number" value={cur} onChange={e=>onChangeCur(Number(e.target.value))} className={`flex-1 p-4 bg-slate-50 rounded-2xl font-black text-center text-xl outline-none border-2 border-transparent focus:border-black ${color}`} />
        <div className="text-right shrink-0">
          <p className="text-[8px] font-bold text-slate-300">목표: {tar}{unit}</p>
          <p className="text-2xl font-black italic">{pct.toFixed(0)}%</p>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}