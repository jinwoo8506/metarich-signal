"use client"

import React, { useEffect, useState, useMemo } from "react"
import { supabase } from "../../../lib/supabase"
import CalcModal from "./CalcModal"
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
  const [avgTab, setAvgTab] = useState('perf'); 
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [viewDetail, setViewDetail] = useState<any>(null);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}-01`;

  const LINKS = { 
    metaon: "https://meta-on.kr/#/login", 
    insu: "https://xn--on3bi2e18htop.com/", 
    claim: "#", 
    archive: "https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" 
  };

  // 구글 시트 동기화 로직
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

  // 3개월 평균 데이터 계산
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

  // 기네스(Best) 및 최저실적(Worst) 계산 (활동 기록이 있는 달 기준)
  const records = useMemo(() => {
    if (historyData.length === 0) return { best: null, worst: null };

    // '유효한 활동'이 있는 데이터만 필터링 (매출이 0이라도 활동 데이터가 있으면 최저 실적 후보)
    const activeMonths = historyData.filter(item => {
      const hasPerf = (Number(item.contract_amt) || 0) > 0 || (Number(item.contract_cnt) || 0) > 0;
      const hasActivity = (Number(item.call) || 0) > 0 || 
                          (Number(item.meet) || 0) > 0 || 
                          (Number(item.pt) || 0) > 0 || 
                          (Number(item.intro) || 0) > 0 ||
                          (Number(item.db_assigned) || 0) > 0 ||
                          (Number(item.db_returned) || 0) > 0;
      return hasPerf || hasActivity;
    });
    
    if (activeMonths.length === 0) return { best: null, worst: null };

    // 기네스(Best): 매출 높은 순 -> 같으면 최신순
    const bestSorted = [...activeMonths].sort((a, b) => {
      const amtDiff = (Number(b.contract_amt) || 0) - (Number(a.contract_amt) || 0);
      if (amtDiff !== 0) return amtDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // 최저(Worst): 매출 낮은 순 -> 같으면 과거순
    const worstSorted = [...activeMonths].sort((a, b) => {
      const amtDiff = (Number(a.contract_amt) || 0) - (Number(b.contract_amt) || 0);
      if (amtDiff !== 0) return amtDiff;
      // 매출액이 같을 경우(예: 둘 다 0원), 과거 데이터를 우선적으로 '최저'로 표기하여 데이터 정합성 유지
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return { 
      best: bestSorted[0], 
      worst: worstSorted[0] 
    };
  }, [historyData]);

  // 달성률 계산 헬퍼
  const calculateRate = (current: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.round((current / target) * 100);
  };

  const handleSave = async (customField?: object) => {
    const rawPayload = customField ? { ...perfInput, ...customField } : perfInput;
    const payload = {
      ...rawPayload,
      call: Number(rawPayload.call || 0), meet: Number(rawPayload.meet || 0),
      pt: Number(rawPayload.pt || 0), intro: Number(rawPayload.intro || 0),
      db_assigned: Number(rawPayload.db_assigned || 0), db_returned: Number(rawPayload.db_returned || 0),
      contract_cnt: Number(rawPayload.contract_cnt || 0), contract_amt: Number(rawPayload.contract_amt || 0),
      target_cnt: Number(rawPayload.target_cnt || 0), target_amt: Number(rawPayload.target_amt || 0)
    };
    const { error } = await supabase.from("daily_perf").upsert({ ...payload, user_id: user.id, date: monthKey }, { onConflict: 'user_id, date' });
    if (error) alert("저장 실패: " + error.message);
    else { 
      if(!customField) alert(`${month}월 실적이 업데이트되었습니다.`); 
      await fetchData(); await fetchAllHistory();
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20 font-black">
      {/* 상단 공지 */}
      <div className="bg-[#d4af37] p-4 rounded-3xl border-2 border-black flex items-center gap-4 overflow-hidden font-black">
        <span className="bg-black text-[#d4af37] px-3 py-1 rounded-full text-[12px] italic shrink-0 font-black">NOTICE</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-[14px] text-black italic font-black">{globalNotice}</div>
        </div>
      </div>

      {/* 헤더/퀵링크 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2.5rem] border font-black">
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-[20px] font-black">{user.name} <span className="text-blue-600 italic">AGENT</span></p>
        </div>
        <div className="flex flex-nowrap overflow-x-auto gap-2 no-scrollbar font-black w-full md:w-auto justify-center">
          <QuickBtn label="메타온" url={LINKS.metaon} color="bg-slate-50" className="hidden md:block" />
          <QuickBtn label="보험사" url={LINKS.insu} color="bg-slate-50" className="hidden md:block" />
          <QuickBtn label="자료실" url={LINKS.archive} color="bg-slate-50" />
          <QuickBtn label="고객관리" onClick={() => setIsCustOpen(true)} color="bg-emerald-600 text-white border-none" />
          <QuickBtn label="영업도구" onClick={() => setIsToolOpen(true)} color="bg-black text-[#d4af37]" />
        </div>
      </div>

      {/* 메인 탭 */}
      <div className="flex gap-2 font-black">
        <button onClick={() => setMainTab('input')} className={`flex-1 py-4 rounded-2xl border-2 border-black italic transition-all ${mainTab === 'input' ? 'bg-black text-[#d4af37]' : 'bg-white text-black opacity-40'}`}>PERFORMANCE</button>
        <button onClick={() => setMainTab('edu')} className={`flex-1 py-4 rounded-2xl border-2 border-black italic transition-all ${mainTab === 'edu' ? 'bg-black text-[#d4af37]' : 'bg-white text-black opacity-40'}`}>EDUCATION</button>
      </div>

      {mainTab === 'input' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-black">
            {/* 실적액 입력 & 달성률 */}
            <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 font-black text-black">
              <div className="flex justify-between items-end px-2">
                <p className="text-[11px] text-slate-400 uppercase font-black">{month}월 목표 및 실적액(만)</p>
                <p className={`text-3xl italic ${getRateStyles(calculateRate(perfInput.contract_amt, perfInput.target_amt)).text}`}>
                  {calculateRate(perfInput.contract_amt, perfInput.target_amt)}%
                </p>
              </div>
              <div className="flex gap-2 font-black">
                <input type="number" disabled={perfInput.is_approved} value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className="w-1/2 p-4 bg-slate-100 rounded-2xl text-center text-[18px] font-black outline-none" />
                <input type="number" value={perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="w-1/2 p-4 bg-indigo-50 text-indigo-600 rounded-2xl text-center text-[18px] font-black border border-indigo-100 outline-none" />
              </div>
              <ProgressBar rate={calculateRate(perfInput.contract_amt, perfInput.target_amt)} />
            </div>

            {/* 실적건 입력 & 달성률 */}
            <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 font-black text-black">
              <div className="flex justify-between items-end px-2">
                <p className="text-[11px] text-slate-400 uppercase font-black">{month}월 목표 및 실적건</p>
                <p className={`text-3xl italic ${getRateStyles(calculateRate(perfInput.contract_cnt, perfInput.target_cnt)).text}`}>
                  {calculateRate(perfInput.contract_cnt, perfInput.target_cnt)}%
                </p>
              </div>
              <div className="flex gap-2 font-black">
                <input type="number" disabled={perfInput.is_approved} value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className="w-1/2 p-4 bg-slate-100 rounded-2xl text-center text-[18px] font-black outline-none" />
                <input type="number" value={perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="w-1/2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-center text-[18px] font-black border border-emerald-100 outline-none" />
              </div>
              <ProgressBar rate={calculateRate(perfInput.contract_cnt, perfInput.target_cnt)} />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border font-black grid grid-cols-3 md:grid-cols-6 gap-3 text-black">
            <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
            <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
            <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
            <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
            <MetricInput label="배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
            <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
          </div>

          <div className="bg-slate-900 p-6 md:p-8 rounded-[3rem] text-white font-black shadow-xl space-y-8">
            <div>
              <div className="flex gap-4 mb-6 border-b border-white/10 pb-4 font-black">
                <button onClick={()=>setAvgTab('perf')} className={`text-[14px] italic font-black transition-all ${avgTab==='perf' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/40'}`}>3개월 평균 실적</button>
                <button onClick={()=>setAvgTab('act')} className={`text-[14px] italic font-black transition-all ${avgTab==='act' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-white/40'}`}>3개월 평균 활동</button>
              </div>
              {avgTab === 'perf' ? (
                <div className="grid grid-cols-3 gap-3 md:gap-4 font-black text-center">
                  <AvgBox label="평균 매출" val={`${avgData.amt.toLocaleString()}만`} />
                  <AvgBox label="평균 건수" val={`${avgData.cnt}건`} />
                  <AvgBox label="건당 매출" val={`${avgData.perAmt.toLocaleString()}만`} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 font-black text-center">
                  <AvgBox label="전화" val={`${avgData.call}회`} />
                  <AvgBox label="만남" val={`${avgData.meet}회`} />
                  <AvgBox label="제안" val={`${avgData.pt}회`} />
                  <AvgBox label="소개" val={`${avgData.intro}회`} />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 font-black">
              <p className="text-[12px] italic text-white/40 mb-4 uppercase tracking-widest font-black">Personal Records (All Time)</p>
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setViewDetail(records.best)} className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${viewDetail?.date === records.best?.date ? 'bg-[#d4af37] border-white' : 'bg-white/5 border-white/10'}`}>
                  <p className={`text-[10px] mb-1 uppercase font-black ${viewDetail?.date === records.best?.date ? 'text-black' : 'text-[#d4af37]'}`}>🏆 GUINNESS</p>
                  <p className={`text-[18px] font-black italic ${viewDetail?.date === records.best?.date ? 'text-black' : 'text-white'}`}>{records.best ? `${new Date(records.best.date).getFullYear()}년 ${new Date(records.best.date).getMonth() + 1}월` : '-'}</p>
                  <p className={`text-[12px] opacity-60 font-black ${viewDetail?.date === records.best?.date ? 'text-black' : 'text-white'}`}>{records.best ? `${records.best.contract_amt.toLocaleString()}만` : '데이터 없음'}</p>
                </div>
                <div onClick={() => setViewDetail(records.worst)} className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${viewDetail?.date === records.worst?.date ? 'bg-rose-500 border-white' : 'bg-white/5 border-white/10'}`}>
                  <p className={`text-[10px] mb-1 uppercase font-black ${viewDetail?.date === records.worst?.date ? 'text-black' : 'text-rose-400'}`}>📉 LOWEST</p>
                  <p className={`text-[18px] font-black italic ${viewDetail?.date === records.worst?.date ? 'text-black' : 'text-white'}`}>{records.worst ? `${new Date(records.worst.date).getFullYear()}년 ${new Date(records.worst.date).getMonth() + 1}월` : '-'}</p>
                  <p className={`text-[12px] opacity-60 font-black ${viewDetail?.date === records.worst?.date ? 'text-black' : 'text-white'}`}>{records.worst ? `${records.worst.contract_amt.toLocaleString()}만` : '데이터 없음'}</p>
                </div>
              </div>

              {viewDetail && (
                <div className="mt-6 p-6 bg-white/10 rounded-[2.5rem] border border-white/20 animate-in fade-in zoom-in duration-300 font-black">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-[14px] font-black italic text-[#d4af37] underline underline-offset-4 tracking-tighter">{new Date(viewDetail.date).getFullYear()}년 {new Date(viewDetail.date).getMonth() + 1}월 정밀 레포트</p>
                    <button onClick={() => setViewDetail(null)} className="text-[10px] opacity-40 uppercase bg-black px-3 py-1 rounded-full border border-white/20">Close</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <DetailBox label="매출액" val={`${viewDetail.contract_amt.toLocaleString()}만`} color="text-[#d4af37]" />
                    <DetailBox label="계약건" val={`${viewDetail.contract_cnt}건`} color="text-[#d4af37]" />
                    <DetailBox label="전화" val={`${viewDetail.call}회`} />
                    <DetailBox label="만남" val={`${viewDetail.meet}회`} />
                    <DetailBox label="제안" val={`${viewDetail.pt}회`} />
                    <DetailBox label="소개" val={`${viewDetail.intro}회`} />
                    <DetailBox label="DB배정" val={`${viewDetail.db_assigned}개`} color="text-blue-400" />
                    <DetailBox label="DB반품" val={`${viewDetail.db_returned}개`} color="text-rose-400" />
                  </div>
                  <div className="mt-6 p-4 bg-black/40 rounded-2xl border border-white/5">
                    <p className="text-[11px] text-white/70 leading-relaxed italic break-keep font-black">
                      💡 {new Date(viewDetail.date).getMonth() + 1}월 복기: <br/>
                      <span className="text-white">{viewDetail.call}회</span>의 콜과 <span className="text-white">{viewDetail.meet}번</span>의 미팅으로 <span className="text-[#d4af37]">{viewDetail.contract_amt.toLocaleString()}만원</span> 달성!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => handleSave()} className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black text-[20px] shadow-2xl italic uppercase hover:bg-slate-800 transition-colors">Save & Update Record</button>
        </div>
      )}

      {mainTab === 'edu' && (
        <div className="bg-white p-6 md:p-10 rounded-[3rem] border-4 border-black shadow-2xl space-y-6 animate-in slide-in-from-right-4 duration-300 font-black text-black">
          <div className="flex justify-between items-center border-b-8 border-black pb-4">
            <h2 className="text-2xl md:text-3xl italic uppercase font-black">Weekly Training</h2>
          </div>
          <div className="bg-slate-50 p-4 md:p-10 rounded-[2.5rem] border-2 border-dashed border-slate-300 font-black space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3, 4, 5].map((w) => {
                const fieldName = `edu_${w}` as keyof typeof perfInput;
                const isChecked = perfInput[fieldName];
                return (
                  <div key={w} onClick={() => handleSave({ [fieldName]: !isChecked })} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] ${isChecked ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-200'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 italic text-sm font-black ${isChecked ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'}`}>
                      {w === 5 ? "추가" : `${w}W`}
                    </div>
                    <p className={`flex-1 text-lg italic font-black leading-snug break-keep ${isChecked ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {eduWeeks[w as keyof typeof eduWeeks] || "등록된 교육 내용이 없습니다."}
                    </p>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-rose-300 text-transparent'}`}>✓</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isToolOpen && <CalcModal onClose={() => setIsToolOpen(false)} />}
      {isCustOpen && (
        <CustomerManagerModal onClose={() => setIsCustOpen(false)} onSaveToGoogle={handleGoogleSync} />
      )}
    </div>
  )
}

/** 하위 컴포넌트 및 헬퍼 함수 **/

function getRateStyles(rate: number) {
  if (rate >= 80) return { bar: "bg-blue-500", text: "text-blue-600" };
  if (rate >= 65) return { bar: "bg-orange-500", text: "text-orange-600" };
  if (rate >= 30) return { bar: "bg-yellow-400", text: "text-yellow-500" };
  return { bar: "bg-red-500", text: "text-red-600" };
}

function ProgressBar({ rate }: { rate: number }) {
  const { bar } = getRateStyles(rate);
  return (
    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-black/5">
      <div className={`${bar} h-full transition-all duration-700 ease-out`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function DetailBox({ label, val, color = "text-white" }: any) {
  return (
    <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
      <p className="text-[9px] text-white/30 uppercase mb-1 font-black">{label}</p>
      <p className={`text-[15px] font-black italic ${color}`}>{val}</p>
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
  const handleClick = () => { if (onClick) onClick(); else if (url && url !== "#") window.open(url, "_blank"); };
  return (
    <button onClick={handleClick} className={`${color} ${className || ""} px-4 md:px-5 py-2.5 rounded-xl font-black text-[11px] md:text-[12px] border-2 border-black shadow-sm shrink-0 transition-transform active:scale-95`}>
      {label}
    </button> 
  )
}

function MetricInput({ label, val, onChange, color }: any) { 
  return (
    <div className="space-y-1 text-center font-black">
      <label className="text-[11px] text-slate-400 font-black">{label}</label>
      <input type="number" inputMode="numeric" value={val === 0 ? '' : val} placeholder="0" onChange={e=>onChange(Number(e.target.value))} className={`w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-black rounded-2xl text-center text-[16px] md:text-[18px] font-black outline-none transition-all ${color}`} />
    </div>
  ) 
}