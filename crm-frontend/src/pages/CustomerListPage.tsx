import { useState, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import CustomerTable from '@/components/customer/CustomerTable'
import CustomerSearch from '@/components/customer/CustomerSearch'
import type { FilterState } from '@/components/customer/CustomerSearch'
import CustomerForm from '@/components/customer/CustomerForm'
import ReassignModal from '@/components/customer/ReassignModal'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { canViewInList } from '@/lib/permissions'
import { Download, Upload, Trash2, Users, Plus, Eye, EyeOff, Waves } from 'lucide-react'
import type { CustomerType, CustomerPositioning, CustomerAttribute } from '@/types'

export default function CustomerListPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const { customers, addCustomer, softDeleteCustomer, hardDeleteCustomer, claimFromPool } = useCustomers()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({})
  const [selected, setSelected] = useState<string[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [showPool, setShowPool] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const filteredCustomers = useMemo(() => {
    let list = customers

    // Soft delete filtering
    if (isAdmin && showDeleted) {
      // Show everything
    } else if (isAdmin) {
      list = list.filter(c => !c.deleted)
    } else {
      list = list.filter(c => {
        if (c.deleted) return false
        if ((c.hiddenBy || []).includes(user?.id || '')) return false
        if (!canViewInList(user?.id || '', user?.permissionLevel || 'general', c)) return false
        return true
      })
    }

    // Pool filter — customers without an owner
    if (showPool) {
      list = list.filter(c => !c.ownedBy && !c.deleted)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.shortName && c.shortName.toLowerCase().includes(q)) ||
        c.projects?.some(p => p.name.toLowerCase().includes(q))
      )
    }

    if (filters.customerType) {
      list = list.filter(c => c.type === filters.customerType)
    }
    if (filters.positioning) {
      list = list.filter(c => c.positioning === filters.positioning)
    }
    if (filters.region) {
      list = list.filter(c => c.region.includes(filters.region!))
    }
    if (filters.followStatus) {
      list = list.filter(c =>
        c.projects?.some(p => p.followStatus === filters.followStatus)
      )
    }

    return list
  }, [customers, searchQuery, filters, showDeleted, isSuperAdmin, user?.id])

  /* ---- CSV template download ---- */
  const downloadTemplate = () => {
    const BOM = '﻿'
    const headers = ['客户名称', '客户类型', '客户定位', '客户属性', '详细地址', '创建人', '联系人姓名', '联系人电话', '联系人职位']
    const labels: Record<string, string> = { owner: '业主', integrator: '集成商', channel: '渠道商', vip: 'VIP客户', key: '重点客户', normal: '普通客户', low: '低价值', pending: '待筛选', company: '公司', individual: '个人' }
    const sample = ['示例公司', labels.owner, labels.normal, labels.company, '北京市海淀区', '张管理', '李总', '13800138000', '总经理']
    const csv = BOM + [headers, sample].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '客户批量导入模板.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('模板已下载')
  }

  /* ---- CSV import ---- */
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      // Read as ArrayBuffer for encoding detection
      const buf = await file.arrayBuffer()
      // Try UTF-8 first (strip BOM if present)
      const utf8bytes = new Uint8Array(buf)
      const hasBOM = utf8bytes[0] === 0xEF && utf8bytes[1] === 0xBB && utf8bytes[2] === 0xBF
      const text = hasBOM
        ? new TextDecoder('utf-8').decode(buf.slice(3))
        : new TextDecoder('utf-8').decode(buf)
      // If text has garbled chars (replacement char �), try GBK
      const cleanText = text.includes('�')
        ? new TextDecoder('gbk').decode(buf.slice(hasBOM ? 3 : 0))
        : text
      const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l)
      if (lines.length < 2) {
        toast.error('模板为空或格式不正确，至少包含表头和一行数据')
        return
      }

      // Parse header — trim each cell for robust matching
      const header = parseCSVLine(lines[0]).map(h => h.trim().replace(/^["']|["']$/g, ''))
      const nameIdx = header.findIndex(h => h.includes('客户名称'))
      const typeIdx = header.findIndex(h => h.includes('客户类型'))
      const posIdx = header.findIndex(h => h.includes('客户定位'))
      const attrIdx = header.findIndex(h => h.includes('客户属性'))
      const addrIdx = header.findIndex(h => h.includes('详细地址') || h.includes('地址'))
      const creatorIdx = header.findIndex(h => h.includes('创建人'))
      const contactNameIdx = header.findIndex(h => h.includes('联系人姓名') || h === '联系人')
      const contactPhoneIdx = header.findIndex(h => h.includes('联系人电话') || h.includes('电话'))
      const contactPosIdx = header.findIndex(h => h.includes('联系人职位') || h.includes('职位'))

      if (nameIdx === -1) {
        const detected = header.join(' | ') || '(空)'
        toast.error(`模板缺少"客户名称"列，检测到的表头为：${detected}`)
        return
      }

      const labelToValue: Record<string, string> = { '业主': 'owner', '集成商': 'integrator', '渠道商': 'channel', 'VIP客户': 'vip', '重点客户': 'key', '普通客户': 'normal', '低价值': 'low', '待筛选': 'pending', '公司': 'company', '个人': 'individual' }
      let total = 0
      let blank = 0

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        const name = cols[nameIdx]?.trim()
        if (!name) { blank++; continue }
        total++
        addCustomer({
          name,
          region: '未填写',
          type: (labelToValue[cols[typeIdx]?.trim()] || cols[typeIdx]?.trim() || 'owner') as CustomerType,
          positioning: (labelToValue[cols[posIdx]?.trim()] || cols[posIdx]?.trim() || 'normal') as CustomerPositioning,
          customerAttribute: (labelToValue[cols[attrIdx]?.trim()] || cols[attrIdx]?.trim() || 'company') as CustomerAttribute,
          detailedAddress: cols[addrIdx]?.trim() || undefined,
          createdBy: user?.id || 'unknown',
          createdByName: cols[creatorIdx]?.trim() || user?.name || '未知用户',
          contacts: cols[contactNameIdx]?.trim()
            ? [{ name: cols[contactNameIdx].trim(), phone: cols[contactPhoneIdx]?.trim() || '', position: cols[contactPosIdx]?.trim() || '', description: undefined }]
            : [],
          provinceCode: undefined,
          provinceName: undefined,
          cityCode: undefined,
          cityName: undefined,
          districtCode: undefined,
          districtName: undefined,
          notes: undefined,
        })
      }

      toast.success(`已导入 ${total} 条客户数据${blank ? `，${blank} 条跳过（无名称）` : ''}`)
    } catch (err) {
      toast.error('文件读取失败，请检查 CSV 格式')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current); current = ''
      } else {
        current += line[i]
      }
    }
    result.push(current)
    return result
  }

  const handleBatchDelete = () => {
    if (!user) return
    if (isAdmin) {
      if (window.confirm(`确定永久删除 ${selected.length} 条客户记录？\n\n此操作不可撤销，数据将从数据库中彻底移除。`)) {
        selected.forEach(id => hardDeleteCustomer(id, user.name))
        toast.success(`已永久删除 ${selected.length} 条记录`)
      } else {
        return // Cancel = do nothing
      }
    } else {
      if (window.confirm(`确定删除 ${selected.length} 条记录？\n\n删除后可联系管理员恢复。`)) {
        selected.forEach(id => softDeleteCustomer(id, user.id, user.name))
        toast.success(`已删除 ${selected.length} 条记录`)
      } else {
        return // Cancel = do nothing
      }
    }
    setSelected([])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 font-display mb-1">客户管理</h1>
          <p className="text-xs text-slate-400">共 {filteredCustomers.length} 条记录</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowPool(!showPool); setShowDeleted(false) }}
            className={`flex items-center gap-1 px-3 py-2 text-[10px] font-medium rounded-lg border interactive ${showPool ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white/60 text-slate-500 border-black/5'}`}
          >
            <Waves size={12} />
            {showPool ? '返回全部' : '公海'}
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`flex items-center gap-1 px-3 py-2 text-[10px] font-medium rounded-lg border interactive ${showDeleted ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white/60 text-slate-500 border-black/5'}`}
            >
              {showDeleted ? <EyeOff size={12} /> : <Eye size={12} />}
              {showDeleted ? '隐藏已删除' : '显示已删除'}
            </button>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-slate-600 bg-white/60 rounded-lg border border-black/5 interactive disabled:opacity-40"
              title="导入CSV文件"
            >
              <Upload size={12} /> {importing ? '导入中...' : '批量导入'}
            </button>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-slate-600 bg-white/60 rounded-lg border border-black/5 interactive"
              title="下载CSV模板"
            >
              <Download size={12} /> 模板
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive"
            >
              <Plus size={14} /> 新建客户
            </button>
          </div>
        </div>
      </div>

      <CustomerSearch
        onSearch={setSearchQuery}
        onFilter={setFilters}
      />

      {/* Batch actions */}
      {selected.length > 0 && (
        <div className="glass-card p-3 my-3 flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
          <span className="text-xs text-slate-600 font-medium">已选 {selected.length} 项</span>
          <div className="flex gap-2">
            {showPool && (
              <button
                onClick={() => {
                  if (!user) return
                  selected.forEach(id => claimFromPool(id, user.id, user.name))
                  toast.success(`已领取 ${selected.length} 个客户`)
                  setSelected([])
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white bg-blue-500 rounded-lg interactive"
              >
                <Users size={12} /> 领取选中
              </button>
            )}
            {!showPool && isAdmin && (
              <>
                <button
                  onClick={() => setShowReassignModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-slate-600 bg-white/60 rounded-lg border border-black/5 interactive"
                >
                  <Users size={12} /> 分配创建人
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-red-500 bg-red-50/60 rounded-lg border border-red-100 interactive"
                >
                  <Trash2 size={12} /> 删除
                </button>
              </>
            )}
          </div>
          <button onClick={() => setSelected([])} className="ml-auto text-[10px] text-slate-400 hover:text-slate-600">
            取消选择
          </button>
        </div>
      )}

      <div className="mt-3">
        <CustomerTable
          customers={filteredCustomers}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <CustomerForm open={showCreateForm} onClose={() => setShowCreateForm(false)} />
      <ReassignModal
        open={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        selectedIds={selected}
        onReassigned={() => setSelected([])}
      />
    </div>
  )
}
