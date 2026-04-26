"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function AdminPopups({ type, agents, selectedAgent, teamMeta, onClose }: any) {
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
        const { data: myData } = await supabase.from("users").select("rank").eq("id", authUser.id).single();
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
          } catch (e) { setEduWeeks({ 1: "", 2: "", 3: "", 4: "", 5: "" }); }
        }
      }
      
      if (type === 'users') {
        const { data: bData } = await supabase.from("branches").select("dept_name, name");
        if (bData) {
          const depts = Array.from(new Set(bData.map(b => b.dept_name).filter(Boolean))) as string[];
          setExistingDepts(depts.sort());
          setExistingTeams(bData.map(b => ({ dept: b.dept_name, team: b.name })));
        }

        const { data: uData } = await supabase.from("users").select("*").order("is_approved", { ascending: true }).order("name", { ascending: true });
        if (uData) {
          const filteredUsers = uData.filter(u => (rankPriority[u.rank] || 999) > currentMyRank || currentMyRank === 1);
          setAllUsers(filteredUsers);
        }
      }
    }
    load();
  }, [type]);

  const saveSys = async () => {
    const { error } = await supabase.from("team_settings").upsert([
      { key: 'target_amt', value: String(tarAmt) }, 
      { key: 'target_cnt', value: String(tarCnt) },
      { key: 'team_target_intro', value: String(tarIntro) }, 
      { key: 'actual_intro_cnt', value: String(curIntro) },
      { key: 'global_notice', value: notice }, 
      { key: 'edu_content', value: JSON.stringify(eduWeeks) }
    ], { onConflict: 'key' });
    if (error) alert("저장 중 오류 발생: " + error.message);
    else { alert("시스템 설정이 저장되었습니다."); onClose(); }
  };

  const handleApprovePerf = async (agentId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("daily_perf").update({ is_approved: !currentStatus }).eq("user_id", agentId);
    if (!error) { alert(!currentStatus ? "승인되었습니다." : "해제되었습니다."); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-6xl rounded-[2rem] p-6 md:p-10 relative overflow-y-auto max-h-[90vh] shadow-2xl border border-slate-200">
        <button onClick={onClose} className="absolute top-6 right-6 md:top-8 md:right-8 text-2xl font-light text-slate-400 hover:text-slate-600 transition-colors">×</button>

        {type === 'users' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">직원 조직 관리</h3>
            </div>
            {/* ... (생략된 사용자 리스트 UI) ... */}
            <p className="text-center py-10 opacity-30 italic">리스트 로딩 중...</p>
          </div>
        )}

        {type === 'sys' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">시스템 환경 설정</h3>
              </div>
              <button onClick={saveSys} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">설정 저장</button>
            </div>
            {/* ... (생략된 설정 UI) ... */}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, cur, tar, unit, color }: any) { 
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1); 
  return (
    <div className="text-center space-y-4 p-6 border border-slate-100 rounded-2xl bg-slate-50/50 shadow-sm">
      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-slate-800 tracking-tight">{cur.toLocaleString()}{unit} / {tar.toLocaleString()}{unit}</p>
      <div className="w-full h-4 bg-white rounded-full border border-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  ) 
}