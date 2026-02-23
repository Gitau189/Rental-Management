export default function LoadingSpinner({ fullPage = false, size = 'md' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  const spinner = (
    <div className={`animate-spin rounded-full border-2 border-slate-200 border-t-primary-700 ${sizes[size]}`} />
  )
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        {spinner}
      </div>
    )
  }
  return <div className="flex justify-center py-8">{spinner}</div>
}
