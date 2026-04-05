'use client'

import { useState, useMemo } from 'react'
import {
  DIAGNOSIS_DB, DIAGNOSIS_CATEGORY_LABELS,
  KCD_NAME_MAP, getKcdCategory,
} from '../../../lib/insurance/diagnosis-db'
import type { DiagnosisItem } from '../../../lib/insurance/types'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
interface DiagAmounts {
  cancer: number        // 일반암 진단비
  similar: number       // 유사암 진단비
  brain: number         // 뇌혈관질환 진단비
  heart: number         // 허혈성심장질환 진단비
  brainStroke: number   // 뇌졸중(출혈+경색) 진단비
  mi: number            // 급성심근경색 진단비
}

const DEFAULT_AMOUNTS: DiagAmounts = {
  cancer: 3000,
  similar: 500,
  brain: 1000,
  heart: 1000,
  brainStroke: 2000,
  mi: 2000,
}

const CATEGORY_TABS = [
  { key: 'all',            label: '전체' },
  { key: 'cancer',         label: '🎗 일반암' },
  { key: 'cancer_similar', label: '🔵 유사암' },
  { key: 'cancer_thyroid', label: '갑상선암' },
  { key: 'cancer_skin',    label: '기타피부암' },
  { key: 'brain',          label: '🧠 뇌혈관' },
  { key: 'heart',          label: '❤️ 심장' },
]

