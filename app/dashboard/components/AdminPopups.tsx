"use client"

import { Bar, Pie, Line } from 'react-chartjs-2'

export default function AdminPopups({ type, onClose }: { type: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] p-10 relative overflow-y-auto max-h-[90vh] shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 text-2xl font-black">✕</button>
        
        {/* 실적 분석 */}
        {type === 'perf' && (
          <div className="space-y-8">
            <h3 className="text-3xl font-black italic uppercase border-b-4 border-black inline-block">Performance Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-slate-50 p-6 rounded-3xl h-[350px]">
                <Bar 
                  data={{ 
                    labels: ['목표 건수', '현재 건수', '목표 금액', '현재 금액'], 
                    datasets: [{ label: '팀 전체 실적', data: [100, 82, 5000, 4100], backgroundColor: ['#eee', '#000', '#eee', '#d4af37'] }] 
                  }} 
                  options={{ maintainAspectRatio: false }} 
                />
              </div>
              <div className="space-y-6 flex flex-col justify-center">
                <StatBox label="전체 달성률" val="82%" sub="지난 달 대비 5% 상승" />
                <StatBox label="팀 평균 실적" val="410 만원" sub="인당 평균 금액" />
              </div>
            </div>
          </div>
        )}

        {/* 활동 Flow */}
        {type === 'act' && (
          <div className="space-y-8">
            <h3 className="text-3xl font-black italic uppercase border-b-4 border-blue-600 inline-block">Activity Flow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-slate-50 p-6 rounded-3xl h-[300px] flex items-center justify-center">
                <Pie data={{ labels: ['정상DB', '반품'], datasets: [{ data: [85, 15], backgroundColor: ['#000', '#ff4d4d'] }] }} />
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl h-[300px]">
                <Line 
                  data={{ 
                    labels: ['CALL', 'MEET', 'PT', 'INTRO'], 
                    datasets: [{ label: '활동 전환율', data: [100, 45, 25, 12], borderColor: '#000', tension: 0.4, fill: true, backgroundColor: 'rgba(0,0,0,0.05)' }] 
                  }} 
                  options={{ maintainAspectRatio: false }} 
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, val, sub }: any) {
  return (
    <div className="p-6 bg-slate-50 rounded-3xl border shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-3xl font-black italic">{val}</p>
      <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">{sub}</p>
    </div>
  )
}