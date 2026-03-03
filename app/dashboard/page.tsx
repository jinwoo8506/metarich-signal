"use client"

import { useEffect, useState } from "react"
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");
      
      const { data: userInfo } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle();
      if (!userInfo) return router.replace("/login");
      
      setUser(userInfo);
      setLoading(false);
    }
    checkUser();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse">Syncing System...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans text-slate-900">
      <Sidebar user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} />
      
      <main className="flex-1 p-4 lg:p-10 max-w-[1600px] mx-auto w-full">
        {user.role === 'admin' || user.role === 'master' ? (
          <AdminView user={user} selectedDate={selectedDate} />
        ) : (
          <AgentView user={user} selectedDate={selectedDate} />
        )}
      </main>
    </div>
  )
}