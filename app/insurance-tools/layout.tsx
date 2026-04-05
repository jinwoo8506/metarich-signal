// app/insurance-tools/layout.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
  title: '보험 전문 도구 | Metarich Signal',
  description: '수술비 · 진단비 · 장해 · 자동차부상 전문 계산기 및 분석 툴',
}

export default async function InsuranceToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Next.js 최신 버전에서는 cookies()가 비동기로 작동할 수 있으므로 await 대응이 필요할 수 있습니다.
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // SSR 환경에서 쿠키 설정을 위한 추가 옵션 (안정성 강화)
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // 서버 컴포넌트에서 쿠키 세팅은 가끔 제한될 수 있으므로 예외처리
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete({ name, ...options })
          } catch (error) {
            // 예외처리
          }
        },
      },
    }
  )

  /**
   * getSession() 대신 getUser()를 사용하는 것이 보안상 더 안전합니다.
   * getSession은 로컬 저장된 데이터를 신뢰하지만, getUser는 실제 Supabase 서버에서 검증합니다.
   */
  const { data: { user }, error } = await supabase.auth.getUser()

  // 세션이 없거나 에러가 발생하면 로그인 페이지로 리다이렉트
  if (error || !user) {
    redirect('/login')
  }

  /**
   * [선택 사항] 사용자 역할(Role)에 따른 추가 보안 로직
   * 예: 관리자 전용 페이지 접근 제어 등을 여기서 수행할 수 있습니다.
   */

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* 전역 폰트 설정을 'font-black'으로 하셨는데, 
        텍스트 가독성을 위해 기본은 font-sans로 하고 
        강조가 필요한 제목 등에 개별적으로 font-black을 쓰는 것을 추천합니다.
      */}
      <main className="relative flex flex-col min-h-screen">
        {/* 필요한 경우 여기에 공통 네비게이션 바(GNB)를 추가할 수 있습니다. */}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}