"use client"

import React, { useState } from "react"

export default function CalcModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('compare') // compare, inflation, compound

  // 공통 천 단위 콤마 포맷팅 함수
  const formatNum = (num: number) => {
    return Math.floor(num).toLocaleString('ko-KR');
  };

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
          {activeTab === 'compare' && <CompareCalc format={formatNum} />}
          {activeTab === 'inflation' && <InflationCalc format={formatNum} />}
          {activeTab === 'compound' && <CompoundCalc format={formatNum} />}
        </div>

        {/* 하단 푸터 */}
        <div className="px-10 pb-10 font-black">
          <div className="text-[11px] text-slate-400 mb-6 space-y-1">
            <p>* 모든 은행 수익은 이자소득세 15.4% 차감 후 세후 금액 기준입니다.</p>
            <p>* 노란색 칸의 수치를 조정하여 고객 맞춤형 시뮬레이션을 진행하세요.</p>
          </div>
          <button onClick={onClose} className="md:hidden w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-lg italic shadow-xl">CLOSE CALCULATOR</button>
        </div>
      </div>
    </div>
  )
}

/** 1. 보험 vs 적금·예금 비교 **/
function CompareCalc({ format }: any) {
  const [monthly, setMonthly] = useState(500000)
  const [payYears, setPayYears] = useState(5)      
  const [holdYears, setHoldYears] = useState(5)     
  const [savingRate, setSavingRate] = useState(3.5)   
  const [depositRate, setDepositRate] = useState(4.0)  
  const [insuRate, setInsuRate] = useState(124)     

  const totalMonths = payYears * 12
  const totalPrincipal = monthly * totalMonths
  const savingInterest = Math.floor((monthly * totalMonths * (totalMonths + 1) / 2) * (savingRate / 100 / 12))
  const savingAfterPrincipal = totalPrincipal + savingInterest
  const depositInterest = Math.floor(savingAfterPrincipal * (depositRate / 100) * holdYears)
  const totalInterest = savingInterest + depositInterest
  const tax = Math.floor(totalInterest * 0.154)
  const bankFinal = totalPrincipal + totalInterest - tax
  
  const insuFinal = Math.floor(totalPrincipal * (insuRate / 100))
  const diff = insuFinal - bankFinal

  return (
    <div className="space-y-8 animate-in zoom-in-95 font-black">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <InputBox label="월 납입액" val={monthly} onChange={setMonthly} unit="원" isYellow format={format} />
        <InputBox label="납입기간" val={payYears} onChange={setPayYears} unit="년" isYellow />
        <InputBox label="거치기간" val={holdYears} onChange={setHoldYears} unit="년" isYellow />
        <InputBox label="적금이율" val={savingRate} onChange={setSavingRate} unit="%" isYellow />
        <InputBox label="예금이율" val={depositRate} onChange={setDepositRate} unit="%" isYellow />
        <InputBox label="보험 환급률" val={insuRate} onChange={setInsuRate} unit="%" isYellow />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 font-black">
          <p className="text-[11px] font-black text-slate-400 mb-6 flex items-center gap-2 uppercase">
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span> Bank (Savings)
          </p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-black"><span>총 납입 원금</span><span>{format(totalPrincipal)}원</span></div>
            <div className="flex justify-between text-sm text-indigo-600 font-black"><span>발생 이자합계</span><span>+{format(totalInterest)}원</span></div>
            <div className="flex justify-between text-sm text-rose-500 font-black"><span>이자소득세(15.4%)</span><span>-{format(tax)}원</span></div>
            <div className="pt-6 border-t-2 border-dashed border-slate-200 mt-4 flex justify-between items-end">
              <span className="text-sm font-black">최종 세후 만기금</span>
              <span className="text-3xl font-black italic">{format(bankFinal)}원</span>
            </div>
          </div>
        </div>

        <div className="bg-black text-[#d4af37] p-8 rounded-[3rem] shadow-2xl flex flex-col justify-between font-black">
          <div>
            <p className="text-[11px] font-black mb-6 flex items-center gap-2 text-white/50 uppercase">
              <span className="w-2 h-2 bg-[#d4af37] rounded-full"></span> Insurance (Return)
            </p>
            <div className="flex justify-between items-end mb-8">
              <span className="text-sm text-white font-black">보험사 예상 환급금</span>
              <span className="text-4xl font-black italic">{format(insuFinal)}원</span>
            </div>
          </div>
          <div className="bg-[#d4af37] text-black p-6 rounded-[2rem] text-center">
            <p className="text-[11px] font-black uppercase mb-1 opacity-60">Difference Analysis</p>
            <p className="text-xl font-black italic">
              보험 가입 시 <span className="text-2xl underline decoration-4">{format(Math.abs(diff))}원</span> {diff >= 0 ? '더 유리' : '부족'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 2. 돈의 현재와 미래가치 (인플레이션) **/
function InflationCalc({ format }: any) {
  const [amount, setAmount] = useState(100000000)
  const [years, setYears] = useState(10)
  const [inflation, setInflation] = useState(3.0)

  const futureValue = Math.floor(amount / Math.pow(1 + (inflation / 100), years))
  const lostValue = amount - futureValue

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 font-black">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputBox label="현재 목돈" val={amount} onChange={setAmount} unit="원" isYellow format={format} />
        <InputBox label="경과 기간" val={years} onChange={setYears} unit="년" isYellow />
        <InputBox label="물가상승률" val={inflation} onChange={setInflation} unit="%" isYellow />
      </div>
      <div className="bg-rose-50 border-4 border-rose-100 p-10 rounded-[3.5rem] text-center font-black">
        <p className="text-rose-400 text-[11px] font-black uppercase tracking-widest mb-4">Buying Power Warning</p>
        <p className="text-xl md:text-2xl font-black mb-2">지금의 {format(amount)}원,</p>
        <p className="text-2xl md:text-3xl font-black mb-6">{years}년 후 실제 가치는?</p>
        <p className="text-5xl md:text-7xl font-black italic text-rose-600 mb-6">{format(futureValue)}원</p>
        <p className="text-sm text-rose-400 font-black italic">물가 상승으로 인해 약 {format(lostValue)}원의 가치가 소멸됩니다.</p>
      </div>
    </div>
  )
}

/** 3. 복리 계산기 (일시납 비교) **/
function CompoundCalc({ format }: any) {
  const [principal, setPrincipal] = useState(50000000)
  const [years, setYears] = useState(10)
  const [simpleRate, setSimpleRate] = useState(3.0)
  const [compoundRate, setCompoundRate] = useState(3.0)

  const simpleFinal = Math.floor(principal * (1 + (simpleRate/100) * years))
  const compoundFinal = Math.floor(principal * Math.pow(1 + (compoundRate/100), years))
  const diff = compoundFinal - simpleFinal

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 font-black">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InputBox label="일시납 원금" val={principal} onChange={setPrincipal} unit="원" isYellow format={format} />
        <InputBox label="거치 기간" val={years} onChange={setYears} unit="년" isYellow />
        <InputBox label="은행 단리(%)" val={simpleRate} onChange={setSimpleRate} unit="%" isYellow />
        <InputBox label="보험 복리(%)" val={compoundRate} onChange={setCompoundRate} unit="%" isYellow />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-100 p-8 rounded-[2.5rem] border-2 border-slate-200 font-black">
            <p className="text-[11px] text-slate-400 font-black mb-4 uppercase">Simple Interest (Bank)</p>
            <p className="text-3xl font-black italic">{format(simpleFinal)}원</p>
            <p className="text-[11px] mt-2 text-slate-400 font-black">단리는 원금에 대해서만 이자가 붙습니다.</p>
        </div>
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl font-black">
            <p className="text-indigo-200 text-[11px] font-black mb-4 uppercase">Compound Interest (Insurance)</p>
            <p className="text-3xl font-black italic text-[#d4af37]">{format(compoundFinal)}원</p>
            <div className="mt-4 pt-4 border-t border-indigo-400 flex justify-between items-center">
                <span className="text-[11px] font-black uppercase">Compound Benefit</span>
                <span className="text-xl font-black">+{format(diff)}원</span>
            </div>
        </div>
      </div>
    </div>
  )
}

/** 공통 UI 컴포넌트 **/
function TabBtn({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] md:text-sm font-black transition-all ${active ? 'bg-[#d4af37] text-black' : 'bg-transparent text-white opacity-40 hover:opacity-100'}`}>
      {label}
    </button>
  )
}

function InputBox({ label, val, onChange, unit, isYellow, format }: any) {
  return (
    <div className={`p-4 rounded-2xl border-2 transition-all font-black ${isYellow ? 'bg-amber-50 border-amber-200 focus-within:border-black' : 'bg-white border-slate-100'}`}>
      <p className="text-[11px] text-slate-400 uppercase mb-1 font-black leading-none">{label}</p>
      <div className="flex items-center gap-1">
        <input 
            type="number" 
            value={val} 
            onChange={(e) => onChange(Number(e.target.value))} 
            className="bg-transparent w-full text-base md:text-lg font-black outline-none" 
        />
        <span className="text-[11px] opacity-40 font-black">{unit}</span>
      </div>
      {/* 금액 단위일 경우 하단에 콤마가 포함된 실시간 가이드 표시 */}
      {unit === "원" && format && (
        <p className="text-[10px] text-indigo-600 mt-1 font-black italic">{format(val)}원</p>
      )}
    </div>
  )
}