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
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const isAdmin = user.role === 'admin' || user.role === 'master';
  const isMaster = user.role === 'master';

  const [menuStatus, setMenuStatus] = useState<any>({
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, show_cont: true
  });
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg();
    fetchMenuSettings();
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  async function fetchMenuSettings() {
    const { data } = await supabase.from("team_settings").select("key, value");
    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      setMenuStatus((prev: any) => ({ ...prev, ...settings }));
    }
  }

  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    setMenuStatus((prev: any) => ({ ...prev, [key]: newValue }));
    await supabase.from("team_settings").upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

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

  // 📈 [수정 핵심] 실적 계산 로직 보정
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
      
      // ✅ 기존 uniqueMonths를 무시하고 3개월 평균이므로 무조건 3으로 나눕니다.
      const divisor = 3; 

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
    await supabase
      .from("team_settings")
      .upsert({ key: `daily_instruction_${dateStr}`, value: val }, { onConflict: 'key' });
  };

  const savePrivateMemo = (val: string) => {
    setPrivateMemo(val);
    localStorage.setItem(`memo_${user.id}`, val);
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      
      <button onClick={onBack} className="text-left text-[10px] text-slate-400 hover:text-black mb-[-15px] font-black italic tracking-tighter transition-all">
        ← BACK TO SELECTOR
      </button>

      <div className="flex justify-between items-center border-b-4 border-black pb-1">
        <h2 className="text-2xl italic uppercase tracking-tighter font-black">
          {mode === 'office' ? 'History' : 'Consult'}
        </h2>
        {isMaster && (
          <button 
            onClick={() => setIsEditMode(!isEditMode)} 
            className={`text-[9px] px-2 py-1 rounded-full font-black ${isEditMode ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            {isEditMode ? "FINISH" : "CONFIG"}
          </button>
        )}
      </div>
      
      {mode === 'office' && (
        <>
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
        </>
      )}
      
      <div className="px-1 space-y-3">
        <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Quick Links</p>
        
        {[
          { id: 'show_finance', label: '재무 분석 도구', icon: '📊', url: '/financial_planner.html', color: 'border-black' },
          { id: 'show_insu', label: '보장분석 PRO(유료)', icon: '🛡️', url: '/insu.html', color: 'border-blue-600' },
          { id: 'show_hira', label: '진료기록 확인', icon: '🏥', url: 'https://www.hira.or.kr/...', color: 'border-orange-500' },
          { id: 'show_cont', label: '숨은 보험금 찾기', icon: '🔍', url: 'https://cont.insure.or.kr/...', color: 'border-emerald-500' },
          { id: 'show_cafe', label: '성장연구소 카페', icon: '☕', url: 'https://cafe.naver.com/signal1035', color: 'border-[#2db400]' }
        ].map((item) => (
          (menuStatus[item.id] || isEditMode) && (
            <div key={item.id} className="relative group">
              <button 
                onClick={() => !isEditMode && window.open(item.url, "_blank")}
                className={`w-full flex items-center justify-center gap-3 py-4 border-2 ${item.color} rounded-[1.5rem] bg-white hover:bg-black hover:text-[#d4af37] transition-all active:scale-95 ${!menuStatus[item.id] && 'opacity-30 grayscale'}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[12px] font-black tracking-tight">{item.label}</span>
              </button>
              {isEditMode && (
                <input 
                  type="checkbox" 
                  checked={menuStatus[item.id]} 
                  onChange={() => toggleMenu(item.id)}
                  className="absolute -top-1 -right-1 w-6 h-6 accent-black cursor-pointer z-20 shadow-sm"
                />
              )}
            </div>
          )
        ))}
      </div>

      {mode === 'office' && (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 p-5 rounded-[2.5rem] border border-blue-100 flex flex-col h-40">
            <p className="text-[9px] font-black text-blue-600 uppercase italic mb-2 tracking-widest">Daily Instruction</p>
            <textarea 
              value={dailyAdminNotice}
              onChange={(e) => isAdmin && saveDailyNotice(e.target.value)}
              readOnly={!isAdmin}
              className={`w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none leading-relaxed text-blue-900 ${!isAdmin ? 'cursor-default' : 'p-1 bg-white/30 rounded-lg'}`}
            />
          </div>

          <div className="bg-amber-50 p-5 rounded-[2.5rem] border border-amber-100 flex flex-col h-40 font-black">
            <p className="text-[9px] font-black text-amber-600 uppercase italic mb-2 tracking-widest">Private Memo</p>
            <textarea 
              value={privateMemo}
              onChange={(e) => savePrivateMemo(e.target.value)}
              className="w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none text-amber-900 leading-relaxed"
            />
          </div>
        </div>
      )}

      <button 
        onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} 
        className="w-full bg-black text-[#d4af37] py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-xl italic mt-auto"
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