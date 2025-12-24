import { ReactNode } from 'react';
import './modal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  variant?: 'primary' | 'danger'; // alias for confirmVariant
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant,
  variant,
  loading = false,
  onConfirm,
  onCancel
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const btnVariant = confirmVariant || variant || 'primary';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>{title}</h3>
        </div>
        <div className="confirm-modal-body">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        <div className="confirm-modal-actions">
          <button 
            className="modal-btn modal-btn-secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            className={`modal-btn modal-btn-${btnVariant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Processing...
              </>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface LoginRequiredModalProps {
  isOpen: boolean;
  onLogin: () => void;
  onCancel?: () => void;
  onClose?: () => void; // alias for onCancel
  message?: string;
}

export const LoginRequiredModal = ({ isOpen, onLogin, onCancel, onClose, message }: LoginRequiredModalProps) => {
  if (!isOpen) return null;

  const handleClose = onCancel || onClose || (() => {});

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="confirm-modal login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-icon">🔐</div>
        <h3>Login Required</h3>
        <p>{message || 'Please login or create an account to continue with this action.'}</p>
        <div className="confirm-modal-actions">
          <button className="modal-btn modal-btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button className="modal-btn modal-btn-primary" onClick={onLogin}>
            Login / Register
          </button>
        </div>
      </div>
    </div>
  );
};

interface ImageViewerModalProps {
  isOpen: boolean;
  images: { url: string; alt?: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const ImageViewerModal = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext
}: ImageViewerModalProps) => {
  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="modal-overlay image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <button className="image-viewer-close" onClick={onClose}>×</button>
        
        {images.length > 1 && (
          <>
            <button 
              className="image-viewer-nav prev" 
              onClick={onPrev}
              disabled={currentIndex === 0}
            >
              ‹
            </button>
            <button 
              className="image-viewer-nav next" 
              onClick={onNext}
              disabled={currentIndex === images.length - 1}
            >
              ›
            </button>
          </>
        )}
        
        <img 
          src={currentImage.url} 
          alt={currentImage.alt || 'Image'} 
          className="image-viewer-img"
        />
        
        {images.length > 1 && (
          <div className="image-viewer-counter">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmModal;
