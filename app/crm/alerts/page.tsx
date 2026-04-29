'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

const typeLabels: Record<string, string> = {
  join_30: '가입 30일', join_90: '가입 90일', join_180: '가입 180일', join_365: '가입 1년',
  indemnity_end: '면책 종료', reduction_end: '감액 종료', birthday: '생일',
  car_renewal_d60: '자동차 D-60', car_renewal_d30: '자동차 D-30',
  indemnity_renewal: '실손 재가입', consulting: '상담 예정',
}
const typeColors: Record<string, string> = {
  join_30: 'bg-blue-100 text-blue-700', join_90: 'bg-blue-100 text-blue-700',
  join_180: 'bg-blue-100 text-blue-700', join_365: 'bg-blue-100 text-blue-700',
  indemnity_end: 'bg-orange-100 text-orange-700', reduction_end: 'bg-orange-100 text-orange-700',
  birthday: 'bg-pink-100 text-pink-700', car_renewal_d60: 'bg-purple-100 text-purple-700',
  car_renewal_d30: 'bg-purple-100 text-purple-700', indemnity_renewal: 'bg-cyan-100 text-cyan-700',
  consulting: 'bg-green-100 text-green-700',
}

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [showDone, setShowDone] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const { data: custs } = await supabase
      .from('customers').select('id').eq('advisor_id', session.user.id)
    const custIds = (custs || []).map((c: any) => c.id)
    if (!custIds.length) { setLoading(false); return }

    const { data } = await supabase
      .from('notifications').select('*')
      .in('customer_id', custIds).order('due_date', { ascending: true })
    setNotifications(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDone = async (id: string) => {
    await supabase.from('notifications').update({ is_done: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_done: true } : n))
  }

  const handleRead = async (id: string) => {
    const n = notifications.find(n => n.id === id)
    if (n?.is_read) return
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const active = notifications.filter(n => !n.is_done)
  const filtered = notifications.filter(n => {
    const matchType = typeFilter === 'all' || n.type === typeFilter
    const matchDone = showDone ? true : !n.is_done
    return matchType && matchDone
  })
  const unreadCount = notifications.filter(n => !n.is_read && !n.is_done).length

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">알림관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          미처리 {active.length}건{unreadCount > 0 && ` · 미확인 ${unreadCount}건`}
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${typeFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
            전체 ({active.length})
          </button>
          {Object.keys(typeLabels).map(type => {
            const count = active.filter(n => n.type === type).length
            if (count === 0) return null
            return (
              <button key={type} onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${typeFilter === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {typeLabels[type]} ({count})
              </button>
            )
          })}
          <label className="flex items-center gap-1.5 ml-auto text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} className="rounded" />
            완료 포함
          </label>
        </div>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(n => (
              <div key={n.id} onClick={() => handleRead(n.id)}
                className={`flex items-center gap-4 px-5 py-4 transition-colors cursor-pointer ${
                  !n.is_read && !n.is_done ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'
                } ${n.is_done ? 'opacity-50' : ''}`}
              >
                {!n.is_read && !n.is_done && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${typeColors[n.type] || 'bg-gray-100 text-gray-600'}`}>
                  {typeLabels[n.type] || n.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{n.customer_name}</div>
                  {n.message && <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400">{n.due_date}</span>
                  {!n.is_done ? (
                    <button onClick={e => { e.stopPropagation(); handleDone(n.id) }}
                      className="text-xs text-green-600 font-semibold hover:bg-green-50 px-2 py-1 rounded-lg transition-colors">
                      ✓ 완료
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">완료</span>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <p className="text-sm">{notifications.length === 0 ? '등록된 알림이 없습니다.' : '조건에 맞는 알림이 없습니다.'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
