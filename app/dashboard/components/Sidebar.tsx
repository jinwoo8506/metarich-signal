"use client"
import { useState, useEffect } from "react"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { supabase } from "../../../lib/supabase"
import { useRouter } from "next/navigation"

export default function Sidebar({ 
  user, selectedDate, onDateChange, mode, onBack, 
  externalMenuStatus, onMenuStatusChange, onTabChange, activeTab,
  isOpen, setIsOpen 
}: any) {
  const router = useRouter();
  
  const [dailyAdminNotice, setDailyAdminNotice] = useState("");
  const [privateMemo, setPrivateMemo] = useState("");
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false); 
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const userEmail = user?.email?.toLowerCase()?.trim();
  const isMaster = userEmail === 'qodbtjq@naver.com' || user?.role === 'master';
  const isAdmin = userEmail === 'jw20371035@gmail.com' || user?.role === 'admin' || isMaster;
  const isStaff = ['agent', 'leader', 'manager', 'master', 'admin'].includes(user?.role);
  const isApproved = isAdmin || isStaff || user?.is_approved === true || user?.is_approved === "true";

  // 직책 한글 변환 로직 (user.role 기반)
  const getRankDisplay = (role: string) => {
    switch(role) {
      case 'master': return '사업부장';
      case 'admin': return '지점장';
      case 'manager': return '팀장';
      case 'agent': return '설계사';
      default: return '사용자';
    }
  };

  const [menuStatus, setMenuStatus] = useState<any>(externalMenuStatus || {
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, 
    show_cont: true, show_gongsi: true, show_disease: true, show_surgery: true,
    show_calc: true 
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

  const fixedLinks = [
    { id: 'show_cafe', label: '보험의 기준', icon: '☕', url: 'https://cafe.naver.com/signal1035', color: 'border-[#2db400]' },
    { id: 'show_cont', label: '숨은 보험금 찾기', icon: '🔍', url: 'https://cont.insure.or.kr/cont_web/intro.do', color: 'border-emerald-500' },
    { id: 'show_hira', label: '진료기록 확인', icon: '🏥', url: 'https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000&WT.gnb=내+진료정보+열람', color: 'border-orange-500' },
  ];

  const consultTools = [
    { id: 'show_calc', label: '영업용 금융계산기', icon: '🧮', url: 'tab:finance', color: 'border-blue-500' },
    { id: 'show_finance', label: '재무 분석 도구', icon: '📊', url: '/financial_planner.html', color: 'border-black' },
    { id: 'show_insu', label: '보장분석 PRO (유료)', icon: '🛡️', url: '/insu.html', color: 'border-blue-600' },
    { id: 'show_gongsi', label: '보험사 공시실', icon: '📑', url: 'https://job.fss.or.kr/job/main/main.do', color: 'border-slate-400' },
    { id: 'show_disease', label: '질병코드 조회', icon: '🧬', url: 'http://www.koicd.kr/kcd/kcd.do', color: 'border-indigo-400' },
    { id: 'show_surgery', label: '수술비 검색', icon: '✂️', url: '#', color: 'border-rose-400' },
  ];

  const handleLinkClick = (item: any) => {
    if (isEditMode) return;
    if (item.url === 'tab:finance' || item.id === 'show_calc') {
      if (onTabChange) onTabChange('finance');
      setIsOpen(false);
      setIsConsultModalOpen(false);
      return;
    }
    if (item.url && item.url !== '#') {
      window.open(item.url, "_blank");
      setIsConsultModalOpen(false); 
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 left-5 z-[60] bg-black text-[#d4af37] p-3 rounded-2xl shadow-lg font-black italic text-[10px] transition-transform active:scale-90"
      >
        {isOpen ? 'CLOSE MENU' : 'OPEN MENU'}
      </button>

      <aside className={`
        fixed inset-y-0 left-0 z-50
        bg-white border-r p-6 flex flex-col gap-6 shadow-sm font-black overflow-y-auto transition-all duration-300 ease-in-out
        ${isOpen ? 'w-[300px] lg:w-80 translate-x-0' : 'w-0 -translate-x-full'}
      `}>
        <div className={`${!isOpen && 'hidden'} transition-opacity duration-200 flex flex-col gap-6 h-full min-w-[250px]`}>
          <button onClick={onBack} className="text-left text-[10px] text-slate-400 hover:text-black mb-[-15px] font-black italic tracking-tighter transition-all mt-14">
            ← BACK TO SELECTOR
          </button>

          <div className="flex justify-between items-center border-b-4 border-black pb-1">
            <h2 className="text-2xl italic uppercase tracking-tighter font-black text-black">
              {isApproved ? (mode === 'office' ? 'History' : 'Consult') : 'Guest'}
            </h2>
            {isMaster && (
              <button onClick={() => setIsEditMode(!isEditMode)} 
                className={`text-[9px] px-2 py-1 rounded-full font-black ${isEditMode ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {isEditMode ? "FINISH" : "CONFIG"}
              </button>
            )}
          </div>

          {/* 🟢 업데이트: 사용자 정보 (성함 및 직책) - 달력 위에 배치 */}
          {isApproved && (
            <div className="bg-black text-white p-5 rounded-[2rem] border-2 border-[#d4af37] shadow-lg -mb-2">
              <p className="text-[9px] text-[#d4af37] uppercase font-black tracking-widest leading-none mb-1 opacity-80">
                Logged in as
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl italic font-black text-white">{user?.user_metadata?.full_name || user?.name || "사용자"}</span>
                <span className="text-sm font-black text-[#d4af37] italic opacity-90">{getRankDisplay(user?.role)}</span>
              </div>
            </div>
          )}

          {isApproved && mode === 'office' && (
            <>
              <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-white p-2">
                <Calendar onChange={(d: any) => onDateChange(d)} value={selectedDate} formatDay={(_, date) => date.getDate().toString()} 
                  className="border-0 w-full font-black text-xs" calendarType="gregory" next2Label={null} prev2Label={null} />
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
            <p className="text-[9px] text-slate-400 uppercase italic mb-1 tracking-widest font-black">Quick Tools</p>
            <div className="grid grid-cols-1 gap-2">
              {fixedLinks.map(item => (
                <button key={item.id} onClick={() => handleLinkClick(item)}
                  className={`w-full flex items-center gap-3 px-5 py-4 border-2 ${item.color} rounded-2xl bg-white hover:bg-slate-50 transition-all active:scale-95`}>
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[11px] font-black text-black">{item.label}</span>
                </button>
              ))}
            </div>

            {isApproved && (
              <button 
                onClick={() => setIsConsultModalOpen(true)}
                className="w-full flex flex-col items-center justify-center gap-1 py-6 bg-black border-4 border-black rounded-[2rem] text-[#d4af37] hover:bg-slate-800 transition-all active:scale-95 shadow-xl group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">💼</span>
                <span className="text-[13px] font-black uppercase italic tracking-tighter">Open Consult Tools</span>
                <span className="text-[8px] opacity-60 font-black">전문 상담 전용 도구함</span>
              </button>
            )}
          </div>

          {isApproved && mode === 'office' && (
            <div className="flex flex-col gap-4">
              <div className="bg-blue-50 p-5 rounded-[2.5rem] border border-blue-100 flex flex-col h-32">
                <p className="text-[9px] font-black text-blue-600 uppercase italic mb-2 tracking-widest">Instruction</p>
                <textarea value={dailyAdminNotice} onChange={(e) => isAdmin && saveDailyNotice(e.target.value)} readOnly={!isAdmin}
                  className={`w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none leading-relaxed text-blue-900 ${!isAdmin ? 'cursor-default' : 'p-1 bg-white/30 rounded-lg'}`} />
              </div>
            </div>
          )}

          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} 
            className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase italic mt-auto hover:bg-red-50 transition-colors">
            Logout System
          </button>
        </div>
      </aside>

      {/* 상담 도구 팝업 모달 (유지) */}
      {isConsultModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] border-4 border-black overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-black p-6 flex justify-between items-center">
              <div>
                <h3 className="text-[#d4af37] font-black italic text-xl uppercase tracking-tighter">Consult Tools</h3>
                <p className="text-white/50 text-[9px] font-black uppercase">전문 상담 지원 시스템</p>
              </div>
              <button onClick={() => setIsConsultModalOpen(false)} className="text-[#d4af37] text-2xl font-black hover:scale-110 transition-transform">×</button>
            </div>
            
            <div className="p-6 grid grid-cols-1 gap-3">
              {consultTools.map((item) => {
                const isVisible = menuStatus[item.id] || isEditMode;
                if (!isVisible) return null;

                return (
                  <div key={item.id} className="relative group">
                    <button 
                      onClick={() => handleLinkClick(item)}
                      className={`w-full flex items-center justify-between px-6 py-4 border-2 ${item.color} rounded-2xl bg-white hover:bg-black hover:text-[#d4af37] transition-all group ${!menuStatus[item.id] && 'opacity-30 grayscale'}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-[13px] font-black">{item.label}</span>
                      </div>
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-black italic">SELECT →</span>
                    </button>
                    {isEditMode && (
                      <input type="checkbox" checked={menuStatus[item.id]} onChange={() => toggleMenu(item.id)}
                        className="absolute -top-1 -right-1 w-6 h-6 accent-black cursor-pointer z-20" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="bg-slate-50 p-4 text-center border-t">
              <p className="text-[9px] text-slate-400 font-black italic uppercase">The standard of insurance consulting</p>
            </div>
          </div>
        </div>
      )}

      {isOpen && <div onClick={() => setIsOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />}
      
      <style jsx global>{`
        .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
        .react-calendar__tile--active { background: black !important; color: #d4af37 !important; border-radius: 12px !important; }
        abbr[title] { text-decoration: none; }
      `}</style>
    </>
  );
}