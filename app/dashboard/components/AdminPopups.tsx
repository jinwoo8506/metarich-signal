"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
  // --- 상태 관리 ---
  const [tarAmt, setTarAmt] = useState(teamMeta?.targetAmt || 0);
  const [tarCnt, setTarCnt] = useState(teamMeta?.targetCnt || 0);
  const [tarIntro, setTarIntro] = useState(teamMeta?.targetIntro || 0);
  const [curIntro, setCurIntro] = useState(teamMeta?.actualIntro || 0);
  const [notice, setNotice] = useState("");
  const [eduWeeks, setEduWeeks] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });

  const [allUsers, setAllUsers] = useState<any[]>([]); 
  const [existingDepts, setExistingDepts] = useState<string[]>([]);
  const [existingTeams, setExistingTeams] = useState<{dept: string, team: string}[]>([]);
  const [myRankValue, setMyRankValue] = useState(100);
  const [myEmail, setMyEmail] = useState("");
  
  const isMaster = myRankValue === 1 || myEmail === 'qodbtjq@naver.com' || myEmail === 'jw20371035@gmail.com';

  const rankMap: { [key: string]: string } = {
    'master': '마스터',
    'director': '본부장',
    'leader': '사업부장',
    'manager': '지점장',
    'agent': '설계사',
    'guest': '사용자'
  };

  const rankPriority: { [key: string]: number } = {
    'master': 1,
    'director': 2,
    'leader': 3,
    'manager': 4,
    'agent': 5,
    'guest': 6
  };

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let currentMyRank = 100;

      if (authUser) {
        setMyEmail(authUser.email || "");
        const { data: myData } = await supabase
          .from("users")
          .select("rank")
          .eq("id", authUser.id)
          .single();
        if (myData?.rank) {
          const rVal = rankPriority[myData.rank] || 100;
          setMyRankValue(rVal);
          currentMyRank = rVal;
        }
      }

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
      
      if (type === 'users') {
        let depts: string[] = [];
        let teams: {dept: string, team: string}[] = [];

        const { data: bData } = await supabase.from("branches").select("dept_name, name");
        if (bData) {
          depts = Array.from(new Set(bData.map(b => b.dept_name).filter(Boolean))) as string[];
          teams = bData.map(b => ({ dept: b.dept_name, team: b.name }));
          setExistingDepts(depts.sort());
          setExistingTeams(teams);
        }

        const { data: uData } = await supabase
          .from("users")
          .select("*")
          .order("is_approved", { ascending: true })
          .order("name", { ascending: true });

        if (uData) {
          const filteredUsers = uData.filter(u => {
            const userRankValue = rankPriority[u.rank] || 999;
            if (currentMyRank === 1) return true;
            return userRankValue > currentMyRank;
          });

          setAllUsers(filteredUsers.map(u => {
            const hVal = u.headquarters_name || "시그널그룹";
            const dVal = u.department_name || "";
            const tVal = u.branch_name || "";
            return { 
              ...u, 
              hq: hVal,
              department: dVal, 
              team: tVal,
              isCustomDept: !!(dVal && !depts.includes(dVal)), 
              isCustomTeam: !!(tVal && !teams.some(t => t.team === tVal)) 
            };
          }));
        }
      }
    }
    load();
  }, [type]);

  const updateUserInfo = (userId: string, field: string, value: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const updated = { ...u };
      
      if (field === 'department') {
        if (value === 'CUSTOM_INPUT') {
          updated.department = "";
          updated.isCustomDept = true;
        } else if (updated.isCustomDept) {
          updated.department = value;
        } else {
          updated.department = value;
          updated.isCustomDept = false;
          updated.team = ""; 
        }
      } else if (field === 'team') {
        if (value === 'CUSTOM_INPUT') {
          updated.team = "";
          updated.isCustomTeam = true;
        } else if (updated.isCustomTeam) {
          updated.team = value;
        } else {
          updated.team = value;
          updated.isCustomTeam = false;
        }
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

    const { error: userError } = await supabase.from("users").update({ 
      is_approved: true,
      headquarters_name: user.hq,
      department_name: user.department,
      branch_name: user.team 
    }).eq("id", user.id);

    if (userError) { 
      console.error(userError);
      alert("저장 중 오류 발생: " + userError.message); 
      return;
    } 

    try {
      if (!existingDepts.includes(user.department)) {
        await supabase.from("departments").upsert({ name: user.department }, { onConflict: 'name' });
      }
      const teamExists = existingTeams.some(t => t.dept === user.department && t.team === user.team);
      if (!teamExists) {
        await supabase.from("branches").upsert({ 
          dept_name: user.department, 
          name: user.team 
        }, { onConflict: 'dept_name, name' });
      }
    } catch (e) {
      console.warn("조직 정보 자동 등록 중 알림: ", e);
    }

    alert(`${user.name}님의 정보가 업데이트 되었습니다.`); 
    setAllUsers(prev => prev.map(u => u.id === user.id ? { 
      ...u, 
      ...user, 
      is_approved: true,
      headquarters_name: user.hq,
      department_name: user.department,
      branch_name: user.team
    } : u));
  };

  const saveSys = async () => {
    const { error } = await supabase.from("team_settings").upsert([
      { key: 'target_amt', value: String(tarAmt) }, 
      { key: 'target_cnt', value: String(tarCnt) },
      { key: 'team_target_intro', value: String(tarIntro) }, 
      { key: 'actual_intro_cnt', value: String(curIntro) },
      { key: 'global_notice', value: notice }, 
      { key: 'edu_content', value: JSON.stringify(eduWeeks) }
    ], { onConflict: 'key' });

    if (error) {
      alert("저장 중 오류 발생: " + error.message);
    } else {
      alert("시스템 설정이 저장되었습니다.");
      onClose();
    }
  };

  const totalAmt = agents?.reduce((acc: any, curr: any) => acc + (Number(curr.performance?.contract_amt) || 0), 0) || 0;
  const totalCnt = agents?.reduce((acc: any, curr: any) => acc + (Number(curr.performance?.contract_cnt) || 0), 0) || 0;
  const totalDB = agents?.reduce((acc: any, curr: any) => acc + (Number(curr.performance?.db_assigned) || 0), 0) || 0;
  const totalReturn = agents?.reduce((acc: any, curr: any) => acc + (Number(curr.performance?.db_returned) || 0), 0) || 0;

  const getRate = (cur: number, tar: number) => {
    if (!tar || tar === 0) return 0;
    return Math.round((cur / tar) * 100);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 font-sans text-slate-900 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl rounded-[2rem] p-6 md:p-10 relative overflow-y-auto max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200">
        <button onClick={onClose} className="absolute top-6 right-6 md:top-8 md:right-8 text-2xl font-light text-slate-400 hover:text-slate-600 transition-colors z-50">×</button>

        {/* 1. 직원 소속 관리 (마스터만 접근 가능) */}
        {type === 'users' && (
          isMaster ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">직원 조직 관리</h3>
                <p className="text-sm text-slate-500 mt-1">소속 본부, 사업부 및 지점 정보를 설정하고 가입을 승인합니다.</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                        <th className="p-5 w-[250px]">직원 정보</th>
                        <th className="p-5 text-center">본부 / 사업부 / 지점 설정</th>
                        <th className="p-5 text-center w-[160px]">관리 액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allUsers.map((u) => (
                        <tr key={u.id} className={`${u.is_approved ? 'bg-white' : 'bg-amber-50/30'} hover:bg-slate-50 transition-colors`}>
                          <td className="p-5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800">{u.name}</p>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-semibold uppercase">
                                  {rankMap[u.rank] || '설계사'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium">{u.email}</p>
                              {!u.is_approved && <span className="text-amber-600 text-[10px] font-bold mt-1">● 승인 대기 중</span>}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="flex flex-row items-center justify-center gap-2">
                              <select value={u.hq || "시그널그룹"} onChange={(e) => updateUserInfo(u.id, 'hq', e.target.value)} className="flex-1 min-w-[120px] p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-500 outline-none transition-colors">
                                {Array.from({ length: 10 }, (_, i) => `${i + 1}본부`).map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>

                              {u.isCustomDept ? (
                                <input type="text" autoFocus placeholder="사업부 입력" className="flex-1 min-w-[120px] p-2 border border-blue-500 rounded-lg text-xs font-medium bg-white focus:ring-2 ring-blue-100 outline-none" 
                                  value={u.department || ""} onChange={(e) => updateUserInfo(u.id, 'department', e.target.value)} />
                              ) : (
                                <select value={u.department || ""} onChange={(e) => updateUserInfo(u.id, 'department', e.target.value)} className="flex-1 min-w-[120px] p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-500 outline-none transition-colors">
                                  <option value="">사업부 선택</option>
                                  {existingDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                  <option value="CUSTOM_INPUT" className="text-blue-600 font-bold">+ 새 사업부 추가</option>
                                </select>
                              )}

                              {u.isCustomTeam ? (
                                <input type="text" autoFocus placeholder="지점 입력" className="flex-1 min-w-[120px] p-2 border border-blue-500 rounded-lg text-xs font-medium bg-white focus:ring-2 ring-blue-100 outline-none" 
                                  value={u.team || ""} onChange={(e) => updateUserInfo(u.id, 'team', e.target.value)} />
                              ) : (
                                <select value={u.team || ""} onChange={(e) => updateUserInfo(u.id, 'team', e.target.value)} disabled={!u.department && !u.isCustomDept} className="flex-1 min-w-[120px] p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-500 outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-300">
                                  <option value="">지점 선택</option>
                                  {existingTeams.filter(t => t.dept === u.department).map((t, idx) => <option key={idx} value={t.team}>{t.team}</option>)}
                                  <option value="CUSTOM_INPUT" className="text-blue-600 font-bold">+ 새 지점 추가</option>
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <button onClick={() => handleUserSave(u)} className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${u.is_approved ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                              {u.is_approved ? '정보 수정' : '승인 및 저장'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <span className="text-5xl mb-6 grayscale opacity-20">🔒</span>
              <p className="text-xl font-bold text-slate-800">접근 권한이 없습니다</p>
              <p className="text-sm text-slate-400 mt-2 text-center max-w-xs leading-relaxed">이 페이지는 마스터 권한 소유자만 접근할 수 있습니다. 권한이 필요하시면 최고관리자에게 문의하세요.</p>
            </div>
          )
        )}

        {/* 2. 팀 실적 현황 탭 */}
        {type === 'perf' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">팀 실적 모니터링</h3>
              <p className="text-sm text-slate-500 mt-1">조직 전체의 실적 달성 현황을 한눈에 파악합니다.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatBox label="전체 매출 달성률" cur={totalAmt} tar={tarAmt} unit="만원" color="bg-blue-600" />
              <StatBox label="전체 계약 건수 달성률" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="인원 도입 달성률" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mt-8">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-5">직원 성명</th>
                      <th className="p-5 text-center">이달 실적액</th>
                      <th className="p-5 text-center w-[180px]">승인 상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agents?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5 font-bold text-slate-800">{a.name}</td>
                        <td className="p-5 text-center font-bold text-lg text-blue-600">{a.performance?.contract_amt || 0}<span className="text-xs ml-0.5 text-slate-400">만원</span></td>
                        <td className="p-5 text-center">
                          <button onClick={() => handleApprovePerf(a.id, a.performance?.is_approved)} className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${a.performance?.is_approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}>
                            {a.performance?.is_approved ? '● 승인 완료' : '미승인 (클릭 승인)'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. 활동량 분석 탭 */}
        {type === 'act' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">활동 지표 및 깔대기 분석</h3>
              <p className="text-sm text-slate-500 mt-1">영업 활동 프로세스별 효율성을 분석합니다.</p>
            </div>

            {selectedAgent ? (
              <div className="space-y-8">
                <div className="bg-slate-900 p-6 rounded-2xl text-white flex justify-between items-center shadow-lg">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">인디비주얼 리포트</p>
                    <h4 className="text-2xl font-bold tracking-tight text-white">{selectedAgent.name} 설계사 분석</h4>
                  </div>
                  <button onClick={() => handleApprovePerf(selectedAgent.id, selectedAgent.performance?.is_approved)} className={`px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-sm ${selectedAgent.performance?.is_approved ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {selectedAgent.performance?.is_approved ? '실적 승인 취소' : '실적 최종 승인'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center group hover:border-blue-500 transition-all">
                    <p className="text-[11px] text-slate-400 font-bold uppercase mb-2">총 배정 DB</p>
                    <p className="text-3xl font-bold text-slate-800">{selectedAgent.performance?.db_assigned || 0}<span className="text-xs ml-1 text-slate-400">건</span></p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center group hover:border-rose-500 transition-all">
                    <p className="text-[11px] text-slate-400 font-bold uppercase mb-2">반품 DB 건수</p>
                    <p className="text-3xl font-bold text-rose-500">{selectedAgent.performance?.db_returned || 0}<span className="text-xs ml-1 text-slate-400">건</span></p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center group hover:border-amber-500 transition-all">
                    <p className="text-[11px] text-slate-400 font-bold uppercase mb-2">DB 효율 (반품률)</p>
                    <p className="text-3xl font-bold text-amber-600">{getRate(selectedAgent.performance?.db_returned, selectedAgent.performance?.db_assigned)}<span className="text-xs ml-1 text-slate-400">%</span></p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ActivityCountBox label="전화량 (Call)" val={`${selectedAgent.performance?.call || 0}건`} />
                  <ActivityCountBox label="미팅수 (Meet)" val={`${selectedAgent.performance?.meet || 0}건`} />
                  <ActivityCountBox label="제안수 (PT)" val={`${selectedAgent.performance?.pt || 0}건`} />
                  <ActivityCountBox label="지인소개 (Intro)" val={`${selectedAgent.performance?.intro || 0}건`} />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 text-center shadow-sm divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    <div className="py-4 md:py-0"><p className="text-[11px] text-slate-400 font-bold uppercase mb-2">팀 전체 배정 DB</p><p className="text-3xl font-bold text-slate-800">{totalDB}<span className="text-xs ml-1 text-slate-400 font-medium">건</span></p></div>
                    <div className="py-4 md:py-0"><p className="text-[11px] text-slate-400 font-bold uppercase mb-2">팀 전체 반품 DB</p><p className="text-3xl font-bold text-rose-500">{totalReturn}<span className="text-xs ml-1 text-slate-400 font-medium">건</span></p></div>
                    <div className="py-4 md:py-0"><p className="text-[11px] text-slate-400 font-bold uppercase mb-2">전체 평균 반품률</p><p className="text-3xl font-bold text-amber-600">{getRate(totalReturn, totalDB)}<span className="text-xs ml-1 text-slate-400 font-medium">%</span></p></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ActivityCountBox label="전화 합계" val={`${agents?.reduce((s:any,a:any)=>s+(a.performance?.call||0),0) || 0}건`} />
                  <ActivityCountBox label="미팅 합계" val={`${agents?.reduce((s:any,a:any)=>s+(a.performance?.meet||0),0) || 0}건`} />
                  <ActivityCountBox label="제안 합계" val={`${agents?.reduce((s:any,a:any)=>s+(a.performance?.pt||0),0) || 0}건`} />
                  <ActivityCountBox label="소개 합계" val={`${agents?.reduce((s:any,a:any)=>s+(a.performance?.intro||0),0) || 0}건`} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. 출석 및 교육 현황 탭 */}
        {type === 'edu' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">교육 이수 및 출석 현황</h3>
              <p className="text-sm text-slate-500 mt-1">주차별 정기 교육 참여 상태를 확인합니다.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-6 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">직원 성명</th>
                      {[1, 2, 3, 4, 5].map(w => <th key={w} className="p-6 text-center">{w === 5 ? '추가 교육' : w+'주차'}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {agents?.map((a:any) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">{a.name}</td>
                        {[1, 2, 3, 4, 5].map((w) => (
                          <td key={w} className="p-6 text-center">
                            <div className={`w-10 h-10 mx-auto rounded-xl border flex items-center justify-center text-lg transition-all ${a.performance?.[`edu_${w}`] ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-110' : 'bg-slate-50 border-slate-100 text-transparent'}`}>✔</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. 시스템 환경 설정 탭 */}
        {type === 'sys' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">시스템 환경 설정</h3>
                <p className="text-sm text-slate-500 mt-1">조직 전체의 목표 설정 및 공통 게시물을 관리합니다.</p>
              </div>
              <button onClick={saveSys} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">설정 저장</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">달성 목표 설정 (Performance Goals)</p>
                  <InputRow label="팀 월간 매출 목표 (만원)" val={tarAmt} onChange={setTarAmt} />
                  <InputRow label="팀 월간 건수 목표 (건)" val={tarCnt} onChange={setTarCnt} />
                  <InputRow label="팀 월간 도입 목표 (명)" val={tarIntro} onChange={setTarIntro} />
                </div>
                
                <div className="pt-4 space-y-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">전역 공지사항 (Notice)</p>
                  <textarea value={notice} onChange={e=>setNotice(e.target.value)} placeholder="공지사항을 입력하세요..." className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium resize-none" />
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">주간 교육 테마 설정 (Weekly Education)</p>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <div key={w} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm focus-within:border-blue-500 transition-all">
                      <span className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{w === 5 ? '특강' : w+'주'}</span>
                      <input type="text" value={eduWeeks[w as keyof typeof eduWeeks] || ""} onChange={e => setEduWeeks({...eduWeeks, [w]: e.target.value})} placeholder={`${w}주차 교육 내용을 입력하세요`} className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-700" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- 하위 컴포넌트 ---
function ActivityCountBox({ label, val }: any) { 
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center font-sans shadow-sm hover:border-blue-500 transition-all">
      <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-wider">{label}</p>
      <p className="text-xl font-bold text-slate-800">{val || 0}</p>
    </div>
  ) 
}

function StatBox({ label, cur, tar, unit, color }: any) { 
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1); 
  return (
    <div className="text-center space-y-4 p-6 font-sans border border-slate-100 rounded-2xl bg-slate-50/50 shadow-sm">
      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-slate-800 tracking-tight">{cur.toLocaleString()}{unit} <span className="text-slate-300 font-light mx-1">/</span> {tar.toLocaleString()}{unit}</p>
      <div className="w-full h-4 bg-white rounded-full border border-slate-100 overflow-hidden relative shadow-inner">
        <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-bold text-slate-400">{pct}% 달성</p>
    </div>
  ) 
}

function InputRow({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm focus-within:border-blue-500 transition-all">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">{label}</label>
      <input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-24 p-2 bg-slate-50 border border-slate-100 rounded-lg text-center outline-none text-lg font-bold text-blue-600 focus:bg-white transition-colors" />
    </div>
  ) 
}