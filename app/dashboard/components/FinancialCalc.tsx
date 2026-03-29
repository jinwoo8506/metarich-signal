"use client"

import React, { useState } from "react"

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
          <h1 className="text-3xl md:text-4xl italic uppercase tracking-tighter text-black">Financial Analysis Tool</h1>
        </div>
        <p className="text-slate-400 text-sm ml-6 italic font-black uppercase">Expert Consulting System</p>
      </div>

      {/* 메인 탭 메뉴 */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-wrap bg-black p-2 rounded-[2.5rem] gap-2 shadow-2xl">
        <TabBtn label="통합 연금/세금" active={activeTab === 'pension'} onClick={() => setActiveTab('pension')} />
        <TabBtn label="보험 vs 은행 비교" active={activeTab === 'compare'} onClick={() => setActiveTab('compare')} />
        <TabBtn label="화폐가치 하락" active={activeTab === 'inflation'} onClick={() => setActiveTab('inflation')} />
        <TabBtn label="복리 마법" active={activeTab === 'compound'} onClick={() => setActiveTab('compound')} />
      </div>

      {/* 컨텐츠 영역 */}
      <div className="max-w-7xl mx-auto bg-slate-50 rounded-[4rem] border-4 border-black p-6 md:p-12 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        {activeTab === 'pension' && <PensionCalc format={formatNum} />}
        {activeTab === 'compare' && <CompareCalc format={formatNum} />}
        {activeTab === 'inflation' && <InflationCalc format={formatNum} />}
        {activeTab === 'compound' && <CompoundCalc format={formatNum} />}
      </div>
    </div>
  )
}

