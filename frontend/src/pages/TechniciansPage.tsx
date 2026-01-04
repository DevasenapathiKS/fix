import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TechniciansAPI, CatalogAPI, TechnicianSkillsAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { Drawer } from '../components/ui/Drawer';
import { Modal } from '../components/ui/Modal';
import type { TechnicianSummary, TechnicianAttendanceRecord, ServiceCategory, ServiceItem, TechnicianSkill } from '../types';
import { formatDateTime } from '../utils/format';
import { PencilIcon } from '@heroicons/react/24/outline';

const attendanceStatusOptions = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'on_leave', label: 'On leave' }
];

const technicianStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' }
];

type AttendanceFormValues = {
  date: string;
  status: 'present' | 'absent' | 'on_leave';
  checkInTime?: string;
  checkOutTime?: string;
  note?: string;
};

type EditTechnicianFormValues = {
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  experienceYears: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  selectedSkills: string[];
  selectedServiceItems: string[];
  selectedServiceCategories: string[];
};

const todayDateInput = () => new Date().toISOString().split('T')[0];

const buildDateTime = (date: string, time?: string) => {
  if (!date || !time) return undefined;
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalized}`).toISOString();
};

export const TechniciansPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianSummary | null>(null);
  const [pendingSelectedId, setPendingSelectedId] = useState<string | null>(() => searchParams.get('selected'));
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<TechnicianSummary | null>(null);

  const { data: technicians = [], isLoading } = useQuery<TechnicianSummary[]>({
    queryKey: ['technicians'],
    queryFn: TechniciansAPI.list
  });

  // Fetch categories, service items, and skills for the edit form
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['categories'],
    queryFn: CatalogAPI.categories,
    enabled: editModalOpen
  });

  const { data: allServiceItems = [] } = useQuery<ServiceItem[]>({
    queryKey: ['all-service-items'],
    queryFn: () => CatalogAPI.serviceItems(),
    enabled: editModalOpen
  });

  const { data: allSkills = [] } = useQuery<TechnicianSkill[]>({
    queryKey: ['technician-skills'],
    queryFn: TechnicianSkillsAPI.list,
    enabled: editModalOpen
  });

  // Handle URL query param for deep linking from dashboard
  useEffect(() => {
    if (pendingSelectedId && technicians.length > 0 && !isLoading) {
      const technician = technicians.find((t) => t.id === pendingSelectedId);
      if (technician) {
        setSelectedTechnician(technician);
      }
      // Clear the pending selection after attempting to open
      setPendingSelectedId(null);
      // Remove 'selected' from URL without triggering navigation
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('selected');
      setSearchParams(newParams, { replace: true });
    }
  }, [technicians, pendingSelectedId, isLoading, searchParams, setSearchParams]);

  const { data: attendance = [], isFetching: loadingAttendance } = useQuery<TechnicianAttendanceRecord[]>({
    queryKey: ['technician-attendance', selectedTechnician?.id],
    queryFn: () => TechniciansAPI.attendance(selectedTechnician!.id),
    enabled: Boolean(selectedTechnician?.id)
  });

  const attendanceForm = useForm<AttendanceFormValues>({
    defaultValues: { date: todayDateInput(), status: 'present', checkInTime: '09:00', checkOutTime: '18:00' }
  });

  const editForm = useForm<EditTechnicianFormValues>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      status: 'active',
      experienceYears: 0,
      workingHoursStart: '08:00',
      workingHoursEnd: '20:00',
      selectedSkills: [],
      selectedServiceItems: [],
      selectedServiceCategories: []
    }
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

  const updateTechnicianMutation = useMutation({
    mutationFn: (values: EditTechnicianFormValues) => {
      if (!editingTechnician) throw new Error('No technician selected');
      return TechniciansAPI.update(editingTechnician.id, {
        name: values.name,
        email: values.email,
        phone: values.phone,
        status: values.status,
        experienceYears: values.experienceYears,
        workingHours: {
          start: values.workingHoursStart,
          end: values.workingHoursEnd
        },
        skills: values.selectedSkills,
        serviceItems: values.selectedServiceItems,
        serviceCategories: values.selectedServiceCategories
      });
    },
    onSuccess: (updatedTechnician) => {
      toast.success('Technician updated successfully');
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setEditModalOpen(false);
      setEditingTechnician(null);
      // Update the selected technician if it's the same one
      if (selectedTechnician?.id === updatedTechnician.id) {
        setSelectedTechnician(updatedTechnician);
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update technician')
  });

  const selectedAttendance = useMemo(() => attendance.slice(0, 10), [attendance]);

  const openEditModal = (technician: TechnicianSummary, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTechnician(technician);
    editForm.reset({
      name: technician.name || '',
      email: technician.email || '',
      phone: technician.phone || '',
      status: (technician.status as 'active' | 'inactive' | 'suspended') || 'active',
      experienceYears: technician.experienceYears || 0,
      workingHoursStart: technician.workingHours?.start || '08:00',
      workingHoursEnd: technician.workingHours?.end || '20:00',
      selectedSkills: technician.skills?.map((s) => {
        // Handle both string and object formats
        if (typeof s === 'string') return s;
        return (s as any).id || (s as any)._id || '';
      }).filter(Boolean) || [],
      selectedServiceItems: technician.serviceItems?.map((item) => item.id || (item as any)._id || '').filter(Boolean) || [],
      selectedServiceCategories: technician.serviceCategories?.map((cat) => cat.id || (cat as any)._id || '').filter(Boolean) || []
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingTechnician(null);
    editForm.reset();
  };

  const handleSkillToggle = (skillId: string) => {
    const current = editForm.getValues('selectedSkills');
    if (current.includes(skillId)) {
      editForm.setValue('selectedSkills', current.filter((id) => id !== skillId));
    } else {
      editForm.setValue('selectedSkills', [...current, skillId]);
    }
  };

  const handleServiceItemToggle = (itemId: string) => {
    const current = editForm.getValues('selectedServiceItems');
    if (current.includes(itemId)) {
      editForm.setValue('selectedServiceItems', current.filter((id) => id !== itemId));
    } else {
      editForm.setValue('selectedServiceItems', [...current, itemId]);
    }
  };

  const handleCategoryToggle = (catId: string) => {
    const current = editForm.getValues('selectedServiceCategories');
    if (current.includes(catId)) {
      editForm.setValue('selectedServiceCategories', current.filter((id) => id !== catId));
    } else {
      editForm.setValue('selectedServiceCategories', [...current, catId]);
    }
  };

  const watchedSkills = editForm.watch('selectedSkills');
  const watchedServiceItems = editForm.watch('selectedServiceItems');
  const watchedCategories = editForm.watch('selectedServiceCategories');

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
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Loading technicians…
                  </td>
                </tr>
              )}
              {!isLoading && technicians.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
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
                  <td className="px-4 py-3">
                    <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full ${
                      technician.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                      technician.status === 'inactive' ? 'bg-slate-100 text-slate-600' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {technician.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {technician.todayAttendance ? technician.todayAttendance.status : 'Not marked'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(technician, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Edit technician"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
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
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Contact</p>
                  <p className="text-base font-semibold text-slate-900">{selectedTechnician.phone || '—'}</p>
                  <p className="text-sm text-slate-500">{selectedTechnician.email || '—'}</p>
                  {selectedTechnician.workingHours && (
                    <p className="text-xs text-slate-400 mt-2">
                      Hours {selectedTechnician.workingHours.start || '--'} → {selectedTechnician.workingHours.end || '--'}
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => openEditModal(selectedTechnician)}
                  icon={<PencilIcon className="h-4 w-4" />}
                >
                  Edit
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {selectedTechnician.skills?.map((skill) => (
                    <span key={typeof skill === 'string' ? skill : skill} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
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

              <div>
                <p className="text-sm font-semibold text-slate-900">Service categories</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  {selectedTechnician.serviceCategories?.map((cat) => (
                    <span key={cat.id || cat.name} className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                      {cat.name}
                    </span>
                  ))}
                  {!selectedTechnician.serviceCategories?.length && <span className="text-slate-400">No categories mapped.</span>}
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

      {/* Edit Technician Modal */}
      <Modal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        title={`Edit ${editingTechnician?.name || 'Technician'}`}
        size="xl"
      >
        <form
          className="space-y-6"
          onSubmit={editForm.handleSubmit((values) => updateTechnicianMutation.mutate(values))}
        >
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Basic Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name *" {...editForm.register('name', { required: true })} />
              <Input label="Email" type="email" {...editForm.register('email')} />
              <Input label="Phone" {...editForm.register('phone')} />
              <Select label="Status" {...editForm.register('status')}>
                {technicianStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Work Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Work Details</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Experience (years)"
                type="number"
                step="0.5"
                min="0"
                {...editForm.register('experienceYears', { valueAsNumber: true })}
              />
              <Input label="Working hours start" type="time" {...editForm.register('workingHoursStart')} />
              <Input label="Working hours end" type="time" {...editForm.register('workingHoursEnd')} />
            </div>
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {allSkills.map((skill) => (
                <button
                  key={skill._id}
                  type="button"
                  onClick={() => handleSkillToggle(skill._id!)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    watchedSkills.includes(skill._id!)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {skill.name}
                </button>
              ))}
              {allSkills.length === 0 && (
                <p className="text-xs text-slate-400">No skills available. Create skills in settings.</p>
              )}
            </div>
          </div>

          {/* Service Categories */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Service Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => handleCategoryToggle(cat._id!)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    watchedCategories.includes(cat._id!)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-slate-400">No categories available.</p>
              )}
            </div>
          </div>

          {/* Service Items */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Service Items (Sub-categories)</h3>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3">
              <div className="flex flex-wrap gap-2">
                {allServiceItems.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleServiceItemToggle(item._id!)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      watchedServiceItems.includes(item._id!)
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                {allServiceItems.length === 0 && (
                  <p className="text-xs text-slate-400">No service items available.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleCloseEditModal}>
              Cancel
            </Button>
            <Button type="submit" loading={updateTechnicianMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
