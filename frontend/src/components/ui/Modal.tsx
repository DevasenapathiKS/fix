import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const sizeClassMap: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export const Modal = ({ open, onClose, title, children, size = 'md', showCloseButton = false }: ModalProps) => (
  <Transition appear show={open} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-slate-900/50" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className={`w-full ${sizeClassMap[size]} transform rounded-2xl bg-white p-6 text-left align-middle shadow-xl`}>
              <div className="flex items-start justify-between gap-4">
                <Dialog.Title as="h3" className="text-lg font-semibold text-slate-900">
                  {title}
                </Dialog.Title>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-4">{children}</div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);
