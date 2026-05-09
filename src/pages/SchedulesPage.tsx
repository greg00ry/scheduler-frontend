import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllSchedules, getShiftsBySchedule, createSchedule } from '../api/schedules';
import { getAll } from '../api/users';
import { useAuth } from '../context/AuthContext';
import type { CreateScheduleDTO } from '../types';
import type { UserDTO } from '../types';
import toast from 'react-hot-toast';
import { format, parseISO, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, ChevronRight, X, Clock, ChevronLeft, ChevronRight as ChevronRightIcon, Check } from 'lucide-react';

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];

interface ShiftRow {
  tempId: string;
  userId: number;
  startTime: string;
  endTime: string;
}

type WeekGrid = Record<number, ShiftRow[]>; // 0=Mon … 6=Sun

function ShiftsPanel({ scheduleId }: { scheduleId: number }) {
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['schedule-shifts', scheduleId],
    queryFn: () => getShiftsBySchedule(scheduleId),
  });

  if (isLoading) return <p className="text-sm text-gray-400 p-4">Ładowanie zmian...</p>;
  if (shifts.length === 0) return <p className="text-sm text-gray-400 p-4">Brak zmian w tym grafiku</p>;

  return (
    <div className="divide-y divide-gray-100">
      {shifts.map(shift => (
        <div key={shift.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-900">{shift.userDTO.firstName} {shift.userDTO.lastName}</p>
            <p className="text-xs text-gray-500">{format(parseISO(shift.date), 'EEEE, d MMM', { locale: pl })}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={13} />
            {format(parseISO(shift.startTime), 'HH:mm')} – {format(parseISO(shift.endTime), 'HH:mm')}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddShiftForm({ users, onAdd, onCancel }: {
  users: UserDTO[];
  onAdd: (row: Omit<ShiftRow, 'tempId'>) => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState(users[0]?.id ?? 0);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');

  const handleAdd = () => {
    if (!userId) { toast.error('Wybierz pracownika'); return; }
    if (startTime >= endTime) { toast.error('Godzina końca musi być późniejsza niż start'); return; }
    onAdd({ userId, startTime, endTime });
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 space-y-2">
      <select
        value={userId}
        onChange={e => setUserId(Number(e.target.value))}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value={0}>-- pracownik --</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
      </select>
      <div className="flex gap-1 items-center">
        <input
          type="time"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">–</span>
        <input
          type="time"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleAdd}
          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700"
        >
          <Check size={12} /> Dodaj
        </button>
        <button
          onClick={onCancel}
          className="px-3 text-xs text-gray-500 hover:bg-gray-200 rounded"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: schedules = [], isLoading } = useQuery({ queryKey: ['schedules'], queryFn: getAllSchedules });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getAll });

  const [expanded, setExpanded] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [currentWeek, setCurrentWeek] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [createdById, setCreatedById] = useState<number>(0);
  const [grid, setGrid] = useState<WeekGrid>({});
  const [addingInDay, setAddingInDay] = useState<number | null>(null);

  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const createMutation = useMutation({
    mutationFn: (data: CreateScheduleDTO) => createSchedule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Grafik utworzony');
      setShowCreate(false);
      setGrid({});
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: string } })?.response?.data;
      toast.error(msg ? `Błąd: ${msg}` : 'Błąd podczas tworzenia grafiku');
    },
  });

  const addShift = (dayIndex: number, row: Omit<ShiftRow, 'tempId'>) => {
    setGrid(prev => ({
      ...prev,
      [dayIndex]: [...(prev[dayIndex] ?? []), { ...row, tempId: crypto.randomUUID() }],
    }));
    setAddingInDay(null);
  };

  const removeShift = (dayIndex: number, tempId: string) => {
    setGrid(prev => ({
      ...prev,
      [dayIndex]: prev[dayIndex]?.filter(s => s.tempId !== tempId) ?? [],
    }));
  };

  const totalShifts = Object.values(grid).flat().length;

  const handleCreate = () => {
    if (!createdById) { toast.error('Wybierz osobę tworzącą grafik'); return; }
    if (totalShifts === 0) { toast.error('Dodaj co najmniej jedną zmianę'); return; }

    const we = addDays(currentWeek, 6);
    const shifts = Object.entries(grid).flatMap(([dayIdx, rows]) => {
      const dayDate = addDays(currentWeek, Number(dayIdx));
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      return rows.map(row => ({
        userId: row.userId,
        scheduleId: 0,
        date: `${dateStr}T00:00:00.000Z`,
        startTime: `${dateStr}T${row.startTime}:00.000Z`,
        endTime: `${dateStr}T${row.endTime}:00.000Z`,
      }));
    });

    createMutation.mutate({
      weekStart: format(currentWeek, "yyyy-MM-dd'T'00:00:00.000'Z'"),
      weekEnd: format(we, "yyyy-MM-dd'T'23:59:59.000'Z'"),
      createdBy_id: createdById,
      shifts,
    });
  };

  const openCreate = () => {
    setGrid({});
    setCreatedById(0);
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setShowCreate(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grafiki</h2>
          <p className="text-gray-500 mt-1">Tygodniowe harmonogramy pracy</p>
        </div>
        {isManager && !showCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> Nowy grafik
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900 text-lg">Nowy grafik</h3>
            <button onClick={() => setShowCreate(false)}>
              <X size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {/* Week selector + Creator */}
          <div className="flex items-center gap-6 mb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentWeek(w => subWeeks(w, 1))}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <span className="text-sm font-medium text-gray-800 min-w-48 text-center">
                {format(currentWeek, 'd MMM', { locale: pl })} – {format(addDays(currentWeek, 6), 'd MMM yyyy', { locale: pl })}
              </span>
              <button
                onClick={() => setCurrentWeek(w => addWeeks(w, 1))}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRightIcon size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Tworzący grafik:</label>
              <select
                value={createdById}
                onChange={e => setCreatedById(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>-- wybierz --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
          </div>

          {/* Weekly grid */}
          <div className="grid grid-cols-7 gap-2 mb-5">
            {weekDays.map((day, dayIdx) => {
              const dayShifts = grid[dayIdx] ?? [];
              const isAdding = addingInDay === dayIdx;
              const isWeekend = dayIdx >= 5;

              return (
                <div
                  key={dayIdx}
                  className={`rounded-xl border ${isWeekend ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'} p-2 min-h-32`}
                >
                  <div className="mb-2 text-center">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                      {DAY_LABELS[dayIdx]}
                    </p>
                    <p className="text-lg font-bold text-gray-800 leading-none mt-0.5">
                      {format(day, 'd')}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {dayShifts.map(shift => {
                      const emp = users.find(u => u.id === shift.userId);
                      return (
                        <div
                          key={shift.tempId}
                          className="bg-blue-100 border border-blue-200 rounded-lg px-2 py-1 flex items-start justify-between group"
                        >
                          <div>
                            <p className="text-xs font-medium text-blue-800 leading-tight">
                              {emp ? `${emp.firstName} ${emp.lastName[0]}.` : `#${shift.userId}`}
                            </p>
                            <p className="text-xs text-blue-600">{shift.startTime}–{shift.endTime}</p>
                          </div>
                          <button
                            onClick={() => removeShift(dayIdx, shift.tempId)}
                            className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-red-500 ml-1 mt-0.5"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {isAdding ? (
                    <AddShiftForm
                      users={users}
                      onAdd={row => addShift(dayIdx, row)}
                      onCancel={() => setAddingInDay(null)}
                    />
                  ) : (
                    <button
                      onClick={() => { setAddingInDay(dayIdx); }}
                      className="mt-1 w-full text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg py-1 flex items-center justify-center gap-0.5 transition-colors"
                    >
                      <Plus size={12} /> dodaj
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
              Łącznie zmian: <span className="font-semibold text-gray-800">{totalShifts}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || totalShifts === 0 || !createdById}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Tworzenie...' : 'Utwórz grafik'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-16">Ładowanie...</div>
      ) : (
        <div className="space-y-3">
          {schedules.map(schedule => (
            <div key={schedule.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === schedule.id ? null : schedule.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    {format(parseISO(schedule.weekStart), 'd MMM', { locale: pl })} – {format(parseISO(schedule.weekEnd), 'd MMM yyyy', { locale: pl })}
                  </p>
                  <p className="text-xs text-gray-500">
                    Utworzony przez: {schedule.createdBy_id.firstName} {schedule.createdBy_id.lastName}
                  </p>
                </div>
                <ChevronRight size={18} className={`text-gray-400 transition-transform ${expanded === schedule.id ? 'rotate-90' : ''}`} />
              </button>
              {expanded === schedule.id && <ShiftsPanel scheduleId={schedule.id} />}
            </div>
          ))}
          {schedules.length === 0 && (
            <div className="text-center text-gray-400 py-16">Brak grafików</div>
          )}
        </div>
      )}
    </div>
  );
}
