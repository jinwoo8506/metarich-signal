import * as XLSX from 'xlsx-js-style';

// ─────────────────────────────────────────────────────────────────
// 테두리 프리셋
// ─────────────────────────────────────────────────────────────────
const BORDER_THIN = {
  top:    { style: "thin",   color: { rgb: "FFAAAAAA" } },
  bottom: { style: "thin",   color: { rgb: "FFAAAAAA" } },
  left:   { style: "thin",   color: { rgb: "FFAAAAAA" } },
  right:  { style: "thin",   color: { rgb: "FFAAAAAA" } },
};
const BORDER_MEDIUM = {
  top:    { style: "medium", color: { rgb: "FF000000" } },
  bottom: { style: "medium", color: { rgb: "FF000000" } },
  left:   { style: "medium", color: { rgb: "FF000000" } },
  right:  { style: "medium", color: { rgb: "FF000000" } },
};

// ─────────────────────────────────────────────────────────────────
// 스타일 팩토리
// ─────────────────────────────────────────────────────────────────
function makeStyle(
  bgRgb: string | null,
  fontRgb: string,
  bold: boolean,
  sz: number,
  hAlign: string,
  vAlign: string,
  border: any = BORDER_THIN
): any {
  return {
    font: { name: "맑은 고딕", sz, bold, color: { rgb: fontRgb } },
    fill: bgRgb
      ? { fgColor: { rgb: bgRgb }, patternType: "solid" }
      : { patternType: "none" },
    alignment: { horizontal: hAlign, vertical: vAlign, wrapText: true },
    border,
  };
}

// ─────────────────────────────────────────────────────────────────
// 스타일 상수
// ─────────────────────────────────────────────────────────────────
const S = {
  // ── 타이틀 / 섹션헤더
  title:        makeStyle("FF1F3864", "FFFFFFFF", true,  16, "center", "center", BORDER_MEDIUM),
  subtitle:     makeStyle("FF1F3864", "FF888888", false,  9, "right",  "center"),
  secHead:      makeStyle("FF2E5FA3", "FFFFFFFF", true,  11, "left",   "center"),
  colHead:      makeStyle("FF4472C4", "FFFFFFFF", true,  10, "center", "center"),
  colHeadSm:    makeStyle("FF2E5FA3", "FFFFFFFF", true,   9, "center", "center"),

  // ── KPI 라벨
  kpiLblBlue:   makeStyle("FF4472C4", "FFFFFFFF", true,   9, "center", "center"),
  kpiLblGreen:  makeStyle("FF70AD47", "FFFFFFFF", true,   9, "center", "center"),
  kpiLblOrange: makeStyle("FFED7D31", "FFFFFFFF", true,   9, "center", "center"),

  // ── KPI 값
  kpiValBlue:   makeStyle("FFF0F4FF", "FF2E5FA3", true,  14, "center", "center"),
  kpiValGreen:  makeStyle("FFF0F4FF", "FF70AD47", true,  14, "center", "center"),
  kpiValOrange: makeStyle("FFF0F4FF", "FFED7D31", true,  14, "center", "center"),

  // ── 데이터 행 (짝수/홀수)
  dataEven:     makeStyle("FFDDEEFF", "FF1F2937", false, 10, "center", "center"),
  dataOdd:      makeStyle("FFFFFFFF", "FF1F2937", false, 10, "center", "center"),
  nameEven:     makeStyle("FFDDEEFF", "FF1F3864", true,  10, "center", "center"),
  nameOdd:      makeStyle("FFFFFFFF", "FF1F3864", true,  10, "center", "center"),

  // ── 달성률 (배경 유지하며 글자색만 변경)
  rGreenEven:   makeStyle("FFDDEEFF", "FF70AD47", true,  10, "center", "center"),
  rGreenOdd:    makeStyle("FFFFFFFF", "FF70AD47", true,  10, "center", "center"),
  rRedEven:     makeStyle("FFDDEEFF", "FFFF0000", true,  10, "center", "center"),
  rRedOdd:      makeStyle("FFFFFFFF", "FFFF0000", true,  10, "center", "center"),

  // ── 반품 강조
  retRedEven:   makeStyle("FFDDEEFF", "FFFF0000", false, 10, "center", "center"),
  retRedOdd:    makeStyle("FFFFFFFF", "FFFF0000", false, 10, "center", "center"),

  // ── 활동합계 강조
  actSumEven:   makeStyle("FFDDEEFF", "FF2E5FA3", true,  10, "center", "center"),
  actSumOdd:    makeStyle("FFFFFFFF", "FF2E5FA3", true,  10, "center", "center"),

  // ── 합계 행
  totalHead:    makeStyle("FF1F3864", "FFFFFFFF", true,  10, "center", "center"),
  totalRow:     makeStyle("FFFFF2CC", "FF1F2937", true,  10, "center", "center"),
  totalGreen:   makeStyle("FFFFF2CC", "FF70AD47", true,  10, "center", "center"),
  totalRed:     makeStyle("FFFFF2CC", "FFFF0000", true,  10, "center", "center"),

  // ── 개인 섹션
  memberBanner: makeStyle("FFED7D31", "FFFFFFFF", true,  12, "left",   "center"),
  metaGoalLbl:  makeStyle("FF4472C4", "FFFFFFFF", true,  10, "center", "center"),
  metaActLbl:   makeStyle("FFED7D31", "FFFFFFFF", true,  10, "center", "center"),
  metaRGreenLbl:makeStyle("FF70AD47", "FFFFFFFF", true,  10, "center", "center"),
  metaRRedLbl:  makeStyle("FFFF0000", "FFFFFFFF", true,  10, "center", "center"),
  metaVal:      makeStyle("FFF5F5F5", "FF1F2937", false, 11, "center", "center"),
  metaRGreen:   makeStyle("FFF5F5F5", "FF70AD47", true,  11, "center", "center"),
  metaRRed:     makeStyle("FFF5F5F5", "FFFF0000", true,  11, "center", "center"),

  // ── 전환율
  convBlue:     makeStyle("FFF0F7FF", "FF2E5FA3", false,  9, "center", "center"),
  convOrange:   makeStyle("FFFFF8F0", "FFED7D31", false,  9, "center", "center"),
};

