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
  
  // ✅ [권한 체계 유지]
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

  const [menuStatus, setMenuStatus] = useState<any>(externalMenuStatus || {
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, 
    show_cont: true, show_gongsi: true, show_disease: true, show_surgery: true,
    show_calc: true, show_disability: true, show_car_accident: true
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

  // ✅ [수정 완료: await 키워드 추가]
  async function fetch3MonthAvg() {
    const d = new Date(selectedDate);
    const startOfRange = new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString().split('T')[0];
    const endOfRange = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
    
    let queryBuilder = supabase.from("daily_perf").select("contract_amt, contract_cnt, user_id, date").gte("date", startOfRange).lt("date", endOfRange);
    
    if (!isMaster && !isLeader) {
      queryBuilder = queryBuilder.eq("user_id", user?.id);
    }
    
    // 🚀 핵심: await를 사용하여 실제 데이터를 가져옵니다.
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
  ];

  const consultTools = [
    { id: 'show_calc', label: '금융계산기', icon: '🧮', url: 'tab:finance', color: 'border-blue-500' },
    { id: 'show_surgery', label: '수술비 검색', icon: '✂️', url: '/insurance-tools/surgery', color: 'border-rose-400' }, 
    { id: 'show_disability', label: '장해분류표', icon: '♿', url: '/insurance-tools/disability', color: 'border-amber-500' }, 
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

    if (item.url && (item.url.startsWith('http') || item.url.includes('.kr'))) {
      const finalUrl = item.url.startsWith('http') ? item.url : `https://${item.url}`;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
      setIsOpen(false);
      setIsConsultModalOpen(false);
      return;
    }

    if (item.url && item.url.endsWith('.html')) {
      window.open(item.url, "_blank");
      setIsOpen(false);
      setIsConsultModalOpen(false);
      return;
    }

    if (item.url && item.url.startsWith('/')) {
      router.push(item.url); 
      setIsOpen(false);
      setIsConsultModalOpen(false);
      return;
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed top-5 left-5 z-[60] bg-black text-[#d4af37] p-3 rounded-2xl shadow-lg font-black italic text-[10px] transition-transform active:scale-90">
        {isOpen ? 'CLOSE MENU' : 'OPEN MENU'}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r flex flex-col shadow-sm transition-all duration-300 ${isOpen ? 'w-[300px] lg:w-80 translate-x-0' : 'w-0 -translate-x-full'}`}>
        <div className={`flex flex-col h-full ${!isOpen && 'hidden'}`}>
          <div className="p-6 pb-2 flex-shrink-0 flex flex-col gap-4 mt-14">
            <div className="flex gap-2">
              <button onClick={() => { router.push('/dashboard'); setIsOpen(false); }} className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black italic uppercase tracking-tighter hover:bg-black transition-colors">
                Go Dashboard
              </button>
              {onBack && (
                <button onClick={() => { onBack(); setIsOpen(false); }} className="px-4 bg-slate-100 text-slate-600 py-3 rounded-xl text-[10px] font-black uppercase">
                  Back
                </button>
              )}
            </div>

            <div className="flex justify-between items-center border-b-4 border-black pb-1">
              <h2 className="text-2xl italic font-black uppercase tracking-tighter">
                {isApproved ? (mode === 'office' ? 'History' : 'Consult') : 'Guest'}
              </h2>
              {isMaster && (
                <button onClick={() => setShowStaffManager(!showStaffManager)} className={`text-[9px] px-2 py-1 rounded-full font-black ${showStaffManager ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {showStaffManager ? "CLOSE STAFF" : "MANAGE STAFF"}
                </button>
              )}
            </div>

            <div className={`p-5 rounded-[2rem] border-2 shadow-lg ${isApproved ? 'bg-black text-white border-[#d4af37]' : 'bg-slate-100 text-slate-400'}`}>
              <p className="text-[9px] uppercase font-black tracking-widest mb-1 opacity-80">{isApproved ? 'Logged in as' : 'Access Restricted'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl italic font-black">{user?.name || "사용자"}</span>
                <span className={`text-sm font-black italic ${isApproved ? 'text-[#d4af37]' : 'text-slate-400'}`}>{getRankDisplay(user?.role)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 no-scrollbar">
            {isMaster && showStaffManager && (
              <div className="bg-indigo-50 p-4 rounded-[2rem] border-2 border-indigo-200">
                <p className="text-[10px] font-black text-indigo-600 uppercase mb-3 px-1">Staff Permissions</p>
                <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-black">{staff.name || staff.email}</span>
                        <button onClick={() => toggleStaffApproval(staff.id, staff.is_approved)}
                          className={`text-[8px] px-2 py-1 rounded-lg font-black ${(staff.is_approved === true || staff.is_approved === "true") ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {(staff.is_approved === true || staff.is_approved === "true") ? '승인됨' : '미승인'}
                        </button>
                      </div>
                      <select value={staff.role || 'agent'} onChange={(e) => updateStaffRole(staff.id, e.target.value)} className="w-full text-[10px] font-black p-2 bg-slate-50 rounded-lg">
                        <option value="agent">설계사 (Agent)</option>
                        <option value="manager">지점장 (Manager)</option>
                        <option value="leader">사업부장 (Leader)</option>
                        <option value="master">최고관리자 (Master)</option>
                      </select>
                    </div>
                  ))}
                </div>
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
                  />
                </div>
                <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl text-white">
                  <p className="text-[9px] text-[#d4af37] opacity-60 uppercase italic mb-3 text-center font-black">Performance Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="border-r border-white/10">
                      <p className="text-[8px] opacity-40 font-black uppercase">Avg Amt</p>
                      <p className="text-lg text-[#d4af37] italic font-black">{threeMonthAvg.amt.toLocaleString()}만</p>
                    </div>
                    <div>
                      <p className="text-[8px] opacity-40 font-black uppercase">Avg Cnt</p>
                      <p className="text-lg text-[#d4af37] italic font-black">{threeMonthAvg.cnt}건</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3">
              <p className="text-[9px] text-slate-400 uppercase italic font-black">Quick Tools</p>
              <div className="grid grid-cols-1 gap-2">
                {fixedLinks.map(item => (
                  <button key={item.id} onClick={() => handleLinkClick(item)} className={`w-full flex items-center gap-3 px-5 py-4 border-2 ${item.color} rounded-2xl bg-white hover:bg-slate-50 active:scale-95 transition-all`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[11px] font-black">{item.label}</span>
                  </button>
                ))}
              </div>
              
              <button onClick={() => setIsConsultModalOpen(true)} className="w-full flex flex-col items-center justify-center gap-1 py-6 bg-black border-4 border-black rounded-[2rem] text-[#d4af37] hover:bg-slate-800 shadow-xl transition-all active:scale-95 group">
                <span className="text-2xl group-hover:scale-110 transition-transform">💼</span>
                <span className="text-[13px] font-black italic uppercase">Open Consult Tools</span>
              </button>
            </div>

            {isApproved && mode === 'office' && (
              <div className="bg-blue-50 p-5 rounded-[2.5rem] border border-blue-100 min-h-[120px] flex flex-col">
                <p className="text-[9px] font-black text-blue-600 uppercase italic mb-2">Instruction</p>
                <textarea 
                  value={dailyAdminNotice} 
                  onChange={(e) => isAdmin && saveDailyNotice(e.target.value)} 
                  readOnly={!isAdmin} 
                  className="w-full flex-1 bg-transparent text-[11px] font-black outline-none resize-none leading-relaxed text-blue-900" 
                />
              </div>
            )}
          </div>

          <div className="p-6 pt-2 flex-shrink-0">
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }} className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase italic">
              Logout System
            </button>
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