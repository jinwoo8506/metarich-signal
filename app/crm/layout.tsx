'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const NAV_ITEMS = [
  { href: '/crm', label: '대시보드', icon: '🏠', exact: true },
  { href: '/crm/customers', label: '고객관리', icon: '👤', exact: false },
  { href: '/crm/alerts', label: '알림', icon: '🔔', exact: false },
  { href: '/crm/dm', label: 'DM', icon: '💬', exact: false },
  { href: '/crm/family', label: '가족현황', icon: '👨‍👩‍👧', exact: false },
  { href: '/crm/analysis', label: '보장분석', icon: '📊', exact: false },
]

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('name, role, crm_access').eq('id', session.user.id).single()
      const role = userData?.role || ''
      const isMaster = role === 'master'
      const hasCrm = userData?.crm_access === true || userData?.crm_access === 'true'
      if (!isMaster && !hasCrm) { router.replace('/dashboard'); return }
      setUser({ ...session.user, ...userData })
      setChecking(false)
    })
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-[#1a3a6e] text-white px-4 py-0 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center gap-1 h-12">
          <Link href="/dashboard" className="mr-3 text-white/60 hover:text-white text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            ← 대시보드
          </Link>
          <div className="w-px h-5 bg-white/20 mr-3 shrink-0" />
          <span className="text-white font-black text-sm mr-4 shrink-0">CRM</span>
          <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
          <div className="ml-auto shrink-0 text-white/40 text-xs hidden sm:block">
            {user?.name || user?.email?.split('@')[0]}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
