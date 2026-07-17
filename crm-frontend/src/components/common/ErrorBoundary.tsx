import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)' }}>
          <div className="glass-card p-8 max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">页面发生异常</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <p className="text-[10px] text-slate-400 mb-6">
              请尝试刷新页面，如问题持续请联系管理员
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-500 rounded-lg interactive"
            >
              <RefreshCw size={12} /> 重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
