'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const STATUS_OPTIONS = [
  { value: 'new', label: '신규' }, { value: 'analysis', label: '분석' },
  { value: 'consulting', label: '상담' }, { value: 'proposal', label: '제안' },
  { value: 'hold', label: '보류' }, { value: 'contracted', label: '계약' },
  { value: 'managing', label: '관리' },
]
const TAGS = ['#암부족', '#뇌심장부족', '#갱신형주의', '#실손점검', '#운전자없음', '#화재점검필요']

export default function NewCustomerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', birth_date: '', gender: 'male',
    address: '', occupation: '', join_date: new Date().toISOString().slice(0, 10),
    status: 'new', monthly_premium: '', policy_count: '',
    indemnity_generation: '', family_count: '',
    consulting_summary: '', tags: [] as string[],
  })

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleTag = (tag: string) => {
    set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone) { setError('이름과 연락처는 필수입니다.'); return }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }

    const { error: dbErr } = await supabase.from('customers').insert({
      advisor_id: session.user.id,
      name: form.name,
      phone: form.phone,
      birth_date: form.birth_date || null,
      gender: form.gender,
      address: form.address || null,
      occupation: form.occupation || null,
      join_date: form.join_date,
      status: form.status,
      monthly_premium: Number(form.monthly_premium) || 0,
      policy_count: Number(form.policy_count) || 0,
      indemnity_generation: form.indemnity_generation ? Number(form.indemnity_generation) : null,
      family_count: form.family_count ? Number(form.family_count) : null,
      consulting_summary: form.consulting_summary || null,
      tags: form.tags,
    })

    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    router.push('/crm/customers')
  }

  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1'
  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← 뒤로</button>
        <h1 className="text-xl font-bold text-gray-900">고객 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>이름 *</label>
            <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="홍길동" required />
          </div>
          <div>
            <label className={labelClass}>연락처 *</label>
            <input className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="010-0000-0000" required />
          </div>
          <div>
            <label className={labelClass}>생년월일</label>
            <input type="date" className={inputClass} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>성별</label>
            <select className={inputClass} value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>직업</label>
            <input className={inputClass} value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="직업 입력" />
          </div>
          <div>
            <label className={labelClass}>등록일</label>
            <input type="date" className={inputClass} value={form.join_date} onChange={e => set('join_date', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>월 보험료 (원)</label>
            <input type="number" className={inputClass} value={form.monthly_premium} onChange={e => set('monthly_premium', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>보험 건수</label>
            <input type="number" className={inputClass} value={form.policy_count} onChange={e => set('policy_count', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>실손 세대</label>
            <input type="number" className={inputClass} value={form.indemnity_generation} onChange={e => set('indemnity_generation', e.target.value)} placeholder="1~4" />
          </div>
          <div>
            <label className={labelClass}>세대 인원수</label>
            <input type="number" className={inputClass} value={form.family_count} onChange={e => set('family_count', e.target.value)} placeholder="명" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>상태</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => set('status', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.status === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>주소</label>
            <input className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} placeholder="주소 입력" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>상담 요약</label>
            <textarea rows={3} className={`${inputClass} resize-none`} value={form.consulting_summary} onChange={e => set('consulting_summary', e.target.value)} placeholder="상담 내용 요약" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>태그</label>
            <div className="flex gap-2 flex-wrap">
              {TAGS.map(tag => (
                <button key={tag} type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.tags.includes(tag) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? '저장 중...' : '고객 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
