import { useState, useEffect } from 'react';

/**
 * Create PR popup – shown when Popup_Requester is opened from Requester dashboard.
 * On submit: creates process item, closes popup, and sets refresh for dashboard.
 */
export default function CreatePRPopup() {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Optional: load params passed from parent
    const loadParams = async () => {
      if (window.kf?.app?.page?.popup?.getAllParameters) {
        try {
          const params = await window.kf.app.page.popup.getAllParameters();
          if (params?.department) setDepartment(params.department);
        } catch {
          // ignore
        }
      }
    };
    loadParams();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const kf = window.kf;
      if (!kf) throw new Error('Kissflow SDK not loaded');

      const processId = await kf.app.getVariable('expense_process_id');
      if (!processId) throw new Error('Process ID not configured. Set expense_process_id variable.');

      const payload = {
        Title: title,
        Department: department,
        Amount: parseFloat(amount) || 0,
        // Add other fields as per your Kissflow process
      };

      await kf.api(`/process/2/${kf.account._id}/${processId}/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      kf.client.showInfo('Purchase Request created successfully');

      // Set variable so dashboard knows to refresh
      kf.app.setVariable('requester_last_created', Date.now());

      // Close popup
      kf.app.page.popup.close();
    } catch (err) {
      setError(err?.message || 'Failed to create PR');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Purchase Request</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="PR title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. IT, Operations"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => window.kf?.app?.page?.popup?.close?.()}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
