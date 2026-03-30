"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
  // --- 기존 및 신규 상태 유지 ---
  const [tarAmt, setTarAmt] = useState(teamMeta.targetAmt);
  const [tarCnt, setTarCnt] = useState(teamMeta.targetCnt);
  const [tarIntro, setTarIntro] = useState(teamMeta.targetIntro);
  const [curIntro, setCurIntro] = useState(teamMeta.actualIntro);
  const [notice, setNotice] = useState("");
  const [eduWeeks, setEduWeeks] = useState({ 1: "", 2: "", 3: "", 4: " ", 5: "" });

  const [allUsers, setAllUsers] = useState<any[]>([]); 
  const [existingDepts, setExistingDepts] = useState<string[]>([]);
  const [existingTeams, setExistingTeams] = useState<{dept: string, team: string}[]>([]);

  // 직급 순위 정의 (숫자가 높을수록 낮은 직급)
  const rankPriority: { [key: string]: number } = {
    '관리자': 1,
    '본부장': 2,
    '지점장': 3,
    '팀장': 4,
    '설계사': 5,
    '사용자': 6
  };

  useEffect(() => {
    async function load() {
      // 1. 현재 접속한 관리자 정보 가져오기 (직급 확인용)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let myRankValue = 100; // 기본값 (가장 낮은 순위)

      if (authUser) {
        const { data: myData } = await supabase
          .from("users")
          .select("rank")
          .eq("id", authUser.id)
          .single();
        if (myData?.rank) {
          myRankValue = rankPriority[myData.rank] || 100;
        }
      }

      // 2. 시스템 설정 로드
      const { data: settings } = await supabase.from("team_settings").select("*");
      if (settings) {
        setNotice(settings.find(s => s.key === 'global_notice')?.value || "");
        const savedEdu = settings.find(s => s.key === 'edu_content')?.value;
        if (savedEdu) {
          try { 
            const parsed = typeof savedEdu === 'string' ? JSON.parse(savedEdu) : savedEdu;
            setEduWeeks(parsed); 
          } catch (e) { 
            setEduWeeks({ 1: "", 2: "", 3: "", 4: "", 5: "" }); 
          }
        }
      }
      
      // 3. 조직 정보 로드 및 전체 유저 로드 (필터링 포함)
      if (type === 'users') {
        const { data: bData } = await supabase.from("branches").select("dept_name, name");
        if (bData) {
          const depts = Array.from(new Set(bData.map(b => b.dept_name).filter(Boolean))) as string[];
          const teams = bData.map(b => ({ dept: b.dept_name, team: b.name }));
          setExistingDepts(depts.sort());
          setExistingTeams(teams);
        }

        const { data: uData } = await supabase
          .from("users")
          .select("*")
          .order("is_approved", { ascending: true })
          .order("name", { ascending: true });

        if (uData) {
          // [수정] 본인보다 직급 숫자가 큰(낮은 직급) 사람만 필터링
          const filteredUsers = uData.filter(u => {
            const userRankValue = rankPriority[u.rank] || 999;
            return userRankValue > myRankValue; 
          });

          setAllUsers(filteredUsers.map(u => ({ 
            ...u, 
            department: u.department_name || "", 
            team: u.branch_name || "",
            isCustomDept: false, 
            isCustomTeam: false 
          })));
        }
      }
    }
    load();
  }, [type]);

  // 유저 정보 업데이트 헬퍼
  const updateUserInfo = (userId: string, field: string, value: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      
      const updated = { ...u };
      if (field === 'department') {
        if (value === 'CUSTOM_INPUT') { updated.department = ''; updated.isCustomDept = true; }
        else { updated.department = value; updated.isCustomDept = false; }
      } else if (field === 'team') {
        if (value === 'CUSTOM_INPUT') { updated.team = ''; updated.isCustomTeam = true; }
        else { updated.team = value; updated.isCustomTeam = false; }
      } else {
        updated[field] = value;
      }
      return updated;
    }));
  };

  const handleApprovePerf = async (agentId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("daily_perf").update({ is_approved: !currentStatus }).eq("user_id", agentId);
    if (error) { alert("오류가 발생했습니다."); } 
    else { alert(!currentStatus ? "승인되었습니다." : "해제되었습니다."); onClose(); }
  };

  const handleUserSave = async (user: any) => {
    if(!user.department || !user.team) {
      alert("사업부와 지점을 모두 입력해주세요.");
      return;
    }
    const { error } = await supabase.from("users").update({ 
      is_approved: true,
      department_name: user.department,
      branch_name: user.team 
    }).eq("id", user.id);

    if (error) { 
      console.error(error);
      alert("저장 중 오류 발생: " + error.message); 
    } 
    else { 
      alert(`${user.name}님의 정보가 업데이트 되었습니다.`); 
      setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_approved: true } : u));
    }
  };

  const saveSys = async () => {
    await supabase.from("team_settings").upsert([
      { key: 'target_amt', value: String(tarAmt) }, 
      { key: 'target_cnt', value: String(tarCnt) },
      { key: 'team_target_intro', value: String(tarIntro) }, 
      { key: 'actual_intro_cnt', value: String(curIntro) },
      { key: 'global_notice', value: notice }, 
      { key: 'edu_content', value: JSON.stringify(eduWeeks) }
    ], { onConflict: 'key' });
    alert("시스템 설정이 저장되었습니다.");
    onClose();
  };

  const getRate = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";
  const totalAmt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_amt || 0), 0);
  const totalCnt = agents.reduce((s:any, a:any) => s + (a.performance?.contract_cnt || 0), 0);
  const totalDB = agents.reduce((s:any, a:any) => s + (a.performance?.db_assigned || 0), 0);
  const totalReturn = agents.reduce((s:any, a:any) => s + (a.performance?.db_returned || 0), 0);

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 font-black text-black">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 relative overflow-y-auto max-h-[90vh] border-4 border-black shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 md:top-8 md:right-8 text-2xl md:text-3xl font-black z-50">✕</button>

        {type === 'users' && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">Employee Management</h3>
            <div className="border-2 md:border-4 border-black rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-xl">
              <table className="w-full text-left font-black">
                <thead className="bg-black text-[#d4af37] text-[10px] uppercase font-black">
                  <tr>
                    <th className="p-4 md:p-6">Employee Info</th>
                    <th className="p-4 md:p-6 text-center">Set Dept / Branch</th>
                    <th className="p-4 md:p-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {allUsers.map((u) => (
                    <tr key={u.id} className={`${u.is_approved ? 'bg-white' : 'bg-amber-50'} hover:bg-slate-50 transition-colors`}>
                      <td className="p-4 md:p-6">
                        <p className="font-black text-sm md:text-xl italic">
                          {u.name} <span className="text-xs text-indigo-600">[{u.rank || '설계사'}]</span>
                          {!u.is_approved && <span className="text-rose-500 text-[10px] ml-1">[PENDING]</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 font-normal">{u.email}</p>
                      </td>
                      <td className="p-4 md:p-6 text-center">
                        <div className="flex flex-col gap-2 max-w-[250px] mx-auto">
                          {u.isCustomDept ? (
                            <input type="text" autoFocus placeholder="사업부 직접 입력" className="p-2 border-2 border-indigo-500 rounded-xl text-xs font-black bg-white" value={u.department || ""} onChange={(e) => updateUserInfo(u.id, 'department', e.target.value)} />
                          ) : (
                            <select value={u.department || ""} onChange={(e) => updateUserInfo(u.id, 'department', e.target.value)} className="p-2 bg-slate-100 border-2 border-black rounded-xl text-[10px] md:text-xs font-black">
                              <option value="">사업부 선택</option>
                              {existingDepts.map(d => <option key={d} value={d}>{d}</option>)}
                              <option value="CUSTOM_INPUT" className="text-indigo-600 font-bold">+ 직접 입력</option>
                            </select>
                          )}
                          {u.isCustomTeam ? (
                            <input type="text" autoFocus placeholder="지점 직접 입력" className="p-2 border-2 border-indigo-500 rounded-xl text-xs font-black bg-white" value={u.team || ""} onChange={(e) => updateUserInfo(u.id, 'team', e.target.value)} />
                          ) : (
                            <select value={u.team || ""} onChange={(e) => updateUserInfo(u.id, 'team', e.target.value)} disabled={!u.department && !u.isCustomDept} className="p-2 bg-slate-100 border-2 border-black rounded-xl text-[10px] md:text-xs font-black disabled:opacity-30">
                              <option value="">지점 선택</option>
                              {existingTeams.filter(t => t.dept === u.department).map((t, idx) => <option key={idx} value={t.team}>{t.team}</option>)}
                              <option value="CUSTOM_INPUT" className="text-indigo-600 font-bold">+ 직접 입력</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="p-4 md:p-6 text-center">
                        <button onClick={() => handleUserSave(u)} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-black italic border-2 border-black hover:invert transition-all ${u.is_approved ? 'bg-white' : 'bg-black text-[#d4af37]'}`}>
                          {u.is_approved ? 'UPDATE INFO' : 'APPROVE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 나머지 탭(perf, act, edu, sys)은 기존 로직 동일 유지 */}
        {type === 'perf' && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">Team Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="border-2 md:border-4 border-black rounded-2xl overflow-hidden shadow-xl mt-6">
              <table className="w-full text-left font-black">
                <thead className="bg-black text-[#d4af37] text-[10px] uppercase">
                  <tr><th className="p-4 md:p-6">Employee</th><th className="p-4 md:p-6 text-center">Today Amount</th><th className="p-4 md:p-6 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {agents.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 md:p-6 text-sm md:text-xl italic">{a.name} CA</td>
                      <td className="p-4 md:p-6 text-center text-lg md:text-2xl italic">{a.performance.contract_amt || 0}만</td>
                      <td className="p-4 md:p-6 text-center">
                        <button onClick={() => handleApprovePerf(a.id, a.performance.is_approved)} className={`px-4 py-2 rounded-full text-[10px] font-black border-2 border-black ${a.performance.is_approved ? 'bg-black text-[#d4af37]' : 'bg-white'}`}>
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

        {type === 'act' && (
          <div className="space-y-6 md:space-y-8 font-black animate-in fade-in">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">Activity & Funnel</h3>
            {selectedAgent ? (
              <div className="space-y-6">
                <div className="bg-black p-6 rounded-2xl text-white flex justify-between items-center shadow-2xl">
                  <p className="text-xl md:text-3xl font-black italic underline decoration-[#d4af37] underline-offset-8">{selectedAgent.name} CA Analysis</p>
                  <button onClick={() => handleApprovePerf(selectedAgent.id, selectedAgent.performance.is_approved)} className={`px-6 py-3 rounded-full text-xs font-black italic ${selectedAgent.performance.is_approved ? 'bg-rose-600' : 'bg-[#d4af37] text-black'}`}>
                    {selectedAgent.performance.is_approved ? 'REVOKE LOCK' : 'CONFIRM & LOCK'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-6 rounded-2xl border-4 border-black text-center">
                    <p className="text-[10px] text-blue-400 uppercase mb-2">배정 DB</p>
                    <p className="text-2xl font-black italic">{selectedAgent.performance.db_assigned || 0}건</p>
                  </div>
                  <div className="bg-rose-50 p-6 rounded-2xl border-4 border-black text-center">
                    <p className="text-[10px] text-rose-400 uppercase mb-2">반품 DB</p>
                    <p className="text-2xl font-black italic text-rose-600">{selectedAgent.performance.db_returned || 0}건</p>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-2xl border-4 border-black text-center text-[#d4af37]">
                    <p className="text-[10px] opacity-50 uppercase mb-2">반품율</p>
                    <p className="text-2xl font-black italic">{getRate(selectedAgent.performance.db_returned, selectedAgent.performance.db_assigned)}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ActivityCountBox label="전화" val={`${selectedAgent.performance.call}건`} />
                  <ActivityCountBox label="만남" val={`${selectedAgent.performance.meet}건`} />
                  <ActivityCountBox label="제안" val={`${selectedAgent.performance.pt}건`} />
                  <ActivityCountBox label="소개" val={`${selectedAgent.performance.intro}건`} />
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in">
                <div className="bg-slate-50 p-6 rounded-2xl border-4 border-black grid grid-cols-3 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div><p className="text-[10px] text-slate-400 uppercase mb-1">총 배정 DB</p><p className="text-2xl italic">{totalDB}건</p></div>
                    <div><p className="text-[10px] text-slate-400 uppercase mb-1">총 반품 DB</p><p className="text-2xl italic text-rose-500">{totalReturn}건</p></div>
                    <div><p className="text-[10px] text-slate-400 uppercase mb-1">전체 반품율</p><p className="text-2xl italic text-rose-600">{getRate(totalReturn, totalDB)}%</p></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ActivityCountBox label="전화 합계" val={`총 ${agents.reduce((s:any,a:any)=>s+(a.performance.call||0),0)}건`} />
                  <ActivityCountBox label="만남 합계" val={`총 ${agents.reduce((s:any,a:any)=>s+(a.performance.meet||0),0)}건`} />
                  <ActivityCountBox label="제안 합계" val={`총 ${agents.reduce((s:any,a:any)=>s+(a.performance.pt||0),0)}건`} />
                  <ActivityCountBox label="소개 합계" val={`총 ${agents.reduce((s:any,a:any)=>s+(a.performance.intro||0),0)}건`} />
                </div>
              </div>
            )}
          </div>
        )}

        {type === 'edu' && (
          <div className="space-y-6 md:space-y-10 font-black animate-in fade-in">
            <h3 className="text-2xl md:text-4xl italic border-b-4 md:border-b-8 border-black inline-block uppercase">Attendance & Training</h3>
            <div className="border-2 md:border-4 border-black rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-black text-[#d4af37] text-[10px] uppercase">
                  <tr>
                    <th className="p-6 sticky left-0 bg-black">Name</th>
                    {[1, 2, 3, 4, 5].map(w => <th key={w} className="p-6 text-center">{w === 5 ? 'PLUS' : w+'W'}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black bg-white">
                  {agents.map((a:any) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-6 font-black text-lg italic sticky left-0 bg-white border-r-2 border-black/5">{a.name} CA</td>
                      {[1, 2, 3, 4, 5].map((w) => (
                        <td key={w} className="p-6 text-center">
                          <div className={`w-10 h-10 mx-auto rounded-xl border-4 flex items-center justify-center text-xl transition-all ${a.performance[`edu_${w}`] ? 'bg-black text-[#d4af37] border-black scale-110 shadow-lg' : 'border-slate-100 text-transparent'}`}>✓</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {type === 'sys' && (
          <div className="space-y-6 md:space-y-10 font-black animate-in fade-in">
            <div className="flex justify-between items-end border-b-4 md:border-b-8 border-black pb-4">
              <h3 className="text-2xl md:text-4xl italic uppercase">Admin Settings</h3>
              <button onClick={saveSys} className="bg-black text-[#d4af37] px-6 py-2 rounded-full text-xs italic font-black hover:invert transition-all">SAVE CHANGES</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <p className="text-[10px] text-slate-400 uppercase font-black ml-2">Performance Goals</p>
                <InputRow label="팀 매출 목표 (만원)" val={tarAmt} onChange={setTarAmt} />
                <InputRow label="팀 건수 목표 (건)" val={tarCnt} onChange={setTarCnt} />
                <InputRow label="도입 인원 목표 (명)" val={tarIntro} onChange={setTarIntro} />
                <div className="pt-4">
                  <p className="text-[10px] text-slate-400 uppercase font-black ml-2 mb-2">Global Notice</p>
                  <input type="text" value={notice} onChange={e=>setNotice(e.target.value)} className="w-full p-5 bg-slate-50 border-4 border-black rounded-2xl outline-none italic font-black text-lg shadow-inner" placeholder="공지사항 입력..." />
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] text-slate-400 uppercase font-black ml-2">Weekly Training Curriculum</p>
                {[1, 2, 3, 4, 5].map((w) => (
                  <div key={w} className="flex gap-2">
                    <span className="w-12 h-12 flex items-center justify-center bg-black text-[#d4af37] rounded-xl text-[10px] italic">{w === 5 ? 'PLUS' : w+'W'}</span>
                    <input type="text" value={eduWeeks[w as keyof typeof eduWeeks] || ""} onChange={e => setEduWeeks({...eduWeeks, [w]: e.target.value})} className="flex-1 p-3 bg-white border-2 border-black rounded-xl outline-none text-sm font-black italic shadow-sm focus:border-indigo-500" placeholder={`${w === 5 ? '추가 교육 내용' : w + '주차 교육 커리큘럼'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityCountBox({ label, val }: any) { 
  return (
    <div className="bg-white p-6 rounded-2xl border-4 border-black text-center font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-transform">
      <p className="text-[9px] text-slate-400 uppercase mb-2">{label}</p>
      <p className="text-xl font-black italic">{val || 0}</p>
    </div>
  ) 
}

function StatBox({ label, cur, tar, unit, color }: any) { 
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1); 
  return (
    <div className="text-center space-y-4 p-5 font-black border-4 border-black rounded-3xl bg-slate-50 shadow-lg">
      <p className="text-[10px] text-slate-400 uppercase">{label}</p>
      <p className="text-2xl font-black italic">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-10 bg-white rounded-full border-4 border-black overflow-hidden relative">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs text-white mix-blend-difference font-black">{pct}%</span>
      </div>
    </div>
  ) 
}

function InputRow({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border-4 border-black shadow-md">
      <label className="text-xs italic font-black uppercase">{label}</label>
      <input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-28 p-2 bg-white border-2 border-black rounded-xl text-center outline-none text-xl italic font-black" />
    </div>
  ) 
}