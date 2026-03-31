// app/insurance-tools/layout.tsx
import { createServerClient } from '@supabase/ssr' // 최신 SSR 라이브러리 사용 권장
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
  title: '보험 툴 | Insurance Manager',
  description: '수술비 · 진단비 · 장해 · 자동차부상 계산기',
}

export default async function InsuranceToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  
  // 서버 클라이언트 생성 (최신 @supabase/ssr 방식)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // 세션이 없으면 로그인 페이지로 리다이렉트
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 font-black">
      {children}
    </div>
  )
}