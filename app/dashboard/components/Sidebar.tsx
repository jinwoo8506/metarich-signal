"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ user, selectedDate, onDateChange, mode, onBack, externalMenuStatus, onMenuStatusChange, onTabChange, activeTab }: any) {
  const router = useRouter();
  
  // [업데이트] 사이드바 열기/닫기 상태 (기본값 열림)
  const [isOpen, setIsOpen] = useState(true); 
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 권한 로직: 마스터, 관리자, 직원(승인유저) 구분
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const userEmail = user?.email?.toLowerCase()?.trim();
  const isMaster = userEmail === 'qodbtjq@naver.com' || user?.role === 'master';
  const isAdmin = userEmail === 'jw20371035@gmail.com' || user?.role === 'admin' || isMaster;
  
  // 직급 기반 승인 여부 (게스트와 직원 구분)
  const isStaff = ['agent', 'leader', 'manager', 'master', 'admin'].includes(user?.role);
  const isApproved = isAdmin || isStaff || user?.is_approved === true || user?.is_approved === "true";

  // 메뉴 상태 관리 (신규 메뉴들 포함)
  const [menuStatus, setMenuStatus] = useState<any>(externalMenuStatus || {
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, 
    show_cont: true, show_gongsi: true, show_disease: true, show_surgery: true
  });
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isApproved) {
      fetchDailyData();
      fetch3MonthAvg();
    }
    fetchMenuSettings();
    const savedPrivate = localStorage.getItem(`memo_${user?.id}`);
    setPrivateMemo(savedPrivate || "");
  }, [dateStr, user?.id, isApproved]);

  useEffect(() => {
    if (externalMenuStatus) setMenuStatus(externalMenuStatus);
  }, [externalMenuStatus]);

  async function fetchMenuSettings() {
    const { data } = await supabase.from("team_settings").select("key, value");
    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      setMenuStatus((prev: any) => ({ ...prev, ...settings }));
      if (onMenuStatusChange) onMenuStatusChange({ ...menuStatus, ...settings });
    }
  }

  const toggleMenu = async (key: string) => {
    const newValue = !((menuStatus as any)[key]);
    const updatedStatus = { ...menuStatus, [key]: newValue };
    setMenuStatus(updatedStatus);
    if (onMenuStatusChange) onMenuStatusChange(updatedStatus);
    await supabase.from("team_settings").upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });
  };

  async function fetchDailyData() {
    const { data } = await supabase.from("team_settings").select("value").eq("key", `daily_instruction_${dateStr}`).maybeSingle();
    setDailyAdminNotice(data ? data.value : "해당 날짜의 전달사항이 없습니다.");
  }

  async function fetch3MonthAvg() {
    const d = new Date(selectedDate);
    const startOfRange = new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString().split('T')[0];
    const endOfRange = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
    let query = supabase.from("daily_perf").select("contract_amt, contract_cnt, user_id, date").gte("date", startOfRange).lt("date", endOfRange);
    if (!isAdmin) query = query.eq("user_id", user?.id);
    const { data } = await query;
    if (data && data.length > 0) {
      const totalAmt = data.reduce((acc, curr) => acc + (Number(curr.contract_amt) || 0), 0);
      const totalCnt = data.reduce((acc, curr) => acc + (Number(curr.contract_cnt) || 0), 0);
      setThreeMonthAvg({ amt: Math.round(totalAmt / 3), cnt: Number((totalCnt / 3).toFixed(1)) });
    } else { setThreeMonthAvg({ amt: 0, cnt: 0 }); }
  }

  const saveDailyNotice = async (val: string) => {
    setDailyAdminNotice(val);
    await supabase.from("team_settings").upsert({ key: `daily_instruction_${dateStr}`, value: val }, { onConflict: 'key' });
  };

  const savePrivateMemo = (val: string) => {
    setPrivateMemo(val);
    localStorage.setItem(`memo_${user?.id}`, val);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 퀵링크 정의: 고정 메뉴(fixed) 및 직원 전용 메뉴(staffOnly)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const quickLinks = [
    { id: 'show_cafe', label: '보험의 기준', icon: '☕', url: 'https://cafe.naver.com/signal1035', color: 'border-[#2db400]', fixed: true },
    { id: 'show_cont', label: '숨은 보험금 찾기', icon: '🔍', url: 'https://cont.insure.or.kr/cont_web/intro.do', color: 'border-emerald-500', fixed: true },
    { id: 'show_hira', label: '진료기록 확인', icon: '🏥', url: 'https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000&WT.gnb=내+진료정보+열람', color: 'border-orange-500', fixed: true },
    
    // 직원 전용 메뉴 (마스터 설정에 따름)
    { id: 'show_finance', label: '재무 분석 도구', icon: '📊', url: '/financial_planner.html', color: 'border-black', staffOnly: true },
    { id: 'show_insu', label: '보장분석 PRO (유료)', icon: '🛡️', url: '/insu.html', color: 'border-blue-600', staffOnly: true },
    { id: 'show_gongsi', label: '보험사 공시실(약관)', icon: '📑', url: '#', color: 'border-slate-400', staffOnly: true },
    { id: 'show_disease', label: '질병코드 조회', icon: '🧬', url: '#', color: 'border-indigo-400', staffOnly: true },
    { id: 'show_surgery', label: '수술비 검색', icon: '✂️', url: '#', color: 'border-rose-400', staffOnly: true },
  ];

  return (
    <>
      {/* [업데이트] 사이드바 열기/닫기 토글 버튼 */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 left-5 z-[60] bg-black text-[#d4af37] p-3 rounded-2xl shadow-lg font-black italic text-[10px] transition-transform active:scale-90"
      >
        {isOpen ? 'CLOSE MENU' : 'OPEN MENU'}
      </button>

      {/* 사이드바 본체: 애니메이션 및 너비 가변 처리 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50
        bg-white border-r p-6 flex flex-col gap-6 shadow-sm font-black overflow-y-auto transition-all duration-300 ease-in-out
        ${isOpen ? 'w-[300px] lg:w-80 translate-x-0' : 'w-0 -translate-x-full'}
      `}>
        
        {/* 내부 컨텐츠가 사이드바가 닫힐 때 같이 사라지도록 처리 */}
        <div className={`${!isOpen && 'hidden'} transition-opacity duration-200 flex flex-col gap-6 h-full min-w-[250px]`}>
          
          <button onClick={onBack} className="text-left text-[10px] text-slate-400 hover:text-black mb-[-15px] font-black italic tracking-tighter transition-all mt-14">
            ← BACK TO SELECTOR
          </button>

          <div className="flex justify-between items-center border-b-4 border-black pb-1">
            <h2 className="text-2xl italic uppercase tracking-tighter font-black text-black">
              {isApproved ? (mode === 'office' ? 'History' : 'Consult') : 'Guest'}
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

          {!isApproved && (
            <div className="bg-amber-50 p-5 rounded-[2rem] border-2 border-amber-200 shadow-inner">
              <p className="text-[10px] font-black text-amber-600 uppercase italic mb-1 tracking-widest">Status: Pending</p>
              <p className="text-[11px] font-black text-amber-900 leading-relaxed">
                관리자의 승인을 기다리는 중입니다.<br/>승인 전까지는 기본 도구만 이용 가능합니다.
              </p>
            </div>
          )}
          
          {isApproved && mode === 'office' && (
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
                <p className="text-[9px] text-[#d4af37] opacity-60 uppercase italic mb-3 tracking-widest px-1 font-black text-center">
                  {isAdmin ? "Team Performance" : "My Performance"}
                </p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="border-r border-white/10">
                    <p className="text-[8px] opacity-40 uppercase mb-1 font-black">Avg Amt</p>
                    <p className="text-lg text-[#d4af37] italic font-black">{threeMonthAvg.amt.toLocaleString()}만</p>
                  </div>
                  <div>
                    <p className="text-[8px] opacity-40 uppercase mb-1 font-black">Avg Cnt</p>
                    <p className="text-lg text-[#d4af37] italic font-black">{threeMonthAvg.cnt}건</p>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <div className="px-1 space-y-3">
            <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Main Menu</p>

            {/* [업데이트] 금융계산기 버튼: 직원 이상만 노출 및 클릭 시 작동 보강 */}
            {isApproved && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (onTabChange) {
                    onTabChange('finance');
                    // setIsOpen(false); // 필요 시 사이드바 자동 닫기 활성화
                  }
                }}
                className={`w-full flex items-center justify-center gap-3 py-5 border-4 rounded-[1.8rem] transition-all active:scale-95 shadow-md ${activeTab === 'finance' ? 'bg-[#d4af37] border-black text-black' : 'bg-black border-black text-[#d4af37] hover:bg-slate-800'}`}
              >
                <span className="text-xl">🧮</span>
                <span className="text-[13px] font-black tracking-tight uppercase italic">Financial Calculator</span>
              </button>
            )}

            <p className="text-[9px] text-slate-400 uppercase italic mt-4 mb-1 tracking-widest font-black">Quick Links</p>
            
            {quickLinks.map((item) => {
              // 노출 조건: (고정메뉴 혹은 마스터가 켠 메뉴) AND (고정메뉴 혹은 승인된 직원)
              const isVisible = item.fixed || menuStatus[item.id] || isEditMode;
              const hasPermission = item.fixed || isApproved;

              if (isVisible && hasPermission) {
                return (
                  <div key={item.id} className="relative group">
                    <button 
                      onClick={() => {
                        if (!isEditMode) {
                          if (item.id === 'show_finance' && onTabChange) onTabChange('finance');
                          else window.open(item.url, "_blank");
                        }
                      }}
                      className={`w-full flex items-center justify-center gap-3 py-4 border-2 ${item.color} rounded-[1.5rem] bg-white hover:bg-black hover:text-[#d4af37] transition-all active:scale-95 ${!item.fixed && !menuStatus[item.id] && 'opacity-30 grayscale'}`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-[12px] font-black tracking-tight text-black group-hover:text-[#d4af37]">{item.label}</span>
                    </button>
                    {isEditMode && !item.fixed && (
                      <input 
                        type="checkbox" 
                        checked={menuStatus[item.id]} 
                        onChange={() => toggleMenu(item.id)}
                        className="absolute -top-1 -right-1 w-6 h-6 accent-black cursor-pointer z-20 shadow-sm"
                      />
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>

          {isApproved && mode === 'office' && (
            <div className="flex flex-col gap-4">
              <div className="bg-blue-50 p-5 rounded-[2.5rem] border border-blue-100 flex flex-col h-40">
                <p className="text-[9px] font-black text-blue-600 uppercase italic mb-2 tracking-widest">Instruction</p>
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
            className="w-full bg-black text-[#d4af37] py-5 rounded-[1.5rem] font-black text-xs uppercase shadow-xl italic mt-auto hover:bg-red-600 hover:text-white transition-colors"
          >
            Logout System
          </button>
        </div>
      </aside>

      {/* 모바일 배경 오버레이 */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        />
      )}
      
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
        .react-calendar__navigation button { font-weight: 900; font-style: italic; font-size: 14px; }
        .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none; font-size: 10px; opacity: 0.5; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px !important; }
        .react-calendar__tile { padding: 10px 5px !important; font-size: 12px; font-weight: 900; }
        abbr[title] { text-decoration: none; }
      `}</style>
    </>
  );
}