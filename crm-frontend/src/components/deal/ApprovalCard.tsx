import { useState, useRef, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Check, X, Upload, FileText, Clock, Download, Maximize2, Minimize2 } from 'lucide-react'
import GlassCard from '@/components/glass/GlassCard'
import { useContracts } from '@/hooks/useContracts'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import type { Contract } from '@/types'

function dataUrlToBlobUrl(dataUrl: string): string {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
  const binary = atob(parts[1])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

interface Props {
  contract: Contract
}

export default function ApprovalCard({ contract }: Props) {
  const { uploadContractFile, submitForApproval } = useContracts()
  const { user } = useAuth()
  const { addNotification } = useNotifications()

  const [fileData, setFileData] = useState<string | null>(contract.contractFile || null)
  const [fileName, setFileName] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync from contract.contractFile when it changes externally (e.g. after rejection clears it)
  useEffect(() => {
    if (contract.contractFile && !fileData) {
      setFileData(contract.contractFile)
      setFileName('已上传合同文件')
    }
    if (!contract.contractFile) {
      setFileData(null)
      setFileName('')
    }
  }, [contract.contractFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = reader.result as string
      setFileData(data)
      setFileName(file.name)
      uploadContractFile(contract.id, data)
      toast.success('销售合同已上传')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitApproval = () => {
    if (!fileData) {
      toast.error('请先上传销售合同文件')
      return
    }
    submitForApproval(contract.id)
    addNotification({
      type: 'contract_submitted',
      fromUserId: user?.id || '',
      fromUserName: user?.name || '',
      toUserId: 'super_admin',
      customerId: contract.customerId,
      customerName: `合同审批：${contract.projectName}（${contract.customerName}）`,
      contractId: contract.id,
    })
    toast.success('审批申请已提交，请等待超级管理员审批')
  }

  const isApproved = contract.approved
  const isCancelled = contract.cancelled
  const isSubmitted = contract.submitted
  const isPending = !isApproved && !isCancelled

  const getStepStyle = (step: number) => {
    if (isCancelled && step >= 2) return 'bg-red-400 text-white'
    if (isApproved) return 'bg-emerald-500 text-white'
    if (step === 1 && isPending && !fileData) return 'bg-blue-500 text-white'
    if (step === 2 && isPending && fileData && !isSubmitted) return 'bg-blue-500 text-white'
    if (step === 3 && isPending && isSubmitted) return 'bg-amber-500 text-white'
    if (step === 4 && isApproved) return 'bg-emerald-500 text-white'
    return 'bg-slate-200 text-slate-400'
  }

  const isImageFile = (name: string, data: string) =>
    data.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)

  const isPdfFile = (name: string, data: string) =>
    data.startsWith('data:application/pdf') || /\.pdf$/i.test(name)

  // Convert PDF data URL to blob URL for reliable large-file rendering
  const pdfBlobUrl = useMemo(() => {
    if (!fileData || !isPdfFile(fileName, fileData)) return null
    try { return dataUrlToBlobUrl(fileData) } catch { return null }
  }, [fileData, fileName])

  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl) }
  }, [pdfBlobUrl])

  // --- Preview content shared between modal and fullscreen ---
  const renderPreviewContent = () => {
    if (!fileData) return null
    return (
      <div className="space-y-3">
        {isImageFile(fileName, fileData) ? (
          <img src={fileData} alt="合同预览" className="w-full rounded-lg object-contain max-h-[65vh]" />
        ) : isPdfFile(fileName, fileData) ? (
          <embed src={pdfBlobUrl || fileData} type="application/pdf" className="w-full h-[65vh] rounded-lg border border-slate-200" />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileText size={48} className="mb-3" />
            <p className="text-sm font-medium text-slate-600">{fileName || '合同文件'}</p>
            <p className="text-[10px] mt-1">此文件类型暂不支持在线预览</p>
            <a
              href={fileData}
              download={fileName || 'contract-file'}
              className="mt-3 px-4 py-2 text-xs font-medium text-blue-500 bg-blue-50 rounded-lg interactive inline-flex items-center gap-1.5"
            >
              <Download size={12} /> 下载文件
            </a>
          </div>
        )}
      </div>
    )
  }

  const renderPreviewActions = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="nav-icon"
        title={isFullscreen ? '退出全屏' : '全屏'}
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      <button
        onClick={() => { setPreviewOpen(false); setIsFullscreen(false) }}
        className="nav-icon"
        title="关闭"
      >
        <X size={14} />
      </button>
    </div>
  )

  return (
    <>
      <GlassCard>
        <h3 className="text-xs font-semibold text-slate-700 mb-3">合同审批</h3>

        {/* Process Nodes */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { step: 1, label: '上传合同' },
            { step: 2, label: '提交审批' },
            { step: 3, label: '审核' },
            { step: 4, label: '生效' },
          ].map((node, i) => (
            <div key={node.step} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${getStepStyle(node.step)}`}>
                {isCancelled && node.step >= 2 ? <X size={10} /> :
                 isApproved && node.step <= 4 ? <Check size={10} /> :
                 isPending && isSubmitted && node.step === 3 ? <Clock size={10} /> :
                 node.step}
              </div>
              <span className="text-[10px] text-slate-500">{node.label}</span>
              {i < 3 && <div className="w-3 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Status Banner */}
        <div className={`p-3 rounded-lg border mb-3 ${
          isCancelled ? 'border-red-200 bg-red-50/50' :
          isApproved ? 'border-emerald-200 bg-emerald-50/50' :
          isSubmitted ? 'border-amber-200 bg-amber-50/50' :
          fileData ? 'border-blue-200 bg-blue-50/50' :
          'border-slate-200 bg-slate-50/50'
        }`}>
          <p className={`text-xs font-semibold flex items-center gap-1.5 ${
            isCancelled ? 'text-red-600' : isApproved ? 'text-emerald-600' :
            isSubmitted ? 'text-amber-600' : fileData ? 'text-blue-600' : 'text-slate-500'
          }`}>
            {isCancelled ? <X size={14} /> : isApproved ? <Check size={14} /> :
             isSubmitted ? <Clock size={14} /> : fileData ? <FileText size={14} /> : <Upload size={14} />}
            {isCancelled ? '已取消' : isApproved ? '已审批通过' :
             isSubmitted ? '等待审批' : fileData ? '请提交审批' : '请上传合同文件'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {isCancelled ? '此合同已被取消' :
             isApproved ? '超级管理员已审批通过，合同已生效' :
             isSubmitted ? '合同已提交，等待超级管理员审批' :
             fileData ? '文件已上传，请点击"提交审批"' :
             '请上传销售合同后提交审批'}
          </p>
        </div>

        {/* Upload Contract File */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {fileData ? (
          <div className="space-y-2 mb-2">
            <div className="flex items-center justify-between p-2.5 bg-white/60 rounded-lg border border-black/5">
              <button
                onClick={() => { setPreviewOpen(true); setIsFullscreen(false) }}
                className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-blue-500 transition-colors"
              >
                <FileText size={14} className="text-blue-500 shrink-0" />
                <span className="text-xs text-slate-700 truncate">{fileName || '已上传合同文件'}</span>
              </button>
              {isPending && !isSubmitted && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="nav-icon shrink-0 ml-1"
                  title="重新上传"
                >
                  <Upload size={12} />
                </button>
              )}
            </div>
          </div>
        ) : (
          isPending && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-slate-200 bg-white/40 text-xs text-slate-500 hover:border-blue-300 transition-colors mb-2"
            >
              <Upload size={14} /> 上传销售合同（支持 PDF / 图片）
            </button>
          )
        )}

        {/* Submit for Approval */}
        {fileData && !isSubmitted && !isCancelled && !isApproved && (
          <button
            onClick={handleSubmitApproval}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-medium text-white bg-blue-500 rounded-lg interactive"
          >
            <FileText size={12} /> 提交审批
          </button>
        )}
      </GlassCard>

      {/* Preview: Modal or Fullscreen */}
      {previewOpen && !isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false) }}
        >
          <div className="glass-modal p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">{fileName || '合同预览'}</h3>
              {renderPreviewActions()}
            </div>
            {fileData && renderPreviewContent()}
            <button
              onClick={() => setPreviewOpen(false)}
              className="w-full py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg interactive mt-3"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {previewOpen && isFullscreen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
            <h3 className="text-sm font-semibold text-slate-800">{fileName || '合同预览'}</h3>
            {renderPreviewActions()}
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {fileData && isImageFile(fileName, fileData) ? (
              <img src={fileData} alt="合同预览" className="max-w-full max-h-full rounded-lg object-contain" />
            ) : fileData && isPdfFile(fileName, fileData) ? (
              <embed src={pdfBlobUrl || fileData} type="application/pdf" className="w-full h-full rounded-lg border border-slate-200" />
            ) : fileData ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileText size={48} className="mb-3" />
                <p className="text-sm font-medium text-slate-600">{fileName || '合同文件'}</p>
                <p className="text-[10px] mt-1">此文件类型暂不支持在线预览</p>
                <a
                  href={fileData}
                  download={fileName || 'contract-file'}
                  className="mt-3 px-4 py-2 text-xs font-medium text-blue-500 bg-blue-50 rounded-lg interactive inline-flex items-center gap-1.5"
                >
                  <Download size={12} /> 下载文件
                </a>
              </div>
            ) : null}
          </div>
          <div className="px-4 py-3 border-t border-slate-200 shrink-0 flex justify-center">
            <button
              onClick={() => { setPreviewOpen(false); setIsFullscreen(false) }}
              className="px-6 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg interactive"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  )
}
