export default function ItemsTasksTable() {

    const rows = [
      {
        name: "CTR# 0027 - AMC",
        createdAt: "3/12/2026, 4:06 PM",
        createdBy: "Raghul JE",
        status: "In progress",
      },
    ];
  
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
  
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Manager Approval (SLA 24 hrs)</h2>
  
          <input
            placeholder="Search"
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
  
        <table className="w-full text-sm">
  
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Created At</th>
              <th className="p-3 text-left">Created By</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
  
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
  
                <td className="p-3 font-medium">{row.name}</td>
                <td className="p-3">{row.createdAt}</td>
                <td className="p-3">{row.createdBy}</td>
  
                <td className="p-3">
                  <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-xs">
                    {row.status}
                  </span>
                </td>
  
              </tr>
            ))}
          </tbody>
  
        </table>
  
        <div className="flex justify-between mt-4 text-sm text-gray-500">
          <p>Rows per page: 10</p>
          <p>Showing 1 to 1</p>
        </div>
  
      </div>
    );
  }