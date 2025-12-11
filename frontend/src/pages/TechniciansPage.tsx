import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TechniciansAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { Drawer } from '../components/ui/Drawer';
import type { TechnicianSummary, TechnicianAttendanceRecord } from '../types';
import { formatDateTime } from '../utils/format';

const attendanceStatusOptions = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'on_leave', label: 'On leave' }
];

type AttendanceFormValues = {
  date: string;
  status: 'present' | 'absent' | 'on_leave';
  checkInTime?: string;
  checkOutTime?: string;
  note?: string;
};

const todayDateInput = () => new Date().toISOString().split('T')[0];

const buildDateTime = (date: string, time?: string) => {
  if (!date || !time) return undefined;
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalized}`).toISOString();
};

export const TechniciansPage = () => {
  const queryClient = useQueryClient();
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianSummary | null>(null);

  const { data: technicians = [], isLoading } = useQuery<TechnicianSummary[]>({
    queryKey: ['technicians'],
    queryFn: TechniciansAPI.list
  });

  const { data: attendance = [], isFetching: loadingAttendance } = useQuery<TechnicianAttendanceRecord[]>({
    queryKey: ['technician-attendance', selectedTechnician?.id],
    queryFn: () => TechniciansAPI.attendance(selectedTechnician!.id),
    enabled: Boolean(selectedTechnician?.id)
  });

  const attendanceForm = useForm<AttendanceFormValues>({
    defaultValues: { date: todayDateInput(), status: 'present', checkInTime: '09:00', checkOutTime: '18:00' }
  });

  useEffect(() => {
    attendanceForm.reset({
      date: todayDateInput(),
      status: 'present',
      checkInTime: '09:00',
      checkOutTime: '18:00',
      note: ''
    });
  }, [attendanceForm, selectedTechnician]);

  const attendanceMutation = useMutation({
    mutationFn: (values: AttendanceFormValues) => {
      if (!selectedTechnician) throw new Error('Select a technician');
      return TechniciansAPI.markAttendance(selectedTechnician.id, {
        date: values.date,
        status: values.status,
        checkInAt: buildDateTime(values.date, values.checkInTime),
        checkOutAt: buildDateTime(values.date, values.checkOutTime),
        note: values.note
      });
    },
    onSuccess: () => {
      toast.success('Attendance updated');
      if (selectedTechnician) {
        queryClient.invalidateQueries({ queryKey: ['technician-attendance', selectedTechnician.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to save attendance')
  });

  const selectedAttendance = useMemo(() => attendance.slice(0, 10), [attendance]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Operations</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Technician Roster</h1>
        </div>
      </div>

      <Card title="Technicians">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Skills</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Loading technicians…
                  </td>
                </tr>
              )}
              {!isLoading && technicians.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No technicians found. Create technician users to populate this list.
                  </td>
                </tr>
              )}
              {technicians.map((technician) => (
                <tr
                  key={technician.id}
                  className="cursor-pointer transition hover:bg-slate-50"
                  onClick={() => setSelectedTechnician(technician)}
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">{technician.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {technician.phone || '—'}
                    <span className="block text-xs text-slate-400">{technician.email || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {technician.skills?.length ? technician.skills.slice(0, 3).join(', ') : 'Generalist'}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
                    {technician.status || 'active'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {technician.todayAttendance ? technician.todayAttendance.status : 'Not marked'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer open={Boolean(selectedTechnician)} onClose={() => setSelectedTechnician(null)} title={selectedTechnician?.name || 'Technician'}>
        {selectedTechnician && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Contact</p>
              <p className="text-base font-semibold text-slate-900">{selectedTechnician.phone || '—'}</p>
              <p className="text-sm text-slate-500">{selectedTechnician.email || '—'}</p>
              {selectedTechnician.workingHours && (
                <p className="text-xs text-slate-400 mt-2">
                  Hours {selectedTechnician.workingHours.start || '--'} → {selectedTechnician.workingHours.end || '--'}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {selectedTechnician.skills?.map((skill) => (
                    <span key={skill} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                      {skill}
                    </span>
                  ))}
                  {!selectedTechnician.skills?.length && <span className="text-slate-400">No skills tagged.</span>}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Service items</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {selectedTechnician.serviceItems?.map((item) => (
                    <span key={item.id || item.name} className="rounded-full bg-slate-100 px-3 py-1">
                      {item.name}
                    </span>
                  ))}
                  {!selectedTechnician.serviceItems?.length && <span className="text-slate-400">No service items mapped.</span>}
                </div>
              </div>
            </div>

            <Card title="Mark attendance">
              <form
                className="space-y-4"
                onSubmit={attendanceForm.handleSubmit((values) => attendanceMutation.mutate(values))}
              >
                <Input type="date" label="Date" {...attendanceForm.register('date', { required: true })} />
                <Select label="Status" {...attendanceForm.register('status', { required: true })}>
                  {attendanceStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input type="time" label="Check-in" {...attendanceForm.register('checkInTime')} />
                  <Input type="time" label="Check-out" {...attendanceForm.register('checkOutTime')} />
                </div>
                <TextArea label="Notes" rows={3} {...attendanceForm.register('note')} />
                <Button type="submit" loading={attendanceMutation.isPending}>
                  Save attendance
                </Button>
              </form>
            </Card>

            <Card title="Attendance history">
              {loadingAttendance && <p className="text-sm text-slate-400">Loading attendance…</p>}
              {!loadingAttendance && selectedAttendance.length === 0 && (
                <p className="text-sm text-slate-400">No attendance records found.</p>
              )}
              {!loadingAttendance && selectedAttendance.length > 0 && (
                <ul className="space-y-3">
                  {selectedAttendance.map((entry) => (
                    <li key={entry._id || entry.date} className="rounded-xl border border-slate-100 p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{entry.status}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.checkInAt ? `In: ${formatDateTime(entry.checkInAt)}` : 'No check-in'} ·{' '}
                        {entry.checkOutAt ? `Out: ${formatDateTime(entry.checkOutAt)}` : 'No check-out'}
                      </p>
                      {entry.note && <p className="text-xs text-slate-500">{entry.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};
