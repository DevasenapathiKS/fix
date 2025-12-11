import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminUserAPI, CatalogAPI, TechnicianSkillsAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import type { ServiceItem, TechnicianSkill, UserPayload } from '../types';

const defaultValues: UserPayload = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'technician',
  serviceItems: [],
  skills: []
};

export const CreateUserPage = () => {
  const queryClient = useQueryClient();
  const form = useForm<UserPayload>({ defaultValues });
  const role = useWatch({ control: form.control, name: 'role' });
  const { data: serviceItems = [] } = useQuery<ServiceItem[]>({ queryKey: ['serviceItems'], queryFn: () => CatalogAPI.serviceItems() });
  const { data: technicianSkills = [] } = useQuery<TechnicianSkill[]>({
    queryKey: ['technician-skills'],
    queryFn: TechnicianSkillsAPI.list
  });

  const mutation = useMutation({
    mutationFn: AdminUserAPI.create,
    onSuccess: () => {
      toast.success('User created');
      form.reset(defaultValues);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create user')
  });

  useEffect(() => {
    if (role === 'admin') {
      form.setValue('serviceItems', []);
      form.setValue('skills', []);
    }
  }, [role, form]);

  const skillForm = useForm<{ name: string; description?: string }>({ defaultValues: { name: '', description: '' } });

  const skillMutation = useMutation({
    mutationFn: TechnicianSkillsAPI.create,
    onSuccess: () => {
      toast.success('Skill saved');
      skillForm.reset();
      queryClient.invalidateQueries({ queryKey: ['technician-skills'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to save skill')
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Team</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Create Admin / Technician</h1>
      </div>
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values: UserPayload) => mutation.mutate(values))}>
          <Input label="Full name" {...form.register('name', { required: true })} />
          <Input label="Email" type="email" {...form.register('email', { required: true })} />
          <Input label="Phone" {...form.register('phone', { required: true })} />
          <Input label="Password" type="password" {...form.register('password', { required: true })} />
          <Select label="Role" {...form.register('role', { required: true })}>
            <option value="technician">Technician</option>
            <option value="admin">Admin</option>
          </Select>

          {role === 'technician' && (
            <div className="col-span-2 grid gap-6">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Service capabilities</span>
                <p className="text-xs text-slate-500">Select the catalog services this technician can perform.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {serviceItems.map((item: ServiceItem) => (
                    <label key={item._id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                      <input
                        type="checkbox"
                        value={item._id}
                        {...form.register('serviceItems')}
                        className="accent-slate-900"
                      />
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    </label>
                  ))}
                  {!serviceItems.length && <span className="text-xs text-slate-400">No services available.</span>}
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Technician skills</span>
                <p className="text-xs text-slate-500">Pick applicable trade skills (electrician, plumber, pest control, etc.).</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {technicianSkills.map((skill) => (
                    <label key={skill._id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                      <input
                        type="checkbox"
                        value={skill._id}
                        {...form.register('skills')}
                        className="accent-slate-900"
                      />
                      <span className="text-sm font-medium text-slate-700">{skill.name}</span>
                    </label>
                  ))}
                  {!technicianSkills.length && <span className="text-xs text-slate-400">Add skill types below to start tagging technicians.</span>}
                </div>
              </label>
            </div>
          )}

          <Button type="submit" loading={mutation.isPending} className="col-span-2">
            Create User
          </Button>
        </form>
      </Card>

      <Card title="Manage Technician Skills">
        <p className="text-sm text-slate-500">Add or update the skill taxonomy used when creating technicians.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={skillForm.handleSubmit((values) => skillMutation.mutate(values))}>
          <Input label="Skill name" placeholder="Electrician" {...skillForm.register('name', { required: true })} />
          <Input label="Description" placeholder="Optional" {...skillForm.register('description')} />
          <Button type="submit" loading={skillMutation.isPending} className="md:col-span-2">
            Save Skill
          </Button>
        </form>
      </Card>
    </div>
  );
};
