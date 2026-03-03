"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import SalesTools from "./SalesTools"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, edu_status: "미참여" // 참여/불참/미참여
  });
  const [isToolOpen, setIsToolOpen] = useState(false);
  const [mainProjectNotice, setMainProjectNotice] = useState("메타리치 2026 상반기 전사 프로젝트: 디지털 영업 혁신 캠페인 진행 중");

  useEffect(() => { fetchDailyData() }, [selectedDate]);

  async function fetchDailyData() {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { data } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    if (data) setPerfInput(data);
    else setPerfInput({ ...perfInput, call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_cnt: 0, contract_amt: 0, edu_status: "미참여" });
  }

  const handleSave = async () => {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    const { error } = await supabase.from("daily_perf").upsert({ user_id: user.id, date: dateStr, ...perfInput }, { onConflict: 'user_id,date' });
    if (error) alert("저장 실패");
    else alert("오늘의 실적과 교육 상태가 저장되었습니다.");
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      {/* 1. 상단 고정 전체 공지 (프로젝트 개념) */}
      <div className="bg-black text-white p-6 rounded-[2rem] flex items-center justify-between shadow-2xl overflow-hidden relative group">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#d4af37] rounded-full flex items-center justify-center font-black text-black shrink-0">PJT</div>
          <div>
            <p className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.3em]">Main Project Announcement</p>
            <h2 className="text-lg font-bold italic">{mainProjectNotice}</h2>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-[#d4af37]/20 to-transparent skew-x-12 translate-x-10"></div>
      </div>

      {/* 퀵링크 및 툴 (생략 가능, 이전과 동일) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-white" />
        <QuickBtn label="보험사" url="https://www.e-insunet.co.kr" color="bg-white" />
        <QuickBtn label="보험금청구" url="https://www.sosclaim.co.kr" color="bg-white text-blue-600" />
        <QuickBtn label="자료실" url="#" color="bg-white text-slate-300" />
        <button onClick={() => setIsToolOpen(true)} className="bg-white border-2 border-black py-4 rounded-2xl font-black text-[11px] uppercase hover:bg-black hover:text-[#d4af37] transition-all">Sales Tools</button>
      </div>

      {/* 실적 입력 영역 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ProgCard label="Amount (만원)" cur={perfInput.contract_amt} tar={perfInput.target_amt} unit="만" color="text-indigo-600" onChangeCur={(v:any)=>setPerfInput({...perfInput, contract_amt:v})} onChangeTar={(v:any)=>setPerfInput({...perfInput, target_amt:v})} />
        <ProgCard label="Contracts (건수)" cur={perfInput.contract_cnt} tar={perfInput.target_cnt} unit="건" color="text-emerald-500" onChangeCur={(v:any)=>setPerfInput({...perfInput, contract_cnt:v})} onChangeTar={(v:any)=>setPerfInput({...perfInput, target_cnt:v})} />
      </div>

      {/* 활동 지표 */}
      <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
          <MetricInput label="미팅" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
          <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
          <MetricInput label="소개/도입" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
          <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
          <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
      </div>

      {/* 2. 교육관리: 주차별 일정 및 참여 체크 */}
      <div className="bg-slate-900 p-10 rounded-[4rem] text-white shadow-2xl">
        <div className="flex justify-between items-end mb-8 border-b border-slate-700 pb-4">
            <div>
                <p className="text-[10px] font-black text-[#d4af37] uppercase mb-1">Monthly Education Schedule</p>
                <h3 className="text-2xl font-black italic uppercase">3월 교육 일정 관리</h3>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Selection: {perfInput.edu_status}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
            <EduDayCard week="1주차" title="상품 약관 분석" date="03.05" active={true} />
            <EduDayCard week="2주차" title="거절 처리 화법" date="03.12" />
            <EduDayCard week="3주차" title="세무 및 증여" date="03.19" />
            <EduDayCard week="4주차" title="고급 클로징 기법" date="03.26" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
            <button 
                onClick={() => setPerfInput({...perfInput, edu_status: "참여"})}
                className={`flex-1 py-6 rounded-[2rem] font-black uppercase tracking-widest transition-all ${perfInput.edu_status === '참여' ? 'bg-indigo-600 text-white shadow-[0_0_30px_rgba(79,70,229,0.4)]' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
            >
                Education Attend (참여)
            </button>
            <button 
                onClick={() => setPerfInput({...perfInput, edu_status: "불참"})}
                className={`flex-1 py-6 rounded-[2rem] font-black uppercase tracking-widest transition-all ${perfInput.edu_status === '불참' ? 'bg-rose-600 text-white shadow-[0_0_30px_rgba(225,29,72,0.4)]' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
            >
                Absent (불참)
            </button>
        </div>

        <button onClick={handleSave} className="w-full mt-6 bg-[#d4af37] text-black py-6 rounded-[2.5rem] font-black uppercase tracking-widest hover:scale-[1.01] transition-all">
            Update All Status
        </button>
      </div>

      {isToolOpen && <SalesTools onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function EduDayCard({ week, title, date, active }: any) {
    return (
        <div className={`p-5 rounded-3xl border-2 transition-all ${active ? 'border-[#d4af37] bg-white/5' : 'border-slate-800 bg-slate-800/50 opacity-40'}`}>
            <p className="text-[10px] font-black text-[#d4af37] uppercase">{week}</p>
            <p className="font-bold text-sm my-1">{title}</p>
            <p className="text-[10px] font-bold text-slate-500 italic">{date}</p>
        </div>
    )
}
// QuickBtn, MetricInput, ProgCard 컴포넌트는 기존과 동일
function QuickBtn({ label, color, url }: any) { return <button onClick={() => url !== "#" ? window.open(url, "_blank") : alert("준비 중")} className={`${color} border-2 border-black py-4 rounded-2xl font-black text-[11px] uppercase shadow-sm hover:bg-black hover:text-[#d4af37] transition-all`}>{label}</button> }
function MetricInput({ label, val, onChange, color }: any) { return <div className="space-y-2 text-center font-black"><label className="text-[10px] text-slate-300 uppercase">{label}</label><input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl text-center text-xl outline-none ${color}`} /></div> }
function ProgCard({ label, cur, tar, unit, color, onChangeCur, onChangeTar }: any) {
  const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
  return (
    <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{label}</p>
      <div className="grid grid-cols-2 gap-4"><input type="number" value={tar} onChange={e=>onChangeTar(Number(e.target.value))} className="p-4 bg-slate-50 rounded-2xl font-black text-center outline-none" /><input type="number" value={cur} onChange={e=>onChangeCur(Number(e.target.value))} className={`p-4 bg-slate-50 rounded-2xl font-black text-center outline-none ${color}`} /></div>
      <div className="space-y-2"><div className="flex justify-between items-end font-black px-2"><span className="text-[9px] text-slate-400 uppercase">{unit} 달성률</span><span className="text-3xl italic">{pct.toFixed(1)}%</span></div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-700`} style={{ width: `${pct}%` }} /></div></div>
    </div>
  )
}