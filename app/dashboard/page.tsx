"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import AdminView from "./components/masterView"
import LeaderView from "./components/LeaderView"
import ManagerView from "./components/ManagerView"
import FinancialCalc from "./components/FinancialCalc"

// [상담 도구 뷰 컴포넌트] - 사이드바와 기능을 동기화
function ConsultingView({ menuStatus, isApproved, onTabChange }: any) {
  const allMenus = [
    { id: "show_cafe", title: "보험의 기준", desc: "네이버 카페 바로가기", icon: "☕", url: "https://cafe.naver.com/signal1035", color: "border-[#2db400] text-[#2db400]", fixed: true },
    { id: "show_cont", title: "숨은 보험금 찾기", desc: "미청구 보험금 및 휴면보험금 조회", icon: "🔍", url: "https://cont.insure.or.kr/cont_web/intro.do", color: "border-emerald-500 text-emerald-600", fixed: true },
    { id: "show_hira", title: "진료기록 확인", desc: "국가 검진 및 보험료 납부 내역 확인", icon: "🏥", url: "https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000", color: "border-orange-500 text-orange-600", fixed: true },
    // 탭 전환 방식(onTabChange)으로 통일하여 사이드바와 동기화
    { id: "show_calc", title: "영업용 금융계산기", desc: "대출 / 예적금 / 환율 계산기", icon: "🧮", url: "tab:finance", color: "border-blue-500 text-blue-600", staffOnly: true },
    { id: "show_finance", title: "재무 / 보장분석", desc: "종합 금융 플래닝 및 분석 리포트", icon: "📊", url: "/financial_planner.html", color: "border-black text-black", staffOnly: true },
    { id: "show_insu", title: "보장분석 PRO (유료)", desc: "AI 기반 정밀 보장분석 시스템", icon: "🛡️", url: "/insu.html", color: "border-blue-500 text-blue-600", staffOnly: true },
    { id: "show_gongsi", title: "보험사 공시실(약관)", desc: "각 보험사별 상품 공시실 바로가기", icon: "📑", url: "tab:gongsi", color: "border-slate-400 text-slate-500", staffOnly: true },
    { id: "show_disease", title: "질병코드 조회", desc: "한국표준질병사인분류(KCD) 검색", icon: "🧬", url: "http://www.koicd.kr/kcd/kcd.do", color: "border-indigo-400 text-indigo-500", staffOnly: true },
    { id: "show_surgery", title: "수술비 검색", desc: "종별 수술비 및 약관상 수술 분류 조회", icon: "✂️", url: "tab:surgery", color: "border-rose-400 text-rose-500", staffOnly: true }
  ];

  const activeMenus = allMenus.filter(m => m.fixed || (m.staffOnly && isApproved && menuStatus[m.id]));

  return (
    <div className="max-w-6xl mx-auto py-10 font-black">
      <div className="mb-12 border-l-8 border-blue-600 pl-6">
        <h1 className="text-4xl italic tracking-tighter uppercase">Professional Consulting</h1>
        <p className="text-slate-400 font-bold uppercase">{isApproved ? "System Fully Activated" : "Guest Mode Enabled"}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeMenus.map((m) => (
          <button 
            key={m.id} 
            onClick={() => {
              // tab: 으로 시작하면 내부 탭 변경(onTabChange), 아니면 새창
              if (m.url?.startsWith('tab:')) {
                onTabChange(m.url.split(':')[1]);
              } else {
                window.open(m.url, "_blank", "noopener,noreferrer");
              }
            }} 
            className={`h-64 border-4 ${m.color} rounded-[2rem] bg-white flex flex-col items-center justify-center gap-4 shadow-xl hover:-translate-y-2 transition-all active:scale-95 group`}
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

// [메인 대시보드 페이지]
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'select' | 'office' | 'consulting'>('select');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [menuStatus, setMenuStatus] = useState<any>({});

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");

      const { data: userInfo } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle();
      if (!userInfo) return router.replace("/login");

      const { data: settings } = await supabase.from("team_settings").select("key, value");
      setMenuStatus(settings?.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value === "true" }), {}) || {});
      setUser(userInfo);
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-400 animate-pulse">Syncing System...</div>;

  const email = (user.email || "").toLowerCase().trim();
  const role = (user.role || "").toLowerCase();
  const level = (user.role_level || "").toLowerCase();

  const isMaster = email === 'qodbtjq@naver.com' || role === 'master' || level === 'master';
  const isLeader = !isMaster && (role === 'leader' || level === 'director' || level === 'leader');
  const isManager = !isMaster && !isLeader && (role === 'manager' || level === 'manager');
  const isApproved = isMaster || isLeader || isManager || role === 'agent' || String(user.is_approved) === "true";

  if (viewMode === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] font-black p-6 text-center">
        <h1 className="text-5xl mb-16 italic tracking-tighter">
          <span className="text-blue-600">{user.name || user.full_name}</span>님, 환영합니다!
        </h1>
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-black overflow-x-hidden">
      <Sidebar 
        user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} mode={viewMode} 
        onBack={() => { setViewMode('select'); setActiveTab(null); }} 
        externalMenuStatus={menuStatus} onMenuStatusChange={setMenuStatus}
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
        onTabChange={setActiveTab} activeTab={activeTab} isAdmin={isMaster}
      />
      <main className={`flex-1 p-4 lg:p-10 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        <div className="max-w-[1600px] mx-auto">
          {/* 사이드바와 대시보드 버튼 모두가 공유하는 화면 렌더링 로직 */}
          {activeTab === 'finance' ? (
            <><HeaderBar title="Financial Calculator" icon="🧮" onBack={() => setActiveTab(null)} /><FinancialCalc /></>
          ) : activeTab === 'gongsi' ? (
            <><HeaderBar title="Insurance Gongsi" icon="📑" onBack={() => setActiveTab(null)} /><iframe src="/gongsi.html" className="w-full h-[80vh] border-4 border-black rounded-[2rem] bg-white shadow-xl" /></>
          ) : activeTab === 'surgery' ? (
            <><HeaderBar title="Surgery Search" icon="✂️" onBack={() => setActiveTab(null)} /><iframe src="/susul.html" className="w-full h-[80vh] border-4 border-black rounded-[2rem] bg-white shadow-xl" /></>
          ) : (
            viewMode === 'office' ? (
              isMaster ? <AdminView user={user} selectedDate={selectedDate} /> :
              isLeader ? <LeaderView user={user} selectedDate={selectedDate} /> :
              isManager ? <ManagerView user={user} selectedDate={selectedDate} /> :
              <AgentView user={user} selectedDate={selectedDate} />
            ) : (
              <ConsultingView 
                menuStatus={menuStatus} 
                isApproved={isApproved} 
                onTabChange={setActiveTab} // 대시보드 버튼 클릭 시 상위 activeTab 상태를 변경하도록 함
              />
            )
          )}
        </div>
      </main>
    </div>
  );
}

function HeaderBar({ title, icon, onBack }: any) {
  return (
    <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-4 ml-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-xl font-black italic uppercase leading-none">{title}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Professional Support Tool</p>
        </div>
      </div>
      <button onClick={onBack} className="w-12 h-12 flex items-center justify-center bg-black text-[#d4af37] rounded-full hover:scale-110 active:scale-95 transition-all text-2xl font-black">×</button>
    </div>
  );
}