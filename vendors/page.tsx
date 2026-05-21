import { useState, useMemo } from 'react';
import TopNav from '@/components/feature/TopNav';
import VendorExpandedRow from './components/VendorExpandedRow';
import { vendors } from '@/mocks/vendors';
import type { Vendor } from '@/mocks/vendors';

const ROWS_OPTIONS = [5, 10, 15, 20];

type SortKey = keyof Pick<Vendor, 'name' | 'email' | 'officePhone' | 'contactName' | 'product' | 'gstNo'>;

const columns: { label: string; key: SortKey }[] = [
  { label: 'Vendor Name', key: 'name' },
  { label: 'Email Address', key: 'email' },
  { label: 'Office Phone', key: 'officePhone' },
  { label: 'Contact Name', key: 'contactName' },
  { label: 'Product', key: 'product' },
  { label: 'GST No.', key: 'gstNo' },
];

const gradients = [
  'from-blue-500 to-cyan-400',
  'from-violet-500 to-purple-400',
  'from-emerald-500 to-teal-400',
  'from-orange-500 to-amber-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-blue-400',
  'from-teal-500 to-green-400',
  'from-fuchsia-500 to-violet-400',
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [newVendorOpen, setNewVendorOpen] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vendors
      .filter((v) =>
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.contactName.toLowerCase().includes(q) ||
        v.product.toLowerCase().includes(q) ||
        v.gstNo.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const av = String(a[sortKey]), bv = String(b[sortKey]);
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const startEntry = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endEntry = Math.min(currentPage * rowsPerPage, filtered.length);

  const handleRowClick = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="min-h-screen bg-brand-bg">
      <TopNav />

      <main className="px-6 py-6 space-y-5">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-700 text-gray-900 leading-tight" style={{ fontWeight: 700 }}>Vendor Master</h1>
            <p className="text-sm text-gray-400 mt-0.5">{filtered.length} vendors registered</p>
          </div>
          <button
            onClick={() => setNewVendorOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-600 rounded-xl cursor-pointer whitespace-nowrap transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{ fontWeight: 600, background: 'linear-gradient(135deg, #2879b6 0%, #1e68a0 100%)', boxShadow: '0 4px 14px 0 rgba(40,121,182,0.35)' }}
          >
            <i className="ri-add-line text-base"></i>
            New Vendor
          </button>
        </div>

        {/* Search + Stats Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-80">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search vendors, contacts, products…"
              className="w-full text-sm bg-white border border-brand-border rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            {[
              { label: 'Total', value: vendors.length, color: 'text-primary bg-blue-50' },
              { label: 'Compliant', value: vendors.filter((v) => v.complianceStatus === 'Compliant').length, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Partial', value: vendors.filter((v) => v.complianceStatus === 'Partial').length, color: 'text-amber-600 bg-amber-50' },
              { label: 'Non-Compliant', value: vendors.filter((v) => v.complianceStatus === 'Non-Compliant').length, color: 'text-red-600 bg-red-50' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-brand-border text-xs">
                <span className={`font-700 text-sm ${stat.color.split(' ')[0]}`} style={{ fontWeight: 700 }}>{stat.value}</span>
                <span className="text-gray-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-brand-border overflow-hidden" style={{ boxShadow: '0 2px 20px 0 rgba(40,121,182,0.08)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* Sticky Header */}
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, #f0f6ff 0%, #e8f0fb 100%)' }}>
                  <th className="w-10 px-4 py-3.5"></th>
                  {columns.map(({ label, key }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="text-left text-xs font-600 text-gray-500 px-4 py-3.5 whitespace-nowrap cursor-pointer hover:text-gray-800 select-none transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        <span className="flex flex-col ml-0.5">
                          <i className={`ri-arrow-up-s-fill text-[10px] leading-none ${sortKey === key && sortDir === 'asc' ? 'text-primary' : 'text-gray-300'}`}></i>
                          <i className={`ri-arrow-down-s-fill text-[10px] leading-none ${sortKey === key && sortDir === 'desc' ? 'text-primary' : 'text-gray-300'}`}></i>
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="text-left text-xs font-600 text-gray-500 px-4 py-3.5 whitespace-nowrap" style={{ fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-gray-400 text-sm">
                      <i className="ri-building-line text-3xl block mb-2 text-gray-300"></i>
                      No vendors match your search
                    </td>
                  </tr>
                ) : (
                  paginated.map((vendor, idx) => {
                    const isExpanded = expandedId === vendor.id;
                    const gradient = getGradient(vendor.name);
                    const initials = getInitials(vendor.name);
                    const complianceDot =
                      vendor.complianceStatus === 'Compliant'
                        ? 'bg-emerald-400'
                        : vendor.complianceStatus === 'Partial'
                        ? 'bg-amber-400'
                        : 'bg-red-400';

                    return (
                      <>
                        <tr
                          key={vendor.id}
                          onClick={() => handleRowClick(vendor.id)}
                          className={`cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-0 group ${
                            isExpanded
                              ? 'bg-blue-50/60'
                              : idx % 2 === 0
                              ? 'bg-white hover:bg-blue-50/30'
                              : 'bg-gray-50/40 hover:bg-blue-50/30'
                          }`}
                        >
                          {/* Expand chevron */}
                          <td className="px-4 py-3.5 w-10">
                            <div className="w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-200 group-hover:bg-blue-100">
                              <i className={`ri-arrow-right-s-line text-gray-400 text-base transition-transform duration-200 ${isExpanded ? 'rotate-90 text-primary' : ''}`}></i>
                            </div>
                          </td>

                          {/* Vendor Name */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-700 shrink-0`} style={{ fontWeight: 700 }}>
                                {initials}
                              </div>
                              <div>
                                <div className="font-600 text-primary text-sm whitespace-nowrap hover:underline" style={{ fontWeight: 600 }}>{vendor.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${complianceDot}`}></span>
                                  <span className="text-[10px] text-gray-400">{vendor.id}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                              <i className="ri-mail-line text-gray-300 text-xs"></i>
                              {vendor.email}
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                              <i className="ri-phone-line text-gray-300 text-xs"></i>
                              {vendor.officePhone}
                            </div>
                          </td>

                          {/* Contact Name */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-sm text-gray-700 whitespace-nowrap">
                              <i className="ri-user-line text-gray-300 text-xs"></i>
                              {vendor.contactName}
                            </div>
                          </td>

                          {/* Product */}
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-gray-600 max-w-[200px] truncate">{vendor.product}</div>
                          </td>

                          {/* GST */}
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-500 text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg whitespace-nowrap" style={{ fontWeight: 500 }}>{vendor.gstNo}</span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <i className="ri-edit-line text-sm"></i>
                              </button>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="View Contracts"
                              >
                                <i className="ri-file-list-line text-sm"></i>
                              </button>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line text-sm"></i>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <VendorExpandedRow key={`exp-${vendor.id}`} vendor={vendor} colSpan={8} />
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary cursor-pointer text-gray-700 font-500"
                style={{ fontWeight: 500 }}
              >
                {ROWS_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-gray-400">
                Showing <span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>{startEntry}</span> to <span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>{endEntry}</span> of <span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>{filtered.length}</span> entries
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-primary hover:border hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <i className="ri-arrow-left-s-line text-base"></i>
              </button>

              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-600 transition-all cursor-pointer ${
                      currentPage === p
                        ? 'text-white shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:border hover:border-gray-200'
                    }`}
                    style={currentPage === p ? { fontWeight: 600, background: 'linear-gradient(135deg, #2879b6 0%, #1e68a0 100%)' } : { fontWeight: 600 }}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-primary hover:border hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <i className="ri-arrow-right-s-line text-base"></i>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* New Vendor Modal */}
      {newVendorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" style={{ animation: 'fadeSlideUp 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Add New Vendor</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill in the vendor details below</p>
              </div>
              <button onClick={() => setNewVendorOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Vendor Name', placeholder: 'e.g. TechCorp Solutions Pvt Ltd', icon: 'ri-building-line' },
                { label: 'Email Address', placeholder: 'e.g. contracts@vendor.com', icon: 'ri-mail-line' },
                { label: 'Office Phone', placeholder: 'e.g. +91 22 4567 8901', icon: 'ri-phone-line' },
                { label: 'Contact Name', placeholder: 'e.g. Rajesh Mehta', icon: 'ri-user-line' },
                { label: 'Product / Service', placeholder: 'e.g. Enterprise Software Suite', icon: 'ri-box-3-line' },
                { label: 'GST No.', placeholder: 'e.g. 27AABCT1234A1Z5', icon: 'ri-government-line' },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-xs font-600 text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>{field.label}</label>
                  <div className="relative">
                    <i className={`${field.icon} absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm`}></i>
                    <input
                      placeholder={field.placeholder}
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setNewVendorOpen(false)} className="px-4 py-2 text-sm text-gray-600 font-500 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap" style={{ fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={() => setNewVendorOpen(false)} className="px-5 py-2 text-sm text-white font-600 rounded-xl cursor-pointer whitespace-nowrap transition-all hover:shadow-md" style={{ fontWeight: 600, background: 'linear-gradient(135deg, #2879b6 0%, #1e68a0 100%)' }}>
                Save Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
