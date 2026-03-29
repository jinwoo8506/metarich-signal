"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import AdminView from "./components/AdminView"

// ✅ 상담 모드 메인 콘텐츠: 권한과 사이드바 설정에 따라 메뉴 필터링
function ConsultingView({ menuStatus, isApproved }: any) {
  const allMenus = [
    // [고정 메뉴] 게스트 포함 누구나 접근 가능
    { 
      id: "show_cafe", 
      title: "보험의 기준", 
      desc: "네이버 카페 바로가기", 
      icon: "☕", 
      url: "https://cafe.naver.com/signal1035", 
      color: "border-[#2db400] text-[#2db400]",
      fixed: true 
    },
    { 
      id: "show_cont", 
      title: "숨은 보험금 찾기", 
      desc: "미청구 보험금 및 휴면보험금 조회", 
      icon: "🔍", 
      url: "https://cont.insure.or.kr/cont_web/intro.do", 
      color: "border-emerald-500 text-emerald-600",
      fixed: true 
    },
    { 
      id: "show_hira", 
      title: "진료기록 확인", 
      desc: "국가 검진 및 보험료 납부 내역 확인", 
      icon: "🏥", 
      url: "https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000&WT.gnb=내+진료정보+열람", 
      color: "border-orange-500 text-orange-600",
      fixed: true 
    },
    // [직원 전용 메뉴] 승인된 인원(isApproved)만 보이며, 마스터가 활성화해야 함
    { 
      id: "show_finance", 
      title: "재무 / 보장분석", 
      desc: "종합 금융 플래닝 및 분석 리포트", 
      icon: "📊", 
      url: "/financial_planner.html", 
      color: "border-black text-black",
      staffOnly: true 
    },
    { 
      id: "show_insu", 
      title: "보장분석 PRO (유료)", 
      desc: "Gemini AI 기반 정밀 보장분석 시스템", 
      icon: "🛡️", 
      url: "/insu.html", 
      color: "border-blue-500 text-blue-600",
      staffOnly: true 
    },
    { 
      id: "show_gongsi", 
      title: "보험사 공시실(약관)", 
      desc: "각 보험사별 상품 공시실 바로가기", 
      icon: "📑", 
      url: "#", 
      color: "border-slate-400 text-slate-500",
      staffOnly: true 
    },
    { 
      id: "show_disease", 
      title: "질병코드 조회", 
      desc: "한국표준질병사인분류(KCD) 검색", 
      icon: "🧬", 
      url: "#", 
      color: "border-indigo-400 text-indigo-500",
      staffOnly: true 
    },
    { 
      id: "show_surgery", 
      title: "수술비 검색", 
      desc: "종별 수술비 및 약관상 수술 분류 조회", 
      icon: "✂️", 
      url: "#", 
      color: "border-rose-400 text-rose-500",
      staffOnly: true 
    }
  ];

  // 필터링 로직: 고정 메뉴 또는 승인된 직원의 활성화 메뉴
  const activeMenus = allMenus.filter(m => {
    if (m.fixed) return true; 
    if (m.staffOnly && isApproved && menuStatus[m.id]) return true;
    return false;
  });

  return (
    <div className="max-w-6xl mx-auto py-10 font-black">
      <div className="mb-12 border-l-8 border-blue-600 pl-6">
        <h1 className="text-4xl italic tracking-tighter uppercase">Professional Consulting</h1>
        <p className="text-slate-400 font-bold">
          {isApproved ? "권한에 맞는 모든 시스템이 활성화되었습니다." : "게스트용 기본 도구가 활성화되었습니다."}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeMenus.map((m, i) => (
          <button 
            key={i}
            onClick={() => window.open(m.url, "_blank")}
            className={`h-64 border-4 ${m.color} rounded-[2rem] bg-white flex flex-col items-center justify-center gap-4 shadow-xl hover:-translate-y-2 transition-all group active:scale-95`}
          >
            <span className="text-6xl group-hover:rotate-12 transition-transform">{m.icon}</span>
            <div className="text-center px-4">
              <h3 className="text-2xl font-black mb-1">{m.title}</h3>
              <p className="text-[11px] opacity-60 font-bold uppercase">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'select' | 'office' | 'consulting'>('select');
  
  // ✅ 사이드바 열림 상태 관리 (기본값 true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [menuStatus, setMenuStatus] = useState<any>({
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, 
    show_cont: true, show_gongsi: true, show_disease: true, show_surgery: true
  });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");
      
      const { data: userInfo } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle();
      if (!userInfo) return router.replace("/login");
      
      const { data: settings } = await supabase.from("team_settings").select("key, value");
      if (settings) {
        const sObj = settings.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value === "true";
          return acc;
        }, {});
        setMenuStatus((prev: any) => ({ ...prev, ...sObj }));
      }

      setUser(userInfo);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleMenuStatusChange = (newStatus: any) => {
    setMenuStatus(newStatus);
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-400 animate-pulse">Syncing System...</div>;

  const userEmail = user?.email?.toLowerCase()?.trim();
  const isAdminOrMaster = user.role === 'admin' || user.role === 'master' || userEmail === 'qodbtjq@naver.com';
  const isApproved = isAdminOrMaster || user?.is_approved === true || user?.is_approved === "true" || ['agent', 'leader', 'manager'].includes(user?.role);

  if (viewMode === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] font-black p-6 text-center">
        <h1 className="text-5xl mb-16 italic tracking-tighter"><span className="text-blue-600">{user.name}</span>님, 환영합니다!</h1>
        <div className="flex flex-col md:flex-row gap-10 w-full max-w-5xl">
          <button onClick={() => setViewMode('office')} className="flex-1 h-[400px] bg-white border-[4px] border-black rounded-[2.5rem] flex flex-col items-center justify-center gap-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group">
            <span className="text-8xl group-hover:scale-110 transition-transform">🏢</span>
            <h2 className="text-4xl font-black uppercase">사무실 업무</h2>
          </button>
          <button onClick={() => setViewMode('consulting')} className="flex-1 h-[400px] bg-blue-600 border-[4px] border-black rounded-[2.5rem] flex flex-col items-center justify-center gap-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group text-white">
            <span className="text-8xl group-hover:scale-110 transition-transform">🤝</span>
            <h2 className="text-4xl font-black uppercase">고객 상담</h2>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900 overflow-x-hidden">
      <Sidebar 
        user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} 
        mode={viewMode} onBack={() => setViewMode('select')} 
        externalMenuStatus={menuStatus} 
        onMenuStatusChange={handleMenuStatusChange}
        // ✅ 사이드바 상태 제어 프롭스 추가
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      {/* ✅ [수정 핵심] main 태그의 스타일
        isSidebarOpen이 true일 때 lg:ml-80 (사이드바 너비 320px) 여백을 주어 겹침 방지
      */}
      <main className={`
        flex-1 p-4 lg:p-10 w-full transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        <div className="max-w-[1600px] mx-auto">
          {viewMode === 'office' ? (
            isAdminOrMaster ? <AdminView user={user} selectedDate={selectedDate} /> : <AgentView user={user} selectedDate={selectedDate} />
          ) : (
            <ConsultingView menuStatus={menuStatus} isApproved={isApproved} /> 
          )}
        </div>
      </main>
    </div>
  );
}