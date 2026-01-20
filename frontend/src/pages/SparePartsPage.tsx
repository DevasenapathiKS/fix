import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SparePartsAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import type { SparePart } from '../types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export const SparePartsPage = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState<SparePart | null>(null);

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

  const createMutation = useMutation<SparePart, Error, SparePart>({
    mutationFn: SparePartsAPI.upsert,
    onSuccess: () => {
      toast.success('Spare part saved');
      queryClient.invalidateQueries({ queryKey: ['spareParts'] });
      form.reset();
      setModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to save spare part')
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<SparePart>) => SparePartsAPI.update(editingPart!._id!, payload),
    onSuccess: () => {
      toast.success('Spare part updated successfully');
      queryClient.invalidateQueries({ queryKey: ['spareParts'] });
      form.reset();
      setEditingPart(null);
      setModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update spare part')
  });

  const deleteMutation = useMutation({
    mutationFn: (partId: string) => SparePartsAPI.delete(partId),
    onSuccess: () => {
      toast.success('Spare part deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['spareParts'] });
      setDeleteConfirmOpen(false);
      setPartToDelete(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete spare part')
  });

  const openAddModal = () => {
    setEditingPart(null);
    form.reset({ name: '', sku: '', unitPrice: 0, imageUrl: '' });
    setModalOpen(true);
  };

  const openEditModal = (part: SparePart, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPart(part);
    form.reset({
      name: part.name,
      sku: part.sku,
      unitPrice: part.unitPrice || 0,
      imageUrl: part.imageUrl || ''
    });
    setModalOpen(true);
  };

  const openDeleteConfirm = (part: SparePart, e: React.MouseEvent) => {
    e.stopPropagation();
    setPartToDelete(part);
    setDeleteConfirmOpen(true);
  };

  const handleSubmit = (values: SparePart) => {
    if (editingPart) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = () => {
    if (partToDelete?._id) {
      deleteMutation.mutate(partToDelete._id);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPart(null);
    form.reset();
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Inventory</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Spare Parts Management</h1>
          </div>
          <Button onClick={openAddModal}>Add Spare Part</Button>
        </div>

        <Card title="Spare Parts Catalog">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spareParts.length === 0 ? (
              <p className="col-span-full text-center text-sm text-slate-500">No spare parts added yet</p>
            ) : (
              spareParts.map((part: SparePart) => (
                <div
                  key={part._id}
                  className="group relative flex items-center gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:shadow-sm"
                >
                  {part.imageUrl ? (
                    <img src={part.imageUrl} alt={part.name} className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400">
                      No image
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{part.name}</p>
                    <p className="text-xs text-slate-400">SKU: {part.sku}</p>
                    <p className="mt-1 text-sm font-medium text-slate-600">₹{part.unitPrice?.toFixed(2)}</p>
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(part, e)}
                      className="rounded-lg bg-white p-1.5 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => openDeleteConfirm(part, e)}
                      className="rounded-lg bg-white p-1.5 text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={handleCloseModal} title={editingPart ? 'Edit Spare Part' : 'Add Spare Part'}>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <Input label="Name" {...form.register('name', { required: true })} />
          <Input label="SKU" {...form.register('sku', { required: true })} disabled={!!editingPart} />
          <Input
            type="number"
            step="0.01"
            label="Unit price"
            {...form.register('unitPrice', { valueAsNumber: true, required: true })}
          />
          <Input type="file" accept="image/*" label="Upload image" onChange={handleSparePartUpload} />
          {sparePartImagePreview && (
            <div className="rounded-2xl border border-slate-100 p-3 text-center">
              <p className="text-xs uppercase tracking-widest text-slate-400">Preview</p>
              <img src={sparePartImagePreview} alt="Spare part preview" className="mx-auto mt-2 h-32 w-32 rounded-xl object-cover" />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingPart ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Spare Part">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{partToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <p className="text-xs text-amber-600">
            ⚠️ This spare part may be referenced in existing job cards. Deleting it will not affect historical records but it
            will no longer be available for new orders.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} loading={deleteMutation.isPending}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
