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

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg();
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  async function fetchDailyData() {
    const savedDaily = localStorage.getItem(`admin_daily_${dateStr}`);
    setDailyAdminNotice(savedDaily || "해당 날짜의 전달사항이 없습니다.");
  }

  // 뷰를 활용한 최적화된 평균 데이터 조회 로직 적용
  async function fetch3MonthAvg() {
    const { data } = await supabase.from("view_3month_avg").select("avg_3month_amt, avg_3month_cnt");
    
    if (data && data.length > 0) {
      const avgAmt = data.reduce((acc, curr) => acc + (curr.avg_3month_amt || 0), 0) / data.length;
      const avgCnt = data.reduce((acc, curr) => acc + (curr.avg_3month_cnt || 0), 0) / data.length;
      
      setThreeMonthAvg({ 
        amt: Math.round(avgAmt), 
        cnt: Number(avgCnt.toFixed(1)) 
      });
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
      <h2 className="text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter text-center font-black">History</h2>
      
      <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-white p-2">
        <Calendar 
          onChange={(d: any) => onDateChange(d)} 
          value={selectedDate} 
          formatDay={(_, date) => date.getDate().toString()} 
          className="border-0 w-full font-black"
          calendarType="gregory"
          next2Label={null}
          prev2Label={null}
        />
      </div>

      {/* 3개월 평균 데이터 배치 (기존 영역 수정 적용) */}
      <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl">
        <p className="text-[9px] text-[#d4af37] opacity-60 uppercase italic mb-3 tracking-widest px-1 font-black">Team 3-Month Performance</p>
        <div className="grid grid-cols-2 gap-3 font-black">
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
      
      <div className="flex-1 flex flex-col gap-4 font-black">
        <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 flex flex-col h-48 relative">
          <p className="text-[9px] font-black text-blue-600 uppercase italic mb-3 tracking-widest flex justify-between">
            <span>Daily Instruction</span>
            <span className="opacity-40">{dateStr}</span>
          </p>
          <textarea 
            value={dailyAdminNotice}
            onChange={(e) => isAdmin && saveDailyNotice(e.target.value)}
            readOnly={!isAdmin}
            className={`w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none leading-relaxed text-blue-900 ${!isAdmin ? 'cursor-default' : 'p-2 bg-white/50 rounded-xl'}`}
          />
        </div>

        <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 flex flex-col h-48 font-black">
          <p className="text-[9px] font-black text-amber-600 uppercase italic mb-3 tracking-widest">Private Memo</p>
          <textarea 
            value={privateMemo}
            onChange={(e) => savePrivateMemo(e.target.value)}
            className="w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none text-amber-900 leading-relaxed p-2 bg-white/50 rounded-xl"
          />
        </div>
      </div>

      <button 
        onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} 
        className="w-full bg-black text-[#d4af37] py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-xl italic"
      >
        Logout System
      </button>
      
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
        .react-calendar__navigation button { font-weight: 900; font-style: italic; }
        .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr { color: #f87171; text-decoration: none; }
        .react-calendar__month-view__weekdays__weekday:nth-child(7) abbr { color: #60a5fa; text-decoration: none; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px !important; }
        abbr[title] { text-decoration: none; }
      `}</style>
    </aside>
  );
}