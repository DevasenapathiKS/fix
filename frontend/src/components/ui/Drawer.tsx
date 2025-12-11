import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClassName?: string;
}

export const Drawer = ({ open, onClose, title, children, widthClassName = 'w-screen max-w-lg' }: DrawerProps) => (
  <Transition show={open} as={Fragment} appear>
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

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-8">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className={`pointer-events-auto ${widthClassName} bg-white shadow-2xl`}> 
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                      <Dialog.Title className="text-base font-semibold text-slate-900">{title}</Dialog.Title>
                    </div>
                    <button
                      type="button"
                      className="rounded-full p-1 text-slate-400 transition hover:text-slate-600"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close panel</span>
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </div>
    </Dialog>
  </Transition>
);
