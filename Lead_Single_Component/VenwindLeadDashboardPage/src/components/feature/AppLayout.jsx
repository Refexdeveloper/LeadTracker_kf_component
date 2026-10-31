/** Optional shell for feature pages (sidebar chrome). Venwind dashboard uses useLayout=false by default. */
export default function AppLayout({ children }) {
  return <div className="min-h-screen w-full">{children}</div>
}
