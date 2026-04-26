"use client"

import React, { useEffect, useState, useMemo } from "react"
import { supabase } from "../../../lib/supabase"
import CustomerManagerModal from "./CustomerManagerModal"

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
  const [isCustOpen, setIsCustOpen] = useState(false); 
  const [avgTab, setAvgTab] = useState<'perf' | 'act'>('perf'); 
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [viewDetail, setViewDetail] = useState<any>(null);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}-01`;

  const LINKS = { 
    metaon: "https://meta-on.kr/#/login", 
    insu: "https://xn--on3bi2e18htop.com/", 
    archive: "https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" 
  };

  const handleGoogleSync = async (customers: any[]) => {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbxQVSM9jB0lubHWSEBNUcRT_OFwU4QS9AOjNOzQwPjW9FOif3izSVWxOwuXpUXhGZ0IEQ/exec";
    if (customers.length === 0) return alert("전송할 데이터가 없습니다.");

    const mappedData = customers.map(c => ({
      name: c.name || "", phone: c.phone || "", contract_date: c.contract_date || "",
      payment_day: c.payment_day || "", birth: c.birth || "", family: c.family || "",
      etc1: "", relation: "", status: c.status || "유지", monthly_pay: c.monthly_pay || 0,
      insu_company: c.insu_company || "", gift: c.gift || "", contract_type: c.contract_type || "체결"
    }));

    try {
      await fetch(GAS_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mappedData) });
      alert(`🚀 성공! ${customers.length}명의 고객 데이터를 구글 시트에 기록했습니다.`);
      setIsCustOpen(false);
    } catch (error) {
      console.error("Sync Error:", error);
      alert("전송 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => { 
    fetchData();
    fetchAllHistory();
  }, [monthKey, user.id]);

  async function fetchData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    const savedEdu = settings?.find(s => s.key === 'edu_content')?.value;
    if (savedEdu) {
      try { setEduWeeks(JSON.parse(savedEdu)); } catch (e) { setEduWeeks({ 1: savedEdu, 2: "", 3: "", 4: "", 5: "" }); }
    }
    const { data: perf } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", monthKey).maybeSingle();
    if (perf) setPerfInput(prev => ({ ...prev, ...perf }));
    else setPerfInput({ 
      call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
      contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
      edu_status: "미참여", is_approved: false,
      edu_1: false, edu_2: false, edu_3: false, edu_4: false, edu_5: false
    });
  }

  async function fetchAllHistory() {
    const { data } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).order('date', { ascending: false });
    if (data) setHistoryData(data);
  }

  const avgData = useMemo(() => {
    const d = new Date(selectedDate);
    const startRange = new Date(d.getFullYear(), d.getMonth() - 2, 1); 
    const endRange = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const filtered = historyData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startRange && itemDate < endRange;
    });
    if (filtered.length === 0) return { amt: 0, cnt: 0, perAmt: 0, call: 0, meet: 0, pt: 0, intro: 0 };
    const sum = filtered.reduce((acc, curr) => ({
      amt: acc.amt + (Number(curr.contract_amt) || 0),
      cnt: acc.cnt + (Number(curr.contract_cnt) || 0),
      call: acc.call + (Number(curr.call) || 0),
      meet: acc.meet + (Number(curr.meet) || 0),
      pt: acc.pt + (Number(curr.pt) || 0),
      intro: acc.intro + (Number(curr.intro) || 0)
    }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, intro: 0 });
    const divisor = filtered.length;
    return {
      amt: Math.round(sum.amt / divisor),
      cnt: Number((sum.cnt / divisor).toFixed(1)),
      perAmt: sum.cnt > 0 ? Math.round(sum.amt / sum.cnt) : 0,
      call: Math.round(sum.call / divisor),
      meet: Math.round(sum.meet / divisor),
      pt: Math.round(sum.pt / divisor),
      intro: Math.round(sum.intro / divisor)
    };
  }, [historyData, selectedDate]);

  const records = useMemo(() => {
    if (historyData.length === 0) return { best: null, worst: null };
    const activeMonths = historyData.filter(item => {
      const hasPerf = (Number(item.contract_amt) || 0) > 0 || (Number(item.contract_cnt) || 0) > 0;
      const hasActivity = (Number(item.call) || 0) > 0 || (Number(item.meet) || 0) > 0 || (Number(item.pt) || 0) > 0 || (Number(item.intro) || 0) > 0;
      return hasPerf || hasActivity;
    });
    if (activeMonths.length === 0) return { best: null, worst: null };
    const bestSorted = [...activeMonths].sort((a, b) => (Number(b.contract_amt) || 0) - (Number(a.contract_amt) || 0));
    const worstSorted = [...activeMonths].sort((a, b) => (Number(a.contract_amt) || 0) - (Number(b.contract_amt) || 0));
    return { best: bestSorted[0], worst: worstSorted[0] };
  }, [historyData]);

  const calculateRate = (current: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.round((current / target) * 100);
  };

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
    const { error } = await supabase.from("daily_perf").upsert({ ...payload, user_id: user.id, date: monthKey }, { onConflict: 'user_id, date' });
    if (error) alert("저장 실패: " + error.message);
    else { 
      if(!customField) alert(`${month}월 실적이 업데이트되었습니다.`); 
      await fetchData(); 
      await fetchAllHistory();
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 pb-20 font-sans text-slate-900">
      {/* 🔴 상단 공지 애니메이션 */}
      <div className="bg-blue-600 p-4 rounded-3xl flex items-center gap-4 overflow-hidden shadow-lg shadow-blue-600/20">
        <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-[11px] font-bold shrink-0">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-[14px] text-white font-medium">{globalNotice}</div>
        </div>
      </div>

      {/* 🟠 프로필 및 퀵링크 섹션 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">👤</div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">{user.department_name || "미소속"} {user.branch_name || "지점미지정"}</p>
            <h2 className="text-xl md:text-2xl font-bold">{user.name} <span className="text-blue-600 text-sm md:text-base ml-1">Agent</span></h2>
          </div>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto justify-center">
          <QuickBtn label="메타온" url={LINKS.metaon} color="bg-slate-50 text-slate-600" />
          <QuickBtn label="보험사" url={LINKS.insu} color="bg-slate-50 text-slate-600" />
          <QuickBtn label="자료실" url={LINKS.archive} color="bg-slate-50 text-slate-600" />
          <QuickBtn label="고객관리" onClick={() => setIsCustOpen(true)} color="bg-blue-600 text-white border-none shadow-md shadow-blue-600/20" />
        </div>
      </div>

      {/* 🟡 메인 탭 전환 */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
        <button onClick={() => setMainTab('input')} className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all ${mainTab === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>실적 입력</button>
        <button onClick={() => setMainTab('edu')} className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all ${mainTab === 'edu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>교육 참여</button>
      </div>

      {mainTab === 'input' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* 실적 입력 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">{month}월 매출 목표 대비</p>
                  <p className="text-3xl font-bold text-slate-900">{calculateRate(perfInput.contract_amt, perfInput.target_amt)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-300 font-bold mb-1">GOAL / CURRENT</p>
                  <div className="flex items-center gap-2 font-bold text-slate-400">
                    <input type="number" disabled={perfInput.is_approved} value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className="w-16 bg-slate-50 p-1 rounded text-center outline-none focus:bg-slate-100" />
                    <span>/</span>
                    <span className="text-blue-600">{perfInput.contract_amt}</span>
                  </div>
                </div>
              </div>
              <ProgressBar rate={calculateRate(perfInput.contract_amt, perfInput.target_amt)} />
              <div className="flex gap-3">
                <input type="number" placeholder="금액 입력" value={perfInput.contract_amt === 0 ? '' : perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-lg font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">{month}월 계약 건수 대비</p>
                  <p className="text-3xl font-bold text-slate-900">{calculateRate(perfInput.contract_cnt, perfInput.target_cnt)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-300 font-bold mb-1">GOAL / CURRENT</p>
                  <div className="flex items-center gap-2 font-bold text-slate-400">
                    <input type="number" disabled={perfInput.is_approved} value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className="w-16 bg-slate-50 p-1 rounded text-center outline-none focus:bg-slate-100" />
                    <span>/</span>
                    <span className="text-emerald-600">{perfInput.contract_cnt}</span>
                  </div>
                </div>
              </div>
              <ProgressBar rate={calculateRate(perfInput.contract_cnt, perfInput.target_cnt)} />
              <div className="flex gap-3">
                <input type="number" placeholder="건수 입력" value={perfInput.contract_cnt === 0 ? '' : perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-lg font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all" />
              </div>
            </div>
          </div>

          {/* 지표 상세 입력 */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase mb-6 text-center tracking-widest">Activity Detail Input</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
              <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
              <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
              <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
              <MetricInput label="배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
              <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
            </div>
          </div>

          {/* 3개월 통계 및 기록 */}
          <div className="bg-slate-900 p-8 md:p-10 rounded-[3rem] text-white shadow-xl space-y-10">
            <div>
              <div className="flex gap-6 mb-8 border-b border-white/10 pb-4">
                <button onClick={()=>setAvgTab('perf')} className={`text-sm font-bold transition-all ${avgTab==='perf' ? 'text-blue-400 border-b-2 border-blue-400 pb-4 -mb-[18px]' : 'text-white/40'}`}>3개월 평균 실적</button>
                <button onClick={()=>setAvgTab('act')} className={`text-sm font-bold transition-all ${avgTab==='act' ? 'text-blue-400 border-b-2 border-blue-400 pb-4 -mb-[18px]' : 'text-white/40'}`}>3개월 평균 활동</button>
              </div>
              {avgTab === 'perf' ? (
                <div className="grid grid-cols-3 gap-4">
                  <AvgBox label="평균 매출" val={`${avgData.amt.toLocaleString()}만`} />
                  <AvgBox label="평균 건수" val={`${avgData.cnt}건`} />
                  <AvgBox label="건당 매출" val={`${avgData.perAmt.toLocaleString()}만`} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <AvgBox label="전화" val={`${avgData.call}회`} />
                  <AvgBox label="만남" val={`${avgData.meet}회`} />
                  <AvgBox label="제안" val={`${avgData.pt}회`} />
                  <AvgBox label="소개" val={`${avgData.intro}회`} />
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-white/10">
              <p className="text-[11px] text-white/30 font-bold uppercase mb-6 tracking-widest">Personal Records (All Time)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => setViewDetail(records.best)} className={`p-6 rounded-3xl border transition-all cursor-pointer group ${viewDetail?.date === records.best?.date ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className="text-[10px] text-blue-400 font-bold uppercase mb-2">🏆 Best Month</p>
                  <p className="text-2xl font-bold">{records.best ? `${new Date(records.best.date).getFullYear()}년 ${new Date(records.best.date).getMonth() + 1}월` : '-'}</p>
                  <p className="text-sm opacity-50">{records.best ? `${records.best.contract_amt.toLocaleString()}만원 달성` : '데이터 없음'}</p>
                </div>
                <div onClick={() => setViewDetail(records.worst)} className={`p-6 rounded-3xl border transition-all cursor-pointer group ${viewDetail?.date === records.worst?.date ? 'bg-rose-600 border-rose-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className="text-[10px] text-rose-400 font-bold uppercase mb-2">📉 Low Month</p>
                  <p className="text-2xl font-bold">{records.worst ? `${new Date(records.worst.date).getFullYear()}년 ${new Date(records.worst.date).getMonth() + 1}월` : '-'}</p>
                  <p className="text-sm opacity-50">{records.worst ? `${records.worst.contract_amt.toLocaleString()}만원 달성` : '데이터 없음'}</p>
                </div>
              </div>

              {viewDetail && (
                <div className="mt-6 p-8 bg-white/5 rounded-[2.5rem] border border-white/10 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                    <p className="text-lg font-bold text-blue-400">{new Date(viewDetail.date).getFullYear()}년 {new Date(viewDetail.date).getMonth() + 1}월 상세 리포트</p>
                    <button onClick={() => setViewDetail(null)} className="text-xs text-white/40 hover:text-white transition-colors">닫기</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <DetailBox label="매출액" val={`${viewDetail.contract_amt.toLocaleString()}만`} color="text-blue-400" />
                    <DetailBox label="계약건" val={`${viewDetail.contract_cnt}건`} color="text-emerald-400" />
                    <DetailBox label="전화" val={`${viewDetail.call}회`} />
                    <DetailBox label="만남" val={`${viewDetail.meet}회`} />
                    <DetailBox label="제안" val={`${viewDetail.pt}회`} />
                    <DetailBox label="소개" val={`${viewDetail.intro}회`} />
                    <DetailBox label="DB배정" val={`${viewDetail.db_assigned}개`} />
                    <DetailBox label="DB반품" val={`${viewDetail.db_returned}개`} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => handleSave()} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-bold text-xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95">실적 데이터 업데이트</button>
        </div>
      )}

      {mainTab === 'edu' && (
        <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Weekly Training</h2>
            <p className="text-sm text-slate-400">주차별 교육 참여 현황을 체크해 주세요.</p>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((w) => {
              const fieldName = `edu_${w}` as keyof typeof perfInput;
              const isChecked = perfInput[fieldName];
              return (
                <div key={w} onClick={() => handleSave({ [fieldName]: !isChecked })} className={`flex items-center gap-6 p-6 rounded-3xl border-2 transition-all cursor-pointer group ${isChecked ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${isChecked ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white text-slate-400'}`}>
                    {w === 5 ? "추가" : `${w}W`}
                  </div>
                  <p className={`flex-1 text-lg font-bold ${isChecked ? 'text-blue-900' : 'text-slate-600'}`}>
                    {eduWeeks[w as keyof typeof eduWeeks] || "등록된 교육 내용이 없습니다."}
                  </p>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-transparent'}`}>✓</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCustOpen && (
        <CustomerManagerModal onClose={() => setIsCustOpen(false)} onSaveToGoogle={handleGoogleSync} />
      )}
    </div>
  )
}

