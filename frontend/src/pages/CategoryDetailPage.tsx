import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
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
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ServiceItem | null>(null);
  const [editCategoryModalOpen, setEditCategoryModalOpen] = useState(false);

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

  const categoryForm = useForm<ServiceCategory>({
    defaultValues: { name: '', description: '', imageUrl: '' }
  });
  const categoryImagePreview = categoryForm.watch('imageUrl');

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

  useEffect(() => {
    if (resolvedCategoryId) {
      serviceItemForm.reset({ category: resolvedCategoryId, name: '', description: '', basePrice: 0, imageUrl: '' });
    }
  }, [resolvedCategoryId, serviceItemForm]);

  // Create service item mutation
  const createItemMutation = useMutation<ServiceItem, Error, ServiceItemFormValues>({
    mutationFn: (payload) => CatalogAPI.upsertServiceItem(payload),
    onSuccess: () => {
      toast.success('Sub category created');
      queryClient.invalidateQueries({ queryKey: ['serviceItems', resolvedCategoryId] });
      serviceItemForm.reset({ category: resolvedCategoryId, name: '', description: '', basePrice: 0, imageUrl: '' });
      setSubCategoryModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create sub category')
  });

  // Update service item mutation
  const updateItemMutation = useMutation({
    mutationFn: (payload: ServiceItemFormValues) =>
      CatalogAPI.updateServiceItem(editingItem!._id!, payload),
    onSuccess: () => {
      toast.success('Sub category updated');
      queryClient.invalidateQueries({ queryKey: ['serviceItems', resolvedCategoryId] });
      serviceItemForm.reset({ category: resolvedCategoryId, name: '', description: '', basePrice: 0, imageUrl: '' });
      setEditingItem(null);
      setSubCategoryModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update sub category')
  });

  // Delete service item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => CatalogAPI.deleteServiceItem(itemId),
    onSuccess: () => {
      toast.success('Sub category deleted');
      queryClient.invalidateQueries({ queryKey: ['serviceItems', resolvedCategoryId] });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete sub category')
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: (payload: ServiceCategory) => CatalogAPI.updateCategory(resolvedCategoryId, payload),
    onSuccess: () => {
      toast.success('Category updated');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      categoryForm.reset();
      setEditCategoryModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update category')
  });

  // Toggle service item status mutation
  const toggleServiceItemStatusMutation = useMutation({
    mutationFn: ({ itemId, isActive }: { itemId: string; isActive: boolean }) =>
      CatalogAPI.updateServiceItem(itemId, { isActive }),
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? 'Sub category activated' : 'Sub category deactivated');
      queryClient.invalidateQueries({ queryKey: ['serviceItems', resolvedCategoryId] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update status')
  });

  // Toggle category status mutation
  const toggleCategoryStatusMutation = useMutation({
    mutationFn: ({ isActive }: { isActive: boolean }) =>
      CatalogAPI.updateCategory(resolvedCategoryId, { isActive }),
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? 'Category activated' : 'Category deactivated');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update status')
  });

  const handleToggleItemStatus = (item: ServiceItem) => {
    if (item._id) {
      toggleServiceItemStatusMutation.mutate({
        itemId: item._id,
        isActive: !(item.isActive ?? true)
      });
    }
  };

  const handleToggleCategoryStatus = () => {
    if (category) {
      toggleCategoryStatusMutation.mutate({
        isActive: !(category.isActive ?? true)
      });
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    serviceItemForm.reset({ category: resolvedCategoryId, name: '', description: '', basePrice: 0, imageUrl: '' });
    setSubCategoryModalOpen(true);
  };

  const openEditModal = (item: ServiceItem) => {
    setEditingItem(item);
    serviceItemForm.reset({
      category: resolvedCategoryId,
      name: item.name,
      description: item.description || '',
      basePrice: item.basePrice || 0,
      imageUrl: item.imageUrl || ''
    });
    setSubCategoryModalOpen(true);
  };

  const openDeleteConfirm = (item: ServiceItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const openEditCategoryModal = () => {
    if (category) {
      categoryForm.reset({
        name: category.name,
        description: category.description || '',
        imageUrl: category.imageUrl || ''
      });
      setEditCategoryModalOpen(true);
    }
  };

  const handleSubmitItem = (values: ServiceItemFormValues) => {
    if (editingItem) {
      updateItemMutation.mutate(values);
    } else {
      createItemMutation.mutate({ ...values, category: resolvedCategoryId });
    }
  };

  const handleDeleteItem = () => {
    if (itemToDelete?._id) {
      deleteItemMutation.mutate(itemToDelete._id);
    }
  };

  const handleCloseItemModal = () => {
    setSubCategoryModalOpen(false);
    setEditingItem(null);
    serviceItemForm.reset({ category: resolvedCategoryId, name: '', description: '', basePrice: 0, imageUrl: '' });
  };

  const handleSubmitCategory = (values: ServiceCategory) => {
    updateCategoryMutation.mutate(values);
  };

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
          <div className="flex items-center gap-3">
            {category?.imageUrl && (
              <img src={category.imageUrl} alt={category.name} className={`h-12 w-12 rounded-xl object-cover ${!(category.isActive ?? true) ? 'grayscale opacity-60' : ''}`} />
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Catalog</p>
                {category && !(category.isActive ?? true) && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-medium">
                    Inactive
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {loadingCategories ? 'Loading…' : category?.name || 'Category not found'}
              </h1>
              {category?.description && <p className="text-sm text-slate-500">{category.description}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {category && (
            <>
              <Button
                variant="secondary"
                onClick={handleToggleCategoryStatus}
                loading={toggleCategoryStatusMutation.isPending}
                icon={(category.isActive ?? true) ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                className={(category.isActive ?? true) ? '' : '!bg-emerald-50 !text-emerald-700 !border-emerald-200'}
              >
                {(category.isActive ?? true) ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="secondary" onClick={openEditCategoryModal} icon={<PencilIcon className="h-4 w-4" />}>
                Edit Category
              </Button>
            </>
          )}
          <Button onClick={openAddModal} disabled={!category}>
            Add Sub Category
          </Button>
        </div>
      </div>

      {!loadingCategories && !category && (
        <Card>
          <p className="text-sm text-rose-500">We couldn't find that category. It may have been deleted.</p>
        </Card>
      )}

      {category && (
        <Card title={`Sub Categories (${serviceItems.length})`}>
          {loadingServiceItems && <p className="text-sm text-slate-400">Loading sub categories…</p>}
          {!loadingServiceItems && serviceItems.length === 0 && (
            <p className="text-sm text-slate-400">No sub categories yet. Create one using the button above.</p>
          )}
          {!loadingServiceItems && serviceItems.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {serviceItems.map((item) => {
                const isActive = item.isActive ?? true;
                return (
                  <div
                    key={item._id}
                    className={`group relative flex flex-col items-center gap-3 rounded-2xl border bg-white p-6 text-center shadow-sm ${
                      isActive
                        ? 'border-slate-100'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
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
                        onClick={() => handleToggleItemStatus(item)}
                        className={`p-1.5 rounded-lg bg-white/90 transition-colors shadow-sm ${
                          isActive
                            ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Deactivate sub category' : 'Activate sub category'}
                        disabled={toggleServiceItemStatusMutation.isPending}
                      >
                        {isActive ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg bg-white/90 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
                        title="Edit sub category"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(item)}
                        className="p-1.5 rounded-lg bg-white/90 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors shadow-sm"
                        title="Delete sub category"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className={`h-20 w-20 rounded-2xl object-cover ${!isActive ? 'grayscale' : ''}`} />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 text-xs text-slate-400">No image</div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">{item.description || '—'}</p>
                      {typeof item.basePrice === 'number' && (
                        <p className="mt-1 text-sm font-medium text-slate-700">Base ₹{item.basePrice.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Sub Category Modal */}
      <Modal
        open={subCategoryModalOpen}
        onClose={handleCloseItemModal}
        title={editingItem ? 'Edit Sub Category' : 'Add Sub Category'}
      >
        <form
          className="space-y-4"
          onSubmit={serviceItemForm.handleSubmit(handleSubmitItem)}
        >
          <Input
            label="Sub category name *"
            placeholder="Fan installation"
            {...serviceItemForm.register('name', { required: true })}
          />
          <TextArea label="Description" {...serviceItemForm.register('description')} />
          <Input type="file" accept="image/*" label="Upload image" onChange={handleServiceItemUpload} />
          {serviceItemImagePreview && (
            <div className="rounded-2xl border border-slate-100 p-3 text-center">
              <p className="text-xs uppercase tracking-widest text-slate-400">Preview</p>
              <img src={serviceItemImagePreview} alt="Sub category preview" className="mx-auto mt-2 h-32 w-32 rounded-xl object-cover" />
            </div>
          )}
          <Input
            label="Base price (₹)"
            type="number"
            step="0.01"
            {...serviceItemForm.register('basePrice', { valueAsNumber: true })}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={handleCloseItemModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createItemMutation.isPending || updateItemMutation.isPending}
            >
              {editingItem ? 'Update Sub Category' : 'Save Sub Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        title="Delete Sub Category"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
            Note: Sub categories with existing orders cannot be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setItemToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="!bg-rose-600 hover:!bg-rose-700"
              onClick={handleDeleteItem}
              loading={deleteItemMutation.isPending}
            >
              Delete Sub Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        open={editCategoryModalOpen}
        onClose={() => {
          setEditCategoryModalOpen(false);
          categoryForm.reset();
        }}
        title="Edit Category"
      >
        <form className="space-y-4" onSubmit={categoryForm.handleSubmit(handleSubmitCategory)}>
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditCategoryModalOpen(false);
                categoryForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={updateCategoryMutation.isPending}>
              Update Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
