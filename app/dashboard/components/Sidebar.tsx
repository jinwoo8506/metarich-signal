"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange, mode, onBack, onMenuUpdate }: any) {
  const router = useRouter();
  
  // --- 상태 관리 (기존 기능 유지) ---
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 마스터 메뉴 제어 상태 (초기값 true로 설정하여 누락 방지)
  const [menuStatus, setMenuStatus] = useState<any>({
    show_finance: true,
    show_insu: true,
    show_hira: true,
    show_cont: true,
    show_cafe: true
  });

  const dateStr = selectedDate.toLocaleDateString('en-CA');
  const isAdmin = user.role === 'admin' || user.role === 'master';
  const isMaster = user.role === 'master';

  // --- 데이터 로드 (실행 순서 보장) ---
  useEffect(() => {
    const loadAllData = async () => {
      await fetchMenuSettings(); // 메뉴 활성화 정보
      await fetch3MonthAvg();    // 실적 데이터 (작동 보정)
      await fetchDailyData();    // 관리자 공지
    };
    loadAllData();

    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // 1. 실적 계산 로직 (기존 기능 복구 및 강화)
  async function fetch3MonthAvg() {
    try {
      const today = new Date();
      // 최근 3개월의 시작점 계산 (이번 달 포함)
      const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const startStr = startDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("performance")
        .select("amount, count")
        .gte("date", startStr);

      if (error) throw error;

      if (data && data.length > 0) {
        // 숫자 변환 시 콤마 등 특수문자 제거 후 계산
        const totalAmt = data.reduce((sum, item) => {
          const val = typeof item.amount === 'string' 
            ? Number(item.amount.replace(/[^0-9.-]+/g,"")) 
            : Number(item.amount);
          return sum + (val || 0);
        }, 0);
        
        const totalCnt = data.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
        
        setThreeMonthAvg({
          amt: Math.floor(totalAmt / 3),
          cnt: Number((totalCnt / 3).toFixed(1))
        });
      } else {
        setThreeMonthAvg({ amt: 0, cnt: 0 });
      }
    } catch (err) {
      console.error("실적 로드 오류:", err);
    }
  }

  // 2. 관리자 메뉴 설정 로드
  async function fetchMenuSettings() {
    const { data } = await supabase.from("team_settings").select("key, value");
    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      const newStatus = { ...menuStatus, ...settings };
      setMenuStatus(newStatus);
      if (onMenuUpdate) onMenuUpdate(newStatus);
    }
  }

  // 3. 관리자 공지 로드
  async function fetchDailyData() {
    const { data } = await supabase
      .from("daily_stats")
      .select("admin_notice")
      .eq("date", dateStr)
      .maybeSingle();
    setDailyAdminNotice(data?.admin_notice || "");
  }

  // 4. 메뉴 제어 토글 (마스터 전용)
  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    const updatedStatus = { ...menuStatus, [key]: newValue };
    setMenuStatus(updatedStatus);
    if (onMenuUpdate) onMenuUpdate(updatedStatus);
    await supabase.from("team_settings").upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  // 5. 관리자 공지 저장
  async function saveDailyNotice() {
    if (!isAdmin) return;
    const { error } = await supabase
      .from("daily_stats")
      .upsert({ date: dateStr, admin_notice: dailyAdminNotice }, { onConflict: 'date' });
    if (!error) alert("공지사항이 저장되었습니다.");
  }

  const handleOpenLink = (url: string) => window.open(url, "_blank");
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // 퀵링크 버튼 설정 데이터
  const menuConfig = [
    { id: 'show_finance', label: '재무 분석 도구', icon: '📊', url: '/financial_planner.html', color: 'border-slate-800' },
    { id: 'show_insu', label: '보장분석 탭', icon: '🛡️', url: '/insu.html', color: 'border-blue-600' },
    { id: 'show_hira', label: '진료기록 확인', icon: '🏥', url: 'https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000&WT.gnb=내+진료정보+열람', color: 'border-orange-500' },
    { id: 'show_cont', label: '숨은 보험금 찾기', icon: '🔍', url: 'https://cont.insure.or.kr/cont_web/intro.do', color: 'border-emerald-500' },
    { id: 'show_cafe', label: '성장연구소 카페', icon: '☕', url: 'https://cafe.naver.com/signal1035', color: 'border-[#2db400]' }
  ];

  return (
    <aside className="w-full lg:w-80 bg-white border-r-[3px] border-slate-200 p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      
      {/* --- 상단 영역: 뒤로가기 & 타이틀 --- */}
      <div className="flex flex-col gap-4 border-b-2 border-slate-100 pb-4">
        <button onClick={onBack} className="text-left text-[11px] text-slate-400 hover:text-black flex items-center gap-1 font-black italic transition-all group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> BACK TO SELECTOR
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-3xl italic uppercase tracking-tighter font-black text-slate-900">
            {mode === 'office' ? 'Office' : 'Consult'}
          </h2>
          {isMaster && (
            <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-2 py-1.5 rounded-md border-2 font-bold transition-all shadow-sm ${isEditMode ? 'bg-red-500 text-white border-red-700' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}>
              {isEditMode ? "편집완료" : "MENU ⚙️"}
            </button>
          )}
        </div>
      </div>
      
      {/* --- 중단 영역: 업무용 위젯 (사무실 모드일 때만) --- */}
      {mode === 'office' && (
        <div className="flex flex-col gap-6">
          {/* 달력 위젯 */}
          <div className="bg-slate-50 p-2 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Calendar onChange={onDateChange} value={selectedDate} formatDay={(l, d) => d.getDate().toString()} className="border-none bg-transparent font-black w-full"/>
          </div>
          
          {/* 실적 요약 위젯 (경계 및 디자인 강화) */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(67,97,238,1)]">
            <p className="text-[10px] uppercase text-blue-400 mb-3 font-black italic tracking-widest text-center border-b border-slate-700 pb-1">Performance Average (3M)</p>
            <div className="flex justify-between items-center px-2">
              <div className="text-center">
                <p className="text-2xl font-black italic">₩{threeMonthAvg.amt.toLocaleString()}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-1">REVENUE</p>
              </div>
              <div className="w-[1px] h-10 bg-slate-700 mx-2"></div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-400">{threeMonthAvg.cnt}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-1">CASES</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* --- 하단 영역: 퀵 링크 (경계선 명확히 구분) --- */}
      <div className="flex flex-col gap-3 py-6 border-y-2 border-slate-100">
        <p className="text-[10px] text-slate-400 uppercase italic font-black mb-1 px-1 tracking-widest text-center">Quick Access Links</p>
        <div className="grid gap-3">
          {menuConfig.map((item) => (
            (menuStatus[item.id] || isEditMode) && (
              <div key={item.id} className="relative group">
                <button 
                  onClick={() => !isEditMode && handleOpenLink(item.url)} 
                  className={`w-full flex items-center justify-between px-5 py-4 border-2 ${item.color} rounded-xl transition-all shadow-sm active:scale-95 ${menuStatus[item.id] ? 'bg-white hover:bg-slate-50' : 'bg-slate-100 opacity-20'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[13px] font-black uppercase text-slate-800 tracking-tight">{item.label}</span>
                  </div>
                  <span className="text-slate-300 group-hover:text-slate-900 transition-colors">→</span>
                </button>
                {isEditMode && (
                  <input 
                    type="checkbox" 
                    checked={menuStatus[item.id]} 
                    onChange={() => toggleMenu(item.id)} 
                    className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-6 h-6 cursor-pointer accent-blue-600 shadow-lg z-20"
                  />
                )}
              </div>
            )
          ))}
        </div>
      </div>

      {/* --- 최하단: 공지/메모 & 로그아웃 --- */}
      <div className="flex flex-col gap-6 mt-auto pt-4">
        {mode === 'office' && (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black italic px-1 uppercase tracking-tighter">
                <span className="text-slate-500">Admin Notice</span>
                {isAdmin && <button onClick={saveDailyNotice} className="text-blue-600 hover:text-blue-800 hover:underline">SAVE</button>}
              </div>
              <textarea 
                readOnly={!isAdmin} 
                value={dailyAdminNotice} 
                onChange={(e) => setDailyAdminNotice(e.target.value)}
                className="w-full h-24 p-3 text-[12px] border-2 border-slate-900 rounded-xl bg-yellow-50 font-bold outline-none shadow-inner" 
                placeholder="공지사항이 비어있습니다."
              />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black italic px-1 uppercase tracking-tighter">Private Memo</p>
              <textarea 
                value={privateMemo} 
                onChange={(e) => {setPrivateMemo(e.target.value); localStorage.setItem(`memo_${user.id}`, e.target.value);}} 
                className="w-full h-24 p-3 text-[12px] border-2 border-slate-200 rounded-xl font-bold italic outline-none bg-slate-50 focus:bg-white focus:border-slate-900 transition-all shadow-inner" 
                placeholder="나만의 메모를 입력하세요..." 
              />
            </div>
          </div>
        )}
        
        {/* 로그아웃 버튼 (확실한 경계 및 디자인) */}
        <button 
          onClick={handleLogout} 
          className="w-full py-5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 text-[11px] font-black border-2 border-dashed border-slate-200 hover:border-red-200 rounded-xl transition-all uppercase tracking-[0.2em] shadow-sm"
        >
          Logout System
        </button>
      </div>
    </aside>
  );
}