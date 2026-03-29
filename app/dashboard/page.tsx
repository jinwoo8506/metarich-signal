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

// [상담 도구 뷰] - 기존 로직 100% 유지 (수술비 연결 추가)
function ConsultingView({ menuStatus, isApproved, onTabChange }: any) {
  const allMenus = [
    { id: "show_cafe", title: "보험의 기준", desc: "네이버 카페", icon: "☕", url: "https://cafe.naver.com/signal1035", color: "border-[#2db400] text-[#2db400]", fixed: true },
    { id: "show_cont", title: "숨은 보험금 찾기", desc: "미청구 보험금 조회", icon: "🔍", url: "https://cont.insure.or.kr/cont_web/intro.do", color: "border-emerald-500 text-emerald-600", fixed: true },
    { id: "show_hira", title: "진료기록 확인", desc: "내 진료정보 열람", icon: "🏥", url: "https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000", color: "border-orange-500 text-orange-600", fixed: true },
    { id: "show_calc", title: "영업용 금융계산기", desc: "대출/예적금/환율", icon: "🧮", url: "tab:finance", color: "border-blue-500 text-blue-600", staffOnly: true },
    { id: "show_finance", title: "재무 / 보장분석", desc: "종합 리포트", icon: "📊", url: "/financial_planner.html", color: "border-black text-black", staffOnly: true },
    { id: "show_insu", title: "보장분석 PRO", desc: "AI 분석 시스템", icon: "🛡️", url: "/insu.html", color: "border-blue-500 text-blue-600", staffOnly: true },
    { id: "show_gongsi", title: "보험사 공시실", desc: "상품 공시실 바로가기", icon: "📑", url: "tab:gongsi", color: "border-slate-400 text-slate-500", staffOnly: true },
    { id: "show_disease", title: "질병코드 조회", desc: "KCD 검색", icon: "🧬", url: "http://www.koicd.kr/kcd/kcd.do", color: "border-indigo-400 text-indigo-500", staffOnly: true },
    { id: "show_surgery", title: "수술비 검색", desc: "종별 수술 분류 조회", icon: "✂️", url: "tab:surgery", color: "border-rose-400 text-rose-500", staffOnly: true }
  ];

  const activeMenus = allMenus.filter(m => m.fixed || (m.staffOnly && isApproved && menuStatus[m.id]));

  return (
    <div className="max-w-6xl mx-auto py-10 font-black">
      <div className="mb-12 border-l-8 border-blue-600 pl-6">
        <h1 className="text-4xl italic tracking-tighter uppercase">Professional Consulting</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeMenus.map((m) => (
          <button key={m.id} onClick={() => m.url?.startsWith('tab:') ? onTabChange(m.url.split(':')[1]) : window.open(m.url, "_blank")} 
            className={`h-64 border-4 ${m.color} rounded-[2rem] bg-white flex flex-col items-center justify-center gap-4 shadow-xl hover:-translate-y-2 transition-all active:scale-95`}>
            <span className="text-6xl">{m.icon}</span>
            <div className="text-center px-4"><h3 className="text-2xl font-black">{m.title}</h3><p className="text-[11px] opacity-60 uppercase">{m.desc}</p></div>
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

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-black">Syncing...</div>;

  // 권한 변수 설정
  const role = user.role?.toLowerCase() || "";
  const level = user.role_level?.toLowerCase() || "";
  const isMaster = user.email === 'qodbtjq@naver.com' || role === 'master' || level === 'master';
  const isLeader = role === 'leader' || level === 'director' || level === 'leader';
  const isManager = role === 'manager' || level === 'manager';
  const isApproved = isMaster || isLeader || isManager || role === 'agent' || String(user.is_approved) === "true";

  if (viewMode === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] font-black p-6">
        <h1 className="text-5xl mb-16 italic tracking-tighter"><span className="text-blue-600">{user.name}</span>님, 환영합니다!</h1>
        <div className="flex flex-col md:flex-row gap-10 w-full max-w-5xl">
          <button onClick={() => setViewMode('office')} className="flex-1 h-[400px] bg-white border-[4px] border-black rounded-[2.5rem] flex flex-col items-center justify-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:shadow-none transition-all">
            <span className="text-8xl mb-4">🏢</span><h2 className="text-4xl uppercase">사무실 업무</h2>
          </button>
          <button onClick={() => setViewMode('consulting')} className="flex-1 h-[400px] bg-blue-600 border-[4px] border-black rounded-[2.5rem] flex flex-col items-center justify-center text-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:shadow-none transition-all">
            <span className="text-8xl mb-4">🤝</span><h2 className="text-4xl uppercase">고객 상담</h2>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row overflow-x-hidden font-black">
      <Sidebar user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} mode={viewMode} onBack={() => { setViewMode('select'); setActiveTab(null); }} externalMenuStatus={menuStatus} onMenuStatusChange={setMenuStatus} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onTabChange={setActiveTab} activeTab={activeTab} />
      <main className={`flex-1 p-4 lg:p-10 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        {activeTab === 'finance' ? (
          <><HeaderBar title="Calculator" icon="🧮" onBack={() => setActiveTab(null)} /><FinancialCalc /></>
        ) : activeTab === 'gongsi' ? (
          <><HeaderBar title="Gongsi" icon="📑" onBack={() => setActiveTab(null)} /><iframe src="/gongsi.html" className="w-full h-[80vh] border-4 border-black rounded-[2rem] bg-white" /></>
        ) : activeTab === 'surgery' ? (
          <><HeaderBar title="Surgery" icon="✂️" onBack={() => setActiveTab(null)} /><iframe src="/susul.html" className="w-full h-[80vh] border-4 border-black rounded-[2rem] bg-white" /></>
        ) : (
          viewMode === 'office' ? (
            isMaster ? <AdminView user={user} selectedDate={selectedDate} /> :
            isLeader ? <LeaderView user={user} selectedDate={selectedDate} /> :
            isManager ? <ManagerView user={user} selectedDate={selectedDate} /> :
            <AgentView user={user} selectedDate={selectedDate} />
          ) : <ConsultingView menuStatus={menuStatus} isApproved={isApproved} onTabChange={setActiveTab} />
        )}
      </main>
    </div>
  );
}

function HeaderBar({ title, icon, onBack }: any) {
  return (
    <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-black">
      <div className="flex items-center gap-4 ml-4"><span className="text-3xl">{icon}</span><h2 className="text-xl italic uppercase">{title}</h2></div>
      <button onClick={onBack} className="w-12 h-12 flex items-center justify-center bg-black text-[#d4af37] rounded-full text-2xl">×</button>
    </div>
  );
}