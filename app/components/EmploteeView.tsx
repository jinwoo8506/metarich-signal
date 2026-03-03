"use client"
import React, { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase" // 수파베이스 설정 파일 경로 확인

export default function EmployeeView({ userId }: { userId: string }) {
  const [perf, setPerf] = useState({
    target_amt: 0, current_amt: 0, target_cnt: 0, current_cnt: 0,
    call: 0, meet: 0, pt: 0, intro: 0, db: 0, ret: 0
  })

  // 🔄 1. 수파베이스에서 내 실적 가져오기
  useEffect(() => {
    async function fetchMyData() {
      const { data, error } = await supabase
        .from("performances") // 테이블 명 확인
        .select("*")
        .eq("user_id", userId) // 내 아이디와 일치하는 데이터만
        .single()

      if (data) {
        setPerf({
          target_amt: data.target_amount,
          current_amt: data.contract_amount,
          target_cnt: data.target_count,
          current_cnt: data.contract_count,
          call: data.call_count,
          meet: data.meet_count,
          pt: data.pt_count,
          intro: data.intro_count,
          db: data.db_assigned,
          ret: data.db_returned
        })
      }
    }
    if (userId) fetchMyData()
  }, [userId])

  // 💾 2. 데이터 저장 (Upsert)
  const handleSave = async () => {
    const { error } = await supabase
      .from("performances")
      .upsert({
        user_id: userId,
        target_amount: perf.target_amt,
        contract_amount: perf.current_amt,
        // ... 나머지 필드들도 동일하게 매칭
      })
    
    if (!error) alert("실적이 성공적으로 저장되었습니다!")
    else alert("저장 실패: " + error.message)
  }

  return (
    <div className="space-y-6">
      {/* ... 기존 입력 UI (InputUnit 등) 동일 ... */}
      <button onClick={handleSave} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase">Save to Database</button>
    </div>
  )
}