// ─────────────────────────────────────────────────────────────────
// 워크시트 헬퍼
// ─────────────────────────────────────────────────────────────────
function addCell(ws: any, r: number, c: number, v: any, style: any, fmt?: string) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v, t: typeof v === "number" ? "n" : "s", s: style };
  if (fmt) ws[addr].z = fmt;
}

function addMerge(ws: any, rs: number, cs: number, re: number, ce: number) {
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: rs, c: cs }, e: { r: re, c: ce } });
}

function fillRow(ws: any, r: number, c1: number, c2: number, style: any) {
  for (let c = c1; c <= c2; c++) addCell(ws, r, c, "", style);
}

// ─────────────────────────────────────────────────────────────────
// 메인 export 함수
// ─────────────────────────────────────────────────────────────────
export const exportExcel = ({ agents, teamMeta, totalActivity, monthKey }: any) => {
  const wb = XLSX.utils.book_new();
  const yearMonth = monthKey.slice(0, 7).replace("-", "년 ") + "월";

  // ── 집계 사전 계산 ─────────────────────────────────────────────
  const totalActAmt = agents.reduce((s: number, a: any) => s + Number(a.performance.contract_amt || 0), 0);
  const totalActCnt = agents.reduce((s: number, a: any) => s + Number(a.performance.contract_cnt || 0), 0);
  const amtRate = teamMeta.targetAmt > 0 ? totalActAmt / teamMeta.targetAmt : 0;
  const cntRate = teamMeta.targetCnt > 0 ? totalActCnt / teamMeta.targetCnt : 0;

  let tCall = 0, tMeet = 0, tPt = 0, tIntro = 0, tDb = 0, tRet = 0;
  agents.forEach((a: any) => {
    tCall  += Number(a.performance.call         || 0);
    tMeet  += Number(a.performance.meet         || 0);
    tPt    += Number(a.performance.pt           || 0);
    tIntro += Number(a.performance.intro        || 0);
    tDb    += Number(a.performance.db_assigned  || 0);
    tRet   += Number(a.performance.db_returned  || 0);
  });

  /* ══════════════════════════════════════════════════════════════
     TAB 1 : 📊 팀 전체 현황
  ══════════════════════════════════════════════════════════════ */
  const ws1: any = { "!merges": [], "!rows": [] };
  ws1["!cols"] = [
    { wch: 2  }, // A 여백
    { wch: 16 }, // B 이름
    { wch: 14 }, // C
    { wch: 14 }, // D
    { wch: 13 }, // E
    { wch: 12 }, // F
    { wch: 12 }, // G
    { wch: 13 }, // H
    { wch: 14 }, // I
    { wch: 14 }, // J
    { wch: 2  }, // K 여백
  ];

  let R = 0;
  const setH = (h: number) => { ws1["!rows"][R] = { hpx: h }; };

  // 상단 여백
  setH(10); R++;

  // ── 타이틀 ──────────────────────────────────────────────────────
  setH(40);
  fillRow(ws1, R, 1, 9, S.title);
  addCell(ws1, R, 1, `🏆  영업팀 실적 현황 리포트 — ${yearMonth}`, S.title);
  addMerge(ws1, R, 1, R, 9); R++;

  // 부제
  setH(16);
  fillRow(ws1, R, 1, 9, S.subtitle);
  addCell(ws1, R, 1, "※ 본 리포트는 팀 전체 목표 대비 실적 현황을 요약합니다.", S.subtitle);
  addMerge(ws1, R, 1, R, 9); R++;

  setH(10); R++; // 간격

  // ── 섹션1: 팀 핵심 KPI ──────────────────────────────────────────
  setH(24);
  fillRow(ws1, R, 1, 9, S.secHead);
  addCell(ws1, R, 1, "▌ 팀 핵심 KPI", S.secHead);
  addMerge(ws1, R, 1, R, 9); R++;

  // KPI 라벨 (2열씩 병합, 마지막 1열)
  setH(22);
  const kpiSpans = [[1,2],[3,4],[5,6],[7,8],[9,9]];
  const kpiLbls  = ["목표 금액", "실적 금액", "목표 건수", "실적 건수", "금액 달성률"];
  const kpiLblSt = [
    S.kpiLblBlue,
    amtRate >= 1 ? S.kpiLblGreen : S.kpiLblOrange,
    S.kpiLblBlue,
    cntRate >= 1 ? S.kpiLblGreen : S.kpiLblOrange,
    amtRate >= 1 ? S.kpiLblGreen : S.kpiLblOrange,
  ];
  kpiSpans.forEach(([c1, c2], i) => {
    fillRow(ws1, R, c1, c2, kpiLblSt[i]);
    addCell(ws1, R, c1, kpiLbls[i], kpiLblSt[i]);
    if (c1 !== c2) addMerge(ws1, R, c1, R, c2);
  });
  R++;

  // KPI 값
  setH(36);
  const kpiVals = [
    `${teamMeta.targetAmt.toLocaleString()}만원`,
    `${totalActAmt.toLocaleString()}만원`,
    `${teamMeta.targetCnt}건`,
    `${totalActCnt}건`,
    `${(amtRate * 100).toFixed(1)}%`,
  ];
  const kpiValSt = [
    S.kpiValBlue,
    amtRate >= 1 ? S.kpiValGreen : S.kpiValOrange,
    S.kpiValBlue,
    cntRate >= 1 ? S.kpiValGreen : S.kpiValOrange,
    amtRate >= 1 ? S.kpiValGreen : S.kpiValOrange,
  ];
  kpiSpans.forEach(([c1, c2], i) => {
    fillRow(ws1, R, c1, c2, kpiValSt[i]);
    addCell(ws1, R, c1, kpiVals[i], kpiValSt[i]);
    if (c1 !== c2) addMerge(ws1, R, c1, R, c2);
  });
  R++;

  setH(10); R++; // 간격

  // ── 섹션2: 팀원별 목표 vs 실적 테이블 ──────────────────────────
  setH(24);
  fillRow(ws1, R, 1, 9, S.secHead);
  addCell(ws1, R, 1, "▌ 팀원별 목표 vs 실적 현황", S.secHead);
  addMerge(ws1, R, 1, R, 9); R++;

  setH(22);
  ["이름","목표금액(만)","실적금액(만)","금액달성률","목표건수","실적건수","건수달성률","초과/미달(만)","초과/미달(건)"]
    .forEach((h, i) => addCell(ws1, R, 1 + i, h, S.colHead));
  R++;

  const perGoalCnt = agents.length > 0 ? Math.round(teamMeta.targetCnt / agents.length) : 0;

  agents.forEach((a: any, ri: number) => {
    setH(22);
    const p    = a.performance;
    const tAmt = Number(p.target_amt   || 0);
    const cAmt = Number(p.contract_amt || 0);
    const cCnt = Number(p.contract_cnt || 0);
    const aRate = tAmt > 0 ? cAmt / tAmt : 0;
    const cRate = perGoalCnt > 0 ? cCnt / perGoalCnt : 0;
    const diffA = cAmt - tAmt;
    const diffC = cCnt - perGoalCnt;
    const even  = ri % 2 === 0;

    addCell(ws1, R, 1, a.name, even ? S.nameEven : S.nameOdd);
    addCell(ws1, R, 2, tAmt, even ? S.dataEven : S.dataOdd, "#,##0");
    addCell(ws1, R, 3, cAmt, even ? S.dataEven : S.dataOdd, "#,##0");
    addCell(ws1, R, 4, `${(aRate*100).toFixed(1)}%`,
      aRate >= 1 ? (even ? S.rGreenEven : S.rGreenOdd) : (even ? S.rRedEven : S.rRedOdd));
    addCell(ws1, R, 5, perGoalCnt, even ? S.dataEven : S.dataOdd);
    addCell(ws1, R, 6, cCnt,       even ? S.dataEven : S.dataOdd);
    addCell(ws1, R, 7, `${(cRate*100).toFixed(1)}%`,
      cRate >= 1 ? (even ? S.rGreenEven : S.rGreenOdd) : (even ? S.rRedEven : S.rRedOdd));
    addCell(ws1, R, 8, diffA,
      diffA >= 0 ? (even ? S.rGreenEven : S.rGreenOdd) : (even ? S.rRedEven : S.rRedOdd), "#,##0;-#,##0");
    addCell(ws1, R, 9, diffC,
      diffC >= 0 ? (even ? S.rGreenEven : S.rGreenOdd) : (even ? S.rRedEven : S.rRedOdd));
    R++;
  });

  // 팀 합계
  setH(24);
  const dA = totalActAmt - teamMeta.targetAmt;
  const dC = totalActCnt - teamMeta.targetCnt;
  addCell(ws1, R, 1, "팀 합계",        S.totalHead);
  addCell(ws1, R, 2, teamMeta.targetAmt, S.totalRow, "#,##0");
  addCell(ws1, R, 3, totalActAmt,        S.totalRow, "#,##0");
  addCell(ws1, R, 4, `${(amtRate*100).toFixed(1)}%`, amtRate >= 1 ? S.totalGreen : S.totalRed);
  addCell(ws1, R, 5, teamMeta.targetCnt, S.totalRow);
  addCell(ws1, R, 6, totalActCnt,        S.totalRow);
  addCell(ws1, R, 7, `${(cntRate*100).toFixed(1)}%`, cntRate >= 1 ? S.totalGreen : S.totalRed);
  addCell(ws1, R, 8, dA, dA >= 0 ? S.totalGreen : S.totalRed, "#,##0;-#,##0");
  addCell(ws1, R, 9, dC, dC >= 0 ? S.totalGreen : S.totalRed);
  R++;

  setH(10); R++; // 간격

  // ── 섹션3: 팀 전체 활동 현황 ─────────────────────────────────────
  setH(24);
  fillRow(ws1, R, 1, 8, S.secHead);
  addCell(ws1, R, 1, "▌ 팀 전체 활동 현황 (전화 / 만남 / 제안 / 소개 / DB배정 / 반품)", S.secHead);
  addMerge(ws1, R, 1, R, 8); R++;

  setH(22);
  ["이름","전화","만남","제안","소개","DB배정","반품","활동합계"]
    .forEach((h, i) => addCell(ws1, R, 1 + i, h, S.colHead));
  R++;

  agents.forEach((a: any, ri: number) => {
    setH(22);
    const p    = a.performance;
    const even = ri % 2 === 0;
    const bg   = even ? S.dataEven : S.dataOdd;
    const total = Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)+Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0);

    addCell(ws1, R, 1, a.name,                    even ? S.nameEven : S.nameOdd);
    addCell(ws1, R, 2, Number(p.call        || 0), bg);
    addCell(ws1, R, 3, Number(p.meet        || 0), bg);
    addCell(ws1, R, 4, Number(p.pt          || 0), bg);
    addCell(ws1, R, 5, Number(p.intro       || 0), bg);
    addCell(ws1, R, 6, Number(p.db_assigned || 0), bg);
    addCell(ws1, R, 7, Number(p.db_returned || 0),
      Number(p.db_returned || 0) > 0 ? (even ? S.retRedEven : S.retRedOdd) : bg);
    addCell(ws1, R, 8, total, even ? S.actSumEven : S.actSumOdd);
    R++;
  });

  // 활동 합계 행
  setH(24);
  const grandAct = tCall + tMeet + tPt + tIntro + tDb + tRet;
  addCell(ws1, R, 1, "팀 합계", S.totalHead);
  addCell(ws1, R, 2, tCall,    S.totalRow);
  addCell(ws1, R, 3, tMeet,    S.totalRow);
  addCell(ws1, R, 4, tPt,      S.totalRow);
  addCell(ws1, R, 5, tIntro,   S.totalRow);
  addCell(ws1, R, 6, tDb,      S.totalRow);
  addCell(ws1, R, 7, tRet,     tRet > 0 ? S.totalRed : S.totalRow);
  addCell(ws1, R, 8, grandAct, S.totalGreen);
  R++;

  setH(10); R++; // 간격

  // ── 섹션4: 활동 전환율 분석 ──────────────────────────────────────
  setH(24);
  fillRow(ws1, R, 1, 8, S.secHead);
  addCell(ws1, R, 1, "▌ 팀 전체 활동 전환율 분석", S.secHead);
  addMerge(ws1, R, 1, R, 8); R++;

  setH(22);
  ["전화→만남 전환율","만남→제안 전환율","소개 건수","DB 배정","DB 반품","반품률"]
    .forEach((h, i) => addCell(ws1, R, 2 + i, h, S.colHead));
  R++;

  setH(26);
  const meetConvR = tCall > 0 ? (tMeet / tCall * 100).toFixed(1) : "0.0";
  const ptConvR   = tMeet > 0 ? (tPt   / tMeet * 100).toFixed(1) : "0.0";
  const retRateR  = tDb   > 0 ? (tRet  / tDb   * 100).toFixed(1) : "0.0";
  [`${meetConvR}%`, `${ptConvR}%`, `${tIntro}건`, `${tDb}건`, `${tRet}건`, `${retRateR}%`]
    .forEach((v, i) => {
      addCell(ws1, R, 2 + i, v,
        i === 5 && Number(retRateR) > 10 ? S.totalRed : S.totalRow);
    });
  R++;

  ws1["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R + 1, c: 10 } });
  XLSX.utils.book_append_sheet(wb, ws1, "📊 팀 전체 현황");

  /* ══════════════════════════════════════════════════════════════
     TAB 2 : 👤 개인별 상세 현황
  ══════════════════════════════════════════════════════════════ */
  const ws2: any = { "!merges": [], "!rows": [] };
  ws2["!cols"] = [
    { wch: 2  }, // A 여백
    { wch: 12 }, // B
    { wch: 12 }, // C
    { wch: 14 }, // D
    { wch: 12 }, // E
    { wch: 12 }, // F
    { wch: 12 }, // G
    { wch: 12 }, // H
    { wch: 12 }, // I
    { wch: 2  }, // J 여백
  ];

  let R2 = 0;
  const setH2 = (h: number) => { ws2["!rows"][R2] = { hpx: h }; };

  // 상단 여백
  setH2(10); R2++;

  // 타이틀
  setH2(40);
  fillRow(ws2, R2, 1, 8, S.title);
  addCell(ws2, R2, 1, `👤  팀원별 개인 실적 상세 리포트 — ${yearMonth}`, S.title);
  addMerge(ws2, R2, 1, R2, 8); R2++;

  // 부제
  setH2(16);
  fillRow(ws2, R2, 1, 8, S.subtitle);
  addCell(ws2, R2, 1, "※ 팀원별 개인 목표·실적·활동 내역 상세 리포트입니다.", S.subtitle);
  addMerge(ws2, R2, 1, R2, 8); R2++;

  // ── 팀원 반복 ─────────────────────────────────────────────────
  agents.forEach((a: any) => {
    const p      = a.performance;
    const tAmt   = Number(p.target_amt    || 0);
    const cAmt   = Number(p.contract_amt  || 0);
    const tCnt   = Number(p.target_cnt    || perGoalCnt);
    const cCnt   = Number(p.contract_cnt  || 0);
    const aRate  = tAmt > 0 ? cAmt / tAmt : 0;
    const cRate  = tCnt > 0 ? cCnt / tCnt : 0;
    const actTot = Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)+Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0);
    const mc     = Number(p.call||0) > 0 ? (Number(p.meet||0)/Number(p.call||1)*100).toFixed(1) : "0.0";
    const pc     = Number(p.meet||0) > 0 ? (Number(p.pt||0)/Number(p.meet||1)*100).toFixed(1)   : "0.0";

    // 구분 간격
    setH2(10); R2++;

    // 이름 배너
    setH2(28);
    fillRow(ws2, R2, 1, 8, S.memberBanner);
    addCell(ws2, R2, 1, `◆  ${a.name}  |  영업사원 개인 현황`, S.memberBanner);
    addMerge(ws2, R2, 1, R2, 8); R2++;

    // 목표/실적 컬럼 헤더
    setH2(22);
    addCell(ws2, R2, 1, "구분",        S.metaGoalLbl); addMerge(ws2, R2, 1, R2, 2);
    addCell(ws2, R2, 3, "금액 (만원)", S.metaGoalLbl); addMerge(ws2, R2, 3, R2, 4);
    addCell(ws2, R2, 5, "건수",        S.metaGoalLbl); addMerge(ws2, R2, 5, R2, 6);
    addCell(ws2, R2, 7, "",            S.metaGoalLbl); addMerge(ws2, R2, 7, R2, 8);
    R2++;

    // 목표 행
    setH2(24);
    addCell(ws2, R2, 1, "목표", S.metaGoalLbl);   addMerge(ws2, R2, 1, R2, 2);
    addCell(ws2, R2, 3, tAmt,   S.metaVal, "#,##0"); addMerge(ws2, R2, 3, R2, 4);
    addCell(ws2, R2, 5, tCnt,   S.metaVal);          addMerge(ws2, R2, 5, R2, 6);
    addCell(ws2, R2, 7, "",     S.metaVal);           addMerge(ws2, R2, 7, R2, 8);
    R2++;

    // 실적 행
    setH2(24);
    addCell(ws2, R2, 1, "실적", S.metaActLbl);    addMerge(ws2, R2, 1, R2, 2);
    addCell(ws2, R2, 3, cAmt,   S.metaVal, "#,##0"); addMerge(ws2, R2, 3, R2, 4);
    addCell(ws2, R2, 5, cCnt,   S.metaVal);          addMerge(ws2, R2, 5, R2, 6);
    addCell(ws2, R2, 7, "",     S.metaVal);           addMerge(ws2, R2, 7, R2, 8);
    R2++;

    // 달성률 행
    setH2(24);
    const rLbl = aRate >= 1 ? S.metaRGreenLbl : S.metaRRedLbl;
    const rVal = aRate >= 1 ? S.metaRGreen    : S.metaRRed;
    const rVal2= cRate >= 1 ? S.metaRGreen    : S.metaRRed;
    addCell(ws2, R2, 1, "달성률",              rLbl);  addMerge(ws2, R2, 1, R2, 2);
    addCell(ws2, R2, 3, `${(aRate*100).toFixed(1)}%`, rVal); addMerge(ws2, R2, 3, R2, 4);
    addCell(ws2, R2, 5, `${(cRate*100).toFixed(1)}%`, rVal2);addMerge(ws2, R2, 5, R2, 6);
    addCell(ws2, R2, 7, "",                    S.metaVal); addMerge(ws2, R2, 7, R2, 8);
    R2++;

    // 활동 헤더
    setH2(22);
    ["전화","만남","제안","소개","DB배정","반품","활동합계"].forEach((h, i) => {
      addCell(ws2, R2, 1 + i, h, { ...S.colHeadSm });
    });
    addCell(ws2, R2, 8, "", S.colHeadSm);
    R2++;

    // 활동 데이터
    setH2(24);
    [Number(p.call||0), Number(p.meet||0), Number(p.pt||0),
     Number(p.intro||0), Number(p.db_assigned||0), Number(p.db_returned||0), actTot
    ].forEach((v, i) => {
      addCell(ws2, R2, 1 + i, v,
        i === 5 && v > 0 ? S.retRedEven
        : i === 6 ? S.actSumEven
        : S.dataEven);
    });
    addCell(ws2, R2, 8, "", S.dataEven);
    R2++;

    // 전환율 행
    setH2(22);
    addCell(ws2, R2, 1, `전화→만남 전환율: ${mc}%`, S.convBlue);   addMerge(ws2, R2, 1, R2, 4);
    addCell(ws2, R2, 5, `만남→제안 전환율: ${pc}%`, S.convOrange); addMerge(ws2, R2, 5, R2, 8);
    R2++;
  });

  ws2["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R2 + 1, c: 9 } });
  XLSX.utils.book_append_sheet(wb, ws2, "👤 개인별 상세 현황");

  // ── 저장 ────────────────────────────────────────────────────────
  XLSX.writeFile(wb, `Sales_Report_${monthKey}.xlsx`);
};