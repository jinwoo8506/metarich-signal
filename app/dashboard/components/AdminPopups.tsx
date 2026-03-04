"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, teamMeta, onClose }: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [curIntro, setCurIntro] = useState(0); // 실제 도입 인원 (수동 입력)
  const [notice, setNotice] = useState("");
  const [eduSchedule, setEduSchedule] = useState(""); // 주차별 교육 일정

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
    alert("팀 관리 데이터가 업데이트되었습니다.");
    onClose();
  };

  const sum = (key: string) => agents.reduce((s: any, a: any) => s + (Number(a.performance?.[key]) || 0), 0);
  const avgContractAmt = sum('contract_cnt') > 0 ? (sum('contract_amt') / sum('contract_cnt')).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black">✕</button>

        {/* 1. 실적 관리 (생산성 지표 추가) */}
        {type === 'perf' && (
          <div className="space-y-8 animate-in fade-in">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Team Productivity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox label="전체 목표금액 대비" cur={sum('contract_amt')} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="전체 목표건수 대비" cur={sum('contract_cnt')} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="전체 도입 진행도" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="text-center md:text-left">
                  <p className="text-[#d4af37] text-xs font-black uppercase tracking-widest">Efficiency Analytics</p>
                  <p className="text-4xl font-black mt-2 italic">1건당 생산성: {avgContractAmt}만원</p>
               </div>
               <div className="bg-white/10 p-6 rounded-3xl border border-white/20">
                  <p className="text-[10px] opacity-60">총 누적 실적: {sum('contract_amt')}만원</p>
                  <p className="text-[10px] opacity-60">총 체결 건수: {sum('contract_cnt')}건</p>
               </div>
            </div>
          </div>
        )}

        {/* 2. 활동 관리 (3단 구성: 통계 / 전환율 / DB반품) */}
        {type === 'act' && (
          <div className="space-y-8 animate-in slide-in-from-top-4">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Activity Funnel</h3>
            
            {/* 상단: 기본 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MiniBox label="총 전화" val={sum('call')} />
              <MiniBox label="총 만남" val={sum('meet')} />
              <MiniBox label="총 제안" val={sum('pt')} />
              <MiniBox label="총 소개" val={sum('intro')} />
            </div>

            {/* 중단: 전환 비율 (전화대비 만남, 만남대비 제안) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 flex justify-between items-center">
                  <p className="text-indigo-900 text-lg uppercase font-black italic">CALL → MEET</p>
                  <p className="text-4xl text-indigo-600 font-black italic">{sum('call') > 0 ? ((sum('meet')/sum('call'))*100).toFixed(1) : 0}%</p>
               </div>
               <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex justify-between items-center">
                  <p className="text-emerald-900 text-lg uppercase font-black italic">MEET → PT</p>
                  <p className="text-4xl text-emerald-600 font-black italic">{sum('meet') > 0 ? ((sum('pt')/sum('meet'))*100).toFixed(1) : 0}%</p>
               </div>
            </div>

            {/* 하단: DB 반품율 */}
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex justify-between items-center">
               <div>
                  <p className="text-rose-400 text-xs font-black uppercase mb-2">DB Return Status</p>
                  <p className="text-4xl font-black italic">반품율: {sum('db_assigned') > 0 ? ((sum('db_returned')/sum('db_assigned'))*100).toFixed(1) : 0}%</p>
               </div>
               <div className="text-right">
                  <p className="text-xs opacity-50 mb-1 font-black uppercase">Count</p>
                  <p className="text-3xl font-black text-white/80">{sum('db_returned')}건 / {sum('db_assigned')}배정</p>
               </div>
            </div>
          </div>
        )}

        {/* 3. 교육 관리 (유지) */}
        {type === 'edu' && (
          <div className="space-y-6">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase font-black">Education Board</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {agents.map((a: any) => (
                <div key={a.id} className="p-5 bg-slate-50 rounded-[2rem] border text-center font-black">
                  <p className="text-xs mb-2">{a.name}</p>
                  <span className={`text-[10px] px-3 py-1 rounded-full text-white ${a.performance?.edu_status === '참여' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    {a.performance?.edu_status || "미입력"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. 목표 설정 (도입 실적 입력 및 공지/교육일정 분리 복구) */}
        {type === 'sys' && (
          <div className="space-y-10 animate-in fade-in">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Master Configuration</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 font-black">
              {/* 왼쪽: 목표 및 실제 실적 수치 */}
              <div className="space-y-6">
                <p className="text-xs text-amber-600 border-b-2 border-amber-200 pb-1 uppercase font-black tracking-widest">Target & Results</p>
                <InputItem label="전체 목표 금액 (만)" val={tarAmt} onChange={setTarAmt} />
                <InputItem label="전체 목표 건수 (건)" val={tarCnt} onChange={setTarCnt} />
                <div className="grid grid-cols-2 gap-4">
                    <InputItem label="도입 목표 (명)" val={tarIntro} onChange={setTarIntro} />
                    <div className="flex flex-col bg-slate-900 text-white p-4 rounded-3xl border border-black shadow-inner">
                        <label className="text-[10px] text-amber-400 mb-1 font-black">실제 도입 인원</label>
                        <input type="number" value={curIntro} onChange={(e)=>setCurIntro(Number(e.target.value))} className="bg-transparent text-2xl font-black outline-none border-b border-white/20 text-center" />
                    </div>
                </div>
              </div>

              {/* 오른쪽: 공지사항 및 교육일정 */}
              <div className="space-y-6 font-black">
                <div className="space-y-2">
                   <p className="text-xs text-slate-400 border-b pb-1 uppercase font-black">📢 Global News (Marquee)</p>
                   <textarea value={notice} onChange={(e) => setNotice(e.target.value)} className="w-full h-24 p-5 bg-slate-50 border-2 border-transparent focus:border-black rounded-[2rem] outline-none text-xs font-black transition-all" placeholder="슬라이딩 공지사항 입력" />
                </div>
                <div className="space-y-2">
                   <p className="text-xs text-slate-400 border-b pb-1 uppercase font-black">📅 Weekly Edu Schedule</p>
                   <textarea value={eduSchedule} onChange={(e) => setEduSchedule(e.target.value)} className="w-full h-36 p-5 bg-slate-100 border-2 border-transparent focus:border-black rounded-[2.5rem] outline-none text-xs font-black transition-all" placeholder="당월 주차별 교육 내용을 상세히 적어주세요." />
                </div>
              </div>
            </div>
            
            <button onClick={saveSettings} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl font-black shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all italic uppercase tracking-tighter">Save & Deploy All Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = tar > 0 ? Math.min((cur / tar) * 100, 100) : 0;
  return (
    <div className="bg-slate-50 p-8 rounded-[3.5rem] border text-center font-black transition-all hover:bg-white hover:shadow-xl">
      <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest">{label}</p>
      <p className="text-2xl">{cur}{unit} / <span className="text-slate-300">{tar}{unit}</span></p>
      <p className={`text-5xl italic my-4 ${color.replace('bg-', 'text-')}`}>{pct.toFixed(1)}%</p>
      <div className="w-full h-3 bg-white rounded-full overflow-hidden border">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniBox({ label, val }: any) { 
  return (
    <div className="bg-slate-50 p-7 rounded-[2.5rem] border text-center font-black hover:scale-105 transition-all">
      <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-tighter">{label}</p>
      <p className="text-3xl italic">{val}</p>
    </div>
  );
}

function InputItem({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-5 rounded-[2rem] border font-black transition-all hover:border-black">
      <label className="text-xs uppercase">{label}</label>
      <input type="number" value={val} onChange={(e) => onChange(Number(e.target.value))} className="w-24 p-2 bg-white border-2 border-slate-100 rounded-xl text-center outline-none focus:border-black font-black" />
    </div>
  );
}