const CAT_COLORS: Record<string, { badge: string; border: string; text: string }> = {
  cancer:         { badge: 'bg-red-100 text-red-700',     border: 'border-red-300',    text: 'text-red-700' },
  cancer_similar: { badge: 'bg-blue-100 text-blue-700',   border: 'border-blue-300',   text: 'text-blue-700' },
  cancer_thyroid: { badge: 'bg-purple-100 text-purple-700', border: 'border-purple-300', text: 'text-purple-700' },
  cancer_skin:    { badge: 'bg-orange-100 text-orange-700', border: 'border-orange-300', text: 'text-orange-700' },
  brain:          { badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-300', text: 'text-indigo-700' },
  heart:          { badge: 'bg-pink-100 text-pink-700',    border: 'border-pink-300',   text: 'text-pink-700' },
  other:          { badge: 'bg-slate-100 text-slate-600',  border: 'border-slate-300',  text: 'text-slate-600' },
}

// ─────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────
function fmoney(v: number): string {
  if (v === 0) return '미가입'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}천만원`
  return `${v.toLocaleString()}만원`
}

function calcDiagPay(item: DiagnosisItem, amounts: DiagAmounts): { label: string; amount: number }[] {
  const results: { label: string; amount: number }[] = []
  const cat = item.category
  const sub = item.sub_type ?? ''

  if (cat === 'cancer') {
    results.push({ label: '일반암 진단비', amount: amounts.cancer })
  } else if (cat === 'cancer_thyroid') {
    // 유사암 비율 (일반적으로 20%)
    results.push({ label: '갑상선암(유사암) 진단비', amount: Math.round(amounts.cancer * 0.2) })
    results.push({ label: '유사암 진단비', amount: amounts.similar })
  } else if (cat === 'cancer_skin') {
    results.push({ label: '기타피부암(유사암) 진단비', amount: Math.round(amounts.cancer * 0.2) })
    results.push({ label: '유사암 진단비', amount: amounts.similar })
  } else if (cat === 'cancer_similar') {
    results.push({ label: '유사암 진단비', amount: amounts.similar })
    if (sub.includes('DCIS') || item.kcd_code === 'D05') {
      results.push({ label: '유방관상피내암(DCIS) — 일부 상품 별도 보장', amount: 0 })
    }
  } else if (cat === 'brain') {
    results.push({ label: '뇌혈관질환 진단비', amount: amounts.brain })
    const strokeCodes = ['I60','I61','I62','I63','I64']
    if (strokeCodes.includes(item.kcd_code)) {
      results.push({ label: '뇌졸중 진단비', amount: amounts.brainStroke })
      if (item.kcd_code === 'I61' || item.kcd_code === 'I60') {
        results.push({ label: '뇌출혈 진단비 — 상품별 확인', amount: 0 })
      }
    }
  } else if (cat === 'heart') {
    results.push({ label: '허혈성심장질환 진단비', amount: amounts.heart })
    if (['I21','I22','I23'].includes(item.kcd_code)) {
      results.push({ label: '급성심근경색 진단비', amount: amounts.mi })
    }
  }

  return results
}

function highlight(text: string, q: string): string {
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
}

function matchDiag(item: DiagnosisItem, q: string): boolean {
  const ql = q.toLowerCase()
  return (
    item.kcd_code.toLowerCase().includes(ql) ||
    item.kcd_name.toLowerCase().includes(ql) ||
    (item.sub_type?.toLowerCase().includes(ql) ?? false) ||
    (item.notes?.toLowerCase().includes(ql) ?? false) ||
    (KCD_NAME_MAP[item.kcd_code]?.toLowerCase().includes(ql) ?? false)
  )
}

// ─────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────
export default function DiagnosisPage() {
  const [query, setQuery]   = useState('')
  const [category, setCat]  = useState('all')
  const [amounts, setAmounts] = useState<DiagAmounts>(DEFAULT_AMOUNTS)

  const filtered = useMemo(() => {
    return DIAGNOSIS_DB.filter(item => {
      const catOk = category === 'all' || item.category === category
      const textOk = !query || matchDiag(item, query)
      return catOk && textOk
    })
  }, [query, category])

  // 빠른 KCD 입력 → 자동 카테고리
  const handleQuery = (val: string) => {
    setQuery(val)
    if (val.length >= 2) {
      const cat = getKcdCategory(val.trim())
      if (cat !== 'other') setCat(cat)
    }
    if (!val) setCat('all')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-pink-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-red-800 to-rose-700 text-white px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold">🎗 진단비 검색기</h1>
          <p className="text-sm text-red-200 mt-0.5">KCD 코드 · 질병명 입력 → 보장 분류 및 예상 진단비 확인</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ① 검색 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">🔍 질병코드 · 질병명 검색</p>
          <input
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="예) C16 / 위암 / 유방암 / 뇌경색 / I21 / 급성심근경색..."
            className="w-full border-2 border-slate-200 focus:border-red-400 rounded-xl px-4 py-3 text-base outline-none bg-slate-50 focus:bg-white mb-3 transition"
          />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setCat(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition
                  ${category === t.key
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ② 가입금액 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">💰 가입금액 입력</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { key: 'cancer',     label: '일반암 진단비',      color: 'text-red-600' },
              { key: 'similar',    label: '유사암 진단비',       color: 'text-blue-600' },
              { key: 'brain',      label: '뇌혈관질환 진단비',   color: 'text-indigo-600' },
              { key: 'heart',      label: '허혈성심장 진단비',   color: 'text-pink-600' },
              { key: 'brainStroke',label: '뇌졸중 진단비',       color: 'text-violet-600' },
              { key: 'mi',         label: '급성심근경색 진단비', color: 'text-rose-600' },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <label className={`block text-xs font-bold mb-1 ${color}`}>{label}</label>
                <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-red-400 transition">
                  <input
                    type="number"
                    min={0}
                    value={amounts[key as keyof DiagAmounts]}
                    onChange={e => setAmounts(prev => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                    className="flex-1 text-right px-3 py-2.5 text-sm font-bold bg-transparent outline-none min-w-0"
                  />
                  <span className="pr-3 text-xs text-slate-400 shrink-0">만원</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">* 유사암 비율(갑상선·기타피부암)은 일반적으로 일반암 진단비의 20% 기준. 상품별 상이</p>
        </div>

        {/* ③ 결과 */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm font-bold text-slate-600">
              {query ? `"${query}" 검색 결과` : `${DIAGNOSIS_CATEGORY_LABELS[category] ?? '전체'} 목록`}
              <span className="ml-2 text-red-500">{filtered.length}건</span>
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">검색 결과가 없습니다.<br />KCD 코드나 질병명을 다시 확인해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(item => (
                <DiagCard key={item.id} item={item} amounts={amounts} query={query} />
              ))}
            </div>
          )}

          <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
            ⚠️ 이 내용은 예시이며 해당 상품의 <strong>증권과 약관을 다시 참조</strong>하시길 바랍니다.
            진단비 지급 기준·유사암 비율은 가입 상품별로 상이합니다.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 진단비 카드
// ─────────────────────────────────────────────────────────
function DiagCard({ item, amounts, query }: { item: DiagnosisItem; amounts: DiagAmounts; query: string }) {
  const [open, setOpen] = useState(false)
  const col = CAT_COLORS[item.category] ?? CAT_COLORS.other
  const payouts = calcDiagPay(item, amounts)
  const totalPay = payouts.reduce((sum, p) => sum + p.amount, 0)
  const isSimlar = item.category.startsWith('cancer_similar') || item.category === 'cancer_thyroid' || item.category === 'cancer_skin'

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className={`bg-white rounded-2xl shadow-sm border-2 cursor-pointer transition hover:shadow-md
        ${open ? col.border : 'border-slate-100 hover:border-red-300'}`}
    >
      {/* 헤더 */}
      <div className="flex items-start gap-3 p-4 border-b border-slate-100">
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black shrink-0 text-center ${col.badge}`}>
          <span className="text-[10px] leading-none">KCD</span>
          <span className="text-xs font-mono font-black leading-tight">{item.kcd_code}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-slate-800 text-base leading-snug"
            dangerouslySetInnerHTML={{ __html: highlight(item.kcd_name, query) }}
          />
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${col.badge}`}>
              {item.sub_type ?? DIAGNOSIS_CATEGORY_LABELS[item.category]}
            </span>
            {isSimlar && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">⚠️ 유사암</span>
            )}
          </div>
        </div>
        <div className="text-slate-300 text-lg">{open ? '▲' : '▼'}</div>
      </div>

      {/* 지급액 */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-800 to-red-900">
        <div className="text-xs text-red-200 mb-0.5">예상 진단비 합계</div>
        <div className="text-2xl font-black text-yellow-400 tracking-tight">{fmoney(totalPay)}</div>
        <div className="flex flex-wrap gap-2 mt-1">
          {payouts.map((p, i) => (
            <span key={i} className="text-xs text-red-300">
              {p.label}: <strong className="text-white">{fmoney(p.amount)}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* 상세 */}
      {open && (
        <div className="p-4 space-y-3 text-sm">
          {item.notes && (
            <div className="flex gap-2">
              <span className="shrink-0 mt-0.5">💡</span>
              <span className="text-slate-600">{item.notes}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="shrink-0 mt-0.5">📄</span>
            <div className="text-slate-700">
              <strong>필요 서류:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-slate-600 text-xs">
                {item.required_docs.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 mt-0.5">🔬</span>
            <div className="text-slate-700">
              <strong>필요 검사:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-slate-600 text-xs">
                {item.required_tests.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          </div>
          {isSimlar && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 mb-1">⚠️ 유사암 안내</p>
              <p className="text-xs text-amber-800">
                유사암은 일반암 진단비의 10~20% 지급이 일반적입니다.
                갑상선암(C73)·기타피부암(C44)·제자리암(D00~D09)·경계성종양(D37~D44) 해당.
                상품별 지급 기준 반드시 확인 필요.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}