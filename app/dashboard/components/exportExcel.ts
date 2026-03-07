"use client"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// exportExcel.ts
// 엑셀 출력 전담 파일 — 이 파일만 수정하면 엑셀 내용/스타일 변경 가능
//
// 사용법: AdminView.tsx 에서 import { exportExcel } from "./exportExcel"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import * as XLSX from 'xlsx-js-style'

// ────────────────────────────────────────────────────────────────
// 테두리 프리셋
// ────────────────────────────────────────────────────────────────
const B_THIN = {
  top:    { style: "thin",   color: { rgb: "FFAAAAAA" } },
  bottom: { style: "thin",   color: { rgb: "FFAAAAAA" } },
  left:   { style: "thin",   color: { rgb: "FFAAAAAA" } },
  right:  { style: "thin",   color: { rgb: "FFAAAAAA" } },
}
const B_MED = {
  top:    { style: "medium", color: { rgb: "FF000000" } },
  bottom: { style: "medium", color: { rgb: "FF000000" } },
  left:   { style: "medium", color: { rgb: "FF000000" } },
  right:  { style: "medium", color: { rgb: "FF000000" } },
}

// ────────────────────────────────────────────────────────────────
// 스타일 팩토리
// ────────────────────────────────────────────────────────────────
function xs(
  bg: string | null,
  fg: string,
  bold: boolean,
  sz: number,
  hAlign = "center",
  border: any = B_THIN
): any {
  return {
    font:      { name: "맑은 고딕", sz, bold, color: { rgb: fg } },
    fill:      bg ? { fgColor: { rgb: bg }, patternType: "solid" } : { patternType: "none" },
    alignment: { horizontal: hAlign, vertical: "center", wrapText: true },
    border,
  }
}

// ────────────────────────────────────────────────────────────────
// 스타일 상수 모음
// 색상을 바꾸고 싶으면 여기 rgb 값만 수정하세요
// ────────────────────────────────────────────────────────────────
const X = {
  title:         xs("FF1F3864", "FFFFFFFF", true,  16, "center", B_MED),  // 진한 네이비 타이틀
  subtitle:      xs("FF1F3864", "FF888888", false,  9, "right"),           // 부제
  secHead:       xs("FF2E5FA3", "FFFFFFFF", true,  11, "left"),            // 섹션 헤더 블루
  colHead:       xs("FF4472C4", "FFFFFFFF", true,  10),                    // 컬럼 헤더
  colHeadSm:     xs("FF2E5FA3", "FFFFFFFF", true,   9),                    // 컬럼 헤더 (소형)
  kpiLblBlue:    xs("FF4472C4", "FFFFFFFF", true,   9),                    // KPI 라벨 - 파랑
  kpiLblGreen:   xs("FF70AD47", "FFFFFFFF", true,   9),                    // KPI 라벨 - 초록
  kpiLblOrange:  xs("FFED7D31", "FFFFFFFF", true,   9),                    // KPI 라벨 - 오렌지
  kpiValBlue:    xs("FFF0F4FF", "FF2E5FA3", true,  14),                    // KPI 값 - 파랑
  kpiValGreen:   xs("FFF0F4FF", "FF70AD47", true,  14),                    // KPI 값 - 초록
  kpiValOrange:  xs("FFF0F4FF", "FFED7D31", true,  14),                    // KPI 값 - 오렌지
  dataEven:      xs("FFDDEEFF", "FF1F2937", false, 10),                    // 데이터 행 - 짝수 (연파랑)
  dataOdd:       xs("FFFFFFFF", "FF1F2937", false, 10),                    // 데이터 행 - 홀수 (흰색)
  nameEven:      xs("FFDDEEFF", "FF1F3864", true,  10),                    // 이름 셀 - 짝수
  nameOdd:       xs("FFFFFFFF", "FF1F3864", true,  10),                    // 이름 셀 - 홀수
  rGreenEven:    xs("FFDDEEFF", "FF70AD47", true,  10),                    // 달성 - 짝수
  rGreenOdd:     xs("FFFFFFFF", "FF70AD47", true,  10),                    // 달성 - 홀수
  rRedEven:      xs("FFDDEEFF", "FFFF0000", true,  10),                    // 미달 - 짝수
  rRedOdd:       xs("FFFFFFFF", "FFFF0000", true,  10),                    // 미달 - 홀수
  retRedEven:    xs("FFDDEEFF", "FFFF0000", false, 10),                    // 반품 강조 - 짝수
  retRedOdd:     xs("FFFFFFFF", "FFFF0000", false, 10),                    // 반품 강조 - 홀수
  actSumEven:    xs("FFDDEEFF", "FF2E5FA3", true,  10),                    // 활동합계 - 짝수
  actSumOdd:     xs("FFFFFFFF", "FF2E5FA3", true,  10),                    // 활동합계 - 홀수
  totalHead:     xs("FF1F3864", "FFFFFFFF", true,  10),                    // 합계 행 제목
  totalRow:      xs("FFFFF2CC", "FF1F2937", true,  10),                    // 합계 행 (연노랑)
  totalGreen:    xs("FFFFF2CC", "FF70AD47", true,  10),                    // 합계 행 - 달성 초록
  totalRed:      xs("FFFFF2CC", "FFFF0000", true,  10),                    // 합계 행 - 미달 빨강
  memberBanner:  xs("FFED7D31", "FFFFFFFF", true,  12, "left"),            // 개인 배너 - 오렌지
  metaGoalLbl:   xs("FF4472C4", "FFFFFFFF", true,  10),                    // 목표 라벨
  metaActLbl:    xs("FFED7D31", "FFFFFFFF", true,  10),                    // 실적 라벨
  metaRGreenLbl: xs("FF70AD47", "FFFFFFFF", true,  10),                    // 달성률 라벨 - 초록
  metaRRedLbl:   xs("FFFF0000", "FFFFFFFF", true,  10),                    // 달성률 라벨 - 빨강
  metaVal:       xs("FFF5F5F5", "FF1F2937", false, 11),                    // 목표/실적 값
  metaRGreen:    xs("FFF5F5F5", "FF70AD47", true,  11),                    // 달성률 값 - 초록
  metaRRed:      xs("FFF5F5F5", "FFFF0000", true,  11),                    // 달성률 값 - 빨강
  convBlue:      xs("FFF0F7FF", "FF2E5FA3", false,  9),                    // 전환율 - 파랑
  convOrange:    xs("FFFFF8F0", "FFED7D31", false,  9),                    // 전환율 - 오렌지
}

