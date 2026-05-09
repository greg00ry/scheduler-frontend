import { useQuery } from '@tanstack/react-query';
import { getAllShifts } from '../api/schedules';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: shifts = [] } = useQuery({ queryKey: ['all-shifts'], queryFn: getAllShifts });

  const upcoming = shifts.filter(s => new Date(s.date) >= new Date()).slice(0, 10);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Przegląd grafiku</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard label="Wszystkie zmiany" value={shifts.length} icon={Calendar} color="bg-blue-500" />
        <StatCard label="Nadchodzące zmiany" value={upcoming.length} icon={Calendar} color="bg-green-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Nadchodzące zmiany</h3>
        {upcoming.length === 0 ? (
          <p className="text-gray-400 text-sm">Brak nadchodzących zmian</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(shift => (
              <div key={shift.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {shift.userDTO.firstName} {shift.userDTO.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(shift.date), 'EEEE, d MMMM', { locale: pl })}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {format(parseISO(shift.startTime), 'HH:mm')} – {format(parseISO(shift.endTime), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
