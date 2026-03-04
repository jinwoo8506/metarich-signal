"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, teamMeta, onClose }: any) {
  // 기존 목표치 및 공지 상태 유지
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro); // 관리자 전용 도입 목표
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from("team_settings").select("*");
      if (data) {
        setNotice(data.find(s => s.key === 'global_notice')?.value || "");
        // DB에 저장된 목표치가 있다면 상태 업데이트
        const dbAmt = data.find(s => s.key === 'team_target_amt')?.value;
        const dbCnt = data.find(s => s.key === 'team_target_cnt')?.value;
        const dbIntro = data.find(s => s.key === 'team_target_intro')?.value;
        if (dbAmt) setTarAmt(Number(dbAmt));
        if (dbCnt) setTarCnt(Number(dbCnt));
        if (dbIntro) setTarIntro(Number(dbIntro));
      }
    };
    loadSettings();
  }, []);

  // 설정 저장 로직 (삭제 없이 유지)
  const saveSettings = async () => {
    const settings = [
        { key: 'team_target_amt', value: String(tarAmt) },
        { key: 'team_target_cnt', value: String(tarCnt) },
        { key: 'team_target_intro', value: String(tarIntro) },
        { key: 'global_notice', value: notice }
    ];
    const { error } = await supabase.from("team_settings").upsert(settings);
    if (error) alert("저장 중 오류가 발생했습니다.");
    else {
      alert("팀 목표 및 공지사항이 성공적으로 배포되었습니다.");
      onClose();
    }
  };

  // 기존 통계 합산 로직 (삭제 없이 유지)
  const sum = (key: string) => agents.reduce((s: any, a: any) => s + (Number(a.performance?.[key]) || 0), 0);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative overflow-y-auto max-h-[90vh] shadow-2xl">
        {/* 닫기 버튼 */}
        <button onClick={onClose} className="absolute top-10 right-10 text-3xl hover:scale-110 transition-transform">✕</button>

        {/* 1. 실적 관리 탭 (도입 항목 관리자 전용 확인 포함) */}
        {type === 'perf' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">Performance Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatBox label="팀 전체 목표금액 대비" cur={sum('contract_amt')} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="팀 전체 목표건수 대비" cur={sum('contract_cnt')} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="팀 전체 도입 대비 (관리자 전용)" cur={sum('intro')} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            
            {/* 개별 직원 실적 리스트 요약 (기존 틀 유지) */}
            <div className="mt-8 bg-slate-50 p-6 rounded-[2.5rem] border">
                <p className="text-xs mb-4 opacity-40 uppercase">Individual Performance Summary</p>
                <div className="space-y-2">
                    {agents.map((a: any) => (
                        <div key={a.id} className="flex justify-between items-center bg-white p-3 rounded-xl border text-[11px]">
                            <span>{a.name} CA</span>
                            <span className="text-indigo-600">{a.performance?.contract_amt || 0}만 / {a.performance?.contract_cnt || 0}건</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* 2. 활동 관리 탭 (활동 내용 안 뜨던 버그 수정 및 소개 항목 강조) */}
        {type === 'act' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">Activity & DB Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <MiniBox label="총 전화" val={sum('call')} />
              <MiniBox label="총 만남" val={sum('meet')} />
              <MiniBox label="총 제안" val={sum('pt')} />
              <MiniBox label="총 소개 (직원입력)" val={sum('intro')} />
            </div>
            
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center mt-6">
              <div>
                <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">Team DB Efficiency</p>
                <p className="text-3xl font-black mt-2">반품율 {sum('db_assigned') > 0 ? ((sum('db_returned')/sum('db_assigned'))*100).toFixed(1) : 0}%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-50 font-black">전체 반품건수</p>
                <p className="text-5xl font-black italic text-rose-500">{sum('db_returned')}<span className="text-sm not-italic ml-1">건</span></p>
              </div>
            </div>
          </div>
        )}

        {/* 3. 교육 관리 탭 (기존 코드 유지) */}
        {type === 'edu' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">Education Attendance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {agents.map((a: any) => (
                <div key={a.id} className="p-5 bg-slate-50 rounded-[2rem] border text-center font-black transition-all hover:bg-white">
                  <p className="text-sm mb-2">{a.name} CA</p>
                  <span className={`text-[10px] px-4 py-1.5 rounded-full text-white shadow-sm ${a.performance?.edu_status === '참여' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    {a.performance?.edu_status || "미입력"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. 목표 설정 탭 (도입 목표 수정 기능 추가 및 기존 공지 유지) */}
        {type === 'sys' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <h3 className="text-3xl italic border-b-8 border-black inline-block uppercase">System Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">
              {/* 목표 수치 설정 섹션 */}
              <div className="space-y-4">
                <p className="text-[10px] text-amber-600 border-b border-amber-200 pb-1 uppercase font-black">Monthly Team Target</p>
                <InputItem label="전체 목표 금액 (만)" val={tarAmt} onChange={setTarAmt} />
                <InputItem label="전체 목표 건수 (건)" val={tarCnt} onChange={setTarCnt} />
                <InputItem label="전체 도입 목표 (명)" val={tarIntro} onChange={setTarIntro} />
              </div>
              
              {/* 공지사항 설정 섹션 */}
              <div className="space-y-4">
                <p className="text-[10px] text-slate-400 border-b pb-1 uppercase font-black">Global Notice Message</p>
                <textarea 
                  value={notice} 
                  onChange={(e) => setNotice(e.target.value)} 
                  className="w-full h-40 p-5 bg-slate-50 border-2 border-transparent focus:border-black rounded-[2rem] outline-none text-xs font-black transition-all leading-relaxed" 
                  placeholder="팀원들에게 보여질 공지사항을 입력하세요." 
                />
              </div>
            </div>
            
            {/* 저장 버튼 */}
            <button 
              onClick={saveSettings} 
              className="w-full bg-black text-[#d4af37] py-7 rounded-[2.5rem] text-xl font-black shadow-2xl hover:scale-[1.02] active:scale-95 transition-all italic uppercase tracking-tighter"
            >
              Update & Deploy Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 하위 컴포넌트들 (기존 틀 유지)
function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = tar > 0 ? Math.min((cur / tar) * 100, 100) : 0;
  return (
    <div className="bg-slate-50 p-7 rounded-[3rem] border text-center font-black transition-all hover:shadow-md">
      <p className="text-[10px] text-slate-400 mb-2">{label}</p>
      <p className="text-xl">{cur}{unit} / <span className="text-slate-300">{tar}{unit}</span></p>
      <p className={`text-4xl italic my-3 ${color.replace('bg-', 'text-')}`}>{pct.toFixed(1)}%</p>
      <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniBox({ label, val }: any) { 
  return (
    <div className="bg-slate-50 p-6 rounded-[2rem] border text-center font-black hover:bg-white transition-all">
      <p className="text-[10px] text-slate-400 mb-1">{label}</p>
      <p className="text-2xl tracking-tighter">{val}</p>
    </div>
  );
}

function InputItem({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border font-black transition-all hover:border-slate-300">
      <label className="text-xs">{label}</label>
      <input 
        type="number" 
        value={val} 
        onChange={(e) => onChange(Number(e.target.value))} 
        className="w-24 p-2 bg-white border-2 border-slate-100 rounded-xl text-center outline-none focus:border-black font-black transition-all" 
      />
    </div>
  );
}