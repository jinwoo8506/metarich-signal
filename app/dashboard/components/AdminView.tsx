/**
 * exportExcel.ts
 * AdminView 의 "EXCEL 출력" 버튼에서 호출되는 함수
 *
 * 사용 방법:
 *   import { exportExcel } from "./exportExcel"
 *   exportExcel({ agents, teamMeta, totalActivity, monthKey })
 *
 * 의존 패키지: xlsx  (이미 설치되어 있음)
 * npm install xlsx  ← 미설치 시
 */

import * as XLSX from "xlsx"

// ─── 타입 ────────────────────────────────────────────────────────────────────
interface Performance {
  call: number
  meet: number
  pt: number
  intro: number
  db_assigned: number
  db_returned: number
  contract_amt: number
  contract_cnt: number
  target_amt: number
  edu_status: string
  is_approved: boolean
}

interface Agent {
  id: string
  name: string
  performance: Performance
}

interface TeamMeta {
  targetAmt: number
  targetCnt: number
  targetIntro: number
  actualIntro: number
}

interface TotalActivity {
  call: number
  meet: number
  pt: number
  intro: number
}

interface ExportParams {
  agents: Agent[]
  teamMeta: TeamMeta
  totalActivity: TotalActivity
  monthKey: string  // "2025-06-01" 형식
}

// ─── 스타일 헬퍼 ─────────────────────────────────────────────────────────────
function s(
  bold = false,
  bgColor?: string,
  fontColor = "FF000000",
  sz = 10,
  hz: XLSX.Style["alignment"] = { horizontal: "center", vertical: "center", wrapText: true }
): XLSX.Style {
  const style: XLSX.Style = {
    font: { name: "맑은 고딕", sz, bold, color: { rgb: fontColor } },
    alignment: hz,
    border: {
      top:    { style: "thin", color: { rgb: "FFAAAAAA" } },
      bottom: { style: "thin", color: { rgb: "FFAAAAAA" } },
      left:   { style: "thin", color: { rgb: "FFAAAAAA" } },
      right:  { style: "thin", color: { rgb: "FFAAAAAA" } },
    },
  }
  if (bgColor) style.fill = { fgColor: { rgb: bgColor }, patternType: "solid" }
  return style
}

// 자주 쓰는 스타일 모음
const ST = {
  titleDark:   s(true,  "FF1F3864", "FFFFFFFF", 16, { horizontal: "center", vertical: "center" }),
  sectionHead: s(true,  "FF2E5FA3", "FFFFFFFF", 11, { horizontal: "left",   vertical: "center", indent: 1 }),
  colHead:     s(true,  "FF4472C4", "FFFFFFFF", 10),
  kpiLabel:    s(true,  "FF4472C4", "FFFFFFFF",  9),
  kpiValue:    s(true,  "FFF0F4FF", "FF2E5FA3", 14),
  kpiGreen:    s(true,  "FFF0F4FF", "FF70AD47", 14),
  kpiOrange:   s(true,  "FFF0F4FF", "FFED7D31", 14),
  dataEven:    s(false, "FFDDEEFF", "FF1F2937", 10),
  dataOdd:     s(false, "FFFFFFFF", "FF1F2937", 10),
  totalRow:    s(true,  "FFFFF2CC", "FF1F2937", 10),
  nameCell:    s(true,  "FFDDEEFF", "FF1F3864", 10),
  green:       s(true,  undefined,  "FF70AD47", 10),
  red:         s(true,  undefined,  "FFFF0000", 10),
  subTitle:    s(false, "FF1F3864", "FF888888",  9, { horizontal: "right",  vertical: "center" }),
  memberBanner:s(true,  "FFED7D31", "FFFFFFFF", 12, { horizontal: "left",   vertical: "center", indent: 2 }),
  metaLabel:   s(true,  "FF4472C4", "FFFFFFFF", 10),
  metaGoal:    s(false, "FFF5F5F5", "FF1F2937", 11),
  metaActGreen:s(true,  "FFF5F5F5", "FF70AD47", 11),
  metaActOrange:s(true, "FFF5F5F5", "FFED7D31", 11),
  metaRateGreen:s(true, "FFF5F5F5", "FF70AD47", 11),
  metaRateRed: s(true,  "FFF5F5F5", "FFFF0000", 11),
  actHead:     s(true,  "FF2E5FA3", "FFFFFFFF",  9),
  actEven:     s(false, "FFDDEEFF", "FF1F2937", 10),
  actTotal:    s(true,  "FFFFF2CC", "FF1F2937", 10),
  actRed:      s(false, "FFDDEEFF", "FFFF0000", 10),
}

