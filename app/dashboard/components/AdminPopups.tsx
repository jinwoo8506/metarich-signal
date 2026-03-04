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
    alert("팀 운영 지침이 반영되었습니다.");
    onClose();
  };

  const sum = (key: string) => agents.reduce((s: any, a: any) => s + (Number(a.performance?.[key]) || 0), 0);
  
  // 지표 계산
  const totalAmt = sum('contract_amt');
  const totalCnt = sum('contract_cnt');
  const agentCount = agents.length || 1;
  const perPersonAmt = (totalAmt / agentCount).toFixed(1); // 1인당 생산성
  const perContractAmt = totalCnt > 0 ? (totalAmt / totalCnt).toFixed(1) : "0"; // 1건당 금액

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 font-black font-black">
      <div className="bg-white w-full max-w-5xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl font-black">
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl font-black hover:rotate-90 transition-all font-black">✕</button>

        {/* 📈 실적 관리 (신규 지표 추가됨) */}
        {type === 'perf' && (
          <div className="space-y-8 animate-in fade-in font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Team Productivity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black font-black">
              <StatBox label="팀 매출 달성률" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="팀 건수 달성률" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 목표 달성률" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-black font-black">
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl font-black">
                    <p className="text-[#d4af37] text-xs font-black uppercase tracking-widest mb-2 font-black">Per Person</p>
                    <p className="text-4xl font-black italic font-black">1인당 생산성: {perPersonAmt}만원</p>
                </div>
                <div className="bg-slate-100 p-10 rounded-[3rem] text-black shadow-xl font-black">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2 font-black">Per Contract</p>
                    <p className="text-4xl font-black italic font-black">1건당 금액: {perContractAmt}만원</p>
                </div>
            </div>
          </div>
        )}

        {/* 📊 활동 관리 */}
        {type === 'act' && (
          <div className="space-y-10 animate-in slide-in-from-top-4 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Activity Funnel</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-black">
              <MiniBox label="누적 콜" val={sum('call')} />
              <MiniBox label="누적 미팅" val={sum('meet')} />
              <MiniBox label="누적 제안" val={sum('pt')} />
              <MiniBox label="누적 소개" val={sum('intro')} />
            </div>
            <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 font-black">
              <p className="text-center text-slate-400 text-[10px] uppercase tracking-[0.5em] mb-10 font-black">Conversion Rate</p>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 font-black">
                <FunnelItem label="CALL → MEET" val={sum('call') > 0 ? ((sum('meet')/sum('call'))*100).toFixed(1) : 0} color="text-indigo-600" />
                <div className="text-slate-300 text-3xl hidden md:block">→</div>
                <FunnelItem label="MEET → PT" val={sum('meet') > 0 ? ((sum('pt')/sum('meet'))*100).toFixed(1) : 0} color="text-emerald-600" />
                <div className="text-slate-300 text-3xl hidden md:block">→</div>
                <FunnelItem label="PT → CONTRACT" val={sum('pt') > 0 ? ((sum('contract_cnt')/sum('pt'))*100).toFixed(1) : 0} color="text-amber-600" />
              </div>
            </div>
          </div>
        )}

        {/* 🎓 교육 관리 */}
        {type === 'edu' && (
          <div className="space-y-8 animate-in fade-in font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black">Attendance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 font-black">
                <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] flex justify-between items-center font-black">
                    <span className="font-black">참여 인원</span>
                    <span className="text-4xl font-black italic font-black">{agents.filter((a:any)=>a.performance?.edu_status === '참여').length}명</span>
                </div>
                <div className="bg-slate-100 p-8 rounded-[2.5rem] flex justify-between items-center font-black">
                    <span className="text-slate-400 font-black font-black">불참/미입력</span>
                    <span className="text-4xl font-black italic text-slate-400 font-black">{agents.filter((a:any)=>a.performance?.edu_status !== '참여').length}명</span>
                </div>
            </div>
            <div className="bg-white border rounded-[2.5rem] overflow-hidden font-black">
              <table className="w-full text-left font-black">
                <thead className="bg-slate-900 text-[#d4af37] text-[11px] font-black font-black">
                  <tr>
                    <th className="p-6 font-black">CA NAME</th>
                    <th className="p-6 text-center font-black">STATUS</th>
                    <th className="p-6 text-right font-black">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-black font-black">
                  {agents.map((a:any) => (
                    <tr key={a.id} className="hover:bg-slate-50 font-black">
                      <td className="p-6 font-black font-black">{a.name} CA</td>
                      <td className="p-6 text-center font-black">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${a.performance?.edu_status === '참여' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                          {a.performance?.edu_status || '미참여'}
                        </span>
                      </td>
                      <td className="p-6 text-right text-slate-400 text-[10px] font-black">{a.performance?.updated_at ? new Date(a.performance.updated_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ⚙️ 시스템 설정 */}
        {type === 'sys' && (
          <div className="space-y-10 font-black">
            <h3 className="text-4xl italic border-b-8 border-black inline-block uppercase font-black font-black">System Setting</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 font-black">
              <div className="space-y-6 font-black">
                <InputItem label="팀 전체 목표 금액" val={tarAmt} onChange={setTarAmt} />
                <InputItem label="팀 전체 목표 건수" val={tarCnt} onChange={setTarCnt} />
                <InputItem label="도입 목표 인원" val={tarIntro} onChange={setTarIntro} />
                <InputItem label="실제 도입 확정" val={curIntro} onChange={setCurIntro} />
              </div>
              <div className="space-y-6 font-black font-black">
                <div className="space-y-2 font-black">
                   <p className="text-xs text-slate-400 border-b pb-1 font-black">📢 공지사항</p>
                   <textarea value={notice} onChange={(e) => setNotice(e.target.value)} className="w-full h-24 p-5 bg-slate-50 border-2 border-transparent focus:border-black rounded-[2rem] outline-none text-xs font-black" />
                </div>
                <div className="space-y-2 font-black">
                   <p className="text-xs text-slate-400 border-b pb-1 font-black">📅 교육 스케줄</p>
                   <textarea value={eduSchedule} onChange={(e) => setEduSchedule(e.target.value)} className="w-full h-36 p-5 bg-slate-100 border-2 border-transparent focus:border-black rounded-[2.5rem] outline-none text-xs font-black" />
                </div>
              </div>
            </div>
            <button onClick={saveSettings} className="w-full bg-black text-[#d4af37] py-8 rounded-[3rem] text-2xl font-black shadow-2xl italic font-black">Update System Policy</button>
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
      <p className="text-[10px] text-slate-400 mb-2 uppercase font-black">{label}</p>
      <p className="text-2xl font-black">{cur}{unit} / {tar}{unit}</p>
      <p className={`text-5xl italic my-4 font-black ${color.replace('bg-', 'text-')}`}>{pct.toFixed(1)}%</p>
      <div className="w-full h-3 bg-white rounded-full overflow-hidden border font-black">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
function FunnelItem({ label, val, color }: any) { return <div className="text-center font-black font-black font-black"><p className={`text-5xl font-black italic mb-2 ${color}`}>{val}%</p><p className="text-[10px] text-slate-400 uppercase font-black font-black font-black">{label}</p></div> }
function MiniBox({ label, val }: any) { return <div className="bg-slate-50 p-7 rounded-[2.5rem] border text-center font-black shadow-sm font-black font-black font-black font-black"><p className="text-[10px] text-slate-400 mb-1 font-black font-black">{label}</p><p className="text-3xl italic font-black font-black">{val}</p></div> }
function InputItem({ label, val, onChange }: any) { return <div className="flex justify-between items-center bg-slate-50 p-5 rounded-[2rem] border font-black hover:border-black font-black font-black"><label className="text-xs font-black">{label}</label><input type="number" value={val} onChange={(e) => onChange(Number(e.target.value))} className="w-24 p-2 bg-white border-2 border-slate-100 rounded-xl text-center outline-none focus:border-black font-black font-black font-black" /></div> }