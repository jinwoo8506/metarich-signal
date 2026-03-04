"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import CalcModal from "./CalcModal"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
    edu_status: "미참여", is_approved: false
  });
  const [globalNotice, setGlobalNotice] = useState("");
  const [eduSchedule, setEduSchedule] = useState("");
  const [isToolOpen, setIsToolOpen] = useState(false);
  
  // [신규] 3개월 평균 데이터 상태
  const [avgTab, setAvgTab] = useState('perf'); // 'perf' or 'act'
  const [avgData, setAvgData] = useState({
    amt: 0, cnt: 0, perAmt: 0, call: 0, meet: 0, pt: 0, intro: 0
  });

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}-01`;

  const LINKS = { metaon: "https://metaon.metarich.co.kr", insu: "#", claim: "#", archive: "#" };

  useEffect(() => { 
    fetchData();
    fetchAvgData();
  }, [monthKey, user.id]);

  async function fetchData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setEduSchedule(settings?.find(s => s.key === 'edu_schedule')?.value || "등록된 교육 일정이 없습니다.");

    const { data: perf } = await supabase.from("daily_perf")
      .select("*").eq("user_id", user.id).eq("date", monthKey).maybeSingle();

    if (perf) setPerfInput(perf);
    else setPerfInput({ 
      call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
      contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
      edu_status: "미참여", is_approved: false 
    });
  }

  // [신규] 3개월 평균 데이터 계산 (선택달 기준 이전 3개월)
  async function fetchAvgData() {
    const dates = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    }

    const { data } = await supabase.from("daily_perf")
      .select("*").eq("user_id", user.id).in("date", dates);

    if (data && data.length > 0) {
      const sum = data.reduce((acc, curr) => ({
        amt: acc.amt + curr.contract_amt,
        cnt: acc.cnt + curr.contract_cnt,
        call: acc.call + curr.call,
        meet: acc.meet + curr.meet,
        pt: acc.pt + curr.pt,
        intro: acc.intro + curr.intro
      }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, intro: 0 });

      const count = data.length;
      setAvgData({
        amt: Math.round(sum.amt / count),
        cnt: Number((sum.cnt / count).toFixed(1)),
        perAmt: sum.cnt > 0 ? Math.round(sum.amt / sum.cnt) : 0,
        call: Math.round(sum.call / count),
        meet: Math.round(sum.meet / count),
        pt: Math.round(sum.pt / count),
        intro: Math.round(sum.intro / count)
      });
    }
  }

  const handleSave = async () => {
    const { error } = await supabase.from("daily_perf").upsert({ 
      ...perfInput, user_id: user.id, date: monthKey
    }, { onConflict: 'user_id, date' });
    if (error) alert("저장 실패: " + error.message);
    else { alert(`${month}월 실적이 업데이트되었습니다.`); fetchData(); }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20 font-black">
      {/* 상단 공지/프로필/퀵링크 - 기존과 동일 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center gap-4 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[12px] italic shrink-0 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5"><div className="absolute whitespace-nowrap animate-marquee text-[14px] text-black italic font-black">{globalNotice}</div></div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2.5rem] border font-black">
        <div className="flex items-center gap-3 shrink-0"><p className="text-[20px] font-black">{user.name} <span className="text-blue-600 italic">AGENT</span></p></div>
        <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar font-black">
          <QuickBtn label="메타온" url={LINKS.metaon} color="bg-slate-50" />
          <QuickBtn label="보험사" url={LINKS.insu} color="bg-slate-50" />
          <QuickBtn label="보험금청구" url={LINKS.claim} color="bg-slate-50" />
          <QuickBtn label="자료실" url={LINKS.archive} color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 실적/활동 입력부 - 기존과 동일 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-black">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 font-black">
          <p className="text-[11px] text-slate-400 uppercase font-black px-2">{month}월 목표 및 실적액</p>
          <div className="flex gap-2 font-black">
            <input type="number" disabled={perfInput.is_approved} value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className="w-1/2 p-4 bg-slate-100 rounded-2xl text-center text-[18px] font-black" />
            <input type="number" value={perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="w-1/2 p-4 bg-indigo-50 text-indigo-600 rounded-2xl text-center text-[18px] font-black border border-indigo-100" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 font-black">
          <p className="text-[11px] text-slate-400 uppercase font-black px-2">{month}월 목표 및 실적건</p>
          <div className="flex gap-2 font-black">
            <input type="number" disabled={perfInput.is_approved} value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className="w-1/2 p-4 bg-slate-100 rounded-2xl text-center text-[18px] font-black" />
            <input type="number" value={perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="w-1/2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-center text-[18px] font-black border border-emerald-100" />
          </div>
        </div>
      </div>

      {/* 활동 수치 입력 */}
      <div className="bg-white p-8 rounded-[2.5rem] border font-black grid grid-cols-3 md:grid-cols-6 gap-3">
        <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
        <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
        <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
        <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
        <MetricInput label="배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
        <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
      </div>

      {/* [신규] 하단 3개월 평균 데이터 탭 */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white font-black shadow-xl">
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
          <button onClick={()=>setAvgTab('perf')} className={`text-[14px] italic font-black ${avgTab==='perf' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/40'}`}>3개월 평균 실적</button>
          <button onClick={()=>setAvgTab('act')} className={`text-[14px] italic font-black ${avgTab==='act' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/40'}`}>3개월 평균 활동</button>
        </div>
        
        {avgTab === 'perf' ? (
          <div className="grid grid-cols-3 gap-4 font-black">
            <AvgBox label="평균 매출" val={`${avgData.amt.toLocaleString()}만`} />
            <AvgBox label="평균 건수" val={`${avgData.cnt}건`} />
            <AvgBox label="건당 매출" val={`${avgData.perAmt.toLocaleString()}만`} />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 font-black">
            <AvgBox label="전화" val={`${avgData.call}회`} />
            <AvgBox label="만남" val={`${avgData.meet}회`} />
            <AvgBox label="제안" val={`${avgData.pt}회`} />
            <AvgBox label="소개" val={`${avgData.intro}회`} />
          </div>
        )}
      </div>

      <button onClick={handleSave} className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black text-[20px] shadow-2xl italic uppercase font-black">Save & Update Record</button>
      {isToolOpen && <CalcModal onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function AvgBox({ label, val }: any) { return <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/10 font-black"><p className="text-[10px] text-white/40 uppercase mb-1 font-black">{label}</p><p className="text-[16px] text-[#d4af37] font-black italic">{val}</p></div> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-5 py-2.5 rounded-xl font-black text-[12px] border shadow-sm shrink-0 font-black`}>{label}</button> }
function MetricInput({ label, val, onChange, color }: any) { return <div className="space-y-1 text-center font-black"><label className="text-[11px] text-slate-400 font-black">{label}</label><input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl text-center text-[18px] font-black outline-none ${color}`} /></div> }