// ────────────────────────────────────────────────────────────────
// 워크시트 유틸리티
// ────────────────────────────────────────────────────────────────

// 셀 하나 쓰기
function xc(ws: any, r: number, c: number, v: any, s: any, fmt?: string) {
  const addr = XLSX.utils.encode_cell({ r, c })
  ws[addr] = { v, t: typeof v === "number" ? "n" : "s", s }
  if (fmt) ws[addr].z = fmt
}

// 셀 병합 등록
function xm(ws: any, rs: number, cs: number, re: number, ce: number) {
  if (!ws["!merges"]) ws["!merges"] = []
  ws["!merges"].push({ s: { r: rs, c: cs }, e: { r: re, c: ce } })
}

// 행 전체를 같은 스타일로 채우기 (병합 뒤 나머지 셀 테두리 통일)
function xr(ws: any, r: number, c1: number, c2: number, s: any) {
  for (let c = c1; c <= c2; c++) xc(ws, r, c, "", s)
}

// ────────────────────────────────────────────────────────────────
// 메인 export 함수
// AdminView.tsx 의 handleExport('excel') 에서 이 함수를 호출합니다
// ────────────────────────────────────────────────────────────────
export function exportExcel({
  agents,
  teamMeta,
  monthKey,
}: {
  agents: any[]
  teamMeta: { targetAmt: number; targetCnt: number }
  monthKey: string   // "2025-06-01" 형식
}) {
  const wb = XLSX.utils.book_new()
  const yearMonth = monthKey.slice(0, 7).replace("-", "년 ") + "월"

  // ── 팀 집계값 사전 계산 ──────────────────────────────────────
  const totalActAmt = agents.reduce((s, a) => s + Number(a.performance.contract_amt || 0), 0)
  const totalActCnt = agents.reduce((s, a) => s + Number(a.performance.contract_cnt || 0), 0)
  const amtRate = teamMeta.targetAmt > 0 ? totalActAmt / teamMeta.targetAmt : 0
  const cntRate = teamMeta.targetCnt > 0 ? totalActCnt / teamMeta.targetCnt : 0
  let tCall=0, tMeet=0, tPt=0, tIntro=0, tDb=0, tRet=0
  agents.forEach(a => {
    tCall  += Number(a.performance.call        || 0)
    tMeet  += Number(a.performance.meet        || 0)
    tPt    += Number(a.performance.pt          || 0)
    tIntro += Number(a.performance.intro       || 0)
    tDb    += Number(a.performance.db_assigned || 0)
    tRet   += Number(a.performance.db_returned || 0)
  })

  // ══════════════════════════════════════════════════════════════
  // TAB 1 : 📊 팀 전체 현황
  // ══════════════════════════════════════════════════════════════
  const ws1: any = { "!merges": [], "!rows": [] }
  ws1["!cols"] = [
    {wch:2},{wch:16},{wch:14},{wch:14},{wch:13},
    {wch:12},{wch:12},{wch:13},{wch:14},{wch:14},{wch:2},
  ]

  let R = 0
  const h = (px: number): void => { ws1["!rows"][R] = { hpx: px } }

  // 상단 여백
  h(10); R++

  // 타이틀
  h(40); xr(ws1,R,1,9,X.title)
  xc(ws1,R,1,`🏆  영업팀 실적 현황 리포트 — ${yearMonth}`,X.title)
  xm(ws1,R,1,R,9); R++

  // 부제
  h(16); xr(ws1,R,1,9,X.subtitle)
  xc(ws1,R,1,"※ 본 리포트는 팀 전체 목표 대비 실적 현황을 요약합니다.",X.subtitle)
  xm(ws1,R,1,R,9); R++

  h(10); R++ // 간격

  // ── 섹션1: 팀 핵심 KPI ────────────────────────────────────────
  h(24); xr(ws1,R,1,9,X.secHead)
  xc(ws1,R,1,"▌ 팀 핵심 KPI",X.secHead); xm(ws1,R,1,R,9); R++

  // KPI 라벨 행
  h(22);
  const kpiSpans  = [[1,2],[3,4],[5,6],[7,8],[9,9]]
  const kpiLabels = ["목표 금액","실적 금액","목표 건수","실적 건수","금액 달성률"]
  const kpiLSt    = [
    X.kpiLblBlue,
    amtRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
    X.kpiLblBlue,
    cntRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
    amtRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
  ]
  kpiSpans.forEach(([c1,c2],i) => {
    xr(ws1,R,c1,c2,kpiLSt[i]); xc(ws1,R,c1,kpiLabels[i],kpiLSt[i])
    if(c1!==c2) xm(ws1,R,c1,R,c2)
  }); R++

  // KPI 값 행
  h(36);
  const kpiVals = [
    `${teamMeta.targetAmt.toLocaleString()}만원`,
    `${totalActAmt.toLocaleString()}만원`,
    `${teamMeta.targetCnt}건`,
    `${totalActCnt}건`,
    `${(amtRate*100).toFixed(1)}%`,
  ]
  const kpiVSt = [
    X.kpiValBlue,
    amtRate>=1 ? X.kpiValGreen : X.kpiValOrange,
    X.kpiValBlue,
    cntRate>=1 ? X.kpiValGreen : X.kpiValOrange,
    amtRate>=1 ? X.kpiValGreen : X.kpiValOrange,
  ]
  kpiSpans.forEach(([c1,c2],i) => {
    xr(ws1,R,c1,c2,kpiVSt[i]); xc(ws1,R,c1,kpiVals[i],kpiVSt[i])
    if(c1!==c2) xm(ws1,R,c1,R,c2)
  }); R++

  h(10); R++ // 간격

  // ── 섹션2: 팀원별 목표 vs 실적 테이블 ──────────────────────────
  h(24); xr(ws1,R,1,9,X.secHead)
  xc(ws1,R,1,"▌ 팀원별 목표 vs 실적 현황",X.secHead); xm(ws1,R,1,R,9); R++

  h(22);
  ["이름","목표금액(만)","실적금액(만)","금액달성률","목표건수","실적건수","건수달성률","초과/미달(만)","초과/미달(건)"]
    .forEach((v,i) => xc(ws1,R,1+i,v,X.colHead))
  R++

  agents.forEach((a,ri) => {
    h(22);
    const p     = a.performance
    const tAmt  = Number(p.target_amt   || 1)
    const cAmt  = Number(p.contract_amt || 0)
    const tCnt  = Number(p.target_cnt   || 1)
    const cCnt  = Number(p.contract_cnt || 0)
    const aRate = tAmt>0 ? cAmt/tAmt : 0
    const cRate = tCnt>0 ? cCnt/tCnt : 0
    const diffA = cAmt - tAmt
    const diffC = cCnt - tCnt
    const ev    = ri%2===0

    xc(ws1,R,1,a.name,                        ev?X.nameEven:X.nameOdd)
    xc(ws1,R,2,tAmt,                           ev?X.dataEven:X.dataOdd,"#,##0")
    xc(ws1,R,3,cAmt,                           ev?X.dataEven:X.dataOdd,"#,##0")
    xc(ws1,R,4,`${(aRate*100).toFixed(1)}%`,  aRate>=1?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd))
    xc(ws1,R,5,tCnt,                           ev?X.dataEven:X.dataOdd)
    xc(ws1,R,6,cCnt,                           ev?X.dataEven:X.dataOdd)
    xc(ws1,R,7,`${(cRate*100).toFixed(1)}%`,  cRate>=1?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd))
    xc(ws1,R,8,diffA,diffA>=0?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd),"#,##0;-#,##0")
    xc(ws1,R,9,diffC,diffC>=0?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd))
    R++
  })

  // 팀 합계 행
  h(24);
  const dA=totalActAmt-teamMeta.targetAmt, dC=totalActCnt-teamMeta.targetCnt
  xc(ws1,R,1,"팀 합계",          X.totalHead)
  xc(ws1,R,2,teamMeta.targetAmt, X.totalRow,"#,##0")
  xc(ws1,R,3,totalActAmt,        X.totalRow,"#,##0")
  xc(ws1,R,4,`${(amtRate*100).toFixed(1)}%`,amtRate>=1?X.totalGreen:X.totalRed)
  xc(ws1,R,5,teamMeta.targetCnt, X.totalRow)
  xc(ws1,R,6,totalActCnt,        X.totalRow)
  xc(ws1,R,7,`${(cntRate*100).toFixed(1)}%`,cntRate>=1?X.totalGreen:X.totalRed)
  xc(ws1,R,8,dA,dA>=0?X.totalGreen:X.totalRed,"#,##0;-#,##0")
  xc(ws1,R,9,dC,dC>=0?X.totalGreen:X.totalRed)
  R++

  h(10); R++ // 간격

  // ── 섹션3: 팀 전체 활동 현황 ────────────────────────────────────
  h(24); xr(ws1,R,1,8,X.secHead)
  xc(ws1,R,1,"▌ 팀 전체 활동 현황 (전화 / 만남 / 제안 / 소개 / DB배정 / 반품)",X.secHead)
  xm(ws1,R,1,R,8); R++

  h(22);
  ["이름","전화","만남","제안","소개","DB배정","반품","활동합계"]
    .forEach((v,i) => xc(ws1,R,1+i,v,X.colHead))
  R++

  agents.forEach((a,ri) => {
    h(22);
    const p   = a.performance
    const ev  = ri%2===0
    const bg  = ev?X.dataEven:X.dataOdd
    const tot = Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)
               +Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0)
    xc(ws1,R,1,a.name,                    ev?X.nameEven:X.nameOdd)
    xc(ws1,R,2,Number(p.call        ||0), bg)
    xc(ws1,R,3,Number(p.meet        ||0), bg)
    xc(ws1,R,4,Number(p.pt          ||0), bg)
    xc(ws1,R,5,Number(p.intro       ||0), bg)
    xc(ws1,R,6,Number(p.db_assigned ||0), bg)
    xc(ws1,R,7,Number(p.db_returned ||0), Number(p.db_returned||0)>0?(ev?X.retRedEven:X.retRedOdd):bg)
    xc(ws1,R,8,tot,                       ev?X.actSumEven:X.actSumOdd)
    R++
  })

  // 활동 합계 행
  h(24);
  const gAct=tCall+tMeet+tPt+tIntro+tDb+tRet
  xc(ws1,R,1,"팀 합계",X.totalHead)
  xc(ws1,R,2,tCall,    X.totalRow)
  xc(ws1,R,3,tMeet,    X.totalRow)
  xc(ws1,R,4,tPt,      X.totalRow)
  xc(ws1,R,5,tIntro,   X.totalRow)
  xc(ws1,R,6,tDb,      X.totalRow)
  xc(ws1,R,7,tRet,     tRet>0?X.totalRed:X.totalRow)
  xc(ws1,R,8,gAct,     X.totalGreen)
  R++

  h(10); R++ // 간격

  // ── 섹션4: 활동 전환율 분석 ─────────────────────────────────────
  h(24); xr(ws1,R,1,8,X.secHead)
  xc(ws1,R,1,"▌ 팀 전체 활동 전환율 분석",X.secHead); xm(ws1,R,1,R,8); R++

  h(22);
  ["전화→만남 전환율","만남→제안 전환율","소개 건수","DB 배정","DB 반품","반품률"]
    .forEach((v,i) => xc(ws1,R,2+i,v,X.colHead))
  R++

  h(26);
  const mc1 = tCall>0?(tMeet/tCall*100).toFixed(1):"0.0"
  const pc1 = tMeet>0?(tPt/tMeet*100).toFixed(1):"0.0"
  const rr  = tDb>0?(tRet/tDb*100).toFixed(1):"0.0"
  [`${mc1}%`,`${pc1}%`,`${tIntro}건`,`${tDb}건`,`${tRet}건`,`${rr}%`]
    .forEach((v,i) => xc(ws1,R,2+i,v, i===5&&Number(rr)>10?X.totalRed:X.totalRow))
  R++

  ws1["!ref"] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:R+1,c:10}})
  XLSX.utils.book_append_sheet(wb, ws1, "📊 팀 전체 현황")

  // ══════════════════════════════════════════════════════════════
  // TAB 2 : 👤 개인별 상세 현황
  // ══════════════════════════════════════════════════════════════
  const ws2: any = { "!merges": [], "!rows": [] }
  ws2["!cols"] = [
    {wch:2},{wch:12},{wch:12},{wch:14},{wch:12},
    {wch:12},{wch:12},{wch:12},{wch:12},{wch:2},
  ]

  let R2 = 0
  const h2 = (px: number): void => { ws2["!rows"][R2] = { hpx: px } }

  // 상단 여백
  h2(10); R2++

  // 타이틀
  h2(40); xr(ws2,R2,1,8,X.title)
  xc(ws2,R2,1,`👤  팀원별 개인 실적 상세 리포트 — ${yearMonth}`,X.title)
  xm(ws2,R2,1,R2,8); R2++

  // 부제
  h2(16); xr(ws2,R2,1,8,X.subtitle)
  xc(ws2,R2,1,"※ 팀원별 개인 목표·실적·활동 내역 상세 리포트입니다.",X.subtitle)
  xm(ws2,R2,1,R2,8); R2++

  // ── 팀원별 블록 반복 ────────────────────────────────────────────
  agents.forEach(a => {
    const p     = a.performance
    const tAmt  = Number(p.target_amt   || 0)
    const cAmt  = Number(p.contract_amt || 0)
    const tCnt  = Number(p.target_cnt   || 1)
    const cCnt  = Number(p.contract_cnt || 0)
    const aRate = tAmt>0 ? cAmt/tAmt : 0
    const cRate = tCnt>0 ? cCnt/tCnt : 0
    const actTot= Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)
                 +Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0)
    const mc = Number(p.call||0)>0 ? (Number(p.meet||0)/Number(p.call||1)*100).toFixed(1) : "0.0"
    const pc = Number(p.meet||0)>0 ? (Number(p.pt||0)/Number(p.meet||1)*100).toFixed(1)   : "0.0"

    h2(10); R2++ // 구분 간격

    // 이름 배너
    h2(28); xr(ws2,R2,1,8,X.memberBanner)
    xc(ws2,R2,1,`◆  ${a.name}  |  영업사원 개인 현황`,X.memberBanner)
    xm(ws2,R2,1,R2,8); R2++

    // 컬럼 헤더
    h2(22);
    xc(ws2,R2,1,"구분",        X.metaGoalLbl); xm(ws2,R2,1,R2,2)
    xc(ws2,R2,3,"금액 (만원)", X.metaGoalLbl); xm(ws2,R2,3,R2,4)
    xc(ws2,R2,5,"건수",        X.metaGoalLbl); xm(ws2,R2,5,R2,6)
    xc(ws2,R2,7,"",            X.metaGoalLbl); xm(ws2,R2,7,R2,8)
    R2++

    // 목표 행
    h2(24);
    xc(ws2,R2,1,"목표",X.metaGoalLbl);         xm(ws2,R2,1,R2,2)
    xc(ws2,R2,3,tAmt,  X.metaVal,"#,##0");     xm(ws2,R2,3,R2,4)
    xc(ws2,R2,5,tCnt,  X.metaVal);             xm(ws2,R2,5,R2,6)
    xc(ws2,R2,7,"",    X.metaVal);             xm(ws2,R2,7,R2,8)
    R2++

    // 실적 행
    h2(24);
    xc(ws2,R2,1,"실적",X.metaActLbl);          xm(ws2,R2,1,R2,2)
    xc(ws2,R2,3,cAmt,  X.metaVal,"#,##0");     xm(ws2,R2,3,R2,4)
    xc(ws2,R2,5,cCnt,  X.metaVal);             xm(ws2,R2,5,R2,6)
    xc(ws2,R2,7,"",    X.metaVal);             xm(ws2,R2,7,R2,8)
    R2++

    // 달성률 행
    h2(24);
    const rLbl = aRate>=1 ? X.metaRGreenLbl : X.metaRRedLbl
    xc(ws2,R2,1,"달성률",                    rLbl);                      xm(ws2,R2,1,R2,2)
    xc(ws2,R2,3,`${(aRate*100).toFixed(1)}%`,aRate>=1?X.metaRGreen:X.metaRRed); xm(ws2,R2,3,R2,4)
    xc(ws2,R2,5,`${(cRate*100).toFixed(1)}%`,cRate>=1?X.metaRGreen:X.metaRRed); xm(ws2,R2,5,R2,6)
    xc(ws2,R2,7,"",X.metaVal);               xm(ws2,R2,7,R2,8)
    R2++

    // 활동 헤더
    h2(22);
    ["전화","만남","제안","소개","DB배정","반품","활동합계"]
      .forEach((v,i) => xc(ws2,R2,1+i,v,X.colHeadSm))
    xc(ws2,R2,8,"",X.colHeadSm)
    R2++

    // 활동 데이터
    h2(24);
    [Number(p.call||0),Number(p.meet||0),Number(p.pt||0),
     Number(p.intro||0),Number(p.db_assigned||0),Number(p.db_returned||0),actTot
    ].forEach((v,i) => {
      xc(ws2,R2,1+i,v,
        i===5&&v>0 ? X.retRedEven
        : i===6    ? X.actSumEven
        :             X.dataEven)
    })
    xc(ws2,R2,8,"",X.dataEven)
    R2++

    // 전환율 행
    h2(22);
    xc(ws2,R2,1,`전화→만남 전환율: ${mc}%`,X.convBlue);   xm(ws2,R2,1,R2,4)
    xc(ws2,R2,5,`만남→제안 전환율: ${pc}%`,X.convOrange); xm(ws2,R2,5,R2,8)
    R2++
  })

  ws2["!ref"] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:R2+1,c:9}})
  XLSX.utils.book_append_sheet(wb, ws2, "👤 개인별 상세 현황")

  // ── 파일 저장 ─────────────────────────────────────────────────
  XLSX.writeFile(wb, `Team_Report_${monthKey}.xlsx`)
}