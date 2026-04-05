'use client'

import Link from 'next/link'

const TOOLS = [
  {
    href: '/insurance-tools/surgery',
    icon: '🏥',
    title: '수술비 계산기',
    desc: '1~5종 수술 전체 88항목\nKB·흥국생명·DB손해보험 기준',
    color: 'from-slate-700 to-blue-800',
    badge: '수술 95항목',
    tags: ['1~5종 분류', '부위별 검색', '부지급 안내', '치조골이식'],
  },
  {
    href: '/insurance-tools/diagnosis',
    icon: '🎗',
    title: '진단비 검색기',
    desc: 'KCD 코드·질병명 입력\n암·뇌혈관·심장 보장 즉시 확인',
    color: 'from-red-700 to-rose-700',
    badge: 'KCD 전체',
    tags: ['일반암', '유사암', '뇌졸중', '심근경색'],
  },
  {
    href: '/insurance-tools/disability',
    icon: '🦴',
    title: '후유장해율 계산기',
    desc: '장해분류표 전체 (별표1)\n부위별 장해율 및 지급액 계산',
    color: 'from-indigo-700 to-purple-700',
    badge: '13개 신체부위',
    tags: ['눈·귀·코', '척추·팔·다리', '신경계', '장해율 계산'],
  },
  {
    href: '/insurance-tools/car-accident',
    icon: '🚗',
    title: '자동차부상 등급',
    desc: '자동차사고 부상등급표 (별표9)\n1~14급 상해내용 검색 및 지급액',
    color: 'from-amber-600 to-orange-600',
    badge: '1~14급 전체',
    tags: ['급수별 검색', '상해내용 검색', '지급액 계산', '병급 기준'],
  },
]

export default function InsuranceToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 text-white px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-black tracking-tight">📋 심플 약관 검색기</h1>
          <p className="text-blue-200 mt-1.5 text-sm">
            수술비 · 진단비 · 후유장해 · 자동차부상 — KB 금쪽같은 외 다수 약관 기반
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {['KB 금쪽같은(2603)', '흥국생명 오튼튼', 'DB손해보험(2601)', 'KCD 9차 개정(2026.1.1.)'].map(s => (
              <span key={s} className="text-xs bg-white/15 border border-white/20 text-white px-2.5 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 도구 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {TOOLS.map(tool => (
            <Link key={tool.href} href={tool.href}>
              <div className={`bg-gradient-to-br ${tool.color} text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{tool.icon}</span>
                  <span className="text-xs bg-white/20 border border-white/30 px-2.5 py-1 rounded-full font-medium">
                    {tool.badge}
                  </span>
                </div>
                <h2 className="text-lg font-black mb-1">{tool.title}</h2>
                <p className="text-sm text-white/75 leading-relaxed whitespace-pre-line mb-3">{tool.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tool.tags.map(t => (
                    <span key={t} className="text-[11px] bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 사용 안내 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="font-bold text-slate-800 mb-3">💡 사용 방법</h3>
          <div className="space-y-2.5 text-sm text-slate-600">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <p><strong className="text-slate-800">수술비 계산기</strong> — 질병명·KCD코드·부위·증상을 입력하면 해당 수술의 종수(1~5종) 및 예상 수술비 즉시 확인</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <p><strong className="text-slate-800">진단비 검색기</strong> — KCD 코드(예: C16·위암) 입력 시 일반암/유사암/뇌혈관/심장 해당 여부 및 예상 진단비 계산</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <p><strong className="text-slate-800">후유장해 계산기</strong> — 신체부위 선택 또는 상태 검색으로 장해율(%) 및 예상 지급액 계산</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <p><strong className="text-slate-800">자동차부상 등급</strong> — 상해 내용 검색 또는 급수 클릭으로 해당 급수 내용 및 예상 지급액 확인</p>
            </div>
          </div>
        </div>

        {/* 면책 안내 */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
          ⚠️ 모든 내용은 참고용 예시이며 실제 보험금 지급은 <strong>해당 상품의 증권 및 약관</strong>에 따라 결정됩니다.
          보험금 청구 전 반드시 담당 설계사 또는 보험사에 확인하시기 바랍니다.
        </div>
      </div>
    </div>
  )
}