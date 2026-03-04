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
    alert("지침이 배포되었습니다.");
    onClose();
  };

  const sum = (key: string) => agents.reduce((s: any, a: any) => s + (Number(a.performance?.[key]) || 0), 0);
  const avgAmt = sum('contract_cnt') > 0 ? (sum('contract_amt') / sum('contract_cnt')).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl font-black">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black hover:rotate-90 transition-all font-black">✕</button>

        {type === 'perf' && (
          <div className="space-y-8 animate-in fade-in font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Monthly Team Stat</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black">
              <StatBox label="전체 목표금액 대비" cur={sum('contract_amt')} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="전체 목표건수 대비" cur={sum('contract_cnt')} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 실제 진행도" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex justify-between items-center shadow-2xl font-black font-black">
               <div className="font-black">
                  <p className="text-[#d4af37] text-xs font-black uppercase tracking-widest font-black">Efficiency Report</p>
                  <p className="text-4xl font-black mt-2 italic font-black">건당 평균 생산성: {avgAmt}만원</p>
               </div>
            </div>
          </div>
        )}

        {type === 'act' && (
          <div className="space-y-8 animate-in slide-in-from-top-4 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Monthly Funnel</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-black">
              <MiniBox label="누적 전화" val={sum('call')} />
              <MiniBox label="누적 만남" val={sum('meet')} />
              <MiniBox label="누적 제안" val={sum('pt')} />
              <MiniBox label="누적 소개" val={sum('intro')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-black">
               <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 flex justify-between items-center font-black">
                  <p className="text-indigo-900 text-lg uppercase font-black italic">CALL → MEET</p>
                  <p className="text-4xl text-indigo-600 font-black italic">{sum('call') > 0 ? ((sum('meet')/sum('call'))*100).toFixed(1) : 0}%</p>
               </div>
               <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex justify-between items-center font-black">
                  <p className="text-emerald-900 text-lg uppercase font-black italic">MEET → PT</p>
                  <p className="text-4xl text-emerald-600 font-black italic">{sum('meet') > 0 ? ((sum('pt')/sum('meet'))*100).toFixed(1) : 0}%</p>
               </div>
            </div>
          </div>
        )}

        {type === 'edu' && (
          <div className="space-y-6 font-black">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase font-black">Monthly Attendance</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-black">
              {agents.map((a: any) => (
                <div key={a.id} className="p-5 bg-slate-50 rounded-[2rem] border text-center font-black">
                  <p className="text-xs mb-2 opacity-60 font-black">{a.name}</p>
                  <span className={`text-[10px] px-3 py-1.5 rounded-full text-white font-black shadow-sm ${a.performance?.edu_status === '참여' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    {a.performance?.edu_status || "미입력"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'sys' && (
          <div className="space-y-10 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Management</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 font-black">
              <div className="space-y-6 font-black">
                <InputItem label="전체 목표 금액 (만)" val={tarAmt} onChange={setTarAmt} />
                <InputItem label="전체 목표 건수 (건)" val={tarCnt} onChange={setTarCnt} />
                <div className="grid grid-cols-2 gap-4 font-black">
                    <InputItem label="도입 목표 (명)" val={tarIntro} onChange={setTarIntro} />
                    <div className="flex flex-col bg-slate-900 text-white p-4 rounded-3xl border border-black shadow-inner font-black">
                        <label className="text-[10px] text-amber-400 mb-1 font-black">도입 실제 결과</label>
                        <input type="number" value={curIntro} onChange={(e)=>setCurIntro(Number(e.target.value))} className="bg-transparent text-2xl font-black outline-none border-b border-white/20 text-center text-[#d4af37]" />
                    </div>
                </div>
              </div>
              <div className="space-y-6 font-black">
                <div className="space-y-2 font-black">
                   <p className="text-xs text-slate-400 border-b pb-1 uppercase font-black">📢 Global Notice</p>
                   <textarea value={notice} onChange={(e) => setNotice(e.target.value)} className="w-full h-24 p-5 bg-slate-50 border-2 border-transparent focus:border-black rounded-[2rem] outline-none text-xs font-black transition-all" />
                </div>
                <div className="space-y-2 font-black">
                   <p className="text-xs text-slate-400 border-b pb-1 uppercase font-black">📅 Monthly Edu Plan</p>
                   <textarea value={eduSchedule} onChange={(e) => setEduSchedule(e.target.value)} className="w-full h-36 p-5 bg-slate-100 border-2 border-transparent focus:border-black rounded-[2.5rem] outline-none text-xs font-black transition-all" />
                </div>
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl font-black shadow-2xl active:scale-[0.98] transition-all italic uppercase font-black tracking-tighter">Update Monthly Policy</button>
          </div>
        )}
      </div>
    </div>
  );
}

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
function MiniBox({ label, val }: any) { return <div className="bg-slate-50 p-7 rounded-[2.5rem] border text-center font-black transition-all shadow-sm"><p className="text-[10px] text-slate-400 mb-1 uppercase font-black">{label}</p><p className="text-3xl italic font-black">{val}</p></div> }
function InputItem({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-5 rounded-[2rem] border font-black transition-all hover:border-black"><label className="text-xs uppercase font-black">{label}</label><input type="number" value={val} onChange={(e) => onChange(Number(e.target.value))} className="w-24 p-2 bg-white border-2 border-slate-100 rounded-xl text-center outline-none focus:border-black font-black" /></div> }