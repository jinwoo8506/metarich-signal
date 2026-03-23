"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange, mode, onBack, onMenuUpdate }: any) {
  const router = useRouter();
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  
  const [menuStatus, setMenuStatus] = useState<any>({
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, show_cont: true
  });
  const [isEditMode, setIsEditMode] = useState(false);

  const dateStr = selectedDate.toLocaleDateString('en-CA');
  const isAdmin = user.role === 'admin' || user.role === 'master';
  const isMaster = user.role === 'master';

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg(); // ✅ 실적 데이터 호출
    fetchMenuSettings();
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  async function fetchMenuSettings() {
    const { data } = await supabase
      .from("team_settings")
      .select("key, value")
      .in("key", ["show_finance", "show_insu", "show_cafe", "show_hira", "show_cont"]);

    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      setMenuStatus(settings);
      if (onMenuUpdate) onMenuUpdate(settings);
    }
  }

  // ✅ 실적 데이터 계산 로직 보완
  async function fetch3MonthAvg() {
    const today = new Date();
    // 3개월 전의 1일 구하기
    const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const startStr = startDate.toISOString().split('T')[0];
    
    // 'performance' 테이블에서 현재 로그인한 유저의 데이터를 가져옴 (필요시 유저 필터링 추가)
    const { data, error } = await supabase
      .from("performance")
      .select("amount, count")
      .gte("date", startStr);

    if (error) {
      console.error("실적 데이터 로드 실패:", error);
      return;
    }

    if (data && data.length > 0) {
      const totalAmt = data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const totalCnt = data.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
      
      // 단순히 3으로 나누는 것이 아니라 데이터가 있는 '달'의 수로 나누거나 3개월 고정 평균
      setThreeMonthAvg({
        amt: Math.floor(totalAmt / 3),
        cnt: Number((totalCnt / 3).toFixed(1))
      });
    } else {
      setThreeMonthAvg({ amt: 0, cnt: 0 }); // 데이터 없을 시 초기화
    }
  }

  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    const updatedStatus = { ...menuStatus, [key]: newValue };
    setMenuStatus(updatedStatus);
    if (onMenuUpdate) onMenuUpdate(updatedStatus);
    await supabase.from("team_settings").upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  async function fetchDailyData() {
    const { data } = await supabase.from("daily_stats").select("admin_notice").eq("date", dateStr).single();
    setDailyAdminNotice(data?.admin_notice || "");
  }

  async function saveDailyNotice() {
    if (!isAdmin) return;
    const { error } = await supabase.from("daily_stats").upsert({ date: dateStr, admin_notice: dailyAdminNotice }, { onConflict: 'date' });
    if (!error) alert("공지사항이 저장되었습니다.");
  }

  const handleOpenLink = (url: string) => window.open(url, "_blank");
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const menuConfig = [
    { id: 'show_finance', label: '재무 분석 도구', icon: '📊', url: '/financial_planner.html', color: 'border-slate-900 text-slate-900' },
    { id: 'show_insu', label: '보장분석 탭', icon: '🛡️', url: '/insu.html', color: 'border-blue-600 text-blue-600' },
    { id: 'show_hira', label: '진료기록 확인', icon: '🏥', url: 'https://www.hira.or.kr/...', color: 'border-orange-500 text-orange-600' },
    { id: 'show_cont', label: '숨은 보험금 찾기', icon: '🔍', url: 'https://cont.insure.or.kr/...', color: 'border-emerald-500 text-emerald-600' },
    { id: 'show_cafe', label: '성장연구소 카페', icon: '☕', url: 'https://cafe.naver.com/...', color: 'border-[#2db400] text-[#2db400]' }
  ];

  return (
    <aside className="w-full lg:w-80 bg-white border-r-2 border-slate-200 p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      
      {/* 1. 상단 내비게이션 (경계 강화) */}
      <div className="flex flex-col gap-4 border-b-2 border-slate-100 pb-4">
        <button onClick={onBack} className="text-left text-[11px] text-slate-400 hover:text-black flex items-center gap-1 font-black italic transition-all">
          ← BACK TO SELECTOR
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl italic uppercase tracking-tighter font-black underline decoration-blue-500 decoration-4 underline-offset-4">
            {mode === 'office' ? 'History' : 'Consult'}
          </h2>
          {isMaster && (
            <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-2 py-1 rounded-md font-bold shadow-sm border ${isEditMode ? 'bg-red-500 text-white border-red-600' : 'bg-white text-slate-700 border-slate-300'}`}>
              {isEditMode ? "편집완료" : "⚙️ 관리"}
            </button>
          )}
        </div>
      </div>
      
      {/* 2. 업무 모드 위젯 (달력 & 실적) */}
      {mode === 'office' && (
        <div className="flex flex-col gap-6">
          <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Calendar onChange={onDateChange} value={selectedDate} formatDay={(l, d) => d.getDate().toString()} className="border-none bg-transparent font-black w-full"/>
          </div>
          
          <div className="bg-slate-900 text-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(67,97,238,1)]">
            <p className="text-[10px] uppercase italic text-blue-400 mb-2 font-black tracking-widest">3-Month Avg Performance</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-2xl font-black italic">₩{threeMonthAvg.amt.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold">Monthly Revenue</p>
              </div>
              <div className="text-right border-l border-slate-700 pl-4">
                <p className="text-xl font-black text-blue-400">{threeMonthAvg.cnt}건</p>
                <p className="text-[10px] text-slate-400 font-bold">Avg Count</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 3. 퀵 링크 섹션 (버튼 경계 명확화) */}
      <div className="flex flex-col gap-3 py-4 border-y-2 border-slate-100">
        <p className="text-[10px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Quick Tools</p>
        {menuConfig.map((item) => (
          (menuStatus[item.id] || isEditMode) && (
            <div key={item.id} className="relative group">
              <button 
                onClick={() => !isEditMode && handleOpenLink(item.url)} 
                className={`w-full flex items-center justify-between px-5 py-3.5 border-2 ${item.color} rounded-xl transition-all shadow-sm active:scale-95 ${menuStatus[item.id] ? 'bg-white hover:bg-slate-50' : 'bg-slate-100 opacity-30'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[12px] font-black uppercase tracking-tight">{item.label}</span>
                </div>
                <span className="text-[10px] opacity-30 group-hover:opacity-100">→</span>
              </button>
              {isEditMode && (
                <input type="checkbox" checked={menuStatus[item.id]} onChange={() => toggleMenu(item.id)} className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-5 h-5 cursor-pointer accent-blue-600 z-20"/>
              )}
            </div>
          )
        ))}
      </div>

      {/* 4. 하단 공지/메모 & 로그아웃 (명확한 하단 고정) */}
      <div className="flex flex-col gap-5 mt-auto pt-4">
        {mode === 'office' && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-black italic px-1">
                <span>ADMIN NOTICE</span>
                {isAdmin && <button onClick={saveDailyNotice} className="text-blue-600 hover:underline">SAVE</button>}
              </div>
              <textarea readOnly={!isAdmin} value={dailyAdminNotice} onChange={(e) => setDailyAdminNotice(e.target.value)} className="w-full h-24 p-3 text-[12px] border-2 border-slate-900 rounded-xl bg-yellow-50 font-bold focus:ring-2 ring-yellow-200 outline-none" placeholder="공지사항이 없습니다."/>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-black italic px-1">PRIVATE MEMO</p>
              <textarea value={privateMemo} onChange={(e) => {setPrivateMemo(e.target.value); localStorage.setItem(`memo_${user.id}`, e.target.value);}} className="w-full h-24 p-3 text-[12px] border-2 border-slate-200 rounded-xl bg-white font-bold italic outline-none focus:border-slate-900 transition-colors" placeholder="메모를 입력하세요..."/>
            </div>
          </>
        )}
        
        {/* 로그아웃 버튼 (디자인 강조) */}
        <button 
          onClick={handleLogout} 
          className="w-full py-4 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 text-[11px] font-black border-2 border-dashed border-slate-200 hover:border-red-200 rounded-xl transition-all uppercase tracking-widest"
        >
          Logout System
        </button>
      </div>
    </aside>
  );
}