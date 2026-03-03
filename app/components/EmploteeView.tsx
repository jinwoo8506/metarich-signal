"use client"
import React, { useState } from "react"

export default function EmployeeView({ userId }: { userId: string }) {
  const [perf, setPerf] = useState({
    target_amt: 0, current_amt: 0, target_cnt: 0, current_cnt: 0,
    call: 0, meet: 0, pt: 0, intro: 0, db: 0, ret: 0
  })

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* 상단 목표 실적 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MetricCard title="매출 목표" current={perf.current_amt} target={perf.target_amt} unit="원" color="bg-indigo-600" 
          onCurChange={(v:number)=>setPerf({...perf, current_amt:v})} onTarChange={(v:number)=>setPerf({...perf, target_amt:v})} />
        <MetricCard title="건수 목표" current={perf.current_cnt} target={perf.target_cnt} unit="건" color="bg-emerald-500" 
          onCurChange={(v:number)=>setPerf({...perf, current_cnt:v})} onTarChange={(v:number)=>setPerf({...perf, target_cnt:v})} />
      </div>

      {/* 6개 활동 지표 (가로 1줄 배치) */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-slate-400 uppercase mb-6 tracking-widest px-2">Daily Activity Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <InputUnit label="전화" val={perf.call} onChange={(v:number)=>setPerf({...perf, call:v})} />
          <InputUnit label="미팅" val={perf.meet} onChange={(v:number)=>setPerf({...perf, meet:v})} />
          <InputUnit label="제안" val={perf.pt} onChange={(v:number)=>setPerf({...perf, pt:v})} />
          <InputUnit label="도입" val={perf.intro} onChange={(v:number)=>setPerf({...perf, intro:v})} />
          <InputUnit label="DB배정" val={perf.db} onChange={(v:number)=>setPerf({...perf, db:v})} color="text-blue-600" />
          <InputUnit label="반품" val={perf.ret} onChange={(v:number)=>setPerf({...perf, ret:v})} color="text-rose-500" />
        </div>
      </div>

      {/* 하단 교육 체크리스트 */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-slate-400 uppercase mb-6 tracking-widest px-2">Training Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['상품 지식 교육', 'CS 응대 프로세스', '신규 매뉴얼'].map((item, idx) => (
            <label key={idx} className="flex items-center p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all group">
              <input type="checkbox" className="w-5 h-5 rounded border-slate-300 accent-black mr-3" />
              <span className="font-bold text-sm text-slate-700">{item}</span>
            </label>
          ))}
        </div>
        <button className="w-full mt-10 bg-black text-white py-6 rounded-2xl font-black uppercase text-sm shadow-xl active:scale-[0.98] transition-all">
          오늘의 실적 및 교육 저장
        </button>
      </div>
    </div>
  )
}

function InputUnit({ label, val, onChange, color }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-300 uppercase ml-2 tracking-tighter">{label}</label>
      <input type="number" value={val || ''} onChange={(e)=>onChange(Number(e.target.value))} 
        className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl font-black text-center text-xl outline-none ${color}`} />
    </div>
  )
}

function MetricCard({ title, current, target, unit, color, onCurChange, onTarChange }: any) {
  const pct = target > 0 ? Math.min((current/target)*100, 100) : 0;
  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <InputUnit label={`목표 ${unit}`} val={target} onChange={onTarChange} />
        <InputUnit label={`현재 ${unit}`} val={current} onChange={onCurChange} color={color.replace('bg-', 'text-')} />
      </div>
      <div className="space-y-2 px-2">
        <div className="flex justify-between font-black text-xs uppercase"><span>{title}</span><span>{pct.toFixed(1)}%</span></div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}