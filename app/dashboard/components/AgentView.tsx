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
  const [historyData, setHistoryData] = useState<any[]>([]); // 3개월 데이터를 저장할 상태

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}-01`;

  const LINKS = { 
    metaon: "https://meta-on.kr/#/login", 
    insu: "#", 
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

  // 최근 3개월 데이터 조회 (실시간 연동용)
  async function fetchHistoryData() {
    const d = new Date(selectedDate);
    const dates = [
      `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-01`,
      `${d.getFullYear()}-${String(d.getMonth() - 1).padStart(2, '0')}-01`,
      `${d.getFullYear()}-${String(d.getMonth() - 2).padStart(2, '0')}-01`
    ];

    const { data } = await supabase.from("daily_perf")
      .select("contract_amt, contract_cnt, call, meet, pt, intro")
      .eq("user_id", user.id)
      .in("date", dates);
    
    if (data) setHistoryData(data);
  }

  // 계산된 평균 데이터 (perfInput이 변경되어도 즉시 반영되도록 useMemo 사용)
  const avgData = useMemo(() => {
    const data = historyData.length > 0 ? historyData : [{ contract_amt: 0, contract_cnt: 0, call: 0, meet: 0, pt: 0, intro: 0 }];
    const sum = data.reduce((acc, curr) => ({
      amt: acc.amt + (curr.contract_amt || 0),
      cnt: acc.cnt + (curr.contract_cnt || 0),
      call: acc.call + (curr.call || 0),
      meet: acc.meet + (curr.meet || 0),
      pt: acc.pt + (curr.pt || 0),
      intro: acc.intro + (curr.intro || 0)
    }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, intro: 0 });

    const count = data.length;
    return {
      amt: Math.round(sum.amt / count),
      cnt: Number((sum.cnt / count).toFixed(1)),
      perAmt: sum.cnt > 0 ? Math.round(sum.amt / sum.cnt) : 0,
      call: Math.round(sum.call / count),
      meet: Math.round(sum.meet / count),
      pt: Math.round(sum.pt / count),
      intro: Math.round(sum.intro / count)
    };
  }, [historyData]);

  const handleSave = async (customField?: object) => {
    const payload = customField ? { ...perfInput, ...customField } : perfInput;
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
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20 font-black p-4 md:p-6">
      <div className="bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center gap-4 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[10px] italic shrink-0 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-[12px] text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2.5rem] border font-black shadow-sm">
        <p className="text-[18px] font-black">{user.name} <span className="text-blue-600 italic">AGENT</span></p>
        <div className="flex w-full md:w-auto overflow-x-auto gap-2 no-scrollbar">
          <QuickBtn label="메타온" url={LINKS.metaon} color="bg-slate-50" />
          <QuickBtn label="보험사" url={LINKS.insu} color="bg-slate-50" />
          <QuickBtn label="자료실" url={LINKS.archive} color="bg-slate-50" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      <div className="flex gap-2 font-black">
        <button onClick={() => setMainTab('input')} className={`flex-1 py-4 rounded-2xl border-2 border-black italic ${mainTab === 'input' ? 'bg-black text-[#d4af37]' : 'bg-white'}`}>PERFORMANCE</button>
        <button onClick={() => setMainTab('edu')} className={`flex-1 py-4 rounded-2xl border-2 border-black italic ${mainTab === 'edu' ? 'bg-black text-[#d4af37]' : 'bg-white'}`}>EDUCATION</button>
      </div>

      {mainTab === 'input' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 font-black">
            <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-1">
              <p className="text-[9px] text-slate-400">목표액 / 실적액</p>
              <div className="flex gap-1">
                <input type="number" value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className="w-1/2 bg-slate-100 rounded-xl text-center font-black" />
                <input type="number" value={perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="w-1/2 bg-indigo-50 text-indigo-600 rounded-xl text-center font-black" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-1">
              <p className="text-[9px] text-slate-400">목표건 / 실적건</p>
              <div className="flex gap-1">
                <input type="number" value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className="w-1/2 bg-slate-100 rounded-xl text-center font-black" />
                <input type="number" value={perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="w-1/2 bg-emerald-50 text-emerald-600 rounded-xl text-center font-black" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-[2.5rem] border font-black grid grid-cols-3 gap-3">
            <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
            <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
            <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
            <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
            <MetricInput label="배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
            <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
          </div>

          <div className="bg-slate-900 p-6 rounded-[2rem] text-white font-black">
            <div className="flex gap-4 mb-4 border-b border-white/10 pb-2">
              <button onClick={()=>setAvgTab('perf')} className={`text-[12px] italic ${avgTab==='perf' ? 'text-[#d4af37]' : 'text-white/40'}`}>3개월 평균 실적</button>
              <button onClick={()=>setAvgTab('act')} className={`text-[12px] italic ${avgTab==='act' ? 'text-[#d4af37]' : 'text-white/40'}`}>3개월 평균 활동</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {avgTab === 'perf' ? (
                <>
                  <AvgBox label="매출" val={`${avgData.amt}만`} />
                  <AvgBox label="건수" val={`${avgData.cnt}건`} />
                  <AvgBox label="건당" val={`${avgData.perAmt}만`} />
                </>
              ) : (
                <>
                  <AvgBox label="전화" val={`${avgData.call}회`} />
                  <AvgBox label="만남" val={`${avgData.meet}회`} />
                  <AvgBox label="제안" val={`${avgData.pt}회`} />
                </>
              )}
            </div>
          </div>
          <button onClick={() => handleSave()} className="w-full bg-black text-white py-5 rounded-2xl font-black italic uppercase">저장하기</button>
        </div>
      )}

      {mainTab === 'edu' && (
        <div className="bg-white p-6 rounded-[2rem] border-2 border-black space-y-4 font-black">
          <h2 className="text-xl italic">Weekly Training</h2>
          {[1, 2, 3, 4, 5].map((w) => {
            const fieldName = `edu_${w}` as keyof typeof perfInput;
            const isChecked = perfInput[fieldName];
            return (
              <div key={w} onClick={() => handleSave({ [fieldName]: !isChecked })} className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${isChecked ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-200'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center italic text-xs ${isChecked ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}>
                  {w === 5 ? "추가" : `${w}W`}
                </div>
                <p className="flex-1 text-sm italic">{eduWeeks[w as keyof typeof eduWeeks] || "내용 없음"}</p>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-rose-300'}`}>✓</div>
              </div>
            );
          })}
        </div>
      )}

      {isToolOpen && <CalcModal onClose={() => setIsToolOpen(false)} />}
    </div>
  )
}

function AvgBox({ label, val }: any) { return <div className="text-center bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[8px] text-white/40 uppercase font-black">{label}</p><p className="text-[13px] text-[#d4af37] font-black italic">{val}</p></div> }
function QuickBtn({ label, url, onClick, color }: any) { return <button onClick={() => url && url !== "#" ? window.open(url, "_blank") : (onClick ? onClick() : null)} className={`${color} px-4 py-2 rounded-xl font-black text-[11px] border shadow-sm shrink-0`}>{label}</button> }
function MetricInput({ label, val, onChange, color }: any) { return <div className="text-center"><label className="text-[9px] text-slate-400 font-black">{label}</label><input type="number" value={val || ''} onChange={e=>onChange(Number(e.target.value))} className={`w-full p-3 bg-slate-100 rounded-xl text-center font-black outline-none ${color}`} /></div> }