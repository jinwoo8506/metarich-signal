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

/** 1. 은퇴자금 및 통합 연금 계산기 (기존 유지) **/
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

  useEffect(() => {
    const nationalRate = (inputs.workYears * 0.01); 
    const estNational = inputs.monthlySalary * nationalRate;
    const totalSeverancePay = inputs.monthlySalary * inputs.workYears;
    const survivalMonths = (inputs.lifeExpectancy - inputs.retireAge) * 12;
    const estCompany = survivalMonths > 0 ? totalSeverancePay / survivalMonths : 0;
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
          <h3 className="text-lg italic border-b-2 border-black pb-2 mb-4 font-black text-emerald-600">STEP 1. 소득 및 근속 기반 연금 추정</h3>
          <div className="space-y-2">
            <InputBox label="현재 나이" val={inputs.age} onChange={(v:any)=>setInputs({...inputs, age:v})} unit="세" isYellow />
            <InputBox label="예상 총 근속 기간" val={inputs.workYears} onChange={(v:any)=>setInputs({...inputs, workYears:v})} unit="년" isYellow />
            <InputBox label="현재 평균 월급여" val={inputs.monthlySalary} onChange={(v:any)=>setInputs({...inputs, monthlySalary:v})} unit="원" isYellow format={format} />
          </div>
          <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] text-emerald-600 font-black">산출된 예상 월 연금액</p>
            <p className="text-sm font-black">국민(추정): {format(pensionEstimates.national)}원</p>
            <p className="text-sm font-black">퇴직(DB형): {format(pensionEstimates.company)}원</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg italic border-b-2 border-black pb-2 mb-4 font-black text-blue-600">STEP 2. 은퇴 목표 설정</h3>
          <div className="space-y-2">
            <InputBox label="은퇴 나이" val={inputs.retireAge} onChange={(v:any)=>setInputs({...inputs, retireAge:v})} unit="세" isYellow />
            <InputBox label="기대 수명" val={inputs.lifeExpectancy} onChange={(v:any)=>setInputs({...inputs, lifeExpectancy:v})} unit="세" isYellow />
            <InputBox label="은퇴 후 희망 월 생활비" val={inputs.targetMonthly} onChange={(v:any)=>setInputs({...inputs, targetMonthly:v})} unit="원" isYellow format={format} />
          </div>
        </div>
        <button onClick={calculate} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-xl italic hover:scale-105 transition-all shadow-xl">부족 자금 분석하기</button>
      </div>
      <div className="lg:col-span-2 space-y-6">
        {results ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResultCard title="총 예상 월 수령액" value={results.currentMonthly} sub="국민연금 + 퇴직연금 합산액" color="bg-emerald-50 text-emerald-700" format={format} />
              <ResultCard title="은퇴 후 총 필요 자금" value={results.totalTarget} sub={`${results.retireYears}년 간 생활비 총액`} color="bg-blue-50 text-blue-700" format={format} />
            </div>
            <div className="bg-rose-600 text-white p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-rose-200 text-xs uppercase font-black mb-1">최종 분석 결과</p>
                  <h2 className="text-4xl md:text-5xl italic font-black">부족 금액: {format(results.gap)}원</h2>
                </div>
                <span className="text-5xl">⚠️</span>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                <p className="text-lg mb-2">목표 생활 유지를 위해 매월 <span className="text-[#d4af37] text-3xl mx-1 underline">{format(results.monthlyRequired)}원</span>을 추가 저축해야 합니다.</p>
                <p className="text-sm opacity-70 italic font-medium">※ 퇴직연금은 은퇴 시점 일시금을 생존 기간으로 나눈 월 수령액 기준입니다.</p>
              </div>
            </div>
          </>
        ) : <EmptyResult text="왼쪽에서 근속 정보와 은퇴 목표를 입력해 주세요." />}
      </div>
    </div>
  )
}

