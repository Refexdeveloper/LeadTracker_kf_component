import { useState, useEffect, useRef } from 'react';
//  import DashboardLayout from '../components/feature/DashboardLayout';
import { vendorComparisonData } from '../mocks/vendor-comparison-data';

const PROCESS_ID = 'Purchase_Requisition_A00';
const REPORT_ID = 'Purchase_Requisition_A00_All_Items';

const PARAMETER_ROWS = [
  { key: 'quotedPrice', label: 'Quoted Price', icon: 'ri-money-rupee-circle-line' },
  { key: 'leadTime', label: 'Lead Time', icon: 'ri-time-line' },
  { key: 'paymentTerms', label: 'Payment Terms', icon: 'ri-bank-card-line' },
  { key: 'complianceStatus', label: 'Compliance Status', icon: 'ri-shield-check-line' },
  { key: 'deliveryTerms', label: 'Delivery Terms', icon: 'ri-truck-line' },
];

const parseNum = (val) => {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val);
  const num = parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
  return isNaN(num) ? 0 : num;
};

const mapApiToVendorComparison = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const vendorDetailsRaw = raw['Table::Vendor_Details'] ?? raw['Table::Vendor_Details_1'] ?? raw.Vendor_Details ?? [];
  const vendorDetailsArr = Array.isArray(vendorDetailsRaw) ? vendorDetailsRaw : [];
  const vendors = vendorDetailsArr.map((v, idx) => {
    const vd = v?.Vendor_Details_1 ?? v;
    const vendorName = v?.Vendor_Name ?? v?.vendor ?? vd?.Legal_Vendor_Name ?? vd?.Name ?? v?.Vendor_ID ?? `Vendor ${idx + 1}`;
    const quotedRaw = v?.Quotation_Amount ?? v?.Quoted_Price ?? v?.Item_Amount ?? v?.quotedPrice ?? '';
    const quotedNum = parseNum(quotedRaw);
    const quotedDisplay = typeof quotedRaw === 'string' && quotedRaw.trim() ? quotedRaw.trim() : (quotedNum ? `₹${quotedNum.toLocaleString('en-IN')}` : '-');
    const leadTime = v?.Lead_Time ?? v?.leadTime ?? '-';
    const paymentTerms = v?.Payment_Terms ?? v?.paymentTerms ?? '-';
    const complianceStatus = v?.Compliance_Status ?? v?.complianceStatus ?? 'Compliant';
    const deliveryTerms = v?.Delivery_Terms ?? v?.deliveryTerms ?? '-';
    const isRecommended = (v?.Select_Vendor ?? v?.select_vendor ?? '').toString().toLowerCase() === 'yes';
    const rfqUploads = v?.RFQ_ID?.Upload_Quotation ?? [];
    const vendorRfq = v?.Vendor_RFQ ?? [];
    const allFiles = [...(Array.isArray(vendorRfq) ? vendorRfq : []), ...(Array.isArray(rfqUploads) ? rfqUploads : []), ...(v?.Quotation_File ?? []), ...(v?.quotationFiles ?? [])];
    const seen = new Set();
    const files = allFiles.filter((f) => {
      const fid = f.id ?? f._id ?? f.key;
      if (fid && seen.has(fid)) return false;
      if (fid) seen.add(fid);
      return true;
    });
    const quotationFiles = Array.isArray(files) ? files.map((f, i) => ({
      id: f.id ?? f._id ?? `f-${idx}-${i}`,
      fileName: f.name ?? f.fileName ?? f.key ?? `File ${i + 1}`,
      fileType: (f.fileExtension ?? f.fileType ?? 'pdf').toLowerCase(),
      fileSize: f.size ? `${(f.size / 1024).toFixed(1)} KB` : '-',
      uploadedBy: f.uploadedBy ?? f._created_by?.Name ?? '-',
      uploadedAt: f._created_at ? new Date(f._created_at).toLocaleString() : (f._modified_at ? new Date(f._modified_at).toLocaleString() : '-'),
    })) : [];
    return {
      id: v._id ?? `vendor-${idx + 1}`,
      name: String(vendorName ?? ''),
      parameters: [
        { key: 'quotedPrice', displayValue: quotedDisplay, numericValue: quotedNum },
        { key: 'leadTime', displayValue: String(leadTime ?? '-'), numericValue: typeof leadTime === 'number' ? leadTime : parseNum(leadTime) },
        { key: 'paymentTerms', displayValue: String(paymentTerms ?? '-') },
        { key: 'complianceStatus', displayValue: String(complianceStatus ?? '-') },
        { key: 'deliveryTerms', displayValue: String(deliveryTerms ?? '-') },
      ],
      quotationFiles,
      _isRecommended: !!isRecommended,
    };
  });
  const recommendedVendor = vendors.find((v) => v._isRecommended) ?? vendors[0];
  return {
    rfqReference: raw.RFQ_Reference ?? raw.rfqReference ?? raw._request_number ?? '-',
    prReference: raw.PR_Number ?? raw.pr_number ?? raw.Request_ID ?? raw._id ?? '-',
    department: raw.Department ?? raw.department ?? '-',
    requestType: raw.Request_Type ?? raw.requestType ?? '-',
    estimatedBudget: raw.PR_Total_Amount ? `₹${parseNum(raw.PR_Total_Amount).toLocaleString('en-IN')}` : raw.estimatedBudget ?? '-',
    recommendedVendorId: recommendedVendor?.id ?? (vendors[0]?.id ?? ''),
    vendors: vendors.map((v) => ({ ...v, _isRecommended: undefined })),
    parameterRows: PARAMETER_ROWS,
  };
};

