"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import SalesTools from "./SalesTools"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, edu_status: "미참여"
  });
  const [teamTargets, setTeamTargets] = useState({ amt: 300, cnt: 10 });
  const [isToolOpen, setIsToolOpen] = useState(false);
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  useEffect(() => { fetchData() }, [selectedDate]);

  async function fetchData() {
    // 관리자가 설정한 팀 전체 목표 로드
    const { data: settings } = await supabase.from("team_settings").select("*");
    const amt = settings?.find(s => s.key === 'team_target_amt')?.value || 300;
    const cnt = settings?.find(s => s.key === 'team_target_cnt')?.value || 10;
    setTeamTargets({ amt: Number(amt), cnt: Number(cnt) });

    // 내 활동 데이터 로드
    const { data: perf } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    if (perf) setPerfInput(perf);
    else setPerfInput({ call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_cnt: 0, contract_amt: 0, edu_status: "미참여" });
  }

  const handleSave = async () => {
    const { error } = await supabase.from("daily_perf").upsert({ user_id: user.id, date: dateStr, ...perfInput });
    if (error) alert("저장 실패"); else alert("오늘의 활동이 관리자에게 전송되었습니다.");
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      {/* 상단 퀵링크 및 사용자 정보 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border">
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

      {/* 개인 달성률 (팀 목표 대비) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgCard label="나의 금액 달성률" cur={perfInput.contract_amt} tar={teamTargets.amt} unit="만" color="text-indigo-600" onChangeCur={(v:any)=>setPerfInput({...perfInput, contract_amt:v})} />
        <ProgCard label="나의 건수 달성률" cur={perfInput.contract_cnt} tar={teamTargets.cnt} unit="건" color="text-emerald-500" onChangeCur={(v:any)=>setPerfInput({...perfInput, contract_cnt:v})} />
      </div>

      {/* 활동 지표 입력 (도입 -> 소개로 변경) */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
          <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
          <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
          <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
          <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
          <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
        </div>
      </div>

      {/* 교육 체크 (카드 디자인 유지 및 사이즈 축소) */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white">
        <h3 className="text-[#d4af37] font-black italic mb-6">주차별 교육 일정</h3>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {["1주차", "2주차", "3주차", "4주차"].map((w, i) => (
            <div key={i} className={`p-3 rounded-xl border ${i===0?'border-[#d4af37] bg-[#d4af37]/10':'border-slate-800 opacity-30'}`}>
              <p className="text-[9px] text-[#d4af37] font-black">{w}</p>
              <p className="text-[10px] font-bold">정규교육</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setPerfInput({...perfInput, edu_status:'참여'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${perfInput.edu_status==='참여'?'bg-indigo-600':'bg-slate-800'}`}>참여</button>
          <button onClick={()=>setPerfInput({...perfInput, edu_status:'불참'})} className={`flex-1 py-3 rounded-xl font-black text-xs ${perfInput.edu_status==='불참'?'bg-rose-600':'bg-slate-800'}`}>불참</button>
        </div>
      </div>

      <button onClick={handleSave} className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-xl shadow-xl">활동 내용 저장 및 전송</button>
      {isToolOpen && <SalesTools onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url ? window.open(url, "_blank") : onClick()} className={`${color} px-5 py-3 rounded-2xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white`}>{label}</button> }
function MetricInput({ label, val, onChange, color }: any) { return <div className="space-y-1 text-center font-black"><label className="text-[9px] text-slate-300">{label}</label><input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-3 bg-slate-50 border-2 border-transparent focus:border-black rounded-xl text-center text-lg outline-none ${color}`} /></div> }
function ProgCard({ label, cur, tar, unit, color, onChangeCur }: any) {
  const pct = tar > 0 ? Math.min((cur/tar)*100, 100) : 0;
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
      <p className="text-[10px] font-black text-slate-400 text-center">{label}</p>
      <div className="flex items-center gap-4">
        <input type="number" value={cur} onChange={e=>onChangeCur(Number(e.target.value))} className={`flex-1 p-4 bg-slate-50 rounded-2xl font-black text-center text-xl outline-none border-2 border-transparent focus:border-black ${color}`} />
        <div className="text-right shrink-0"><p className="text-[8px] font-bold text-slate-300">팀 목표: {tar}{unit}</p><p className="text-2xl font-black italic">{pct.toFixed(0)}%</p></div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-700`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}