/** Local theme gallery — no SSO, stub APIs, every page in one sidebar. */
export function isP2pGallery() {
  return String(import.meta.env.VITE_P2P_GALLERY || '') === 'true'
}

export const GALLERY_TOKEN = 'p2p-gallery-demo-token'

export function galleryStubResponse(path: string): Record<string, unknown> {
  const p = String(path || '')
  if (p.includes('/api/auth/me') || p.includes('/api/auth/login') || p.includes('/api/auth/refexone')) {
    return { token: GALLERY_TOKEN, user: null }
  }
  if (p.includes('/stats') || p.includes('/dashboard')) {
    return {
      data: {
        totals: {},
        kpis: {},
        recentActivity: [],
        purchaseOrders: [],
        pendingApprovals: [],
      },
    }
  }
  return {
    data: [],
    items: [],
    Count: 0,
    count: 0,
    total: 0,
    page: 1,
    pageSize: 20,
    meta: { total: 0, page: 1, pageSize: 20 },
    message: 'Gallery stub',
  }
}
