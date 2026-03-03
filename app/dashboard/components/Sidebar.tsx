"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange }: any) {
  const router = useRouter();
  const [memo, setMemo] = useState("");

  // 메모 불러오기 (날짜별로 다른 메모를 저장하고 싶다면 key에 dateStr 포함)
  useEffect(() => {
    const savedMemo = localStorage.getItem(`memo_${user.id}`);
    if (savedMemo) setMemo(savedMemo);
  }, [user.id]);

  const saveMemo = (val: string) => {
    setMemo(val);
    localStorage.setItem(`memo_${user.id}`, val);
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10">
      <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter text-center">History</h2>
      <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
        <Calendar onChange={(d: any) => onDateChange(d)} value={selectedDate} formatDay={(_, date) => date.getDate().toString()} className="border-0 w-full" />
      </div>
      
      {/* 개인 메모장 섹션 */}
      <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 flex-1 flex flex-col">
        <p className="text-[10px] font-black text-amber-600 uppercase italic mb-2 tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
          Private Memo
        </p>
        <textarea 
          value={memo}
          onChange={(e) => saveMemo(e.target.value)}
          placeholder="나만의 메모를 입력하세요..."
          className="w-full flex-1 bg-transparent text-xs font-bold outline-none resize-none text-amber-900 leading-relaxed placeholder:text-amber-200"
        />
      </div>

      <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="w-full bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] transition-all">Logout</button>
      
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; font-size: 0.8rem; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 10px; font-weight: 900; }
      `}</style>
    </aside>
  );
}