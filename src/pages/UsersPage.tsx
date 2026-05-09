import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAll, createUser, updateUser, deleteUser } from '../api/users';
import type { UserDTO, CreateUserDTO, UpdateUserDTO, Role } from '../types';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const ROLES: Role[] = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
const roleColors: Record<Role, string> = {
  EMPLOYEE: 'bg-gray-100 text-gray-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700',
};

const emptyCreate: CreateUserDTO = { firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE' };

export default function UsersPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getAll });
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserDTO | null>(null);
  const [form, setForm] = useState<CreateUserDTO>(emptyCreate);
  const [editForm, setEditForm] = useState<Partial<UpdateUserDTO>>({});

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Użytkownik dodany'); setShowCreate(false); setForm(emptyCreate); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      toast.error(msg ? `Błąd: ${msg}` : 'Błąd podczas dodawania użytkownika');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Zapisano zmiany'); setEditUser(null); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      toast.error(msg ? `Błąd: ${msg}` : 'Błąd podczas edycji');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Użytkownik usunięty'); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      toast.error(msg ? `Błąd: ${msg}` : 'Błąd podczas usuwania');
    },
  });

  const openEdit = (u: UserDTO) => {
    setEditUser(u);
    setEditForm({ id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role });
  };

  const handleDelete = (id: number) => {
    if (confirm('Czy na pewno usunąć tego użytkownika?')) deleteMutation.mutate(id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pracownicy</h2>
          <p className="text-gray-500 mt-1">Zarządzanie kontami użytkowników</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Dodaj pracownika
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Nowy pracownik</h3>
            <button onClick={() => setShowCreate(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(['firstName', 'lastName', 'email', 'password'] as const).map(field => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {field === 'firstName' ? 'Imię' : field === 'lastName' ? 'Nazwisko' : field === 'email' ? 'Email' : 'Hasło'}
                </label>
                <input
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rola</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={15} /> Zapisz
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Anuluj</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Ładowanie...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Imię i nazwisko</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">Rola</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {editUser?.id === u.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editForm.firstName ?? ''}
                          onChange={e => setEditForm(p => ({ ...p, firstName: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                          placeholder="Imię"
                        />
                        <input
                          value={editForm.lastName ?? ''}
                          onChange={e => setEditForm(p => ({ ...p, lastName: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                          placeholder="Nazwisko"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400">ID: {u.id}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editUser?.id === u.id ? (
                      <select
                        value={editForm.role ?? u.role}
                        onChange={e => setEditForm(p => ({ ...p, role: e.target.value as Role }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleColors[u.role]}`}>{u.role}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editUser?.id === u.id ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => updateMutation.mutate(editForm as UpdateUserDTO)}
                          className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg"
                        >
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditUser(null)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
