import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-full min-h-0 w-full max-w-full bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <main id="kf-main-content" className="flex-1 min-h-0 overflow-auto">
          <div className="p-6 max-w-full">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome back, User
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                Role: Not assigned
              </p>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
