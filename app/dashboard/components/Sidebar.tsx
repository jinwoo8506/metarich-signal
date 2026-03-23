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
  
  // ✅ 사이드바 버튼 활성화 상태 관리
  const [menuStatus, setMenuStatus] = useState({
    show_finance: true,
    show_insu: true,
    show_cafe: true
  });
  const [isEditMode, setIsEditMode] = useState(false); // 마스터 전용 편집 모드

  const dateStr = selectedDate.toLocaleDateString('en-CA');
  const isAdmin = user.role === 'admin' || user.role === 'master';
  const isMaster = user.role === 'master';

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg();
    fetchMenuSettings(); // 메뉴 설정 불러오기
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // 1. 메뉴 활성화 상태 불러오기 (Supabase)
  async function fetchMenuSettings() {
    const { data } = await supabase
      .from("team_settings")
      .select("key, value")
      .in("key", ["show_finance", "show_insu", "show_cafe"]);

    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      setMenuStatus(prev => ({ ...prev, ...settings }));
    }
  }

  // 2. 마스터가 메뉴 상태 변경 시 DB 저장
  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    setMenuStatus(prev => ({ ...prev, [key]: newValue }));
    
    await supabase
      .from("team_settings")
      .upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  // 기존 데이터 불러오기 로직 (복원)
  async function fetchDailyData() {
    const { data } = await supabase
      .from("daily_stats")
      .select("admin_notice")
      .eq("date", dateStr)
      .single();
    setDailyAdminNotice(data?.admin_notice || "");
  }

  async function fetch3MonthAvg() {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const startStr = threeMonthsAgo.toISOString().split('T')[0];
    
    const { data } = await supabase
      .from("performance")
      .select("amount, count")
      .gte("date", startStr);

    if (data && data.length > 0) {
      const totalAmt = data.reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalCnt = data.reduce((sum, item) => sum + (item.count || 0), 0);
      setThreeMonthAvg({
        amt: Math.floor(totalAmt / 3),
        cnt: Number((totalCnt / 3).toFixed(1))
      });
    }
  }

  // 관리자 공지 저장
  async function saveDailyNotice() {
    if (!isAdmin) return;
    const { error } = await supabase
      .from("daily_stats")
      .upsert({ date: dateStr, admin_notice: dailyAdminNotice }, { onConflict: 'date' });
    
    if (!error) alert("공지사항이 저장되었습니다.");
  }

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      {/* 헤더 섹션 */}
      <div className="flex justify-between items-center border-b-4 border-black pb-1">
        <h2 className="text-2xl italic uppercase tracking-tighter font-black">History</h2>
        {isMaster && (
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`text-[10px] px-2 py-1 rounded font-bold transition-colors ${isEditMode ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            {isEditMode ? "설정 완료" : "⚙️ 메뉴 관리"}
          </button>
        )}
      </div>
      
      {/* 1. 달력 영역 */}
      <div className="flex justify-center bg-slate-50 p-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <Calendar 
          onChange={onDateChange} 
          value={selectedDate} 
          formatDay={(locale, date) => date.getDate().toString()}
          className="border-none bg-transparent font-black"
        />
      </div>
      
      {/* 2. 실적 요약 */}
      <div className="bg-black text-white p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(67,97,238,1)]">
        <p className="text-[10px] uppercase italic text-slate-400 mb-2 font-black">3-Month Average Performance</p>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-black italic">₩{threeMonthAvg.amt.toLocaleString()}</p>
            <p className="text-[10px] text-blue-400 font-bold">Monthly Avg Revenue</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black">{threeMonthAvg.cnt}건</p>
            <p className="text-[10px] text-slate-400 font-bold">Avg Count</p>
          </div>
        </div>
      </div>
      
      {/* 3. 퀵 링크 버튼 섹션 */}
      <div className="px-1 space-y-3">
        <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Community & Tools</p>
        
        {/* 재무 분석 도구 */}
        {(menuStatus.show_finance || isEditMode) && (
          <div className="relative">
            <button 
              onClick={() => !isEditMode && handleOpenLink("/financial_planner.html")}
              className={`w-full flex items-center justify-center gap-3 py-3.5 border-2 border-black rounded-[1.5rem] transition-all group shadow-sm active:scale-95 
                ${menuStatus.show_finance ? 'bg-[#f8fafc]' : 'bg-gray-100 opacity-40'}`}
            >
              <span className="text-xl">📊</span>
              <span className="text-[12px] font-black tracking-tight">재무 분석 도구</span>
            </button>
            {isEditMode && (
              <input 
                type="checkbox" 
                checked={menuStatus.show_finance} 
                onChange={() => toggleMenu("show_finance")} 
                className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-5 h-5 accent-black cursor-pointer"
              />
            )}
          </div>
        )}

        {/* 보장분석 탭 */}
        {(menuStatus.show_insu || isEditMode) && (
          <div className="relative">
            <button 
              onClick={() => !isEditMode && handleOpenLink("/insu.html")}
              className={`w-full flex items-center justify-center gap-3 py-3.5 border-2 border-blue-600 rounded-[1.5rem] transition-all group shadow-sm active:scale-95
                ${menuStatus.show_insu ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-400 opacity-40'}`}
            >
              <span className="text-xl">🛡️</span>
              <span className="text-[12px] font-black tracking-tight">보장분석 탭</span>
            </button>
            {isEditMode && (
              <input 
                type="checkbox" 
                checked={menuStatus.show_insu} 
                onChange={() => toggleMenu("show_insu")} 
                className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-5 h-5 accent-blue-600 cursor-pointer"
              />
            )}
          </div>
        )}

        {/* 카페 버튼 */}
        {(menuStatus.show_cafe || isEditMode) && (
          <div className="relative">
            <button 
              onClick={() => !isEditMode && handleOpenLink("https://cafe.naver.com/signal1035")}
              className={`w-full flex items-center justify-center gap-3 py-3.5 border-2 border-[#2db400] rounded-[1.5rem] transition-all group shadow-sm active:scale-95
                ${menuStatus.show_cafe ? 'bg-white text-[#2db400]' : 'bg-gray-100 text-gray-400 opacity-40'}`}
            >
              <span className="text-xl">☕</span>
              <span className="text-[12px] font-black tracking-tight">성장연구소 카페</span>
            </button>
            {isEditMode && (
              <input 
                type="checkbox" 
                checked={menuStatus.show_cafe} 
                onChange={() => toggleMenu("show_cafe")} 
                className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-5 h-5 accent-[#2db400] cursor-pointer"
              />
            )}
          </div>
        )}
      </div>

      {/* 4. 공지 및 개인 메모 */}
      <div className="flex flex-col gap-4 mt-auto">
        <div>
          <div className="flex justify-between items-center mb-1 px-1">
            <p className="text-[9px] text-slate-400 uppercase italic tracking-widest font-black">Admin Notice</p>
            {isAdmin && <button onClick={saveDailyNotice} className="text-[9px] font-black text-blue-600 hover:underline">SAVE</button>}
          </div>
          <textarea 
            readOnly={!isAdmin}
            value={dailyAdminNotice}
            onChange={(e) => setDailyAdminNotice(e.target.value)}
            className="w-full h-20 p-3 text-[11px] border-2 border-black rounded-xl bg-yellow-50 resize-none font-bold"
            placeholder="관리자 공지사항이 없습니다."
          />
        </div>

        <div>
          <p className="text-[9px] text-slate-400 uppercase italic mb-1 px-1 tracking-widest font-black">Private Memo</p>
          <textarea 
            value={privateMemo}
            onChange={(e) => {
              setPrivateMemo(e.target.value);
              localStorage.setItem(`memo_${user.id}`, e.target.value);
            }}
            className="w-full h-20 p-3 text-[11px] border-2 border-slate-200 rounded-xl bg-slate-50 resize-none font-bold italic"
            placeholder="나만의 메모를 입력하세요..."
          />
        </div>

        <button 
          onClick={handleLogout}
          className="w-full py-3 text-[11px] font-black text-slate-400 hover:text-red-500 transition-colors border-t border-slate-100"
        >
          LOGOUT SYSTEM
        </button>
      </div>
    </aside>
  );
}