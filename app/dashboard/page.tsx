"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Page (Main Entry)
// 역할(Role)에 따른 뷰 전환 및 공통 레이아웃 유지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import AdminView from "./AdminView"
import AgentView from "./AgentView"
import { ChevronLeft, ChevronRight, LogOut, User } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }

      // 유저 상세 정보 및 권한(Role) 로드
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (error || !userData) {
        console.error("User data fetch error:", error)
        return
      }

      setUser(userData)
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const changeMonth = (offset: number) => {
    const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1)
    setSelectedDate(next)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-black"></div>
      </div>
    )
  }

  // 관리자 권한 여부 판단 (master, director, leader, manager)
  const isAdminRole = ['master', 'director', 'leader', 'manager'].includes(user?.role_level || user?.role)

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-black">
      
      {/* 🟢 상단 헤더 섹션 (공통) */}
      <header className="bg-white border-b-2 border-black p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* 로고 & 유저 정보 */}
          <div className="flex items-center gap-3">
            <div className="bg-black p-2 rounded-xl">
              <User size={20} className="text-[#d4af37]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase leading-none">Welcome Back</p>
              <h1 className="text-sm md:text-base font-black italic uppercase">
                {user?.name} <span className="text-slate-400 font-normal">/ {user?.role_level || user?.role || 'Agent'}</span>
              </h1>
            </div>
          </div>

          {/* 월 선택 컨트롤러 */}
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-1 border border-black/5">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:text-blue-600 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm md:text-base px-4 min-w-[100px] text-center italic">
              {selectedDate.getFullYear()}. {String(selectedDate.getMonth() + 1).padStart(2, '0')}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:text-blue-600 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 로그아웃 */}
          <button onClick={handleLogout} className="group flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full hover:bg-red-600 transition-all text-xs">
            <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
            <span className="hidden md:inline italic">LOGOUT</span>
          </button>
        </div>
      </header>

      {/* 🔵 메인 컨텐츠 영역 (역할에 따른 분기) */}
      <main className="flex-1 max-w-7xl mx-auto w-full">
        {isAdminRole ? (
          <AdminView user={user} selectedDate={selectedDate} />
        ) : (
          <AgentView user={user} selectedDate={selectedDate} />
        )}
      </main>

      {/* 🟡 푸터 섹션 */}
      <footer className="p-8 text-center text-[10px] text-slate-300 uppercase tracking-widest italic font-normal">
        © 2026 MetaRich Signal Group. All Rights Reserved.
      </footer>
    </div>
  )
}