import React, { useState } from 'react';

const permissionsList = [
    { id: 'read', label: 'Read Access' },
    { id: 'write', label: 'Write Access' },
    { id: 'delete', label: 'Delete Records' },
    { id: 'admin', label: 'Admin Privileges' },
];

export default function RoleManagement() {
    const [roles, setRoles] = useState([
        { id: 1, name: 'Manager', users: 3, permissions: ['read', 'write'] }
    ]);
    const [newRoleName, setNewRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    const handleTogglePermission = (id) => {
        setSelectedPermissions(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleCreateRole = () => {
        if (!newRoleName.trim()) return;
        setRoles([...roles, {
            id: Date.now(),
            name: newRoleName,
            users: 0,
            permissions: selectedPermissions
        }]);
        setNewRoleName('');
        setSelectedPermissions([]);
    };

    return (
        <div className="bg-white/40 backdrop-blur-xl rounded-[20px] border border-white/60 shadow-lg shadow-gray-200/30 overflow-hidden transition-all duration-300" data-aos="fade-up">
            <div className="p-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-brand-blue via-brand-green to-brand-orange bg-clip-text text-transparent mb-6 tracking-tight">
                    Role & Permission Management
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Creation Panel */}
                    <div className="bg-white/70 backdrop-blur-md rounded-[20px] border border-white/60 p-6 shadow-inner hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Role</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                                <input 
                                    type="text" 
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    placeholder="e.g. HR Administrator" 
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Configure Permissions</label>
                                <div className="space-y-3 p-4 bg-white/50 rounded-xl border border-gray-100">
                                    {permissionsList.map((perm) => (
                                        <label key={perm.id} className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedPermissions.includes(perm.id)}
                                                    onChange={() => handleTogglePermission(perm.id)}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-5 h-5 rounded border-2 border-gray-300 peer-checked:bg-brand-green peer-checked:border-brand-green transition-colors group-hover:border-brand-blue"></div>
                                                <i className="ri-check-line absolute text-white opacity-0 peer-checked:opacity-100 text-sm pointer-events-none transition-opacity"></i>
                                            </div>
                                            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleCreateRole}
                                className="w-full mt-4 px-5 py-3 rounded-[12px] bg-gradient-to-r from-brand-blue to-brand-green text-white font-semibold hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <i className="ri-add-line"></i> Create Role
                            </button>
                        </div>
                    </div>

                    {/* Roles List */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Roles</h3>
                        {roles.map(role => (
                            <div key={role.id} className="bg-white/70 backdrop-blur-md rounded-[20px] border border-white/60 p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{role.name}</h4>
                                        <p className="text-xs text-gray-500">{role.users} active users</p>
                                    </div>
                                    <button className="text-gray-400 hover:text-brand-orange transition-colors">
                                        <i className="ri-edit-line"></i>
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {role.permissions.map(p => (
                                        <span key={p} className="px-2 py-1 bg-brand-blue/10 text-brand-blue text-xs font-medium rounded-md">
                                            {permissionsList.find(pl => pl.id === p)?.label || p}
                                        </span>
                                    ))}
                                    {role.permissions.length === 0 && (
                                        <span className="text-xs text-gray-400 italic">No permissions set</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
