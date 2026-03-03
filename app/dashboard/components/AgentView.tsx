"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import SalesTools from "./SalesTools"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, edu_done: false
  });
  const [isToolOpen, setIsToolOpen] = useState(false);

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  async function fetchDailyData() {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { data } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    if (data) {
      setPerfInput(data);
    } else {
      setPerfInput({ 
        call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
        contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, edu_done: false 
      });
    }
  }

  const handleSave = async () => {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { error } = await supabase.from("daily_perf").upsert({
      user_id: user.id, date: dateStr, ...perfInput
    }, { onConflict: 'user_id,date' });
    
    if (error) alert("저장 실패: " + error.message);
    else alert("기록이 성공적으로 저장되었습니다.");
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      {/* 퀵 링크 및 계산기 버튼 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-white" />
        <QuickBtn label="보험사" url="https://www.e-insunet.co.kr" color="bg-white" />
        <QuickBtn label="보험금청구" url="https://www.sosclaim.co.kr" color="bg-white text-blue-600" />
        <QuickBtn label="자료실" url="#" color="bg-white text-slate-300" />
        <button onClick={() => setIsToolOpen(true)} className="bg-black text-[#d4af37] border-2 border-black py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg hover:scale-105 transition-all">
          Sales Tools
        </button>
      </div>

      <header>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.name} CA</p>
        <h1 className="text-3xl font-black italic uppercase">Performance</h1>
      </header>

      {/* 실적 달성률 카드 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ProgCard label="Amount (만원)" cur={perfInput.contract_amt} tar={perfInput.target_amt} unit="만" color="text-indigo-600" 
          onChangeCur={(v:number)=>setPerfInput({...perfInput, contract_amt:v})} onChangeTar={(v:number)=>setPerfInput({...perfInput, target_amt:v})} />
        <ProgCard label="Contracts (건수)" cur={perfInput.contract_cnt} tar={perfInput.target_cnt} unit="건" color="text-emerald-500" 
          onChangeCur={(v:number)=>setPerfInput({...perfInput, contract_cnt:v})} onChangeTar={(v:number)=>setPerfInput({...perfInput, target_cnt:v})} />
      </div>

      {/* 세부 수치 입력 */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border">
        <h3 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-[0.2em] italic text-center">Activity Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricInput label="전화" val={perfInput.call} onChange={(v:number)=>setPerfInput({...perfInput, call:v})} />
          <MetricInput label="미팅" val={perfInput.meet} onChange={(v:number)=>setPerfInput({...perfInput, meet:v})} />
          <MetricInput label="제안" val={perfInput.pt} onChange={(v:number)=>setPerfInput({...perfInput, pt:v})} />
          <MetricInput label="소개/도입" val={perfInput.intro} onChange={(v:number)=>setPerfInput({...perfInput, intro:v})} />
          <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v:number)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
          <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:number)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
        </div>
        
        <div className="mt-10 pt-10 border-t border-dashed flex items-center justify-between">
            <span className="font-black italic text-sm uppercase">Weekly Education Done?</span>
            <input type="checkbox" checked={perfInput.edu_done} onChange={(e)=>setPerfInput({...perfInput, edu_done: e.target.checked})} className="w-6 h-6 accent-black" />
        </div>

        <button onClick={handleSave} className="w-full mt-8 bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all">
          Save Daily Data
        </button>
      </div>

      {/* 영업도구 팝업 */}
      {isToolOpen && <SalesTools onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

// 내부 컴포넌트들
function QuickBtn({ label, color, url }: any) {
  return (
    <button onClick={() => url !== "#" ? window.open(url, "_blank") : alert("준비 중")} className={`${color} border-2 border-black py-4 rounded-2xl font-black text-[11px] uppercase shadow-sm hover:bg-black hover:text-[#d4af37] transition-all`}>
      {label}
    </button>
  )
}
function MetricInput({ label, val, onChange, color }: any) {
  return (
    <div className="space-y-2 text-center">
      <label className="text-[10px] font-black text-slate-300 uppercase">{label}</label>
      <input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl font-black text-center text-xl outline-none ${color}`} />
    </div>
  )
}
function ProgCard({ label, cur, tar, unit, color, onChangeCur, onChangeTar }: any) {
  const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
  return (
    <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center"><p className="text-[8px] font-bold text-slate-300 uppercase mb-1">Target</p>
          <input type="number" value={tar} onChange={e=>onChangeTar(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center outline-none" />
        </div>
        <div className="text-center"><p className="text-[8px] font-bold text-slate-300 uppercase mb-1">Current</p>
          <input type="number" value={cur} onChange={e=>onChangeCur(Number(e.target.value))} className={`w-full p-4 bg-slate-50 rounded-2xl font-black text-center outline-none ${color}`} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-end font-black px-2">
          <span className="text-[9px] text-slate-400 uppercase">{unit} 달성률</span>
          <span className="text-3xl italic">{pct.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}