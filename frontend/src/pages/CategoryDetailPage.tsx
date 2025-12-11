import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { CatalogAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { ServiceCategory, ServiceItem } from '../types';

type ServiceItemFormValues = Pick<ServiceItem, 'category' | 'name' | 'description' | 'basePrice' | 'imageUrl'>;

export const CategoryDetailPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resolvedCategoryId = categoryId ?? '';
  const [subCategoryModalOpen, setSubCategoryModalOpen] = useState(false);

  const { data: categories = [], isLoading: loadingCategories } = useQuery<ServiceCategory[]>({
    queryKey: ['categories'],
    queryFn: CatalogAPI.categories
  });

  const category = categories.find((cat) => cat._id === categoryId);

  const { data: serviceItems = [], isLoading: loadingServiceItems } = useQuery<ServiceItem[]>({
    queryKey: ['serviceItems', resolvedCategoryId],
    queryFn: () => CatalogAPI.serviceItems(resolvedCategoryId),
    enabled: Boolean(resolvedCategoryId)
  });

  const serviceItemForm = useForm<ServiceItemFormValues>({
    defaultValues: { category: resolvedCategoryId, name: '', description: '', basePrice: 0, imageUrl: '' }
  });
  const serviceItemImagePreview = serviceItemForm.watch('imageUrl');

  const handleServiceItemUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        serviceItemForm.setValue('imageUrl', reader.result, { shouldDirty: true, shouldValidate: true });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  useEffect(() => {
    if (resolvedCategoryId) {
      serviceItemForm.reset({ category: resolvedCategoryId, name: '', description: '', basePrice: 0, imageUrl: '' });
    }
  }, [resolvedCategoryId, serviceItemForm]);

  const itemMutation = useMutation<ServiceItem, Error, ServiceItemFormValues>({
    mutationFn: (payload) => CatalogAPI.upsertServiceItem(payload),
    onSuccess: () => {
      toast.success('Sub category saved');
      queryClient.invalidateQueries({ queryKey: ['serviceItems', resolvedCategoryId] });
      serviceItemForm.reset({ category: resolvedCategoryId, name: '', description: '', basePrice: 0, imageUrl: '' });
      setSubCategoryModalOpen(false);
    }
  });

  if (!resolvedCategoryId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/catalog')}>
          Back to catalog
        </Button>
        <p className="text-sm text-rose-500">No category selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" icon={<ArrowLeftIcon className="h-4 w-4" />} onClick={() => navigate('/catalog')}>
            Back to catalog
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Catalog</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {loadingCategories ? 'Loading…' : category?.name || 'Category not found'}
            </h1>
            {category?.description && <p className="text-sm text-slate-500">{category.description}</p>}
          </div>
        </div>
        <Button onClick={() => setSubCategoryModalOpen(true)} disabled={!category}>
          Add Sub Category
        </Button>
      </div>

      {!loadingCategories && !category && (
        <Card>
          <p className="text-sm text-rose-500">We couldn't find that category. It may have been deleted.</p>
        </Card>
      )}

      {category && (
        <Card title="Sub Categories">
          {loadingServiceItems && <p className="text-sm text-slate-400">Loading sub categories…</p>}
          {!loadingServiceItems && serviceItems.length === 0 && (
            <p className="text-sm text-slate-400">No sub categories yet. Create one using the button above.</p>
          )}
          {!loadingServiceItems && serviceItems.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {serviceItems.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">No image</div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.description || '—'}</p>
                    {typeof item.basePrice === 'number' && (
                      <p className="text-sm text-slate-600">Base ₹{item.basePrice.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      <Modal open={subCategoryModalOpen} onClose={() => setSubCategoryModalOpen(false)} title="Add Sub Category">
        <form
          className="space-y-4"
          onSubmit={serviceItemForm.handleSubmit((values) => itemMutation.mutate({ ...values, category: resolvedCategoryId }))}
        >
          <Input label="Sub category name" placeholder="Fan installation" {...serviceItemForm.register('name', { required: true })} />
          <TextArea label="Description" {...serviceItemForm.register('description')} />
          {/* <Input label="Image URL" placeholder="https://…" {...serviceItemForm.register('imageUrl')} /> */}
          <Input type="file" accept="image/*" label="Upload image" onChange={handleServiceItemUpload} />
          {serviceItemImagePreview && (
            <div className="rounded-2xl border border-slate-100 p-3 text-center">
              <p className="text-xs uppercase tracking-widest text-slate-400">Preview</p>
              <img src={serviceItemImagePreview} alt="Sub category preview" className="mx-auto mt-2 h-32 w-32 rounded-xl object-cover" />
            </div>
          )}
          <Input label="Base price" type="number" step="0.01" {...serviceItemForm.register('basePrice', { valueAsNumber: true })} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setSubCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={itemMutation.isPending}>
              Save Sub Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
