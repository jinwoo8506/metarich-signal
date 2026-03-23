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
    fetch3MonthAvg(); // ✅ 실적 불러오기 실행
    fetchMenuSettings();
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // 📈 3개월 평균 실적 불러오기 로직 (직원용/관리자용 구분)
  async function fetch3MonthAvg() {
    const today = new Date();
    // 이번 달 1일부터 역산하여 3개월치 시작일 설정
    const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const startStr = startDate.toISOString().split('T')[0];
    
    let query = supabase
      .from("performance") // 💡 만약 테이블명이 'daily_perf'라면 이 부분을 수정하세요.
      .select("amount, count, contract_amt, contract_cnt")
      .gte("date", startStr);

    // ✅ 일반 직원이면 '내 실적'만, 관리자면 '전체 실적'을 합산 (사용자 의도 반영)
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (data && data.length > 0) {
      // AdminView와 동일한 필드명(contract_amt)과 구형 필드명(amount) 모두 합산
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

  async function fetchDailyData() {
    const { data } = await supabase
      .from("daily_stats")
      .select("admin_notice")
      .eq("date", dateStr)
      .maybeSingle();
    setDailyAdminNotice(data?.admin_notice || "");
  }

  async function saveDailyNotice() {
    if (!isAdmin) return;
    const { error } = await supabase
      .from("daily_stats")
      .upsert({ date: dateStr, admin_notice: dailyAdminNotice }, { onConflict: 'date' });
    if (!error) alert("공지사항이 저장되었습니다.");
  }

  // ... (fetchMenuSettings, toggleMenu, handleLogout 등 기존 함수는 동일)
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
    await supabase.from("team_settings").upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      
      <button onClick={onBack} className="text-left text-[10px] text-slate-400 hover:text-black mb-[-10px] font-black italic">
        ← BACK TO SELECTOR
      </button>

      <div className="flex justify-between items-center border-b-4 border-black pb-1">
        <h2 className="text-2xl italic uppercase tracking-tighter font-black">
          {mode === 'office' ? 'History' : 'Consult'}
        </h2>
        {isMaster && (
          <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-2 py-1 rounded font-bold ${isEditMode ? 'bg-red-500 text-white' : 'bg-slate-200'}`}>
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
              locale="ko-KR"          // ✅ 한글
              calendarType="gregory" // ✅ 일~토 순서
              formatDay={(l, d) => d.getDate().toString()} 
              className="border-none bg-transparent font-black"
            />
          </div>
          <div className="bg-black text-white p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(67,97,238,1)]">
            <p className="text-[10px] uppercase italic text-slate-400 mb-2 font-black">
              {isAdmin ? "Team 3-Month Avg" : "My 3-Month Avg"}
            </p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-black italic">₩{threeMonthAvg.amt.toLocaleString()}</p>
                <p className="text-[10px] text-blue-400 font-bold">Avg Revenue</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black">{threeMonthAvg.cnt}건</p>
                <p className="text-[10px] text-slate-400 font-bold">Avg Count</p>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* 퀵링크 섹션 (중략 - 기존 버튼 로직과 동일) */}
      <div className="px-1 space-y-3">
        <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Quick Links</p>
        {/* ... (기존 버튼 코드들) ... */}
        {/* 예시 하나만 남김 */}
        {(menuStatus.show_finance || isEditMode) && (
          <div className="relative">
            <button onClick={() => !isEditMode && window.open("/financial_planner.html", "_blank")} className="w-full flex items-center justify-center gap-3 py-3 border-2 border-black rounded-xl bg-[#f8fafc]">
              <span className="text-lg">📊</span><span className="text-[11px] font-black">재무 분석 도구</span>
            </button>
          </div>
        )}
        {/* 나머지 버튼들(보장분석, 진료기록 등)도 동일하게 유지 */}
      </div>

      {/* 📝 메모 섹션 (요청사항 반영: 관리자 공지 + 개인 메모) */}
      <div className="flex flex-col gap-4 mt-auto pt-4 border-t border-slate-100">
        {mode === 'office' && (
          <>
            {/* 관리자 공지: 관리자만 수정 가능 */}
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
              />
            </div>
            {/* 개인 메모: 누구나 본인 것 수정 가능 */}
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
        <button onClick={() => { supabase.auth.signOut(); router.push("/login"); }} className="w-full py-3 text-[11px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase">LOGOUT SYSTEM</button>
      </div>
    </aside>
  );
}