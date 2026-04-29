'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState('join_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('customers').select('*').eq('advisor_id', session.user.id)
      .order('join_date', { ascending: false })
    if (data) setCustomers(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = customers
    .filter(c => {
      const matchSearch = !search || c.name.includes(search) || c.phone.includes(search)
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      const av = String(a[sortKey] ?? ''); const bv = String(b[sortKey] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">고객관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">전체 {customers.length}명</p>
        </div>
        <Link href="/crm/customers/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          + 고객 등록
        </Link>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            type="text"
            placeholder="고객명 또는 연락처 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 w-56"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              전체
            </button>
            {Object.entries(statusLabels).map(([key, label]) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            {customers.length === 0 ? (
              <>
                <p className="text-sm font-medium mb-3">등록된 고객이 없습니다.</p>
                <Link href="/crm/customers/new"
                  className="inline-block bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl">
                  첫 고객 등록
                </Link>
              </>
            ) : (
              <p className="text-sm">조건에 맞는 고객이 없습니다.</p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[
                      { key: 'name', label: '이름' }, { key: 'phone', label: '연락처' },
                      { key: 'birth_date', label: '나이' }, { key: 'monthly_premium', label: '월 보험료' },
                      { key: 'policy_count', label: '보험수' }, { key: 'indemnity_generation', label: '실손' },
                      { key: 'family_count', label: '세대' }, { key: 'status', label: '상태' },
                      { key: 'join_date', label: '등록일' },
                    ].map(({ key, label }) => (
                      <th key={key} onClick={() => handleSort(key)}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                        {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">태그</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => {
                    const age = c.birth_date ? new Date().getFullYear() - new Date(c.birth_date).getFullYear() : null
                    return (
                      <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/crm/customers/${c.id}`} className="font-semibold text-gray-800 hover:text-blue-600 text-sm">
                            {c.name}
                          </Link>
                          {c.consulting_summary && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]">{c.consulting_summary}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{age ? `${age}세` : '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">{c.monthly_premium?.toLocaleString()}원</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">{c.policy_count}건</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">
                          {c.indemnity_generation ? `${c.indemnity_generation}세대` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">
                          {c.family_count ? `${c.family_count}명` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                            {statusLabels[c.status] || c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{c.join_date}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags ?? []).map((tag: string) => (
                              <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/crm/customers/${c.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                            상세 →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">총 <strong>{filtered.length}명</strong> 표시 중</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
