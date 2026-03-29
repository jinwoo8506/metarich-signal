"use client"

import React, { useState, useEffect } from "react"

export default function FinancialCalc() {
  const [activeTab, setActiveTab] = useState('pension');

  const formatNum = (num: number) => {
    return Math.floor(num).toLocaleString('ko-KR');
  };

  return (
    <div className="flex-1 min-h-screen bg-white font-black text-black p-4 md:p-8">
      {/* 헤더 섹션 */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-2 h-10 bg-[#d4af37]"></div>
          <h1 className="text-3xl md:text-4xl italic uppercase tracking-tighter text-black">금융 분석 도구</h1>
        </div>
        <p className="text-slate-400 text-sm ml-6 italic font-black uppercase">전문가 컨설팅 시스템</p>
      </div>

      {/* 메인 탭 메뉴 */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-wrap bg-black p-2 rounded-[2.5rem] gap-2 shadow-2xl">
        <TabBtn label="은퇴자금/통합연금" active={activeTab === 'pension'} onClick={() => setActiveTab('pension')} />
        <TabBtn label="보험 vs 은행 비교" active={activeTab === 'compare'} onClick={() => setActiveTab('compare')} />
        <TabBtn label="화폐가치 하락" active={activeTab === 'inflation'} onClick={() => setActiveTab('inflation')} />
        <TabBtn label="복리 마법" active={activeTab === 'compound'} onClick={() => setActiveTab('compound')} />
        <TabBtn label="변액보험(투자)" active={activeTab === 'variable'} onClick={() => setActiveTab('variable')} />
      </div>

      {/* 컨텐츠 영역 */}
      <div className="max-w-7xl mx-auto bg-slate-50 rounded-[4rem] border-4 border-black p-6 md:p-12 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        {activeTab === 'pension' && <PensionCalc format={formatNum} />}
        {activeTab === 'compare' && <CompareCalc format={formatNum} />}
        {activeTab === 'inflation' && <InflationCalc format={formatNum} />}
        {activeTab === 'compound' && <CompoundCalc format={formatNum} />}
        {activeTab === 'variable' && <VariableCalc format={formatNum} />}
      </div>
    </div>
  )
}

/** 1. 은퇴자금 및 통합 연금 계산기 **/
function PensionCalc({ format }: any) {
  const [inputs, setInputs] = useState({ 
    age: 35, 
    workYears: 20,
    monthlySalary: 4000000,
    retireAge: 65, 
    lifeExpectancy: 90,
    targetMonthly: 3000000,
  });

  const [pensionEstimates, setPensionEstimates] = useState({ national: 0, company: 0 });
  const [results, setResults] = useState<any>(null);

  // 실시간 연금액 계산 (입력 1 기반)
  useEffect(() => {
    // 단순화된 계산 로직: 국민연금(소득의 약 25%), 퇴직연금(월급 * 연수 / 은퇴후 생존달수)
    const estNational = inputs.monthlySalary * 0.25; 
    const estCompany = (inputs.monthlySalary * inputs.workYears) / ((inputs.lifeExpectancy - inputs.retireAge) * 12);
    setPensionEstimates({ national: estNational, company: estCompany });
  }, [inputs.monthlySalary, inputs.workYears, inputs.retireAge, inputs.lifeExpectancy]);

  const calculate = () => {
    const totalMonthlyPension = pensionEstimates.national + pensionEstimates.company;
    const retireYears = inputs.lifeExpectancy - inputs.retireAge;
    const totalTarget = inputs.targetMonthly * 12 * retireYears;
    const totalPrepared = totalMonthlyPension * 12 * retireYears;
    const gap = totalTarget - totalPrepared;
    const monthsToRetire = (inputs.retireAge - inputs.age) * 12;
    const monthlyRequired = gap > 0 ? Math.floor(gap / monthsToRetire) : 0;

    setResults({ totalTarget, currentMonthly: totalMonthlyPension, gap, monthlyRequired, retireYears });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
      <div className="space-y-6 bg-white p-8 rounded-[3rem] border-2 border-black">
        <div>
          <h3 className="text-lg italic border-b-2 border-black pb-2 mb-4 font-black text-emerald-600">STEP 1. 현재 소득 기반 연금 산출</h3>
          <div className="space-y-2">
            <InputBox label="현재 나이" val={inputs.age} onChange={(v:any)=>setInputs({...inputs, age:v})} unit="세" isYellow />
            <InputBox label="예상 근속 기간" val={inputs.workYears} onChange={(v:any)=>setInputs({...inputs, workYears:v})} unit="년" isYellow />
            <InputBox label="현재 평균 월급여" val={inputs.monthlySalary} onChange={(v:any)=>setInputs({...inputs, monthlySalary:v})} unit="원" isYellow format={format} />
          </div>
          <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] text-emerald-600 font-black">자동 계산된 예상 월 연금액</p>
            <p className="text-sm font-black">국민: {format(pensionEstimates.national)}원 / 퇴직: {format(pensionEstimates.company)}원</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg italic border-b-2 border-black pb-2 mb-4 font-black text-blue-600">STEP 2. 은퇴 목표 설정</h3>
          <div className="space-y-2">
            <InputBox label="은퇴 시점" val={inputs.retireAge} onChange={(v:any)=>setInputs({...inputs, retireAge:v})} unit="세" isYellow />
            <InputBox label="기대 수명" val={inputs.lifeExpectancy} onChange={(v:any)=>setInputs({...inputs, lifeExpectancy:v})} unit="세" isYellow />
            <InputBox label="은퇴 후 희망 월 생활비" val={inputs.targetMonthly} onChange={(v:any)=>setInputs({...inputs, targetMonthly:v})} unit="원" isYellow format={format} />
          </div>
        </div>

        <button onClick={calculate} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-xl italic hover:scale-105 transition-all shadow-xl">분석 시작하기</button>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {results ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResultCard title="총 예상 월 수령액" value={results.currentMonthly} sub="국민연금 + 퇴직연금 추정치" color="bg-emerald-50 text-emerald-700" format={format} />
              <ResultCard title="총 필요 은퇴자금" value={results.totalTarget} sub={`${results.retireYears}년 간의 생활비 총계`} color="bg-blue-50 text-blue-700" format={format} />
            </div>
            <div className="bg-rose-600 text-white p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-rose-200 text-xs uppercase font-black mb-1">분석 결과: 부족 자금 발생</p>
                  <h2 className="text-4xl md:text-5xl italic font-black">부족 금액: {format(results.gap)}원</h2>
                </div>
                <span className="text-5xl">⚠️</span>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                <p className="text-lg mb-2">원하시는 생활 수준을 위해 매월 <span className="text-[#d4af37] text-3xl mx-1 underline">{format(results.monthlyRequired)}원</span>을 추가로 준비해야 합니다.</p>
                <p className="text-sm opacity-70 italic">※ 현재 급여와 근속 기간을 바탕으로 산출된 가이드입니다.</p>
              </div>
            </div>
          </>
        ) : <EmptyResult text="왼쪽 입력창에서 현재 소득과 은퇴 목표를 입력해주세요" />}
      </div>
    </div>
  )
}

