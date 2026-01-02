import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Edit2, UserCheck, UserX, X, Save, Users, Shield } from 'lucide-react';

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: number;
  created_at: string;
}

const UsersScreen: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    pin: '',
    role: 'cashier',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await window.api.users.getAll();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.firstName || !formData.lastName) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!editingUser && !formData.pin) {
      toast.error('PIN is required for new users');
      return;
    }

    try {
      if (editingUser) {
        const updateData: any = {
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
        };
        if (formData.pin) {
          updateData.pin = formData.pin;
        }
        await window.api.users.update(editingUser.id, updateData);
        toast.success('User updated successfully');
      } else {
        await window.api.users.create({
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          pin: formData.pin,
          role: formData.role,
        });
        toast.success('User created successfully');
      }

      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error('Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      pin: '',
      role: user.role,
    });
    setShowModal(true);
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await window.api.users.update(user.id, { isActive: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      pin: '',
      role: 'cashier',
    });
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      cashier: 'bg-green-100 text-green-700',
    };
    return styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-kutunza-burgundy text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold">Users</h1>
              <p className="text-sm text-kutunza-gold">{users.length} users</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-kutunza-gold text-kutunza-dark px-4 py-2 rounded-lg font-medium hover:bg-yellow-400"
          >
            <Plus size={20} />
            Add User
          </button>
        </div>
      </header>

      {/* Users List */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-kutunza-burgundy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center text-gray-400 py-12 bg-white rounded-xl">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div key={user.id} className={`pos-card p-6 ${!user.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      user.role === 'admin' ? 'bg-purple-500' :
                      user.role === 'manager' ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                      {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold">{user.first_name} {user.last_name}</h3>
                      <p className="text-gray-500 text-sm">@{user.username}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className={`flex items-center gap-1 text-sm ${
                    user.is_active ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {user.is_active ? <UserCheck size={16} /> : <UserX size={16} />}
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleUserStatus(user)}
                      className={`p-2 rounded-lg ${
                        user.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'
                      }`}
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="border-b p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingUser ? 'Edit User' : 'New User'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="pos-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="pos-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                  className="pos-input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.pin}
                  onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                  className="pos-input"
                  placeholder="4-6 digit PIN"
                  maxLength={6}
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="pos-input"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'admin' && 'Full access to all features'}
                  {formData.role === 'manager' && 'Access to POS and back office'}
                  {formData.role === 'cashier' && 'POS access only'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 pos-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 pos-btn-primary flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersScreen;
