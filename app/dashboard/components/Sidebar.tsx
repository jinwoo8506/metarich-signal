"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange }: any) {
  const router = useRouter();
  const [dailyAdminNotice, setDailyAdminNotice] = useState(""); // 날짜별 전달사항
  const [privateMemo, setPrivateMemo] = useState(""); // 개인 메모
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 }); // 3개월 평균 추가
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const isAdmin = user.role === 'admin' || user.role === 'master';

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg(); // 3개월 평균 데이터 로드 추가
    // 개인 메모 불러오기
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // 날짜별 전달사항 로드
  async function fetchDailyData() {
    const savedDaily = localStorage.getItem(`admin_daily_${dateStr}`);
    setDailyAdminNotice(savedDaily || "해당 날짜의 전달사항이 없습니다.");
  }

  // [추가된 로직] 3개월 평균 실적 및 건수 계산
  async function fetch3MonthAvg() {
    const dates = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    }
    const { data } = await supabase.from("daily_perf").select("contract_amt, contract_cnt").in("date", dates);
    if (data && data.length > 0) {
      const sumAmt = data.reduce((acc, curr) => acc + curr.contract_amt, 0);
      const sumCnt = data.reduce((acc, curr) => acc + curr.contract_cnt, 0);
      setThreeMonthAvg({ amt: Math.round(sumAmt / 3), cnt: Number((sumCnt / 3).toFixed(1)) });
    }
  }

  const saveDailyNotice = (val: string) => {
    setDailyAdminNotice(val);
    localStorage.setItem(`admin_daily_${dateStr}`, val);
  };

  const savePrivateMemo = (val: string) => {
    setPrivateMemo(val);
    localStorage.setItem(`memo_${user.id}`, val);
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-5 shadow-sm z-10 font-black">
      <h2 className="text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter text-center">History</h2>
      
      {/* 달력 섹션 */}
      <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-white p-2">
        <Calendar 
          onChange={(d: any) => onDateChange(d)} 
          value={selectedDate} 
          formatDay={(_, date) => date.getDate().toString()} 
          className="border-0 w-full"
          calendarType="gregory"
          next2Label={null}
          prev2Label={null}
        />
      </div>

      {/* [수정 요청 사항] 달력 바로 아래 3개월 평균 데이터 배치 */}
      <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl">
        <p className="text-[9px] text-[#d4af37] opacity-60 uppercase italic mb-3 tracking-widest px-1">Team 3-Month Performance</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center border-r border-white/10">
            <p className="text-[8px] text-white/40 uppercase mb-1">Avg Amount</p>
            <p className="text-lg text-[#d4af37] italic font-black">{threeMonthAvg.amt}만</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-white/40 uppercase mb-1">Avg Count</p>
            <p className="text-lg text-[#d4af37] italic font-black">{threeMonthAvg.cnt}건</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-4">
        {/* 날짜별 세부 전달사항 */}
        <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 flex flex-col h-48 transition-all relative">
          <p className="text-[9px] font-black text-blue-600 uppercase italic mb-3 tracking-widest flex justify-between">
            <span>Daily Instruction</span>
            <span className="opacity-40">{dateStr}</span>
          </p>
          <textarea 
            value={dailyAdminNotice}
            onChange={(e) => isAdmin && saveDailyNotice(e.target.value)}
            readOnly={!isAdmin}
            placeholder={isAdmin ? "전달사항을 입력하세요..." : "공지사항이 없습니다."}
            className={`w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none leading-relaxed text-blue-900 ${!isAdmin ? 'cursor-default' : 'focus:ring-2 ring-blue-200 rounded-xl p-2 bg-white/50'}`}
          />
          {isAdmin && <span className="absolute bottom-4 right-6 text-[8px] text-blue-300">AUTO SAVED</span>}
        </div>

        {/* 개인 메모 */}
        <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 flex flex-col h-48">
          <p className="text-[9px] font-black text-amber-600 uppercase italic mb-3 tracking-widest">Private Memo</p>
          <textarea 
            value={privateMemo}
            onChange={(e) => savePrivateMemo(e.target.value)}
            placeholder="나만의 메모를 남기세요..."
            className="w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none text-amber-900 leading-relaxed focus:ring-2 ring-amber-200 rounded-xl p-2 bg-white/50"
          />
        </div>
      </div>

      <button 
        onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} 
        className="w-full bg-black text-[#d4af37] py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all italic"
      >
        Logout System
      </button>
      
      {/* 달력 커스텀 스타일 유지 */}
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
        .react-calendar__navigation button { font-weight: 900; font-style: italic; font-size: 1rem; }
        .react-calendar__month-view__weekdays__weekday { font-weight: 900; font-size: 0.7rem; text-decoration: none !important; }
        .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr { color: #f87171; text-decoration: none; }
        .react-calendar__month-view__weekdays__weekday:nth-child(7) abbr { color: #60a5fa; text-decoration: none; }
        .react-calendar__tile { font-weight: 700; font-size: 0.8rem; height: 40px; border-radius: 12px; }
        .react-calendar__tile--now { background: #f1f5f9 !important; color: black !important; border-radius: 12px; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px !important; font-weight: 900; }
        .react-calendar__tile:hover { background: #f8fafc; border-radius: 12px; }
        abbr[title] { text-decoration: none; }
      `}</style>
    </aside>
  );
}