/** 하위 컴포넌트 **/
function ProgressBar({ rate }: { rate: number }) {
  const color = rate >= 100 ? "bg-blue-600" : (rate >= 70 ? "bg-emerald-500" : (rate >= 40 ? "bg-amber-400" : "bg-rose-500"));
  return (
    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
      <div className={`${color} h-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function DetailBox({ label, val, color = "text-white" }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
      <p className="text-[10px] text-white/30 font-bold uppercase mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{val}</p>
    </div>
  )
}

function AvgBox({ label, val }: any) { 
  return (
    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
      <p className="text-[11px] text-white/30 font-bold uppercase mb-2">{label}</p>
      <p className="text-xl font-bold text-blue-400">{val}</p>
    </div>
  ) 
}

function QuickBtn({ label, url, onClick, color }: any) { 
  const handleClick = () => { if (onClick) onClick(); else if (url) window.open(url, "_blank"); };
  return (
    <button onClick={handleClick} className={`${color} px-5 py-2.5 rounded-xl font-bold text-xs transition-all hover:scale-105 active:scale-95`}>
      {label}
    </button> 
  )
}

function MetricInput({ label, val, onChange, color }: any) { 
  return (
    <div className="space-y-2 text-center">
      <label className="text-[11px] text-slate-400 font-bold uppercase">{label}</label>
      <input type="number" value={val === 0 ? '' : val} placeholder="0" onChange={e=>onChange(Number(e.target.value))} className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-lg font-bold outline-none focus:border-blue-500 focus:bg-white transition-all ${color}`} />
    </div>
  ) 
}
