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
      etc1: "", relation: "", status: c.status || "진행", monthly_pay: c.monthly_pay || 0,
      insu_company: c.insu_company || "", gift: c.gift || "", contract_type: c.contract_type || "체결"
    }));

    try {
      await fetch(GAS_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mappedData) });
      alert(`동기화 성공! ${customers.length}명의 고객 데이터를 구글 시트에 기록했습니다.`);
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
      call: Number(rawPayload.call || 0), meet: Number(rawPayload.meet || 0),
      pt: Number(rawPayload.pt || 0), intro: Number(rawPayload.intro || 0),
      db_assigned: Number(rawPayload.db_assigned || 0), db_returned: Number(rawPayload.db_returned || 0),
      contract_cnt: Number(rawPayload.contract_cnt || 0), contract_amt: Number(rawPayload.contract_amt || 0),
      target_cnt: Number(rawPayload.target_cnt || 0), target_amt: Number(rawPayload.target_amt || 0)
    };
    const { error } = await supabase.from("daily_perf").upsert({ ...payload, user_id: user.id, date: monthKey }, { onConflict: 'user_id, date' });
    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      alert("성공적으로 저장되었습니다.");
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 pb-20 font-sans text-slate-900">
      {/* 상단 공지 애니메이션 */}
      <div className="bg-blue-600 p-4 rounded-2xl flex items-center gap-4 overflow-hidden shadow-lg shadow-blue-600/20">
        <span className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold shrink-0">공지</span>
        <div className="relative flex-1 overflow-hidden h-6">
          <div className="absolute whitespace-nowrap animate-marquee text-sm text-white font-medium">{globalNotice}</div>
        </div>
      </div>

      {/* 상단 프로필 및 퀵링크 */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">👤</div>
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{user.department_name || "미소속"} · {user.branch_name || "지점미지정"}</p>
            <h2 className="text-xl font-bold text-slate-800">{user.name} <span className="text-blue-600 text-sm font-medium ml-1">설계사님</span></h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center">
          <QuickBtn label="메타온" url={LINKS.metaon} color="bg-slate-50 text-slate-600" />
          <QuickBtn label="보험사 공시" url={LINKS.insu} color="bg-slate-50 text-slate-600" />
          <QuickBtn label="업무 자료실" url={LINKS.archive} color="bg-slate-50 text-slate-600" />
          <QuickBtn label="영업 도구" onClick={() => setIsToolOpen(true)} color="bg-slate-800 text-white" />
          <QuickBtn label="고객 관리" onClick={() => setIsCustOpen(true)} color="bg-blue-600 text-white border-none shadow-md shadow-blue-600/20" />
        </div>
      </div>

      {/* 메인 탭 전환 */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-md">
        <button onClick={() => setMainTab('input')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mainTab === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>실적 입력 (PERFORMANCE)</button>
        <button onClick={() => setMainTab('edu')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mainTab === 'edu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>교육 현황 (EDUCATION)</button>
      </div>

      {mainTab === 'input' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* 실적 입력 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{month}월 매출 목표 달성률</p>
                  <p className="text-sm font-medium text-slate-500">{perfInput.contract_amt.toLocaleString()}만원 / {perfInput.target_amt.toLocaleString()}만원</p>
                </div>
                <p className={`text-3xl font-bold tracking-tight ${getRateStyles(calculateRate(perfInput.contract_amt, perfInput.target_amt)).text}`}>
                  {calculateRate(perfInput.contract_amt, perfInput.target_amt)}%
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold ml-1">목표액</label>
                  <input type="number" disabled={perfInput.is_approved} value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className="w-full p-3 bg-slate-50 rounded-xl text-center text-lg font-bold outline-none focus:ring-2 ring-blue-100 transition-all disabled:opacity-50" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold ml-1">현재 실적</label>
                  <input type="number" value={perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="w-full p-3 bg-blue-50 text-blue-600 rounded-xl text-center text-lg font-bold border border-blue-100 outline-none focus:ring-2 ring-blue-100 transition-all" />
                </div>
              </div>
              <ProgressBar rate={calculateRate(perfInput.contract_amt, perfInput.target_amt)} />
            </div>

            <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{month}월 계약 건수 달성률</p>
                  <p className="text-sm font-medium text-slate-500">{perfInput.contract_cnt}건 / {perfInput.target_cnt}건</p>
                </div>
                <p className={`text-3xl font-bold tracking-tight ${getRateStyles(calculateRate(perfInput.contract_cnt, perfInput.target_cnt)).text}`}>
                  {calculateRate(perfInput.contract_cnt, perfInput.target_cnt)}%
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold ml-1">목표 건수</label>
                  <input type="number" disabled={perfInput.is_approved} value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className="w-full p-3 bg-slate-50 rounded-xl text-center text-lg font-bold outline-none focus:ring-2 ring-blue-100 transition-all disabled:opacity-50" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold ml-1">현재 건수</label>
                  <input type="number" value={perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="w-full p-3 bg-emerald-50 text-emerald-600 rounded-xl text-center text-lg font-bold border border-emerald-100 outline-none focus:ring-2 ring-emerald-100 transition-all" />
                </div>
              </div>
              <ProgressBar rate={calculateRate(perfInput.contract_cnt, perfInput.target_cnt)} />
            </div>
          </div>

          {/* 지표 상세 입력 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 shadow-sm">
            <MetricInput label="전화량 (Call)" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
            <MetricInput label="미팅 (Meet)" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
            <MetricInput label="제안 (PT)" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
            <MetricInput label="소개 (Intro)" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
            <MetricInput label="DB 배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-blue-600" />
            <MetricInput label="DB 반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-rose-500" />
          </div>

          {/* 3개월 통계 및 개인 기록 */}
          <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl space-y-8">
            <div>
              <div className="flex gap-6 mb-8 border-b border-white/10 pb-4">
                <button onClick={()=>setAvgTab('perf')} className={`text-sm font-bold transition-all relative ${avgTab==='perf' ? 'text-blue-400 after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-1 after:bg-blue-400' : 'text-white/40 hover:text-white/60'}`}>최근 3개월 실적 분석</button>
                <button onClick={()=>setAvgTab('act')} className={`text-sm font-bold transition-all relative ${avgTab==='act' ? 'text-blue-400 after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-1 after:bg-blue-400' : 'text-white/40 hover:text-white/60'}`}>최근 3개월 활동 분석</button>
              </div>
              {avgTab === 'perf' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <AvgBox label="월 평균 매출" val={`${avgData.amt.toLocaleString()}만원`} />
                  <AvgBox label="월 평균 건수" val={`${avgData.cnt}건`} />
                  <AvgBox label="건당 평균 매출" val={`${avgData.perAmt.toLocaleString()}만원`} />
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <AvgBox label="평균 전화" val={`${avgData.call}회`} />
                  <AvgBox label="평균 미팅" val={`${avgData.meet}회`} />
                  <AvgBox label="평균 제안" val={`${avgData.pt}회`} />
                  <AvgBox label="평균 소개" val={`${avgData.intro}회`} />
                </div>
              )}
            </div>

            {/* 개인 기네스 / 로우 기록 */}
            <div className="pt-6 border-t border-white/10">
              <p className="text-[11px] font-bold text-white/30 mb-5 uppercase tracking-widest">나의 역대 기록 (Personal Records)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div onClick={() => setViewDetail(records.best)} className={`p-6 rounded-2xl border transition-all cursor-pointer group ${viewDetail?.date === records.best?.date ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className={`text-[10px] font-bold mb-2 uppercase tracking-wider ${viewDetail?.date === records.best?.date ? 'text-white/80' : 'text-blue-400'}`}>역대 최고 매출</p>
                  <p className="text-2xl font-bold tracking-tight">{records.best ? `${new Date(records.best.date).getFullYear()}년 ${new Date(records.best.date).getMonth() + 1}월` : '-'}</p>
                  <p className={`text-sm font-medium mt-1 ${viewDetail?.date === records.best?.date ? 'text-white/70' : 'text-white/50'}`}>{records.best ? `${records.best.contract_amt.toLocaleString()}만원 달성` : '기록 없음'}</p>
                </div>
                <div onClick={() => setViewDetail(records.worst)} className={`p-6 rounded-2xl border transition-all cursor-pointer group ${viewDetail?.date === records.worst?.date ? 'bg-rose-600 border-rose-400 shadow-lg shadow-rose-600/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className={`text-[10px] font-bold mb-2 uppercase tracking-wider ${viewDetail?.date === records.worst?.date ? 'text-white/80' : 'text-rose-400'}`}>역대 최저 매출</p>
                  <p className="text-2xl font-bold tracking-tight">{records.worst ? `${new Date(records.worst.date).getFullYear()}년 ${new Date(records.worst.date).getMonth() + 1}월` : '-'}</p>
                  <p className={`text-sm font-medium mt-1 ${viewDetail?.date === records.worst?.date ? 'text-white/70' : 'text-white/50'}`}>{records.worst ? `${records.worst.contract_amt.toLocaleString()}만원 기록` : '기록 없음'}</p>
                </div>
              </div>

              {viewDetail && (
                <div className="mt-6 p-7 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h5 className="text-lg font-bold text-blue-400 tracking-tight">{new Date(viewDetail.date).getFullYear()}년 {new Date(viewDetail.date).getMonth() + 1}월 상세 데이터</h5>
                    <button onClick={() => setViewDetail(null)} className="text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">닫기</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailBox label="총 매출액" val={`${viewDetail.contract_amt.toLocaleString()}만원`} color="text-blue-400" />
                    <DetailBox label="총 계약건수" val={`${viewDetail.contract_cnt}건`} color="text-blue-400" />
                    <DetailBox label="전화량" val={`${viewDetail.call}회`} />
                    <DetailBox label="미팅수" val={`${viewDetail.meet}회`} />
                    <DetailBox label="제안수" val={`${viewDetail.pt}회`} />
                    <DetailBox label="지인소개" val={`${viewDetail.intro}회`} />
                    <DetailBox label="DB 배정" val={`${viewDetail.db_assigned}건`} color="text-blue-300" />
                    <DetailBox label="DB 반품" val={`${viewDetail.db_returned}건`} color="text-rose-400" />
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => handleSave()} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.99] tracking-tight">이번 달 실적 정보 업데이트</button>
        </div>
      )}

      {mainTab === 'edu' && (
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">주간 교육 이수 현황</h2>
            <p className="text-sm text-slate-400 mt-1">등록된 주차별 교육을 확인하고 참여 여부를 체크하세요.</p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((w) => {
              const fieldName = `edu_${w}` as keyof typeof perfInput;
              const isChecked = perfInput[fieldName];
              return (
                <div key={w} onClick={() => handleSave({ [fieldName]: !isChecked })} className={`flex items-center gap-5 p-6 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${isChecked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${isChecked ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {w === 5 ? "특강" : `${w}주차`}
                  </div>
                  <div className="flex-1">
                    <p className={`text-base font-bold leading-snug ${isChecked ? 'text-emerald-900' : 'text-slate-700'}`}>
                      {eduWeeks[w as keyof typeof eduWeeks] || "등록된 교육 내용이 없습니다."}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-transparent'}`}>✔</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 모달 영역 */}
      {isCustOpen && (
        <CustomerManagerModal onClose={() => setIsCustOpen(false)} onSaveToGoogle={handleGoogleSync} />
      )}
    </div>
  )
}

/** 하위 컴포넌트 **/
function getRateStyles(rate: number) {
  if (rate >= 80) return { bar: "bg-blue-500", text: "text-blue-600" };
  if (rate >= 65) return { bar: "bg-amber-500", text: "text-amber-600" };
  if (rate >= 30) return { bar: "bg-orange-400", text: "text-orange-500" };
  return { bar: "bg-rose-500", text: "text-rose-600" };
}

function ProgressBar({ rate }: { rate: number }) {
  const { bar } = getRateStyles(rate);
  return (
    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
      <div className={`${bar} h-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function DetailBox({ label, val, color = "text-white" }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center">
      <p className="text-[10px] text-white/30 font-bold uppercase mb-1 tracking-wider">{label}</p>
      <p className={`text-base font-bold ${color}`}>{val}</p>
    </div>
  )
}

function AvgBox({ label, val }: any) { 
  return (
    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col justify-center items-center min-h-[90px] shadow-inner">
      <p className="text-[10px] text-white/40 font-bold uppercase mb-2 tracking-widest">{label}</p>
      <p className="text-xl text-blue-400 font-bold tracking-tight">{val}</p>
    </div>
  ) 
}

function QuickBtn({ label, url, onClick, color, className }: any) { 
  const handleClick = () => { if (onClick) onClick(); else if (url && url !== "#") window.open(url, "_blank"); };
  return (
    <button onClick={handleClick} className={`${color} ${className || ""} px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-200/10`}>
      {label}
    </button> 
  )
}

function MetricInput({ label, val, onChange, color }: any) { 
  return (
    <div className="space-y-1 text-center font-black">
      <label className="text-[11px] text-slate-400">{label}</label>
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