export default function VendorComparisonPage() {
  const kf = window.kf;
  const application_id = kf?.app?._id ?? '';
  const account_id = kf?.account?._id ?? '';

  const [instanceId, setInstanceId] = useState(null);
  const [activityInstanceId, setActivityInstanceId] = useState(null);
  const [comparisonData, setComparisonData] = useState(vendorComparisonData);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [selectApiLoading, setSelectApiLoading] = useState(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!kf?.context?.watchParams) return;
    kf.context.watchParams((data) => {
      const inst = data?.instance_id ?? data?.instanceId;
      const act = data?.activity_instance_id ?? data?.activityInstanceId;
      if (inst) setInstanceId(inst);
      if (act) setActivityInstanceId(act);
    });
  }, []);

  useEffect(() => {
    if (kf?.app?.page?.getAllParameters && (!instanceId || !activityInstanceId)) {
      kf.app.page.getAllParameters().then((params) => {
        if (params?.instance_id && !instanceId) setInstanceId(params.instance_id);
        if (params?.activity_instance_id && !activityInstanceId) setActivityInstanceId(params.activity_instance_id);
      });
    }
  }, [instanceId, activityInstanceId]);

  useEffect(() => {
    // if (!kf?.api || !instanceId) {
    //   setComparisonData(vendorComparisonData);
    //   setSelectedVendor(vendorComparisonData.recommendedVendorId);
    //   setLoading(false);
    //   return;
    // }
    // setLoading(true);
    (async () => {
    let allParameters = await kf.app.page.getAllParameters();
    console.log("allParameters", allParameters);
      try {
        const url = `/process-report/2/${account_id}/${PROCESS_ID}/${REPORT_ID}/${allParameters.instance_id}?_application_id=${application_id}`;
        const resp = await kf.api(url, { method: 'GET', headers: { Accept: 'application/json' } });
        const data = resp?.data ?? resp;
        const list = Array.isArray(data?.Data) ? data.Data : (Array.isArray(data) ? data : null);
        const item = list?.[0] ?? (typeof data?.Data === 'object' && data?.Data !== null ? data.Data : data);
        const mapped = mapApiToVendorComparison(item);
        if (mapped && mapped.vendors?.length > 0) {
          setComparisonData(mapped);
          setSelectedVendor(mapped.recommendedVendorId ?? mapped.vendors[0]?.id);
        } else {
          setComparisonData(vendorComparisonData);
          setSelectedVendor(vendorComparisonData.recommendedVendorId);
        }
      } catch (err) {
        console.error('Failed to fetch vendor comparison:', err);
        setComparisonData(vendorComparisonData);
        setSelectedVendor(vendorComparisonData.recommendedVendorId);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    })();
  }, [instanceId]);

  /** POST API only – saves selection to form when user clicks Select (radio) */
  const postVendorSelection = async (vendorId) => {
    const inst = instanceId ?? (await kf?.app?.page?.getAllParameters?.())?.instance_id;
    const act = activityInstanceId ?? (await kf?.app?.page?.getAllParameters?.())?.activity_instance_id;
    if (!kf?.api || !inst || !act || !account_id || !application_id) return false;
    const vendors = comparisonData?.vendors ?? [];
    if (!vendors.length) return false;
    const vendorDetails = vendors.map((v) => ({
      _id: v.id,
      Select_Vendor: v.id === vendorId ? 'Yes' : 'No',
    }));
    const payload = { _id: inst, 'Table::Vendor_Details': vendorDetails };
    const baseUrl = `/process/2/${account_id}/${PROCESS_ID}/${inst}/${act}`;
    const qs = `_application_id=${application_id}`;
    try {
      setSelectApiLoading(true);
      await kf.api(`${baseUrl}?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return true;
    } catch (err) {
      console.error('Failed to save vendor selection:', err);
      return false;
    } finally {
      setSelectApiLoading(false);
    }
  };

  /** Submit API only – called when user clicks Select Winner button */
  const submitActivity = async () => {
    const inst = instanceId ?? (await kf?.app?.page?.getAllParameters?.())?.instance_id;
    const act = activityInstanceId ?? (await kf?.app?.page?.getAllParameters?.())?.activity_instance_id;
    if (!kf?.api || !inst || !act || !account_id || !application_id) return false;
    const baseUrl = `/process/2/${account_id}/${PROCESS_ID}/${inst}/${act}`;
    const qs = `_application_id=${application_id}`;
    try {
      setSelectApiLoading(true);
      await kf.api(`${baseUrl}/submit?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return true;
    } catch (err) {
      console.error('Failed to submit vendor selection:', err);
      return false;
    } finally {
      setSelectApiLoading(false);
    }
  };

  const handleVendorSelect = async (vendorId) => {
    setSelectedVendor(vendorId);
    if (!initialLoadDone.current) return;
    await postVendorSelection(vendorId);
  };

  const handleSelectWinner = async () => {
    const ok = await submitActivity();
    if (ok) {
      try {
        if (kf?.app?.setVariable) kf.app.setVariable('expAdvRandNum', Date.now());
        if (kf?.app?.page?.goBack) kf.app.page.goBack();
      } catch (_) {}
    } else {
      alert('Failed to submit. Please try again.');
    }
  };

  const handleExportPDF = () => {
    alert('Exporting comparison report to PDF...');
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf': return { icon: 'ri-file-pdf-2-line', color: 'text-red-500', bg: 'bg-red-50' };
      case 'xlsx': return { icon: 'ri-file-excel-2-line', color: 'text-green-600', bg: 'bg-green-50' };
      case 'docx': return { icon: 'ri-file-word-2-line', color: 'text-sky-600', bg: 'bg-sky-50' };
      case 'jpg': return { icon: 'ri-image-line', color: 'text-orange-500', bg: 'bg-orange-50' };
      default: return { icon: 'ri-file-line', color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  const selectedVendorData = (comparisonData?.vendors ?? []).find(
    (v) => v.id === (selectedVendor ?? comparisonData?.recommendedVendorId)
  );

  const displayData = comparisonData ?? vendorComparisonData;
  const effectiveSelectedVendor = selectedVendor ?? displayData?.recommendedVendorId ?? displayData?.vendors?.[0]?.id;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <span className="inline-block w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-3"></span>
        <span className="text-gray-500">Loading vendor comparison...</span>
      </div>
    );
  }

  return (
    // <DashboardLayout>
    <>
    <div className='p-4'>

    
      <div className="max-w-full">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 mb-6 -mx-6 -mt-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Vendor Comparison
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                RFQ Reference: <span className="font-medium">{displayData.rfqReference}</span> |{' '}
                PR: <span className="font-medium">{displayData.prReference}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <i className="ri-file-pdf-line text-lg"></i>
                Export to PDF
              </button>
              <button
                onClick={handleSelectWinner}
                disabled={!effectiveSelectedVendor || selectApiLoading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {selectApiLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Submitting…
                  </>
                ) : (
                  <>
                    <i className="ri-check-line text-lg"></i>
                    Select Winner
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* PR Details Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-list-3-line text-emerald-600"></i>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Purchase Request Details
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Department</p>
              <p className="text-sm font-medium text-gray-900">{displayData.department}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Request Type</p>
              <p className="text-sm font-medium text-gray-900">{displayData.requestType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Estimated Budget</p>
              <p className="text-sm font-medium text-gray-900">{displayData.estimatedBudget}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Vendors</p>
              <p className="text-sm font-medium text-gray-900">{displayData.vendors.length} vendors</p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 bg-gray-50 px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 min-w-[200px]">
                    Parameters
                  </th>
                  {displayData.vendors.map((vendor) => {
                    const isSelected = (selectedVendor ?? effectiveSelectedVendor) === vendor.id;
                    return (
                    <th
                      key={vendor.id}
                      className={`px-6 py-4 text-center text-sm font-semibold border-r border-gray-200 min-w-[180px] ${
                        isSelected ? 'bg-emerald-50 text-emerald-900' : 'bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {isSelected && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <i className="ri-star-fill mr-1"></i>
                            Recommended
                          </span>
                        )}
                        <span>{vendor.name}</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="selectedVendor"
                            checked={isSelected}
                            onChange={() => handleVendorSelect(vendor.id)}
                            disabled={selectApiLoading}
                            className="w-4 h-4 cursor-pointer disabled:opacity-50"
                          />
                          <span className="text-xs text-gray-600">Select</span>
                        </label>
                      </div>
                    </th>
                  );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayData.parameterRows.map((row, rowIndex) => (
                    <tr key={row.key} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="sticky left-0 px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200 bg-inherit">
                        <div className="flex items-center gap-2">
                          <i className={`${row.icon} text-gray-400`}></i>
                          {row.label}
                        </div>
                      </td>
                      {displayData.vendors.map((vendor) => {
                        const param = vendor.parameters.find((p) => p.key === row.key);
                        const isSelected = vendor.id === effectiveSelectedVendor;
                        return (
                          <td
                            key={vendor.id}
                            className={`px-6 py-4 text-sm text-center border-r border-gray-200 ${
                              isSelected ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-gray-900'
                            }`}
                          >
                            {param?.displayValue || '-'}
                          </td>
                        );
                      })}
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Quotation Files Section ── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          {/* Section Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="w-8 h-8 flex items-center justify-center bg-amber-100 rounded-lg">
              <i className="ri-folder-open-line text-amber-600 text-base"></i>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Quotation Files</h2>
              <p className="text-xs text-gray-500">Uploaded quote documents from each vendor</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 bg-white px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[200px]">
                    Vendor
                  </th>
                  {displayData.vendors.map((vendor) => (
                    <th
                      key={vendor.id}
                      className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[180px]"
                    >
                      {vendor.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky left-0 bg-white px-6 py-4 text-sm font-medium text-gray-700 border-r border-gray-200 align-top">
                    <div className="flex items-center gap-2">
                      <i className="ri-attachment-2 text-gray-400"></i>
                      Attached Files
                    </div>
                  </td>
                  {displayData.vendors.map((vendor) => {
                    const fileInfo = getFileIcon;
                    return (
                      <td key={vendor.id} className="px-4 py-4 border-r border-gray-200 align-top">
                        {vendor.quotationFiles && vendor.quotationFiles.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {vendor.quotationFiles.map((file) => {
                              const { icon, color, bg } = fileInfo(file.fileType);
                              return (
                                <div
                                  key={file.id}
                                  className="flex items-start gap-2 p-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                                >
                                  <div className={`w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 ${bg}`}>
                                    <i className={`${icon} ${color} text-base`}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-800 truncate leading-tight" title={file.fileName}>
                                      {file.fileName}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">{file.fileSize}</p>
                                    <p className="text-xs text-gray-400">{file.uploadedAt}</p>
                                  </div>
                                  <button
                                    onClick={() => setPreviewFile({ file, vendorName: vendor.name })}
                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
                                    title="View file"
                                  >
                                    <i className="ri-eye-line text-sm"></i>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-gray-400">
                            <i className="ri-file-unknow-line text-2xl mb-1"></i>
                            <p className="text-xs">No files</p>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* File count summary row */}
          <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex items-center gap-2">
            <i className="ri-information-line text-gray-400 text-sm"></i>
            <p className="text-xs text-gray-500">
              Total files submitted:{' '}
              <span className="font-semibold text-gray-700">
                {displayData.vendors.reduce((sum, v) => sum + (v.quotationFiles?.length || 0), 0)} files
              </span>{' '}
              across {displayData.vendors.length} vendors. Click the eye icon on any file to preview details.
            </p>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                <i className="ri-trophy-line text-white text-xl"></i>
              </div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">Currently Selected Vendor</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {selectedVendorData?.name || 'No vendor selected'}
                </p>
              </div>
            </div>
            {selectedVendorData && (
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Quoted Price</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedVendorData.parameters.find((p) => p.key === 'quotedPrice')?.displayValue}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Lead Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedVendorData.parameters.find((p) => p.key === 'leadTime')?.displayValue}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Quotation Files</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedVendorData.quotationFiles?.length || 0} files
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${getFileIcon(previewFile.file.fileType).bg}`}>
                  <i className={`${getFileIcon(previewFile.file.fileType).icon} ${getFileIcon(previewFile.file.fileType).color} text-lg`}></i>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">File Details</p>
                  <p className="text-xs text-gray-500">{previewFile.vendorName}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${getFileIcon(previewFile.file.fileType).bg}`}>
                    <i className={`${getFileIcon(previewFile.file.fileType).icon} ${getFileIcon(previewFile.file.fileType).color} text-2xl`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 break-all">{previewFile.file.fileName}</p>
                    <p className="text-xs text-gray-500 mt-0.5 uppercase">{previewFile.file.fileType} Document</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">File Size</p>
                    <p className="text-sm font-semibold text-gray-900">{previewFile.file.fileSize}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Uploaded By</p>
                    <p className="text-sm font-semibold text-gray-900">{previewFile.file.uploadedBy}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Uploaded At</p>
                    <p className="text-sm font-semibold text-gray-900">{previewFile.file.uploadedAt}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewFile(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-download-line"></i>
                  Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    {/* </DashboardLayout> */}
    </>
  );
}
