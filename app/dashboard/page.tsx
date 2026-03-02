"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Calendar from "react-calendar"
import 'react-calendar/dist/Calendar.css'

// ─── 타입 정의 ────────────────────────────────────────────────────────────────
interface Performance {
  year: number;
  month: number;
  contract_count?: number;
  contract_amount?: number;
  ap?: number;
  pt?: number;
  call_count?: number;
  meet_count?: number;
  intro_count?: number;
  recruit_count?: number;
  db_assigned?: number;
  db_returned?: number;
}
interface MonthlyTarget {
  year: number;
  month: number;
  target_count?: number;
  target_amount?: number;
  status?: string;
  admin_comment?: string;
}
interface Agent {
  id: string;
  name: string;
  monthly_targets?: MonthlyTarget[];
  performances?: Performance[];
}

// ─── 서브 컴포넌트: 레이더 차트 ──────────────────────────────────────────────
function RadarChart({ data, size = 180 }: { data: {label:string;value:number;max:number}[]; size?: number }) {
  const cx = size/2, cy = size/2, r = size*0.35, n = data.length
  const angleStep = (2*Math.PI)/n
  const pt = (i: number, ratio: number) => {
    const a = i*angleStep - Math.PI/2
    return [cx + r*ratio*Math.cos(a), cy + r*ratio*Math.sin(a)]
  }
  const polyPoints = data.map((d,i) => pt(i, Math.min(d.value/d.max,1)).join(",")).join(" ")
  return (
    <svg width={size} height={size} style={{ overflow:"visible" }}>
      {[0.25,0.5,0.75,1].map((ratio,ri) => (
        <polygon key={ri} points={Array.from({length:n},(_,i)=>pt(i,ratio).join(",")).join(" ")}
          fill={ri%2===0?"#f8fafc":"#f1f5f9"} stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {data.map((_,i)=>{const[x,y]=pt(i,1);return<line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1"/>})}
      <polygon points={polyPoints} fill="#d4af37" fillOpacity="0.2" stroke="#d4af37" strokeWidth="2.5" strokeLinejoin="round"/>
      {data.map((d,i)=>{const[x,y]=pt(i,Math.min(d.value/d.max,1));return(
        <g key={i}><circle cx={x} cy={y} r={8} fill="#d4af37" fillOpacity="0.15"/><circle cx={x} cy={y} r={4} fill="#d4af37" stroke="white" strokeWidth="2"/></g>
      )})}
      {data.map((d,i)=>{const[x,y]=pt(i,1.3);const pct=Math.round((d.value/d.max)*100);return(
        <g key={i}>
          <text x={x} y={y-4} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="800">{d.label}</text>
          <text x={x} y={y+9} textAnchor="middle" fill="#d4af37" fontSize="10" fontWeight="900">{pct}%</text>
        </g>
      )})}
    </svg>
  )
}

// ─── 서브 컴포넌트: 도넛 차트 ────────────────────────────────────────────────
function DonutChart({ value, max, color, size=120, label, sub }: any) {
  const r = (size-12)/2, circ = 2*Math.PI*r, pct = Math.min(value/Math.max(max,1),1), cx=size/2
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f1f5f9" strokeWidth={11}/>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={11}
            strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
            strokeLinecap="round" style={{transition:"stroke-dashoffset 1.2s ease"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:size*0.19,fontWeight:900,color,lineHeight:1}}>{Math.round(pct*100)}%</span>
          <span style={{fontSize:size*0.09,color:"#94a3b8",fontWeight:700,marginTop:2}}>{value}/{max}</span>
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <p style={{fontSize:11,fontWeight:900,color:"#1e293b"}}>{label}</p>
        <p style={{fontSize:9,color:"#94a3b8",fontWeight:700}}>{sub}</p>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트: 전환율 화살표 ────────────────────────────────────────────
function ConversionFlow({ calls, meets, pts, contracts }: { calls:number; meets:number; pts:number; contracts:number }) {
  const arr = [
    { label:"전화", value: calls, color:"#10b981" },
    { label:"미팅", value: meets, color:"#f59e0b", rate: calls>0 ? Math.round((meets/calls)*100) : 0 },
    { label:"제안", value: pts, color:"#8b5cf6", rate: meets>0 ? Math.round((pts/meets)*100) : 0 },
    { label:"체결", value: contracts, color:"#d4af37", rate: pts>0 ? Math.round((contracts/pts)*100) : 0 },
  ]
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,overflowX:"auto",paddingBottom:4}}>
      {arr.map((s,i) => (
        <div key={s.label} style={{display:"flex",alignItems:"center",gap:0,flexShrink:0}}>
          <div style={{textAlign:"center",background:s.color+"18",borderRadius:16,padding:"12px 14px",border:`2px solid ${s.color}30`,minWidth:72}}>
            <p style={{fontSize:9,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{s.label}</p>
            <p style={{fontSize:22,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</p>
            <p style={{fontSize:8,color:"#94a3b8",marginTop:2}}>건</p>
          </div>
          {i < arr.length-1 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"0 8px"}}>
              <p style={{fontSize:9,fontWeight:800,color:(arr[i+1] as any).rate>=50?"#10b981":"#f43f5e",marginBottom:2}}>{(arr[i+1] as any).rate}%</p>
              <span style={{fontSize:18,color:"#cbd5e1"}}>→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── 서브 컴포넌트: 전월 비교 Badge ─────────────────────────────────────────
function CompareBadge({ current, prev, unit }: { current:number; prev:number; unit:string }) {
  const diff = current - prev
  if (prev === 0 && current === 0) return <span style={{fontSize:9,color:"#94a3b8"}}>-</span>
  const up = diff >= 0
  return (
    <span style={{fontSize:9,fontWeight:800,color:up?"#10b981":"#ef4444",background:up?"#f0fdf4":"#fef2f2",padding:"2px 6px",borderRadius:999,border:`1px solid ${up?"#bbf7d0":"#fecaca"}`}}>
      {up?"▲":"▼"} {Math.abs(diff)}{unit}
    </span>
  )
}

// ─── 서브 컴포넌트: 진행바 ───────────────────────────────────────────────────
function ProgressBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current/target)*100, 100) : 0
  return (
    <div style={{width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:800,marginBottom:6,textTransform:"uppercase"}}>
        <span>{label} ({current}/{target}{unit})</span>
        <span style={{color}}>{Math.round(rate)}%</span>
      </div>
      <div style={{background:"#f1f5f9",borderRadius:999,height:10,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${rate}%`,background:color,borderRadius:999,transition:"width 0.7s"}}/>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트: 미니바 ───────────────────────────────────────────────────
function MiniBar({ label, current, target, unit, color }: any) {
  const rate = target > 0 ? Math.min((current/target)*100, 100) : 0
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>
        <span>{label}</span><span>{Math.round(rate)}%</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontWeight:700,marginBottom:4}}>
        <span>현황: {current}{unit}</span><span style={{color:"#94a3b8"}}>목표: {target}{unit}</span>
      </div>
      <div style={{background:"#f1f5f9",borderRadius:999,height:5,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${rate}%`,background:color,borderRadius:999}}/>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트: 인풋 ────────────────────────────────────────────────────
function InBox({ label, value, onChange, unit, disabled, highlight }: any) {
  return (
    <div style={{marginBottom:4}}>
      <label style={{fontSize:10,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6,paddingLeft:4}}>{label}</label>
      <div style={{position:"relative"}}>
        <input disabled={disabled} type="number" value={value||0}
          onChange={(e)=>(onChange ? onChange(Number(e.target.value)) : null)}
          style={{width:"100%",padding:"16px 56px 16px 20px",borderRadius:20,fontSize:22,fontWeight:900,outline:"none",border:`2.5px solid ${highlight?"#bfdbfe":disabled?"#e2e8f0":"#f1f5f9"}`,background:highlight?"#eff6ff":disabled?"#f8fafc":"#f8fafc",color:highlight?"#1d4ed8":disabled?"#94a3b8":"#0f172a",fontFamily:"inherit",transition:"border 0.2s"}}
          onFocus={(e)=>{ if(!disabled) e.target.style.border="2.5px solid #1e293b" }}
          onBlur={(e)=>{ e.target.style.border=`2.5px solid ${highlight?"#bfdbfe":disabled?"#e2e8f0":"#f1f5f9"}` }} />
        <span style={{position:"absolute",right:18,top:"50%",transform:"translateY(-50%)",fontSize:10,fontWeight:800,color:"#94a3b8"}}>{unit}</span>
      </div>
    </div>
  )
}

// ─── 서브 컴포넌트: 활동탭 ──────────────────────────────────────────────────
function ActivityTab({ label, value, onChange, color, bg, unit }: any) {
  return (
    <div style={{background:bg,borderRadius:18,padding:"12px 10px",textAlign:"center",border:`2px solid ${color}20`,transition:"transform 0.2s"}}
      onMouseEnter={e=>(e.currentTarget.style.transform="translateY(-2px)")}
      onMouseLeave={e=>(e.currentTarget.style.transform="translateY(0)")}>
      <p style={{fontSize:9,fontWeight:800,color,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{label}</p>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:2}}>
        <input type="number" value={value||0} onChange={(e)=>onChange(Number(e.target.value))}
          style={{width:44,background:"transparent",textAlign:"center",fontSize:24,fontWeight:900,outline:"none",border:"none",color,fontFamily:"inherit"}}/>
        <span style={{fontSize:9,fontWeight:700,color}}>{unit}</span>
      </div>
    </div>
  )
}

// ─── 영업 계산기 모달 ────────────────────────────────────────────────────────
function BizToolModal({ onClose, activeTool, setActiveTool, compMonth, setCompMonth, compYear, setCompYear, compWait, setCompWait, bankRate, setBankRate, infMoney, setInfMoney, infRate, setInfRate, intMoney, setIntMoney, intRate, setIntRate, intYear, setIntYear }: any) {
  const bankResult = compMonth * compYear * 12 + (compMonth * compYear * 12 * (bankRate/100) * (compYear + compWait))
  const insuResult = compMonth * compYear * 12 * 1.24
  const tools = [
    {key:"compare",label:"🏦 은행 vs 보험"},
    {key:"inflation",label:"📉 화폐가치"},
    {key:"interest",label:"📈 복리마법"},
  ]
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",width:"100%",maxWidth:700,borderRadius:28,overflow:"hidden",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.3)"}}>
        {/* 헤더 */}
        <div style={{background:"#0f172a",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {tools.map(t=>(
              <button key={t.key} onClick={()=>setActiveTool(t.key)}
                style={{padding:"8px 14px",borderRadius:12,fontWeight:800,fontSize:11,border:"none",cursor:"pointer",background:activeTool===t.key?"#d4af37":"rgba(255,255,255,0.1)",color:activeTool===t.key?"#0f172a":"white",transition:"all 0.2s"}}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"white",width:34,height:34,borderRadius:10,cursor:"pointer",fontWeight:900,fontSize:16}}>✕</button>
        </div>
        {/* 내용 */}
        <div style={{flex:1,overflowY:"auto",padding:24}}>
          {activeTool==="compare" && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
                {[{label:"월 납입액",val:compMonth,set:setCompMonth,unit:"만원"},{label:"납입 기간",val:compYear,set:setCompYear,unit:"년"},{label:"거치 기간",val:compWait,set:setCompWait,unit:"년"},{label:"은행 금리",val:bankRate,set:setBankRate,unit:"%"}].map(f=>(
                  <div key={f.label} style={{background:"#f8fafc",borderRadius:14,padding:"10px 14px"}}>
                    <p style={{fontSize:9,fontWeight:800,color:"#94a3b8",marginBottom:4}}>{f.label}</p>
                    <div style={{display:"flex",alignItems:"baseline",gap:3}}>
                      <input type="number" value={f.val} onChange={e=>f.set(Number(e.target.value))}
                        style={{fontSize:20,fontWeight:900,color:"#0f172a",background:"transparent",border:"none",outline:"none",width:"100%",fontFamily:"inherit"}}/>
                      <span style={{fontSize:9,color:"#94a3b8"}}>{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div style={{background:"#f8fafc",borderRadius:20,padding:20,textAlign:"center"}}>
                  <p style={{fontSize:11,fontWeight:800,color:"#64748b",marginBottom:8}}>🏦 은행 (단리 합계)</p>
                  <p style={{fontSize:32,fontWeight:900,color:"#0f172a"}}>{Math.round(bankResult).toLocaleString()}<span style={{fontSize:13,marginLeft:4}}>만원</span></p>
                </div>
                <div style={{background:"#fffbeb",border:"2px solid #fde68a",borderRadius:20,padding:20,textAlign:"center"}}>
                  <p style={{fontSize:11,fontWeight:800,color:"#92400e",marginBottom:8}}>🛡️ 보험 (예시 124%)</p>
                  <p style={{fontSize:32,fontWeight:900,color:"#d4af37"}}>{Math.round(insuResult).toLocaleString()}<span style={{fontSize:13,marginLeft:4}}>만원</span></p>
                </div>
              </div>
              <div style={{background:insuResult>bankResult?"#ecfdf5":"#fef2f2",borderRadius:14,padding:"14px 20px",textAlign:"center"}}>
                <p style={{fontSize:14,fontWeight:900,color:insuResult>bankResult?"#059669":"#dc2626"}}>
                  {insuResult>bankResult?`💰 보험이 ${Math.round(insuResult-bankResult).toLocaleString()}만원 더 유리!`:`📉 은행이 ${Math.round(bankResult-insuResult).toLocaleString()}만원 더 유리`}
                </p>
              </div>
            </div>
          )}
          {activeTool==="inflation" && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:380,margin:"0 auto 24px"}}>
                {[{label:"현재 자산",val:infMoney,set:setInfMoney,unit:"만원"},{label:"물가 상승률",val:infRate,set:setInfRate,unit:"%"},{label:"경과 기간",val:compWait,set:setCompWait,unit:"년"}].map(f=>(
                  <div key={f.label} style={{background:"#fff1f2",borderRadius:14,padding:"10px 14px"}}>
                    <p style={{fontSize:9,fontWeight:800,color:"#94a3b8",marginBottom:4}}>{f.label}</p>
                    <div style={{display:"flex",alignItems:"baseline",gap:3}}>
                      <input type="number" value={f.val} onChange={e=>f.set(Number(e.target.value))}
                        style={{fontSize:20,fontWeight:900,color:"#dc2626",background:"transparent",border:"none",outline:"none",width:"100%",fontFamily:"inherit"}}/>
                      <span style={{fontSize:9,color:"#94a3b8"}}>{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {[10,20,30].map(yr=>{
                  const real=Math.round(infMoney/Math.pow(1+infRate/100,yr))
                  const loss=Math.round((1-real/Math.max(infMoney,1))*100)
                  return(
                    <div key={yr} style={{background:"white",border:"2px solid #fee2e2",borderRadius:18,padding:16,position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",top:0,right:0,background:"#ef4444",color:"white",fontSize:9,fontWeight:800,padding:"3px 8px",borderBottomLeftRadius:10}}>{yr}년 후</div>
                      <p style={{fontSize:9,fontWeight:800,color:"#94a3b8",marginBottom:6,marginTop:8}}>실질 가치</p>
                      <p style={{fontSize:26,fontWeight:900,color:"#0f172a"}}>{real.toLocaleString()}<span style={{fontSize:11}}>만</span></p>
                      <div style={{background:"#f1f5f9",borderRadius:999,height:5,overflow:"hidden",margin:"8px 0"}}>
                        <div style={{height:"100%",width:`${100-loss}%`,background:"#ef4444",borderRadius:999}}/>
                      </div>
                      <p style={{fontSize:11,fontWeight:800,color:"#ef4444"}}>-{loss}% 감소</p>
                    </div>
                  )
                })}
              </div>
              <p style={{textAlign:"center",marginTop:16,fontSize:11,color:"#94a3b8",fontStyle:"italic"}}>"가만히 저축만 하면, 돈의 가치가 이렇게 사라집니다."</p>
            </div>
          )}
          {activeTool==="interest" && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
                {[{label:"투자 원금",val:intMoney,set:setIntMoney,unit:"만원"},{label:"기대 수익률",val:intRate,set:setIntRate,unit:"%"},{label:"투자 기간",val:intYear,set:setIntYear,unit:"년"}].map(f=>(
                  <div key={f.label} style={{background:"#f0fdf4",borderRadius:14,padding:"10px 14px"}}>
                    <p style={{fontSize:9,fontWeight:800,color:"#94a3b8",marginBottom:4}}>{f.label}</p>
                    <div style={{display:"flex",alignItems:"baseline",gap:3}}>
                      <input type="number" value={f.val} onChange={e=>f.set(Number(e.target.value))}
                        style={{fontSize:20,fontWeight:900,color:"#059669",background:"transparent",border:"none",outline:"none",width:"100%",fontFamily:"inherit"}}/>
                      <span style={{fontSize:9,color:"#94a3b8"}}>{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div style={{background:"#f8fafc",borderRadius:20,padding:20,textAlign:"center"}}>
                  <p style={{fontSize:11,fontWeight:800,color:"#64748b",marginBottom:8}}>📏 단리</p>
                  <p style={{fontSize:28,fontWeight:900,color:"#0f172a"}}>{Math.round(intMoney+(intMoney*(intRate/100)*intYear)).toLocaleString()}<span style={{fontSize:12,marginLeft:4}}>만원</span></p>
                </div>
                <div style={{background:"#ecfdf5",border:"2px solid #a7f3d0",borderRadius:20,padding:20,textAlign:"center"}}>
                  <p style={{fontSize:11,fontWeight:800,color:"#065f46",marginBottom:8}}>🔁 복리 (마법)</p>
                  <p style={{fontSize:28,fontWeight:900,color:"#059669"}}>{Math.round(intMoney*Math.pow(1+intRate/100,intYear)).toLocaleString()}<span style={{fontSize:12,marginLeft:4}}>만원</span></p>
                </div>
              </div>
              <div style={{background:"#ecfdf5",borderRadius:14,padding:"14px 20px",textAlign:"center"}}>
                <p style={{fontSize:14,fontWeight:900,color:"#059669"}}>
                  💡 복리가 <strong>{Math.round((intMoney*Math.pow(1+intRate/100,intYear))-(intMoney+(intMoney*(intRate/100)*intYear))).toLocaleString()}만원</strong> 더 많습니다
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string|null>(null)
  const [userName, setUserName] = useState<string|null>(null)
  const [userId, setUserId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [personalMemo, setPersonalMemo] = useState("")
  const [dailySpecialNote, setDailySpecialNote] = useState("")
  const [goal, setGoal] = useState(0)
  const [targetAmount, setTargetAmount] = useState(0)
  const [contract, setContract] = useState(0)
  const [contractAmount, setContractAmount] = useState(0)
  const [ap, setAp] = useState(0)
  const [pt, setPt] = useState(0)
  const [calls, setCalls] = useState(0)
  const [meets, setMeets] = useState(0)
  const [intros, setIntros] = useState(0)
  const [recruits, setRecruits] = useState(0)
  const [dbAssigned, setDbAssigned] = useState(0)
  const [dbReturned, setDbReturned] = useState(0)
  const [isApproved, setIsApproved] = useState(false)
  const [teamGoal, setTeamGoal] = useState({count:100,amount:1000,recruit:5})
  const [isTeamGoalModalOpen, setIsTeamGoalModalOpen] = useState(false)
  const [globalNotice, setGlobalNotice] = useState("메타리치 시그널에 오신 것을 환영합니다.")
  const [isNoticeOpen, setIsNoticeOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent|null>(null)
  const [editingComment, setEditingComment] = useState("")
  // 4대 탭
  const [adminTab, setAdminTab] = useState<"activity"|"trend"|"db"|"edit">("activity")
  const [isBizToolOpen, setIsBizToolOpen] = useState(false)
  const [activeTool, setActiveTool] = useState<"compare"|"inflation"|"interest">("compare")
  const [compMonth, setCompMonth] = useState(50)
  const [compYear, setCompYear] = useState(5)
  const [compWait, setCompWait] = useState(5)
  const [bankRate, setBankRate] = useState(2)
  const [infMoney, setInfMoney] = useState(100)
  const [infRate, setInfRate] = useState(3)
  const [intMoney, setIntMoney] = useState(1000)
  const [intRate, setIntRate] = useState(5)
  const [intYear, setIntYear] = useState(20)
  // 모바일 사이드바
  const [mobileSideOpen, setMobileSideOpen] = useState(false)

  const currentYear = selectedDate.getFullYear()
  const currentMonth = selectedDate.getMonth()+1
  const prevMonthDate = new Date(currentYear, currentMonth-2, 1)
  const lastYear = prevMonthDate.getFullYear()
  const lastMonth = prevMonthDate.getMonth()+1

  useEffect(()=>{ checkUser() },[])
  useEffect(()=>{ if(userId) fetchDailyData(selectedDate) },[selectedDate,userId])

  async function checkUser() {
    const {data:{session}} = await supabase.auth.getSession()
    if(!session) return router.replace("/login")
    const {data:userInfo} = await supabase.from("users").select("name, role").eq("id",session.user.id).maybeSingle()
    if(!userInfo){await supabase.auth.signOut();return router.replace("/login")}
    setUserId(session.user.id);setRole(userInfo.role);setUserName(userInfo.name)
    fetchTeamGoal()
    if(userInfo.role==="admin"||userInfo.role==="master") fetchAdminData()
    if(userInfo.role==="agent"||userInfo.role==="master") fetchAgentData(session.user.id)
    setLoading(false)
  }

  async function fetchDailyData(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const {data:notice} = await supabase.from("daily_notes").select("admin_notice").eq("date",dateStr).limit(1).maybeSingle()
    const {data:myData} = await supabase.from("daily_notes").select("agent_memo").eq("user_id",userId).eq("date",dateStr).maybeSingle()
    setDailySpecialNote(notice?.admin_notice||"");setPersonalMemo(myData?.agent_memo||"")
  }

  async function fetchTeamGoal() {
    const {data} = await supabase.from("team_goals").select("*").eq("id","current_team_goal").maybeSingle()
    if(data){setTeamGoal({count:Number(data.total_goal_count||0),amount:Number(data.total_goal_amount||0),recruit:Number(data.total_goal_recruit||0)});setGlobalNotice(data.global_notice||"")}
  }

  async function fetchAdminData() {
    const {data} = await supabase.from("users").select(`id, name, monthly_targets(*), performances(*)`).eq("role","agent")
    if(data) setAgents(data as Agent[])
  }

  async function fetchAgentData(id: string) {
    const {data:t} = await supabase.from("monthly_targets").select("*").eq("user_id",id).eq("year",currentYear).eq("month",currentMonth).maybeSingle()
    const {data:p} = await supabase.from("performances").select("*").eq("user_id",id).eq("year",currentYear).eq("month",currentMonth).maybeSingle()
    if(t){setGoal(t.target_count||0);setTargetAmount(t.target_amount||0);setIsApproved(t.status==="approved")}
    else{setGoal(0);setTargetAmount(0);setIsApproved(false)}
    if(p){setAp(p.ap||0);setPt(p.pt||0);setContract(p.contract_count||0);setContractAmount(p.contract_amount||0);setCalls(p.call_count||0);setMeets(p.meet_count||0);setIntros(p.intro_count||0);setRecruits(p.recruit_count||0);setDbAssigned(p.db_assigned||0);setDbReturned(p.db_returned||0)}
    else{setAp(0);setPt(0);setContract(0);setContractAmount(0);setCalls(0);setMeets(0);setIntros(0);setRecruits(0);setDbAssigned(0);setDbReturned(0)}
  }

  const handleAgentSave = async () => {
    const payloadT = {user_id:userId,year:currentYear,month:currentMonth,target_count:Number(goal),target_amount:Number(targetAmount),status:isApproved?"approved":"pending"}
    const payloadP = {user_id:userId,year:currentYear,month:currentMonth,ap:Number(ap),pt:Number(pt),contract_count:Number(contract),contract_amount:Number(contractAmount),call_count:Number(calls),meet_count:Number(meets),intro_count:Number(intros),recruit_count:Number(recruits),db_assigned:Number(dbAssigned),db_returned:Number(dbReturned)}
    await supabase.from("monthly_targets").upsert(payloadT,{onConflict:"user_id, year, month"})
    await supabase.from("performances").upsert(payloadP,{onConflict:"user_id, year, month"})
    alert("데이터 저장 완료")
  }

  const getAlertStyle = (agent: Agent) => {
    const p = (agent.performances||[]).find(pf=>pf.year===currentYear&&pf.month===currentMonth)||{contract_amount:0}
    const amt = p.contract_amount||0
    if(amt<30) return {border:"2px solid #ef4444",boxShadow:"0 0 0 4px rgba(239,68,68,0.15)",animation:"pulseRed 1.2s infinite"}
    return {border:"2px solid #e2e8f0"}
  }

  if(loading) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f4f8",fontWeight:900,fontSize:24,color:"#1e293b",letterSpacing:"0.1em"}}>
      ⚡ SIGNAL LOADING...
    </div>
  )

  const totalDoneC = agents.reduce((s,a)=>s+((a.performances||[]).find(p=>p.year===currentYear&&p.month===currentMonth)?.contract_count||0),0)
  const totalDoneA = agents.reduce((s,a)=>s+((a.performances||[]).find(p=>p.year===currentYear&&p.month===currentMonth)?.contract_amount||0),0)
  const totalDoneR = agents.reduce((s,a)=>s+((a.performances||[]).find(p=>p.year===currentYear&&p.month===currentMonth)?.recruit_count||0),0)
  const isAdmin = role==="admin"||role==="master"
  const isAgent = role==="agent"||role==="master"

  // 3개월 평균 (에이전트용)
  const get3MonthAvg = () => {
    const months = [0,1,2].map(i=>{ const d=new Date(currentYear,currentMonth-2-i,1); return {y:d.getFullYear(),m:d.getMonth()+1} })
    return months
  }

  const adminTabs = [
    {key:"activity",label:"활동 관리",icon:"📊"},
    {key:"trend",label:"3개월 실적",icon:"📈"},
    {key:"db",label:"DB 관리",icon:"🗄️"},
    {key:"edit",label:"실적 수정",icon:"✏️"},
  ]

  // ── 공통 사이드바 내용 ──
  const SidebarContent = () => (
    <div style={{display:"flex",flexDirection:"column",gap:16,height:"100%"}}>
      {/* 로고 */}
      <div style={{paddingBottom:14,borderBottom:"1.5px solid #f1f5f9",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:32,height:32,background:"#1e293b",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:14}}>⚡</span>
        </div>
        <div>
          <p style={{fontSize:12,fontWeight:900,color:"#1e293b",letterSpacing:"0.05em"}}>METARICH SIGNAL</p>
          <p style={{fontSize:8,color:"#94a3b8",fontWeight:700,letterSpacing:"0.08em"}}>v4.5 Management System</p>
        </div>
      </div>

      {/* 캘린더 */}
      <div>
        <Calendar onChange={(d:any)=>setSelectedDate(d)} value={selectedDate}
          calendarType="gregory" formatDay={(_,date)=>date.getDate().toString()}
          className="custom-calendar rounded-2xl border-0" />
      </div>

      {/* 교육/특별사항 */}
      <div>
        <p style={{fontSize:8,fontWeight:800,color:"#3b82f6",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>📋 교육/특별사항</p>
        <textarea readOnly={role==="agent"} value={dailySpecialNote} onChange={e=>setDailySpecialNote(e.target.value)}
          placeholder="교육/특별사항"
          style={{width:"100%",background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:14,padding:"10px 12px",fontSize:11,color:"#1d4ed8",resize:"none",height:72,fontFamily:"inherit",outline:"none",fontWeight:600}}/>
      </div>

      {/* 개인 메모 */}
      <div>
        <p style={{fontSize:8,fontWeight:800,color:"#64748b",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>🔒 개인 메모</p>
        <textarea value={personalMemo} onChange={e=>setPersonalMemo(e.target.value)}
          placeholder="개인 메모"
          style={{width:"100%",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"10px 12px",fontSize:11,color:"#374151",resize:"none",height:72,fontFamily:"inherit",outline:"none",fontWeight:600}}/>
      </div>

      <button onClick={async()=>{
        const dateStr=selectedDate.toISOString().split('T')[0]
        await supabase.from("daily_notes").upsert({user_id:userId,date:dateStr,agent_memo:personalMemo,...((role!=="agent")&&{admin_notice:dailySpecialNote})},{onConflict:"user_id, date"})
        alert("저장 완료")
      }} style={{background:"#1e293b",border:"none",borderRadius:14,padding:"11px",fontWeight:900,fontSize:10,letterSpacing:"0.12em",color:"#d4af37",cursor:"pointer",textTransform:"uppercase"}}>
        Save Info
      </button>

      {/* 영업 도구 */}
      <div style={{marginTop:"auto",paddingTop:12,borderTop:"1.5px solid #f1f5f9"}}>
        <p style={{fontSize:8,fontWeight:800,color:"#94a3b8",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Sales Tools</p>
        {[
          {icon:"🏦",label:"은행 vs 보험 비교",tool:"compare",hover:"#eff6ff",color:"#3b82f6"},
          {icon:"📉",label:"화폐가치 계산기",tool:"inflation",hover:"#fff1f2",color:"#ef4444"},
          {icon:"📈",label:"단리 vs 복리",tool:"interest",hover:"#f0fdf4",color:"#10b981"},
        ].map(t=>(
          <button key={t.tool} onClick={()=>{setActiveTool(t.tool as any);setIsBizToolOpen(true);setMobileSideOpen(false)}}
            style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",background:"transparent",border:"none",borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:2,textAlign:"left",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=t.hover;e.currentTarget.style.color=t.color}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#64748b"}}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
    </div>
  )
  
  // (하단 레이아웃 및 렌더링 로직 생략 - 파일 내용이 끝까지 제공되지 않음)
  return null;
}