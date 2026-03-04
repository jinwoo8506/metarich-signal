"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import SalesTools from "./SalesTools"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, edu_status: "미참여"
  });
  const [globalNotice, setGlobalNotice] = useState("");
  const [isToolOpen, setIsToolOpen] = useState(false);
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  useEffect(() => { fetchData() }, [selectedDate]);

  async function fetchData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");

    const { data: perf } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", dateStr).maybeSingle();
    if (perf) setPerfInput(perf);
    else setPerfInput({ ...perfInput, call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, contract_cnt: 0, contract_amt: 0, edu_status: "미참여" });
  }

  const handleSave = async () => {
    const { error } = await supabase.from("daily_perf").upsert({ user_id: user.id, date: dateStr, ...perfInput });
    if (error) alert("저장 실패"); else alert("활동 내용이 전송되었습니다.");
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20">
      {/* 최상단 전체 공지사항 탭 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] font-black italic shrink-0">NOTICE</span>
        <marquee className="font-black text-sm text-black">{globalNotice}</marquee>
      </div>

      {/* 상단 퀵링크 5종 */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-5 rounded-[2.5rem] shadow-sm border font-black">
        <p className="text-lg mr-4">{user.name} <span className="text-blue-600">설계사</span></p>
        <div className="flex flex-wrap gap-2">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="보험금청구" url="#" color="bg-slate-50" />
          <QuickBtn label="자료실" url="#" color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 개인 목표 설정 및 달성률 (입력탭 추가) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
          <p className="text-[10px] font-black text-slate-400 text-center">나의 월 목표 금액 / 현재 실적</p>
          <div className="flex items-center gap-2">
            <input type="number" value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className="w-1/2 p-3 bg-slate-100 rounded-xl text-center font-black outline-none border focus:border-black" placeholder="목표만" />
            <input type="number" value={perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="w-1/2 p-3 bg-indigo-50 text-indigo-600 rounded-xl text-center font-black outline-none border border-indigo-200 focus:border-black" placeholder="실적만" />
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: `${Math.min((perfInput.contract_amt/perfInput.target_amt)*100, 100)}%` }} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
          <p className="text-[10px] font-black text-slate-400 text-center">나의 월 목표 건수 / 현재 건수</p>
          <div className="flex items-center gap-2">
            <input type="number" value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className="w-1/2 p-3 bg-slate-100 rounded-xl text-center font-black outline-none border focus:border-black" placeholder="목표건" />
            <input type="number" value={perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="w-1/2 p-3 bg-emerald-50 text-emerald-600 rounded-xl text-center font-black outline-none border border-emerald-200 focus:border-black" placeholder="실적건" />
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min((perfInput.contract_cnt/perfInput.target_cnt)*100, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* 활동 데이터 (도입->소개 변경) */}
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

      {/* 교육 관리 (유지) */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white">
        <h3 className="text-[#d4af37] font-black italic mb-6 uppercase text-sm">Weekly Education</h3>
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

      <button onClick={handleSave} className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all">실적 및 활동 저장 (관리자 전송)</button>
      {isToolOpen && <SalesTools onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-4 py-2 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0`}>{label}</button> }
function MetricInput({ label, val, onChange, color }: any) { return <div className="space-y-1 text-center font-black"><label className="text-[9px] text-slate-300">{label}</label><input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-3 bg-slate-50 border-2 border-transparent focus:border-black rounded-xl text-center text-lg outline-none ${color}`} /></div> }