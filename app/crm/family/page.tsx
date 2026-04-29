'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

const relationLabel: Record<string, string> = {
  spouse: '배우자', child: '자녀', parent: '부모', sibling: '형제', other: '기타',
}

export default function FamilyPage() {
  const [loading, setLoading] = useState(true)
  const [families, setFamilies] = useState<{ customer: any; members: any[] }[]>([])
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const { data: custs } = await supabase
      .from('customers')
      .select('id, name, phone, monthly_premium, policy_count, family_count')
      .eq('advisor_id', session.user.id)
      .order('name', { ascending: true })

    if (!custs || custs.length === 0) { setLoading(false); return }

    const custIds = custs.map((c: any) => c.id)
    const { data: fams } = await supabase
      .from('families').select('*').in('customer_id', custIds)

    const grouped = custs.map((c: any) => ({
      customer: c,
      members: (fams || []).filter((f: any) => f.customer_id === c.id),
    }))

    setFamilies(grouped)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? families.filter(({ customer, members }) =>
        customer.name.includes(search) ||
        members.some((m: any) => m.name.includes(search))
      )
    : families

  const totalFamilyMembers = families.reduce((sum, f) => sum + f.members.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">가족현황</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            고객 {families.length}명 · 가족 구성원 {totalFamilyMembers}명 등록됨
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <input
          type="text"
          placeholder="고객명 또는 가족 구성원 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 text-gray-400">
          <p className="text-sm">{families.length === 0 ? '등록된 고객이 없습니다.' : '조건에 맞는 결과가 없습니다.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ customer, members }) => (
            <div key={customer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* 고객 헤더 */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                    {customer.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/crm/customers/${customer.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 text-sm">
                        {customer.name}
                      </Link>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                        본인
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {customer.phone} · {customer.monthly_premium?.toLocaleString()}원
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">세대원</div>
                    <div className="text-sm font-bold text-gray-800">{members.length}명</div>
                  </div>
                </div>
              </div>

              {/* 가족 구성원 */}
              {members.length > 0 ? (
                <div className="p-3 space-y-1.5">
                  {members.map((m: any) => {
                    const age = m.birth_date ? new Date().getFullYear() - new Date(m.birth_date).getFullYear() : null
                    return (
                      <div key={m.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                          {m.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-gray-800">{m.name}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">
                            {relationLabel[m.relation] || m.relation} {age ? `· ${age}세` : ''}
                          </span>
                        </div>
                        {m.phone && (
                          <span className="text-[10px] text-gray-400 shrink-0">{m.phone}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 text-xs text-gray-400 text-center">
                  가족 구성원이 없습니다.
                  <Link href={`/crm/customers/${customer.id}?tab=family`} className="block mt-1 text-blue-500 hover:underline">
                    + 추가하기
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
