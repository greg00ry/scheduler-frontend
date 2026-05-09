import { useQuery } from '@tanstack/react-query';
import { getAllShifts } from '../api/schedules';
import { getDetails } from '../api/users';
import { Clock, AlertCircle, Calendar, TrendingUp } from 'lucide-react';
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
  const { data: details } = useQuery({ queryKey: ['user-details'], queryFn: getDetails, retry: false, enabled: !import.meta.env.DEV });
  const { data: shifts = [] } = useQuery({ queryKey: ['all-shifts'], queryFn: getAllShifts });

  const myShifts = details ? shifts.filter(s => s.userDTO.id === details.id) : shifts;
  const upcoming = myShifts.filter(s => new Date(s.date) >= new Date()).slice(0, 10);
  const totalHours = details?.workingHoursList.reduce((sum, w) => sum + w.totalHours, 0) ?? 0;
  const overtimeHours = details?.workingHoursList.reduce((sum, w) => sum + w.overtimeHours, 0) ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Witaj{details ? `, ${details.firstName}` : ''}!
        </h2>
        <p className="text-gray-500 mt-1">Przegląd Twojego grafiku</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Łączne godziny" value={totalHours.toFixed(1)} icon={Clock} color="bg-blue-500" />
        <StatCard label="Nadgodziny" value={overtimeHours.toFixed(1)} icon={TrendingUp} color="bg-amber-500" />
        <StatCard label="Nieobecności" value={details?.absences.length ?? 0} icon={AlertCircle} color="bg-red-500" />
        <StatCard label="Nadchodzące zmiany" value={upcoming.length} icon={Calendar} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      {format(parseISO(shift.date), 'EEEE, d MMMM', { locale: pl })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(shift.startTime), 'HH:mm')} – {format(parseISO(shift.endTime), 'HH:mm')}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Zaplanowana</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ostatnie nieobecności</h3>
          {(details?.absences.length ?? 0) === 0 ? (
            <p className="text-gray-400 text-sm">Brak zarejestrowanych nieobecności</p>
          ) : (
            <div className="space-y-3">
              {details?.absences.slice(0, 5).map(absence => (
                <div key={absence.id} className="py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-medium text-gray-900">{absence.reason}</p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(absence.reportedAt), 'd MMM yyyy', { locale: pl })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
