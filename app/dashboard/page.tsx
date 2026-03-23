"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import AdminView from "./components/AdminView"

// ✅ 상담 모드 메인 콘텐츠: 사이드바 설정(menuStatus)과 동기화됨
function ConsultingView({ menuStatus }: any) {
  const allMenus = [
    { id: "show_insu", title: "재무 / 보장분석", desc: "Gemini AI 기반 정밀 분석 리포트", icon: "📊", url: "/insu.html", color: "border-blue-500 text-blue-600" },
    { id: "show_cont", title: "숨은 보험금 찾기", desc: "미청구 보험금 및 휴면보험금 조회", icon: "🔍", url: "https://cont.insure.or.kr/cont_web/intro.do", color: "border-emerald-500 text-emerald-600" },
    { id: "show_hira", title: "진료기록 확인", desc: "국가 검진 및 보험료 납부 내역 확인", icon: "🏥", url: "https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000&WT.gnb=내+진료정보+열람", color: "border-orange-500 text-orange-600" }
  ];

  // 관리자가 활성화한 메뉴만 필터링
  const activeMenus = allMenus.filter(m => menuStatus[m.id]);

  return (
    <div className="max-w-6xl mx-auto py-10 font-black">
      <div className="mb-12 border-l-8 border-blue-600 pl-6">
        <h1 className="text-4xl italic tracking-tighter uppercase">Professional Consulting</h1>
        <p className="text-slate-400 font-bold">활성화된 분석 시스템만 표시됩니다.</p>
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
  
  // ✅ 관리자 설정 상태를 상위에서 관리하여 사이드바와 메인화면 공유
  const [menuStatus, setMenuStatus] = useState<any>({
    show_finance: true, show_insu: true, show_cafe: true, show_hira: true, show_cont: true
  });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");
      
      const { data: userInfo } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle();
      if (!userInfo) return router.replace("/login");
      
      // ✅ 관리자 설정 불러오기
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

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-400 animate-pulse">Syncing System...</div>;

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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900">
      <Sidebar 
        user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} 
        mode={viewMode} onBack={() => setViewMode('select')} 
        externalMenuStatus={menuStatus} // 외부에서 불러온 설정 전달
      />
      <main className="flex-1 p-4 lg:p-10 max-w-[1600px] mx-auto w-full">
        {viewMode === 'office' ? (
          user.role === 'admin' || user.role === 'master' ? <AdminView user={user} selectedDate={selectedDate} /> : <AgentView user={user} selectedDate={selectedDate} />
        ) : (
          <ConsultingView menuStatus={menuStatus} /> // ✅ 사이드바 설정대로 버튼 필터링
        )}
      </main>
    </div>
  );
}