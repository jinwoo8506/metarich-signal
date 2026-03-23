"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import AdminView from "./components/AdminView"

// ✅ 새롭게 추가되는 상담용 뷰 컴포넌트
function ConsultingView() {
  const menus = [
    { title: "재무 / 보장분석", desc: "Gemini AI 기반 정밀 분석 리포트", icon: "📊", url: "/insu.html", color: "border-blue-500 text-blue-600" },
    { title: "숨은 보험금 찾기", desc: "미청구 보험금 및 휴면보험금 조회", icon: "🔍", url: "https://cont.insure.or.kr/", color: "border-emerald-500 text-emerald-600" },
    { title: "건강보험 조회", desc: "국가 검진 및 보험료 납부 내역 확인", icon: "🏥", url: "https://www.nhis.or.kr/", color: "border-orange-500 text-orange-600" }
  ];

  return (
    <div className="max-w-6xl mx-auto py-10 font-black">
      <div className="mb-12 border-l-8 border-blue-600 pl-6">
        <h1 className="text-4xl italic tracking-tighter uppercase">Professional Consulting</h1>
        <p className="text-slate-400 font-bold">고객님께 최적화된 맞춤형 분석 시스템입니다.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {menus.map((m, i) => (
          <button 
            key={i}
            onClick={() => window.open(m.url, "_blank")}
            className={`h-64 border-4 ${m.color} rounded-[2rem] bg-white flex flex-col items-center justify-center gap-4 shadow-xl hover:-translate-y-2 transition-all group active:scale-95`}
          >
            <span className="text-6xl group-hover:rotate-12 transition-transform">{m.icon}</span>
            <div className="text-center">
              <h3 className="text-2xl font-black mb-1">{m.title}</h3>
              <p className="text-[11px] opacity-60 font-bold tracking-tighter uppercase">{m.desc}</p>
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
  
  // ✅ viewMode 상태 추가: 'select' (선택창), 'office' (사무실), 'consulting' (상담)
  const [viewMode, setViewMode] = useState<'select' | 'office' | 'consulting'>('select');

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");
      
      const { data: userInfo, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (!userInfo || error) return router.replace("/login");
      
      setUser(userInfo);
      setLoading(false);
    }
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-400 animate-pulse uppercase tracking-tighter">Syncing System...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ✅ [1] 업무 선택 메인 화면 (로그인 직후 노출)
  if (viewMode === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] font-black p-6">
        <div className="text-center mb-16">
          <h1 className="text-5xl mb-4 italic tracking-tighter text-slate-900">
            <span className="text-blue-600">{user.name}</span>님, 환영합니다!
          </h1>
          <p className="text-lg text-slate-500 uppercase tracking-[0.3em] font-bold">Select Your Workspace</p>
        </div>

        <div className="flex flex-col md:flex-row gap-10 w-full max-w-5xl">
          <button 
            onClick={() => setViewMode('office')}
            className="flex-1 h-[400px] bg-white border-[4px] border-black rounded-[2.5rem] flex flex-col items-center justify-center gap-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group"
          >
            <span className="text-8xl group-hover:scale-110 transition-transform">🏢</span>
            <div className="text-center">
              <h2 className="text-4xl font-black mb-2 uppercase">사무실 업무</h2>
              <p className="text-sm text-slate-400 font-bold uppercase italic tracking-widest">Performance & Admin</p>
            </div>
          </button>

          <button 
            onClick={() => setViewMode('consulting')}
            className="flex-1 h-[400px] bg-blue-600 border-[4px] border-black rounded-[2.5rem] flex flex-col items-center justify-center gap-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group text-white"
          >
            <span className="text-8xl group-hover:scale-110 transition-transform">🤝</span>
            <div className="text-center">
              <h2 className="text-4xl font-black mb-2 uppercase">고객 상담</h2>
              <p className="text-sm text-blue-200 font-bold uppercase italic tracking-widest">Consulting Tools</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ✅ [2] 실제 업무 레이아웃 (선택 이후 노출)
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900">
      <Sidebar 
        user={user} 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
        mode={viewMode} // 현재 모드 전달
        onBack={() => setViewMode('select')} // 뒤로가기 기능 전달
      />
      
      <main className="flex-1 p-4 lg:p-10 max-w-[1600px] mx-auto w-full">
        {viewMode === 'office' ? (
          // 사무실 업무 모드: 기존 관리자/설계사 뷰 유지
          user.role === 'admin' || user.role === 'master' ? (
            <AdminView user={user} selectedDate={selectedDate} />
          ) : (
            <AgentView user={user} selectedDate={selectedDate} />
          )
        ) : (
          // 고객 상담 모드: 상담 도구 3가지 노출
          <ConsultingView />
        )}
      </main>
    </div>
  );
}