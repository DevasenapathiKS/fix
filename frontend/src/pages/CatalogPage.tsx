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
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export const CatalogPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ServiceCategory | null>(null);

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
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to save category')
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (payload: ServiceCategory) => CatalogAPI.updateCategory(editingCategory!._id!, payload),
    onSuccess: () => {
      toast.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      categoryForm.reset();
      setEditingCategory(null);
      setCategoryModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update category')
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => CatalogAPI.deleteCategory(categoryId),
    onSuccess: () => {
      toast.success('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete category')
  });

  const toggleCategoryStatusMutation = useMutation({
    mutationFn: ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) =>
      CatalogAPI.updateCategory(categoryId, { isActive }),
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? 'Category activated' : 'Category deactivated');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update status')
  });

  const handleToggleStatus = (category: ServiceCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (category._id) {
      toggleCategoryStatusMutation.mutate({
        categoryId: category._id,
        isActive: !(category.isActive ?? true)
      });
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    categoryForm.reset({ name: '', description: '', imageUrl: '' });
    setCategoryModalOpen(true);
  };

  const openEditModal = (category: ServiceCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || ''
    });
    setCategoryModalOpen(true);
  };

  const openDeleteConfirm = (category: ServiceCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleSubmit = (values: ServiceCategory) => {
    if (editingCategory) {
      updateCategoryMutation.mutate(values);
    } else {
      categoryMutation.mutate(values);
    }
  };

  const handleDelete = () => {
    if (categoryToDelete?._id) {
      deleteCategoryMutation.mutate(categoryToDelete._id);
    }
  };

  const handleCloseModal = () => {
    setCategoryModalOpen(false);
    setEditingCategory(null);
    categoryForm.reset();
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Catalog</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Service Categories & Workflows</h1>
          </div>
          <Button onClick={openAddModal}>Add Category</Button>
        </div>

        <Card title="Categories">
          <p className="text-sm text-slate-500">Click a category to manage its sub categories.</p>
          {loadingCategories && <p className="mt-4 text-sm text-slate-400">Loading categories…</p>}
          {!loadingCategories && categories.length === 0 && (
            <p className="mt-4 text-sm text-slate-400">No categories yet. Create one using the form above.</p>
          )}
          {!loadingCategories && categories.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((category) => {
              const isActive = category.isActive ?? true;
              return (
                <div
                  key={category._id}
                  className={`group relative flex flex-col items-center gap-3 rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                    isActive
                      ? 'border-slate-100 hover:border-slate-200'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                  onClick={() => navigate(`/catalog/${category._id}`)}
                >
                  {/* Status badge */}
                  {!isActive && (
                    <div className="absolute left-2 top-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">
                        Inactive
                      </span>
                    </div>
                  )}

                  {/* Edit/Delete/Toggle buttons */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleToggleStatus(category, e)}
                      className={`p-1.5 rounded-lg bg-white/90 transition-colors shadow-sm ${
                        isActive
                          ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                          : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={isActive ? 'Deactivate category' : 'Activate category'}
                      disabled={toggleCategoryStatusMutation.isPending}
                    >
                      {isActive ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => openEditModal(category, e)}
                      className="p-1.5 rounded-lg bg-white/90 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
                      title="Edit category"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => openDeleteConfirm(category, e)}
                      className="p-1.5 rounded-lg bg-white/90 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors shadow-sm"
                      title="Delete category"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt={category.name} className={`h-24 w-24 rounded-2xl object-cover ${!isActive ? 'grayscale' : ''}`} />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">No image</div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-slate-700">{category.name}</p>
                    {category.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{category.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Category Modal */}
      <Modal
        open={categoryModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form className="space-y-4" onSubmit={categoryForm.handleSubmit(handleSubmit)}>
          <Input label="Name *" placeholder="Electrical" {...categoryForm.register('name', { required: true })} />
          <TextArea label="Description" placeholder="Household electrical repairs" {...categoryForm.register('description')} />
          <Input type="file" accept="image/*" label="Upload image" onChange={handleCategoryImageUpload} />
          {categoryImagePreview && (
            <div className="rounded-2xl border border-slate-100 p-3 text-center">
              <p className="text-xs uppercase tracking-widest text-slate-400">Preview</p>
              <img src={categoryImagePreview} alt="Category preview" className="mx-auto mt-2 h-32 w-32 rounded-xl object-cover" />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={categoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {editingCategory ? 'Update Category' : 'Save Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCategoryToDelete(null);
        }}
        title="Delete Category"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
            Note: Categories with existing service items or orders cannot be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setCategoryToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="!bg-rose-600 hover:!bg-rose-700"
              onClick={handleDelete}
              loading={deleteCategoryMutation.isPending}
            >
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
