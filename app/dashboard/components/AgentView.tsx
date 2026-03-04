"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function AgentView({ user, selectedDate }: any) {
  // 탭 상태 관리: 'input' (실적입력), 'edu' (교육확인)
  const [activeTab, setActiveTab] = useState<'input' | 'edu'>('input');
  
  const [performance, setPerformance] = useState<any>({
    call: 0, meet: 0, pt: 0, intro: 0,
    db_assigned: 0, db_returned: 0,
    contract_amt: 0, contract_cnt: 0,
    edu_status: '미참여'
  });
  const [eduNotice, setEduNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => {
    fetchMyData();
  }, [monthKey, user.id]);

  async function fetchMyData() {
    setLoading(true);
    const { data: perf } = await supabase
      .from("daily_perf")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", monthKey)
      .single();

    if (perf) {
      setPerformance(perf);
    } else {
      setPerformance({
        call: 0, meet: 0, pt: 0, intro: 0,
        db_assigned: 0, db_returned: 0,
        contract_amt: 0, contract_cnt: 0,
        edu_status: '미참여'
      });
    }

    const { data: settings } = await supabase.from("team_settings").select("*");
    setEduNotice(settings?.find(s => s.key === 'edu_content')?.value || "현재 설정된 교육 내용이 없습니다.");
    setLoading(false);
  }

  const handleUpdate = async (field: string, value: any) => {
    const updated = { ...performance, [field]: value };
    setPerformance(updated);

    await supabase.from("daily_perf").upsert({
      user_id: user.id,
      date: monthKey,
      ...updated
    }, { onConflict: 'user_id, date' });
  };

  if (loading) return <div className="p-10 font-black italic">Loading Data...</div>;

  return (
    <div className="flex-1 space-y-6 font-black p-4 overflow-y-auto">
      
      {/* 탭 메뉴 상단 배치 */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setActiveTab('input')}
          className={`flex-1 py-4 rounded-2xl border-2 border-black font-black italic transition-all ${activeTab === 'input' ? 'bg-black text-[#d4af37]' : 'bg-white text-black opacity-40'}`}
        >
          PERFORMANCE INPUT
        </button>
        <button 
          onClick={() => setActiveTab('edu')}
          className={`flex-1 py-4 rounded-2xl border-2 border-black font-black italic transition-all ${activeTab === 'edu' ? 'bg-black text-[#d4af37]' : 'bg-white text-black opacity-40'}`}
        >
          EDUCATION CHECK
        </button>
      </div>

      {/* --- 탭 1: 실적 입력 (기존 UI 유지) --- */}
      {activeTab === 'input' && (
        <div className="bg-white p-10 rounded-[4rem] border-4 border-black shadow-2xl space-y-10 animate-in fade-in duration-300">
          <h2 className="text-3xl italic uppercase border-b-8 border-black inline-block font-black">Monthly Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-black">
            <section className="space-y-6">
              <h3 className="text-xl italic text-slate-400 uppercase tracking-tighter border-l-4 border-slate-200 pl-3">Activity</h3>
              <div className="space-y-4">
                <InputItem label="전화량 (Call)" val={performance.call} onChange={(v: number) => handleUpdate('call', v)} />
                <InputItem label="미팅 (Meet)" val={performance.meet} onChange={(v: number) => handleUpdate('meet', v)} />
                <InputItem label="제안 (PT)" val={performance.pt} onChange={(v: number) => handleUpdate('pt', v)} />
                <InputItem label="소개 (Intro)" val={performance.intro} onChange={(v: number) => handleUpdate('intro', v)} />
              </div>
            </section>
            <section className="space-y-6">
              <h3 className="text-xl italic text-slate-400 uppercase tracking-tighter border-l-4 border-slate-200 pl-3">Results</h3>
              <div className="space-y-4">
                <InputItem label="배정 DB" val={performance.db_assigned} onChange={(v: number) => handleUpdate('db_assigned', v)} />
                <InputItem label="반품 DB" val={performance.db_returned} onChange={(v: number) => handleUpdate('db_returned', v)} color="text-rose-500" />
                <div className="pt-4 border-t-2 border-dashed">
                  <InputItem label="계약 실적 (만)" val={performance.contract_amt} onChange={(v: number) => handleUpdate('contract_amt', v)} color="text-indigo-600" />
                  <InputItem label="계약 건수" val={performance.contract_cnt} onChange={(v: number) => handleUpdate('contract_cnt', v)} color="text-indigo-600" />
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* --- 탭 2: 교육 확인 (신규 탭 분리) --- */}
      {activeTab === 'edu' && (
        <div className="bg-white p-10 rounded-[4rem] border-4 border-black shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center border-b-8 border-black pb-4">
            <h2 className="text-3xl italic uppercase font-black">Today's Education</h2>
            <div className={`px-6 py-2 rounded-full font-black italic text-sm ${performance.edu_status === '참여' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              STATUS: {performance.edu_status}
            </div>
          </div>
          
          <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-300">
            <p className="text-xs text-slate-400 uppercase mb-4 tracking-widest font-black italic">Training Notice</p>
            <p className="text-xl mb-12 leading-relaxed font-black italic min-h-[100px]">{eduNotice}</p>
            
            <button 
              onClick={() => handleUpdate('edu_status', performance.edu_status === '참여' ? '미참여' : '참여')}
              className={`w-full flex items-center justify-center gap-6 py-8 rounded-[2rem] text-2xl transition-all shadow-xl font-black italic ${performance.edu_status === '참여' ? 'bg-black text-[#d4af37]' : 'bg-white border-4 border-black text-black'}`}
            >
              <div className={`w-10 h-10 rounded-xl border-4 flex items-center justify-center ${performance.edu_status === '참여' ? 'bg-[#d4af37] border-black text-black' : 'border-black'}`}>
                {performance.edu_status === '참여' && "✓"}
              </div>
              {performance.edu_status === '참여' ? "교육 이수 완료" : "교육 참여 체크하기"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 p-6 rounded-[2.5rem] text-center italic text-[#d4af37] font-black">
        <p className="text-sm uppercase tracking-widest">Team Performance Monitoring System</p>
      </div>
    </div>
  )
}

// 타입 에러 방지를 위해 onChange에 (v: number) 명시
function InputItem({ label, val, onChange, color = "text-black" }: { label: string, val: number, onChange: (v: number) => void, color?: string }) {
  return (
    <div className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:border-black transition-all">
      <label className="text-sm italic font-black text-slate-600 uppercase">{label}</label>
      <input 
        type="number" 
        value={val} 
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-28 bg-transparent text-right text-2xl font-black outline-none ${color}`}
      />
    </div>
  )
}