/** 4. 복리 계산 (72법칙 포함) **/
function CompoundCalc({ format }: any) {
  const [rule72Rate, setRule72Rate] = useState(6);
  const [inputs, setInputs] = useState({ principal: 50000000, yrs: 10, rate: 3.5 });
  const [results, setResults] = useState<any>(null);

  const calculate = () => {
    const getFinal = (y: number, isCompound: boolean) => {
      if (!isCompound) return inputs.principal + (inputs.principal * (inputs.rate/100) * y) * (1 - 0.154);
      const total = inputs.principal * Math.pow(1 + (inputs.rate/100), y);
      return inputs.principal + (total - inputs.principal) * (1 - 0.154);
    };

    setResults({
      y10: { s: getFinal(inputs.yrs, false), c: getFinal(inputs.yrs, true) },
      y20: { s: getFinal(20, false), c: getFinal(20, true) },
      y30: { s: getFinal(30, false), c: getFinal(30, true) }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* 72의 법칙 (복리 탭 상단으로 이동) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border-4 border-black p-8 rounded-[3rem] shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔢</span>
            <h3 className="text-xl font-black italic text-indigo-600">복리의 원리: 72의 법칙</h3>
          </div>
          <p className="text-sm text-slate-500 font-bold mb-6">자산이 두 배가 되는 시간을 계산해 보세요.</p>
          <InputBox label="목표 연 수익률(%)" val={rule72Rate} onChange={setRule72Rate} unit="%" isYellow />
        </div>
        <div className="bg-indigo-600 text-white p-8 rounded-[3rem] flex flex-col items-center justify-center text-center shadow-xl">
          <p className="text-xs uppercase font-black text-indigo-200 mb-2">원금이 2배가 되는 기간</p>
          <p className="text-6xl font-black italic text-[#d4af37]">{rule72Rate > 0 ? (72 / rule72Rate).toFixed(1) : "0"} <span className="text-2xl font-black">년</span></p>
        </div>
      </div>

      {/* 복리 계산 입력창 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-[2.5rem] border-2 border-black">
        <InputBox label="일시납 원금" val={inputs.principal} onChange={(v:any)=>setInputs({...inputs, principal:v})} unit="원" isYellow format={format} />
        <InputBox label="거치 기간" val={inputs.yrs} onChange={(v:any)=>setInputs({...inputs, yrs:v})} unit="년" isYellow />
        <InputBox label="적용 이율" val={inputs.rate} onChange={(v:any)=>setInputs({...inputs, rate:v})} unit="%" isYellow />
        <button onClick={calculate} className="bg-indigo-600 text-white rounded-2xl font-black italic hover:bg-black transition-all">복리 분석 시작</button>
      </div>

      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-200"><p className="text-xs text-slate-400 mb-4 font-black">{inputs.yrs}년 단리 결과</p><p className="text-3xl italic font-black">{format(results.y10.s)}원</p></div>
          <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl"><p className="text-indigo-200 text-xs mb-4 font-black">{inputs.yrs}년 복리 결과</p><p className="text-4xl italic text-[#d4af37] font-black">{format(results.y10.c)}원</p></div>
        </div>
      )}
    </div>
  )
}

/** 5. 변액보험 전용 (코스트애버리지) **/
function VariableCalc({ format }: any) {
  const [monthlyInvest, setMonthlyInvest] = useState(500000);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white border-4 border-black p-10 rounded-[4rem] shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">📉</span>
          <h3 className="text-2xl font-black italic text-black">코스트 애버리지 시뮬레이션</h3>
        </div>
        <p className="text-sm text-slate-500 font-bold mb-10 italic">하락장에서 더 많은 수량을 확보하여 평균 단가를 낮추는 투자 전략입니다.</p>
        
        <div className="mb-10 max-w-md">
          <InputBox label="매월 적립액 설정" val={monthlyInvest} onChange={setMonthlyInvest} unit="원" isYellow format={format} />
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-end h-64 mb-8 border-b-2 border-slate-100 pb-4">
          <GraphBar label="1회차(고점)" height="h-full" price="1,000원" qty={`${(monthlyInvest/1000).toFixed(0)}좌`} color="bg-slate-200" />
          <GraphBar label="2회차(저점)" height="h-1/2" price="500원" qty={`${(monthlyInvest/500).toFixed(0)}좌`} color="bg-rose-500" highlight />
          <GraphBar label="3회차(회복)" height="h-full" price="1,000원" qty={`${(monthlyInvest/1000).toFixed(0)}좌`} color="bg-indigo-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-10 p-8 bg-amber-50 rounded-[3rem] border-2 border-[#d4af37]">
          <div>
            <p className="text-sm font-black text-slate-600 mb-2 italic">투자 포인트</p>
            <p className="text-lg font-black leading-relaxed">
              주가는 제자리로 돌아왔지만, 저점 매수를 통해 <span className="text-rose-600 underline">수익률은 약 +33%</span>를 기록하게 됩니다. 이것이 변액보험의 시간 관리 힘입니다.
            </p>
          </div>
          <div className="text-center bg-white p-6 rounded-3xl border border-[#d4af37]/30 shadow-inner">
            <p className="text-xs font-black text-slate-400 mb-1">총 확보 수량</p>
            <p className="text-4xl font-black italic text-indigo-600">{(monthlyInvest/1000 + monthlyInvest/500 + monthlyInvest/1000).toFixed(0)} <span className="text-xl">좌</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 2. 보험 vs 은행 비교 **/
function CompareCalc({ format }: any) {
  const [inputs, setInputs] = useState({ monthly: 500000, payY: 5, rateS: 3.5, rateI: 124 });
  const [results, setResults] = useState<any>(null);
  const calculate = () => {
    const totalP = inputs.monthly * inputs.payY * 12;
    const interest = Math.floor((inputs.monthly * (inputs.payY*12) * (inputs.payY*12 + 1) / 2) * (inputs.rateS / 100 / 12));
    const bank = totalP + interest - Math.floor(interest * 0.165);
    const insu = Math.floor(totalP * (inputs.rateI / 100));
    setResults({ bank, insu, diff: insu - bank });
  };
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-white p-6 rounded-[2.5rem] border-2 border-black">
        <InputBox label="월 납입액" val={inputs.monthly} onChange={(v:any)=>setInputs({...inputs, monthly:v})} unit="원" isYellow format={format} />
        <InputBox label="납입기간" val={inputs.payY} onChange={(v:any)=>setInputs({...inputs, payY:v})} unit="년" isYellow />
        <InputBox label="은행 적금이율" val={inputs.rateS} onChange={(v:any)=>setInputs({...inputs, rateS:v})} unit="%" isYellow />
        <InputBox label="보험 환급률" val={inputs.rateI} onChange={(v:any)=>setInputs({...inputs, rateI:v})} unit="%" isYellow />
        <button onClick={calculate} className="bg-black text-[#d4af37] rounded-2xl font-black italic hover:invert transition-all">분석 결과보기</button>
      </div>
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-200"><p className="text-xs text-slate-400 mb-2 uppercase font-black">은행 적금 수령액</p><p className="text-3xl italic font-black">{format(results.bank)}원</p></div>
          <div className="bg-black text-[#d4af37] p-10 rounded-[3rem] shadow-2xl">
            <p className="text-xs text-white/50 mb-2 uppercase font-black">보험 비과세 수령액</p>
            <p className="text-4xl italic mb-4 font-black">{format(results.insu)}원</p>
            <div className="bg-[#d4af37] text-black p-4 rounded-xl text-center font-black">차액: {format(Math.abs(results.diff))}원 {results.diff >= 0 ? '이익' : '부족'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 3. 화폐가치 하락 **/
function InflationCalc({ format }: any) {
  const [inputs, setInputs] = useState({ amt: 100000000, yrs: 20, inf: 3.0 });
  const [result, setResult] = useState<number | null>(null);
  const calculate = () => { setResult(Math.floor(inputs.amt / Math.pow(1 + (inputs.inf / 100), inputs.yrs))); };
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-[2.5rem] border-2 border-black">
        <InputBox label="목표 금액" val={inputs.amt} onChange={(v:any)=>setInputs({...inputs, amt:v})} unit="원" isYellow format={format} />
        <InputBox label="경과 기간" val={inputs.yrs} onChange={(v:any)=>setInputs({...inputs, yrs:v})} unit="년" isYellow />
        <InputBox label="물가상승률" val={inputs.inf} onChange={(v:any)=>setInputs({...inputs, inf:v})} unit="%" isYellow />
        <button onClick={calculate} className="bg-black text-[#d4af37] rounded-2xl font-black italic hover:scale-105 transition-all">가치 확인하기</button>
      </div>
      {result && (
        <div className="bg-rose-50 border-4 border-rose-100 p-12 rounded-[4rem] text-center shadow-inner">
          <p className="text-2xl font-black mb-4 uppercase italic text-rose-400 font-black">화폐 가치 분석 결과</p>
          <p className="text-6xl md:text-8xl italic text-rose-600 font-black">{format(result)}원</p>
          <p className="mt-6 text-rose-400 font-black italic">물가 상승으로 인해 구매력이 급격히 하락했습니다.</p>
        </div>
      )}
    </div>
  )
}

/** 하위 공통 컴포넌트 **/
function TabBtn({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-4 rounded-[1.8rem] text-[11px] md:text-sm font-black transition-all ${active ? 'bg-[#d4af37] text-black shadow-lg' : 'bg-transparent text-white/40 hover:text-white'}`}>
      {label}
    </button>
  )
}

function InputBox({ label, val, onChange, unit, isYellow, format }: any) {
  return (
    <div className={`p-4 rounded-2xl border-2 transition-all font-black ${isYellow ? 'bg-amber-50 border-amber-200 focus-within:border-black' : 'bg-white border-slate-100 text-black'}`}>
      <p className="text-[10px] text-slate-400 uppercase mb-1 font-black">{label}</p>
      <div className="flex items-center gap-1 font-black">
        <input type="number" value={val} onChange={(e) => onChange(Number(e.target.value))} className="bg-transparent w-full text-lg font-black outline-none" />
        <span className="text-[11px] opacity-40">{unit}</span>
      </div>
      {unit === "원" && format && <p className="text-[10px] text-indigo-600 mt-1 italic font-black">{format(val)}원</p>}
    </div>
  )
}

function GraphBar({ label, height, price, qty, color, highlight }: any) {
  return (
    <div className="flex-1 w-full flex flex-col items-center gap-4">
      <div className="flex flex-col items-center w-full">
        <span className={`text-[10px] font-black ${highlight ? 'text-rose-600' : 'text-slate-400'}`}>{qty}</span>
        <div className={`w-full max-w-[80px] ${height} ${color} rounded-t-xl transition-all shadow-md`}></div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
        <p className={`text-sm font-black italic ${highlight && 'text-rose-600'}`}>{price}</p>
      </div>
    </div>
  )
}

function ResultCard({ title, value, sub, color, format }: any) {
  return (
    <div className={`${color} p-8 rounded-[3rem] border-2 border-black shadow-sm flex flex-col justify-between animate-in slide-in-from-right-4`}>
      <div>
        <p className="text-[10px] uppercase mb-1 font-black opacity-60">{title}</p>
        <p className="text-3xl italic font-black">{format(value)}원</p>
      </div>
      <p className="text-[10px] mt-4 opacity-40 font-black">{sub}</p>
    </div>
  )
}

function EmptyResult({ text }: { text: string }) {
  return (
    <div className="col-span-2 border-4 border-dashed border-slate-200 rounded-[3rem] flex items-center justify-center text-slate-300 italic font-black min-h-[400px]">
      {text}
    </div>
  )
}