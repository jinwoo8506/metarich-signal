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

  useEffect(() => {
    // 날짜별 관리자 전달사항 불러오기 (로컬스토리지 또는 DB)
    const savedDaily = localStorage.getItem(`admin_daily_${dateStr}`);
    setDailyAdminNotice(savedDaily || "해당 날짜의 전달사항이 없습니다.");

    // 개인 메모 불러오기 (날짜 무관하게 유저 고유 메모)
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  const isAdmin = user.role === 'admin' || user.role === 'master';

  const saveDailyNotice = (val: string) => {
    setDailyAdminNotice(val);
    localStorage.setItem(`admin_daily_${dateStr}`, val);
  };

  const savePrivateMemo = (val: string) => {
    setPrivateMemo(val);
    localStorage.setItem(`memo_${user.id}`, val);
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-5 shadow-sm z-10">
      <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter text-center">History</h2>
      <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
        <Calendar onChange={(d: any) => onDateChange(d)} value={selectedDate} formatDay={(_, date) => date.getDate().toString()} className="border-0 w-full" />
      </div>
      
      <div className="flex-1 flex flex-col gap-4">
        {/* 날짜별 세부 전달사항 (선택한 날짜에 따라 내용이 변함) */}
        <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 flex flex-col h-44 transition-all">
          <p className="text-[10px] font-black text-blue-600 uppercase italic mb-2 tracking-widest flex justify-between">
            <span>Daily Instruction</span>
            <span className="opacity-50">{dateStr}</span>
          </p>
          <textarea 
            value={dailyAdminNotice}
            onChange={(e) => isAdmin && saveDailyNotice(e.target.value)}
            readOnly={!isAdmin}
            className={`w-full flex-1 bg-transparent text-xs font-bold outline-none resize-none leading-relaxed text-blue-900 ${!isAdmin ? 'cursor-default' : 'focus:ring-1 ring-blue-300 rounded-lg p-1'}`}
          />
        </div>

        {/* 개인 메모 (항상 유지) */}
        <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 flex flex-col h-44">
          <p className="text-[10px] font-black text-amber-600 uppercase italic mb-2 tracking-widest font-sans">Private Memo</p>
          <textarea 
            value={privateMemo}
            onChange={(e) => savePrivateMemo(e.target.value)}
            className="w-full flex-1 bg-transparent text-xs font-bold outline-none resize-none text-amber-900 leading-relaxed"
          />
        </div>
      </div>

      <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="w-full bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] transition-all">Logout</button>
      
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; font-size: 0.8rem; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 10px; font-weight: 900; }
      `}</style>
    </aside>
  );
}