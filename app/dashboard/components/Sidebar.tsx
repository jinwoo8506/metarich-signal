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
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const isAdmin = user.role === 'admin' || user.role === 'master';

  useEffect(() => {
    fetchDailyData();
    // 개인 메모 불러오기 (날짜 무관하게 유저 고유 메모 - 로컬스토리지 유지)
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // 날짜별 전달사항 로드 (DB 연동 권장하지만 일단 로직 유지하며 구조 보강)
  async function fetchDailyData() {
    // 관리자가 저장한 해당 날짜의 지시사항을 불러옵니다.
    const savedDaily = localStorage.getItem(`admin_daily_${dateStr}`);
    setDailyAdminNotice(savedDaily || "해당 날짜의 전달사항이 없습니다.");
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
      
      {/* 달력 섹션: 일월화수목금토 순서 강제 */}
      <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-white p-2">
        <Calendar 
          onChange={(d: any) => onDateChange(d)} 
          value={selectedDate} 
          formatDay={(_, date) => date.getDate().toString()} 
          className="border-0 w-full"
          calendarType="gregory" // 일요일 시작(Sun-Sat) 강제 설정
          next2Label={null}
          prev2Label={null}
        />
      </div>
      
      <div className="flex-1 flex flex-col gap-4">
        {/* 날짜별 세부 전달사항 (관리자 전용 입력) */}
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

        {/* 개인 메모 (전 직원 공통 사용) */}
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
      
      {/* 달력 커스텀 스타일 (일요일 빨간색, 토요일 파란색 추가) */}
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
        .react-calendar__navigation button { font-weight: 900; font-style: italic; font-size: 1rem; }
        .react-calendar__month-view__weekdays__weekday { font-weight: 900; font-size: 0.7rem; text-decoration: none !important; }
        /* 일요일 색상 */
        .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr { color: #f87171; text-decoration: none; }
        /* 토요일 색상 */
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