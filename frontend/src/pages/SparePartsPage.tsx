import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SparePartsAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import type { SparePart } from '../types';

export const SparePartsPage = () => {
  const queryClient = useQueryClient();
  const form = useForm<SparePart>({ defaultValues: { name: '', sku: '', unitPrice: 0, imageUrl: '' } });
  const sparePartImagePreview = form.watch('imageUrl');
  const { data: spareParts = [] } = useQuery<SparePart[]>({ queryKey: ['spareParts'], queryFn: SparePartsAPI.list });

  const handleSparePartUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        form.setValue('imageUrl', reader.result, { shouldDirty: true, shouldValidate: true });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const mutation = useMutation<SparePart, Error, SparePart>({
    mutationFn: SparePartsAPI.upsert,
    onSuccess: () => {
      toast.success('Spare part saved');
      queryClient.invalidateQueries({ queryKey: ['spareParts'] });
      form.reset();
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Inventory</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Spare Parts Management</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Add Spare Part">
          <form className="space-y-4" onSubmit={form.handleSubmit((values: SparePart) => mutation.mutate(values))}>
            <Input label="Name" {...form.register('name', { required: true })} />
            <Input label="SKU" {...form.register('sku', { required: true })} />
            <Input type="number" step="0.01" label="Unit price" {...form.register('unitPrice', { valueAsNumber: true })} />
            {/* <Input label="Image URL" placeholder="https://…" {...form.register('imageUrl')} /> */}
            <Input type="file" accept="image/*" label="Upload image" onChange={handleSparePartUpload} />
            {sparePartImagePreview && (
              <div className="rounded-2xl border border-slate-100 p-3 text-center">
                <p className="text-xs uppercase tracking-widest text-slate-400">Preview</p>
                <img src={sparePartImagePreview} alt="Spare part preview" className="mx-auto mt-2 h-32 w-32 rounded-xl object-cover" />
              </div>
            )}
            <Button type="submit" loading={mutation.isPending}>
              Save
            </Button>
          </form>
        </Card>

        <Card title="Catalog">
          <div className="space-y-4">
            {spareParts.map((part: SparePart) => (
              <div key={part._id} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
                {part.imageUrl ? (
                  <img src={part.imageUrl} alt={part.name} className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400">No image</div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{part.name}</p>
                  <p className="text-xs text-slate-400">SKU: {part.sku}</p>
                  <p className="mt-1 text-sm text-slate-600">₹{part.unitPrice?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
