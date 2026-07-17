import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Check, CalendarDays, Upload, X, Eye, Pencil, Trash2, Plus, DollarSign } from 'lucide-react'
import GlassModal from '@/components/glass/GlassModal'
import { useContracts } from '@/hooks/useContracts'
import type { Payment } from '@/types'

interface Props {
  payments: Payment[]
  contractId: string
  canEdit: boolean
  projectAmount: number
}

/* ------------------------------------------------------------------ */
/*  tiny shared primitives                                            */
/* ------------------------------------------------------------------ */

function EditIcon({ onClick, title }: { onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} className="p-0.5 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors shrink-0" title={title || '编辑'}>
      <Pencil size={11} />
    </button>
  )
}

function SaveCancel({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1 shrink-0">
      <button onClick={onSave} className="p-0.5 rounded text-emerald-500 hover:bg-emerald-50" title="保存"><Check size={11} /></button>
      <button onClick={onCancel} className="p-0.5 rounded text-red-400 hover:bg-red-50" title="取消"><X size={11} /></button>
    </span>
  )
}

/* ================================================================== */

export default function PaymentSchedule({ payments, contractId, canEdit, projectAmount }: Props) {
  const { updatePayment, addPayment, removePayment } = useContracts()
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [voucherFile, setVoucherFile] = useState<string | null>(null)
  const [voucherFileName, setVoucherFileName] = useState('')
  const [voucherDate, setVoucherDate] = useState('')
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Inline editing state ---
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCondition, setEditCondition] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')

  // --- Add new payment state ---
  const [adding, setAdding] = useState(false)
  const [newCondition, setNewCondition] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = projectAmount - totalAmount
  const completedCount = payments.filter(p => p.completed).length
  const allComplete = payments.length > 0 && payments.every(p => p.completed)

  /* --------------- voucher upload --------------- */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('仅支持 JPG、PNG、GIF、WebP、BMP、SVG 格式')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setVoucherFile(reader.result as string)
      setVoucherFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const openUpload = (paymentId: string) => {
    setUploadingId(paymentId)
    setVoucherFile(null)
    setVoucherFileName('')
    setVoucherDate(new Date().toISOString().slice(0, 10))
  }

  const handleUploadVoucher = () => {
    if (!uploadingId) return
    if (!voucherFile) { toast.error('请选择付款凭证图片'); return }
    if (!voucherDate) { toast.error('请选择收款日期'); return }
    updatePayment(contractId, uploadingId, {
      voucherFile,
      paymentDate: voucherDate,
      completed: true,
    })
    toast.success('付款凭证已上传，收款已标记完成')
    setUploadingId(null)
  }

  /* --------------- inline edit --------------- */

  const beginEdit = (p: Payment) => {
    setEditingId(p.id)
    setEditCondition(p.condition)
    setEditAmount(String(p.amount))
    setEditDate(p.paymentDate || '')
  }

  const saveEdit = (paymentId: string) => {
    const num = Number(editAmount)
    if (isNaN(num) || num <= 0) { toast.error('请输入有效的金额'); return }
    updatePayment(contractId, paymentId, {
      condition: editCondition,
      amount: num,
      paymentDate: editDate || undefined,
    })
    toast.success('收款计划已更新')
    setEditingId(null)
  }

  /* --------------- add --------------- */

  const beginAdd = () => {
    setAdding(true)
    setNewCondition('')
    setNewAmount(String(Math.max(0, remaining)))
  }

  const handleAddPayment = () => {
    const num = Number(newAmount)
    if (!newCondition.trim()) { toast.error('请输入收款条件'); return }
    if (isNaN(num) || num <= 0) { toast.error('请输入有效的金额'); return }
    addPayment(contractId, { condition: newCondition.trim(), amount: num })
    toast.success('收款计划已添加')
    setAdding(false)
  }

  /* --------------- delete --------------- */

  const handleDeletePayment = (paymentId: string, condition: string) => {
    removePayment(contractId, paymentId)
    toast.success(`「${condition}」已删除`)
  }

  /* ================================================================== */

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-700">收款计划</h4>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            allComplete ? 'text-emerald-500 bg-emerald-50 font-medium' : 'text-slate-400 bg-slate-100'
          }`}>
            {allComplete ? '✓ 已收完' : `${completedCount}/${payments.length} 期已完成`}
          </span>
          {canEdit && !adding && (
            <button
              onClick={beginAdd}
              className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 font-medium"
            >
              <Plus size={11} /> 添加
            </button>
          )}
        </div>
      </div>

      {/* Payment list */}
      <div className="space-y-2">
        {payments.map((p, i) => {
          const isEditing = editingId === p.id
          return (
            <div
              key={p.id}
              className={`rounded-lg border transition-colors ${
                p.completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-black/3 bg-white/40'
              }`}
            >
              <div className="flex items-center gap-3 p-2.5">
                {/* Step */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  p.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {p.completed ? <Check size={12} /> : i + 1}
                </div>

                {/* Content — inline edit vs display */}
                {isEditing && canEdit ? (
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      type="text"
                      value={editCondition}
                      onChange={e => setEditCondition(e.target.value)}
                      className="input-glass text-[11px] py-0.5 px-1.5 w-full"
                      placeholder="收款条件"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        className="input-glass text-[11px] py-0.5 px-1.5 w-24"
                        placeholder="金额"
                      />
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="input-glass text-[11px] py-0.5 px-1.5 w-32"
                      />
                      <SaveCancel onSave={() => saveEdit(p.id)} onCancel={() => setEditingId(null)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700">{p.condition}</p>
                    {(p.paymentDate || p.completed) && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <CalendarDays size={10} />
                        {p.paymentDate || '已完成'}
                      </p>
                    )}
                  </div>
                )}

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                    ¥{p.amount.toLocaleString()}
                  </p>
                </div>

                {/* Action buttons */}
                {canEdit && !isEditing && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {p.voucherFile ? (
                      <button
                        onClick={() => setPreviewFile(p.voucherFile || null)}
                        className="p-1 rounded hover:bg-emerald-100 text-emerald-500 interactive"
                        title="查看付款凭证"
                      >
                        <Eye size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={() => openUpload(p.id)}
                        className="p-1 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-500 interactive"
                        title="上传收款凭证"
                      >
                        <Upload size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => beginEdit(p)}
                      className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-500 interactive"
                      title="编辑"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeletePayment(p.id, p.condition)}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-400 interactive"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Inline add form */}
        {adding && canEdit && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-2.5">
            <div className="space-y-2">
              <input
                type="text"
                value={newCondition}
                onChange={e => setNewCondition(e.target.value)}
                className="input-glass text-[11px] py-1 px-2 w-full"
                placeholder="收款条件（如：合同签订后支付首款）"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  className="input-glass text-[11px] py-1 px-2 w-28"
                  placeholder="金额"
                />
                <span className="text-[10px] text-slate-400">
                  剩余未分配：¥{remaining.toLocaleString()}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={handleAddPayment}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-white bg-blue-500 rounded-lg interactive"
                  >
                    <Check size={11} /> 添加
                  </button>
                  <button
                    onClick={() => setAdding(false)}
                    className="px-2.5 py-1 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-lg interactive"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-1.5 mt-3 pt-3 border-t border-black/5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">项目金额</span>
          <span className="text-xs font-mono font-semibold text-slate-800 tabular-nums flex items-center gap-0.5">
            <DollarSign size={11} className="text-slate-400" />¥{projectAmount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">收款计划合计</span>
          <span className={`text-xs font-mono font-semibold tabular-nums ${
            totalAmount === projectAmount ? 'text-emerald-600' : totalAmount > projectAmount ? 'text-red-500' : 'text-amber-600'
          }`}>
            ¥{totalAmount.toLocaleString()}
          </span>
        </div>
        {remaining !== 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">{remaining > 0 ? '剩余未分配' : '超出金额'}</span>
            <span className={`text-[10px] font-mono tabular-nums ${remaining > 0 ? 'text-amber-500' : 'text-red-500'}`}>
              {remaining > 0 ? `¥${remaining.toLocaleString()}` : `-¥${Math.abs(remaining).toLocaleString()}`}
            </span>
          </div>
        )}
      </div>

      {/* ---------- Upload Voucher Modal ---------- */}
      <GlassModal open={uploadingId !== null} onClose={() => setUploadingId(null)} title="上传收款凭证">
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors"
          >
            {voucherFile ? (
              <div className="space-y-2">
                <img src={voucherFile} alt="预览" className="max-h-40 mx-auto rounded-lg object-contain" />
                <p className="text-[10px] text-slate-500">{voucherFileName}</p>
                <p className="text-[10px] text-blue-500">点击更换图片</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload size={24} className="mx-auto text-slate-300" />
                <p className="text-[10px] text-slate-400">点击选择图片</p>
                <p className="text-[9px] text-slate-300">上传后自动标记为已完成</p>
              </div>
            )}
          </button>

          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">收款日期 *</label>
            <input
              type="date"
              value={voucherDate}
              onChange={e => setVoucherDate(e.target.value)}
              className="input-glass w-full text-xs"
            />
          </div>

          <button
            onClick={handleUploadVoucher}
            disabled={!voucherFile}
            className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-500 rounded-lg interactive disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            确认上传
          </button>
        </div>
      </GlassModal>

      {/* ---------- Preview Voucher Modal ---------- */}
      <GlassModal open={previewFile !== null} onClose={() => setPreviewFile(null)} title="收款凭证">
        {previewFile && (
          <div className="space-y-3">
            <img src={previewFile} alt="收款凭证" className="w-full rounded-lg object-contain max-h-[60vh]" />
            <button
              onClick={() => setPreviewFile(null)}
              className="w-full py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg interactive"
            >
              关闭
            </button>
          </div>
        )}
      </GlassModal>
    </div>
  )
}
