"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import MasterView from "./components/MasterView" 
import LeaderView from "./components/LeaderView"
import ManagerView from "./components/ManagerView"
import FinancialCalc from "./components/FinancialCalc"

function ConsultingBox({ menu, onClick }: { menu: any, onClick: (item: any) => void }) {
  return (
    <button 
      onClick={() => onClick(menu)} 
      className={`h-64 border border-slate-100 ${menu.color} rounded-[2.5rem] bg-white flex flex-col items-center justify-center gap-4 shadow-sm hover:-translate-y-2 hover:shadow-xl transition-all active:scale-95 group`}
    >
      <span className="text-6xl group-hover:rotate-12 transition-transform">{menu.icon}</span>
      <div className="text-center px-4">
        <h3 className="text-2xl font-bold mb-1">{menu.title}</h3>
        <p className="text-[11px] opacity-60 font-medium uppercase tracking-wider">{menu.desc}</p>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'select' | 'office' | 'consulting'>('select');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [menuStatus, setMenuStatus] = useState<any>({});

  const allConsultingMenus = [
    { id: "show_cafe", title: "보험의 기준", desc: "네이버 카페 바로가기", icon: "☕", url: "https://cafe.naver.com/signal1035", color: "text-[#2db400]", fixed: true },
    { id: "show_cont", title: "숨은 보험금 찾기", desc: "미청구 보험금 조회", icon: "🔍", url: "https://cont.insure.or.kr/cont_web/intro.do", color: "text-emerald-600", fixed: true },
    { id: "show_hira", title: "진료기록 확인", desc: "국가 검진 및 내역 확인", icon: "🏥", url: "https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000", color: "text-orange-600", fixed: true },
    { id: "show_knia", title: "과실 비율 조회", desc: "자동차 사고 과실 비율 검색", icon: "⚖️", url: "https://accident.knia.or.kr", color: "text-blue-500", fixed: true },
    { id: "show_underwriting", title: "회사별 간편인수", desc: "간편심사 인수 기준 조회", icon: "📝", url: "/underwriting/index.html", color: "text-[#d4af37]", staffOnly: true },
    { id: "show_gongsi", title: "보험사 공시실", desc: "각 보험사별 상품 약관 공시", icon: "📑", url: "/gongsi.html", color: "text-slate-500", fixed: true },
    { id: "show_calc", title: "영업용 금융계산기", desc: "대출 / 예적금 / 환율", icon: "🧮", url: "tab:finance", color: "text-blue-600", staffOnly: true },
    { id: "show_surgery", title: "수술비 검색", desc: "종별 수술비 및 약관 조회", icon: "✂️", url: "/insurance-tools/surgery", color: "text-rose-500", staffOnly: true },
    { id: "show_disease", title: "질병코드 조회", desc: "KCD 질병사인분류 검색", icon: "🧬", url: "https://kcdcode.kr/browse/main", color: "text-indigo-500", staffOnly: true },
    { id: "show_disability", title: "장해분류표", desc: "상해/질병 장해분류 가이드", icon: "♿", url: "/insurance-tools/disability", color: "text-amber-600", staffOnly: true },
    { id: "show_car_accident", title: "자동차사고 가이드", desc: "과실 비율 및 대처 가이드", icon: "🚗", url: "/insurance-tools/car-accident", color: "text-emerald-600", staffOnly: true },
    { id: "show_finance", title: "재무 분석 도구", desc: "종합 금융 플래닝 리포트", icon: "📊", url: "/financial_planner.html", color: "text-slate-800", staffOnly: true },
    { id: "show_insu", title: "보장분석 PRO", desc: "정밀 보장분석 시스템", icon: "🛡️", url: "/insu.html", color: "text-blue-600", staffOnly: true },
  ];

  const init = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.replace("/login");

    const { data: userInfo } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle();
    if (!userInfo) return router.replace("/login");

    const { data: settings } = await supabase.from("team_settings").select("key, value");
    const statusMap = settings?.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value === "true" }), {}) || {};

    setMenuStatus(statusMap);
    setUser(userInfo);
    const role = (userInfo.role || "agent").toLowerCase().trim();
    if (role === 'guest') setViewMode('consulting');
    setLoading(false);
  }, [router]);

  useEffect(() => { init(); }, [init]);

  const handleNavigation = (item: any) => {
    const { url } = item;
    if (!url) return;
    if (url.startsWith('tab:')) {
      const targetTab = url.split(':')[1];
      setActiveTab(targetTab);
      return;
    }
    const finalUrl = url.startsWith('/') ? `${window.location.origin}${url}` : (url.startsWith('http') ? url : `https://${url}`);
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-bold uppercase text-slate-300 animate-pulse">Syncing System...</div>;

  const userRole = (user.role || "agent").toLowerCase().trim();
  const isMaster = userRole === 'master';
  const isLeader = userRole === 'leader';
  const isManager = userRole === 'manager';
  const isGuest = userRole === 'guest';
  const isApproved = !isGuest && (isMaster || isLeader || isManager || (userRole === 'agent' && (user.is_approved === true || user.is_approved === "true")));

  const renderOfficeView = () => {
    if (isGuest) return <div className="text-center py-20 font-bold">접근 권한이 없습니다.</div>;
    const props = { user, selectedDate, onTabChange: setActiveTab, currentUserRole: userRole };
    if (isMaster) return <MasterView {...props} />;
    if (isLeader) return <LeaderView {...props} />;
    if (isManager) return <ManagerView {...props} />;
    return <AgentView {...props} />;
  };

  const rankMap: { [key: string]: string } = {
    'master': '마스터',
    'director': '본부장',
    'leader': '사업부장',
    'manager': '지점장',
    'agent': '설계사',
    'guest': '사용자'
  };

  if (viewMode === 'select' && !isGuest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] p-6 text-center">
        <h1 className="text-3xl md:text-5xl mb-12 md:mb-16 italic tracking-tighter leading-tight font-sans">
          <span className="text-slate-400 block text-lg md:text-2xl mb-4 uppercase tracking-widest font-bold">
            {user.department_name || "미소속"} {user.branch_name || "지점미지정"}
          </span>
          <span className="text-blue-600 font-bold">{user.name}</span>
          <span className="text-slate-900 ml-2 font-bold">{rankMap[userRole] || "설계사"}님</span>
          <span className="block mt-2 text-xl md:text-3xl font-bold">환영합니다!</span>
        </h1>
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 w-full max-w-5xl">
          <button onClick={() => setViewMode('office')} className="flex-1 h-64 md:h-[400px] bg-white border border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 shadow-sm hover:-translate-y-2 hover:shadow-xl transition-all group">
            <span className="text-6xl md:text-8xl group-hover:scale-110 transition-transform">🏢</span>
            <h2 className="text-2xl md:text-4xl font-bold uppercase text-slate-800">사무실 업무</h2>
          </button>
          <button onClick={() => setViewMode('consulting')} className="flex-1 h-64 md:h-[400px] bg-blue-600 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 shadow-lg shadow-blue-600/20 hover:-translate-y-2 hover:shadow-blue-600/40 transition-all group text-white">
            <span className="text-6xl md:text-8xl group-hover:scale-110 transition-transform">🤝</span>
            <h2 className="text-2xl md:text-4xl font-bold uppercase">고객 상담</h2>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row overflow-x-hidden font-sans">
      <Sidebar user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} mode={viewMode} onBack={isGuest ? undefined : () => { setViewMode('select'); setActiveTab(null); }} externalMenuStatus={menuStatus} onMenuStatusChange={setMenuStatus} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onTabChange={(val: string) => handleNavigation({ url: val.startsWith('tab:') ? val : `tab:${val}` })} activeTab={activeTab} />
      <main className={`flex-1 p-4 lg:p-10 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'finance' ? (
            <>
              <HeaderBar title="Financial Calculator" icon="🧮" onBack={() => setActiveTab(null)} />
              <FinancialCalc />
            </>
          ) : (
            viewMode === 'office' ? renderOfficeView() : (
              <div className="max-w-6xl mx-auto py-6 md:py-10">
                <div className="mb-8 md:mb-12 border-l-8 border-blue-600 pl-4 md:pl-6">
                  <h1 className="text-3xl md:text-4xl italic tracking-tighter uppercase font-bold">Professional Consulting</h1>
                  <p className="text-slate-400 font-bold uppercase text-xs md:text-base">{isApproved ? "System Fully Activated" : "Guest Mode Enabled"}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {allConsultingMenus.filter(m => m.fixed || (m.staffOnly && isApproved && menuStatus[m.id])).map((menu) => (
                    <ConsultingBox key={menu.id} menu={menu} onClick={handleNavigation} />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}

function HeaderBar({ title, icon, onBack }: any) {
  return (
    <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex items-center gap-4 ml-4">
        <span className="text-2xl md:text-3xl">{icon}</span>
        <div>
          <h2 className="text-lg md:text-xl font-bold italic uppercase leading-none">{title}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Professional Support Tool</p>
        </div>
      </div>
      <button onClick={onBack} className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white rounded-full hover:scale-110 active:scale-95 transition-all text-2xl font-light">×</button>
    </div>
  );
}