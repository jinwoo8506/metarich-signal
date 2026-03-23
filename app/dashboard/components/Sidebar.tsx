"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange }: any) {
  const router = useRouter();
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const isAdmin = user.role === 'admin' || user.role === 'master';

  // 링크 오픈 함수
  const handleOpenLink = (url: string) => {
    window.open(url, "_blank");
  };

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg();
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  async function fetchDailyData() {
    const { data } = await supabase
      .from("team_settings")
      .select("value")
      .eq("key", `daily_instruction_${dateStr}`)
      .maybeSingle();

    if (data) {
      setDailyAdminNotice(data.value);
    } else {
      setDailyAdminNotice("해당 날짜의 전달사항이 없습니다.");
    }
  }

  async function fetch3MonthAvg() {
    const d = new Date(selectedDate);
    const startOfRange = new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString().split('T')[0];
    const endOfRange = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];

    let query = supabase
      .from("daily_perf")
      .select("contract_amt, contract_cnt, user_id, date")
      .gte("date", startOfRange)
      .lt("date", endOfRange);

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    
    if (data && data.length > 0) {
      const totalAmt = data.reduce((acc, curr) => acc + (Number(curr.contract_amt) || 0), 0);
      const totalCnt = data.reduce((acc, curr) => acc + (Number(curr.contract_cnt) || 0), 0);
      const uniqueMonths = new Set(data.map(item => item.date.substring(0, 7))).size;
      const divisor = uniqueMonths > 0 ? uniqueMonths : 3;

      setThreeMonthAvg({ 
        amt: Math.round(totalAmt / divisor), 
        cnt: Number((totalCnt / divisor).toFixed(1)) 
      });
    } else {
      setThreeMonthAvg({ amt: 0, cnt: 0 });
    }
  }

  const saveDailyNotice = async (val: string) => {
    setDailyAdminNotice(val);
    const { error } = await supabase
      .from("team_settings")
      .upsert({ key: `daily_instruction_${dateStr}`, value: val }, { onConflict: 'key' });
    if (error) console.error("Error saving daily notice:", error);
  };

  const savePrivateMemo = (val: string) => {
    setPrivateMemo(val);
    localStorage.setItem(`memo_${user.id}`, val);
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      <h2 className="text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter text-center font-black">History</h2>
      
      {/* 1. 달력 영역 */}
      <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-white p-2">
        <Calendar 
          onChange={(d: any) => onDateChange(d)} 
          value={selectedDate} 
          formatDay={(_, date) => date.getDate().toString()} 
          className="border-0 w-full font-black text-xs"
          calendarType="gregory"
          next2Label={null}
          prev2Label={null}
        />
      </div>

      {/* 2. 3개월 평균 실적 */}
      <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl text-white">
        <p className="text-[9px] text-[#d4af37] opacity-60 uppercase italic mb-3 tracking-widest px-1 font-black">
          {isAdmin ? "Team 3-Month Performance" : "My 3-Month Performance"}
        </p>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="border-r border-white/10">
            <p className="text-[8px] opacity-40 uppercase mb-1 font-black">Avg Amount</p>
            <p className="text-lg text-[#d4af37] italic font-black">{threeMonthAvg.amt.toLocaleString()}만</p>
          </div>
          <div>
            <p className="text-[8px] opacity-40 uppercase mb-1 font-black">Avg Count</p>
            <p className="text-lg text-[#d4af37] italic font-black">{threeMonthAvg.cnt}건</p>
          </div>
        </div>
      </div>
      
      {/* 3. 퀵 링크 버튼 섹션 */}
      <div className="px-1 space-y-3">
        <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Community & Tools</p>
        
        {/* 재무/보장분석 도구 (기존) */}
        <button 
          onClick={() => handleOpenLink("/financial_planner.html")}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#f8fafc] border-2 border-black rounded-[1.5rem] hover:bg-black hover:text-[#d4af37] transition-all group shadow-sm active:scale-95"
        >
          <span className="text-xl">📊</span>
          <span className="text-[12px] font-black tracking-tight">재무 분석 도구</span>
        </button>

        {/* ✅ 보장분석 버튼 (신규 추가) */}
        <button 
          onClick={() => handleOpenLink("/insu.html")}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-blue-600 text-blue-600 rounded-[1.5rem] hover:bg-blue-600 hover:text-white transition-all group shadow-sm active:scale-95"
        >
          <span className="text-xl">🛡️</span>
          <span className="text-[12px] font-black tracking-tight">보장분석 탭</span>
        </button>

        {/* 성장연구소 카페 버튼 (기존) */}
        <button 
          onClick={() => handleOpenLink("https://cafe.naver.com/signal1035")}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-[#2db400] text-[#2db400] rounded-[1.5rem] hover:bg-[#2db400] hover:text-white transition-all group shadow-sm active:scale-95"
        >
          <span className="text-xl">☕</span>
          <span className="text-[12px] font-black tracking-tight">성장연구소 카페</span>
        </button>
      </div>

      {/* 4. 메모 및 공지 영역 */}
      <div className="flex flex-col gap-4">
        <div className="bg-blue-50 p-5 rounded-[2.5rem] border border-blue-100 flex flex-col h-44">
          <p className="text-[9px] font-black text-blue-600 uppercase italic mb-2 tracking-widest">Daily Instruction</p>
          <textarea 
            value={dailyAdminNotice}
            onChange={(e) => isAdmin && saveDailyNotice(e.target.value)}
            readOnly={!isAdmin}
            className={`w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none leading-relaxed text-blue-900 ${!isAdmin ? 'cursor-default' : 'p-2 bg-white/50 rounded-xl focus:bg-white transition-all'}`}
          />
        </div>

        <div className="bg-amber-50 p-5 rounded-[2.5rem] border border-amber-100 flex flex-col h-44 font-black">
          <p className="text-[9px] font-black text-amber-600 uppercase italic mb-2 tracking-widest">Private Memo</p>
          <textarea 
            value={privateMemo}
            onChange={(e) => savePrivateMemo(e.target.value)}
            className="w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none text-amber-900 leading-relaxed p-2 bg-white/50 rounded-xl focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 5. 시스템 로그아웃 */}
      <button 
        onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} 
        className="w-full bg-black text-[#d4af37] py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-xl italic mt-4 mb-8"
      >
        Logout System
      </button>
      
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
        .react-calendar__navigation button { font-weight: 900; font-style: italic; font-size: 14px; }
        .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none; font-size: 10px; opacity: 0.5; }
        .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr { color: #f87171; }
        .react-calendar__month-view__weekdays__weekday:nth-child(7) abbr { color: #60a5fa; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px !important; }
        .react-calendar__tile { padding: 10px 5px !important; font-size: 12px; font-weight: 900; }
        abbr[title] { text-decoration: none; }
      `}</style>
    </aside>
  );
}