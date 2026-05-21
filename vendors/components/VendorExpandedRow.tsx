import { useEffect, useRef } from 'react';
import type { Vendor } from '@/mocks/vendors';

interface Props {
  vendor: Vendor;
  colSpan: number;
}

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

const InfoField = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1.5 text-[10px] font-600 text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
      <i className={`${icon} text-xs`}></i>
      {label}
    </div>
    <div className="text-sm text-gray-800 font-500 leading-snug" style={{ fontWeight: 500 }}>{value}</div>
  </div>
);

export default function VendorExpandedRow({ vendor, colSpan }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.maxHeight = '0px';
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease';
      el.style.maxHeight = '320px';
      el.style.opacity = '1';
    });
  }, []);

  const gradient = getGradient(vendor.name);
  const initials = getInitials(vendor.name);

  const complianceColor =
    vendor.complianceStatus === 'Compliant'
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : vendor.complianceStatus === 'Partial'
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-red-600 bg-red-50 border-red-200';

  return (
    <tr>
      <td colSpan={colSpan} className="px-0 py-0">
        <div ref={ref} style={{ overflow: 'hidden' }}>
          <div className="mx-4 mb-4 rounded-2xl border border-blue-100/80 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(239,246,255,0.85) 100%)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px 0 rgba(40,121,182,0.10)' }}>
            <div className="flex items-start gap-6 p-6">
              {/* Avatar */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-700 shadow-md`} style={{ fontWeight: 700 }}>
                  {initials}
                </div>
                <div className={`text-[10px] font-600 px-2.5 py-0.5 rounded-full border ${complianceColor}`} style={{ fontWeight: 600 }}>
                  {vendor.complianceStatus}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-700 text-gray-900 leading-tight" style={{ fontWeight: 700 }}>{vendor.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 font-500" style={{ fontWeight: 500 }}>{vendor.id}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-xs text-gray-400">{vendor.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-gray-100">
                      <i className="ri-file-text-line text-primary text-sm"></i>
                      <span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>{vendor.totalContracts}</span>
                      <span>Total</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-gray-100">
                      <i className="ri-checkbox-circle-line text-emerald-500 text-sm"></i>
                      <span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>{vendor.activeContracts}</span>
                      <span>Active</span>
                    </div>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                  <InfoField icon="ri-map-pin-line" label="Registered Address" value={vendor.registeredAddress} />
                  <InfoField icon="ri-government-line" label="GST No." value={vendor.gstNo} />
                  <InfoField icon="ri-mail-line" label="Email Address" value={vendor.email} />
                  <InfoField icon="ri-phone-line" label="Office Phone" value={vendor.officePhone} />
                  <InfoField icon="ri-user-line" label="Contact Person" value={vendor.contactName} />
                  <InfoField icon="ri-box-3-line" label="Products / Services" value={vendor.product} />
                  <InfoField icon="ri-calendar-line" label="Registration Date" value={new Date(vendor.registrationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} />
                  <InfoField icon="ri-global-line" label="Country" value={vendor.country} />
                  <InfoField icon="ri-building-line" label="City" value={vendor.city} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