/** 4. 복리 마법 계산기 (72법칙 통합) **/
function CompoundCalc({ format }: any) {
  const [rule72Rate, setRule72Rate] = useState(6); // 72법칙용 상태
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
      {/* 🟢 업데이트: 변액보험 탭에 있던 72법칙을 상단으로 이동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-white rounded-[3rem] border-2 border-black shadow-lg">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔢</span>
            <h3 className="text-xl font-black italic text-indigo-600">복리의 기초: 72의 법칙</h3>
          </div>
          <p className="text-sm text-slate-500 font-bold mb-6LEADING-RELAXED">
            자산이 <span className="text-black underline">두 배(2x)</span>가 되는 데 걸리는 시간을 계산합니다. 복리 투자의 중요성을 가장 직관적으로 보여주는 법칙입니다.
          </p>
          <div className="max-w-xs">
            <InputBox label="목표 연 수익률(%)" val={rule72Rate} onChange={setRule72Rate} unit="%" isYellow />
          </div>
        </div>
        <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-inner">
          <p className="text-xs uppercase font-black text-indigo-200 mb-2">원금이 2배가 되는 기간</p>
          <p className="text-7xl font-black italic text-[#d4af37]">
            {rule72Rate > 0 ? (72 / rule72Rate).toFixed(1) : "0"} <span className="text-2xl font-black text-white">년</span>
          </p>
          <p className="mt-4 text-xs text-indigo-100 font-medium italic">"복리는 세계 8대 불가사의다." - 아인슈타인</p>
        </div>
      </div>

      {/* 기존 복리 계산 입력창 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-[2.5rem] border-2 border-black">
        <InputBox label="일시납 원금" val={inputs.principal} onChange={(v:any)=>setInputs({...inputs, principal:v})} unit="원" isYellow format={format} />
        <InputBox label="거치 기간" val={inputs.yrs} onChange={(v:any)=>setInputs({...inputs, yrs:v})} unit="년" isYellow />
        <InputBox label="적용 이율(연)" val={inputs.rate} onChange={(v:any)=>setInputs({...inputs, rate:v})} unit="%" isYellow />
        <button onClick={calculate} className="bg-indigo-600 text-white rounded-2xl font-black italic hover:bg-black transition-all">복리 시뮬레이션</button>
      </div>

      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-200"><p className="text-xs text-slate-400 mb-4 font-black">{inputs.yrs}년 단리 결과(세후)</p><p className="text-3xl italic font-black">{format(results.y10.s)}원</p></div>
          <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl"><p className="text-indigo-200 text-xs mb-4 font-black">{inputs.yrs}년 복리 결과(세후)</p><p className="text-4xl italic text-[#d4af37] font-black">{format(results.y10.c)}원</p></div>
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
      {/* 🟢 업데이트: 이미지의 개념을 바 차트로 시각화 (빈칸 해결) */}
      <div className="bg-white border-4 border-black p-10 rounded-[4rem] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">📉</span>
          <h3 className="text-2xl font-black italic text-black">코스트 애버리지(평균 매입단가 인하) 효과</h3>
        </div>
        <p className="text-sm text-slate-500 font-bold mb-12Leading-relaxed max-w-2xl italic">
          제공해주신 이미지처럼, 주가가 변동할 때 매월 일정한 금액을 투자하면 주가가 클 때는 적은 수량을, 주가가 낮을 때는 많은 수량을 자동으로 매입하게 되어 평균 매입단가가 낮아집니다.
        </p>
        
        <div className="mb-12 max-w-sm">
          <InputBox label="매월 적립액 설정" val={monthlyInvest} onChange={setMonthlyInvest} unit="원" isYellow format={format} />
        </div>

        {/* 시각화 그래프 영역: 이미지의 S자 곡선 개념을 3단계 바 차트로 표현 */}
        <div className="flex flex-col md:flex-row gap-8 items-end h-72 mb-10 border-b-2 border-slate-100 pb-6">
          {/* 1단계: 기준 주가 */}
          <GraphBar 
            label="1회차 투자" 
            height="h-3/4" 
            price="1,000원 (기준)" 
            qty={`${(monthlyInvest / 1000).toFixed(0)}좌`} 
            color="bg-slate-300" 
            desc="일반적인 매입"
          />
          {/* 2단계: 주가 상승시 (이미지의 고점 개념) */}
          <GraphBar 
            label="2회차 투자" 
            height="h-full" 
            price="1,500원 (상승)" 
            qty={`${(monthlyInvest / 1500).toFixed(0)}좌`} 
            color="bg-rose-400" 
            desc="적은 수량 매입"
            highlightRose
          />
          {/* 3단계: 주가 하락시 (이미지의 저점 개념) */}
          <GraphBar 
            label="3회차 투자" 
            height="h-1/2" 
            price="500원 (하락)" 
            qty={`${(monthlyInvest / 500).toFixed(0)}좌`} 
            color="bg-indigo-500" 
            desc="많은 수량 매입!"
            highlightIndigo
          />
        </div>

        {/* 분석 결과 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-12 p-8 bg-amber-50 rounded-[3rem] border-2 border-[#d4af37]">
          <div>
            <p className="text-sm font-black text-slate-600 mb-2 italic">변액보험 핵심 투자 포인트</p>
            <p className="text-xl font-black leading-relaxed">
              펀드 가격이 하락했을 때(500원), 월 납입액으로 <span className="text-indigo-600 underline">2배 많은 수량</span>을 확보했습니다. 이후 주가가 회복되면 수익률은 극대화됩니다.
            </p>
          </div>
          <div className="text-center bg-white p-6 rounded-3xl border border-[#d4af37]/30 shadow-inner flex flex-col justify-center h-full">
            <p className="text-xs font-black text-slate-400 mb-1">총 확보 수량 (시뮬레이션)</p>
            <p className="text-5xl font-black italic text-indigo-600">
              {((monthlyInvest/1000) + (monthlyInvest/1500) + (monthlyInvest/500)).toFixed(0)} <span className="text-xl font-black text-slate-400">좌</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 시각화용 하위 컴포넌트 **/
function GraphBar({ label, height, price, qty, color, desc, highlightRose, highlightIndigo }: any) {
  return (
    <div className="flex-1 w-full flex flex-col items-center gap-3 group">
      <div className={`text-center p-3 rounded-xl border ${highlightRose ? 'bg-rose-50 border-rose-100' : highlightIndigo ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
        <p className={`text-[10px] font-black ${highlightRose ? 'text-rose-600' : highlightIndigo ? 'text-indigo-600' : 'text-slate-400'}`}>{qty} 확보</p>
        <p className={`text-xs font-black ${highlightRose ? 'text-rose-700' : highlightIndigo ? 'text-indigo-700' : 'text-slate-500'}`}>{desc}</p>
      </div>
      <div className="flex flex-col items-center w-full relative">
        <div className={`w-full max-w-[100px] ${height} ${color} rounded-t-xl transition-all shadow-md group-hover:scale-105 origin-bottom`}></div>
        {/* 주가 표시 라벨 */}
        <div className="absolute bottom-full mb-2 bg-black text-white px-3 py-1 rounded-full text-xs font-black italic shadow-lg">
          {price}
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{label}</p>
    </div>
  )
}

/** 2. 보험 vs 은행 비교 (기존 유지) **/
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

/** 3. 화폐가치 하락 (기존 유지) **/
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