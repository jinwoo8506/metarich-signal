"use client"

import React, { useState } from "react"

export default function CalcModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('compare') // compare, inflation, compound

  return (
    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 animate-in fade-in font-black">
      <div className="bg-white w-full h-full md:h-auto md:max-w-5xl md:rounded-[4rem] relative overflow-y-auto flex flex-col shadow-2xl border-4 border-black">
        
        {/* 팝업 헤더 */}
        <div className="sticky top-0 bg-white px-8 py-6 flex justify-between items-center border-b-4 border-black z-20 font-black">
          <div className="flex items-center gap-3">
            <div className="w-3 h-8 bg-[#d4af37]"></div>
            <h2 className="text-xl md:text-2xl italic font-black uppercase tracking-tighter text-black">Financial Analysis Tool</h2>
          </div>
          <button onClick={onClose} className="text-3xl font-black p-2 hover:rotate-90 transition-all text-black">✕</button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex bg-black p-2 gap-2 mx-6 mt-8 rounded-[2rem] font-black">
          <TabBtn label="보험 vs 적금·예금" active={activeTab === 'compare'} onClick={() => setActiveTab('compare')} />
          <TabBtn label="돈의 가치(인플레)" active={activeTab === 'inflation'} onClick={() => setActiveTab('inflation')} />
          <TabBtn label="복리 마법(일시납)" active={activeTab === 'compound'} onClick={() => setActiveTab('compound')} />
        </div>

        {/* 계산기 컨텐츠 영역 */}
        <div className="p-6 md:p-12 flex-1">
          {activeTab === 'compare' && <CompareCalc />}
          {activeTab === 'inflation' && <InflationCalc />}
          {activeTab === 'compound' && <CompoundCalc />}
        </div>

        {/* 하단 푸터 (모바일 닫기 및 안내) */}
        <div className="px-10 pb-10 font-black">
          <div className="text-[10px] text-slate-400 mb-6 space-y-1">
            <p>* 모든 은행 수익은 이자소득세 15.4% 차감 후 세후 금액 기준입니다.</p>
            <p>* 노란색 칸의 수치를 조정하여 고객 맞춤형 시뮬레이션을 진행하세요.</p>
          </div>
          <button onClick={onClose} className="md:hidden w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg italic shadow-xl">CLOSE CALCULATOR</button>
        </div>
      </div>
    </div>
  )
}

