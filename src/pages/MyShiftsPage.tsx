import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllShifts } from '../api/schedules';
import { getAll } from '../api/users';
import { createAbsence } from '../api/absences';
import type { CreateAbsenceDTO } from '../types';
import toast from 'react-hot-toast';
import { format, parseISO, isFuture, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Clock, AlertCircle, X, User } from 'lucide-react';

export default function MyShiftsPage() {
  const qc = useQueryClient();
  const { data: allShifts = [] } = useQuery({ queryKey: ['all-shifts'], queryFn: getAllShifts });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getAll });
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [modal, setModal] = useState<{ shiftId: number; userId: number; shiftLabel: string } | null>(null);
  const [reason, setReason] = useState('');

  const filteredShifts = selectedUserId
    ? allShifts.filter(s => s.userDTO.id === selectedUserId)
    : allShifts;

  const upcoming = filteredShifts.filter(s => isFuture(parseISO(s.date)));
  const past = filteredShifts.filter(s => isPast(parseISO(s.date)));

  const absenceMutation = useMutation({
    mutationFn: (data: CreateAbsenceDTO) => createAbsence(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-shifts'] });
      toast.success('Nieobecność zgłoszona');
      setModal(null);
      setReason('');
    },
    onError: () => toast.error('Błąd podczas zgłaszania nieobecności'),
  });

  const handleAbsence = () => {
    if (!modal || !reason.trim()) return;
    absenceMutation.mutate({
      userId: modal.userId,
      shiftId: modal.shiftId,
      reason,
      reportedAt: new Date().toISOString(),
    });
  };

  const ShiftCard = ({ shift }: { shift: typeof allShifts[0] }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          {!selectedUserId && (
            <p className="text-xs text-blue-600 font-medium mb-1">
              {shift.userDTO.firstName} {shift.userDTO.lastName}
            </p>
          )}
          <p className="font-medium text-gray-900">
            {format(parseISO(shift.date), 'EEEE, d MMMM yyyy', { locale: pl })}
          </p>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <Clock size={14} />
            {format(parseISO(shift.startTime), 'HH:mm')} – {format(parseISO(shift.endTime), 'HH:mm')}
          </div>
        </div>

        {isFuture(parseISO(shift.date)) && (
          <button
            onClick={() => {
              setReason('');
              setModal({
                shiftId: shift.id,
                userId: shift.userDTO.id,
                shiftLabel: `${shift.userDTO.firstName} ${shift.userDTO.lastName} — ${format(parseISO(shift.date), 'EEEE, d MMM', { locale: pl })} ${format(parseISO(shift.startTime), 'HH:mm')}–${format(parseISO(shift.endTime), 'HH:mm')}`,
              });
            }}
            className="flex items-center gap-1 text-xs text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
          >
            <AlertCircle size={13} /> Zgłoś nieobecność
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Zmiany</h2>
          <p className="text-gray-500 mt-1">Harmonogram pracy pracowników</p>
        </div>

        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-400" />
          <select
            value={selectedUserId}
            onChange={e => { setSelectedUserId(Number(e.target.value)); setReportingShiftId(null); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value={0}>Wszyscy pracownicy</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Nadchodzące ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
            Brak nadchodzących zmian
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(s => <ShiftCard key={s.id} shift={s} />)}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Historia ({past.length})
        </h3>
        {past.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
            Brak historii zmian
          </div>
        ) : (
          <div className="space-y-3 opacity-70">
            {past.slice().reverse().slice(0, 10).map(s => <ShiftCard key={s.id} shift={s} />)}
          </div>
        )}
      </div>

      {/* Absence modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">Zgłoś nieobecność</h3>
              <button onClick={() => setModal(null)}>
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">{modal.shiftLabel}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Powód nieobecności</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Np. choroba, urlop na żądanie..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAbsence}
                disabled={!reason.trim() || absenceMutation.isPending}
                className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {absenceMutation.isPending ? 'Wysyłanie...' : 'Zgłoś nieobecność'}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