/** 1. 통합 연금 및 세금 계산기 (버튼형) **/
function PensionCalc({ format }: any) {
  const [inputs, setInputs] = useState({ age: 35, joinYears: 15, income: 3500000 });
  const [results, setResults] = useState<any>(null);

  const calculate = () => {
    const np = Math.floor((Math.min(inputs.income, 6200000) * 0.22) * (inputs.joinYears / 10));
    const rp = inputs.income * inputs.joinYears;
    const annual = inputs.income * 12;
    let tax = annual <= 14000000 ? annual * 0.06 : annual <= 50000000 ? 840000 + (annual - 14000000) * 0.15 : 6240000 + (annual - 50000000) * 0.24;
    setResults({ np, rp, tax: Math.floor(tax/12) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
      <div className="space-y-6 bg-white p-8 rounded-[3rem] border-2 border-black flex flex-col justify-between">
        <div className="space-y-4">
          <h3 className="text-xl italic border-b-2 border-black pb-2 mb-4 font-black">INPUT DATA</h3>
          <InputBox label="현재 나이" val={inputs.age} onChange={(v:any)=>setInputs({...inputs, age:v})} unit="세" isYellow />
          <InputBox label="근속/가입 기간" val={inputs.joinYears} onChange={(v:any)=>setInputs({...inputs, joinYears:v})} unit="년" isYellow />
          <InputBox label="월 평균 소득" val={inputs.income} onChange={(v:any)=>setInputs({...inputs, income:v})} unit="원" isYellow format={format} />
        </div>
        <button onClick={calculate} className="w-full bg-black text-[#d4af37] py-6 rounded-3xl font-black text-xl italic hover:scale-105 transition-all mt-6 shadow-xl">RUN CALCULATION</button>
      </div>
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        {results ? (
          <>
            <ResultCard title="국민연금 예상 수령액" value={results.np} sub="65세 수령 시작 기준" color="bg-blue-50" format={format} />
            <ResultCard title="퇴직연금 예상액" value={results.rp} sub="현재 퇴직 시 법정 퇴직금" color="bg-emerald-50" format={format} />
            <ResultCard title="월 예상 소득세" value={results.tax} sub="기본공제 적용 시" color="bg-rose-50" format={format} />
            <div className="bg-black text-[#d4af37] p-8 rounded-[3rem] flex flex-col justify-center italic">
              <p className="text-xs uppercase opacity-50 mb-2 font-black">Advisory Note</p>
              <p className="text-lg">노후 소득 대체율을 고려할 때 연금 자산의 추가 확보가 시급합니다.</p>
            </div>
          </>
        ) : <EmptyResult text="데이터 입력 후 버튼을 눌러주세요" />}
      </div>
    </div>
  )
}

/** 2. 보험 vs 은행 비교 (버튼형) **/
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
        <button onClick={calculate} className="bg-black text-[#d4af37] rounded-2xl font-black italic text-sm hover:invert transition-all uppercase">Analyze</button>
      </div>
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-200">
            <p className="text-xs text-slate-400 mb-2 uppercase">Bank Final</p>
            <p className="text-3xl italic">{format(results.bank)}원</p>
          </div>
          <div className="bg-black text-[#d4af37] p-10 rounded-[3rem] shadow-2xl">
            <p className="text-xs text-white/50 mb-2 uppercase">Insurance Final</p>
            <p className="text-4xl italic mb-4">{format(results.insu)}원</p>
            <div className="bg-[#d4af37] text-black p-4 rounded-xl text-center font-black italic">
              수익 차액: {format(Math.abs(results.diff))}원 {results.diff >= 0 ? '이익' : '부족'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 3. 화폐가치 하락 (버튼형) **/
function InflationCalc({ format }: any) {
  const [inputs, setInputs] = useState({ amt: 100000000, yrs: 20, inf: 3.0 });
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    setResult(Math.floor(inputs.amt / Math.pow(1 + (inputs.inf / 100), inputs.yrs)));
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-[2.5rem] border-2 border-black">
        <InputBox label="목표 금액" val={inputs.amt} onChange={(v:any)=>setInputs({...inputs, amt:v})} unit="원" isYellow format={format} />
        <InputBox label="경과 기간" val={inputs.yrs} onChange={(v:any)=>setInputs({...inputs, yrs:v})} unit="년" isYellow />
        <InputBox label="물가상승률" val={inputs.inf} onChange={(v:any)=>setInputs({...inputs, inf:v})} unit="%" isYellow />
        <button onClick={calculate} className="bg-black text-[#d4af37] rounded-2xl font-black italic hover:scale-105 transition-all">CHECK VALUE</button>
      </div>
      {result && (
        <div className="bg-rose-50 border-4 border-rose-100 p-12 rounded-[4rem] text-center shadow-inner">
          <p className="text-2xl font-black mb-4 uppercase italic text-rose-400">Buying Power Results</p>
          <p className="text-6xl md:text-8xl italic text-rose-600 font-black">{format(result)}원</p>
          <p className="mt-6 text-rose-400 font-black italic">물가 상승으로 인해 화폐 가치가 급격히 하락했습니다.</p>
        </div>
      )}
    </div>
  )
}

/** 4. 복리 계산 (버튼형) **/
function CompoundCalc({ format }: any) {
  const [inputs, setInputs] = useState({ principal: 50000000, yrs: 10, rate: 3.5 });
  const [results, setResults] = useState<any>(null);

  const calculate = () => {
    const sFinal = Math.floor(inputs.principal + (inputs.principal * (inputs.rate/100) * inputs.yrs) * (1 - 0.165));
    const cTotal = inputs.principal * Math.pow(1 + (inputs.rate/100), inputs.yrs);
    const cFinal = Math.floor(inputs.principal + (cTotal - inputs.principal) * (1 - 0.165));
    setResults({ sFinal, cFinal, diff: cFinal - sFinal });
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-[2.5rem] border-2 border-black">
        <InputBox label="일시납 원금" val={inputs.principal} onChange={(v:any)=>setInputs({...inputs, principal:v})} unit="원" isYellow format={format} />
        <InputBox label="거치 기간" val={inputs.yrs} onChange={(v:any)=>setInputs({...inputs, yrs:v})} unit="년" isYellow />
        <InputBox label="적용 이율" val={inputs.rate} onChange={(v:any)=>setInputs({...inputs, rate:v})} unit="%" isYellow />
        <button onClick={calculate} className="bg-indigo-600 text-white rounded-2xl font-black italic hover:bg-black transition-all">COMPOUND IT</button>
      </div>
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 mb-4 uppercase font-black">Simple (단리)</p>
            <p className="text-3xl italic">{format(results.sFinal)}원</p>
          </div>
          <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl">
            <p className="text-indigo-200 text-xs mb-4 uppercase font-black">Compound (복리)</p>
            <p className="text-4xl italic text-[#d4af37] font-black">{format(results.cFinal)}원</p>
            <p className="mt-4 pt-4 border-t border-indigo-400 text-right text-sm">복리 효과: +{format(results.diff)}원</p>
          </div>
        </div>
      )}
    </div>
  )
}

/** 하위 컴포넌트 **/

function TabBtn({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-4 rounded-[1.8rem] text-[11px] md:text-sm font-black transition-all ${active ? 'bg-[#d4af37] text-black shadow-lg' : 'bg-transparent text-white/40 hover:text-white'}`}>
      {label}
    </button>
  )
}

function InputBox({ label, val, onChange, unit, isYellow, format }: any) {
  return (
    <div className={`p-4 rounded-2xl border-2 transition-all font-black ${isYellow ? 'bg-amber-50 border-amber-200 focus-within:border-black' : 'bg-white border-slate-100'}`}>
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
    <div className="col-span-2 border-4 border-dashed border-slate-200 rounded-[3rem] flex items-center justify-center text-slate-300 italic font-black">
      {text}
    </div>
  )
}