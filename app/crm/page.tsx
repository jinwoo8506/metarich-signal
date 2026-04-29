'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'

const statusLabels: Record<string, string> = {
  new: '신규', analysis: '분석', consulting: '상담', proposal: '제안',
  hold: '보류', contracted: '계약', managing: '관리',
}
const statusColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600', analysis: 'bg-blue-50 text-blue-700',
  consulting: 'bg-yellow-50 text-yellow-700', proposal: 'bg-purple-50 text-purple-700',
  hold: 'bg-red-50 text-red-600', contracted: 'bg-green-50 text-green-700',
  managing: 'bg-emerald-50 text-emerald-700',
}
const notifTypeLabels: Record<string, string> = {
  birthday: '생일', indemnity_end: '면책 종료', reduction_end: '감액 종료',
  car_renewal_d60: '자동차 D-60', car_renewal_d30: '자동차 D-30',
  indemnity_renewal: '실손 재가입', join_30: '가입 30일', join_90: '가입 90일',
  join_180: '가입 180일', join_365: '가입 1년', consulting: '상담 예정',
}
const notifTypeColors: Record<string, string> = {
  birthday: 'bg-pink-100 text-pink-700', indemnity_end: 'bg-orange-100 text-orange-700',
  reduction_end: 'bg-orange-100 text-orange-700', car_renewal_d60: 'bg-purple-100 text-purple-700',
  car_renewal_d30: 'bg-purple-100 text-purple-700', indemnity_renewal: 'bg-cyan-100 text-cyan-700',
  join_30: 'bg-blue-100 text-blue-700', join_90: 'bg-blue-100 text-blue-700',
  join_180: 'bg-blue-100 text-blue-700', join_365: 'bg-blue-100 text-blue-700',
  consulting: 'bg-green-100 text-green-700',
}

export default function CrmDashboard() {
  const [loading, setLoading] = useState(true)
  const [advisorName, setAdvisorName] = useState('담당자')
  const [customers, setCustomers] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, totalPremium: 0, pendingNotif: 0 })
  const [radarData, setRadarData] = useState<{ category: string; value: number; recommended: number }[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: userData } = await supabase
        .from('users').select('name').eq('id', session.user.id).single()
      setAdvisorName(userData?.name || session.user.email?.split('@')[0] || '담당자')

      const { data: custs } = await supabase
        .from('customers').select('*').eq('advisor_id', session.user.id)
        .order('join_date', { ascending: false })
      const custList = custs || []
      setCustomers(custList)

      const custIds = custList.map((c: any) => c.id)
      const { data: notifs } = custIds.length > 0
        ? await supabase.from('notifications').select('*')
            .in('customer_id', custIds).eq('is_done', false)
            .order('due_date', { ascending: true }).limit(10)
        : { data: [] }
      setNotifications(notifs || [])

      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      setStats({
        total: custList.length,
        thisMonth: custList.filter((c: any) => c.join_date?.startsWith(thisMonth)).length,
        totalPremium: custList.reduce((s: number, c: any) => s + (c.monthly_premium || 0), 0),
        pendingNotif: (notifs || []).length,
      })

      if (custIds.length > 0) {
        const { data: coverages } = await supabase
          .from('coverages').select('category, amount').in('customer_id', custIds)
        const catTotals: Record<string, number> = {}
        ;(coverages || []).forEach((cv: any) => {
          catTotals[cv.category] = (catTotals[cv.category] || 0) + (cv.amount || 0)
        })
        const maxAmt = Math.max(...Object.values(catTotals), 1)
        const catNames: Record<string, string> = {
          cancer: '암', brain: '뇌혈관', heart: '심장', surgery: '수술',
          hospitalization: '입원', nursing: '간병', driver: '운전자', fire: '화재',
        }
        setRadarData(Object.entries(catNames).map(([key, label]) => ({
          category: label,
          value: Math.round(((catTotals[key] || 0) / maxAmt) * 100),
          recommended: 100,
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">안녕하세요, {advisorName}님!</h1>
        <p className="text-sm text-gray-500 mt-0.5">고객 관리 현황을 확인하세요.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: '전체 고객', value: stats.total, unit: '명', color: 'text-blue-600' },
          { label: '이번달 신규', value: stats.thisMonth, unit: '명', color: 'text-emerald-600' },
          { label: '월 총 보험료', value: `${Math.round(stats.totalPremium / 10000)}만`, unit: '원', color: 'text-purple-600' },
          { label: '미처리 알림', value: stats.pendingNotif, unit: '건', color: 'text-orange-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}<span className="text-xs font-normal text-gray-400 ml-0.5">{s.unit}</span></div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          {/* 최근 알림 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">미처리 알림</h3>
              <Link href="/crm/alerts" className="text-xs text-blue-600 hover:underline">전체보기 →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {notifications.slice(0, 6).map((n: any) => (
                <div key={n.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${notifTypeColors[n.type] || 'bg-gray-100 text-gray-600'}`}>
                    {notifTypeLabels[n.type] || n.type}
                  </span>
                  <span className="text-sm text-gray-700 font-medium truncate">{n.customer_name}</span>
                  <span className="ml-auto text-xs text-gray-400 shrink-0">{n.due_date}</span>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">미처리 알림이 없습니다.</div>
              )}
            </div>
          </div>

          {/* 최근 고객 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">최근 등록 고객</h3>
              <Link href="/crm/customers" className="text-xs text-blue-600 hover:underline">전체보기 →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['고객명', '연락처', '월 보험료', '상태', '등록일'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.slice(0, 5).map((c: any) => (
                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/crm/customers/${c.id}`} className="font-medium text-gray-800 hover:text-blue-600 text-sm">{c.name}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{c.phone}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">{c.monthly_premium?.toLocaleString()}원</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{c.join_date}</td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">고객을 등록하면 여기에 표시됩니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 오른쪽 사이드 */}
        <div className="space-y-5">
          {/* 레이더 차트 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm mb-4">전체 보장 현황</h3>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <Radar name="현재" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                  <Radar name="권장" dataKey="recommended" stroke="#E2E8F0" fill="none" strokeDasharray="4 2" />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-gray-400 py-16">고객 등록 후 표시됩니다</p>
            )}
          </div>

          {/* 상태별 고객 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">상태별 고객</h3>
            <div className="space-y-2">
              {Object.entries(statusLabels).map(([key, label]) => {
                const count = customers.filter((c: any) => c.status === key).length
                if (count === 0) return null
                const pct = Math.round((count / customers.length) * 100)
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{label}</span>
                      <span className="font-medium">{count}명 ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {customers.length === 0 && <p className="text-xs text-gray-400 text-center py-4">데이터 없음</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
