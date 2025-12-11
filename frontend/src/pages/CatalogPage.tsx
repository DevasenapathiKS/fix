import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CatalogAPI } from '../services/adminApi';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { ServiceCategory } from '../types';

export const CatalogPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const categoryForm = useForm<ServiceCategory>({ defaultValues: { name: '', description: '', imageUrl: '' } });
  const categoryImagePreview = categoryForm.watch('imageUrl');

  const handleCategoryImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        categoryForm.setValue('imageUrl', reader.result, { shouldDirty: true, shouldValidate: true });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const { data: categories = [], isLoading: loadingCategories } = useQuery<ServiceCategory[]>({
    queryKey: ['categories'],
    queryFn: CatalogAPI.categories
  });

  const categoryMutation = useMutation<ServiceCategory, Error, ServiceCategory>({
    mutationFn: (payload) => CatalogAPI.upsertCategory(payload),
    onSuccess: () => {
      toast.success('Category saved');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      categoryForm.reset();
      setCategoryModalOpen(false);
    }
  });

  return (
    <>
      <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Catalog</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Service Categories & Workflows</h1>
        </div>
        <Button onClick={() => setCategoryModalOpen(true)}>Add Category</Button>
      </div>

      <Card title="Categories">
        <p className="text-sm text-slate-500">Click a category to manage its sub categories.</p>
        {loadingCategories && <p className="mt-4 text-sm text-slate-400">Loading categories…</p>}
        {!loadingCategories && categories.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">No categories yet. Create one using the form above.</p>
        )}
        {!loadingCategories && categories.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <button
                key={category._id}
                type="button"
                className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-slate-200 hover:shadow-lg"
                onClick={() => navigate(`/catalog/${category._id}`)}
              >
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt={category.name} className="h-24 w-24 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">No image</div>
                )}
                <p className="font-semibold text-slate-900 group-hover:text-slate-700">{category.name}</p>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>

      <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Add Category">
        <form className="space-y-4" onSubmit={categoryForm.handleSubmit((values) => categoryMutation.mutate(values))}>
          <Input label="Name" placeholder="Electrical" {...categoryForm.register('name', { required: true })} />
          <TextArea label="Description" placeholder="Household electrical repairs" {...categoryForm.register('description')} />
          {/* <Input label="Image URL" placeholder="https://…" {...categoryForm.register('imageUrl')} /> */}
          <Input type="file" accept="image/*" label="Upload image" onChange={handleCategoryImageUpload} />
          {categoryImagePreview && (
            <div className="rounded-2xl border border-slate-100 p-3 text-center">
              <p className="text-xs uppercase tracking-widest text-slate-400">Preview</p>
              <img src={categoryImagePreview} alt="Category preview" className="mx-auto mt-2 h-32 w-32 rounded-xl object-cover" />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={categoryMutation.isPending}>
              Save Category
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
