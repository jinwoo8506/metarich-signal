"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import SalesTools from "./SalesTools"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, edu_status: "미참여"
  });
  const [teamTargets, setTeamTargets] = useState({ amt: 300, cnt: 10, intro: 2 });
  const [isToolOpen, setIsToolOpen] = useState(false);
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  useEffect(() => { 
    fetchData();
  }, [selectedDate]);

  async function fetchData() {
    // 1. 관리자가 설정한 팀 전체 목표 가져오기 (DB 연동)
    const { data: settings } = await supabase.from("team_settings").select("*");
    const amt = settings?.find(s => s.key === 'team_target_amt')?.value || 300;
    const cnt = settings?.find(s => s.key === 'team_target_cnt')?.value || 10;
    const intro = settings?.find(s => s.key === 'team_target_intro')?.value || 2;
    setTeamTargets({ amt: Number(amt), cnt: Number(cnt), intro: Number(intro) });

    // 2. 내 일일 실적 가져오기
    const { data: perf } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    if (perf) setPerfInput(perf);
    else setPerfInput({ call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_cnt: 0, contract_amt: 0, edu_status: "미참여" });
  }

  const handleSave = async () => {
    // 입력값 관리자에게 전송 (저장)
    const { error } = await supabase.from("daily_perf").upsert({ 
        user_id: user.id, 
        date: dateStr, 
        ...perfInput 
    }, { onConflict: 'user_id,date' });
    
    if (error) alert("전송 실패: " + error.message);
    else alert(`${selectedDate.toLocaleDateString()} 실적이 관리자에게 전송되었습니다.`);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      {/* 상단 정보 및 퀵링크 (공통) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-[#d4af37] font-black italic">A</div>
          <p className="font-black text-lg">{user.name} <span className="text-blue-600">설계사님</span> 반갑습니다.</p>
        </div>
        <div className="flex gap-2">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="https://www.e-insunet.co.kr" color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 개인 실적 및 팀 목표 대비 달성률 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgCard label="개인 금액 달성률" cur={perfInput.contract_amt} tar={teamTargets.amt} unit="만" color="text-indigo-600" onChangeCur={(v:any)=>setPerfInput({...perfInput, contract_amt:v})} />
        <ProgCard label="개인 건수 달성률" cur={perfInput.contract_cnt} tar={teamTargets.cnt} unit="건" color="text-emerald-500" onChangeCur={(v:any)=>setPerfInput({...perfInput, contract_cnt:v})} />
      </div>

      {/* 활동 지표 입력 */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
        <p className="text-[11px] font-black text-slate-400 mb-6 text-center italic tracking-widest">일일 활동 데이터 입력</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
          <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
          <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
          <MetricInput label="도입" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
          <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
          <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
        </div>
      </div>

      {/* 교육 관리 (사이즈 축소 및 이전 주차별 카드 디자인) */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-[#d4af37] font-black italic text-lg uppercase">주차별 교육 일정</h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">상태: {perfInput.edu_status}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <EduCard week="1주차" title="상품 약관 분석" active={true} />
            <EduCard week="2주차" title="거절 처리 화법" />
            <EduCard week="3주차" title="세무 및 증여" />
            <EduCard week="4주차" title="클로징 기법" />
        </div>
        <div className="flex gap-2">
            <button onClick={() => setPerfInput({...perfInput, edu_status: "참여"})} className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${perfInput.edu_status === '참여' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}>교육 참여</button>
            <button onClick={() => setPerfInput({...perfInput, edu_status: "불참"})} className={`flex-1 py-4 rounded-2xl font-black text-xs transition-all ${perfInput.edu_status === '불참' ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}>교육 불참</button>
        </div>
      </div>

      {/* 최종 저장 버튼 */}
      <button onClick={handleSave} className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-[1.01] active:scale-95 transition-all">실적 및 활동 저장하기 (관리자 전송)</button>

      {isToolOpen && <SalesTools onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function EduCard({ week, title, active }: any) {
    return (
        <div className={`p-4 rounded-2xl border transition-all ${active ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-slate-800 opacity-40'}`}>
            <p className="text-[10px] font-black text-[#d4af37] uppercase">{week}</p>
            <p className="font-bold text-[11px] my-1">{title}</p>
        </div>
    )
}
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url ? window.open(url, "_blank") : onClick()} className={`${color} px-5 py-3 rounded-2xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white`}>{label}</button> }
function MetricInput({ label, val, onChange, color }: any) { return <div className="space-y-1 text-center font-black"><label className="text-[9px] text-slate-300 uppercase">{label}</label><input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-3 bg-slate-50 border-2 border-transparent focus:border-black rounded-xl text-center text-lg outline-none ${color}`} /></div> }
function ProgCard({ label, cur, tar, unit, color, onChangeCur }: any) {
  const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
      <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-4">
        <input type="number" value={cur} onChange={e=>onChangeCur(Number(e.target.value))} className={`flex-1 p-4 bg-slate-50 rounded-2xl font-black text-center text-xl outline-none border-2 border-transparent focus:border-black ${color}`} />
        <div className="text-right shrink-0">
          <p className="text-[8px] font-bold text-slate-300">팀 목표: {tar}{unit}</p>
          <p className="text-2xl font-black italic">{pct.toFixed(0)}%</p>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-700`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}