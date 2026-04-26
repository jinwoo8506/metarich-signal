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
  const [threeMonthAvg, setThreeMonthAvg] = useState({ amt: 0, cnt: 0 });
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false); 
  const dateStr = selectedDate.toLocaleDateString('en-CA');

  const userEmail = user?.email?.toLowerCase()?.trim();
  
  const isMaster = userEmail === 'qodbtjq@naver.com' || user?.role === 'master' || user?.role_level === 'master';
  const isDirector = user?.role === 'director' || user?.role_level === 'executive';
  const isLeader = user?.role === 'leader' || user?.role_level === 'director';
  const isManager = user?.role === 'manager';
  const isAgent = user?.role === 'agent' || isManager || isLeader || isDirector || isMaster;
  
  const isAdmin = isMaster; 
  const isStaff = isAgent;
  const isApproved = isMaster || isDirector || isLeader || (isStaff && (user?.is_approved === true || user?.is_approved === "true"));

  const getRankDisplay = (role: string) => {
    if (!isApproved) return '게스트(승인대기)';
    if (userEmail === 'qodbtjq@naver.com') return '최고관리자';
    switch(role) {
      case 'master': return '마스터';
      case 'director': return '본부장';
      case 'leader': return '사업부장'; 
      case 'manager': return '지점장';
      case 'agent': return '설계사';
      case 'admin': return '시스템관리자';
      default: return '사용자';
    }
  };

  // ✅ [업데이트] show_underwriting 항목 포함 초기화
  const [menuStatus, setMenuStatus] = useState<any>(externalMenuStatus || {
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, 
    show_cont: true, show_gongsi: true, show_disease: true, show_surgery: true,
    show_calc: true, show_disability: true, show_car_accident: true,
    show_knia: true,
    show_underwriting: true 
  });
  const [isEditMode, setIsEditMode] = useState(false); 
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showStaffManager, setShowStaffManager] = useState(false);

  useEffect(() => {
    if (isApproved) {
      fetchDailyData();
      fetch3MonthAvg();
    }
    fetchMenuSettings();
    if (isMaster) fetchStaffList();
  }, [dateStr, user?.id, isApproved]);

  useEffect(() => {
    if (externalMenuStatus) setMenuStatus(externalMenuStatus);
  }, [externalMenuStatus]);

  async function fetchStaffList() {
    const { data } = await supabase.from("users").select("*").order("name", { ascending: true });
    if (data) setStaffList(data);
  }

  async function updateStaffRole(staffId: string, newRole: string) {
    const { error } = await supabase.from("users").update({ role: newRole }).eq("id", staffId);
    if (!error) { alert("직급 권한이 변경되었습니다."); fetchStaffList(); }
  }

  async function toggleStaffApproval(staffId: string, currentStatus: any) {
    const nextStatus = !(currentStatus === true || currentStatus === "true");
    const { error } = await supabase.from("users").update({ is_approved: nextStatus }).eq("id", staffId);
    if (!error) { alert(nextStatus ? "승인 완료되었습니다." : "승인이 취소되었습니다."); fetchStaffList(); }
  }

  async function fetchMenuSettings() {
    const { data } = await supabase.from("team_settings").select("key, value");
    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value === "true";
        return acc;
      }, {});
      setMenuStatus((prev: any) => ({ ...prev, ...settings }));
      if (onMenuStatusChange) onMenuStatusChange(settings);
    }
  }

  const toggleMenu = async (key: string) => {
    if (!isAdmin) return; 
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
    let queryBuilder = supabase.from("daily_perf").select("contract_amt, contract_cnt, user_id, date").gte("date", startOfRange).lt("date", endOfRange);
    if (!isMaster && !isDirector && !isLeader) queryBuilder = queryBuilder.eq("user_id", user?.id);
    const { data } = await queryBuilder; 
    if (data && data.length > 0) {
      const totalAmt = data.reduce((acc, curr) => acc + (Number(curr.contract_amt) || 0), 0);
      const totalCnt = data.reduce((acc, curr) => acc + (Number(curr.contract_cnt) || 0), 0);
      setThreeMonthAvg({ amt: Math.round(totalAmt / 3), cnt: Number((totalCnt / 3).toFixed(1)) });
    }
  }

  const saveDailyNotice = async (val: string) => {
    if (!isAdmin) return;
    setDailyAdminNotice(val);
    await supabase.from("team_settings").upsert({ key: `daily_instruction_${dateStr}`, value: val }, { onConflict: 'key' });
  };

  const fixedLinks = [
    { id: 'show_cafe', label: '보험의 기준 (카페)', icon: '☕', url: 'https://cafe.naver.com/signal1035', color: 'border-[#2db400]' },
    { id: 'show_cont', label: '숨은 보험금 찾기', icon: '🔍', url: 'https://cont.insure.or.kr/cont_web/intro.do', color: 'border-emerald-500' },
    { id: 'show_hira', label: '진료기록 확인', icon: '🏥', url: 'https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000', color: 'border-orange-500' },
    { id: 'show_gongsi', label: '보험사 공시실', icon: '📑', url: '/gongsi.html', color: 'border-slate-400' },
    { id: 'show_knia', label: '과실 비율 조회', icon: '⚖️', url: 'https://accident.knia.or.kr', color: 'border-blue-400' },
  ];

  const consultTools = [
    { id: 'show_calc', label: '금융계산기', icon: '🧮', url: 'tab:finance', color: 'border-blue-500' },
    { id: 'show_surgery', label: '수술비 검색', icon: '✂️', url: '/insurance-tools/surgery', color: 'border-rose-400' }, 
    { id: 'show_disability', label: '장해분류표', icon: '♿', url: '/insurance-tools/disability', color: 'border-amber-500' }, 
    
    // ✅ 경로 재확인: public/underwriting/index.html 기준
    { id: 'show_underwriting', label: '회사별 간편 인수 확인(참고)', icon: '📝', url: '/underwriting/index.html', color: 'border-cyan-500' },

    { id: 'show_car_accident', label: '자동차사고 가이드', icon: '🚗', url: '/insurance-tools/car-accident', color: 'border-emerald-400' }, 
    { id: 'show_disease', label: '질병코드 조회', icon: '🧬', url: 'https://kcdcode.kr/browse/main', color: 'border-indigo-400' }, 
    { id: 'show_finance', label: '재무 분석 도구', icon: '📊', url: '/financial_planner.html', color: 'border-black' }, 
    { id: 'show_insu', label: '보장분석 PRO', icon: '🛡️', url: '/insu.html', color: 'border-blue-600' }, 
  ];

  const handleLinkClick = (item: any) => {
    if (isEditMode) return; 

    if (item.url && item.url.startsWith('tab:')) {
      const targetTab = item.url.split(':')[1];
      if (onTabChange) onTabChange(targetTab);
      setIsOpen(false);
      setIsConsultModalOpen(false);
      return;
    }

    if (item.url) {
      let finalUrl = "";

      if (item.url.startsWith('http')) {
        finalUrl = item.url;
      } else {
        // ✅ [수정] 경로가 슬래시(/)로 시작하도록 보정하여 도메인과 결합
        const cleanPath = item.url.startsWith('/') ? item.url : `/${item.url}`;
        finalUrl = `${window.location.origin}${cleanPath}`;
      }

      window.open(finalUrl, "_blank", "noopener,noreferrer");

      setIsOpen(false);
      setIsConsultModalOpen(false);
      return;
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed top-5 left-5 z-[60] bg-blue-900 text-white p-3 rounded-xl shadow-lg font-bold text-xs transition-transform active:scale-90 flex items-center gap-2">
        {isOpen ? '메뉴 닫기' : '메뉴 열기'}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0f172a] text-white flex flex-col shadow-2xl transition-all duration-300 ${isOpen ? 'w-[85%] sm:w-[300px] lg:w-80 translate-x-0' : 'w-0 -translate-x-full'}`}>
        <div className={`flex flex-col h-full ${!isOpen && 'hidden'}`}>
          <div className="p-6 pb-2 flex-shrink-0 flex flex-col gap-4 mt-16">
            <div className="flex gap-2">
              <button onClick={() => { router.push('/dashboard'); setIsOpen(false); }} className="flex-1 bg-blue-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-tight hover:bg-blue-600 transition-colors">
                대시보드
              </button>
              {onBack && (
                <button onClick={() => { onBack(); setIsOpen(false); }} className="px-4 bg-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold">
                  뒤로가기
                </button>
              )}
            </div>

            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h2 className="text-xl font-bold tracking-tight text-white/90">
                {isApproved ? (mode === 'office' ? '히스토리' : '상담 툴') : '게스트'}
              </h2>
              {isMaster && (
                <button onClick={() => setShowStaffManager(!showStaffManager)} className={`text-[10px] px-3 py-1 rounded-full font-bold transition-colors ${showStaffManager ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {showStaffManager ? "관리 닫기" : "직원 관리"}
                </button>
              )}
            </div>

            <div className={`p-5 rounded-2xl shadow-inner ${isApproved ? 'bg-blue-950/50 border border-white/10' : 'bg-slate-800 text-slate-500'}`}>
              <p className="text-[10px] uppercase font-medium tracking-widest mb-1 opacity-50">{isApproved ? '현재 접속 중' : '접근 제한됨'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">{user?.name || "사용자"}</span>
                <span className={`text-xs font-medium ${isApproved ? 'text-blue-400' : 'text-slate-500'}`}>{getRankDisplay(user?.role)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 no-scrollbar">
            {isMaster && showStaffManager && (
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                <p className="text-[11px] font-bold text-blue-400 uppercase mb-4 tracking-wider">직원 권한 설정</p>
                <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar pr-1">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="bg-slate-800/50 p-3 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-200">{staff.name || staff.email}</span>
                        <button onClick={() => toggleStaffApproval(staff.id, staff.is_approved)}
                          className={`text-[9px] px-2 py-1 rounded-md font-bold transition-colors ${(staff.is_approved === true || staff.is_approved === "true") ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {(staff.is_approved === true || staff.is_approved === "true") ? '승인됨' : '미승인'}
                        </button>
                      </div>
                      <select value={staff.role || 'agent'} onChange={(e) => updateStaffRole(staff.id, e.target.value)} className="w-full text-xs font-medium p-2 bg-slate-900 border border-white/10 rounded-lg text-slate-300 outline-none focus:border-blue-500">
                        <option value="agent">설계사 (Agent)</option>
                        <option value="manager">지점장 (Manager)</option>
                        <option value="leader">사업부장 (Leader)</option>
                        <option value="director">본부장 (Director)</option>
                        <option value="master">최고관리자 (Master)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isApproved && mode === 'office' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl overflow-hidden shadow-xl p-2 text-slate-900">
                  <Calendar 
                    onChange={(d: any) => onDateChange(d)} 
                    value={selectedDate} 
                    calendarType="gregory"
                    formatDay={(_, date) => date.getDate().toString()} 
                    className="border-0 w-full text-sm font-medium" 
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl text-white">
                  <p className="text-[10px] text-white/60 uppercase tracking-widest mb-4 text-center font-bold">3개월 평균 실적</p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="border-r border-white/10">
                      <p className="text-[10px] text-white/40 font-bold uppercase mb-1">평균 매출</p>
                      <p className="text-xl text-white font-bold tracking-tight">{threeMonthAvg.amt.toLocaleString()}<span className="text-xs ml-0.5 opacity-60">만</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase mb-1">평균 건수</p>
                      <p className="text-xl text-white font-bold tracking-tight">{threeMonthAvg.cnt}<span className="text-xs ml-0.5 opacity-60">건</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-1">빠른 실행</p>
              <div className="grid grid-cols-1 gap-2.5">
                {fixedLinks.map(item => (
                  <button key={item.id} onClick={() => handleLinkClick(item)} className="w-full flex items-center gap-3 px-5 py-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left group">
                    <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="text-xs font-medium text-slate-200">{item.label}</span>
                  </button>
                ))}
              </div>
              
              <button onClick={() => setIsConsultModalOpen(true)} className="w-full flex flex-col items-center justify-center gap-2 py-6 bg-blue-600 rounded-2xl text-white hover:bg-blue-500 shadow-xl transition-all active:scale-95 group mt-4">
                <span className="text-2xl group-hover:rotate-12 transition-transform">💼</span>
                <span className="text-sm font-bold tracking-tight">상담 도구 열기</span>
              </button>
            </div>

            {isApproved && mode === 'office' && (
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 min-h-[140px] flex flex-col">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-3">전달 사항</p>
                <textarea 
                  value={dailyAdminNotice} 
                  onChange={(e) => isAdmin && saveDailyNotice(e.target.value)} 
                  readOnly={!isAdmin} 
                  className="w-full flex-1 bg-transparent text-xs font-medium outline-none resize-none leading-relaxed text-slate-300 placeholder:text-slate-600" 
                  placeholder={isAdmin ? "공지 내용을 입력하세요..." : "공지사항이 없습니다."}
                />
              </div>
            )}
          </div>

          <div className="p-6 pt-2 flex-shrink-0">
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="w-full bg-slate-800/50 text-slate-500 py-4 rounded-xl font-bold text-xs hover:bg-rose-500/10 hover:text-rose-400 transition-all">
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {isConsultModalOpen && isApproved && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#0f172a] p-6 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg tracking-tight">상담 도구함</h3>
              <div className="flex items-center gap-3">
                {isMaster && (
                  <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-3 py-1 rounded-full font-bold transition-colors ${isEditMode ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50 border border-white/10 hover:bg-white/20'}`}>
                    {isEditMode ? "편집 완료" : "도구 편집"}
                  </button>
                )}
                <button onClick={() => setIsConsultModalOpen(false)} className="text-white/60 hover:text-white text-2xl font-light transition-colors leading-none">✕</button>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto no-scrollbar bg-slate-50">
              {consultTools.map((item) => {
                const isVisible = menuStatus[item.id] || isEditMode;
                if (!isVisible) return null;
                return (
                  <div key={item.id} className="relative">
                    <button onClick={() => handleLinkClick(item)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group ${!menuStatus[item.id] && 'opacity-40'}`}>
                      <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                      <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                    </button>
                    {isMaster && isEditMode && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                        <input type="checkbox" checked={menuStatus[item.id]} onChange={() => toggleMenu(item.id)} className="w-5 h-5 accent-blue-600 rounded cursor-pointer" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isOpen && <div onClick={() => setIsOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />}
    </>
  );
}