"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function AgentView({ user, selectedDate }: any) {
  // 탭 상태 추가: 'input' (실적입력 - 기본값), 'edu' (교육확인)
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

    const { error } = await supabase.from("daily_perf").upsert({
      user_id: user.id,
      date: monthKey,
      ...updated
    }, { onConflict: 'user_id, date' });

    if (error) alert("저장 중 오류가 발생했습니다.");
  };

  if (loading) return <div className="p-10 font-black italic">Loading Data...</div>;

  return (
    <div className="flex-1 space-y-6 font-black p-4 overflow-y-auto">
      
      {/* 탭 전환 버튼 영역 */}
      <div className="flex gap-2">
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

      {/* --- 탭 1: 실적 입력 (기존 코드 디자인 전체 유지) --- */}
      {activeTab === 'input' && (
        <div className="bg-white p-10 rounded-[4rem] border-4 border-black shadow-2xl space-y-10 font-black animate-in fade-in duration-300">
          <h2 className="text-3xl italic uppercase border-b-8 border-black inline-block font-black">Monthly Performance Input</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-black">
            <section className="space-y-6 font-black">
              <h3 className="text-xl italic text-slate-400 uppercase tracking-tighter border-l-4 border-slate-200 pl-3 font-black">Activity Data</h3>
              <div className="space-y-4 font-black">
                <InputItem label="전화량 (Call)" val={performance.call} onChange={(v: number) => handleUpdate('call', v)} />
                <InputItem label="미팅 (Meet)" val={performance.meet} onChange={(v: number) => handleUpdate('meet', v)} />
                <InputItem label="제안 (PT)" val={performance.pt} onChange={(v: number) => handleUpdate('pt', v)} />
                <InputItem label="소개 (Intro)" val={performance.intro} onChange={(v: number) => handleUpdate('intro', v)} />
              </div>
            </section>

            <section className="space-y-6 font-black">
              <h3 className="text-xl italic text-slate-400 uppercase tracking-tighter border-l-4 border-slate-200 pl-3 font-black">Results & DB</h3>
              <div className="space-y-4 font-black">
                <InputItem label="배정 DB" val={performance.db_assigned} onChange={(v: number) => handleUpdate('db_assigned', v)} />
                <InputItem label="반품 DB" val={performance.db_returned} onChange={(v: number) => handleUpdate('db_returned', v)} color="text-rose-500" />
                <div className="pt-4 border-t-2 border-dashed font-black">
                  <InputItem label="계약 실적 (만)" val={performance.contract_amt} onChange={(v: number) => handleUpdate('contract_amt', v)} color="text-indigo-600" />
                  <InputItem label="계약 건수" val={performance.contract_cnt} onChange={(v: number) => handleUpdate('contract_cnt', v)} color="text-indigo-600" />
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* --- 탭 2: 교육 확인 (요청하신 교육 내용 영역) --- */}
      {activeTab === 'edu' && (
        <div className="bg-white p-8 rounded-[3rem] border-4 border-black shadow-xl space-y-6 font-black animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center border-b-4 border-black pb-2 font-black">
            <h2 className="text-2xl italic uppercase font-black">Daily Training Topic</h2>
            <span className={`px-4 py-1 rounded-full text-[10px] italic font-black ${performance.edu_status === '참여' ? 'bg-emerald-500 text-white' : 'bg-black text-[#d4af37]'}`}>
              {performance.edu_status === '참여' ? 'COMPLETED' : 'PENDING'}
            </span>
          </div>
          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-300 font-black">
            <p className="text-lg mb-8 leading-relaxed font-black italic">{eduNotice}</p>
            
            <button 
              onClick={() => handleUpdate('edu_status', performance.edu_status === '참여' ? '미참여' : '참여')}
              className={`w-full flex items-center justify-center gap-4 py-5 rounded-2xl text-lg transition-all shadow-md font-black italic ${performance.edu_status === '참여' ? 'bg-black text-[#d4af37]' : 'bg-white border-2 border-black text-black'}`}
            >
              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${performance.edu_status === '참여' ? 'bg-[#d4af37] border-black text-black' : 'border-black'}`}>
                {performance.edu_status === '참여' && "✓"}
              </div>
              오늘의 교육을 완료했습니다
            </button>
          </div>
        </div>
      )}

      {/* 하단 요약 안내 */}
      <div className="bg-slate-900 p-6 rounded-[2.5rem] text-center italic text-[#d4af37] font-black">
        <p className="text-sm font-black uppercase tracking-widest">Real-time Performance Synchronization</p>
      </div>
    </div>
  )
}

// 공통 입력 컴포넌트 (타입 명시 추가)
function InputItem({ label, val, onChange, color = "text-black" }: { label: string, val: number, onChange: (v: number) => void, color?: string }) {
  return (
    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:border-black transition-all font-black">
      <label className="text-sm italic font-black text-slate-600 font-black">{label}</label>
      <input 
        type="number" 
        value={val} 
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-24 bg-transparent text-right text-xl font-black outline-none ${color}`}
      />
    </div>
  )
}