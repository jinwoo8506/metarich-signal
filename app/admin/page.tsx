"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    // 1. 공지사항 가져오기
    const { data: settings } = await supabase.from("site_settings").select("*").eq("id", "main_notice").single()
    if (settings) setNotice(settings.notice_text)

    // 2. 모든 설계사 및 실적 가져오기
    const { data: users } = await supabase
      .from("users")
      .select(`
        id, employee_id, name,
        monthly_targets ( target_count, target_amount, status, admin_comment ),
        performances ( contract_count, contract_amount )
      `)
      .eq("role", "agent")

    if (users) setAgents(users)
    setLoading(false)
  }

  // ✅ 전 직원 공지사항 업데이트
  async function updateNotice() {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: "main_notice", notice_text: notice })
    
    if (!error) alert("공지사항이 전체 적용되었습니다.")
  }

  // ✅ 개별 설계사 승인 및 코멘트 저장
  async function handleApprove(userId: string, comment: string) {
    const { error } = await supabase
      .from("monthly_targets")
      .update({ status: 'approved', admin_comment: comment })
      .eq("user_id", userId)
      .eq("year", 2026)
      .eq("month", 2)

    if (!error) {
      alert("승인 및 코멘트가 저장되었습니다.")
      fetchInitialData()
    }
  }

  if (loading) return <div className="p-10 font-black">데이터 로딩 중...</div>

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 md:p-12 text-black">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center border-b-4 border-black pb-6">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">Admin Control</h1>
          <button onClick={() => router.push("/dashboard")} className="text-sm font-bold bg-black text-white px-4 py-2 rounded-lg">대시보드 보기</button>
        </div>

        {/* 1. 공지사항 관리 섹션 (전체 적용) */}
        <section className="bg-white p-8 rounded-[2rem] shadow-sm border-2 border-black">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Global Notice (전체 공지사항)</h2>
          <div className="flex gap-4">
            <input 
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
              className="flex-1 bg-slate-50 border-2 border-transparent focus:border-black rounded-xl px-5 py-3 font-bold outline-none transition-all"
              placeholder="전 직원에게 알릴 공지사항을 입력하세요."
            />
            <button onClick={updateNotice} className="bg-[#d4af37] text-black font-black px-8 py-3 rounded-xl hover:bg-[#b8860b]">적용</button>
          </div>
        </section>

        {/* 2. 직원 관리 및 승인 섹션 */}
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Agent Management (설계사 관리)</h2>
          {agents.map((agent) => {
            const target = agent.monthly_targets?.[0] || {}
            const perf = agent.performances?.[0] || {}
            const isApproved = target.status === 'approved'

            return (
              <div key={agent.id} className={`bg-white p-6 rounded-[2rem] border-2 transition-all ${isApproved ? 'border-slate-100 opacity-70' : 'border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]'}`}>
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  {/* 이름 및 실적 정보 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black bg-slate-100 px-2 py-1 rounded uppercase">{agent.employee_id}</span>
                      <h3 className="text-xl font-black">{agent.name}</h3>
                      {isApproved && <span className="text-[10px] font-black text-blue-500 uppercase border border-blue-500 px-2 rounded">Approved</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 text-sm">
                      <p className="font-bold text-slate-500">목표: <span className="text-black">{target.target_count || 0}건 / {target.target_amount?.toLocaleString() || 0}원</span></p>
                      <p className="font-bold text-slate-500">실적: <span className="text-black">{perf.contract_count || 0}건 / {perf.contract_amount?.toLocaleString() || 0}원</span></p>
                    </div>
                  </div>

                  {/* 코멘트 입력 및 승인 버튼 */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <textarea 
                      id={`comment-${agent.id}`}
                      defaultValue={target.admin_comment || ""}
                      placeholder="코멘트를 입력하세요"
                      className="bg-slate-50 border-2 border-transparent focus:border-black rounded-xl px-4 py-2 font-bold text-sm outline-none w-full md:w-64 h-20 md:h-auto"
                    />
                    <button 
                      onClick={() => {
                        const comment = (document.getElementById(`comment-${agent.id}`) as HTMLTextAreaElement).value
                        handleApprove(agent.id, comment)
                      }}
                      disabled={isApproved}
                      className={`px-6 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all ${isApproved ? 'bg-slate-100 text-slate-400' : 'bg-black text-[#d4af37] hover:scale-105'}`}
                    >
                      {isApproved ? "승인완료" : "데이터 승인"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}