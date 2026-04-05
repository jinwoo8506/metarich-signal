'use client'

import { useState, useMemo, useCallback } from 'react'
import { SURGERY_DB, CATEGORY_LABELS, TYPE_MULTIPLIER } from '../../../lib/insurance/surgery-db'
import type { SurgeryItem, SurgeryAmounts } from '../../../lib/insurance/types'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const DEFAULT_AMOUNTS: SurgeryAmounts = {
  type1: 30, type2: 50, type3: 200, type4: 500, type5: 1000, disease: 30,
}

const TYPE_COLORS: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  1: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  2: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  3: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  4: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  5: { bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700' },
}
const CANCER_COLOR = { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-700' }

const TYPE_BROWSE = [
  { type: 1, label: '1종', example: '백내장·용종·탈장·편도', mul: 1 },
  { type: 2, label: '2종', example: '망막·골이식·맹장·척추내시경', mul: 2 },
  { type: 3, label: '3종', example: '유방절단·녹내장·담낭·갑상선', mul: 5 },
  { type: 4, label: '4종', example: '위절제·간·신장·대장관혈', mul: 10 },
  { type: 5, label: '5종', example: '심장이식·뇌관혈·관상동맥', mul: 20 },
]

const CATEGORIES = [
  { key: 'all',            label: '전체' },
  { key: 'eye',           label: '👁 눈·안과' },
  { key: 'digestive',     label: '🫁 소화기' },
  { key: 'cardiovascular',label: '❤️ 심장·혈관' },
  { key: 'musculoskeletal',label: '🦴 근골격' },
  { key: 'respiratory',   label: '👂 호흡기·귀코목' },
  { key: 'neurological',  label: '🧠 뇌·신경' },
  { key: 'urogenital',    label: '🫀 비뇨·생식' },
  { key: 'skin_breast',   label: '유방·피부' },
  { key: 'endocrine',     label: '갑상선·내분비' },
  { key: 'ear',           label: '청각기(귀)' },
  { key: 'cancer',        label: '🎗 암 수술' },
]

// ─────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────
function fmoney(v: number): string {
  if (v === 0) return '미가입'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}천만원`
  return `${v.toLocaleString()}만원`
}

function calcPayout(item: SurgeryItem, amounts: SurgeryAmounts) {
  const amtMap: Record<number, number> = {
    1: amounts.type1, 2: amounts.type2, 3: amounts.type3,
    4: amounts.type4, 5: amounts.type5,
  }
  const surgPay = item.isCancer
    ? (item.type === 5 ? amounts.type5 : amounts.type3)
    : (amtMap[item.type] ?? 0)
  const disPay = amounts.disease
  return { surgPay, disPay, total: surgPay + disPay }
}

function highlight(text: string, q: string): string {
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
}

function matchItem(item: SurgeryItem, q: string): boolean {
  const ql = q.toLowerCase()
  return (
    item.name.toLowerCase().includes(ql) ||
    item.kcd_codes.some(k => k.toLowerCase().includes(ql)) ||
    item.desc.toLowerCase().includes(ql) ||
    item.synonyms.some(s => s.toLowerCase().includes(ql))
  )
}

// ─────────────────────────────────────────────────────────
// 치조골 이식 팝업 데이터
// ─────────────────────────────────────────────────────────
const CHIOGOL_DATA = [
  { company: 'IGN생명',     until: '~2008년 03월 31일' },
  { company: '한화생명',    until: '~2006년 02월 28일' },
  { company: '교보생명',    until: '~2006년 02월 20일' },
  { company: '삼성생명',    until: '~2005년 03월 31일' },
  { company: '신한라이프',  until: '~2006년 03월 12일' },
  { company: '동부생명',    until: '~2007년 03월 31일' },
  { company: '알리안츠',    until: '~2006년 03월 31일' },
  { company: '메트라이프',  until: '~2008년 03월 31일' },
  { company: '푸르덴셜',    until: '~2008년 03월 31일' },
  { company: '동양생명',    until: '~2006년 03월 31일' },
  { company: '미래에셋',    until: '~2006년 03월 31일' },
  { company: '하나생명',    until: '~2006년 03월 31일' },
]

// ─────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────
export default function SurgeryPage() {
  const [query, setQuery]         = useState('')
  const [category, setCategory]   = useState('all')
  const [typeFilter, setTypeFilter] = useState<number | 'cancer' | null>(null)
  const [amounts, setAmounts]     = useState<SurgeryAmounts>(DEFAULT_AMOUNTS)
  const [showChiogol, setShowChiogol] = useState(false)
  const [acOpen, setAcOpen]       = useState(false)

  // 자동완성 후보
  const acItems = useMemo(() => {
    if (!query || query.length < 1) return []
    return SURGERY_DB.filter(item => matchItem(item, query)).slice(0, 10)
  }, [query])

  // 필터링된 결과
  const filtered = useMemo(() => {
    return SURGERY_DB.filter(item => {
      const catOk = category === 'all' || item.category === category
      const typeOk = typeFilter === null
        ? true
        : typeFilter === 'cancer'
          ? item.isCancer
          : item.type === typeFilter && !item.isCancer
      const textOk = !query || matchItem(item, query)
      return catOk && typeOk && textOk
    })
  }, [query, category, typeFilter])

  const handleAmountChange = useCallback((key: keyof SurgeryAmounts, val: string) => {
    setAmounts(prev => ({ ...prev, [key]: Number(val) || 0 }))
  }, [])

  const handleTypeClick = useCallback((t: number | 'cancer') => {
    setTypeFilter(prev => prev === t ? null : t)
    setCategory('all')
    setQuery('')
  }, [])

  const handleCategoryClick = useCallback((key: string) => {
    setCategory(key)
    setTypeFilter(null)
  }, [])

  const normalItems = filtered.filter(x => !x.isCancer)
  const cancerItems = filtered.filter(x => x.isCancer)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-green-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 text-white px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">🏥 수술비 계산기</h1>
              <p className="text-sm text-blue-200 mt-0.5">1~5종 수술 전체 · KB·흥국생명·DB손해보험 기준</p>
            </div>
            <button
              onClick={() => setShowChiogol(true)}
              className="text-xs bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3 py-1.5 rounded-lg transition"
            >
              🦷 1~3종 치조골이식 보험사 현황
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ① 검색 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">🔍 통합 검색</p>
          <div className="relative">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setAcOpen(true) }}
                  onKeyDown={e => { if (e.key === 'Escape') setAcOpen(false) }}
                  onFocus={() => setAcOpen(true)}
                  placeholder="예) 백내장, H25, 담낭, 티눈, 디스크, 위절제..."
                  className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-base outline-none bg-slate-50 focus:bg-white transition"
                />
                {/* 자동완성 */}
                {acOpen && acItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-blue-400 rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
                    <div className="px-4 py-2 bg-blue-50 text-xs font-bold text-blue-600 uppercase tracking-wide">
                      검색결과 — 클릭하면 바로 확인
                    </div>
                    {acItems.map(item => {
                      const col = item.isCancer ? CANCER_COLOR : TYPE_COLORS[item.type]
                      const { surgPay, disPay, total } = calcPayout(item, amounts)
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setQuery(item.name); setAcOpen(false); setTypeFilter(null) }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0 text-left transition"
                        >
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black text-sm shrink-0 ${col.badge}`}>
                            <span className="text-base leading-none">{item.isCancer ? '암' : item.type}</span>
                            <span className="text-[10px] opacity-80">종</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-semibold text-slate-800 text-sm truncate"
                              dangerouslySetInnerHTML={{ __html: highlight(item.name, query) }}
                            />
                            <div className="flex gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {item.kcd_codes[0] || '-'}
                              </span>
                              <span className="text-xs text-slate-500">{item.type}종 수술</span>
                              {total > 0 && (
                                <span className="text-xs font-bold text-blue-700">예상 {fmoney(total)}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-slate-300 text-sm">→</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {query && (
                <button
                  onClick={() => { setQuery(''); setAcOpen(false) }}
                  className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition"
                >
                  초기화
                </button>
              )}
            </div>

            {/* 부위별 탭 */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => handleCategoryClick(c.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition
                    ${category === c.key
                      ? c.key === 'cancer'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-blue-600 text-white border-blue-600'
                      : c.key === 'cancer'
                        ? 'border-red-300 text-red-600 hover:bg-red-50'
                        : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ② 가입금액 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">💰 가입금액 입력 — 1~5종 개별 설정</p>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {([1,2,3,4,5] as const).map(t => {
              const col = TYPE_COLORS[t]
              const key = `type${t}` as keyof SurgeryAmounts
              return (
                <div key={t}>
                  <label className={`block text-xs font-bold mb-1 ${col.text}`}>{t}종 수술비</label>
                  <div className={`flex items-center border-2 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white transition focus-within:${col.border}`}>
                    <input
                      type="number"
                      min={0}
                      value={amounts[key]}
                      onChange={e => handleAmountChange(key, e.target.value)}
                      className="flex-1 text-right px-2 py-2.5 text-sm font-bold bg-transparent outline-none min-w-0"
                    />
                    <span className="pr-2 text-xs text-slate-400 font-medium shrink-0">만원</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-slate-600 whitespace-nowrap">질병수술비 <span className="text-xs text-slate-400">(1회 지급)</span></label>
            <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white w-40">
              <input
                type="number"
                min={0}
                value={amounts.disease}
                onChange={e => handleAmountChange('disease', e.target.value)}
                className="flex-1 text-right px-3 py-2.5 text-sm font-bold bg-transparent outline-none"
              />
              <span className="pr-3 text-xs text-slate-400">만원</span>
            </div>
          </div>
        </div>

        {/* ③ 종별 브라우즈 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">📂 종별 목록 보기 <span className="font-normal text-slate-400 text-xs normal-case tracking-normal">— 클릭하면 해당 종 전체 표시 / 다시 클릭하면 해제</span></p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {TYPE_BROWSE.map(({ type, label, example, mul }) => {
              const col = TYPE_COLORS[type]
              const isOn = typeFilter === type
              const amt = amounts[`type${type}` as keyof SurgeryAmounts] as number
              return (
                <button
                  key={type}
                  onClick={() => handleTypeClick(type)}
                  className={`rounded-xl p-3 text-left border-2 transition hover:-translate-y-0.5 hover:shadow-md
                    ${isOn ? `${col.bg} ${col.border} shadow-md` : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}
                >
                  <div className={`text-2xl font-black leading-none ${isOn ? col.text : 'text-slate-400'}`}>{type}</div>
                  <div className={`text-xs font-bold mb-1 ${isOn ? col.text : 'text-slate-500'}`}>종 수술</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{example}</div>
                  <div className={`text-xs font-bold mt-1 ${isOn ? col.text : 'text-slate-400'}`}>
                    {amt > 0 ? `${fmoney(amt)} 지급` : '미가입'}
                  </div>
                </button>
              )
            })}
            {/* 암 */}
            <button
              onClick={() => handleTypeClick('cancer')}
              className={`rounded-xl p-3 text-left border-2 transition hover:-translate-y-0.5 hover:shadow-md
                ${typeFilter === 'cancer' ? 'bg-red-50 border-red-400 shadow-md' : 'bg-slate-50 border-slate-200 hover:border-red-300'}`}
            >
              <div className={`text-2xl font-black leading-none ${typeFilter === 'cancer' ? 'text-red-600' : 'text-slate-400'}`}>암</div>
              <div className={`text-xs font-bold mb-1 ${typeFilter === 'cancer' ? 'text-red-600' : 'text-slate-500'}`}>수술</div>
              <div className="text-[10px] text-slate-400 leading-tight">근치·내시경·방사선</div>
              <div className={`text-xs font-bold mt-1 ${typeFilter === 'cancer' ? 'text-red-600' : 'text-slate-400'}`}>5종 기준</div>
            </button>
          </div>
        </div>

        {/* ④ 결과 */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm font-bold text-slate-600">
              {typeFilter !== null
                ? <span><span className="text-blue-600">{typeFilter === 'cancer' ? '암수술' : `${typeFilter}종`}</span> 수술 목록</span>
                : query
                  ? <span>&ldquo;{query}&rdquo; 검색 결과</span>
                  : '전체 수술 목록'
              }
              <span className="ml-2 text-blue-500">{filtered.length}건</span>
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">검색 결과가 없습니다.<br />다른 검색어나 부위를 선택해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 일반 수술 */}
              {normalItems.map(item => (
                <SurgeryCard key={item.id} item={item} amounts={amounts} query={query} />
              ))}
              {/* 암 수술 구분선 */}
              {cancerItems.length > 0 && normalItems.length > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-red-200" />
                  <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                    🎗 암 수술 — 별도 암 특약 확인 필수
                  </span>
                  <div className="flex-1 h-px bg-red-200" />
                </div>
              )}
              {cancerItems.map(item => (
                <SurgeryCard key={item.id} item={item} amounts={amounts} query={query} />
              ))}
            </div>
          )}

          {/* 면책 안내 */}
          <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
            ⚠️ 이 내용은 예시이며 해당 상품의 <strong>증권과 약관을 다시 참조</strong>하시길 바랍니다. 가입 특약에 따라 지급 기준이 다를 수 있습니다.
          </div>
        </div>
      </div>

      {/* 치조골 이식 팝업 */}
      {showChiogol && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">🦷 생명보험사 1~3종 치조골이식</h2>
                <p className="text-xs text-blue-200 mt-0.5">수술 가능한 보험시기 기준</p>
              </div>
              <button onClick={() => setShowChiogol(false)} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 px-2 text-slate-600 font-bold">생명 보험사</th>
                    <th className="text-right py-2 px-2 text-slate-600 font-bold">보험시기 (~까지)</th>
                  </tr>
                </thead>
                <tbody>
                  {CHIOGOL_DATA.map((row, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="py-2.5 px-2 font-medium text-slate-800">{row.company}</td>
                      <td className="py-2.5 px-2 text-right text-blue-700 font-semibold">{row.until}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-3 text-center">
                해당 보험시기 이전 가입 계약에 한해 치조골이식 수술비 지급 가능
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 수술 카드 컴포넌트
// ─────────────────────────────────────────────────────────
function SurgeryCard({ item, amounts, query }: { item: SurgeryItem; amounts: SurgeryAmounts; query: string }) {
  const [open, setOpen] = useState(false)
  const col = item.isCancer ? CANCER_COLOR : TYPE_COLORS[item.type]
  const { surgPay, disPay, total } = calcPayout(item, amounts)

  const matchedSyns = useMemo(() => {
    if (!query) return []
    const ql = query.toLowerCase()
    return item.synonyms.filter(s =>
      s.toLowerCase().includes(ql) && !item.name.toLowerCase().includes(ql)
    )
  }, [item, query])

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className={`bg-white rounded-2xl shadow-sm border-2 cursor-pointer transition hover:shadow-md
        ${open ? col.border : 'border-slate-100 hover:border-blue-300'}`}
    >
      {/* 카드 헤더 */}
      <div className="flex items-start gap-3 p-4 border-b border-slate-100">
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black shrink-0 ${col.badge}`}>
          <span className="text-lg leading-none">{item.isCancer ? '암' : item.type}</span>
          <span className="text-[10px] opacity-80">종</span>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-slate-800 text-base leading-snug"
            dangerouslySetInnerHTML={{ __html: highlight(item.name, query) }}
          />
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {item.kcd_codes.slice(0, 2).map(k => (
              <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{k}</span>
            ))}
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${col.badge}`}>
              {item.isCancer ? `암수술·${item.type}종` : `${item.type}종 수술`}
            </span>
            {item.is_disputed && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">⚠️ 분쟁주의</span>
            )}
          </div>
          {matchedSyns.length > 0 && (
            <div className="mt-1">
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                🔗 &ldquo;{matchedSyns[0]}&rdquo; 연관 검색
              </span>
            </div>
          )}
        </div>
        <div className="text-slate-300 text-lg">{open ? '▲' : '▼'}</div>
      </div>

      {/* 지급액 패널 */}
      <div className={`px-4 py-3 ${open ? 'bg-gradient-to-r from-slate-800 to-blue-900' : col.bg} transition-colors`}>
        <div className={`text-xs mb-0.5 ${open ? 'text-blue-200' : col.text + ' opacity-70'}`}>예상 총 지급액</div>
        <div className={`text-2xl font-black tracking-tight ${open ? 'text-yellow-400' : col.text}`}>
          {fmoney(total)}
        </div>
        <div className={`text-xs mt-0.5 ${open ? 'text-blue-300' : col.text + ' opacity-70'}`}>
          {item.type}종 수술비 {fmoney(surgPay)}
          {disPay > 0 ? ` + 질병수술비 ${fmoney(disPay)}` : ''}
        </div>
      </div>

      {/* 상세 (펼쳐졌을 때) */}
      {open && (
        <div className="p-4 space-y-2.5 text-sm">
          <div className="flex gap-2">
            <span className="text-base shrink-0 mt-0.5">📋</span>
            <span className="text-slate-700"><strong>수술 정의:</strong> {item.desc}</span>
          </div>
          {item.notes && (
            <div className="flex gap-2">
              <span className="text-base shrink-0 mt-0.5">💡</span>
              <span className="text-slate-600">{item.notes}</span>
            </div>
          )}
          {item.isCancer && (
            <div className="flex gap-2">
              <span className="text-base shrink-0 mt-0.5">🎗</span>
              <span className="text-slate-700"><strong>암 특약(암수술비)</strong> 별도 지급 가능 — 증권 확인 필요</span>
            </div>
          )}
          {item.type_by_company && (
            <div className="flex gap-2">
              <span className="text-base shrink-0 mt-0.5">🏢</span>
              <span className="text-slate-600">
                보험사별 종수 차이:&nbsp;
                {Object.entries(item.type_by_company).map(([co, t]) => `${co} ${t}종`).join(' / ')}
              </span>
            </div>
          )}
          {item.no_pay.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 mt-1">
              <div className="text-red-700 font-bold text-sm mb-2">🚫 부지급 주의사항</div>
              <ul className="space-y-1">
                {item.no_pay.map((np, i) => (
                  <li key={i} className="flex gap-2 text-xs text-red-800">
                    <span className="shrink-0">⛔</span>
                    <span>{np}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {item.sources.map(s => (
              <span key={s} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">출처: {s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}