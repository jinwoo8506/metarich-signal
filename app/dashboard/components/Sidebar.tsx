"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange, mode, onBack }: any) {
  const router = useRouter();
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  
  // ✅ 사이드바 버튼 활성화 상태 관리
  const [menuStatus, setMenuStatus] = useState({
    show_finance: true,
    show_insu: true,
    show_cafe: true,
    show_hira: true,
    show_cont: true
  });
  const [isEditMode, setIsEditMode] = useState(false);

  const dateStr = selectedDate.toLocaleDateString('en-CA');
  const isAdmin = user.role === 'admin' || user.role === 'master';
  const isMaster = user.role === 'master';

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg();
    fetchMenuSettings();
    // 개인 메모는 로컬 스토리지에서 불러오기 (기존 기능 유지)
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  async function fetchMenuSettings() {
    const { data } = await supabase
      .from("team_settings")
      .select("key, value")
      .in("key", ["show_finance", "show_insu", "show_cafe", "show_hira", "show_cont"]);

    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      setMenuStatus(prev => ({ ...prev, ...settings }));
    }
  }

  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    setMenuStatus(prev => ({ ...prev, [key]: newValue }));
    
    await supabase
      .from("team_settings")
      .upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  async function fetchDailyData() {
    const { data } = await supabase
      .from("daily_stats")
      .select("admin_notice")
      .eq("date", dateStr)
      .maybeSingle();
    setDailyAdminNotice(data?.admin_notice || "");
  }

  // 📈 3개월 실적 로직 (데이터가 안 나오는 문제를 해결하기 위해 필드명 및 계산 보정)
  async function fetch3MonthAvg() {
    const today = new Date();
    // 이번 달 포함 최근 3개월 (예: 3월 기준 1, 2, 3월 데이터 합산용)
    const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const startStr = startDate.toISOString().split('T')[0];
    
    const { data } = await supabase
      .from("performance") // 💡 실적 데이터가 쌓이는 테이블명 확인 필수
      .select("amount, count, contract_amt, contract_cnt")
      .eq("user_id", user.id)
      .gte("date", startStr);

    if (data && data.length > 0) {
      // AdminView에서 사용하는 contract_amt/cnt 또는 기존 amount/count 모두 대응
      const totalAmt = data.reduce((sum, item) => sum + (Number(item.contract_amt || item.amount || 0)), 0);
      const totalCnt = data.reduce((sum, item) => sum + (Number(item.contract_cnt || item.count || 0)), 0);
      
      setThreeMonthAvg({
        amt: Math.floor(totalAmt / 3),
        cnt: Number((totalCnt / 3).toFixed(1))
      });
    } else {
      setThreeMonthAvg({ amt: 0, cnt: 0 });
    }
  }

  async function saveDailyNotice() {
    if (!isAdmin) return;
    const { error } = await supabase
      .from("daily_stats")
      .upsert({ date: dateStr, admin_notice: dailyAdminNotice }, { onConflict: 'date' });
    if (!error) alert("공지사항이 저장되었습니다.");
  }

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      
      <button onClick={onBack} className="text-left text-[10px] text-slate-400 hover:text-black mb-[-10px] transition-colors flex items-center gap-1 group font-black italic">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> BACK TO SELECTOR
      </button>

      <div className="flex justify-between items-center border-b-4 border-black pb-1">
        <h2 className="text-2xl italic uppercase tracking-tighter font-black">
          {mode === 'office' ? 'History' : 'Consult'}
        </h2>
        {isMaster && (
          <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-2 py-1 rounded font-bold transition-colors ${isEditMode ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {isEditMode ? "완료" : "⚙️ 메뉴 관리"}
          </button>
        )}
      </div>
      
      {mode === 'office' && (
        <>
          <div className="flex justify-center bg-slate-50 p-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Calendar 
              onChange={onDateChange} 
              value={selectedDate} 
              locale="ko-KR"          // ✅ 한글 표시
              calendarType="gregory" // ✅ 일~토 순서
              formatDay={(l, d) => d.getDate().toString()} 
              className="border-none bg-transparent font-black"
            />
          </div>
          <div className="bg-black text-white p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(67,97,238,1)]">
            <p className="text-[10px] uppercase italic text-slate-400 mb-2 font-black">3-Month Average Performance</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-black italic">₩{threeMonthAvg.amt.toLocaleString()}</p>
                <p className="text-[10px] text-blue-400 font-bold">Monthly Avg Revenue</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">{threeMonthAvg.cnt}건</p>
                <p className="text-[10px] text-slate-400 font-bold">Avg Count</p>
              </div>
            </div>
          </div>
        </>
      )}
      
      <div className="px-1 space-y-3">
        <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Quick Links</p>
        
        {/* 링크 버튼들 (기존 코드 유지) */}
        {(menuStatus.show_finance || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && handleOpenLink("/financial_planner.html")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-black rounded-xl transition-all ${menuStatus.show_finance ? 'bg-[#f8fafc]' : 'bg-gray-100 opacity-40'}`}>
              <span className="text-lg">📊</span><span className="text-[11px] font-black">재무 분석 도구</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_finance} onChange={() => toggleMenu("show_finance")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-black cursor-pointer"/>}
          </div>
        )}

        {(menuStatus.show_insu || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && handleOpenLink("/insu.html")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-blue-600 rounded-xl transition-all ${menuStatus.show_insu ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-400 opacity-40'}`}>
              <span className="text-lg">🛡️</span><span className="text-[11px] font-black">보장분석 탭</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_insu} onChange={() => toggleMenu("show_insu")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-blue-600 cursor-pointer"/>}
          </div>
        )}

        {(menuStatus.show_hira || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && handleOpenLink("https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000&WT.gnb=내+진료정보+열람")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-orange-500 rounded-xl transition-all ${menuStatus.show_hira ? 'bg-white text-orange-600' : 'bg-gray-100 text-gray-400 opacity-40'}`}>
              <span className="text-lg">🏥</span><span className="text-[11px] font-black">진료기록 확인</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_hira} onChange={() => toggleMenu("show_hira")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-orange-500 cursor-pointer"/>}
          </div>
        )}

        {(menuStatus.show_cont || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && handleOpenLink("https://cont.insure.or.kr/cont_web/intro.do")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-emerald-500 rounded-xl transition-all ${menuStatus.show_cont ? 'bg-white text-emerald-600' : 'bg-gray-100 text-gray-400 opacity-40'}`}>
              <span className="text-lg">🔍</span><span className="text-[11px] font-black">숨은 보험금 찾기</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_cont} onChange={() => toggleMenu("show_cont")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-emerald-500 cursor-pointer"/>}
          </div>
        )}

        {(menuStatus.show_cafe || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && handleOpenLink("https://cafe.naver.com/signal1035")} className={`w-full flex items-center justify-center gap-3 py-3 border-2 border-[#2db400] rounded-xl transition-all ${menuStatus.show_cafe ? 'bg-white text-[#2db400]' : 'bg-gray-100 text-gray-400 opacity-40'}`}>
              <span className="text-lg">☕</span><span className="text-[11px] font-black">성장연구소 카페</span>
            </button>
            {isEditMode && <input type="checkbox" checked={menuStatus.show_cafe} onChange={() => toggleMenu("show_cafe")} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 accent-[#2db400] cursor-pointer"/>}
          </div>
        )}
      </div>

      {/* 📝 메모 영역 (2가지 유지: 관리자 공지 + 개인 메모) */}
      <div className="flex flex-col gap-4 mt-auto pt-4 border-t border-slate-100">
        {mode === 'office' && (
          <>
            {/* 1. 관리자 공지 (관리자만 수정 가능) */}
            <div>
              <div className="flex justify-between items-center mb-1 px-1 text-[9px] text-slate-400 uppercase italic font-black">
                <span>Admin Notice</span>
                {isAdmin && <button onClick={saveDailyNotice} className="text-blue-600 hover:underline">SAVE</button>}
              </div>
              <textarea 
                readOnly={!isAdmin} 
                value={dailyAdminNotice} 
                onChange={(e) => setDailyAdminNotice(e.target.value)} 
                className={`w-full h-20 p-3 text-[11px] border-2 border-black rounded-xl resize-none font-bold ${!isAdmin ? 'bg-slate-50 text-slate-600' : 'bg-yellow-50 text-black'}`} 
                placeholder={isAdmin ? "관리자 공지를 입력하세요." : "등록된 공지가 없습니다."}
              />
            </div>
            {/* 2. 개인 메모 (직원/관리자 누구나 본인용으로 사용 가능) */}
            <div>
              <p className="text-[9px] text-slate-400 uppercase italic mb-1 px-1 font-black">Private Memo</p>
              <textarea 
                value={privateMemo} 
                onChange={(e) => {setPrivateMemo(e.target.value); localStorage.setItem(`memo_${user.id}`, e.target.value);}} 
                className="w-full h-20 p-3 text-[11px] border-2 border-slate-200 rounded-xl bg-slate-50 resize-none font-bold italic" 
                placeholder="나만의 메모..."
              />
            </div>
          </>
        )}
        <button onClick={handleLogout} className="w-full py-3 text-[11px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">LOGOUT SYSTEM</button>
      </div>
    </aside>
  );
}