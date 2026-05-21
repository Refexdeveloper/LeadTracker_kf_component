import { useState } from 'react';

// import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = "/";
  const user ="sathish"
  // const { user } = useAuth();

  // Role-based menu items
  const getMenuItems = () => {
    // if (user?.role === 'Requester') {
    //   return [
    //     { icon: 'ri-dashboard-line', label: 'Dashboard', path: '/requester/dashboard', badge: null },
    //     { icon: 'ri-add-circle-line', label: 'Create PR', path: '/requester/create-pr', badge: null },
    //     { icon: 'ri-search-line', label: 'Track PR', path: '/requester/track-pr', badge: null },
    //     { icon: 'ri-file-text-line', label: 'My Documents', path: '/requester/documents', badge: null },
    //     { icon: 'ri-settings-3-line', label: 'Settings', path: '/settings', badge: null }
    //   ];
    // }

    // Default menu for other roles
    return [
      { icon: 'ri-dashboard-line', label: 'Dashboard', path: '/', badge: null },
      { icon: 'ri-task-line', label: 'My Tasks', path: '/tasks', badge: 12 },
      { icon: 'ri-checkbox-circle-line', label: 'Approvals', path: '/approvals', badge: 8 },
      { icon: 'ri-file-text-line', label: 'Documents', path: '/documents', badge: null },
      { icon: 'ri-bar-chart-box-line', label: 'Reports', path: '/reports', badge: null },
      { icon: 'ri-settings-3-line', label: 'Settings', path: '/settings', badge: null }
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="ri-shopping-cart-2-line text-white text-lg"></i>
            </div>
            <span className="font-semibold text-gray-900">P2P System</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <i className={`ri-${collapsed ? 'menu-unfold' : 'menu-fold'}-line text-gray-600`}></i>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <a
              key={item.path}
              href={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <i className={`${item.icon} text-lg`}></i>
                {!collapsed && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
              </div>
              {!collapsed && item.badge && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role || 'Role'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
