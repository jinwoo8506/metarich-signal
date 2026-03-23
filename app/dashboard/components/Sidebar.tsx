"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

// ✅ onMenuUpdate를 추가하여 사이드바의 설정 변경을 부모(Dashboard)에게 알림
export default function Sidebar({ user, selectedDate, onDateChange, mode, onBack, onMenuUpdate }: any) {
  const router = useRouter();
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  
  // ✅ 사이드바 내부에서 관리하는 메뉴 활성화 상태
  const [menuStatus, setMenuStatus] = useState<any>({
    show_finance: true,
    show_insu: true,
    show_cafe: true,
    show_hira: true,
    show_cont: true
  });
  const [isEditMode, setIsEditMode] = useState(false);

  const dateStr = selectedDate.toLocaleDateString('en-CA');
  const isAdmin = user.role === 'admin' || user.role === 'master';
  const isMaster = user.role === 'master';

  useEffect(() => {
    fetchDailyData();
    fetch3MonthAvg();
    fetchMenuSettings();
    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // DB에서 마스터 설정값 불러오기
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
      // 부모 컴포넌트(Dashboard)에도 초기값 전달
      if (onMenuUpdate) onMenuUpdate(settings);
    }
  }

  // 메뉴 상태 변경 로직
  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    const updatedStatus = { ...menuStatus, [key]: newValue };
    
    // 1. UI 즉시 반영 (사이드바)
    setMenuStatus(updatedStatus);
    
    // 2. 부모 컴포넌트에게 알려서 메인 화면 버튼 동기화
    if (onMenuUpdate) onMenuUpdate(updatedStatus);
    
    // 3. DB 저장
    await supabase
      .from("team_settings")
      .upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  async function fetchDailyData() {
    const { data } = await supabase.from("daily_stats").select("admin_notice").eq("date", dateStr).single();
    setDailyAdminNotice(data?.admin_notice || "");
  }

  async function fetch3MonthAvg() {
    const today = new Date();
    const startStr = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0];
    const { data } = await supabase.from("performance").select("amount, count").gte("date", startStr);

    if (data && data.length > 0) {
      const totalAmt = data.reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalCnt = data.reduce((sum, item) => sum + (item.count || 0), 0);
      setThreeMonthAvg({ amt: Math.floor(totalAmt / 3), cnt: Number((totalCnt / 3).toFixed(1)) });
    }
  }

  async function saveDailyNotice() {
    if (!isAdmin) return;
    const { error } = await supabase.from("daily_stats").upsert({ date: dateStr, admin_notice: dailyAdminNotice }, { onConflict: 'date' });
    if (!error) alert("공지사항이 저장되었습니다.");
  }

  const handleOpenLink = (url: string) => window.open(url, "_blank");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // 공통 메뉴 데이터 구조 (관리용)
  const menuConfig = [
    { id: 'show_finance', label: '재무 분석 도구', icon: '📊', url: '/financial_planner.html', color: 'border-black text-black' },
    { id: 'show_insu', label: '보장분석 탭', icon: '🛡️', url: '/insu.html', color: 'border-blue-600 text-blue-600' },
    { id: 'show_hira', label: '진료기록 확인', icon: '🏥', url: 'https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000&WT.gnb=내+진료정보+열람', color: 'border-orange-500 text-orange-600' },
    { id: 'show_cont', label: '숨은 보험금 찾기', icon: '🔍', url: 'https://cont.insure.or.kr/cont_web/intro.do', color: 'border-emerald-500 text-emerald-600' },
    { id: 'show_cafe', label: '성장연구소 카페', icon: '☕', url: 'https://cafe.naver.com/signal1035', color: 'border-[#2db400] text-[#2db400]' }
  ];

  return (
    <aside className="w-full lg:w-80 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      
      {/* 상단 뒤로가기 */}
      <button onClick={onBack} className="text-left text-[10px] text-slate-400 hover:text-black mb-[-10px] transition-colors flex items-center gap-1 group font-black italic">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> BACK TO SELECTOR
      </button>

      {/* 헤더 */}
      <div className="flex justify-between items-center border-b-4 border-black pb-1">
        <h2 className="text-2xl italic uppercase tracking-tighter font-black">
          {mode === 'office' ? 'History' : 'Consult'}
        </h2>
        {isMaster && (
          <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-2 py-1 rounded font-bold transition-colors ${isEditMode ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {isEditMode ? "완료" : "⚙️ 메뉴 관리"}
          </button>
        )}
      </div>
      
      {/* 사무실 모드 전용 위젯 (달력, 실적) */}
      {mode === 'office' && (
        <>
          <div className="flex justify-center bg-slate-50 p-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Calendar onChange={onDateChange} value={selectedDate} formatDay={(l, d) => d.getDate().toString()} className="border-none bg-transparent font-black"/>
          </div>
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
        </>
      )}
      
      {/* 퀵 링크 섹션 (관리자 설정 반영) */}
      <div className="px-1 space-y-3">
        <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Quick Links</p>
        
        {menuConfig.map((item) => (
          (menuStatus[item.id] || isEditMode) && (
            <div key={item.id} className="relative">
              <button 
                onClick={() => !isEditMode && handleOpenLink(item.url)} 
                className={`w-full flex items-center justify-center gap-3 py-3 border-2 ${item.color} rounded-xl transition-all shadow-sm active:scale-95 ${menuStatus[item.id] ? 'bg-white' : 'bg-gray-100 opacity-40'}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[11px] font-black">{item.label}</span>
              </button>
              {isEditMode && (
                <input 
                  type="checkbox" 
                  checked={menuStatus[item.id]} 
                  onChange={() => toggleMenu(item.id)} 
                  className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 cursor-pointer accent-black"
                />
              )}
            </div>
          )
        ))}
      </div>

      {/* 하단 메모 및 공지 (사무실 모드 전용) */}
      <div className="flex flex-col gap-4 mt-auto">
        {mode === 'office' && (
          <>
            <div>
              <div className="flex justify-between items-center mb-1 px-1 text-[9px] text-slate-400 uppercase italic font-black">
                <span>Admin Notice</span>
                {isAdmin && <button onClick={saveDailyNotice} className="text-blue-600 hover:underline">SAVE</button>}
              </div>
              <textarea readOnly={!isAdmin} value={dailyAdminNotice} onChange={(e) => setDailyAdminNotice(e.target.value)} className="w-full h-20 p-3 text-[11px] border-2 border-black rounded-xl bg-yellow-50 resize-none font-bold" placeholder="관리자 공지가 없습니다."/>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase italic mb-1 px-1 font-black">Private Memo</p>
              <textarea value={privateMemo} onChange={(e) => {setPrivateMemo(e.target.value); localStorage.setItem(`memo_${user.id}`, e.target.value);}} className="w-full h-20 p-3 text-[11px] border-2 border-slate-200 rounded-xl bg-slate-50 resize-none font-bold italic" placeholder="나만의 메모..."/>
            </div>
          </>
        )}
        <button onClick={handleLogout} className="w-full py-3 text-[11px] font-black text-slate-400 hover:text-red-500 border-t border-slate-100 transition-colors uppercase">Logout System</button>
      </div>
    </aside>
  );
}