// ─── 셀 쓰기 헬퍼 ────────────────────────────────────────────────────────────
function cell(
  ws: XLSX.WorkSheet,
  r: number, c: number,
  v: string | number,
  style: XLSX.Style,
  fmt?: string
) {
  const addr = XLSX.utils.encode_cell({ r, c })
  ws[addr] = { v, t: typeof v === "number" ? "n" : "s", s: style }
  if (fmt) ws[addr].z = fmt
}

function mergeCell(
  ws: XLSX.WorkSheet,
  r: number, c: number, re: number, ce: number,
  v: string | number,
  style: XLSX.Style,
  fmt?: string
) {
  cell(ws, r, c, v, style, fmt)
  if (!ws["!merges"]) ws["!merges"] = []
  ws["!merges"].push({ s: { r, c }, e: { r: re, c: ce } })
}

// ─── 메인 export 함수 ────────────────────────────────────────────────────────
export function exportExcel({ agents, teamMeta, totalActivity, monthKey }: ExportParams) {

  // xlsx-js-style 가 있을 때만 스타일 적용 가능.
  // 일반 xlsx 패키지는 스타일 미지원 → 구조만 생성
  // (실무에서는 npm i xlsx-js-style 후 import * as XLSX from "xlsx-js-style" 로 교체 권장)

  const wb = XLSX.utils.book_new()

  /* ══════════════════════════════════════════════════════════════════════════
     TAB 1 : 📊 팀 전체 현황
  ══════════════════════════════════════════════════════════════════════════ */
  const ws1: XLSX.WorkSheet = {}
  ws1["!ref"] = "A1:M200"

  // 열 너비
  ws1["!cols"] = [
    { wch: 2  },  // A  여백
    { wch: 16 },  // B
    { wch: 13 },  // C
    { wch: 13 },  // D
    { wch: 13 },  // E
    { wch: 13 },  // F
    { wch: 13 },  // G
    { wch: 13 },  // H
    { wch: 13 },  // I
    { wch: 13 },  // J
    { wch: 13 },  // K
    { wch: 2  },  // L 여백
  ]

  // 행 높이
  ws1["!rows"] = Array.from({ length: 200 }, (_, i) => {
    if (i === 0) return { hpx: 10 }   // A1 상단 여백
    if (i === 1) return { hpx: 38 }   // 타이틀
    if (i === 2) return { hpx: 16 }   // 부제
    return { hpx: 22 }
  })

  // ── 타이틀 ─────────────────────────────────────────────────────────────────
  const yearMonth = monthKey.slice(0, 7).replace("-", "년 ") + "월"
  mergeCell(ws1, 1, 1, 1, 10, `🏆  영업팀 실적 현황 리포트 — ${yearMonth}`, ST.titleDark)
  mergeCell(ws1, 2, 1, 2, 10, "※ 팀 전체 목표 대비 실적 현황 요약 리포트입니다.", ST.subTitle)

  // ── 섹션1: KPI 카드 ────────────────────────────────────────────────────────
  const totalGoalAmt    = teamMeta.targetAmt
  const totalActualAmt  = agents.reduce((s, a) => s + (a.performance.contract_amt || 0), 0)
  const totalGoalCnt    = teamMeta.targetCnt
  const totalActualCnt  = agents.reduce((s, a) => s + (a.performance.contract_cnt || 0), 0)
  const amtRate         = totalGoalAmt  > 0 ? totalActualAmt  / totalGoalAmt  : 0
  const cntRate         = totalGoalCnt  > 0 ? totalActualCnt  / totalGoalCnt  : 0

  const SEC1 = 4   // row index (0-based)
  mergeCell(ws1, SEC1, 1, SEC1, 10, "▌ 팀 핵심 KPI", ST.sectionHead)

  const kpiItems = [
    { label: "목표 금액",   val: `${totalGoalAmt.toLocaleString()}만원`,   vSt: ST.kpiValue  },
    { label: "실적 금액",   val: `${totalActualAmt.toLocaleString()}만원`, vSt: amtRate >= 1 ? ST.kpiGreen : ST.kpiOrange },
    { label: "목표 건수",   val: `${totalGoalCnt}건`,                       vSt: ST.kpiValue  },
    { label: "실적 건수",   val: `${totalActualCnt}건`,                     vSt: cntRate >= 1 ? ST.kpiGreen : ST.kpiOrange },
    { label: "금액 달성률", val: `${(amtRate * 100).toFixed(1)}%`,          vSt: amtRate >= 1 ? ST.kpiGreen : ST.kpiOrange },
  ]
  const kpiCols = [1, 3, 5, 7, 9]
  kpiItems.forEach(({ label, val, vSt }, i) => {
    const c = kpiCols[i]
    mergeCell(ws1, SEC1 + 1, c, SEC1 + 1, c + 1, label, ST.kpiLabel)
    ws1["!rows"]![SEC1 + 2] = { hpx: 30 }
    mergeCell(ws1, SEC1 + 2, c, SEC1 + 2, c + 1, val, vSt)
  })

  // ── 섹션2: 팀원별 목표 vs 실적 테이블 ─────────────────────────────────────
  const SEC2 = SEC1 + 5
  mergeCell(ws1, SEC2, 1, SEC2, 10, "▌ 팀원별 목표 vs 실적 현황", ST.sectionHead)

  const COL_HEADS_PERF = ["이름", "목표금액(만)", "실적금액(만)", "금액달성률",
                           "목표건수", "실적건수", "건수달성률", "초과/미달(만)", "초과/미달(건)"]
  COL_HEADS_PERF.forEach((h, i) => cell(ws1, SEC2 + 1, i + 1, h, ST.colHead))

  agents.forEach((a, ri) => {
    const row  = SEC2 + 2 + ri
    const p    = a.performance
    const aRate = (p.target_amt || 0) > 0 ? (p.contract_amt || 0) / (p.target_amt || 1) : 0
    const cRate = totalGoalCnt > 0 ? (p.contract_cnt || 0) / (totalGoalCnt / agents.length || 1) : 0
    const diffA = (p.contract_amt || 0) - (p.target_amt || 0)
    const diffC = (p.contract_cnt || 0) - Math.round(totalGoalCnt / agents.length)
    const bg    = ri % 2 === 0 ? ST.dataEven : ST.dataOdd

    cell(ws1, row, 1, a.name,                                   { ...ST.nameCell })
    cell(ws1, row, 2, p.target_amt   || 0,                      bg, "#,##0")
    cell(ws1, row, 3, p.contract_amt || 0,                      bg, "#,##0")
    cell(ws1, row, 4, `${(aRate * 100).toFixed(1)}%`,           aRate >= 1 ? { ...ST.green, fill: bg.fill } : { ...ST.red, fill: bg.fill })
    cell(ws1, row, 5, Math.round(totalGoalCnt / agents.length), bg)
    cell(ws1, row, 6, p.contract_cnt || 0,                      bg)
    cell(ws1, row, 7, `${(cRate * 100).toFixed(1)}%`,           cRate >= 1 ? { ...ST.green, fill: bg.fill } : { ...ST.red, fill: bg.fill })
    cell(ws1, row, 8, diffA,                                    diffA >= 0 ? { ...ST.green, fill: bg.fill } : { ...ST.red, fill: bg.fill }, "#,##0;-#,##0")
    cell(ws1, row, 9, diffC,                                    diffC >= 0 ? { ...ST.green, fill: bg.fill } : { ...ST.red, fill: bg.fill })
  })

  // 합계 행
  const totRow1 = SEC2 + 2 + agents.length
  cell(ws1, totRow1, 1, "팀 합계", s(true, "FF1F3864", "FFFFFFFF", 10))
  cell(ws1, totRow1, 2, totalGoalAmt,   ST.totalRow, "#,##0")
  cell(ws1, totRow1, 3, totalActualAmt, ST.totalRow, "#,##0")
  cell(ws1, totRow1, 4, `${(amtRate * 100).toFixed(1)}%`, amtRate >= 1 ? { ...ST.green, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } } : { ...ST.red, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } })
  cell(ws1, totRow1, 5, totalGoalCnt,   ST.totalRow)
  cell(ws1, totRow1, 6, totalActualCnt, ST.totalRow)
  cell(ws1, totRow1, 7, `${(cntRate * 100).toFixed(1)}%`, cntRate >= 1 ? { ...ST.green, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } } : { ...ST.red, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } })
  cell(ws1, totRow1, 8, totalActualAmt - totalGoalAmt, (totalActualAmt - totalGoalAmt) >= 0 ? { ...ST.green, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } } : { ...ST.red, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } }, "#,##0;-#,##0")
  cell(ws1, totRow1, 9, totalActualCnt - totalGoalCnt, (totalActualCnt - totalGoalCnt) >= 0 ? { ...ST.green, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } } : { ...ST.red, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } })

  // ── 섹션3: 활동 현황 테이블 ────────────────────────────────────────────────
  const SEC3 = totRow1 + 3
  mergeCell(ws1, SEC3, 1, SEC3, 10, "▌ 팀 전체 활동 현황 (전화 / 만남 / 제안 / 소개 / DB배정 / 반품)", ST.sectionHead)

  const COL_HEADS_ACT = ["이름", "전화", "만남", "제안", "소개", "DB배정", "반품", "활동합계"]
  COL_HEADS_ACT.forEach((h, i) => cell(ws1, SEC3 + 1, i + 1, h, ST.actHead))

  let totAct = { call: 0, meet: 0, pt: 0, intro: 0, db: 0, ret: 0 }
  agents.forEach((a, ri) => {
    const row = SEC3 + 2 + ri
    const p   = a.performance
    const total = (p.call||0)+(p.meet||0)+(p.pt||0)+(p.intro||0)+(p.db_assigned||0)+(p.db_returned||0)
    const bg  = ri % 2 === 0 ? ST.actEven : ST.dataOdd

    totAct.call += p.call || 0
    totAct.meet += p.meet || 0
    totAct.pt   += p.pt   || 0
    totAct.intro+= p.intro|| 0
    totAct.db   += p.db_assigned || 0
    totAct.ret  += p.db_returned || 0

    cell(ws1, row, 1, a.name,             { ...ST.nameCell })
    cell(ws1, row, 2, p.call        || 0, bg)
    cell(ws1, row, 3, p.meet        || 0, bg)
    cell(ws1, row, 4, p.pt          || 0, bg)
    cell(ws1, row, 5, p.intro       || 0, bg)
    cell(ws1, row, 6, p.db_assigned || 0, bg)
    cell(ws1, row, 7, p.db_returned || 0, (p.db_returned || 0) > 0 ? { ...ST.actRed } : bg)
    cell(ws1, row, 8, total,              { ...s(true, ri%2===0 ? "FFDDEEFF" : "FFFFFFFF", "FF2E5FA3", 10) })
  })

  const totRow2 = SEC3 + 2 + agents.length
  const grandTotal = totAct.call + totAct.meet + totAct.pt + totAct.intro + totAct.db + totAct.ret
  cell(ws1, totRow2, 1, "팀 합계",   s(true, "FF1F3864", "FFFFFFFF", 10))
  ;[totAct.call, totAct.meet, totAct.pt, totAct.intro, totAct.db, totAct.ret, grandTotal].forEach((v, i) => {
    const st = (i === 5 && v > 0) ? { ...ST.red, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } } : ST.actTotal
    cell(ws1, totRow2, 2 + i, v, st)
  })

  // ── 섹션4: 활동 전환율 요약 ────────────────────────────────────────────────
  const SEC4 = totRow2 + 3
  mergeCell(ws1, SEC4, 1, SEC4, 10, "▌ 팀 전체 활동 전환율 분석", ST.sectionHead)

  const convHeaders = ["전화 → 만남", "만남 → 제안", "소개 건수", "DB 배정", "DB 반품", "반품률"]
  convHeaders.forEach((h, i) => cell(ws1, SEC4 + 1, i + 2, h, ST.colHead))

  const meetConv = totAct.call  > 0 ? totAct.meet / totAct.call  : 0
  const ptConv   = totAct.meet  > 0 ? totAct.pt   / totAct.meet  : 0
  const retRate  = totAct.db    > 0 ? totAct.ret  / totAct.db    : 0

  const convVals = [
    `${(meetConv * 100).toFixed(1)}%`,
    `${(ptConv   * 100).toFixed(1)}%`,
    `${totAct.intro}건`,
    `${totAct.db}건`,
    `${totAct.ret}건`,
    `${(retRate  * 100).toFixed(1)}%`,
  ]
  convVals.forEach((v, i) => {
    const isBad = (i === 5 && retRate > 0.1)
    cell(ws1, SEC4 + 2, i + 2, v, isBad ? { ...ST.red, fill: { fgColor: { rgb: "FFFFF2CC" }, patternType: "solid" } } : ST.totalRow)
  })

  XLSX.utils.book_append_sheet(wb, ws1, "📊 팀 전체 현황")

  /* ══════════════════════════════════════════════════════════════════════════
     TAB 2 : 👤 개인별 상세 현황
  ══════════════════════════════════════════════════════════════════════════ */
  const ws2: XLSX.WorkSheet = {}
  ws2["!ref"]  = "A1:M500"
  ws2["!merges"] = []
  ws2["!cols"]   = ws1["!cols"]
  ws2["!rows"]   = Array.from({ length: 500 }, () => ({ hpx: 22 }))

  ws2["!rows"]![0] = { hpx: 10 }
  ws2["!rows"]![1] = { hpx: 38 }

  mergeCell(ws2, 1, 1, 1, 10, `👤  팀원별 개인 실적 상세 리포트 — ${yearMonth}`, ST.titleDark)

  let CUR = 3

  agents.forEach((a) => {
    const p = a.performance
    const aRate = (p.target_amt || 0) > 0 ? (p.contract_amt || 0) / (p.target_amt || 1) : 0
    const perGoalCnt = agents.length > 0 ? Math.round(totalGoalCnt / agents.length) : 0
    const cRate = perGoalCnt > 0 ? (p.contract_cnt || 0) / perGoalCnt : 0

    ws2["!rows"]![CUR - 1] = { hpx: 8 }
    ws2["!rows"]![CUR]     = { hpx: 28 }

    // 이름 배너
    mergeCell(ws2, CUR, 1, CUR, 10, `◆  ${a.name}  |  영업사원 개인 현황`, ST.memberBanner)
    CUR++

    // 목표/실적 헤더
    ;["구분", "금액 (만원)", "건수"].forEach((h, i) => {
      mergeCell(ws2, CUR, 1 + i * 2, CUR, 2 + i * 2, h, ST.colHead)
    })
    CUR++

    // 목표 행
    ws2["!rows"]![CUR] = { hpx: 24 }
    mergeCell(ws2, CUR, 1, CUR, 2, "목표",         ST.metaLabel)
    mergeCell(ws2, CUR, 3, CUR, 4, p.target_amt   || 0, ST.metaGoal,   "#,##0")
    mergeCell(ws2, CUR, 5, CUR, 6, perGoalCnt,     ST.metaGoal)
    CUR++

    // 실적 행
    ws2["!rows"]![CUR] = { hpx: 24 }
    mergeCell(ws2, CUR, 1, CUR, 2, "실적",         { ...ST.metaLabel, fill: { fgColor: { rgb: "FFED7D31" }, patternType: "solid" } })
    mergeCell(ws2, CUR, 3, CUR, 4, p.contract_amt || 0, ST.metaGoal, "#,##0")
    mergeCell(ws2, CUR, 5, CUR, 6, p.contract_cnt || 0, ST.metaGoal)
    CUR++

    // 달성률 행
    ws2["!rows"]![CUR] = { hpx: 24 }
    const rateSt = aRate >= 1
      ? { ...ST.metaLabel, fill: { fgColor: { rgb: "FF70AD47" }, patternType: "solid" } }
      : { ...ST.metaLabel, fill: { fgColor: { rgb: "FFFF0000" }, patternType: "solid" } }
    mergeCell(ws2, CUR, 1, CUR, 2, "달성률", rateSt)
    mergeCell(ws2, CUR, 3, CUR, 4, `${(aRate * 100).toFixed(1)}%`, aRate >= 1 ? ST.metaRateGreen : ST.metaRateRed)
    mergeCell(ws2, CUR, 5, CUR, 6, `${(cRate * 100).toFixed(1)}%`, cRate >= 1 ? ST.metaRateGreen : ST.metaRateRed)
    CUR++

    // 활동 현황 헤더
    const ACT_COLS = ["전화", "만남", "제안", "소개", "DB배정", "반품", "활동합계"]
    ACT_COLS.forEach((h, i) => cell(ws2, CUR, 1 + i, h, ST.actHead))
    CUR++

    // 활동 데이터
    const total = (p.call||0)+(p.meet||0)+(p.pt||0)+(p.intro||0)+(p.db_assigned||0)+(p.db_returned||0)
    ;[p.call||0, p.meet||0, p.pt||0, p.intro||0, p.db_assigned||0, p.db_returned||0, total].forEach((v, i) => {
      const st = (i === 5 && v > 0)
        ? { ...ST.actRed, fill: { fgColor: { rgb: "FFDDEEFF" }, patternType: "solid" } }
        : i === 6
          ? s(true, "FFDDEEFF", "FF2E5FA3", 10)
          : ST.actEven
      cell(ws2, CUR, 1 + i, v, st)
    })
    CUR++

    // 전환율 행
    const mc = (p.call||0) > 0 ? ((p.meet||0)/(p.call||1)*100).toFixed(1) : "0.0"
    const pc = (p.meet||0) > 0 ? ((p.pt||0)/(p.meet||1)*100).toFixed(1)   : "0.0"
    mergeCell(ws2, CUR, 1, CUR, 3, `전화→만남 전환율: ${mc}%`,   s(false, "FFF5F5F5", "FF2E5FA3", 9))
    mergeCell(ws2, CUR, 4, CUR, 7, `만남→제안 전환율: ${pc}%`,   s(false, "FFF5F5F5", "FFED7D31", 9))
    CUR += 3  // 구역 간격
  })

  XLSX.utils.book_append_sheet(wb, ws2, "👤 개인별 상세 현황")

  // ── 파일 저장 ───────────────────────────────────────────────────────────────
  const bookType = "xlsx"
  XLSX.writeFile(wb, `영업팀_실적리포트_${monthKey.slice(0, 7)}.xlsx`, {
    bookType,
    bookSST: false,
    type: "binary",
  })
}