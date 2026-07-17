import { useState, useRef, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Upload, Download, Trash2, FileText, X, Maximize2, Minimize2 } from 'lucide-react'
import GlassCard from '@/components/glass/GlassCard'
import { useContracts } from '@/hooks/useContracts'
import { ARCHIVED_FILE_CATEGORY_LABELS, type ArchivedFileCategory } from '@/types'

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
  contractId: string
}

const categories: { key: ArchivedFileCategory; label: string; accept: string }[] = [
  { key: 'contract', label: ARCHIVED_FILE_CATEGORY_LABELS.contract, accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png' },
  { key: 'invoice', label: ARCHIVED_FILE_CATEGORY_LABELS.invoice, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'project_doc', label: ARCHIVED_FILE_CATEGORY_LABELS.project_doc, accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip' },
]

function isImageFile(name: string, data: string) {
  return data.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)
}

function isPdfFile(name: string, data: string) {
  return data.startsWith('data:application/pdf') || /\.pdf$/i.test(name)
}

function isPreviewable(name: string, data: string) {
  return isImageFile(name, data) || isPdfFile(name, data)
}

export default function ProjectFileArchive({ contractId }: Props) {
  const { contracts, addArchivedFile, removeArchivedFile } = useContracts()
  const contract = contracts.find(c => c.id === contractId)
  const archivedFiles = contract?.archivedFiles ?? []

  const [previewFile, setPreviewFile] = useState<{ name: string; data: string } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [uploadingCategory, setUploadingCategory] = useState<ArchivedFileCategory | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const category = uploadingCategory
    setUploadingCategory(null)
    const file = e.target.files?.[0]
    if (!file || !category) return
    const reader = new FileReader()
    reader.onload = () => {
      addArchivedFile(contractId, {
        name: file.name,
        category,
        data: reader.result as string,
      })
      toast.success(`${file.name} 已上传至${ARCHIVED_FILE_CATEGORY_LABELS[category]}`)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const triggerUpload = (category: ArchivedFileCategory) => {
    setUploadingCategory(category)
    setTimeout(() => fileInputRef.current?.click(), 0)
  }

  const handleDownload = (name: string, data: string) => {
    const link = document.createElement('a')
    link.href = data
    link.download = name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openPreview = (file: { name: string; data: string }) => {
    setPreviewFile(file)
    setIsFullscreen(false)
  }

  const closePreview = () => {
    setPreviewFile(null)
    setIsFullscreen(false)
  }

  // Convert PDF data URL to blob URL for reliable large-file rendering
  const pdfBlobUrl = useMemo(() => {
    if (!previewFile || !isPdfFile(previewFile.name, previewFile.data)) return null
    try { return dataUrlToBlobUrl(previewFile.data) } catch { return null }
  }, [previewFile])

  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl) }
  }, [pdfBlobUrl])

  const renderPreviewActions = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="nav-icon"
        title={isFullscreen ? '退出全屏' : '全屏'}
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      <button onClick={closePreview} className="nav-icon" title="关闭">
        <X size={14} />
      </button>
    </div>
  )

  const renderPreviewContent = () => {
    if (!previewFile) return null
    return isImageFile(previewFile.name, previewFile.data) ? (
      <img src={previewFile.data} alt={previewFile.name} className="w-full rounded-lg object-contain max-h-[65vh]" />
    ) : isPdfFile(previewFile.name, previewFile.data) ? (
      <embed src={pdfBlobUrl || previewFile.data} type="application/pdf" className="w-full h-[65vh] rounded-lg border border-slate-200" />
    ) : (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <FileText size={48} className="mb-3" />
        <p className="text-sm text-slate-600 font-medium">{previewFile.name}</p>
        <p className="text-[10px] mt-1">此文件类型暂不支持预览</p>
        <button
          onClick={() => handleDownload(previewFile.name, previewFile.data)}
          className="mt-3 px-4 py-2 text-xs font-medium text-blue-500 bg-blue-50 rounded-lg interactive"
        >
          下载文件
        </button>
      </div>
    )
  }

  return (
    <>
      <GlassCard>
        <h3 className="text-xs font-semibold text-slate-700 mb-3">项目文件归档</h3>

        <input
          ref={fileInputRef}
          type="file"
          accept={uploadingCategory ? categories.find(c => c.key === uploadingCategory)?.accept || '*' : '*'}
          onChange={handleFileSelect}
          className="hidden"
        />

        {categories.map(cat => {
          const categoryFiles = archivedFiles.filter(f => f.category === cat.key)
          return (
            <div key={cat.key} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-600">{cat.label}</span>
                <button
                  onClick={() => triggerUpload(cat.key)}
                  className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 font-medium"
                >
                  <Upload size={10} /> 上传
                </button>
              </div>

              {categoryFiles.length === 0 ? (
                <p className="text-[10px] text-slate-400 py-1.5">暂无文件</p>
              ) : (
                <div className="space-y-1">
                  {categoryFiles.map(file => (
                    <div key={file.id} className="flex items-center gap-2 p-1.5 rounded-md bg-white/50 border border-black/3">
                      <FileText size={12} className="text-slate-400 shrink-0" />
                      <button
                        onClick={() => {
                          if (isPreviewable(file.name, file.data)) {
                            openPreview(file)
                          } else {
                            handleDownload(file.name, file.data)
                          }
                        }}
                        className="flex-1 text-left text-[11px] text-slate-700 truncate hover:text-blue-500 transition-colors"
                        title={isPreviewable(file.name, file.data) ? '点击预览' : '点击下载'}
                      >
                        {file.name}
                      </button>
                      <button
                        onClick={() => handleDownload(file.name, file.data)}
                        className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                        title="下载"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        onClick={() => {
                          removeArchivedFile(contractId, file.id)
                          toast.success(`${file.name} 已删除`)
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </GlassCard>

      {/* Preview: Modal */}
      {previewFile && !isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closePreview() }}
        >
          <div className="glass-modal p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">{previewFile.name || '文件预览'}</h3>
              {renderPreviewActions()}
            </div>
            {renderPreviewContent()}
            <button
              onClick={closePreview}
              className="w-full py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg interactive mt-3"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Preview: Fullscreen */}
      {previewFile && isFullscreen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
            <h3 className="text-sm font-semibold text-slate-800">{previewFile.name || '文件预览'}</h3>
            {renderPreviewActions()}
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {isImageFile(previewFile.name, previewFile.data) ? (
              <img src={previewFile.data} alt={previewFile.name} className="max-w-full max-h-full rounded-lg object-contain" />
            ) : isPdfFile(previewFile.name, previewFile.data) ? (
              <embed src={pdfBlobUrl || previewFile.data} type="application/pdf" className="w-full h-full rounded-lg border border-slate-200" />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileText size={48} className="mb-3" />
                <p className="text-sm text-slate-600 font-medium">{previewFile.name}</p>
                <p className="text-[10px] mt-1">此文件类型暂不支持预览</p>
                <button
                  onClick={() => handleDownload(previewFile.name, previewFile.data)}
                  className="mt-3 px-4 py-2 text-xs font-medium text-blue-500 bg-blue-50 rounded-lg interactive"
                >
                  下载文件
                </button>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-200 shrink-0 flex justify-center">
            <button
              onClick={closePreview}
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
