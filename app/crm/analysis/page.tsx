'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const TAG_COLORS: Record<string, string> = {
  '#암부족': 'bg-red-400', '#뇌심장부족': 'bg-orange-400', '#갱신형주의': 'bg-yellow-400',
  '#실손점검': 'bg-cyan-400', '#운전자없음': 'bg-purple-400', '#화재점검필요': 'bg-gray-400',
}
const CATEGORY_NAMES: Record<string, string> = {
  cancer: '암 진단비', brain: '뇌혈관', heart: '심장', surgery: '수술비',
  hospitalization: '입원비', nursing: '간병비', driver: '운전자', fire: '화재',
}
const STATUS_LABELS: Record<string, string> = {
  new: '신규', analysis: '분석', consulting: '상담', proposal: '제안',
  hold: '보류', contracted: '계약', managing: '관리',
}

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any[]>([])
  const [tagStats, setTagStats] = useState<{ tag: string; count: number }[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const { data: custs } = await supabase
      .from('customers').select('*').eq('advisor_id', session.user.id)
    const custList = custs || []
    setCustomers(custList)

    const tagCounts: Record<string, number> = {}
    custList.forEach((c: any) => {
      c.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    setTagStats(Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count))

    const custIds = custList.map((c: any) => c.id)
    if (custIds.length > 0) {
      const { data: coverages } = await supabase
        .from('coverages').select('category, amount').in('customer_id', custIds)
      const catTotals: Record<string, number> = {}
      ;(coverages || []).forEach((cv: any) => {
        catTotals[cv.category] = (catTotals[cv.category] || 0) + (cv.amount || 0)
      })
      const maxAmt = Math.max(...Object.values(catTotals), 1)
      setRadarData(Object.entries(CATEGORY_NAMES).map(([key, label]) => ({
        category: label,
        value: Math.round(((catTotals[key] || 0) / maxAmt) * 100),
        recommended: 100,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredByTag = selected ? customers.filter((c: any) => c.tags?.includes(selected)) : []
  const tagBarData = tagStats.map(t => ({ name: t.tag.replace('#', ''), count: t.count }))

  const statusCounts = Object.keys(STATUS_LABELS).map(key => ({
    name: STATUS_LABELS[key],
    count: customers.filter((c: any) => c.status === key).length,
  })).filter(s => s.count > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">보장분석</h1>
        <p className="text-sm text-gray-500 mt-0.5">전체 고객 보장 현황을 분석합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 레이더 차트 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">전체 고객 평균 보장률</h2>
          <p className="text-xs text-gray-500 mb-3">권장 기준 대비 현재 보장 수준</p>
          {radarData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <Radar name="현재 보장" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  <Radar name="권장 기준" dataKey="recommended" stroke="#E2E8F0" fill="none" strokeDasharray="4 2" />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              담보 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 태그별 고객 수 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">태그별 고객 현황</h2>
          <p className="text-xs text-gray-500 mb-3">태그를 클릭하면 해당 고객 목록을 볼 수 있습니다.</p>
          {tagBarData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagBarData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              태그 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 태그 클릭 필터 */}
      {tagStats.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">태그별 고객 필터</h2>
          <div className="flex gap-2 flex-wrap mb-4">
            {tagStats.map(({ tag, count }) => (
              <button key={tag} onClick={() => setSelected(selected === tag ? null : tag)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                  selected === tag ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${TAG_COLORS[tag] || 'bg-gray-400'}`} />
                {tag} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
          {selected && filteredByTag.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">{selected} 태그 고객 {filteredByTag.length}명</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredByTag.map((c: any) => (
                  <Link key={c.id} href={`/crm/customers/${c.id}`}
                    className="flex items-center gap-2 p-2.5 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors border border-gray-100 hover:border-blue-200">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">{c.name}</div>
                      <div className="text-[10px] text-gray-400">{c.phone}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 상태별 현황 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">상태별 고객 현황</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusCounts.map(s => (
            <div key={s.name} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-gray-800">{s.count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.name}</div>
            </div>
          ))}
          {statusCounts.length === 0 && (
            <div className="col-span-4 text-center text-sm text-gray-400 py-8">고객 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  )
}
