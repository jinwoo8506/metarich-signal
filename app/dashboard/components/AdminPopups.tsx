"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
  // --- 기존 상태 유지 ---
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [curIntro, setCurIntro] = useState(teamMeta.actualIntro);
  const [notice, setNotice] = useState("");
  const [eduWeeks, setEduWeeks] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });

  // --- 유저 및 소속 관리 상태 ---
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [existingDepts, setExistingDepts] = useState<string[]>([]);
  const [existingTeams, setExistingTeams] = useState<{dept: string, team: string}[]>([]);

  useEffect(() => {
    async function load() {
      // 1. 시스템 설정 로드
      const { data: settings } = await supabase.from("team_settings").select("*");
      if (settings) {
        setNotice(settings.find(s => s.key === 'global_notice')?.value || "");
        const savedEdu = settings.find(s => s.key === 'edu_content')?.value;
        if (savedEdu) {
          try { setEduWeeks(JSON.parse(savedEdu)); } catch (e) { setEduWeeks({ 1: "", 2: "", 3: "", 4: "", 5: "" }); }
        }
      }
      
      // 2. 조직 정보 및 대기 유저 로드
      if (type === 'users') {
        // 실제 유저 데이터를 기반으로 현재 존재하는 사업부/지점 리스트 추출
        const { data: allUsers } = await supabase.from("users").select("department, team");
        if (allUsers) {
          const depts = Array.from(new Set(allUsers.map(u => u.department).filter(Boolean))) as string[];
          const teams = allUsers.filter(u => u.department && u.team).map(u => ({ dept: u.department, team: u.team }));
          setExistingDepts(depts.sort());
          setExistingTeams(teams);
        }

        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("is_approved", false)
          .order("created_at", { ascending: false });
        if (userData) {
          // 직접 입력을 위한 custom 상태값 추가 초기화
          setPendingUsers(userData.map(u => ({ ...u, isCustomDept: false, isCustomTeam: false })));
        }
      }
    }
    load();
  }, [type]);

  // 소속 정보 업데이트 헬퍼
  const updatePendingUserInfo = (userId: string, field: string, value: string) => {
    setPendingUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      
      // 직접 입력 모드 전환 로직
      if (field === 'department' && value === 'CUSTOM_INPUT') return { ...u, department: '', isCustomDept: true };
      if (field === 'team' && value === 'CUSTOM_INPUT') return { ...u, team: '', isCustomTeam: true };
      
      return { ...u, [field]: value };
    }));
  };

  // [기능 1] 실적 승인
  const handleApprove = async (agentId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("daily_perf").update({ is_approved: !currentStatus }).eq("user_id", agentId);
    if (error) { alert("오류가 발생했습니다."); } 
    else { alert(!currentStatus ? "승인되었습니다." : "해제되었습니다."); onClose(); }
  };

  // [기능 2] 직원 최종 승인 (직접 입력값 포함 저장)
  const handleUserApproval = async (user: any) => {
    if(!user.department || !user.team) {
      alert("사업부와 지점을 모두 입력(선택)해주세요.");
      return;
    }
    const { error } = await supabase.from("users").update({ 
      is_approved: true,
      department: user.department,
      team: user.team 
    }).eq("id", user.id);

    if (error) { alert("승인 중 오류 발생"); } 
    else { alert(`${user.name} 직원이 승인되었습니다.`); setPendingUsers(pendingUsers.filter(u => u.id !== user.id)); }
  };

  // [기능 3] 시스템 설정 저장
  const saveSys = async () => {
    await supabase.from("team_settings").upsert([
      { key: 'target_amt', value: String(tarAmt) }, 
      { key: 'target_cnt', value: String(tarCnt) },
      { key: 'team_target_intro', value: String(tarIntro) }, 
      { key: 'actual_intro_cnt', value: String(curIntro) },
      { key: 'global_notice', value: notice }, 
      { key: 'edu_content', value: JSON.stringify(eduWeeks) }
    ], { onConflict: 'key' });
    alert("저장되었습니다.");
    onClose();
  };

  // --- 통계 로직 ---
  const totalAmt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_amt || 0), 0);
  const totalCnt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_cnt || 0), 0);
  const totalCall = agents.reduce((s:any, a:any) => s + (a.performance?.call || 0), 0);
  const totalMeet = agents.reduce((s:any, a:any) => s + (a.performance?.meet || 0), 0);
  const totalPt = agents.reduce((s:any, a:any) => s + (a.performance?.pt || 0), 0);
  const totalIntro = agents.reduce((s:any, a:any) => s + (a.performance?.intro || 0), 0);
  const getRate = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 font-black text-black">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 relative overflow-y-auto max-h-[90vh] border-4 border-black shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 md:top-8 md:right-8 text-2xl md:text-3xl font-black z-50">✕</button>

        {type === 'sys' && (
          <button onClick={saveSys} className="absolute top-6 right-16 md:top-8 md:right-20 bg-black text-[#d4af37] px-4 md:px-6 py-2 rounded-full text-xs italic font-black uppercase z-50">
            Save Configuration
          </button>
        )}

        {/* 1. User Management (추천 방식 적용) */}
        {type === 'users' && (
          <div className="space-y-6 md:space-y-10">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">User Management</h3>
            <div className="border-2 md:border-4 border-black rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-xl">
              <table className="w-full text-left font-black">
                <thead className="bg-black text-[#d4af37] text-[9px] md:text-[10px] uppercase">
                  <tr>
                    <th className="p-4 md:p-6">Employee Info</th>
                    <th className="p-4 md:p-6 text-center">Set Dept / Branch</th>
                    <th className="p-4 md:p-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {pendingUsers.length === 0 ? (
                    <tr><td colSpan={3} className="p-10 text-center text-slate-400 italic">승인 대기 중인 인원이 없습니다.</td></tr>
                  ) : (
                    pendingUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 md:p-6">
                          <p className="font-black text-sm md:text-xl italic">{u.name || '이름없음'}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{u.email}</p>
                        </td>
                        <td className="p-4 md:p-6">
                          <div className="flex flex-col gap-2 max-w-[250px] mx-auto">
                            {/* 사업부 선택/입력 */}
                            {u.isCustomDept ? (
                              <input 
                                type="text" placeholder="새 사업부 명칭" 
                                className="p-2 border-2 border-indigo-500 rounded-xl text-xs font-black"
                                onChange={(e) => updatePendingUserInfo(u.id, 'department', e.target.value)}
                              />
                            ) : (
                              <select 
                                value={u.department || ""} 
                                onChange={(e) => updatePendingUserInfo(u.id, 'department', e.target.value)}
                                className="p-2 bg-slate-100 border-2 border-black rounded-xl text-[10px] md:text-xs font-black"
                              >
                                <option value="">사업부 선택</option>
                                {existingDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                <option value="CUSTOM_INPUT" className="text-indigo-600 font-bold">+ 직접 입력</option>
                              </select>
                            )}

                            {/* 지점 선택/입력 */}
                            {u.isCustomTeam ? (
                              <input 
                                type="text" placeholder="새 지점 명칭" 
                                className="p-2 border-2 border-indigo-500 rounded-xl text-xs font-black"
                                onChange={(e) => updatePendingUserInfo(u.id, 'team', e.target.value)}
                              />
                            ) : (
                              <select 
                                value={u.team || ""} 
                                onChange={(e) => updatePendingUserInfo(u.id, 'team', e.target.value)}
                                disabled={!u.department && !u.isCustomDept}
                                className="p-2 bg-slate-100 border-2 border-black rounded-xl text-[10px] md:text-xs font-black disabled:opacity-30"
                              >
                                <option value="">지점 선택</option>
                                {existingTeams
                                  .filter(t => t.dept === u.department)
                                  .map((t, idx) => <option key={idx} value={t.team}>{t.team}</option>)
                                }
                                <option value="CUSTOM_INPUT" className="text-indigo-600 font-bold">+ 직접 입력</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="p-4 md:p-6 text-center">
                          <button onClick={() => handleUserApproval(u)} className="bg-black text-[#d4af37] px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black italic border-2 border-black hover:invert transition-all">
                            APPROVE USER
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Team Performance (기존 유지) */}
        {type === 'perf' && (
          <div className="space-y-6 md:space-y-10">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="border-2 md:border-4 border-black rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left font-black">
                <thead className="bg-black text-[#d4af37] text-[9px] uppercase">
                  <tr><th className="p-4 md:p-6">Employee</th><th className="p-4 md:p-6 text-center">Amount</th><th className="p-4 md:p-6 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {agents.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 md:p-6 text-sm md:text-xl italic">{a.name} CA</td>
                      <td className="p-4 md:p-6 text-center text-lg md:text-2xl italic">{a.performance.contract_amt}만</td>
                      <td className="p-4 md:p-6 text-center">
                        <button onClick={() => handleApprove(a.id, a.performance.is_approved)} className={`px-4 py-2 rounded-full text-[10px] font-black border-2 border-black transition-all ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-white'}`}>
                          {a.performance.is_approved ? 'APPROVED' : 'APPROVE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Activity (기존 유지) */}
        {type === 'act' && (
          <div className="space-y-6 md:space-y-8 font-black">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">Activity & Funnel</h3>
            {!selectedAgent ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ActivityCountBox label="전화 합계" val={`총 ${totalCall}건`} />
                  <ActivityCountBox label="만남 합계" val={`총 ${totalMeet}건`} />
                  <ActivityCountBox label="제안 합계" val={`총 ${totalPt}건`} />
                  <ActivityCountBox label="소개 합계" val={`총 ${totalIntro}건`} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-70">
                  <FunnelBox label="전화→만남" val={getRate(totalMeet, totalCall)} />
                  <FunnelBox label="만남→제안" val={getRate(totalPt, totalMeet)} />
                  <FunnelBox label="제안→계약" val={getRate(totalCnt, totalPt)} />
                  <FunnelBox label="계약→소개" val={getRate(totalIntro, totalCnt)} />
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-black p-6 rounded-2xl text-white flex justify-between items-center shadow-2xl">
                  <p className="text-xl md:text-3xl font-black italic underline decoration-[#d4af37] underline-offset-8">{selectedAgent.name} CA Report</p>
                  <button onClick={() => handleApprove(selectedAgent.id, selectedAgent.performance.is_approved)} className={`px-6 py-3 rounded-full text-xs font-black italic ${selectedAgent.performance.is_approved ? 'bg-rose-600' : 'bg-[#d4af37] text-black'}`}>
                    {selectedAgent.performance.is_approved ? 'REVOKE LOCK' : 'CONFIRM & LOCK'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ActivityCountBox label="전화" val={`${selectedAgent.performance.call}건`} />
                  <ActivityCountBox label="만남" val={`${selectedAgent.performance.meet}건`} />
                  <ActivityCountBox label="제안" val={`${selectedAgent.performance.pt}건`} />
                  <ActivityCountBox label="소개" val={`${selectedAgent.performance.intro}건`} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Attendance (기존 유지) */}
        {type === 'edu' && (
          <div className="space-y-6 md:space-y-10 font-black">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">Attendance & Training</h3>
            <div className="border-2 md:border-4 border-black rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-black text-[#d4af37] text-[10px] uppercase">
                  <tr>
                    <th className="p-6 sticky left-0 bg-black">Name</th>
                    <th className="p-6 text-center">1W</th><th className="p-6 text-center">2W</th>
                    <th className="p-6 text-center">3W</th><th className="p-6 text-center">4W</th><th className="p-6 text-center">Plus</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {agents.map((a:any) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-6 font-black text-lg italic sticky left-0 bg-white border-r-2 border-black/5">{a.name} CA</td>
                      {[1, 2, 3, 4, 5].map((w) => (
                        <td key={w} className="p-6 text-center">
                          <div className={`w-8 h-8 mx-auto rounded-lg border-2 flex items-center justify-center ${a.performance[`edu_${w}`] ? 'bg-black text-[#d4af37] border-black' : 'border-slate-200 text-transparent'}`}>✓</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. System (기존 유지) */}
        {type === 'sys' && (
          <div className="space-y-6 md:space-y-10 font-black">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">Admin Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <InputRow label="팀 매출 목표 (만원)" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표 (건)" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표 (명)" val={tarIntro} onChange={setTarIntro} />
              </div>
              <div className="space-y-4">
                <p className="text-[10px] text-slate-400 uppercase font-black ml-2">Global Notice</p>
                <input type="text" value={notice} onChange={e=>setNotice(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-black rounded-2xl outline-none italic text-lg" placeholder="공지사항..." />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- 헬퍼 컴포넌트들 ---
function ActivityCountBox({ label, val }: any) { 
  return (
    <div className="bg-white p-6 rounded-2xl border-4 border-black text-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <p className="text-[9px] text-slate-400 uppercase mb-2">{label}</p>
      <p className="text-xl font-black italic">{val || 0}</p>
    </div>
  ) 
}

function StatBox({ label, cur, tar, unit, color }: any) { 
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1); 
  return (
    <div className="text-center space-y-4 p-4 font-black">
      <p className="text-[10px] text-slate-400 uppercase">{label}</p>
      <p className="text-2xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-10 bg-slate-100 rounded-full border-4 border-black overflow-hidden relative shadow-lg">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs text-white mix-blend-difference">{pct}%</span>
      </div>
    </div>
  ) 
}

function FunnelBox({ label, val }: any) { 
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border-4 border-black border-dashed text-center font-black">
      <p className="text-2xl italic text-indigo-600 mb-1">{val}%</p>
      <p className="text-[9px] text-slate-400 uppercase">{label}</p>
    </div>
  ) 
}

function InputRow({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border-4 border-black shadow-md">
      <label className="text-sm italic font-black uppercase">{label}</label>
      <input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-32 p-3 bg-white border-2 border-black rounded-xl text-center outline-none text-xl italic" />
    </div>
  ) 
}