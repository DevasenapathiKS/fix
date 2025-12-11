import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import type { TimeSlotTemplate } from '../types';
import { TimeSlotsAPI } from '../services/adminApi';

const defaultValues: TimeSlotTemplate = {
  label: '',
  dayOfWeek: 0,
  startTime: '09:00',
  endTime: '10:00',
  intervalMinutes: 60,
  capacity: 1,
  isActive: true
};

const dayOptions = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
].map((name, index) => ({ label: name, value: index }));

interface UpsertVariables {
  slotId?: string;
  data: TimeSlotTemplate;
}

export const TimeSlotsPage = () => {
  const queryClient = useQueryClient();
  const [editingSlot, setEditingSlot] = useState<TimeSlotTemplate | null>(null);
  const form = useForm<TimeSlotTemplate>({ defaultValues });

  const { data: slots = [], isLoading } = useQuery({ queryKey: ['time-slots'], queryFn: TimeSlotsAPI.list });

  const upsertMutation = useMutation({
    mutationFn: ({ slotId, data }: UpsertVariables) =>
      slotId ? TimeSlotsAPI.update(slotId, data) : TimeSlotsAPI.create(data),
    onSuccess: () => {
      toast.success(`Time slot ${editingSlot ? 'updated' : 'created'}`);
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      setEditingSlot(null);
      form.reset(defaultValues);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to save time slot')
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => TimeSlotsAPI.remove(slotId),
    onSuccess: () => {
      toast.success('Time slot removed');
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      if (editingSlot && editingSlot._id) {
        setEditingSlot(null);
        form.reset(defaultValues);
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to delete slot')
  });

  useEffect(() => {
    if (editingSlot) {
      form.reset({
        label: `${editingSlot.startTime}-${editingSlot.endTime}`,
        dayOfWeek: editingSlot.dayOfWeek,
        startTime: editingSlot.startTime,
        endTime: editingSlot.endTime,
        intervalMinutes: editingSlot.intervalMinutes ?? 60,
        capacity: editingSlot.capacity ?? 1,
        isActive: editingSlot.isActive ?? true,
        _id: editingSlot._id
      });
    } else {
      form.reset(defaultValues);
    }
  }, [editingSlot, form]);

  const onSubmit = (values: TimeSlotTemplate) => {
    const payload: TimeSlotTemplate = {
      ...values,
      intervalMinutes: values.intervalMinutes || 60,
      capacity: values.capacity || 1
    };
    upsertMutation.mutate({ slotId: editingSlot?._id, data: payload });
  };

  const slotsByDay = useMemo(() => {
    return dayOptions.map((day) => ({
      day,
      entries: slots.filter((slot) => slot.dayOfWeek === day.value)
    }));
  }, [slots]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Scheduling</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Time Slot Templates</h1>
        <p className="text-sm text-slate-500">Control reusable availability windows used by admin scheduling tooling.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <Card title={editingSlot ? 'Edit Time Slot' : 'Create Time Slot'}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Input label="Label" placeholder="Morning Prime" {...form.register('label')} />
            <Select label="Day of week" {...form.register('dayOfWeek', { setValueAs: (value) => Number(value) })}>
              {dayOptions.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="time" label="Start" {...form.register('startTime', { required: true })} />
              <Input type="time" label="End" {...form.register('endTime', { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="Interval (minutes)"
                min={15}
                step={15}
                {...form.register('intervalMinutes', { valueAsNumber: true, min: 15 })}
              />
              <Input
                type="number"
                label="Capacity"
                min={1}
                step={1}
                {...form.register('capacity', { valueAsNumber: true, min: 1 })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                {...form.register('isActive')}
              />
              Active
            </label>
            <div className="flex gap-3">
              <Button type="submit" loading={upsertMutation.isPending} className="flex-1">
                {editingSlot ? 'Update Slot' : 'Create Slot'}
              </Button>
              {editingSlot && (
                <Button type="button" variant="secondary" onClick={() => setEditingSlot(null)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card title="Configured Slots">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading time slots…</p>
          ) : (
            <div className="space-y-5">
              {slotsByDay.map(({ day, entries }) => (
                <div key={day.value}>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{day.label}</p>
                  <div className="mt-2 space-y-3">
                    {entries.length === 0 && (
                      <p className="text-sm text-slate-300">No slots configured.</p>
                    )}
                    {entries.map((slot) => (
                      <div
                        key={slot._id}
                        className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {slot.label || `${slot.startTime} → ${slot.endTime}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {slot.startTime} – {slot.endTime} • every {slot.intervalMinutes}m • capacity {slot.capacity}
                          </p>
                          {!slot.isActive && <p className="text-xs text-rose-500">Inactive</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setEditingSlot(slot)}>
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-rose-600"
                            onClick={() => slot._id && deleteMutation.mutate(slot._id)}
                            loading={deleteMutation.isPending && deleteMutation.variables === slot._id}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
