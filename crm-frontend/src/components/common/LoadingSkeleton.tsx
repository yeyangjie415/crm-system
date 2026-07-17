export default function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-4">
          <div className="h-3 bg-slate-200 rounded w-1/3 mb-3" />
          <div className="h-2 bg-slate-100 rounded w-full mb-2" />
          <div className="h-2 bg-slate-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}
