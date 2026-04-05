'use client'

import { useState, useMemo } from 'react'
import { CAR_ACCIDENT_DB, GRADE_SUMMARY } from '../../../lib/insurance/car-accident-db'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const GRADE_COLORS: Record<number, { badge: string; bar: string; text: string }> = {
  1:  { badge: 'bg-red-700 text-white',      bar: 'bg-red-700',    text: 'text-red-700' },
  2:  { badge: 'bg-red-600 text-white',      bar: 'bg-red-600',    text: 'text-red-600' },
  3:  { badge: 'bg-red-500 text-white',      bar: 'bg-red-500',    text: 'text-red-500' },
  4:  { badge: 'bg-orange-600 text-white',   bar: 'bg-orange-600', text: 'text-orange-600' },
  5:  { badge: 'bg-orange-500 text-white',   bar: 'bg-orange-500', text: 'text-orange-500' },
  6:  { badge: 'bg-amber-500 text-white',    bar: 'bg-amber-500',  text: 'text-amber-600' },
  7:  { badge: 'bg-yellow-500 text-slate-800', bar: 'bg-yellow-500', text: 'text-yellow-600' },
  8:  { badge: 'bg-yellow-400 text-slate-800', bar: 'bg-yellow-400', text: 'text-yellow-600' },
  9:  { badge: 'bg-lime-500 text-white',     bar: 'bg-lime-500',   text: 'text-lime-600' },
  10: { badge: 'bg-green-500 text-white',    bar: 'bg-green-500',  text: 'text-green-600' },
  11: { badge: 'bg-teal-500 text-white',     bar: 'bg-teal-500',   text: 'text-teal-600' },
  12: { badge: 'bg-cyan-500 text-white',     bar: 'bg-cyan-500',   text: 'text-cyan-600' },
  13: { badge: 'bg-blue-400 text-white',     bar: 'bg-blue-400',   text: 'text-blue-500' },
  14: { badge: 'bg-slate-400 text-white',    bar: 'bg-slate-400',  text: 'text-slate-500' },
}

function fmoney(v: number): string {
  if (v === 0) return '미가입'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}천만원`
  return `${v.toLocaleString()}만원`
}

// ─────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────
export default function CarAccidentPage() {
  const [query, setQuery]       = useState('')
  const [selectedGrade, setGrade] = useState<number | null>(null)
  const [amount, setAmount]     = useState<number>(3000) // 자동차부상 보험금

  const filtered = useMemo(() => {
    if (selectedGrade !== null) {
      return CAR_ACCIDENT_DB.filter(d => d.grade === selectedGrade)
    }
    if (!query) return CAR_ACCIDENT_DB
    const ql = query.toLowerCase()
    return CAR_ACCIDENT_DB.filter(d =>
      d.description.toLowerCase().includes(ql) ||
      d.examples.some(e => e.toLowerCase().includes(ql)) ||
      String(d.grade).includes(ql) ||
      (d.notes?.toLowerCase().includes(ql) ?? false)
    )
  }, [query, selectedGrade])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-slate-50 to-orange-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-amber-700 to-orange-700 text-white px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold">🚗 자동차사고 부상등급</h1>
          <p className="text-sm text-amber-200 mt-0.5">KB 금쪽같은 별표9 · 자동차손해배상보장법 시행령 기준 · 1~14급 전체</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ① 검색 + 급수 선택 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">🔍 상해내용 검색 또는 등급 선택</p>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setGrade(null) }}
            placeholder="예) 골절 / 뇌손상 / 척추 / 절단 / 인대 파열..."
            className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-4 py-3 text-base outline-none bg-slate-50 focus:bg-white mb-3 transition"
          />
          {/* 등급 빠른 선택 */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setGrade(null); setQuery('') }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition
                ${selectedGrade === null && !query ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-200 text-slate-600 hover:border-amber-400'}`}
            >
              전체
            </button>
            {Array.from({ length: 14 }, (_, i) => i + 1).map(g => {
              const col = GRADE_COLORS[g]
              return (
                <button
                  key={g}
                  onClick={() => { setGrade(g); setQuery('') }}
                  className={`w-10 h-8 rounded-full text-xs font-black border-2 transition
                    ${selectedGrade === g
                      ? col.badge + ' border-transparent'
                      : 'border-slate-200 text-slate-600 hover:border-amber-400'}`}
                >
                  {g}급
                </button>
              )
            })}
          </div>
        </div>

        {/* ② 보험금 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">💰 자동차부상 보험금 가입금액</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center border-2 border-slate-200 focus-within:border-amber-400 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white w-48 transition">
              <input
                type="number"
                min={0}
                value={amount}
                onChange={e => setAmount(Number(e.target.value) || 0)}
                className="flex-1 text-right px-3 py-3 text-base font-bold bg-transparent outline-none"
              />
              <span className="pr-3 text-sm text-slate-400 shrink-0">만원</span>
            </div>
            <p className="text-xs text-slate-500">급수별 지급금액 = 가입금액 ÷ 급수<br/>(예: 3,000만원 ÷ 3급 = 1,000만원)</p>
          </div>
          {/* 등급별 빠른 계산 */}
          {amount > 0 && (
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 14 }, (_, i) => i + 1).map(g => {
                const col = GRADE_COLORS[g]
                const pay = Math.round(amount / g)
                return (
                  <div
                    key={g}
                    onClick={() => { setGrade(g); setQuery('') }}
                    className="text-center cursor-pointer rounded-xl p-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition"
                  >
                    <div className={`text-xs font-black ${col.text}`}>{g}급</div>
                    <div className="text-[10px] text-slate-600 font-bold">{pay >= 1000 ? `${(pay/1000).toFixed(1)}천` : `${pay}`}만</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ③ 결과 */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm font-bold text-slate-600">
              {selectedGrade !== null
                ? <span><span className="text-amber-600 font-black">{selectedGrade}급</span> 상해 내용</span>
                : query
                  ? `"${query}" 검색 결과`
                  : '전체 1~14급 목록'
              }
              <span className="ml-2 text-amber-500">{filtered.length}건</span>
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(item => {
                const col = GRADE_COLORS[item.grade]
                const pay = amount > 0 ? Math.round(amount / item.grade) : 0
                return (
                  <CarGradeCard key={item.grade} item={item} col={col} pay={pay} query={query} amount={amount} />
                )
              })}
            </div>
          )}

          {/* 참고사항 */}
          <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
            <p className="font-bold">📌 부상등급 적용 참고사항</p>
            <p>• 2급~11급 중 2가지 이상 중복 시: 가장 높은 등급에서 하위 3등급 이내 중복이면 <strong>1등급 상향 병급</strong></p>
            <p>• 일반 외상 + 치과보철 중복 시: 각각 배상, 합산액은 1급 금액 초과 불가</p>
            <p>• 개방성 골절(거스틸로 2형 이상): <strong>1등급 상향</strong></p>
            <p>• 소아(만 13세 미만): 동일 부위 골절 <strong>1급 하향</strong> (성장판 손상 제외)</p>
            <p>• 보존적 치료 골절: 수술 등급에서 <strong>2급 하향</strong></p>
          </div>

          <div className="mt-3 bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-xs text-slate-700">
            ⚠️ 이 내용은 KB 금쪽같은 별표9 기준이며 자동차손해배상보장법 시행령 개정 시 변경됩니다. 해당 <strong>약관을 다시 참조</strong>하시길 바랍니다.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 등급 카드
