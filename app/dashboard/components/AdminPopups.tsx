"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [curIntro, setCurIntro] = useState(0); 
  const [notice, setNotice] = useState("");
  const [eduSchedule, setEduSchedule] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from("team_settings").select("*");
      if (data) {
        setNotice(data.find(s => s.key === 'global_notice')?.value || "");
        setEduSchedule(data.find(s => s.key === 'edu_schedule')?.value || "");
        setCurIntro(Number(data.find(s => s.key === 'actual_intro_cnt')?.value || 0));
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async () => {
    const settings = [
        { key: 'team_target_amt', value: String(tarAmt) },
        { key: 'team_target_cnt', value: String(tarCnt) },
        { key: 'team_target_intro', value: String(tarIntro) },
        { key: 'actual_intro_cnt', value: String(curIntro) },
        { key: 'global_notice', value: notice },
        { key: 'edu_schedule', value: eduSchedule }
    ];
    await supabase.from("team_settings").upsert(settings);
    alert("팀 운영 지침이 성공적으로 반영되었습니다.");
    onClose();
  };

  // 공통 집계 함수
  const sum = (key: string) => agents.reduce((s: any, a: any) => s + (Number(a.performance?.[key]) || 0), 0);
  
  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl font-black">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black hover:rotate-90 transition-all">✕</button>

        {/* 1. 실적 관리 탭 */}
        {type === 'perf' && (
          <div className="space-y-8 animate-in fade-in font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Performance Dashboard</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black font-black">
              <StatBox label="팀 매출 목표 진행률" cur={sum('contract_amt')} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="팀 건수 목표 진행률" cur={sum('contract_cnt')} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="팀 도입 목표 진행률" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex justify-between items-center font-black">
               <div className="font-black font-black">
                  <p className="text-[#d4af37] text-xs font-black uppercase tracking-widest font-black">Efficiency Report</p>
                  <p className="text-4xl font-black mt-2 italic font-black">팀 평균 생산성: {sum('contract_cnt') > 0 ? (sum('contract_amt') / sum('contract_cnt')).toFixed(1) : 0}만원</p>
               </div>
            </div>
          </div>
        )}

        {/* 2. 활동 관리 탭 (수정됨) */}
        {type === 'act' && (
          <div className="space-y-8 animate-in slide-in-from-top-4 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Activity Funnel</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-black">
              <MiniBox label="TOTAL CALL" val={sum('call')} />
              <MiniBox label="TOTAL MEET" val={sum('meet')} />
              <MiniBox label="TOTAL PT" val={sum('pt')} />
              <MiniBox label="TOTAL INTRO" val={sum('intro')} />
            </div>
            <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 font-black font-black">
                <p className="text-center text-slate-400 text-xs uppercase tracking-[0.3em] mb-8 font-black font-black">Conversion Analysis</p>
                <div className="flex flex-col md:flex-row items-center justify-around gap-8 font-black">
                    <div className="text-center font-black">
                        <p className="text-4xl font-black italic text-indigo-600">{sum('call') > 0 ? ((sum('meet')/sum('call'))*100).toFixed(1) : 0}%</p>
                        <p className="text-[10px] mt-2 font-black">전화 → 만남</p>
                    </div>
                    <div className="text-slate-300 text-4xl hidden md:block">→</div>
                    <div className="text-center font-black">
                        <p className="text-4xl font-black italic text-emerald-600">{sum('meet') > 0 ? ((sum('pt')/sum('meet'))*100).toFixed(1) : 0}%</p>
                        <p className="text-[10px] mt-2 font-black">만남 → 제안</p>
                    </div>
                    <div className="text-slate-300 text-4xl hidden md:block">→</div>
                    <div className="text-center font-black">
                        <p className="text-4xl font-black italic text-amber-600">{sum('pt') > 0 ? ((sum('contract_cnt')/sum('pt'))*100).toFixed(1) : 0}%</p>
                        <p className="text-[10px] mt-2 font-black">제안 → 체결</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* 3. 교육 관리 탭 (수정됨) */}
        {type === 'edu' && (
          <div className="space-y-8 animate-in fade-in font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Education Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-black font-black">
                <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] text-center font-black">
                    <p className="text-[10px] opacity-70 uppercase font-black">참여 인원</p>
                    <p className="text-5xl font-black italic mt-2">{agents.filter((a:any)=>a.performance?.edu_status === '참여').length}명</p>
                </div>
                <div className="bg-slate-100 p-8 rounded-[2.5rem] text-center font-black">
                    <p className="text-[10px] opacity-70 uppercase font-black">미참여/불참</p>
                    <p className="text-5xl font-black italic mt-2 text-slate-400">{agents.filter((a:any)=>a.performance?.edu_status !== '참여').length}명</p>
                </div>
            </div>
            <div className="bg-white border rounded-[3rem] overflow-hidden font-black">
                <table className="w-full text-left font-black font-black">
                    <thead className="bg-slate-900 text-[#d4af37] text-[10px] uppercase font-black font-black">
                        <tr>
                            <th className="p-5 font-black">CA Name</th>
                            <th className="p-5 font-black">Status</th>
                            <th className="p-5 font-black">Last Update</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y font-black">
                        {agents.map((a:any) => (
                            <tr key={a.id} className="hover:bg-slate-50 font-black">
                                <td className="p-5 font-black">{a.name}</td>
                                <td className="p-5 font-black font-black">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${a.performance?.edu_status === '참여' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {a.performance?.edu_status || '미입력'}
                                    </span>
                                </td>
                                <td className="p-5 text-slate-400 text-[10px] font-black">{a.performance?.updated_at ? new Date(a.performance.updated_at).toLocaleDateString() : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* 4. 지침 설정 탭 (영업도구 포함) */}
        {type === 'sys' && (
          <div className="space-y-10 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">System Management</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 font-black">
              <div className="space-y-6 font-black font-black">
                <InputItem label="팀 전체 목표 금액 (만원)" val={tarAmt} onChange={setTarAmt} />
                <InputItem label="팀 전체 목표 건수 (건)" val={tarCnt} onChange={setTarCnt} />
                <InputItem label="팀 전체 도입 목표 (명)" val={tarIntro} onChange={setTarIntro} />
                <InputItem label="도입 실제 확정 인원" val={curIntro} onChange={setCurIntro} />
              </div>
              <div className="space-y-6 font-black">
                <div className="space-y-2 font-black font-black">
                   <p className="text-xs text-slate-400 border-b pb-1 uppercase font-black">📢 전사 공지사항</p>
                   <textarea value={notice} onChange={(e) => setNotice(e.target.value)} className="w-full h-24 p-5 bg-slate-50 border-2 border-transparent focus:border-black rounded-[2rem] outline-none text-xs font-black transition-all" />
                </div>
                <div className="space-y-2 font-black font-black">
                   <p className="text-xs text-slate-400 border-b pb-1 uppercase font-black">📅 이번 달 교육 스케줄</p>
                   <textarea value={eduSchedule} onChange={(e) => setEduSchedule(e.target.value)} className="w-full h-36 p-5 bg-slate-100 border-2 border-transparent focus:border-black rounded-[2.5rem] outline-none text-xs font-black transition-all" />
                </div>
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl font-black shadow-2xl active:scale-[0.98] transition-all italic uppercase font-black tracking-tighter">Save All Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

// 팝업 내부 컴포넌트들
function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = tar > 0 ? Math.min((cur / tar) * 100, 100) : 0;
  return (
    <div className="bg-slate-50 p-8 rounded-[3.5rem] border text-center font-black transition-all hover:bg-white hover:shadow-xl font-black">
      <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-black">{label}</p>
      <p className="text-2xl font-black">{cur}{unit} / {tar}{unit}</p>
      <p className={`text-5xl italic my-4 font-black ${color.replace('bg-', 'text-')}`}>{pct.toFixed(1)}%</p>
      <div className="w-full h-3 bg-white rounded-full overflow-hidden border">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
function MiniBox({ label, val }: any) { return <div className="bg-slate-50 p-7 rounded-[2.5rem] border text-center font-black transition-all shadow-sm font-black"><p className="text-[10px] text-slate-400 mb-1 uppercase font-black">{label}</p><p className="text-3xl italic font-black">{val}</p></div> }
function InputItem({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-5 rounded-[2rem] border font-black transition-all hover:border-black font-black font-black"><label className="text-xs uppercase font-black">{label}</label><input type="number" value={val} onChange={(e) => onChange(Number(e.target.value))} className="w-24 p-2 bg-white border-2 border-slate-100 rounded-xl text-center outline-none focus:border-black font-black font-black" /></div> }