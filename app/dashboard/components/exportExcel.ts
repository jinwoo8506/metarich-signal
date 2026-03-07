import * as XLSX from 'xlsx-js-style';

export const exportExcel = ({ agents, teamMeta, totalActivity, monthKey }: any) => {
  const wb = XLSX.utils.book_new();

  // 1. 팀 전체 요약 (대시보드 스타일)
  const ws1 = XLSX.utils.aoa_to_sheet([
    ["팀 전체 실적 요약", "", "", ""],
    ["구분", "전체 전화", "전체 만남", "전체 제안", "전체 소개"],
    ["합계", totalActivity.call, totalActivity.meet, totalActivity.pt, totalActivity.intro]
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, "팀 전체 요약");

  // 2. 직원별 상세 실적
  const ws2 = XLSX.utils.json_to_sheet(agents.map((a: any) => ({
    성명: a.name,
    목표금액: a.performance.target_amt,
    실적금액: a.performance.contract_amt,
    실적건수: a.performance.contract_cnt,
    전화: a.performance.call,
    만남: a.performance.meet
  })));
  XLSX.utils.book_append_sheet(wb, ws2, "직원별 세부 실적");

  XLSX.writeFile(wb, `Team_Report_${monthKey}.xlsx`);
};