"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Page (Main Entry) - Vercel Build Fix Version
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import AdminView from "./AdminView"
import AgentView from "./AgentView"

// 에러의 원인이었던 외부 아이콘 라이브러리(lucide-react) 임포트를 제거했습니다.
// 대신 브라우저 기본 이모지와 텍스트를 사용하여 빌드 오류를 원천 차단합니다.

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

  const isAdminRole = ['master', 'director', 'leader', 'manager'].includes(user?.role_level || user?.role)

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-black">
      
      {/* 🟢 상단 헤더 섹션 */}
      <header className="bg-white border-b-2 border-black p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <div className="bg-black w-10 h-10 flex items-center justify-center rounded-xl text-[#d4af37] text-xs">
              USER
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase leading-none">Welcome Back</p>
              <h1 className="text-sm md:text-base font-black italic uppercase">
                {user?.name} <span className="text-slate-400 font-normal">/ {user?.role_level || user?.role || 'Agent'}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 rounded-full px-4 py-1 border border-black/5">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:text-blue-600 transition-colors font-bold text-lg">
              ◀
            </button>
            <span className="text-sm md:text-base px-4 min-w-[100px] text-center italic">
              {selectedDate.getFullYear()}. {String(selectedDate.getMonth() + 1).padStart(2, '0')}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:text-blue-600 transition-colors font-bold text-lg">
              ▶
            </button>
          </div>

          <button onClick={handleLogout} className="bg-black text-white px-5 py-2 rounded-full hover:bg-red-600 transition-all text-xs italic flex items-center gap-2">
            LOGOUT ➔
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full">
        {isAdminRole ? (
          <AdminView user={user} selectedDate={selectedDate} />
        ) : (
          <AgentView user={user} selectedDate={selectedDate} />
        )}
      </main>

      <footer className="p-8 text-center text-[10px] text-slate-300 uppercase tracking-widest italic font-normal">
        © 2026 MetaRich Signal Group. All Rights Reserved.
      </footer>
    </div>
  )
}