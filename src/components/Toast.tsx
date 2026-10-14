import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface Ctx {
  push: (message: string, kind?: ToastKind) => void
}
const ToastCtx = createContext<Ctx | undefined>(undefined)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId++
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 4500)
  }, [])

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[320px] max-w-[90vw]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [enter, setEnter] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setEnter(true))
    return () => cancelAnimationFrame(r)
  }, [])
  const Icon =
    toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertTriangle : Info
  const tone =
    toast.kind === 'success'
      ? 'border-cyber-success/40 text-cyber-success'
      : toast.kind === 'error'
      ? 'border-cyber-danger/50 text-cyber-danger'
      : 'border-cyber-cyan/40 text-cyber-cyan'
  return (
    <div
      className={`glass-strong rounded-lg px-4 py-3 flex gap-3 items-start border ${tone}
        transition-all duration-300 ${enter ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="text-sm text-slate-100 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export function useToast(): Ctx {
  const c = useContext(ToastCtx)
  if (!c) throw new Error('useToast must be used inside ToastProvider')
  return c
}
