import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllSchedules, getShiftsBySchedule, createSchedule } from '../api/schedules';
import { getAll } from '../api/users';
import { useAuth } from '../context/AuthContext';
import type { CreateScheduleDTO } from '../types';
import type { UserDTO } from '../types';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  format, parseISO, startOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, subWeeks, addMonths, subMonths,
  eachDayOfInterval, isBefore, getDay,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, ChevronRight, X, Clock, ChevronLeft, ChevronRight as ChevronRightIcon, Check, CalendarDays } from 'lucide-react';

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];

interface ShiftRow {
  tempId: string;
  userId: number;
  startTime: string;
  endTime: string;
}

type Grid = Record<string, ShiftRow[]>; // keyed by 'yyyy-MM-dd'
type ViewMode = 'weekly' | 'monthly';

function ShiftsPanel({ scheduleId }: { scheduleId: number }) {
  const navigate = useNavigate();
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['schedule-shifts', scheduleId],
    queryFn: () => getShiftsBySchedule(scheduleId),
  });

  if (isLoading) return <p className="text-sm text-gray-400 p-4">Ładowanie zmian...</p>;
  if (shifts.length === 0) return <p className="text-sm text-gray-400 p-4">Brak zmian w tym grafiku</p>;

  const byDay = shifts.reduce<Record<string, typeof shifts>>((acc, shift) => {
    const key = shift.date.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(shift);
    return acc;
  }, {});

  const sortedDays = Object.keys(byDay).sort();

  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200">
      {sortedDays.map(dateKey => {
        const dayShifts = byDay[dateKey];
        const date = parseISO(dateKey);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        return (
          <div key={dateKey} className={`p-3 ${isWeekend ? 'bg-gray-50' : 'bg-white'}`}>
            <div className="mb-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {format(date, 'EEE', { locale: pl })}
              </p>
              <p className="text-base font-bold text-gray-800">{format(date, 'd')}</p>
            </div>
            <div className="space-y-1.5">
              {dayShifts.map(shift => (
                <button
                  key={shift.id}
                  onClick={() => navigate('/shifts', { state: { userId: shift.userDTO.id, date: shift.date.slice(0, 10) } })}
                  className="w-full text-left bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                  <p className="text-xs font-medium text-blue-800 truncate">
                    {shift.userDTO.firstName} {shift.userDTO.lastName[0]}.
                  </p>
                  <p className="text-xs text-blue-500 flex items-center gap-0.5 mt-0.5">
                    <Clock size={10} />
                    {format(parseISO(shift.startTime), 'HH:mm')}–{format(parseISO(shift.endTime), 'HH:mm')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
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
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-1 space-y-1.5">
      <select
        value={userId}
        onChange={e => setUserId(Number(e.target.value))}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value={0}>-- pracownik --</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
      </select>
      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
      <div className="flex gap-1">
        <button onClick={handleAdd}
          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700">
          <Check size={11} /> Dodaj
        </button>
        <button onClick={onCancel} className="px-2 text-xs text-gray-500 hover:bg-gray-200 rounded">
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

function DayCell({ day, shifts, users, isAdding, isOutside, onAdd, onRemove, onStartAdd, onCancelAdd }: {
  day: Date;
  shifts: ShiftRow[];
  users: UserDTO[];
  isAdding: boolean;
  isOutside?: boolean;
  onAdd: (row: Omit<ShiftRow, 'tempId'>) => void;
  onRemove: (tempId: string) => void;
  onStartAdd: () => void;
  onCancelAdd: () => void;
}) {
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  return (
    <div className={`rounded-lg border p-1.5 min-h-24 flex flex-col ${
      isOutside ? 'bg-gray-50 border-gray-100 opacity-40' :
      isWeekend ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
    }`}>
      <p className={`text-xs font-bold mb-1 ${isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
        {format(day, 'd')}
      </p>
      <div className="space-y-0.5 flex-1">
        {shifts.map(shift => {
          const emp = users.find(u => u.id === shift.userId);
          return (
            <div key={shift.tempId} className="bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5 flex items-start justify-between group">
              <div>
                <p className="text-xs font-medium text-blue-800 leading-tight truncate max-w-[5rem]">
                  {emp ? `${emp.firstName[0]}. ${emp.lastName}` : `#${shift.userId}`}
                </p>
                <p className="text-xs text-blue-500">{shift.startTime}–{shift.endTime}</p>
              </div>
              <button onClick={() => onRemove(shift.tempId)}
                className="opacity-0 group-hover:opacity-100 text-blue-300 hover:text-red-500 ml-0.5">
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>
      {isAdding ? (
        <AddShiftForm users={users} onAdd={onAdd} onCancel={onCancelAdd} />
      ) : (
        !isOutside && (
          <button onClick={onStartAdd}
            className="mt-1 w-full text-xs text-blue-500 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded py-1 flex items-center justify-center gap-0.5 transition-colors font-medium">
            <Plus size={11} /> Dodaj
          </button>
        )
      )}
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
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  const [currentWeek, setCurrentWeek] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [grid, setGrid] = useState<Grid>({});
  const [addingInDay, setAddingInDay] = useState<string | null>(null);

  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisMonth = startOfMonth(new Date());

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // Monthly calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = (getDay(monthStart) + 6) % 7; // Mon=0

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

  const addShift = (dateStr: string, row: Omit<ShiftRow, 'tempId'>) => {
    setGrid(prev => ({ ...prev, [dateStr]: [...(prev[dateStr] ?? []), { ...row, tempId: crypto.randomUUID() }] }));
    setAddingInDay(null);
  };

  const removeShift = (dateStr: string, tempId: string) => {
    setGrid(prev => ({ ...prev, [dateStr]: prev[dateStr]?.filter(s => s.tempId !== tempId) ?? [] }));
  };

  const totalShifts = Object.values(grid).flat().length;

  const handleCreate = () => {
    if (!user?.id) { toast.error('Brak danych użytkownika'); return; }
    if (totalShifts === 0) { toast.error('Dodaj co najmniej jedną zmianę'); return; }

    const rangeStart = viewMode === 'weekly' ? currentWeek : monthStart;
    const rangeEnd = viewMode === 'weekly' ? addDays(currentWeek, 6) : monthEnd;

    const shifts = Object.entries(grid).flatMap(([dateStr, rows]) =>
      rows.map(row => ({
        userId: Number(row.userId),
        date: `${dateStr}T00:00:00`,
        startTime: `${dateStr}T${row.startTime}:00`,
        endTime: `${dateStr}T${row.endTime}:00`,
      }))
    );

    createMutation.mutate({
      weekStart: format(rangeStart, "yyyy-MM-dd'T'00:00:00"),
      weekEnd: format(rangeEnd, "yyyy-MM-dd'T'23:59:59"),
      createdBy_id: user.id,
      shifts,
    });
  };

  const openCreate = () => {
    setGrid({});
    setAddingInDay(null);
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setCurrentMonth(startOfMonth(new Date()));
    setShowCreate(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grafiki</h2>
          <p className="text-gray-500 mt-1">Harmonogramy pracy</p>
        </div>
        {isManager && !showCreate && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Nowy grafik
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-gray-900 text-lg">Nowy grafik</h3>
              {/* View mode toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
                <button
                  onClick={() => { setViewMode('weekly'); setGrid({}); setAddingInDay(null); }}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${viewMode === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Tygodniowy
                </button>
                <button
                  onClick={() => { setViewMode('monthly'); setGrid({}); setAddingInDay(null); }}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Miesięczny
                </button>
              </div>
            </div>
            <button onClick={() => setShowCreate(false)}>
              <X size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          {viewMode === 'weekly' ? (
            <div className="flex items-center gap-2 mb-5">
              <button
                onClick={() => setCurrentWeek(w => subWeeks(w, 1))}
                disabled={user?.role !== 'ADMIN' && !isBefore(thisWeek, currentWeek)}
                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <span className="text-sm font-medium text-gray-800 min-w-48 text-center">
                {format(currentWeek, 'd MMM', { locale: pl })} – {format(addDays(currentWeek, 6), 'd MMM yyyy', { locale: pl })}
              </span>
              <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ChevronRightIcon size={16} className="text-gray-500" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-5">
              <button
                onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setGrid({}); setAddingInDay(null); }}
                disabled={user?.role !== 'ADMIN' && !isBefore(thisMonth, currentMonth)}
                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} className="text-gray-500" />
              </button>
              <span className="text-sm font-medium text-gray-800 min-w-48 text-center capitalize">
                {format(currentMonth, 'LLLL yyyy', { locale: pl })}
              </span>
              <button onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setGrid({}); setAddingInDay(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ChevronRightIcon size={16} className="text-gray-500" />
              </button>
            </div>
          )}

          {/* Weekly grid */}
          {viewMode === 'weekly' && (
            <div className="grid grid-cols-7 gap-2 mb-5">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayShifts = grid[dateStr] ?? [];
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const dayLabel = DAY_LABELS[(day.getDay() + 6) % 7];
                return (
                  <div key={dateStr} className={`rounded-xl border ${isWeekend ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'} p-2 min-h-32`}>
                    <div className="mb-2 text-center">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>{dayLabel}</p>
                      <p className="text-lg font-bold text-gray-800 leading-none mt-0.5">{format(day, 'd')}</p>
                    </div>
                    <div className="space-y-1">
                      {dayShifts.map(shift => {
                        const emp = users.find(u => u.id === shift.userId);
                        return (
                          <div key={shift.tempId} className="bg-blue-100 border border-blue-200 rounded-lg px-2 py-1 flex items-start justify-between group">
                            <div>
                              <p className="text-xs font-medium text-blue-800 leading-tight">
                                {emp ? `${emp.firstName} ${emp.lastName[0]}.` : `#${shift.userId}`}
                              </p>
                              <p className="text-xs text-blue-600">{shift.startTime}–{shift.endTime}</p>
                            </div>
                            <button onClick={() => removeShift(dateStr, shift.tempId)}
                              className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-red-500 ml-1 mt-0.5">
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {addingInDay === dateStr ? (
                      <AddShiftForm users={users} onAdd={row => addShift(dateStr, row)} onCancel={() => setAddingInDay(null)} />
                    ) : (
                      <button onClick={() => setAddingInDay(dateStr)}
                        className="mt-1 w-full text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg py-1 flex items-center justify-center gap-0.5 transition-colors">
                        <Plus size={12} /> dodaj
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Monthly grid */}
          {viewMode === 'monthly' && (
            <div className="mb-5">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_LABELS.map(l => (
                  <p key={l} className="text-xs font-semibold text-center text-gray-400 uppercase tracking-wide py-1">{l}</p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startPadding }).map((_, i) => (
                  <div key={`pad-${i}`} className="min-h-24 rounded-lg border border-gray-100 bg-gray-50 opacity-30" />
                ))}
                {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  return (
                    <DayCell
                      key={dateStr}
                      day={day}
                      shifts={grid[dateStr] ?? []}
                      users={users}
                      isAdding={addingInDay === dateStr}
                      onAdd={row => addShift(dateStr, row)}
                      onRemove={tempId => removeShift(dateStr, tempId)}
                      onStartAdd={() => setAddingInDay(dateStr)}
                      onCancelAdd={() => setAddingInDay(null)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays size={15} className="text-gray-400" />
              {viewMode === 'weekly'
                ? `${format(currentWeek, 'd MMM', { locale: pl })} – ${format(addDays(currentWeek, 6), 'd MMM yyyy', { locale: pl })}`
                : <span className="capitalize">{format(currentMonth, 'LLLL yyyy', { locale: pl })}</span>
              }
              <span className="text-gray-300">·</span>
              Zmian: <span className="font-semibold text-gray-800">{totalShifts}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Anuluj
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || totalShifts === 0}
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
