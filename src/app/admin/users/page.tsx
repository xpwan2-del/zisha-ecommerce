"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface User {
  _id: string;
  id?: number;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

interface UserFormData {
  name: string;
  email:string;
  phone?: string;
  password?: string;
  role: 'admin' | 'user';
  isActive: boolean;
}

const emptyFormData: UserFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'user',
  isActive: true,
};

const inputClassName = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const labelClassName = 'mb-2 block text-sm font-medium text-slate-700';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyFormData);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        const rows = data.data?.users || [];
        setUsers(rows.map((user: any) => ({
          _id: String(user.id),
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role === 'admin' ? 'admin' : 'user',
          isActive: true,
          createdAt: user.created_at,
        })));
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const admins = users.filter(u => u.role === 'admin').length;
    return { total, active, admins, inactive: total - active };
  }, [users]);

  const openDrawer = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData(emptyFormData);
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const url = '/api/admin/users';
    const method = editingUser ? 'PUT' : 'POST';
    const body: any = editingUser 
      ? { id: editingUser._id, ...formData }
      : formData;

    if (method === 'PUT' && !body.password) {
      delete body.password;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        closeDrawer();
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save user');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError('Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setError(null);
    try {
      const response = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchUsers();
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="User Management"
        title="用户管理中心"
        description="管理平台所有用户账户、角色和状态。请谨慎操作管理员权限变更。"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users' }]}
        action={
          <button
            onClick={() => openDrawer()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            新增用户
          </button>
        }
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <AdminCard><p className="text-sm text-slate-500">用户总数</p><p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.total}</p></AdminCard>
        <AdminCard><p className="text-sm text-slate-500">活跃用户</p><p className="mt-2 text-3xl font-semibold text-emerald-600">{metrics.active}</p></AdminCard>
        <AdminCard><p className="text-sm text-slate-500">非活跃用户</p><p className="mt-2 text-3xl font-semibold text-amber-600">{metrics.inactive}</p></AdminCard>
        <AdminCard><p className="text-sm text-slate-500">管理员</p><p className="mt-2 text-3xl font-semibold text-red-600">{metrics.admins}</p></AdminCard>
      </div>

      <AdminCard>
        <div className="mb-4">
          <input
            type="text"
            placeholder="按名称或邮箱搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created At</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading users...</td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user._id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-right text-sm font-semibold">
                      <button onClick={() => openDrawer(user)} className="text-blue-600 transition hover:text-blue-800">Edit</button>
                      <button onClick={() => handleDelete(user._id)} className="ml-4 text-red-600 transition hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminCard>
      
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{editingUser ? 'Edit User' : 'Create New User'}</h2>
                <p className="mt-1 text-sm text-slate-500">{editingUser ? 'Update user details, role, and status.' : 'Fill in the form to add a new user.'}</p>
              </div>
              <button onClick={closeDrawer} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-8">
              <div>
                <label htmlFor="name" className={labelClassName}>Name</label>
                <input type="text" id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="email" className={labelClassName}>Email</label>
                <input type="email" id="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="phone" className={labelClassName}>Phone</label>
                <input type="text" id="phone" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="password" className={labelClassName}>Password {editingUser && '(leave empty to keep current)'}</label>
                <input type="password" id="password" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} required={!editingUser} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="role" className={labelClassName}>Role</label>
                <select id="role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'user'})} className={inputClassName}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                User is Active
              </label>

              <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
                <button type="button" onClick={closeDrawer} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
