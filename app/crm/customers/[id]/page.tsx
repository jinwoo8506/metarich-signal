'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../lib/supabase'
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
const relationLabel: Record<string, string> = {
  spouse: '배우자', child: '자녀', parent: '부모', sibling: '형제', other: '기타',
}
const CATEGORY_NAMES: Record<string, string> = {
  cancer: '암', brain: '뇌혈관', heart: '심장', surgery: '수술',
  hospitalization: '입원', nursing: '간병', driver: '운전자', fire: '화재',
}

const TABS = [
  { id: 'basic', label: '기본정보' }, { id: 'family', label: '가족' },
  { id: 'policies', label: '보험계약' }, { id: 'coverage', label: '보장그래프' },
  { id: 'alerts', label: '알림' }, { id: 'dm', label: 'DM' },
]

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('basic')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [coverages, setCoverages] = useState<any[]>([])
  const [families, setFamilies] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any[]>([])
  const [advisorName, setAdvisorName] = useState('담당자')
  const [advisorPhone, setAdvisorPhone] = useState('')
  const [copiedDm, setCopiedDm] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  // New policy form
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [policyForm, setPolicyForm] = useState({ company: '', product_name: '', policy_number: '', monthly_premium: '', start_date: '', end_date: '', status: 'active' })

  // New family form
  const [showFamilyForm, setShowFamilyForm] = useState(false)
  const [familyForm, setFamilyForm] = useState({ name: '', birth_date: '', relation: 'spouse', phone: '' })

  const DM_TEMPLATES = [
    { id: 'birthday', title: '생일 축하', content: (name: string, adv: string, ph: string) => `${name} 고객님, 생일을 진심으로 축하드립니다!\n\n항상 건강하고 행복하세요.\n\n담당자 ${adv}  ${ph}` },
    { id: 'car_renewal', title: '자동차보험 갱신', content: (name: string, adv: string, ph: string) => `${name} 고객님,\n\n자동차보험 갱신일이 다가오고 있습니다.\n최적의 조건으로 갱신할 수 있도록 도와드리겠습니다.\n\n담당자 ${adv}  ${ph}` },
    { id: 'indemnity', title: '실손보험 재가입', content: (name: string, adv: string, ph: string) => `${name} 고객님,\n\n실손의료보험 재가입 시기가 다가왔습니다.\n새 세대 전환 시 보장 조건이 달라지니 꼭 확인해보세요.\n\n담당자 ${adv}  ${ph}` },
    { id: 'consulting', title: '보장분석 상담', content: (name: string, adv: string, ph: string) => `${name} 고객님,\n\n현재 가입하신 보험을 무료로 정밀 분석해드립니다.\n부족한 보장은 없는지 함께 점검해봐요.\n\n담당자 ${adv}  ${ph}` },
    { id: 'join_90', title: '90일 면책 종료', content: (name: string, adv: string, ph: string) => `${name} 고객님,\n\n가입 후 90일이 지나 면책기간이 종료되었습니다.\n이제 보험 혜택을 정상적으로 받으실 수 있습니다.\n\n담당자 ${adv}  ${ph}` },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: userData } = await supabase.from('users').select('name, phone').eq('id', session.user.id).single()
    setAdvisorName(userData?.name || session.user.email?.split('@')[0] || '담당자')
    setAdvisorPhone(userData?.phone || '')

    const [{ data: cust }, { data: polData }, { data: covData }, { data: famData }, { data: alrtData }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('policies').select('*').eq('customer_id', id).order('start_date', { ascending: false }),
      supabase.from('coverages').select('*').eq('customer_id', id),
      supabase.from('families').select('*').eq('customer_id', id),
      supabase.from('notifications').select('*').eq('customer_id', id).order('due_date', { ascending: true }),
    ])

    if (!cust) { router.push('/crm/customers'); return }
    setCustomer(cust)
    setEditForm(cust)
    setPolicies(polData || [])
    setCoverages(covData || [])
    setFamilies(famData || [])
    setAlerts(alrtData || [])

    const catTotals: Record<string, number> = {}
    ;(covData || []).forEach((cv: any) => {
      catTotals[cv.category] = (catTotals[cv.category] || 0) + (cv.amount || 0)
    })
    const maxAmt = Math.max(...Object.values(catTotals), 1)
    setRadarData(Object.entries(CATEGORY_NAMES).map(([key, label]) => ({
      category: label,
      value: Math.round(((catTotals[key] || 0) / maxAmt) * 100),
      recommended: 100,
    })))

    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  const saveCustomer = async () => {
    setSaving(true)
    await supabase.from('customers').update({
      name: editForm.name, phone: editForm.phone, birth_date: editForm.birth_date || null,
      gender: editForm.gender, address: editForm.address, occupation: editForm.occupation,
      status: editForm.status, monthly_premium: Number(editForm.monthly_premium) || 0,
      policy_count: Number(editForm.policy_count) || 0,
      indemnity_generation: editForm.indemnity_generation ? Number(editForm.indemnity_generation) : null,
      family_count: editForm.family_count ? Number(editForm.family_count) : null,
      consulting_summary: editForm.consulting_summary || null,
      tags: editForm.tags || [],
    }).eq('id', id)
    setCustomer({ ...customer, ...editForm })
    setEditing(false)
    setSaving(false)
  }

  const addPolicy = async () => {
    if (!policyForm.company || !policyForm.product_name) return
    await supabase.from('policies').insert({
      customer_id: id, ...policyForm,
      monthly_premium: Number(policyForm.monthly_premium) || 0,
    })
    setShowPolicyForm(false)
    setPolicyForm({ company: '', product_name: '', policy_number: '', monthly_premium: '', start_date: '', end_date: '', status: 'active' })
    load()
  }

  const addFamily = async () => {
    if (!familyForm.name) return
    await supabase.from('families').insert({ customer_id: id, ...familyForm })
    setShowFamilyForm(false)
    setFamilyForm({ name: '', birth_date: '', relation: 'spouse', phone: '' })
    load()
  }

  const copyDm = async (tmpl: typeof DM_TEMPLATES[0]) => {
    const text = tmpl.content(customer?.name || '', advisorName, advisorPhone)
    await navigator.clipboard.writeText(text)
    setCopiedDm(tmpl.id)
    setTimeout(() => setCopiedDm(null), 2000)
  }

  const deleteCustomer = async () => {
    if (!confirm(`${customer?.name} 고객을 삭제하시겠습니까? 모든 관련 데이터가 삭제됩니다.`)) return
    await supabase.from('customers').delete().eq('id', id)
    router.push('/crm/customers')
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400'
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!customer) return null

  const age = customer.birth_date ? new Date().getFullYear() - new Date(customer.birth_date).getFullYear() : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/crm/customers" className="text-sm text-gray-500 hover:text-gray-700">← 목록</Link>
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 text-xl font-bold">
            {customer.name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[customer.status] || 'bg-gray-100 text-gray-600'}`}>
                {statusLabels[customer.status]}
              </span>
              {age && <span className="text-xs text-gray-500">{age}세</span>}
              <span className="text-xs text-gray-500">{customer.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setEditForm(customer) }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">취소</button>
              <button onClick={saveCustomer} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">수정</button>
              <button onClick={deleteCustomer}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100">삭제</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

        {/* 기본정보 */}
        {tab === 'basic' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editing ? (
              <>
                {[
                  { key: 'name', label: '이름', type: 'text' }, { key: 'phone', label: '연락처', type: 'text' },
                  { key: 'birth_date', label: '생년월일', type: 'date' }, { key: 'occupation', label: '직업', type: 'text' },
                  { key: 'monthly_premium', label: '월 보험료', type: 'number' }, { key: 'policy_count', label: '보험 건수', type: 'number' },
                  { key: 'indemnity_generation', label: '실손 세대', type: 'number' }, { key: 'family_count', label: '세대 인원', type: 'number' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className={labelClass}>{label}</label>
                    <input type={type} className={inputClass} value={editForm[key] || ''}
                      onChange={e => setEditForm((p: any) => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className={labelClass}>주소</label>
                  <input className={inputClass} value={editForm.address || ''}
                    onChange={e => setEditForm((p: any) => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>상담 요약</label>
                  <textarea rows={3} className={`${inputClass} resize-none`} value={editForm.consulting_summary || ''}
                    onChange={e => setEditForm((p: any) => ({ ...p, consulting_summary: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>상태</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <button key={key} type="button"
                        onClick={() => setEditForm((p: any) => ({ ...p, status: key }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${editForm.status === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {[
                  ['이름', customer.name], ['연락처', customer.phone], ['생년월일', customer.birth_date || '-'],
                  ['나이', age ? `${age}세` : '-'], ['성별', customer.gender === 'male' ? '남성' : '여성'],
                  ['직업', customer.occupation || '-'], ['등록일', customer.join_date],
                  ['월 보험료', `${customer.monthly_premium?.toLocaleString()}원`],
                  ['보험 건수', `${customer.policy_count}건`],
                  ['실손 세대', customer.indemnity_generation ? `${customer.indemnity_generation}세대` : '-'],
                  ['세대 인원', customer.family_count ? `${customer.family_count}명` : '-'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                    <div className="text-sm font-medium text-gray-800">{value}</div>
                  </div>
                ))}
                {customer.address && (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-gray-400 mb-0.5">주소</div>
                    <div className="text-sm font-medium text-gray-800">{customer.address}</div>
                  </div>
                )}
                {customer.consulting_summary && (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-gray-400 mb-0.5">상담 요약</div>
                    <div className="text-sm text-gray-700 leading-relaxed">{customer.consulting_summary}</div>
                  </div>
                )}
                {customer.tags?.length > 0 && (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-gray-400 mb-1">태그</div>
                    <div className="flex gap-1 flex-wrap">
                      {customer.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 가족 */}
        {tab === 'family' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">가족 구성원</h3>
              <button onClick={() => setShowFamilyForm(!showFamilyForm)}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">+ 추가</button>
            </div>
            {showFamilyForm && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
                <div><label className={labelClass}>이름</label><input className={inputClass} value={familyForm.name} onChange={e => setFamilyForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label className={labelClass}>관계</label>
                  <select className={inputClass} value={familyForm.relation} onChange={e => setFamilyForm(p => ({ ...p, relation: e.target.value }))}>
                    {Object.entries(relationLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>생년월일</label><input type="date" className={inputClass} value={familyForm.birth_date} onChange={e => setFamilyForm(p => ({ ...p, birth_date: e.target.value }))} /></div>
                <div><label className={labelClass}>연락처</label><input className={inputClass} value={familyForm.phone} onChange={e => setFamilyForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => setShowFamilyForm(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold">취소</button>
                  <button onClick={addFamily} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">추가</button>
                </div>
              </div>
            )}
            {families.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">등록된 가족 구성원이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {families.map((f: any) => {
                  const fAge = f.birth_date ? new Date().getFullYear() - new Date(f.birth_date).getFullYear() : null
                  return (
                    <div key={f.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">{f.name[0]}</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{f.name}</div>
                        <div className="text-xs text-gray-500">{relationLabel[f.relation] || f.relation} {fAge ? `· ${fAge}세` : ''} {f.phone ? `· ${f.phone}` : ''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 보험계약 */}
        {tab === 'policies' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">보험계약 ({policies.length}건)</h3>
              <button onClick={() => setShowPolicyForm(!showPolicyForm)}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">+ 추가</button>
            </div>
            {showPolicyForm && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
                <div><label className={labelClass}>보험사 *</label><input className={inputClass} value={policyForm.company} onChange={e => setPolicyForm(p => ({ ...p, company: e.target.value }))} /></div>
                <div><label className={labelClass}>상품명 *</label><input className={inputClass} value={policyForm.product_name} onChange={e => setPolicyForm(p => ({ ...p, product_name: e.target.value }))} /></div>
                <div><label className={labelClass}>증권번호</label><input className={inputClass} value={policyForm.policy_number} onChange={e => setPolicyForm(p => ({ ...p, policy_number: e.target.value }))} /></div>
                <div><label className={labelClass}>월 보험료</label><input type="number" className={inputClass} value={policyForm.monthly_premium} onChange={e => setPolicyForm(p => ({ ...p, monthly_premium: e.target.value }))} /></div>
                <div><label className={labelClass}>계약일</label><input type="date" className={inputClass} value={policyForm.start_date} onChange={e => setPolicyForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><label className={labelClass}>만기일</label><input type="date" className={inputClass} value={policyForm.end_date} onChange={e => setPolicyForm(p => ({ ...p, end_date: e.target.value }))} /></div>
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => setShowPolicyForm(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold">취소</button>
                  <button onClick={addPolicy} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">추가</button>
                </div>
              </div>
            )}
            {policies.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">등록된 보험계약이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {policies.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{p.product_name}</span>
                        <span className="text-xs text-gray-500">{p.company}</span>
                        {p.status === 'active' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">유지</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {p.policy_number && `증권 ${p.policy_number} · `}
                        {p.start_date && `${p.start_date}~${p.end_date || '유지'}`}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">{p.monthly_premium?.toLocaleString()}원</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 보장그래프 */}
        {tab === 'coverage' && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">보장 현황 그래프</h3>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <Radar name="현재 보장" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  <Radar name="권장 기준" dataKey="recommended" stroke="#E2E8F0" fill="none" strokeDasharray="4 2" />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-16">담보 정보를 등록하면 그래프가 표시됩니다.</p>
            )}
            {coverages.length > 0 && (
              <div className="mt-4 space-y-2">
                {coverages.map((cv: any) => (
                  <div key={cv.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700">{CATEGORY_NAMES[cv.category] || cv.category}</span>
                    <span className="font-semibold text-gray-800">{cv.amount?.toLocaleString()}원</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 알림 */}
        {tab === 'alerts' && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">관련 알림</h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">등록된 알림이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a: any) => (
                  <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl ${a.is_done ? 'opacity-50 bg-gray-50' : 'bg-white border border-gray-100'}`}>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${notifTypeColors[a.type] || 'bg-gray-100 text-gray-600'}`}>
                      {notifTypeLabels[a.type] || a.type}
                    </span>
                    <span className="flex-1 text-sm text-gray-700">{a.message || '-'}</span>
                    <span className="text-xs text-gray-400 shrink-0">{a.due_date}</span>
                    {!a.is_done && (
                      <button onClick={async () => {
                        await supabase.from('notifications').update({ is_done: true }).eq('id', a.id)
                        setAlerts(prev => prev.map(n => n.id === a.id ? { ...n, is_done: true } : n))
                      }} className="text-xs text-green-600 font-medium hover:underline shrink-0">완료</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DM */}
        {tab === 'dm' && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">{customer.name} 고객 DM 메시지</h3>
            <div className="space-y-3">
              {DM_TEMPLATES.map(tmpl => (
                <div key={tmpl.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-800">{tmpl.title}</span>
                    <button onClick={() => copyDm(tmpl)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copiedDm === tmpl.id ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      {copiedDm === tmpl.id ? '✓ 복사됨!' : '복사'}
                    </button>
                  </div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-3">
                    {tmpl.content(customer.name, advisorName, advisorPhone)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