// ─────────────────────────────────────────────────────────
function CarGradeCard({
  item, col, pay, query, amount
}: {
  item: typeof CAR_ACCIDENT_DB[0]
  col: { badge: string; bar: string; text: string }
  pay: number
  query: string
  amount: number
}) {
  const [open, setOpen] = useState(false)

  const matchedExamples = useMemo(() => {
    if (!query) return item.examples
    const ql = query.toLowerCase()
    return item.examples.filter(e => e.toLowerCase().includes(ql))
  }, [item.examples, query])

  const displayExamples = query ? matchedExamples : (open ? item.examples : item.examples.slice(0, 3))

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className={`bg-white rounded-2xl shadow-sm border-2 cursor-pointer transition hover:shadow-md
        ${open ? 'border-amber-300' : 'border-slate-100 hover:border-amber-300'}`}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-100">
        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black shrink-0 ${col.badge}`}>
          <span className="text-2xl leading-none">{item.grade}</span>
          <span className="text-xs opacity-80">급</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 text-sm">{item.description}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">{GRADE_SUMMARY[item.grade]}</div>
          {amount > 0 && (
            <div className={`text-sm font-black mt-1 ${col.text}`}>
              예상 지급: {fmoney(pay)}
              <span className="text-xs font-normal text-slate-400 ml-1">({amount.toLocaleString()}만원 ÷ {item.grade}급)</span>
            </div>
          )}
        </div>
        <div className="text-slate-300 text-sm shrink-0">{open ? '▲' : '▼'}</div>
      </div>

      {/* 상해 내용 목록 */}
      <div className="p-4 pt-3">
        <p className="text-xs font-bold text-slate-500 mb-2">
          상해 내용 {query && matchedExamples.length > 0 ? `(검색 매칭 ${matchedExamples.length}건)` : `(${item.examples.length}건)`}
        </p>
        <ul className="space-y-1.5">
          {displayExamples.map((ex, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-700 leading-relaxed">
              <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5 ${col.bar}`}>
                {i + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: query
                ? ex.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
                : ex
              }} />
            </li>
          ))}
        </ul>
        {!open && !query && item.examples.length > 3 && (
          <button className="mt-2 text-xs text-amber-600 font-bold hover:underline">
            + {item.examples.length - 3}개 더 보기 ▼
          </button>
        )}
        {item.notes && open && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
            💡 {item.notes}
          </div>
        )}
      </div>
    </div>
  )
}