"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"

export default function AgentView({ user, selectedDate }: any) {
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
    // 1. 나의 해당 월 실적 가져오기
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

    // 2. 관리자가 설정한 교육 공지 가져오기
    const { data: settings } = await supabase.from("team_settings").select("*");
    setEduNotice(settings?.find(s => s.key === 'edu_content')?.value || "현재 설정된 교육 내용이 없습니다.");
    setLoading(false);
  }

  // 데이터 업데이트 핸들러 (실적 & 교육 공통)
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
      
      {/* 🎓 [신규 추가] 교육 체크리스트 영역 */}
      <div className="bg-white p-8 rounded-[3rem] border-4 border-black shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b-4 border-black pb-2">
          <h2 className="text-2xl italic uppercase font-black">Daily Training Topic</h2>
          <span className="text-[10px] bg-black text-[#d4af37] px-3 py-1 rounded-full italic uppercase">Checklist</span>
        </div>
        <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-300">
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

      {/* 📊 [기존 복구] 실적 입력 영역 */}
      <div className="bg-white p-10 rounded-[4rem] border-4 border-black shadow-2xl space-y-10 font-black">
        <h2 className="text-3xl italic uppercase border-b-8 border-black inline-block">Monthly Performance Input</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* 활동량 섹션 */}
          <section className="space-y-6">
            <h3 className="text-xl italic text-slate-400 uppercase tracking-tighter border-l-4 border-slate-200 pl-3">Activity Data</h3>
            <div className="space-y-4">
              <InputItem label="전화량 (Call)" val={performance.call} onChange={(v) => handleUpdate('call', v)} />
              <InputItem label="미팅 (Meet)" val={performance.meet} onChange={(v) => handleUpdate('meet', v)} />
              <InputItem label="제안 (PT)" val={performance.pt} onChange={(v) => handleUpdate('pt', v)} />
              <InputItem label="소개 (Intro)" val={performance.intro} onChange={(v) => handleUpdate('intro', v)} />
            </div>
          </section>

          {/* DB 및 계약 섹션 */}
          <section className="space-y-6">
            <h3 className="text-xl italic text-slate-400 uppercase tracking-tighter border-l-4 border-slate-200 pl-3">Results & DB</h3>
            <div className="space-y-4">
              <InputItem label="배정 DB" val={performance.db_assigned} onChange={(v) => handleUpdate('db_assigned', v)} />
              <InputItem label="반품 DB" val={performance.db_returned} onChange={(v) => handleUpdate('db_returned', v)} color="text-rose-500" />
              <div className="pt-4 border-t-2 border-dashed">
                <InputItem label="계약 실적 (만)" val={performance.contract_amt} onChange={(v) => handleUpdate('contract_amt', v)} color="text-indigo-600" />
                <InputItem label="계약 건수" val={performance.contract_cnt} onChange={(v) => handleUpdate('contract_cnt', v)} color="text-indigo-600" />
              </div>
            </div>
          </section>
        </div>

        {/* 하단 요약 안내 */}
        <div className="bg-slate-900 p-6 rounded-[2.5rem] text-center italic text-[#d4af37]">
          <p className="text-sm">입력된 데이터는 실시간으로 관리자 화면에 반영됩니다.</p>
        </div>
      </div>
    </div>
  )
}

// 공통 입력 컴포넌트
function InputItem({ label, val, onChange, color = "text-black" }: any) {
  return (
    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:border-black transition-all">
      <label className="text-sm italic font-black text-slate-600">{label}</label>
      <input 
        type="number" 
        value={val} 
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-24 bg-transparent text-right text-xl font-black outline-none ${color}`}
      />
    </div>
  )
}