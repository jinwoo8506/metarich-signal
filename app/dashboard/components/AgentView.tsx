"use client"

import React, { useEffect, useState, useMemo } from "react"
import { supabase } from "../../../lib/supabase"
import CalcModal from "./CalcModal"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [mainTab, setMainTab] = useState<'input' | 'edu'>('input');
  
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
    edu_status: "미참여", is_approved: false,
    edu_1: false, edu_2: false, edu_3: false, edu_4: false, edu_5: false
  });
  const [globalNotice, setGlobalNotice] = useState("");
  const [eduWeeks, setEduWeeks] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });
  const [isToolOpen, setIsToolOpen] = useState(false);
  const [avgTab, setAvgTab] = useState('perf'); 
  const [historyData, setHistoryData] = useState<any[]>([]);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}-01`;

  const LINKS = { 
    metaon: "https://meta-on.kr/#/login", 
    insu: "https://xn--on3bi2e18htop.com/", 
    claim: "#", 
    archive: "https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" 
  };

  useEffect(() => { 
    fetchData();
    fetchHistoryData();
  }, [monthKey, user.id]);

  async function fetchData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    
    const savedEdu = settings?.find(s => s.key === 'edu_content')?.value;
    if (savedEdu) {
      try { setEduWeeks(JSON.parse(savedEdu)); } catch (e) { setEduWeeks({ 1: savedEdu, 2: "", 3: "", 4: "", 5: "" }); }
    }

    const { data: perf } = await supabase.from("daily_perf")
      .select("*").eq("user_id", user.id).eq("date", monthKey).maybeSingle();

    if (perf) setPerfInput(prev => ({ ...prev, ...perf }));
    else setPerfInput({ 
      call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
      contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
      edu_status: "미참여", is_approved: false,
      edu_1: false, edu_2: false, edu_3: false, edu_4: false, edu_5: false
    });
  }

  async function fetchHistoryData() {
    const d = new Date(selectedDate);
    // 3개월 전 1일부터 현재 달 1일까지의 데이터를 범위로 조회
    const startOfRange = new Date(d.getFullYear(), d.getMonth() - 3, 1);
    const endOfRange = new Date(d.getFullYear(), d.getMonth(), 1);

    const startStr = startOfRange.toISOString().split('T')[0];
    const endStr = endOfRange.toISOString().split('T')[0];

    const { data, error } = await supabase.from("daily_perf")
      .select("contract_amt, contract_cnt, call, meet, pt, intro, db_assigned")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lt("date", endStr);
    
    if (data) setHistoryData(data);
    if (error) console.error("History fetch error:", error);
  }

  const avgData = useMemo(() => {
    if (!historyData || historyData.length === 0) return { amt: 0, cnt: 0, perAmt: 0, call: 0, meet: 0, pt: 0, intro: 0 };
    
    // 범위 데이터를 가져왔으므로 3개월 평균 산출을 위해 3으로 나눔
    const months = 3;
    const sum = historyData.reduce((acc, curr) => ({
      amt: acc.amt + (Number(curr.contract_amt) || 0),
      cnt: acc.cnt + (Number(curr.contract_cnt) || 0),
      call: acc.call + (Number(curr.call) || 0),
      meet: acc.meet + (Number(curr.meet) || 0),
      pt: acc.pt + (Number(curr.pt) || 0),
      intro: acc.intro + (Number(curr.intro) || 0)
    }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, intro: 0 });

    return {
      amt: Math.round(sum.amt / months),
      cnt: Number((sum.cnt / months).toFixed(1)),
      perAmt: sum.cnt > 0 ? Math.round(sum.amt / sum.cnt) : 0,
      call: Math.round(sum.call / months),
      meet: Math.round(sum.meet / months),
      pt: Math.round(sum.pt / months),
      intro: Math.round(sum.intro / months)
    };
  }, [historyData]);

  const handleSave = async (customField?: object) => {
    const rawPayload = customField ? { ...perfInput, ...customField } : perfInput;
    
    const payload = {
      ...rawPayload,
      call: Number(rawPayload.call || 0),
      meet: Number(rawPayload.meet || 0),
      pt: Number(rawPayload.pt || 0),
      intro: Number(rawPayload.intro || 0),
      db_assigned: Number(rawPayload.db_assigned || 0),
      db_returned: Number(rawPayload.db_returned || 0),
      contract_cnt: Number(rawPayload.contract_cnt || 0),
      contract_amt: Number(rawPayload.contract_amt || 0),
      target_cnt: Number(rawPayload.target_cnt || 0),
      target_amt: Number(rawPayload.target_amt || 0)
    };

    const { error } = await supabase.from("daily_perf").upsert({ 
      ...payload, user_id: user.id, date: monthKey
    }, { onConflict: 'user_id, date' });
    
    if (error) alert("저장 실패: " + error.message);
    else { 
      if(!customField) alert(`${month}월 실적이 업데이트되었습니다.`); 
      fetchData(); 
      fetchHistoryData();
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20 font-black">
      {/* 전광판 공지 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center gap-4 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[12px] italic shrink-0 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-[14px] text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      {/* 헤더 및 퀵링크 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2.5rem] border font-black">
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-[20px] font-black">{user.name} <span className="text-blue-600 italic">AGENT</span></p>
        </div>
        <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar font-black w-full md:w-auto justify-center">
          <QuickBtn label="메타온" url={LINKS.metaon} color="bg-slate-50" className="hidden md:block" />
          <QuickBtn label="보험사" url={LINKS.insu} color="bg-slate-50" className="hidden md:block" />
          <QuickBtn label="자료실" url={LINKS.archive} color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 탭 전환 */}
      <div className="flex gap-2 font-black">
        <button onClick={() => setMainTab('input')} className={`flex-1 py-4 rounded-2xl border-2 border-black italic transition-all ${mainTab === 'input' ? 'bg-black text-[#d4af37]' : 'bg-white text-black opacity-40'}`}>PERFORMANCE</button>
        <button onClick={() => setMainTab('edu')} className={`flex-1 py-4 rounded-2xl border-2 border-black italic transition-all ${mainTab === 'edu' ? 'bg-black text-[#d4af37]' : 'bg-white text-black opacity-40'}`}>EDUCATION</button>
      </div>

      {mainTab === 'input' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-black">
            <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 font-black">
              <p className="text-[11px] text-slate-400 uppercase font-black px-2">{month}월 목표 및 실적액(만)</p>
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

          <div className="bg-white p-8 rounded-[2.5rem] border font-black grid grid-cols-3 md:grid-cols-6 gap-3">
            <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
            <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
            <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
            <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
            <MetricInput label="배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
            <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
          </div>

          <div className="bg-slate-900 p-6 md:p-8 rounded-[3rem] text-white font-black shadow-xl">
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
              <button onClick={()=>setAvgTab('perf')} className={`text-[14px] italic font-black transition-all ${avgTab==='perf' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/40'}`}>3개월 평균 실적</button>
              <button onClick={()=>setAvgTab('act')} className={`text-[14px] italic font-black transition-all ${avgTab==='act' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/40'}`}>3개월 평균 활동</button>
            </div>
            {avgTab === 'perf' ? (
              <div className="grid grid-cols-3 gap-3 md:gap-4 font-black">
                <AvgBox label="평균 매출" val={`${avgData.amt.toLocaleString()}만`} />
                <AvgBox label="평균 건수" val={`${avgData.cnt}건`} />
                <AvgBox label="건당 매출" val={`${avgData.perAmt.toLocaleString()}만`} />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 font-black">
                <AvgBox label="전화" val={`${avgData.call}회`} />
                <AvgBox label="만남" val={`${avgData.meet}회`} />
                <AvgBox label="제안" val={`${avgData.pt}회`} />
                <AvgBox label="소개" val={`${avgData.intro}회`} />
              </div>
            )}
          </div>

          <button onClick={() => handleSave()} className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black text-[20px] shadow-2xl italic uppercase hover:bg-slate-800 transition-colors">Save & Update Record</button>
        </div>
      )}

      {mainTab === 'edu' && (
        <div className="bg-white p-6 md:p-10 rounded-[3rem] border-4 border-black shadow-2xl space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300 font-black">
          <div className="flex justify-between items-center border-b-8 border-black pb-4">
            <h2 className="text-2xl md:text-3xl italic uppercase font-black">Weekly Training</h2>
          </div>
          <div className="bg-slate-50 p-4 md:p-10 rounded-[2.5rem] border-2 border-dashed border-slate-300 font-black space-y-4">
            <p className="text-[10px] md:text-xs text-slate-400 uppercase mb-2 tracking-widest font-black italic">Weekly Curriculum (Click to check)</p>
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {[1, 2, 3, 4, 5].map((w) => {
                const fieldName = `edu_${w}` as keyof typeof perfInput;
                const isChecked = perfInput[fieldName];
                return (
                  <div key={w} onClick={() => handleSave({ [fieldName]: !isChecked })} className={`flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] ${isChecked ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-200'}`}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 italic text-xs md:text-sm font-black transition-colors ${isChecked ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}>
                      {w === 5 ? "추가" : `${w}W`}
                    </div>
                    <p className={`flex-1 text-[15px] md:text-lg italic font-black leading-snug transition-colors break-keep ${isChecked ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {eduWeeks[w as keyof typeof eduWeeks] || "등록된 교육 내용이 없습니다."}
                    </p>
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-rose-300 text-transparent'}`}>✓</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isToolOpen && <CalcModal onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function AvgBox({ label, val }: any) { 
  return (
    <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/10 font-black flex flex-col justify-center items-center min-h-[80px]">
      <p className="text-[10px] text-white/40 uppercase mb-1 font-black">{label}</p>
      <p className="text-[16px] text-[#d4af37] font-black italic leading-tight">{val}</p>
    </div>
  ) 
}

function QuickBtn({ label, url, onClick, color, className }: any) { 
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (url && url !== "#") {
      window.open(url, "_blank");
    }
  };

  return (
    <button 
      onClick={handleClick} 
      className={`${color} ${className || ""} px-4 md:px-5 py-2.5 rounded-xl font-black text-[11px] md:text-[12px] border shadow-sm shrink-0 transition-transform active:scale-95`}
    >
      {label}
    </button> 
  )
}

function MetricInput({ label, val, onChange, color }: any) { 
  return (
    <div className="space-y-1 text-center font-black">
      <label className="text-[11px] text-slate-400 font-black">{label}</label>
      <input 
        type="number" 
        inputMode="numeric"
        value={val === 0 ? '' : val} 
        placeholder="0"
        onChange={e=>onChange(Number(e.target.value))} 
        className={`w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl text-center text-[16px] md:text-[18px] font-black outline-none transition-all ${color}`} 
      />
    </div>
  ) 
}