"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

// [추가] 메뉴 타입 정의
export type MenuType = 'dashboard' | 'customers' | 'insurance' | 'education';

export default function Sidebar({ user, selectedDate, onDateChange, activeMenu, setActiveMenu }: any) {
  const router = useRouter();
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const isAdmin = user.role === 'admin' || user.role === 'master';

  // [추가] 메뉴 아이템 정의
  const menuItems = [
    { id: 'dashboard', label: '📊 실적 대시보드' },
    { id: 'customers', label: '👥 고객 관리대장' },
    { id: 'insurance', label: '🏢 보험사 전산망' },
    { id: 'education', label: '📚 교육 현황' },
  ];

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg();
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // ... (기존 fetchDailyData, fetch3MonthAvg, save 관련 함수들은 그대로 유지) ...
  async function fetchDailyData() {
    const { data } = await supabase.from("team_settings").select("value").eq("key", `daily_instruction_${dateStr}`).maybeSingle();
    setDailyAdminNotice(data ? data.value : "해당 날짜의 전달사항이 없습니다.");
  }

  async function fetch3MonthAvg() {
    const d = new Date(selectedDate);
    const startOfRange = new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString().split('T')[0];
    const endOfRange = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
    let query = supabase.from("daily_perf").select("contract_amt, contract_cnt, user_id, date").gte("date", startOfRange).lt("date", endOfRange);
    if (!isAdmin) query = query.eq("user_id", user.id);
    const { data } = await query;
    if (data && data.length > 0) {
      const totalAmt = data.reduce((acc, curr) => acc + (Number(curr.contract_amt) || 0), 0);
      const totalCnt = data.reduce((acc, curr) => acc + (Number(curr.contract_cnt) || 0), 0);
      const uniqueMonths = new Set(data.map(item => item.date.substring(0, 7))).size;
      const divisor = uniqueMonths > 0 ? uniqueMonths : 3;
      setThreeMonthAvg({ amt: Math.round(totalAmt / divisor), cnt: Number((totalCnt / divisor).toFixed(1)) });
    } else { setThreeMonthAvg({ amt: 0, cnt: 0 }); }
  }

  const saveDailyNotice = async (val: string) => {
    setDailyAdminNotice(val);
    await supabase.from("team_settings").upsert({ key: `daily_instruction_${dateStr}`, value: val }, { onConflict: 'key' });
  };

  const savePrivateMemo = (val: string) => {
    setPrivateMemo(val);
    localStorage.setItem(`memo_${user.id}`, val);
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-5 shadow-sm z-10 font-black overflow-y-auto h-screen sticky top-0">
      <h2 className="text-2xl italic border-b-4 border-black pb-1 uppercase tracking-tighter text-center font-black">CONNECTION</h2>
      
      {/* [신규] 네비게이션 메뉴 섹션 */}
      <nav className="flex flex-col gap-2 mb-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest px-2 mb-1">Main Menu</p>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id as MenuType)}
            className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-black transition-all ${
              activeMenu === item.id 
              ? 'bg-black text-[#d4af37] shadow-lg scale-[1.02]' 
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* 기존 달력 섹션 */}
      <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-white p-2">
        <Calendar 
          onChange={(d: any) => onDateChange(d)} 
          value={selectedDate} 
          formatDay={(_, date) => date.getDate().toString()} 
          className="border-0 w-full font-black text-[12px]"
          calendarType="gregory"
        />
      </div>

      {/* 실적 요약 섹션 */}
      <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl">
        <p className="text-[9px] text-[#d4af37] opacity-60 uppercase italic mb-3 tracking-widest px-1">
          {isAdmin ? "Team 3-Month Avg" : "My 3-Month Avg"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center border-r border-white/10">
            <p className="text-[8px] text-white/40 uppercase mb-1">Amount</p>
            <p className="text-sm text-[#d4af37] italic font-black">{threeMonthAvg.amt.toLocaleString()}만</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-white/40 uppercase mb-1">Count</p>
            <p className="text-sm text-[#d4af37] italic font-black">{threeMonthAvg.cnt}건</p>
          </div>
        </div>
      </div>
      
      {/* 메모/전달사항 섹션 */}
      <div className="flex flex-col gap-4">
        <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 h-32 flex flex-col">
          <p className="text-[9px] font-black text-blue-600 uppercase italic mb-2 tracking-widest">Instruction</p>
          <textarea 
            value={dailyAdminNotice}
            onChange={(e) => isAdmin && saveDailyNotice(e.target.value)}
            readOnly={!isAdmin}
            className="w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none leading-relaxed text-blue-900"
          />
        </div>

        <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 h-32 flex flex-col">
          <p className="text-[9px] font-black text-amber-600 uppercase italic mb-2 tracking-widest">Private Memo</p>
          <textarea 
            value={privateMemo}
            onChange={(e) => savePrivateMemo(e.target.value)}
            className="w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none text-amber-900"
          />
        </div>
      </div>

      <button 
        onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} 
        className="w-full bg-slate-200 text-slate-500 py-4 rounded-[1.5rem] font-black text-[10px] uppercase italic hover:bg-black hover:text-[#d4af37] transition-all"
      >
        Logout System
      </button>

      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; font-size: 11px; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 10px !important; }
      `}</style>
    </aside>
  );
}