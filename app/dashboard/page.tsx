"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Page (Main Entry) - Original Path & MasterView Update
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

// ⚠️ 폴더 변경이 없었다면 기존처럼 같은 위치(./)에서 불러옵니다.
// 단, 파일명이 정확히 MasterView.tsx 인지 다시 한번 확인해주세요.
import MasterView from "./MasterView"
import AgentView from "./AgentView"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    const checkUser = async () => {
      try {
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
          router.push("/login")
          return
        }

        setUser(userData)
      } catch (err) {
        console.error("Auth Check Error:", err)
      } finally {
        setLoading(false)
      }
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-white font-black italic">
        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-black mb-4"></div>
        <p className="text-xs uppercase tracking-widest animate-pulse">Loading System...</p>
      </div>
    )
  }

  const isAdminRole = ['master', 'director', 'leader', 'manager'].includes(user?.role_level || user?.role)

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-black text-black">
      
      {/* 🟢 상단 헤더 섹션 */}
      <header className="bg-white border-b-2 border-black p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="bg-black w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-2xl text-[#d4af37] text-[10px] md:text-xs font-black border-2 border-[#d4af37] shadow-sm">
              METARICH
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] text-slate-400 uppercase leading-none tracking-tighter">System Access</p>
              <h1 className="text-sm md:text-base font-black italic uppercase">
                {user?.name} <span className="text-[#d4af37] drop-shadow-sm font-black">/ {user?.role_level || user?.role || 'Agent'}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center bg-black text-white rounded-full px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(212,175,55,1)]">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center hover:text-[#d4af37]">◀</button>
            <div className="text-xs md:text-sm px-2 md:px-4 min-w-[90px] md:min-w-[110px] text-center italic font-black text-[#d4af37]">
              {selectedDate.getFullYear()}. {String(selectedDate.getMonth() + 1).padStart(2, '0')}
            </div>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center hover:text-[#d4af37]">▶</button>
          </div>

          <button onClick={handleLogout} className="bg-white text-black border-2 border-black px-3 md:px-5 py-2 rounded-full hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-[10px] md:text-xs italic font-black">
            LOGOUT ➔
          </button>
        </div>
      </header>

      {/* 🔵 메인 컨텐츠 영역 */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 md:px-4 py-4 md:py-6">
        <div className="bg-white/50 rounded-[2rem] md:rounded-[3rem] p-1 md:p-2 border-2 border-dashed border-black/5">
          {isAdminRole ? (
            <MasterView user={user} selectedDate={selectedDate} />
          ) : (
            <AgentView user={user} selectedDate={selectedDate} />
          )}
        </div>
      </main>

      <footer className="p-8 text-center text-[10px] text-slate-300 uppercase italic">
        © 2026 MetaRich Signal Group. All Rights Reserved.
      </footer>
    </div>
  )
}