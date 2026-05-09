import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createAvailability } from '../api/availability';
import { getAll, getDetails } from '../api/users';
import type { CreateAvailabilityDTO } from '../types';
import toast from 'react-hot-toast';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface DaySaved { available: boolean; startTime?: string; endTime?: string; }
interface ModalState { date: Date; available: boolean; startTime: string; endTime: string; }

export default function AvailabilityPage() {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getAll });
  const { data: details } = useQuery({ queryKey: ['user-details'], queryFn: getDetails, retry: false, enabled: !import.meta.env.DEV });
  const [selectedUserId, setSelectedUserId] = useState<number>(0);

  useEffect(() => {
    if (details?.id && !selectedUserId) setSelectedUserId(details.id);
  }, [details]);
  const [currentWeek, setCurrentWeek] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [availability, setAvailability] = useState<Map<string, boolean>>(new Map());
  const [saved, setSaved] = useState<Map<string, DaySaved>>(new Map());
  const [modal, setModal] = useState<ModalState | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const mutation = useMutation({
    mutationFn: (data: CreateAvailabilityDTO) => createAvailability(data),
    onSuccess: (_, vars) => {
      toast.success('Dostępność zapisana');
    },
    onError: () => toast.error('Błąd podczas zapisywania'),
  });

  const openModal = (date: Date, available: boolean) => {
    if (!selectedUserId) { toast.error('Wybierz pracownika'); return; }
    setModal({ date, available, startTime: '08:00', endTime: '16:00' });
  };

  const confirmSave = (date: Date, available: boolean, startTime?: string, endTime?: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dateTime = available && startTime
      ? `${dateStr}T${startTime}:00`
      : `${dateStr}T00:00:00`;

    mutation.mutate(
      { userId: selectedUserId, date: dateTime, available },
      {
        onSuccess: () => {
          const key = date.toISOString();
          setAvailability(p => new Map(p).set(key, available));
          setSaved(p => new Map(p).set(key, { available, startTime, endTime }));
          setModal(null);
        },
      }
    );
  };

  const handleWeekChange = (dir: 'prev' | 'next') => {
    setCurrentWeek(w => dir === 'prev' ? subWeeks(w, 1) : addWeeks(w, 1));
    setAvailability(new Map());
    setSaved(new Map());
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dostępność</h2>
        <p className="text-gray-500 mt-1">Zarządzaj dostępnością pracowników</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Pracownik:</label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={0}>-- wybierz pracownika --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleWeekChange('prev')}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-44 text-center">
              {format(currentWeek, 'd MMM', { locale: pl })} – {format(addDays(currentWeek, 6), 'd MMM yyyy', { locale: pl })}
            </span>
            <button
              onClick={() => handleWeekChange('next')}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Days */}
        <div className="divide-y divide-gray-100">
          {weekDays.map((date) => {
            const key = date.toISOString();
            const avail = availability.get(key);
            const daySaved = saved.get(key);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={key}
                className={`px-6 py-4 flex items-center justify-between ${isWeekend ? 'bg-gray-50' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {format(date, 'EEEE', { locale: pl })}
                  </p>
                  <p className="text-xs text-gray-500">{format(date, 'd MMMM', { locale: pl })}</p>
                </div>

                <div className="flex items-center gap-3">
                  {daySaved && (
                    <span className={`text-xs flex items-center gap-1 font-medium ${daySaved.available ? 'text-green-600' : 'text-red-500'}`}>
                      {daySaved.available ? (
                        <>
                          <Check size={13} />
                          Dostępny
                          {daySaved.startTime && (
                            <span className="text-gray-400 font-normal ml-1 flex items-center gap-0.5">
                              <Clock size={11} /> {daySaved.startTime}–{daySaved.endTime}
                            </span>
                          )}
                        </>
                      ) : (
                        <><X size={13} /> Niedostępny</>
                      )}
                    </span>
                  )}

                  <button
                    onClick={() => openModal(date, true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      avail === true
                        ? 'bg-green-500 text-white border-green-500'
                        : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
                    }`}
                  >
                    <Check size={14} /> Dostępny
                  </button>

                  <button
                    onClick={() => openModal(date, false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      avail === false
                        ? 'bg-red-500 text-white border-red-500'
                        : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'
                    }`}
                  >
                    <X size={14} /> Niedostępny
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Dostępność — {format(modal.date, 'EEEE, d MMMM', { locale: pl })}
              </h3>
              <button onClick={() => setModal(null)}>
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {modal.available ? (
              <p className="text-sm text-gray-500 mb-4">Podaj godziny dostępności pracownika w tym dniu.</p>
            ) : (
              <p className="text-sm text-gray-500 mb-4">Pracownik będzie niedostępny w tym dniu.</p>
            )}

            {modal.available && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Od</label>
                  <input
                    type="time"
                    value={modal.startTime}
                    onChange={e => setModal(m => m ? { ...m, startTime: e.target.value } : m)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-gray-400 mt-5">–</span>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Do</label>
                  <input
                    type="time"
                    value={modal.endTime}
                    onChange={e => setModal(m => m ? { ...m, endTime: e.target.value } : m)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => modal.available
                  ? confirmSave(modal.date, true, modal.startTime, modal.endTime)
                  : confirmSave(modal.date, false)
                }
                disabled={mutation.isPending}
                className={`flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${modal.available ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {mutation.isPending ? 'Zapisywanie...' : 'Potwierdź'}
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
