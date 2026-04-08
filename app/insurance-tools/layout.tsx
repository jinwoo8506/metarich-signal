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
  // Next.js 최신 버전의 비동기 cookies 대응
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // SSR 환경에서 쿠키 설정을 위한 추가 옵션
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // 서버 컴포넌트 내 세팅 제한 예외처리
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
   * 🎯 [핵심 수정] 튕김 현상 방지를 위해 getSession() 사용
   * getUser()는 매번 서버 검증을 수행하여 라우팅 타이밍 이슈 발생 시 세션 유실로 판단할 수 있습니다.
   * getSession()은 쿠키에 저장된 세션 데이터를 우선적으로 읽어오므로 
   * 모달 닫힘과 페이지 이동이 겹치는 시점에서도 더 안정적으로 인증을 유지합니다.
   */
  const { data: { session } } = await supabase.auth.getSession()

  // 세션이 없으면 로그인 페이지로 리다이렉트
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <main className="relative flex flex-col min-h-screen">
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}