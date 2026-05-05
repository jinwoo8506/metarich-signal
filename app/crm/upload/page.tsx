'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { deleteLocalFile, getLocalFile, saveLocalFile } from '../../../lib/crmLocalFiles'

const CATEGORIES = ['전체', '암', '뇌', '심장', '수술', '간병', '재가', '치매']
const STORAGE_KEY = 'signal-crm-upload-files'

type UploadItem = {
  id: string
  name: string
  size: number
  type: string
  category: string
  date: string
  status: 'pending' | 'analyzing' | 'done'
  memo: string
  customerId: string
  customerName: string
  driveUrl: string
  includeInReport: boolean
  hasLocalFile: boolean
  localFileType: string
}

const statusConf = {
  pending: { label: '대기', cls: 'badge-gray' },
  analyzing: { label: '분류 중', cls: 'badge-yellow' },
  done: { label: '정리 완료', cls: 'badge-green' },
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('전체')
  const [selectedCategory, setSelectedCategory] = useState('암')
  const [items, setItems] = useState<UploadItem[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    const loadCustomers = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('advisor_id', session.user.id)
        .order('name', { ascending: true })
      const list = data || []
      setCustomers(list)
      setSelectedCustomerId(list[0]?.id || '')
    }
    loadCustomers()
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    let disposed = false
    const urls: string[] = []
    const loadPreviews = async () => {
      const imageItems = items.filter((item) => item.hasLocalFile && String(item.localFileType || '').startsWith('image/'))
      const next: Record<string, string> = {}
      for (const item of imageItems) {
        const file = await getLocalFile(item.id)
        if (!file?.blob) continue
        const url = URL.createObjectURL(file.blob)
        urls.push(url)
        next[item.id] = url
      }
      if (!disposed) setPreviewUrls(next)
    }
    loadPreviews()
    return () => {
      disposed = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [items])

  const filteredItems = useMemo(() => (
    category === '전체' ? items : items.filter((item) => item.category === category)
  ), [category, items])

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return
    const now = new Date().toISOString().slice(0, 10)
    const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)
    const nextItems: UploadItem[] = []
    Array.from(fileList).forEach((file) => {
      const id = `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`
      saveLocalFile({
        id,
        name: file.name,
        type: file.type || file.name.split('.').pop()?.toUpperCase() || 'FILE',
        size: file.size,
        blob: file,
        savedAt: new Date().toISOString(),
      }).catch(() => {})
      nextItems.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop()?.toUpperCase() || 'FILE',
        category: selectedCategory,
        date: now,
        status: 'pending',
        memo: '',
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || '',
        driveUrl: '',
        includeInReport: true,
        hasLocalFile: true,
        localFileType: file.type || '',
      })
    })
    setItems((prev) => [...nextItems, ...prev])
    if (inputRef.current) inputRef.current.value = ''
  }

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const removeItem = (id: string) => {
    deleteLocalFile(id).catch(() => {})
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">업로드 분석</div>
          <div className="page-subtitle">보험증권, 설명자료, 상담 이미지를 항목별로 정리합니다.</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setItems([])} disabled={items.length === 0}>목록 초기화</button>
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card card-p" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>자료 분류</div>
            <span className="badge badge-blue">{selectedCategory}</span>
          </div>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">연결 고객</label>
              <select className="form-input" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                {customers.length === 0 && <option value="">고객 없음</option>}
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name} {customer.phone ? `(${customer.phone})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">기본 분류</label>
              <select className="form-input" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {CATEGORIES.filter((item) => item !== '전체').map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="tab-bar">
            {CATEGORIES.filter((item) => item !== '전체').map((item) => (
              <button key={item} className={`tab-btn${selectedCategory === item ? ' active' : ''}`} onClick={() => setSelectedCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <div
            className="upload-zone"
            onClick={() => inputRef.current?.click()}
            onDrop={(event) => {
              event.preventDefault()
              handleFiles(event.dataTransfer.files)
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            <input ref={inputRef} type="file" multiple hidden accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => handleFiles(event.target.files)} />
            <div className="upload-icon">📁</div>
            <div className="upload-text">파일을 드래그하거나 클릭하여 업로드</div>
            <div className="upload-sub">PDF, Excel, Word, JPG, PNG 지원 · 이 PC 브라우저에 보관하고 리포트에 연결</div>
          </div>
        </div>

        <div className="card card-p">
          <div className="card-title">운영 메모</div>
          <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.8 }}>
            큰 이미지는 Supabase에 바로 저장하지 않고, Google Drive 원본 링크를 고객 상세 메모나 리포트 자료로 연결하는 방식이 안전합니다.
          </div>
          <div className="divider" />
          <div className="grid-2">
            <MiniStat label="전체 자료" value={items.length} />
            <MiniStat label="정리 완료" value={items.filter((item) => item.status === 'done').length} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-p flex justify-between items-center">
          <div className="card-title" style={{ marginBottom: 0 }}>업로드 파일 목록</div>
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            {CATEGORIES.map((item) => (
              <button key={item} className={`tab-btn${category === item ? ' active' : ''}`} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div style={{ padding: 38, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>업로드한 자료가 없습니다.</div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '32px 1.4fr 150px 110px 120px 84px', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 18 }}>{fileIcon(item.name)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatSize(item.size)} · {item.date} · {item.category}{item.customerName ? ` · ${item.customerName}` : ''} · {item.hasLocalFile ? 'PC 저장됨' : '링크만'}</div>
                {previewUrls[item.id] && (
                  <img src={previewUrls[item.id]} alt={item.name} style={{ width: 120, height: 78, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 8 }} />
                )}
                <input className="form-input" value={item.memo} onChange={(event) => updateItem(item.id, { memo: event.target.value })} placeholder="메모 입력" style={{ marginTop: 8, padding: '6px 10px', fontSize: 12 }} />
                <input className="form-input" value={item.driveUrl || ''} onChange={(event) => updateItem(item.id, { driveUrl: event.target.value })} placeholder="Google Drive 링크 입력" style={{ marginTop: 6, padding: '6px 10px', fontSize: 12 }} />
              </div>
              <select
                className="form-input"
                value={item.customerId || ''}
                onChange={(event) => {
                  const customer = customers.find((entry) => entry.id === event.target.value)
                  updateItem(item.id, { customerId: customer?.id || '', customerName: customer?.name || '' })
                }}
              >
                <option value="">고객 미연결</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
              <select className="form-input" value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value })}>
                {CATEGORIES.filter((entry) => entry !== '전체').map((entry) => <option key={entry}>{entry}</option>)}
              </select>
              <select className="form-input" value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value as UploadItem['status'] })}>
                <option value="pending">대기</option>
                <option value="analyzing">분류 중</option>
                <option value="done">정리 완료</option>
              </select>
              <div className="flex-col gap-8">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                  <input type="checkbox" checked={item.includeInReport !== false} onChange={(event) => updateItem(item.id, { includeInReport: event.target.checked })} />
                  리포트
                </label>
                <button className="btn btn-secondary btn-xs" onClick={() => removeItem(item.id)}>삭제</button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray rounded p-12">
      <div className="text-muted" style={{ fontSize: 11 }}>{label}</div>
      <div className="fw-700 text-blue" style={{ fontSize: 20 }}>{value}</div>
    </div>
  )
}

function formatSize(size: number) {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(size / 1024))}KB`
}

function fileIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return '📄'
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return '📊'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) return '🖼️'
  return '📎'
}
