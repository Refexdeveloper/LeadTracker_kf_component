import { useState, useMemo, useEffect } from 'react';
// import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/feature/DashboardLayout';

const PROCESS_ID = 'Purchase_Requisition_A00';

const parseNum = (val) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val);
  const num = parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
  return isNaN(num) ? 0 : num;
};

const mapApiToPrDetails = (raw) => {
  if (!raw) return null;
  const items = raw['Table::Item_Details'] ?? raw['Table::Item_Details_1'] ?? raw.Line_Items ?? [];
  const itemsArr = Array.isArray(items) ? items : [];
  const lineItems = itemsArr.map((li, idx) => ({
    id: li._id ?? li.Row_ID ?? `item-${idx}`,
    description: li.Item_Name ?? li.Description ?? li.description ?? '',
    category: li.Category ?? li.category ?? '',
    quantity: parseNum(li.Qty ?? li.Quantity ?? 1) || 1,
    unitPrice: parseNum(li.Unit_Price ?? li.Price ?? 0),
    total: parseNum(li.Item_Amount ?? li.Total ?? li.Amount ?? 0),
  }));
  const totalAmount = lineItems.reduce((sum, li) => sum + li.total, 0) || parseNum(raw.PR_Total_Amount ?? raw.Total_Amount ?? raw.Amount);
  const requester = raw._created_by?.Name ?? raw._created_by?.name ?? raw.Requester ?? '—';
  const requiredDate = raw.Required_By_Date_1 ?? raw.Required_Date ?? raw.required_date ?? '';
  return {
    id: raw.PR_Number ?? raw.pr_number ?? raw._id ?? '—',
    title: (raw.Name ?? raw.Title ?? raw.PR_Title ?? '').trim() || '—',
    department: raw.Department ?? raw.department ?? raw.Cost_Center ?? '—',
    requester,
    requestType: (raw.Purchase_Type ?? raw.Procurement_Type ?? raw.requestType ?? '').replace(/\n/g, ' ').trim() || '—',
    priority: (raw.Priority ?? raw.priority ?? 'Medium').toString(),
    requiredDate: requiredDate ? (() => {
      const d = new Date(requiredDate);
      return isNaN(d.getTime()) ? String(requiredDate) : d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
    })() : '—',
    amount: totalAmount,
    justification: raw.Business_Justification ?? raw.business_justification ?? '—',
    status: raw._status ?? raw.Status ?? 'InProgress',
    lineItems,
  };
};

// Generate Kissflow-style row id for Table::Vendor_Details
const generateVendorRowId = () =>
  'Vendor_Details_' + Math.random().toString(36).slice(2, 12);

const VENDOR_DROPDOWN_FALLBACK = [
  'Acme Corp', 'Global Supplies Ltd', 'Tech Solutions Inc', 'Prime Vendors', 'Elite Services',
  'Metro Traders', 'Apex Industries', 'Summit Enterprises', 'Tech Solutions Pvt Ltd', 'Digital Systems Inc',
];

const parseVendorDropdownResponse = (resp) => {
  const data = resp?.data ?? resp?.Data ?? resp;
  let arr = [];
  if (Array.isArray(data)) {
    arr = data;
  } else {
    const items = data?.Item ?? data?.Items ?? data?.items ?? data?.Data ?? (Array.isArray(data) ? data : []);
    arr = Array.isArray(items) ? items : [];
  }
  return arr.map((it) => {
    if (typeof it === 'string') return { value: it, label: it };
    const val = it?.value ?? it?.Value ?? it?.name ?? it?.Name ?? it?.text ?? it?.Text ?? it?.id ?? it?._id ?? it?.Legal_Vendor_Name ?? '';
    const label = it?.label ?? it?.Label ?? it?.name ?? it?.Name ?? it?.text ?? it?.Text ?? it?.Legal_Vendor_Name ?? String(val ?? '');
    return { value: String(val ?? ''), label: String(label ?? '') };
  }).filter((o) => o.value || o.label);
};

