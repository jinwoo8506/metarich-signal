"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Sidebar from "./components/Sidebar"
import AgentView from "./components/AgentView"
import AdminView from "./components/AdminView"

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    async function checkUser() {
      // 1. 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return router.replace("/login");
      }
      
      // 2. 사용자 상세 정보 가져오기
      const { data: userInfo, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (!userInfo || error) {
        return router.replace("/login");
      }
      
      setUser(userInfo);
      setLoading(false);
    }
    checkUser();
  }, [router]);

  // 로딩 화면
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

  // 데이터 로드 실패 시 방어 코드
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900">
      {/* 좌측 사이드바 (날짜 선택 및 메모 기능) */}
      <Sidebar 
        user={user} 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
      />
      
      {/* 우측 메인 콘텐츠 영역 */}
      <main className="flex-1 p-4 lg:p-10 max-w-[1600px] mx-auto w-full">
        {user.role === 'admin' || user.role === 'master' ? (
          <AdminView user={user} selectedDate={selectedDate} />
        ) : (
          <AgentView user={user} selectedDate={selectedDate} />
        )}
      </main>
    </div>
  );
}