/** 1. 보험 vs 적금·예금 비교 (이미지 로직 기반) **/
function CompareCalc() {
  const [monthly, setMonthly] = useState(500000)
  const [payYears, setPayYears] = useState(5)      
  const [holdYears, setHoldYears] = useState(5)     
  const [savingRate, setSavingRate] = useState(3.5)   
  const [depositRate, setDepositRate] = useState(4.0)  
  const [insuRate, setInsuRate] = useState(124)     

  // 은행 계산
  const totalMonths = payYears * 12
  const totalPrincipal = monthly * totalMonths
  const savingInterest = Math.floor((monthly * totalMonths * (totalMonths + 1) / 2) * (savingRate / 100 / 12))
  const savingAfterPrincipal = totalPrincipal + savingInterest
  const depositInterest = Math.floor(savingAfterPrincipal * (depositRate / 100) * holdYears)
  const totalInterest = savingInterest + depositInterest
  const tax = Math.floor(totalInterest * 0.154)
  const bankFinal = totalPrincipal + totalInterest - tax
  
  // 보험 계산
  const insuFinal = Math.floor(totalPrincipal * (insuRate / 100))
  const diff = insuFinal - bankFinal

  return (
    <div className="space-y-8 animate-in zoom-in-95 font-black">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <InputBox label="월 납입액" val={monthly} onChange={setMonthly} unit="원" isYellow />
        <InputBox label="납입기간" val={payYears} onChange={setPayYears} unit="년" isYellow />
        <InputBox label="거치기간" val={holdYears} onChange={setHoldYears} unit="년" isYellow />
        <InputBox label="적금이율" val={savingRate} onChange={setSavingRate} unit="%" isYellow />
        <InputBox label="예금이율" val={depositRate} onChange={setDepositRate} unit="%" isYellow />
        <InputBox label="보험 환급률" val={insuRate} onChange={setInsuRate} unit="%" isYellow />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 font-black">
          <p className="text-xs font-black text-slate-400 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span> BANK (적금+예금)
          </p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span>총 납입 원금</span><span>{totalPrincipal.toLocaleString()}원</span></div>
            <div className="flex justify-between text-sm text-indigo-600"><span>발생 이자합계</span><span>+{totalInterest.toLocaleString()}원</span></div>
            <div className="flex justify-between text-sm text-rose-500"><span>이자소득세(15.4%)</span><span>-{tax.toLocaleString()}원</span></div>
            <div className="pt-6 border-t-2 border-dashed border-slate-200 mt-4 flex justify-between items-end">
              <span className="text-sm">최종 세후 만기금</span>
              <span className="text-3xl font-black italic">{bankFinal.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        <div className="bg-black text-[#d4af37] p-8 rounded-[3rem] shadow-2xl flex flex-col justify-between font-black">
          <div>
            <p className="text-xs font-black mb-6 flex items-center gap-2 text-white/50">
              <span className="w-2 h-2 bg-[#d4af37] rounded-full"></span> INSURANCE (환급형)
            </p>
            <div className="flex justify-between items-end mb-8">
              <span className="text-sm text-white">보험사 예상 환급금</span>
              <span className="text-4xl font-black italic">{insuFinal.toLocaleString()}원</span>
            </div>
          </div>
          <div className="bg-[#d4af37] text-black p-6 rounded-[2rem] text-center">
            <p className="text-[10px] font-black uppercase mb-1 opacity-60">Difference Analysis</p>
            <p className="text-xl font-black italic">
              보험 가입 시 <span className="text-2xl underline decoration-4">{diff.toLocaleString()}원</span> 더 유리
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 2. 돈의 현재와 미래가치 (인플레이션) **/
function InflationCalc() {
  const [amount, setAmount] = useState(100000000)
  const [years, setYears] = useState(10)
  const [inflation, setInflation] = useState(3.0)

  const futureValue = Math.floor(amount / Math.pow(1 + (inflation / 100), years))
  const lostValue = amount - futureValue

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 font-black">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputBox label="현재 목돈" val={amount} onChange={setAmount} unit="원" isYellow />
        <InputBox label="경과 기간" val={years} onChange={setYears} unit="년" isYellow />
        <InputBox label="물가상승률" val={inflation} onChange={setInflation} unit="%" isYellow />
      </div>
      <div className="bg-rose-50 border-4 border-rose-100 p-10 rounded-[3.5rem] text-center font-black">
        <p className="text-rose-400 text-xs font-black uppercase tracking-widest mb-4">Buying Power Warning</p>
        <p className="text-xl md:text-2xl font-black mb-2">지금의 {amount.toLocaleString()}원,</p>
        <p className="text-2xl md:text-3xl font-black mb-6">{years}년 후 실제 가치는?</p>
        <p className="text-5xl md:text-7xl font-black italic text-rose-600 mb-6">{futureValue.toLocaleString()}원</p>
        <p className="text-sm text-rose-400 font-black italic">물가 상승으로 인해 약 {lostValue.toLocaleString()}원의 가치가 소멸됩니다.</p>
      </div>
    </div>
  )
}

/** 3. 복리 계산기 (일시납 비교) **/
function CompoundCalc() {
  const [principal, setPrincipal] = useState(50000000)
  const [years, setYears] = useState(10)
  const [simpleRate, setSimpleRate] = useState(3.0)
  const [compoundRate, setCompoundRate] = useState(3.0)

  const simpleFinal = Math.floor(principal * (1 + (simpleRate/100) * years))
  const compoundFinal = Math.floor(principal * Math.pow(1 + (compoundRate/100), years))
  const diff = compoundFinal - simpleFinal

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 font-black">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InputBox label="일시납 원금" val={principal} onChange={setPrincipal} unit="원" isYellow />
        <InputBox label="거치 기간" val={years} onChange={setYears} unit="년" isYellow />
        <InputBox label="은행 단리(%)" val={simpleRate} onChange={setSimpleRate} unit="%" isYellow />
        <InputBox label="보험 복리(%)" val={compoundRate} onChange={setCompoundRate} unit="%" isYellow />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-100 p-8 rounded-[2.5rem] border-2 border-slate-200">
            <p className="text-[10px] text-slate-400 font-black mb-4 uppercase">Simple Interest (Bank)</p>
            <p className="text-3xl font-black italic">{simpleFinal.toLocaleString()}원</p>
            <p className="text-xs mt-2 text-slate-400">단리는 원금에 대해서만 이자가 붙습니다.</p>
        </div>
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl">
            <p className="text-indigo-200 text-[10px] font-black mb-4 uppercase">Compound Interest (Insurance)</p>
            <p className="text-3xl font-black italic text-[#d4af37]">{compoundFinal.toLocaleString()}원</p>
            <div className="mt-4 pt-4 border-t border-indigo-400 flex justify-between items-center">
                <span className="text-xs font-black">복리 추가 수익</span>
                <span className="text-xl font-black">+{diff.toLocaleString()}원</span>
            </div>
        </div>
      </div>
    </div>
  )
}

/** 공통 UI 컴포넌트 **/
function TabBtn({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] md:text-xs font-black transition-all ${active ? 'bg-[#d4af37] text-black' : 'bg-transparent text-white opacity-40 hover:opacity-100'}`}>
      {label}
    </button>
  )
}

function InputBox({ label, val, onChange, unit, isYellow }: any) {
  return (
    <div className={`p-4 rounded-2xl border-2 transition-all font-black ${isYellow ? 'bg-amber-50 border-amber-200 focus-within:border-black' : 'bg-white border-slate-100'}`}>
      <p className="text-[9px] text-slate-400 uppercase mb-1 font-black leading-none">{label}</p>
      <div className="flex items-center gap-1">
        <input 
            type="number" 
            value={val} 
            onChange={(e) => onChange(Number(e.target.value))} 
            className="bg-transparent w-full text-base md:text-lg font-black outline-none font-black" 
        />
        <span className="text-[10px] opacity-40 font-black">{unit}</span>
      </div>
    </div>
  )
}