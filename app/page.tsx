import { redirect } from 'next/navigation'

export default function Home() {
  // 사이트 접속하자마자 /dashboard 페이지로 자동 이동시킵니다.
  redirect('/dashboard')
}