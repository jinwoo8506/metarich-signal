"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange, mode, onBack, onMenuUpdate }: any) {
  const router = useRouter();
  
  // 상태 관리
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 마스터 메뉴 제어 상태 (초기값 true)
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

  useEffect(() => {
    const loadAllData = async () => {
      await fetchMenuSettings();
      await fetch3MonthAvg();    // ✅ 실적 데이터 로드 함수 호출
      await fetchDailyData();
    };
    loadAllData();

    const savedPrivate = localStorage.getItem(`memo_${user.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user.id]);

  // 📈 3개월 평균 실적 계산 로직 (AdminView의 로직과 동기화)
  async function fetch3MonthAvg() {
    try {
      const today = new Date();
      // 이번 달 1일 기준 최근 3개월 시작일 산출
      const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const startStr = startDate.toISOString().split('T')[0];
      
      // AdminView에서 실적을 daily_perf 또는 performance 중 어디에 저장하는지 확인 필요
      // 여기서는 일반적인 'performance' 테이블 기준으로 작성하되 필드명을 강화합니다.
      const { data, error } = await supabase
        .from("performance") // 💡 만약 테이블명이 'daily_perf'라면 이 부분을 수정하세요.
        .select("contract_amt, contract_cnt, amount, count, date")
        .eq("user_id", user.id) // 본인 데이터만
        .gte("date", startStr);

      if (error) throw error;

      if (data && data.length > 0) {
        let totalAmt = 0;
        let totalCnt = 0;

        data.forEach(item => {
          // AdminView의 필드명(contract_amt)과 일반 필드명(amount) 모두 대응
          const amt = Number(item.contract_amt || item.amount || 0);
          const cnt = Number(item.contract_cnt || item.count || 0);
          totalAmt += amt;
          totalCnt += cnt;
        });

        setThreeMonthAvg({
          amt: Math.floor(totalAmt / 3),
          cnt: Number((totalCnt / 3).toFixed(1))
        });
      } else {
        setThreeMonthAvg({ amt: 0, cnt: 0 });
      }
    } catch (err) {
      console.error("사이드바 실적 로드 오류:", err);
    }
  }

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

  async function fetchDailyData() {
    const { data } = await supabase
      .from("daily_stats")
      .select("admin_notice")
      .eq("date", dateStr)
      .maybeSingle();
    setDailyAdminNotice(data?.admin_notice || "");
  }

  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    const updatedStatus = { ...menuStatus, [key]: newValue };
    setMenuStatus(updatedStatus);
    if (onMenuUpdate) onMenuUpdate(updatedStatus);
    await supabase.from("team_settings").upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  const handleOpenLink = (url: string) => window.open(url, "_blank");
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const menuConfig = [
    { id: 'show_finance', label: '재무 분석 도구', icon: '📊', url: '/financial_planner.html', color: 'border-slate-800' },
    { id: 'show_insu', label: '보장분석 탭', icon: '🛡️', url: '/insu.html', color: 'border-blue-600' },
    { id: 'show_hira', label: '진료기록 확인', icon: '🏥', url: 'https://www.hira.or.kr/...', color: 'border-orange-500' },
    { id: 'show_cont', label: '숨은 보험금 찾기', icon: '🔍', url: 'https://cont.insure.or.kr/...', color: 'border-emerald-500' },
    { id: 'show_cafe', label: '성장연구소 카페', icon: '☕', url: 'https://cafe.naver.com/...', color: 'border-[#2db400]' }
  ];

  return (
    <aside className="w-full lg:w-80 bg-white border-r-[3px] border-slate-200 p-6 flex flex-col gap-6 shadow-sm z-10 font-black overflow-y-auto min-h-screen">
      
      {/* 헤더 섹션 */}
      <div className="flex flex-col gap-4 border-b-2 border-slate-100 pb-4">
        <button onClick={onBack} className="text-left text-[11px] text-slate-400 hover:text-black flex items-center gap-1 font-black italic group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> BACK
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl italic uppercase tracking-tighter font-black text-slate-900">
            {mode === 'office' ? 'Office' : 'Consult'}
          </h2>
          {isMaster && (
            <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-2 py-1.5 rounded-md border-2 font-bold transition-all ${isEditMode ? 'bg-red-500 text-white border-red-700' : 'bg-white border-slate-200'}`}>
              {isEditMode ? "완료" : "MENU ⚙️"}
            </button>
          )}
        </div>
      </div>
      
      {/* 업무 전용 위젯 (실적 강조) */}
      {mode === 'office' && (
        <div className="flex flex-col gap-6">
          <div className="bg-slate-50 p-2 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Calendar onChange={onDateChange} value={selectedDate} formatDay={(l, d) => d.getDate().toString()} className="border-none bg-transparent font-black w-full"/>
          </div>
          
          {/* 실적 평균 박스 (사이드바 출력부) */}
          <div className="bg-black text-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(212,175,55,1)]">
            <p className="text-[10px] uppercase text-[#d4af37] mb-3 font-black italic tracking-widest text-center border-b border-slate-800 pb-2">3-Month Average</p>
            <div className="flex justify-around items-center">
              <div className="text-center">
                <p className="text-xl font-black italic">₩{threeMonthAvg.amt.toLocaleString()}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Avg Amt</p>
              </div>
              <div className="w-[1px] h-8 bg-slate-800"></div>
              <div className="text-center">
                <p className="text-xl font-black text-[#d4af37]">{threeMonthAvg.cnt}건</p>
                <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Avg Cnt</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 메뉴 탭 (경계선 강화) */}
      <div className="flex flex-col gap-3 py-6 border-y-2 border-slate-100">
        <p className="text-[10px] text-slate-400 uppercase italic font-black mb-1 px-1 tracking-widest">Quick Menu</p>
        {menuConfig.map((item) => (
          (menuStatus[item.id] || isEditMode) && (
            <div key={item.id} className="relative group">
              <button 
                onClick={() => !isEditMode && handleOpenLink(item.url)} 
                className={`w-full flex items-center justify-between px-5 py-4 border-2 ${item.color} rounded-xl transition-all shadow-sm active:scale-95 ${menuStatus[item.id] ? 'bg-white hover:bg-slate-50' : 'bg-slate-100 opacity-20'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-[12px] font-black uppercase text-slate-800">{item.label}</span>
                </div>
                <span className="text-slate-300 group-hover:text-slate-900">→</span>
              </button>
              {isEditMode && (
                <input type="checkbox" checked={menuStatus[item.id]} onChange={() => toggleMenu(item.id)} className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-6 h-6 cursor-pointer accent-blue-600 z-20"/>
              )}
            </div>
          )
        ))}
      </div>

      {/* 하단 메모 및 로그아웃 */}
      <div className="flex flex-col gap-6 mt-auto pt-4">
        {mode === 'office' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black italic px-1 uppercase">Admin Notice</p>
              <textarea readOnly value={dailyAdminNotice} className="w-full h-20 p-3 text-[12px] border-2 border-slate-900 rounded-xl bg-yellow-50 font-bold outline-none" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-black italic px-1 uppercase">Private Memo</p>
              <textarea value={privateMemo} onChange={(e) => {setPrivateMemo(e.target.value); localStorage.setItem(`memo_${user.id}`, e.target.value);}} className="w-full h-20 p-3 text-[12px] border-2 border-slate-200 rounded-xl font-bold italic outline-none" placeholder="메모..." />
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="w-full py-4 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 text-[11px] font-black border-2 border-dashed border-slate-200 rounded-xl transition-all uppercase tracking-widest">
          Logout System
        </button>
      </div>
    </aside>
  );
}