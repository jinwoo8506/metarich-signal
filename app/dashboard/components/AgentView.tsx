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

  // [수정] 날짜 생성 로직 강화: YYYY-MM-01 형식 강제
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

    const { data: perf, error } = await supabase.from("daily_perf")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", monthKey)
      .maybeSingle();

    if (perf) {
      setPerfInput(perf);
    } else {
      // 데이터가 없을 때 초기화 (is_approved는 반드시 false)
      setPerfInput({ 
        call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
        contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
        edu_status: "미참여", is_approved: false 
      });
    }
  }

  const handleSave = async () => {
    if (perfInput.is_approved) {
      alert("이미 승인된 월의 데이터는 수정할 수 없습니다.");
      return;
    }

    // 전송 전 데이터 정리 (date와 user_id 포함 확인)
    const saveData = {
        ...perfInput,
        user_id: user.id,
        date: monthKey
    };

    const { error } = await supabase.from("daily_perf").upsert(saveData);

    if (error) {
        console.error("Save Error:", error);
        alert("저장 중 오류가 발생했습니다.");
    } else {
        alert(`${year}년 ${month}월 데이터가 저장되었습니다.`);
        fetchData();
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20 font-black">
      <div className="bg-[#d4af37] p-4 rounded-3xl shadow-sm border-2 border-black flex items-center gap-4 overflow-hidden">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 z-10 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-5 rounded-[2.5rem] shadow-sm border font-black">
        <div className="flex items-center gap-2">
          <p className="text-lg font-black">{user.name} <span className="text-blue-600 italic">CA</span></p>
          {perfInput.is_approved && <span className="bg-emerald-100 text-emerald-600 text-[10px] px-2 py-1 rounded-lg border border-emerald-200 font-black">승인완료</span>}
        </div>
        <div className="flex flex-wrap gap-2 font-black">
          <QuickBtn label="메타온" url="https://metaon.metarich.co.kr" color="bg-slate-50" />
          <QuickBtn label="보험사" url="#" color="bg-slate-50" />
          <QuickBtn label="보험금청구" url="#" color="bg-slate-50" />
          <QuickBtn label="자료실" url="#" color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-black">
        <div className={`bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 ${perfInput.is_approved ? 'opacity-50' : ''}`}>
          <p className="text-[10px] text-slate-400 text-center font-black uppercase tracking-widest">{month}월 목표 금액</p>
          <div className="flex items-center gap-2">
            <input type="number" disabled={perfInput.is_approved} value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className="w-1/2 p-4 bg-slate-100 rounded-2xl text-center outline-none border focus:border-black font-black" />
            <input type="number" disabled={perfInput.is_approved} value={perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="w-1/2 p-4 bg-indigo-50 text-indigo-600 rounded-2xl text-center outline-none border border-indigo-200 font-black" />
          </div>
        </div>
        <div className={`bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 ${perfInput.is_approved ? 'opacity-50' : ''}`}>
          <p className="text-[10px] text-slate-400 text-center font-black uppercase tracking-widest">{month}월 목표 건수</p>
          <div className="flex items-center gap-2">
            <input type="number" disabled={perfInput.is_approved} value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className="w-1/2 p-4 bg-slate-100 rounded-2xl text-center outline-none border focus:border-black font-black" />
            <input type="number" disabled={perfInput.is_approved} value={perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="w-1/2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-center outline-none border border-emerald-200 font-black" />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border font-black">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 font-black">
          <MetricInput label="전화" val={perfInput.call} disabled={perfInput.is_approved} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
          <MetricInput label="만남" val={perfInput.meet} disabled={perfInput.is_approved} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
          <MetricInput label="제안" val={perfInput.pt} disabled={perfInput.is_approved} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
          <MetricInput label="소개" val={perfInput.intro} disabled={perfInput.is_approved} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
          <MetricInput label="DB배정" val={perfInput.db_assigned} disabled={perfInput.is_approved} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
          <MetricInput label="반품" val={perfInput.db_returned} disabled={perfInput.is_approved} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white font-black shadow-2xl">
        <h3 className="text-[#d4af37] italic mb-4 uppercase text-xs text-center tracking-widest font-black">Monthly Education Schedule</h3>
        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 mb-6 min-h-[120px] text-[13px] leading-relaxed whitespace-pre-wrap font-black text-slate-300">
          {eduSchedule}
        </div>
        <div className="flex gap-2 font-black">
          <button disabled={perfInput.is_approved} onClick={()=>setPerfInput({...perfInput, edu_status:'참여'})} className={`flex-1 py-5 rounded-2xl font-black text-xs transition-all ${perfInput.edu_status==='참여'?'bg-indigo-600 shadow-lg shadow-indigo-500/20':'bg-slate-800'}`}>참여</button>
          <button disabled={perfInput.is_approved} onClick={()=>setPerfInput({...perfInput, edu_status:'불참'})} className={`flex-1 py-5 rounded-2xl font-black text-xs transition-all ${perfInput.edu_status==='불참'?'bg-rose-600 shadow-lg shadow-rose-500/20':'bg-slate-800'}`}>불참</button>
        </div>
      </div>

      {!perfInput.is_approved ? (
        <button onClick={handleSave} className="w-full bg-black text-white py-7 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all italic tracking-tighter uppercase font-black">Save Monthly Record</button>
      ) : (
        <div className="w-full bg-slate-100 text-slate-400 py-7 rounded-[2.5rem] font-black text-xl text-center border-2 border-dashed italic uppercase tracking-tighter">Approved Monthly Record</div>
      )}
      
      {isToolOpen && <SalesTools onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[11px] border border-slate-200 shadow-sm transition-all hover:bg-black hover:text-white shrink-0 font-black`}>{label}</button> }
function MetricInput({ label, val, onChange, color, disabled }: any) { return <div className="space-y-1 text-center font-black"><label className="text-[9px] text-slate-300 uppercase font-black">{label}</label><input type="number" disabled={disabled} value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl text-center text-xl outline-none transition-all ${color} ${disabled?'opacity-50 font-black':''}`} /></div> }