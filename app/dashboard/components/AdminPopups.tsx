"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"
import { HEADQUARTER_OPTIONS, canManageRole, getBranch, getDepartment, getHeadquarter, normalizeRole, roleLabel } from "../../../lib/roles"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose, viewer, canEditSystem = true }: any) {
  // --- 상태 관리 ---
  const [tarAmt, setTarAmt] = useState(teamMeta?.targetAmt || 0);
  const [tarCnt, setTarCnt] = useState(teamMeta?.targetCnt || 0);
  const [tarIntro, setTarIntro] = useState(teamMeta?.targetIntro || 0);
  const [curIntro, setCurIntro] = useState(teamMeta?.actualIntro || 0);
  const [notice, setNotice] = useState("");
  const [eduWeeks, setEduWeeks] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });

  const [allUsers, setAllUsers] = useState<any[]>([]); 
  const [existingHeadquarters, setExistingHeadquarters] = useState<string[]>(HEADQUARTER_OPTIONS);
  const [existingDepts, setExistingDepts] = useState<string[]>([]);
  const [existingTeams, setExistingTeams] = useState<{dept: string, team: string}[]>([]);

  // [규칙 반영] UI 표시용 한글 ↔ DB 저장용 영문 매핑
  const rankMap: { [key: string]: string } = {
    'master': '마스터',
    'headquarters': '본부장',
    'leader': '사업부장',
    'manager': '지점장',
    'agent': '설계사',
    'guest': '게스트'
  };

  // [규칙 반영] 권한 체계 (숫자가 낮을수록 높음)
  const rankPriority: { [key: string]: number } = {
    'master': 1,
    'headquarters': 2,
    'leader': 3,
    'manager': 4,
    'agent': 5,
    'guest': 6
  };

  useEffect(() => {
    async function load() {
      // 1. 현재 접속한 관리자 정보 및 권한 확인
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let myRankValue = 100; 

      if (authUser) {
        const { data: myData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();
        if (myData) {
          myRankValue = rankPriority[normalizeRole(myData)] || 100;
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
      
      // 3. 조직 정보 및 유저 리스트 로드 (타입이 'users'일 때만)
      if (type === 'users') {
        const { data: bData } = await supabase.from("branches").select("*");
        if (bData) {
          const hqs = Array.from(new Set([...HEADQUARTER_OPTIONS, ...bData.map(b => b.headquarter || b.headquarter_name || b.hq).filter(Boolean)])) as string[];
          const depts = Array.from(new Set(bData.map(b => b.dept_name || b.department).filter(Boolean))) as string[];
          const teams = bData.map(b => ({ dept: b.dept_name || b.department, team: b.name || b.branch_name }));
          setExistingHeadquarters(hqs);
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
            const userRankValue = rankPriority[normalizeRole(u)] || 999;
            if (myRankValue === 1) return true; // 마스터는 전체 노출
            if (normalizeRole(viewer) === "headquarters") return canManageRole(viewer, u);
            return userRankValue > myRankValue; // 본인보다 하위 직급만 노출
          });

          setAllUsers(filteredUsers.map(u => ({ 
            ...u, 
            rank: normalizeRole(u),
            headquarter: getHeadquarter(u),
            department: getDepartment(u), 
            team: getBranch(u),
            isCustomHeadquarter: false,
            isCustomDept: false, 
            isCustomTeam: false 
          })));
        }
      }
    }
    load();
  }, [type]);

  // 유저 정보 로컬 상태 업데이트
  const updateUserInfo = (userId: string, field: string, value: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const updated = { ...u };
      if (field === 'headquarter') {
        if (value === 'CUSTOM_INPUT') { updated.headquarter = ''; updated.isCustomHeadquarter = true; }
        else { updated.headquarter = value; updated.isCustomHeadquarter = false; }
      } else if (field === 'department') {
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

  // 실적 승인 처리
  const handleApprovePerf = async (agentId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("daily_perf").update({ is_approved: !currentStatus }).eq("user_id", agentId);
    if (error) { alert("오류가 발생했습니다."); } 
    else { alert(!currentStatus ? "승인되었습니다." : "해제되었습니다."); onClose(); }
  };

  // 유저 정보(사업부/지점) DB 저장
  const handleUserSave = async (user: any) => {
    if(!user.headquarter || !user.department || !user.team) {
      alert("본부, 사업부, 지점을 모두 입력해주세요.");
      return;
    }
    const { error } = await supabase.from("users").update({ 
      is_approved: true,
      role: user.rank,
      role_level: user.rank === "headquarters" ? "headquarters" : user.rank === "leader" ? "director" : user.rank,
      rank: user.rank,
      headquarter: user.headquarter,
      headquarter_name: user.headquarter,
      department: user.department,
      team: user.team,
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

  // 시스템 설정 저장
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
  
  // 통계 계산
  const totalAmt = agents?.reduce((s:any, a:any) => s + (a.performance?.contract_amt || 0), 0) || 0;
  const totalCnt = agents?.reduce((s:any, a:any) => s + (a.performance?.contract_cnt || 0), 0) || 0;
  const totalDB = agents?.reduce((s:any, a:any) => s + (a.performance?.db_assigned || 0), 0) || 0;
  const totalReturn = agents?.reduce((s:any, a:any) => s + (a.performance?.db_returned || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 font-black text-slate-900">
      <div className="bg-white w-full max-w-6xl rounded-[2rem] p-6 md:p-8 relative overflow-y-auto max-h-[90vh] border border-slate-200 shadow-2xl">
        <button onClick={onClose} className="absolute top-5 right-5 md:top-6 md:right-6 text-2xl font-black z-50 text-slate-500 hover:text-black">✕</button>

        {/* 1. 직원 관리 탭 */}
        {type === 'users' && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in">
            <h3 className="text-2xl md:text-3xl border-b-4 border-[#1a3a6e] inline-block">조직 관리</h3>
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full min-w-[980px] text-left font-black">
                <thead className="bg-[#1a3a6e] text-white text-[13px] font-black">
                  <tr>
                    <th className="p-4 md:p-5">직원 정보</th>
                    <th className="p-4 md:p-5 text-center">직급 / 본부 / 사업부 / 지점</th>
                    <th className="p-4 md:p-5 text-center">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allUsers.map((u) => (
                    <tr key={u.id} className={`${u.is_approved ? 'bg-white' : 'bg-amber-50'} hover:bg-slate-50 transition-colors`}>
                      <td className="p-4 md:p-6">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-sm md:text-xl">{u.name}</p>
                          {/* DB 영문값을 한글 직급으로 변환 표시 */}
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[13px] rounded-md font-black">
                            {rankMap[u.rank] || roleLabel(u)}
                          </span>
                          {!u.is_approved && <span className="text-rose-500 text-[13px] ml-1">승인대기</span>}
                        </div>
                        <p className="text-[13px] text-slate-400 font-normal mt-1">{u.email}</p>
                      </td>
                      <td className="p-4 md:p-6 text-center">
                        <div className="grid grid-cols-1 gap-2 min-w-[520px] md:grid-cols-4">
                          <select value={u.rank || "agent"} onChange={(e) => updateUserInfo(u.id, 'rank', e.target.value)} className="p-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-[14px] font-black">
                            {Object.entries(rankMap)
                              .filter(([key]) => key !== "master" || normalizeRole(viewer) === "master")
                              .map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                          </select>
                          {u.isCustomHeadquarter ? (
                            <input type="text" autoFocus placeholder="본부 직접 입력" className="p-3 border border-indigo-500 rounded-xl text-[14px] font-black bg-white text-slate-900" value={u.headquarter || ""} onChange={(e) => updateUserInfo(u.id, 'headquarter', e.target.value)} />
                          ) : (
                            <select value={u.headquarter || ""} onChange={(e) => updateUserInfo(u.id, 'headquarter', e.target.value)} className="p-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-[14px] font-black">
                              <option value="">본부 선택</option>
                              {existingHeadquarters.map(h => <option key={h} value={h}>{h}</option>)}
                              <option value="CUSTOM_INPUT" className="text-indigo-600 font-bold">+ 직접 입력</option>
                            </select>
                          )}
                          {u.isCustomDept ? (
                            <input type="text" autoFocus placeholder="사업부 직접 입력" className="p-3 border border-indigo-500 rounded-xl text-[14px] font-black bg-white text-slate-900" value={u.department || ""} onChange={(e) => updateUserInfo(u.id, 'department', e.target.value)} />
                          ) : (
                            <select value={u.department || ""} onChange={(e) => updateUserInfo(u.id, 'department', e.target.value)} className="p-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-[14px] font-black">
                              <option value="">사업부 선택</option>
                              {existingDepts.map(d => <option key={d} value={d}>{d}</option>)}
                              <option value="CUSTOM_INPUT" className="text-indigo-600 font-bold">+ 직접 입력</option>
                            </select>
                          )}
                          {u.isCustomTeam ? (
                            <input type="text" autoFocus placeholder="지점 직접 입력" className="p-3 border border-indigo-500 rounded-xl text-[14px] font-black bg-white text-slate-900" value={u.team || ""} onChange={(e) => updateUserInfo(u.id, 'team', e.target.value)} />
                          ) : (
                            <select value={u.team || ""} onChange={(e) => updateUserInfo(u.id, 'team', e.target.value)} disabled={!u.department && !u.isCustomDept} className="p-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-[14px] font-black disabled:opacity-40">
                              <option value="">지점 선택</option>
                              {existingTeams.filter(t => t.dept === u.department).map((t, idx) => <option key={idx} value={t.team}>{t.team}</option>)}
                              <option value="CUSTOM_INPUT" className="text-indigo-600 font-bold">+ 직접 입력</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="p-4 md:p-6 text-center">
                        <button onClick={() => handleUserSave(u)} className={`px-4 md:px-6 py-2 rounded-full text-[13px] font-black border border-[#1a3a6e] transition-all ${u.is_approved ? 'bg-white text-[#1a3a6e]' : 'bg-[#1a3a6e] text-white'}`}>
                          {u.is_approved ? '정보 저장' : '승인'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. 팀 실적 탭 */}
        {type === 'perf' && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in">
            <h3 className="text-2xl md:text-3xl border-b-4 border-[#1a3a6e] inline-block">실적 관리</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <StatBox label="매출 달성율" cur={totalAmt} tar={tarAmt} unit="만" color="bg-indigo-600" />
              <StatBox label="건수 달성율" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 달성율" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xl mt-6">
              <table className="w-full text-left font-black">
                <thead className="bg-[#1a3a6e] text-white text-[13px]">
                  <tr><th className="p-4 md:p-6">직원</th><th className="p-4 md:p-6 text-center">월 실적</th><th className="p-4 md:p-6 text-center">승인 상태</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {agents?.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 md:p-6 text-sm md:text-xl">{a.name}</td>
                      <td className="p-4 md:p-6 text-center text-lg md:text-2xl">{a.performance?.contract_amt || 0}만</td>
                      <td className="p-4 md:p-6 text-center">
                        <button onClick={() => handleApprovePerf(a.id, a.performance?.is_approved)} className={`px-4 py-2 rounded-full text-[13px] font-black border border-[#1a3a6e] ${a.performance?.is_approved ? 'bg-[#1a3a6e] text-white' : 'bg-white text-[#1a3a6e]'}`}>
                          {a.performance?.is_approved ? '승인완료' : '승인'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. 활동량 분석 탭 */}
        {type === 'act' && (
          <div className="space-y-6 md:space-y-8 font-black animate-in fade-in">
            <h3 className="text-2xl md:text-3xl border-b-4 border-[#1a3a6e] inline-block">활동 및 분석</h3>
            {selectedAgent ? (
              <div className="space-y-6">
                <div className="bg-[#1a3a6e] p-6 rounded-2xl text-white flex justify-between items-center shadow-2xl">
                  <p className="text-xl md:text-3xl font-black underline decoration-[#d4af37] underline-offset-8">{selectedAgent.name} 활동 분석</p>
                  <button onClick={() => handleApprovePerf(selectedAgent.id, selectedAgent.performance?.is_approved)} className={`px-6 py-3 rounded-full text-[13px] font-black ${selectedAgent.performance?.is_approved ? 'bg-rose-600' : 'bg-[#d4af37] text-black'}`}>
                    {selectedAgent.performance?.is_approved ? '승인 해제' : '확인 및 승인'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-6 rounded-2xl border-4 border-black text-center">
                    <p className="text-[10px] text-blue-400 uppercase mb-2">배정 DB</p>
                    <p className="text-2xl font-black italic">{selectedAgent.performance?.db_assigned || 0}건</p>
                  </div>
                  <div className="bg-rose-50 p-6 rounded-2xl border-4 border-black text-center">
                    <p className="text-[10px] text-rose-400 uppercase mb-2">반품 DB</p>
                    <p className="text-2xl font-black italic text-rose-600">{selectedAgent.performance?.db_returned || 0}건</p>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-2xl border-4 border-black text-center text-[#d4af37]">
                    <p className="text-[13px] opacity-70 mb-2">반품율</p>
                    <p className="text-2xl font-black italic">{getRate(selectedAgent.performance?.db_returned, selectedAgent.performance?.db_assigned)}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ActivityCountBox label="전화" val={`${selectedAgent.performance?.call || 0}건`} />
                  <ActivityCountBox label="만남" val={`${selectedAgent.performance?.meet || 0}건`} />
                  <ActivityCountBox label="제안" val={`${selectedAgent.performance?.pt || 0}건`} />
                  <ActivityCountBox label="소개" val={`${selectedAgent.performance?.intro || 0}건`} />
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
                  <ActivityCountBox label="전화 합계" val={`총 ${agents?.reduce((s:any,a:any)=>s+(a.performance?.call||0),0) || 0}건`} />
                  <ActivityCountBox label="만남 합계" val={`총 ${agents?.reduce((s:any,a:any)=>s+(a.performance?.meet||0),0) || 0}건`} />
                  <ActivityCountBox label="제안 합계" val={`총 ${agents?.reduce((s:any,a:any)=>s+(a.performance?.pt||0),0) || 0}건`} />
                  <ActivityCountBox label="소개 합계" val={`총 ${agents?.reduce((s:any,a:any)=>s+(a.performance?.intro||0),0) || 0}건`} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. 교육 및 출석 탭 */}
        {type === 'edu' && (
          <div className="space-y-6 md:space-y-10 font-black animate-in fade-in">
            <h3 className="text-2xl md:text-3xl border-b-4 border-[#1a3a6e] inline-block">교육 및 출석</h3>
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-[#1a3a6e] text-white text-[13px]">
                  <tr>
                    <th className="p-6 sticky left-0 bg-[#1a3a6e]">이름</th>
                    {[1, 2, 3, 4, 5].map(w => <th key={w} className="p-6 text-center">{w === 5 ? 'PLUS' : w+'W'}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black bg-white">
                  {agents?.map((a:any) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-6 font-black text-lg sticky left-0 bg-white border-r border-slate-100">{a.name}</td>
                      {[1, 2, 3, 4, 5].map((w) => (
                        <td key={w} className="p-6 text-center">
                          <div className={`w-10 h-10 mx-auto rounded-xl border-4 flex items-center justify-center text-xl transition-all ${a.performance?.[`edu_${w}`] ? 'bg-black text-[#d4af37] border-black scale-110 shadow-lg' : 'border-slate-100 text-transparent'}`}>✓</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. 시스템 설정 탭 */}
        {type === 'sys' && canEditSystem && (
          <div className="space-y-6 md:space-y-10 font-black animate-in fade-in">
              <div className="flex justify-between items-end border-b border-slate-200 pb-4">
              <h3 className="text-2xl md:text-3xl">시스템 설정</h3>
              <button onClick={saveSys} className="bg-black text-[#d4af37] px-6 py-2 rounded-full text-[13px] font-black hover:invert transition-all">저장</button>
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
        {type === 'sys' && !canEditSystem && (
          <div className="space-y-4 py-12 text-center">
            <h3 className="text-2xl font-black text-[#1a3a6e]">시스템 설정 권한이 없습니다</h3>
            <p className="text-[14px] font-bold text-slate-500">본부장은 조직과 실적 확인 및 조직관리까지만 이용할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// --- 헬퍼 컴포넌트 ---
function ActivityCountBox({ label, val }: any) { 
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center font-black shadow-sm hover:translate-y-[-2px] transition-transform">
      <p className="text-[13px] text-slate-400 mb-2">{label}</p>
      <p className="text-xl font-black">{val || 0}</p>
    </div>
  ) 
}

function StatBox({ label, cur, tar, unit, color }: any) { 
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1); 
  return (
    <div className="text-center space-y-4 p-5 font-black border border-slate-200 rounded-2xl bg-slate-50 shadow-lg">
      <p className="text-[13px] text-slate-400">{label}</p>
      <p className="text-2xl font-black">{cur}{unit} / {tar}{unit}</p>
      <div className="w-full h-10 bg-white rounded-full border border-slate-200 overflow-hidden relative">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs text-white mix-blend-difference font-black">{pct}%</span>
      </div>
    </div>
  ) 
}

function InputRow({ label, val, onChange }: any) { 
  return (
    <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-md">
      <label className="text-[13px] font-black">{label}</label>
      <input type="number" value={val} onChange={e=>onChange(Number(e.target.value))} className="w-28 p-2 bg-white border border-slate-300 rounded-xl text-center outline-none text-xl font-black" />
    </div>
  ) 
}
