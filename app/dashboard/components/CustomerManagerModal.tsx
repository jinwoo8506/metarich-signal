"use client"

import React, { useState } from 'react'
import * as XLSX from 'xlsx' // npm install xlsx 설치 필요
import { X, FileUp, CheckCircle2, Calendar } from 'lucide-react'

export default function CustomerManagerModal({ onClose, onSaveToGoogle }: any) {
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // 날짜 계산 함수 (5번 미션: 30일, 90일, 180일, 365일)
  const calculateFollowUp = (baseDate: string, days: number) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  // 엑셀 파일 읽기 및 데이터 추출
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      // 데이터 매핑 및 자동 날짜 계산
      const formatted = data.map((row: any) => {
        const contractDate = row['계약일'] || row['date'] || new Date().toISOString().split('T')[0];
        return {
          name: row['이름'] || row['고객명'] || '미기입',
          phone: row['연락처'] || row['휴대폰'] || '010-0000-0000',
          contract_date: contractDate,
          // 자동 팔로업 스케줄 생성
          d30: calculateFollowUp(contractDate, 30),
          d90: calculateFollowUp(contractDate, 90),
          d180: calculateFollowUp(contractDate, 180),
          d365: calculateFollowUp(contractDate, 365),
        };
      });

      setPreviewData(formatted);
      setIsProcessing(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-black">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl border-4 border-black animate-in zoom-in-95 duration-200">
        
        {/* 헤더 */}
        <div className="bg-black text-[#d4af37] p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl italic uppercase font-black">Customer Auto Management</h2>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <X className="w-8 h-8 text-white" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
          
          {/* 드롭존 / 파일 업로드 */}
          {previewData.length === 0 ? (
            <div className="border-4 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center hover:border-[#d4af37] transition-colors group relative">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileUp className="w-16 h-16 mx-auto mb-4 text-slate-300 group-hover:text-[#d4af37] transition-colors" />
              <p className="text-xl text-slate-400 font-black">기존 관리 엑셀 파일을 이리로 던져주세요</p>
              <p className="text-sm text-slate-300 mt-2 italic">이름, 연락처, 계약일 항목을 자동으로 추출합니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <p className="text-blue-600 italic font-black">총 {previewData.length}명의 고객 데이터가 준비되었습니다.</p>
                <button onClick={() => setPreviewData([])} className="text-[12px] text-slate-400 underline">다시 업로드</button>
              </div>

              {/* 미리보기 테이블 */}
              <div className="border-2 border-black rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-slate-50 border-b-2 border-black">
                    <tr>
                      <th className="p-4">고객명</th>
                      <th className="p-4">계약일</th>
                      <th className="p-4 text-orange-500">90일(면책종료)</th>
                      <th className="p-4 text-emerald-500">1년(감액종료)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 bg-white">
                        <td className="p-4 font-black">{row.name}</td>
                        <td className="p-4 text-slate-500">{row.contract_date}</td>
                        <td className="p-4 font-black text-orange-600 italic">{row.d90}</td>
                        <td className="p-4 font-black text-emerald-600 italic">{row.d365}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 5 && <div className="p-3 bg-slate-50 text-center text-[11px] text-slate-400 italic">외 {previewData.length - 5}명의 데이터를 더 처리합니다...</div>}
              </div>

              {/* 전송 버튼 */}
              <button 
                onClick={() => onSaveToGoogle(previewData)}
                className="w-full bg-[#d4af37] text-black py-6 rounded-[2rem] font-black text-[20px] shadow-xl hover:bg-black hover:text-[#d4af37] transition-all flex items-center justify-center gap-3 italic uppercase"
              >
                <CheckCircle2 className="w-6 h-6" />
                Sync to Google Sheet & Calendar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}