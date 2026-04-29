'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

export default function DmPage() {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [advisorName, setAdvisorName] = useState('담당자')
  const [advisorPhone, setAdvisorPhone] = useState('')
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [dmLogs, setDmLogs] = useState<{ name: string; title: string; date: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const [{ data: userData }, { data: tmplData }, { data: custData }, { data: logData }] = await Promise.all([
      supabase.from('users').select('name, phone').eq('id', session.user.id).single(),
      supabase.from('dm_templates').select('*').order('created_at', { ascending: true }),
      supabase.from('customers').select('id, name, phone, monthly_premium, policy_count')
        .eq('advisor_id', session.user.id).order('name', { ascending: true }),
      supabase.from('dm_logs').select('content, sent_at, dm_templates(title), customers(name)')
        .order('sent_at', { ascending: false }).limit(5),
    ])

    setAdvisorName(userData?.name || session.user.email?.split('@')[0] || '담당자')
    setAdvisorPhone(userData?.phone || '')

    const tmplList = tmplData || []
    const custList = custData || []
    setTemplates(tmplList)
    setCustomers(custList)
    if (tmplList.length) setSelectedTemplate(tmplList[0])
    if (custList.length) setSelectedCustomer(custList[0])
    setDmLogs(
      (logData || []).map((l: any) => ({
        name: l.customers?.name || '', title: l.dm_templates?.title || '',
        date: l.sent_at?.slice(5, 10) || '',
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const preview = selectedTemplate && selectedCustomer
    ? (selectedTemplate.content || '')
        .replace(/\{\{customer_name\}\}/g, selectedCustomer.name)
        .replace(/\{\{advisor_name\}\}/g, advisorName)
        .replace(/\{\{advisor_phone\}\}/g, advisorPhone)
    : ''

  const handleCopy = async () => {
    if (!preview || !selectedCustomer || !selectedTemplate) return
    await navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    await supabase.from('dm_logs').insert({
      customer_id: selectedCustomer.id,
      template_id: selectedTemplate.id,
      content: preview,
      sent_by: advisorName,
    })
    setDmLogs(prev => [
      { name: selectedCustomer.name, title: selectedTemplate.title, date: new Date().toISOString().slice(5, 10) },
      ...prev.slice(0, 4),
    ])
  }

  const filteredCustomers = customers.filter(c =>
    !search || c.name.includes(search) || c.phone.includes(search)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">DM 메시지</h1>
        <p className="text-sm text-gray-500 mt-0.5">고객별 맞춤 DM 메시지를 작성하고 복사합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 템플릿 선택 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">메시지 템플릿</h2>
          {templates.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">등록된 템플릿이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {templates.map(tmpl => (
                <button key={tmpl.id} onClick={() => setSelectedTemplate(tmpl)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedTemplate?.id === tmpl.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-800">{tmpl.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{tmpl.content?.slice(0, 40)}...</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 고객 선택 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">고객 선택</h2>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 mb-3"
            placeholder="고객 검색..." value={search} onChange={e => setSearch(e.target.value)}
          />
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {filteredCustomers.map(c => (
              <button key={c.id} onClick={() => setSelectedCustomer(c)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
                  selectedCustomer?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                  {c.name[0]}
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-800">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.phone}</div>
                </div>
              </button>
            ))}
            {filteredCustomers.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">고객이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 미리보기 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">미리보기</h2>
            <button onClick={handleCopy} disabled={!preview}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${
                copied ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 min-h-48">
            {selectedCustomer && (
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-500">수신자:</span>
                <span className="text-xs font-medium text-gray-800">{selectedCustomer.name} ({selectedCustomer.phone})</span>
              </div>
            )}
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {preview || <span className="text-gray-400">템플릿과 고객을 선택하세요.</span>}
            </pre>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-600 mb-2">최근 발송 이력</h3>
            {dmLogs.length === 0 ? (
              <p className="text-xs text-gray-400">발송 이력이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {dmLogs.map((log, i) => (
                  <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                    {log.date} {log.name} · {log.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
