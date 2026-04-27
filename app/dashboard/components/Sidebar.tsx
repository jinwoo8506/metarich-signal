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
  const isLeader = user?.role === 'leader' || user?.role_level === 'director';
  const isManager = user?.role === 'manager';
  const isAgent = user?.role === 'agent' || isManager || isLeader || isMaster;
  
  const isAdmin = isMaster; 
  const isStaff = isAgent;
  const isApproved = isMaster || isLeader || (isStaff && (user?.is_approved === true || user?.is_approved === "true"));

  const getRankDisplay = (role: string) => {
    if (!isApproved) return '게스트(승인대기)';
    if (userEmail === 'qodbtjq@naver.com') return '최고관리자';
    switch(role) {
      case 'master': return '사업부장';
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
    if (!isMaster && !isLeader) queryBuilder = queryBuilder.eq("user_id", user?.id);
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
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed top-5 left-5 z-[60] bg-[#1a3a6e] text-white p-3 rounded-2xl shadow-lg font-bold text-[10px] transition-all active:scale-90 lg:hidden"
      >
        {isOpen ? 'CLOSE' : 'MENU'}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#1a3a6e] flex flex-col shadow-xl transition-all duration-300 ${isOpen ? 'w-[240px] translate-x-0' : 'w-0 -translate-x-full lg:w-[240px] lg:translate-x-0'}`}>
        <div className={`flex flex-col h-full ${!isOpen && 'hidden lg:flex'}`}>
          {/* Brand Logo Section */}
          <div className="p-6 pb-2 flex-shrink-0 flex flex-col gap-1 mt-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-montserrat font-black text-2xl bg-gradient-to-br from-white to-[#0ea5e9] bg-clip-text text-transparent">MR<span className="text-[#0ea5e9]">SG</span></span>
            </div>
            <p className="text-[10px] text-white/50 font-light tracking-widest uppercase">MetaRich Signal Group</p>
            <div className="h-[1px] bg-white/10 w-full mt-4"></div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 no-scrollbar">
            {/* User Profile Section */}
            <div className="bg-white/5 p-4 rounded-2xl flex flex-col gap-2 transition-all hover:bg-white/10 cursor-pointer" onClick={() => { router.push('/dashboard'); setIsOpen(false); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-lg">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-white font-bold text-sm truncate">{user?.name || "사용자"}</span>
                  <span className="text-white/50 text-[10px] truncate">{getRankDisplay(user?.role)}</span>
                </div>
              </div>
            </div>

            {/* Navigation List */}
            <nav className="space-y-1">
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest px-2 mb-2">Main Navigation</p>
              
              <NavItem 
                icon="🏠" 
                label="대시보드" 
                active={mode === 'office'} 
                onClick={() => { router.push('/dashboard'); setIsOpen(false); }} 
              />
              
              <NavItem 
                icon="🤝" 
                label="상담 도구" 
                active={mode === 'consulting'} 
                onClick={() => setIsConsultModalOpen(true)} 
              />

              {isMaster && (
                <NavItem 
                  icon="👥" 
                  label="조직 관리" 
                  active={showStaffManager} 
                  onClick={() => setShowStaffManager(!showStaffManager)} 
                />
              )}
            </nav>

            {isMaster && showStaffManager && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                <p className="text-[10px] font-bold text-white/50 uppercase">Staff Permissions</p>
                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-white/80">{staff.name || staff.email}</span>
                        <button onClick={() => toggleStaffApproval(staff.id, staff.is_approved)}
                          className={`text-[8px] px-2 py-1 rounded-lg font-bold ${(staff.is_approved === true || staff.is_approved === "true") ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {(staff.is_approved === true || staff.is_approved === "true") ? '승인' : '미승인'}
                        </button>
                      </div>
                      <select value={staff.role || 'agent'} onChange={(e) => updateStaffRole(staff.id, e.target.value)} className="w-full text-[10px] font-bold p-2 bg-white/5 text-white/80 rounded-lg outline-none">
                        <option value="agent">설계사</option>
                        <option value="manager">지점장</option>
                        <option value="leader">사업부장</option>
                        <option value="master">최고관리자</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isApproved && mode === 'office' && (
              <div className="space-y-4">
                {/* Calendar Card */}
                <div className="bg-white rounded-2xl p-2 shadow-lg">
                  <Calendar 
                    onChange={(d: any) => onDateChange(d)} 
                    value={selectedDate} 
                    calendarType="gregory"
                    formatDay={(_, date) => date.getDate().toString()} 
                    className="border-0 w-full text-[11px] font-bold sidebar-calendar" 
                  />
                </div>

                {/* Performance Card */}
                <div className="bg-gradient-to-br from-[#1e40af] to-[#0ea5e9] p-5 rounded-2xl shadow-lg text-white">
                  <p className="text-[9px] text-white/60 uppercase font-bold tracking-widest mb-3 text-center">3-Month Performance</p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="border-r border-white/10">
                      <p className="text-[8px] opacity-60 font-bold uppercase">Avg Amt</p>
                      <p className="text-lg font-montserrat font-black">{threeMonthAvg.amt.toLocaleString()}만</p>
                    </div>
                    <div>
                      <p className="text-[8px] opacity-60 font-bold uppercase">Avg Cnt</p>
                      <p className="text-lg font-montserrat font-black">{threeMonthAvg.cnt}건</p>
                    </div>
                  </div>
                </div>

                {/* Instruction Box */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Instruction</p>
                  <textarea 
                    value={dailyAdminNotice} 
                    onChange={(e) => isAdmin && saveDailyNotice(e.target.value)} 
                    readOnly={!isAdmin} 
                    className="w-full bg-transparent text-[11px] font-medium outline-none resize-none leading-relaxed text-white/80 min-h-[80px]" 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 flex-shrink-0 space-y-2">
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="w-full bg-white/5 text-white/40 py-3 rounded-xl font-bold text-[10px] uppercase hover:bg-white/10 transition-colors">
              Logout System
            </button>
            <div className="text-[10px] text-white/20 text-center font-light">
              배진우 팀장 AFPK<br/>메타리치 시그널그룹
            </div>
          </div>
        </div>
      </aside>

      {isConsultModalOpen && isApproved && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] border-4 border-black overflow-hidden shadow-2xl">
            <div className="bg-black p-6 flex justify-between items-center">
              <h3 className="text-[#d4af37] font-black italic text-xl uppercase tracking-tighter">Consult Tools</h3>
              <div className="flex items-center gap-3">
                {isMaster && (
                  <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] px-3 py-1 rounded-full font-black ${isEditMode ? 'bg-[#d4af37] text-black' : 'bg-white/10 text-white/50 border border-white/20'}`}>
                    {isEditMode ? "FINISH" : "EDIT"}
                  </button>
                )}
                <button onClick={() => setIsConsultModalOpen(false)} className="text-[#d4af37] text-2xl font-black">×</button>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto no-scrollbar">
              {consultTools.map((item) => {
                const isVisible = menuStatus[item.id] || isEditMode;
                if (!isVisible) return null;
                return (
                  <div key={item.id} className="relative">
                    <button onClick={() => handleLinkClick(item)} className={`w-full flex items-center gap-4 px-6 py-4 border-2 ${item.color} rounded-2xl bg-white hover:bg-black hover:text-[#d4af37] transition-all ${!menuStatus[item.id] && 'opacity-30'}`}>
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-[13px] font-black">{item.label}</span>
                    </button>
                    {isMaster && isEditMode && (
                      <input type="checkbox" checked={menuStatus[item.id]} onChange={() => toggleMenu(item.id)} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 accent-black" />
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

function NavItem({ icon, label, active, onClick }: { icon: string, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
    >
      <span className={`text-lg transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
      <span className="text-[13px] font-medium">{label}</span>
      {active && <div className="ml-auto w-1 h-4 bg-[#0ea5e9] rounded-full"></div>}
    </button>
  );
}