export default function RFQEntryPage() {
//   const [searchParams] = useSearchParams();
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';

  const [instanceId, setInstanceId] = useState(null);
  const [activityInstanceId, setActivityInstanceId] = useState(null);
  const [prNumber, setPrNumber] = useState('PR-2024-001');
  const [instanceData, setInstanceData] = useState(null);
  const [vendorDetailsFromApi, setVendorDetailsFromApi] = useState([]);
  const [addVendorLoading, setAddVendorLoading] = useState(false);
  const [addVendorError, setAddVendorError] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [vendorDropdownOptions, setVendorDropdownOptions] = useState([]);

  useEffect(() => {
    if (!kf?.context?.watchParams) return;
    kf.context.watchParams((data) => {
      const inst = data?.instance_id ?? data?.instanceId;
      const act = data?.activity_instance_id ?? data?.activityInstanceId;
      if (inst) setInstanceId(inst);
      if (act) setActivityInstanceId(act);
      if (data?.pr_number) setPrNumber(data.pr_number);
      if (data?.PR_Number) setPrNumber(data.PR_Number);
    });
  }, []);

  useEffect(() => {
    if (!kf?.api || !account_id || !application_id) {
      setFetchLoading(false);
      return;
    }
    const doFetch = async () => {
      let inst = instanceId;
      let act = activityInstanceId;
      if ((!inst || !act) && kf?.app?.page?.getAllParameters) {
        const params = await kf.app.page.getAllParameters();
        inst = inst ?? params?.instance_id ?? params?.instanceId;
        act = act ?? params?.activity_instance_id ?? params?.activityInstanceId;
        if (inst) setInstanceId(inst);
        if (act) setActivityInstanceId(act);
      }
      if (!inst || !act) {
        setFetchLoading(false);
        return;
      }
      setFetchLoading(true);
      try {
        const url = `/process/2/${account_id}/${PROCESS_ID}/${inst}/${act}?_application_id=${application_id}`;
        const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
        let raw = resp?.data ?? resp?.Data ?? resp;
        if (raw && typeof raw === 'object' && !(raw.PR_Number ?? raw._id ?? raw.pr_number)) {
          if (Array.isArray(raw.Data) && raw.Data[0]) raw = raw.Data[0];
          else if (raw.Data && typeof raw.Data === 'object') raw = raw.Data;
        }
        setInstanceData(raw);
        const vendorRows = raw?.['Table::Vendor_Details'] ?? raw?.vendorDetails ?? [];
        const arr = Array.isArray(vendorRows) ? vendorRows : [];
        setVendorDetailsFromApi(arr);
        if (raw?.PR_Number ?? raw?.pr_number) setPrNumber(raw.PR_Number ?? raw.pr_number ?? prNumber);
        if (arr.length > 0) {
          const mapped = arr.map((vd, i) => mapVendorDetailToQuotation(vd, `vd-${vd._id ?? i}`)).filter(Boolean);
          setQuotations((prev) => (mapped.length > 0 ? mapped : prev));
        } else {
          setQuotations([{
            id: '1',
            vendorName: '',
            quotedPrice: 0,
            leadTime: 0,
            paymentTerms: 'Standard',
            compliance: true,
            technicalScore: 0,
            commercialScore: 0,
            overallScore: 0,
            quotationFile: null,
            quotationFileName: '',
          }]);
        }
      } catch (err) {
        console.error('Failed to fetch RFQ instance:', err);
      } finally {
        setFetchLoading(false);
      }
    };
    doFetch();
  }, [instanceId, activityInstanceId, account_id, application_id]);

  useEffect(() => {
    if (!kf?.api || !account_id || !application_id || !instanceId || !activityInstanceId) return;
    const rowId = vendorDetailsFromApi.find((v) => v._id)?._id ?? vendorDetailsFromApi[0]?._id ?? vendorDetailsFromApi[0]?.id;
    if (!rowId) return;
    const url = `/process/2/${account_id}/${PROCESS_ID}/${instanceId}/${activityInstanceId}/Vendor_Details/${rowId}/vendor/dropdown?q=&page_number=1&page_size=250&_application_id=${application_id}`;
    kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } })
      .then((resp) => {
        const opts = parseVendorDropdownResponse(resp);
        if (opts.length > 0) setVendorDropdownOptions(opts);
      })
      .catch((err) => console.error('Fetch vendor dropdown:', err));
  }, [instanceId, activityInstanceId, account_id, application_id, vendorDetailsFromApi]);

  const prId = prNumber;
  const pr = useMemo(() => mapApiToPrDetails(instanceData), [instanceData]);

  const [quotations, setQuotations] = useState([
    {
      id: '1',
      vendorName: '',
      quotedPrice: 0,
      leadTime: 0,
      paymentTerms: 'Standard',
      compliance: true,
      technicalScore: 0,
      commercialScore: 0,
      overallScore: 0,
      quotationFile: null,
      quotationFileName: '',
    },
  ]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState([]);

  const addVendorRow = async () => {
    const newLocalRow = {
      id: Date.now().toString(),
      vendorName: '',
      quotedPrice: 0,
      leadTime: 0,
      paymentTerms: 'Standard',
      compliance: true,
      technicalScore: 0,
      commercialScore: 0,
      overallScore: 0,
      quotationFile: null,
      quotationFileName: '',
    };

    if (kf?.api && instanceId && activityInstanceId) {
      setAddVendorError(null);
      setAddVendorLoading(true);
      try {
        const lastVendor = vendorDetailsFromApi[vendorDetailsFromApi.length - 1];
        const newIndex = vendorDetailsFromApi.length + 1;
        const newRowId = generateVendorRowId();
        const payload = {
          _id: instanceId,
          'Table::Item_Details': [],
          'Table::Vendor_Details': [
            {
              _id: newRowId,
              _index: newIndex,
              _is_created: true,
              _previous_id: lastVendor?._id ?? '',
            },
          ],
        };

        const url = `/process/2/${account_id}/${PROCESS_ID}/${instanceId}/${activityInstanceId}?_application_id=${application_id}`;
        const resp = await kf.api(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const raw = resp?.data ?? resp ?? resp?.Data ?? resp;
        const vendorRows = raw?.['Table::Vendor_Details'] ?? raw?.vendorDetails ?? [];
        setVendorDetailsFromApi(Array.isArray(vendorRows) ? vendorRows : []);

        const newVendors = Array.isArray(vendorRows) ? vendorRows : [];
        const added = newVendors.find((v) => v._id === newRowId) ?? newVendors[newVendors.length - 1];
        const mapped = mapVendorDetailToQuotation(added, newLocalRow.id) ?? newLocalRow;
        setQuotations((prev) => [...prev, mapped]);
      } catch (err) {
        console.error('Add vendor API error:', err);
        setAddVendorError(err?.message ?? 'Failed to add vendor');
        setQuotations((prev) => [...prev, newLocalRow]);
      } finally {
        setAddVendorLoading(false);
      }
    } else {
      setQuotations((prev) => [...prev, newLocalRow]);
    }
  };
  

  const mapVendorDetailToQuotation = (vd, fallbackId) => {
    if (!vd) return null;
    return {
      id: vd._id ?? fallbackId ?? Date.now().toString(),
      _id: vd._id,
      vendorName: vd.Vendor_Name ?? vd.vendorName ?? vd.Vendor ?? '',
      quotedPrice: parseNum(vd.Quoted_Price ?? vd.quotedPrice ?? vd.Price ?? 0),
      leadTime: parseNum(vd.Lead_Time ?? vd.leadTime ?? 0),
      paymentTerms: vd.Payment_Terms ?? vd.paymentTerms ?? 'Standard',
      compliance: vd.Compliance ?? vd.compliance ?? true,
      technicalScore: parseNum(vd.Technical_Score ?? vd.technicalScore ?? 0),
      commercialScore: parseNum(vd.Commercial_Score ?? vd.commercialScore ?? 0),
      overallScore: parseNum(vd.Overall_Score ?? vd.overallScore ?? 0),
      quotationFile: null,
      quotationFileName: vd.quotationFileName ?? vd.Quotation_File_Name ?? '',
    };
  };

  const removeVendorRow = (id) => {
    if (quotations.length > 1) {
      setQuotations(prev => prev.filter(q => q.id !== id));
    }
  };

  const updateQuotation = (id, field, value) => {
    setQuotations(prev =>
      prev.map(q => (q.id !== id ? q : { ...q, [field]: value }))
    );
  };

  const handleFileChange = (id, file) => {
    setQuotations(prev =>
      prev.map(q =>
        q.id === id
          ? { ...q, quotationFile: file, quotationFileName: file ? file.name : '' }
          : q
      )
    );
  };

  const handleSubmit = async () => {
    const errs = [];
    if (quotations.some(q => !q.vendorName))
      errs.push('Please select a vendor name for all rows.');

    if (errs.length) {
      setErrors(errs);
      return;
    }

    setErrors([]);

    let inst = instanceId;
    let act = activityInstanceId;
    if ((!inst || !act) && kf?.app?.page?.getAllParameters) {
      const params = await kf.app.page.getAllParameters();
      inst = inst ?? params?.instance_id ?? params?.instanceId;
      act = act ?? params?.activity_instance_id ?? params?.activityInstanceId;
    }
    if (!kf?.api || !inst || !act || !account_id || !application_id) {
      setErrors(['Missing instance or activity. Please open this page from Vendor RFQ.']);
      return;
    }

    setSubmitLoading(true);
    try {
      const vendorDetails = quotations.map((q, idx) => {
        const base = vendorDetailsFromApi[idx] ?? {};
        const prevQuotation = quotations[idx - 1];
        return {
          _id: q._id ?? base._id ?? generateVendorRowId(),
          _previous_id: prevQuotation?._id ?? vendorDetailsFromApi[idx - 1]?._id ?? '',
          Vendor_Name: q.vendorName,
          Quoted_Price: q.quotedPrice,
          Lead_Time: q.leadTime,
          Payment_Terms: q.paymentTerms,
        };
      });

      const payload = {
        _id: inst,
        'Table::Vendor_Details': vendorDetails,
      };

      const url = `/process/2/${account_id}/${PROCESS_ID}/${inst}/${act}/submit?_application_id=${application_id}`;
      await kf.api(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setShowSuccess(true);
    } catch (err) {
      console.error('Submit RFQ error:', err);
      setErrors([err?.message ?? 'Failed to submit RFQ. Please try again.']);
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading RFQ details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

    {/* ── Sticky Header ── */}
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line text-lg text-gray-600"></i>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">RFQ / Quotation Entry</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              PR Reference:{' '}
              <span className="font-semibold text-teal-600">{instanceData?.PR_Number ?? pr?.id ?? (prId || '—')}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium whitespace-nowrap cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitLoading}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium whitespace-nowrap cursor-pointer text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Submitting…
              </>
            ) : (
              <>
                <i className="ri-send-plane-line"></i>
                Submit RFQ
              </>
            )}
          </button>
        </div>
      </div>
    </div>

    <div className="px-8 py-6 space-y-6">

      {/* ── PR Details Card ── */}
      {instanceData ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-file-list-3-line text-teal-600 text-lg"></i>
              <h2 className="text-base font-bold text-gray-900">Purchase Request Details</h2>
            </div>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold">
              {pr.status}
            </span>
          </div>

          <div className="p-6">
            {/* Top row */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">PR Number</p>
                <p className="text-sm font-bold text-teal-600">{pr.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Title</p>
                <p className="text-sm font-semibold text-gray-900">{pr.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Department</p>
                <p className="text-sm font-semibold text-gray-900">{pr.department}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Requester</p>
                <p className="text-sm font-semibold text-gray-900">{pr.requester}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Request Type</p>
                <p className="text-sm font-semibold text-gray-900">{pr.requestType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Priority</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                  pr.priority === 'High' ? 'bg-red-100 text-red-700' :
                  pr.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {pr.priority}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Required Date</p>
                <p className="text-sm font-semibold text-gray-900">{pr.requiredDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Estimated Budget</p>
                <p className="text-sm font-bold text-teal-600">{formatCurrency(pr.amount)}</p>
              </div>
            </div>

            {/* Justification */}
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs font-semibold text-amber-700 mb-1">Justification</p>
              <p className="text-sm text-gray-700">{pr.justification}</p>
            </div>

            {/* Line Items */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Line Items</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Unit Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(pr.lineItems ?? []).map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900">{item.description}</td>
                        <td className="px-4 py-2.5 text-gray-500">{item.category}</td>
                        <td className="px-4 py-2.5 text-right text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-gray-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-right text-sm font-bold text-gray-900">Grand Total</td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold text-teal-600">{formatCurrency(pr.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center gap-3">
          <i className="ri-error-warning-line text-2xl text-amber-500"></i>
          <p className="text-sm text-amber-800 font-medium">
            No PR linked. You can still enter vendor quotations below.
          </p>
        </div>
      )}

      {/* ── Validation Errors ── */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-700 flex items-center gap-2">
              <i className="ri-error-warning-line"></i> {e}
            </p>
          ))}
        </div>
      )}

      {/* ── Vendor Quotations Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="ri-group-line text-teal-600 text-lg"></i>
            <h2 className="text-base font-bold text-gray-900">Vendor Quotations</h2>
            <span className="ml-2 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold">
              {quotations.length} vendor{quotations.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={addVendorRow}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line"></i>
            Add Vendor
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Vendor Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Quoted Price (₹)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Lead Time (Days)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Payment Terms</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Quotation File</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotations.map(q => (
                <tr key={q.id} className="bg-white hover:bg-gray-50 transition-colors">
                  {/* Vendor Name */}
                  <td className="px-4 py-3">
                    <select
                      value={q.vendorName}
                      onChange={e => updateQuotation(q.id, 'vendorName', e.target.value)}
                      className="w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer"
                    >
                      <option value="">Select Vendor</option>
                      {(vendorDropdownOptions.length > 0 ? vendorDropdownOptions : VENDOR_DROPDOWN_FALLBACK.map((v) => ({ value: v, label: v }))).map((opt) => (
                        <option key={opt.value || opt.label} value={opt.value ?? opt.label}>{opt.label || opt.value}</option>
                      ))}
                    </select>
                  </td>

                  {/* Quoted Price */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={q.quotedPrice || ''}
                      onChange={e => updateQuotation(q.id, 'quotedPrice', parseFloat(e.target.value) || 0)}
                      className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      placeholder="0"
                    />
                  </td>

                  {/* Lead Time */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={q.leadTime || ''}
                      onChange={e => updateQuotation(q.id, 'leadTime', parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                      placeholder="0"
                    />
                  </td>

                  {/* Payment Terms */}
                  <td className="px-4 py-3">
                    <select
                      value={q.paymentTerms}
                      onChange={e => updateQuotation(q.id, 'paymentTerms', e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Deviated">Deviated</option>
                    </select>
                  </td>

                  {/* Quotation File Upload */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors text-xs text-gray-500 whitespace-nowrap">
                        <i className="ri-upload-2-line text-teal-500"></i>
                        {q.quotationFileName ? 'Change File' : 'Upload File'}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                          className="hidden"
                          onChange={e => handleFileChange(q.id, e.target.files?.[0] || null)}
                        />
                      </label>
                      {q.quotationFileName && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                          <i className="ri-file-check-line flex-shrink-0"></i>
                          <span className="truncate max-w-[120px]" title={q.quotationFileName}>
                            {q.quotationFileName}
                          </span>
                          <button
                            onClick={() => handleFileChange(q.id, null)}
                            className="ml-auto flex-shrink-0 text-emerald-500 hover:text-red-500 cursor-pointer"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Remove */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeVendorRow(q.id)}
                      disabled={quotations.length === 1}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors mx-auto ${
                        quotations.length === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-500 hover:bg-red-50 cursor-pointer'
                      }`}
                    >
                      <i className="ri-delete-bin-line text-base"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* ── Success Modal ── */}
    {showSuccess && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
          <div className="w-16 h-16 flex items-center justify-center bg-emerald-100 rounded-full mx-auto mb-4">
            <i className="ri-check-line text-3xl text-emerald-600"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
            RFQ Submitted Successfully
          </h3>
          <p className="text-gray-600 text-center text-sm mb-6">
            Quotations from <span className="font-semibold">{quotations.length}</span> vendor(s) recorded.
          </p>

          {/* File summary */}
          {quotations.some(q => q.quotationFileName) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Uploaded Files</p>
              {quotations.filter(q => q.quotationFileName).map(q => (
                <div key={q.id} className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                  <i className="ri-file-check-line text-emerald-500"></i>
                  <span className="font-medium">{q.vendorName}:</span>
                  <span className="text-gray-500 truncate">{q.quotationFileName}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setShowSuccess(false);
              window.history.back();
            }}
            className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium whitespace-nowrap cursor-pointer"
          >
            Return to Purchase Requests
          </button>
        </div>
      </div>
    )}
  </div>
  );
}