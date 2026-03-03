"use client"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange }: any) {
  const router = useRouter();

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10">
      <h2 className="font-black text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter text-center">History</h2>
      <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
        <Calendar onChange={(d: any) => onDateChange(d)} value={selectedDate} formatDay={(_, date) => date.getDate().toString()} className="border-0 w-full" />
      </div>
      
      <div className="bg-blue-50/50 p-5 rounded-3xl border flex-1">
        <p className="text-[9px] font-black text-slate-400 uppercase italic mb-2 tracking-widest text-center">Admin Comment</p>
        <p className="text-xs font-bold text-slate-700 leading-relaxed text-center">데이터는 당일 오후 6시까지<br/>정확하게 입력해 주세요.</p>
      </div>

      <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="w-full bg-black text-[#d4af37] py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] transition-all">Logout</button>
      
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; border-radius: 20px; font-family: inherit !important; font-size: 0.8rem; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 10px; font-weight: 900; }
      `}</style>
    </aside>
  );
}