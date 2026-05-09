import { useQuery } from '@tanstack/react-query';
import { getAll, getByRole } from '../api/users';
import { getAllSchedules, getAllShifts } from '../api/schedules';
import { Users, CalendarDays, Clock, ShieldCheck } from 'lucide-react';

export default function AdminPage() {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getAll });
  const { data: schedules = [] } = useQuery({ queryKey: ['schedules'], queryFn: getAllSchedules });
  const { data: shifts = [] } = useQuery({ queryKey: ['all-shifts'], queryFn: getAllShifts });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => getByRole('EMPLOYEE') });
  const { data: managers = [] } = useQuery({ queryKey: ['managers'], queryFn: () => getByRole('MANAGER') });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Panel administracyjny</h2>
        <p className="text-gray-500 mt-1">Przegląd systemu</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Użytkownicy', value: users.length, icon: Users, color: 'bg-blue-500' },
          { label: 'Grafiki', value: schedules.length, icon: CalendarDays, color: 'bg-green-500' },
          { label: 'Zmiany', value: shifts.length, icon: Clock, color: 'bg-amber-500' },
          { label: 'Menedżerowie', value: managers.length, icon: ShieldCheck, color: 'bg-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pracownicy ({employees.length})</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {employees.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm text-gray-900">{u.firstName} {u.lastName}</p>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">ID: {u.id}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ostatnie grafiki</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {schedules.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-900">
                    {new Date(s.weekStart).toLocaleDateString('pl-PL')} – {new Date(s.weekEnd).toLocaleDateString('pl-PL')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.createdBy_id.firstName} {s.createdBy_id.lastName}
                  </p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">#{s.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
