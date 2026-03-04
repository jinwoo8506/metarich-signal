"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import SalesTools from "./SalesTools"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
    edu_status: "미참여", is_approved: false
  });
  const [globalNotice, setGlobalNotice] = useState("");
  const [eduSchedule, setEduSchedule] = useState("");
  const [isToolOpen, setIsToolOpen] = useState(false);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}-01`;

  useEffect(() => { 
    fetchData() 
  }, [monthKey]);

  async function fetchData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setEduSchedule(settings?.find(s => s.key === 'edu_schedule')?.value || "등록된 교육 일정이 없습니다.");

    const { data: perf } = await supabase.from("daily_perf")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", monthKey)
      .maybeSingle();

    if (perf) {
      setPerfInput(perf);
    } else {
      setPerfInput({ 
        call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
        contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
        edu_status: "미참여", is_approved: false 
      });
    }
  }

  const handleSave = async () => {
    // 저장 시에는 현재 입력된 값을 그대로 upsert 합니다.
    // 관리자가 승인(is_approved: true)을 한 상태라면 목표값은 UI에서 고정되어 들어오게 됩니다.
    const { error } = await supabase.from("daily_perf").upsert({ 
      ...perfInput,
      user_id: user.id, 
      date: monthKey
      // is_approved 상태를 강제로 false로 바꾸지 않고 현재 상태 유지
    }, { onConflict: 'user_id, date' });

    if (error) {
        alert("저장 실패: " + error.message);
    } else {
        alert(`${month}월 실적이 업데이트되었습니다.`);
        fetchData();
    }
  };

  // 달성률 계산 로직
  const amtRate = perfInput.target_amt > 0 ? ((perfInput.contract_amt / perfInput.target_amt) * 100).toFixed(1) : "0";
  const cntRate = perfInput.target_cnt > 0 ? ((perfInput.contract_cnt / perfInput.target_cnt) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20 font-black">
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 z-10 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5 font-black">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-5 rounded-[2.5rem] shadow-sm border font-black">
        <div className="flex items-center gap-2 font-black">
          <p className="text-lg font-black">{user.name} <span className="text-blue-600 italic">AGENT</span></p>
          {perfInput.is_approved && <span className="bg-emerald-100 text-emerald-600 text-[10px] px-2 py-1 rounded-lg border border-emerald-200 font-black">목표승인됨</span>}
        </div>
        <div className="flex flex-wrap gap-2 font-black">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="보험금청구" url="#" color="bg-slate-50" />
          <QuickBtn label="자료실" url="#" color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 목표 및 실적 (목표만 승인 후 잠금) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-black">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
          <div className="flex justify-between items-center px-2">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{month}월 목표 금액</p>
            <p className="text-indigo-600 text-xs font-black italic">달성률 {amtRate}%</p>
          </div>
          <div className="flex items-center gap-2 font-black">
            <div className="relative w-1/2">
              <input type="number" disabled={perfInput.is_approved} value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className={`w-full p-4 rounded-2xl text-center outline-none border font-black ${perfInput.is_approved ? 'bg-slate-200 text-slate-500 border-transparent' : 'bg-slate-100 focus:border-black'}`} placeholder="목표" />
              {perfInput.is_approved && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-black text-white px-2 py-0.5 rounded-full">FIXED</span>}
            </div>
            <input type="number" value={perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="w-1/2 p-4 bg-indigo-50 text-indigo-600 rounded-2xl text-center outline-none border border-indigo-200 font-black" placeholder="실적" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
          <div className="flex justify-between items-center px-2">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{month}월 목표 건수</p>
            <p className="text-emerald-600 text-xs font-black italic">달성률 {cntRate}%</p>
          </div>
          <div className="flex items-center gap-2 font-black">
            <div className="relative w-1/2">
              <input type="number" disabled={perfInput.is_approved} value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className={`w-full p-4 rounded-2xl text-center outline-none border font-black ${perfInput.is_approved ? 'bg-slate-200 text-slate-500 border-transparent' : 'bg-slate-100 focus:border-black'}`} placeholder="목표" />
              {perfInput.is_approved && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-black text-white px-2 py-0.5 rounded-full">FIXED</span>}
            </div>
            <input type="number" value={perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="w-1/2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-center outline-none border border-emerald-200 font-black" placeholder="실적" />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border font-black">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 font-black">
          <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
          <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
          <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
          <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
          <MetricInput label="DB배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
          <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white font-black shadow-2xl">
        <h3 className="text-[#d4af37] italic mb-4 uppercase text-xs text-center tracking-widest font-black">Monthly Education Schedule</h3>
        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 mb-6 min-h-[120px] text-[13px] leading-relaxed whitespace-pre-wrap font-black text-slate-300">
          {eduSchedule}
        </div>
        <div className="flex gap-2 font-black">
          <button onClick={()=>setPerfInput({...perfInput, edu_status:'참여'})} className={`flex-1 py-5 rounded-2xl font-black text-xs transition-all ${perfInput.edu_status==='참여'?'bg-indigo-600':'bg-slate-800'}`}>참여</button>
          <button onClick={()=>setPerfInput({...perfInput, edu_status:'불참'})} className={`flex-1 py-5 rounded-2xl font-black text-xs transition-all ${perfInput.edu_status==='불참'?'bg-rose-600':'bg-slate-800'}`}>불참</button>
        </div>
      </div>

      <button onClick={handleSave} className="w-full bg-black text-white py-7 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all italic tracking-tighter uppercase font-black">
        Save & Update Record
      </button>
      
      {isToolOpen && <SalesTools onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0 font-black`}>{label}</button> }
function MetricInput({ label, val, onChange, color, disabled }: any) { return <div className="space-y-1 text-center font-black"><label className="text-[9px] text-slate-300 uppercase font-black">{label}</label><input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl text-center text-xl outline-none transition-all ${color} font-black`} /></div> }