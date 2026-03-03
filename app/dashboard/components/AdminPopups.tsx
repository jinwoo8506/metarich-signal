"use client"

import { Bar } from 'react-chartjs-2'

export default function AdminPopups({ type, agents, onClose }: { type: string, agents: any[], onClose: () => void }) {
  const totalAmt = agents.reduce((sum, a) => sum + (a.performance?.contract_amt || 0), 0);
  const totalTarAmt = agents.reduce((sum, a) => sum + (a.performance?.target_amt || 0), 0);
  const totalCall = agents.reduce((sum, a) => sum + (a.performance?.call || 0), 0);
  const totalMeet = agents.reduce((sum, a) => sum + (a.performance?.meet || 0), 0);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>
        
        {/* 1. 실적 관리 */}
        {type === 'perf' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl font-black italic uppercase border-b-8 border-black inline-block">Team Performance</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="총 계약 금액" val={`${totalAmt.toLocaleString()} 만원`} sub={`목표 ${totalTarAmt.toLocaleString()}만 대비 ${(totalAmt/totalTarAmt*100).toFixed(1)}%`} />
              <StatCard label="총 계약 건수" val={`${agents.reduce((sum,a)=>sum+a.performance.contract_cnt, 0)} 건`} sub="팀 전체 합계" />
              <StatCard label="신규 도입" val={`${agents.reduce((sum,a)=>sum+a.performance.intro, 0)} 명`} sub="조직 확장 지표" />
            </div>
          </div>
        )}

        {/* 2. 활동 관리 */}
        {type === 'act' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl font-black italic uppercase border-b-8 border-blue-600 inline-block">Activity Analysis</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <div className="p-8 bg-blue-50 rounded-[3rem] border border-blue-100">
                    <p className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest">전환율 (CALL → MEET)</p>
                    <p className="text-5xl font-black italic">{((totalMeet/totalCall)*100 || 0).toFixed(1)}%</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <StatCard label="DB 총 배정" val={agents.reduce((sum,a)=>sum+a.performance.db_assigned, 0)} sub="Total Assigned" />
                    <StatCard label="DB 총 반품" val={agents.reduce((sum,a)=>sum+a.performance.db_returned, 0)} sub="Return Rate" color="text-rose-600" />
                 </div>
              </div>
              <div className="bg-slate-50 p-8 rounded-[3rem] flex items-center justify-center border italic font-black text-slate-300">
                차트 로딩 중... (Chart.js 연동)
              </div>
            </div>
          </div>
        )}

        {/* 3. 교육 관리 */}
        {type === 'edu' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl font-black italic uppercase border-b-8 border-indigo-600 inline-block">Education Tracking</h3></header>
            <div className="grid grid-cols-1 gap-6">
               <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] flex justify-between items-center">
                  <div>
                    <p className="text-[#d4af37] font-black uppercase text-[10px] tracking-[0.2em] mb-2">Current Status</p>
                    <p className="text-2xl font-black italic">이번 주 교육 이수 현황</p>
                  </div>
                  <p className="text-5xl font-black text-[#d4af37]">{agents.filter(a=>a.performance.edu_status === '참여').length} <span className="text-xl text-white">/ {agents.length} 명</span></p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map(a => (
                    <div key={a.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border">
                        <span className="font-black">{a.name} CA</span>
                        <span className={`font-black text-xs px-4 py-2 rounded-full ${a.performance.edu_status === '참여' ? 'bg-indigo-600 text-white' : 'bg-rose-100 text-rose-600'}`}>
                            {a.performance.edu_status}
                        </span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* 4. 시스템 설정 */}
        {type === 'sys' && (
          <div className="space-y-10">
            <header><h3 className="text-4xl font-black italic uppercase border-b-8 border-slate-300 inline-block">System Config</h3></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <p className="font-black text-xs uppercase text-slate-400">Main Project Title (상단 공지)</p>
                    <input className="w-full p-6 bg-slate-50 border-2 border-black rounded-[2rem] font-bold outline-none" placeholder="프로젝트 제목 입력..." />
                </div>
                <div className="space-y-4">
                    <p className="font-black text-xs uppercase text-slate-400">Target Reset (팀 전체 목표)</p>
                    <div className="flex gap-4">
                        <input className="flex-1 p-6 bg-slate-50 border rounded-[2rem] font-bold" placeholder="금액 목표" />
                        <button className="bg-black text-white px-10 rounded-[2rem] font-black uppercase italic">Set</button>
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, val, sub, color }: any) {
  return (
    <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-sm transition-hover hover:border-black">
      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{label}</p>
      <p className={`text-3xl font-black italic ${color || 'text-black'}`}>{val}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{sub}</p>
    </div>
  )
}