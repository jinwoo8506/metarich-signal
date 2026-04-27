"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Page (Main Entry) - Sidebar Sync & Route Fix
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import MasterView from "./components/MasterView" 
import LeaderView from "./components/LeaderView"
import ManagerView from "./components/ManagerView"
import FinancialCalc from "./components/FinancialCalc"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. [Box Component] Consulting 도구 카드 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ConsultingBox({ menu, onClick }: { menu: any, onClick: (item: any) => void }) {
  return (
    <button 
      onClick={() => onClick(menu)} 
      className={`h-48 bg-white rounded-2xl flex flex-col p-6 shadow-sm border border-transparent hover:border-[#2563eb] hover:shadow-lg hover:-translate-y-1 transition-all group text-left`}
    >
      <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{menu.icon}</div>
      <div className="flex-1">
        <h3 className="text-[15px] font-bold text-[#1e293b] mb-1">{menu.title}</h3>
        <p className="text-[12px] text-[#94a3b8] leading-tight break-keep">{menu.desc}</p>
      </div>
      <div className="mt-4 text-[12px] font-bold text-[#2563eb] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        → 시작하기
      </div>
    </button>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Main Dashboard Page Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'select' | 'office' | 'consulting'>('select');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [menuStatus, setMenuStatus] = useState<any>({});

  // ✅ [데이터 동기화] 사이드바의 ID 및 URL 체계와 완벽 일치 (과실 비율 조회 추가)
  const allConsultingMenus = [
    { id: "show_cafe", title: "보험의 기준", desc: "네이버 카페 바로가기", icon: "☕", url: "https://cafe.naver.com/signal1035", color: "border-[#2db400] text-[#2db400]", fixed: true },
    { id: "show_cont", title: "숨은 보험금 찾기", desc: "미청구 보험금 조회", icon: "🔍", url: "https://cont.insure.or.kr/cont_web/intro.do", color: "border-emerald-500 text-emerald-600", fixed: true },
    { id: "show_hira", title: "진료기록 확인", desc: "국가 검진 및 내역 확인", icon: "🏥", url: "https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000", color: "border-orange-500 text-orange-600", fixed: true },
    
    // ✅ 추가된 고정 링크: 과실 비율 조회
    { id: "show_knia", title: "과실 비율 조회", desc: "자동차 사고 과실 비율 검색", icon: "⚖️", url: "https://accident.knia.or.kr", color: "border-blue-400 text-blue-500", fixed: true },
    
    { id: "show_gongsi", title: "보험사 공시실", desc: "각 보험사별 상품 약관 공시", icon: "📑", url: "/gongsi.html", color: "border-slate-400 text-slate-500", fixed: true },

    { id: "show_calc", title: "영업용 금융계산기", desc: "대출 / 예적금 / 환율", icon: "🧮", url: "tab:finance", color: "border-blue-500 text-blue-600", staffOnly: true },
    
    // 🛠️ 내부 라우팅 도구들
    { id: "show_surgery", title: "수술비 검색", desc: "종별 수술비 및 약관 조회", icon: "✂️", url: "/insurance-tools/surgery", color: "border-rose-400 text-rose-500", staffOnly: true },
    { id: "show_disease", title: "질병코드 조회", desc: "KCD 질병사인분류 검색", icon: "🧬", url: "https://kcdcode.kr/browse/main", color: "border-indigo-400 text-indigo-500", staffOnly: true },
    { id: "show_disability", title: "장해분류표", desc: "상해/질병 장해분류 가이드", icon: "♿", url: "/insurance-tools/disability", color: "border-amber-500 text-amber-600", staffOnly: true },
    { id: "show_car_accident", title: "자동차사고 가이드", desc: "과실 비율 및 대처 가이드", icon: "🚗", url: "/insurance-tools/car-accident", color: "border-emerald-400 text-emerald-600", staffOnly: true },
    
    // 정적 HTML 도구
    { id: "show_finance", title: "재무 분석 도구", desc: "종합 금융 플래닝 리포트", icon: "📊", url: "/financial_planner.html", color: "border-black text-black", staffOnly: true },
    { id: "show_insu", title: "보장분석 PRO", desc: "정밀 보장분석 시스템", icon: "🛡️", url: "/insu.html", color: "border-blue-600 text-blue-600", staffOnly: true },
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
    if (role === 'guest') {
      setViewMode('consulting');
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    init();
  }, [init]);

  // ✅ [네비게이션 통합 핸들러] 모든 도구는 새 창으로 열리도록 일치화
  const handleNavigation = (item: any) => {
    const { url } = item;
    if (!url) return;

    // 1. 탭 전환 (계산기 등 내부 탭)
    if (url.startsWith('tab:')) {
      const targetTab = url.split(':')[1];
      setActiveTab(targetTab);
      return;
    }

    // ✅ 2. 모든 링크(내부/외부/HTML)를 새 창으로 열기 (사이드바 로직과 동기화)
    const finalUrl = url.startsWith('/') 
      ? `${window.location.origin}${url}` 
      : (url.startsWith('http') ? url : `https://${url}`);

    window.open(finalUrl, "_blank", "noopener,noreferrer");
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-400 animate-pulse">Syncing System...</div>;

  const userRole = (user.role || "agent").toLowerCase().trim();
  const isMaster = userRole === 'master';
  const isLeader = userRole === 'leader';
  const isManager = userRole === 'manager';
  const isGuest = userRole === 'guest';
  
  const isApproved = !isGuest && (isMaster || isLeader || isManager || (userRole === 'agent' && (user.is_approved === true || user.is_approved === "true")));

  const renderOfficeView = () => {
    if (isGuest) return <div className="text-center py-20 font-black">접근 권한이 없습니다.</div>;
    const props = { user, selectedDate, onTabChange: setActiveTab, currentUserRole: userRole };
    
    if (isMaster) return <MasterView {...props} />;
    if (isLeader) return <LeaderView {...props} />;
    if (isManager) return <ManagerView {...props} />;
    return <AgentView {...props} />;
  };

  if (viewMode === 'select' && !isGuest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f4ff] p-6 text-center">
        <div className="mb-12">
          <p className="text-[12px] text-[#2563eb] font-bold tracking-widest uppercase mb-2">Welcome Back</p>
          <h1 className="text-3xl md:text-5xl font-black text-[#1a3a6e] flex items-center justify-center gap-3">
            <span>{user.name}</span>
            <span className="text-sm md:text-lg px-3 py-1 bg-[#1a3a6e]/5 text-[#1a3a6e]/60 rounded-full font-bold">{userRole}</span>
          </h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
          <button 
            onClick={() => setViewMode('office')} 
            className="flex-1 h-64 md:h-[320px] bg-white rounded-3xl flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all group border border-white"
          >
            <div className="w-20 h-20 bg-[#eff6ff] rounded-2xl flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">🏢</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#1e293b]">사무실 업무</h2>
              <p className="text-sm text-[#94a3b8] mt-1 font-medium">실적 관리 및 내근 업무</p>
            </div>
          </button>
          
          <button 
            onClick={() => setViewMode('consulting')} 
            className="flex-1 h-64 md:h-[320px] bg-gradient-to-br from-[#1a3a6e] to-[#2563eb] rounded-3xl flex flex-col items-center justify-center gap-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all group text-white border border-white/10"
          >
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">🤝</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">고객 상담</h2>
              <p className="text-sm text-white/60 mt-1 font-medium">영업 지원 및 상담 도구</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col lg:flex-row overflow-x-hidden">
      <Sidebar 
        user={user} 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
        mode={viewMode} 
        onBack={isGuest ? undefined : () => { setViewMode('select'); setActiveTab(null); }} 
        externalMenuStatus={menuStatus} 
        onMenuStatusChange={setMenuStatus}
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        onTabChange={(val: string) => handleNavigation({ url: val.startsWith('tab:') ? val : `tab:${val}` })} 
        activeTab={activeTab} 
      />

      <main className={`flex-1 p-4 lg:p-10 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[240px]' : 'lg:ml-0'}`}>
        <div className="max-w-[1400px] mx-auto">
          {activeTab === 'finance' ? (
            <div className="animate-in fade-in duration-500">
              <HeaderBar title="Financial Calculator" icon="🧮" onBack={() => setActiveTab(null)} />
              <FinancialCalc />
            </div>
          ) : (
            viewMode === 'office' ? renderOfficeView() : (
              <div className="max-w-5xl mx-auto py-6 md:py-8">
                <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border-l-[6px] border-[#2563eb]">
                  <h1 className="text-3xl font-black text-[#1a3a6e] tracking-tight">Professional Consulting</h1>
                  <p className="text-[#94a3b8] font-bold text-sm mt-1 uppercase tracking-widest">{isApproved ? "System Fully Activated" : "Guest Mode Enabled"}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allConsultingMenus
                    .filter(m => m.fixed || (m.staffOnly && isApproved && menuStatus[m.id]))
                    .map((menu) => (
                      <ConsultingBox 
                        key={menu.id} 
                        menu={menu} 
                        onClick={handleNavigation} 
                      />
                    ))
                  }
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
    <div className="mb-8 flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-white">
      <div className="flex items-center gap-4 ml-2">
        <div className="w-12 h-12 bg-[#eff6ff] rounded-2xl flex items-center justify-center text-2xl shadow-inner">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black text-[#1a3a6e] tracking-tight leading-none uppercase">{title}</h2>
          <p className="text-[11px] text-[#94a3b8] font-bold uppercase mt-1 tracking-widest">Professional Support Tool</p>
        </div>
      </div>
      <button 
        onClick={onBack} 
        className="w-10 h-10 flex items-center justify-center bg-[#f1f5f9] text-[#475569] rounded-full hover:bg-[#e2e8f0] active:scale-95 transition-all text-xl font-bold"
      >
        ×
      </button>
    </div>
  );
}