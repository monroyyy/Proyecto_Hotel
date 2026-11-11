import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal.jsx
 * Componente modal accesible y reutilizable renderizado en document.body (Portal).
 * Detecta la superficie activa (brand vs product) para resolver tokens correctamente.
 */
export default function Modal({
    isOpen = true,
    onClose,
    title,
    titulo,
    subtitle,
    subtitulo,
    icon: Icon,
    children,
    maxWidth = '510px',
    surface
}) {
    const modalTitle = title || titulo;
    const modalSubtitle = subtitle || subtitulo;

    useEffect(() => {
        if (!isOpen) return;

        // Difuminar y bloquear scroll en la aplicación de fondo
        document.body.classList.add('modal-open');

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            setTimeout(() => {
                if (document.querySelectorAll('.modal-overlay').length === 0) {
                    document.body.classList.remove('modal-open');
                }
            }, 0);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && onClose) {
            onClose();
        }
    };

    // Detectar superficie activa si no se especificó explícitamente
    const activeSurface = surface || (
        typeof document !== 'undefined' && document.querySelector('.admin-layout-container')
            ? 'product'
            : 'brand'
    );

    return createPortal(
        <div className="modal-overlay" data-surface={activeSurface} onClick={handleOverlayClick} role="dialog" aria-modal="true">
            <div
                className="modal-card modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth, width: '100%' }}
            >
                {(modalTitle || onClose) && (
                    <div className="modal-header">
                        <div className="modal-title-wrapper">
                            {Icon && (
                                <div className="modal-icon-badge">
                                    <Icon size={22} />
                                </div>
                            )}
                            <div>
                                {modalTitle && <h2 className="modal-title">{modalTitle}</h2>}
                                {modalSubtitle && <p className="modal-subtitle">{modalSubtitle}</p>}
                            </div>
                        </div>
                        {onClose && (
                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={onClose}
                                aria-label="Cerrar modal"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
