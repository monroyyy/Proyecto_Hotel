import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal.jsx
 * Componente modal accesible y reutilizable renderizado en document.body (Portal).
 * Aplica difuminado gaussiano completo sobre la aplicación de fondo (body.modal-open).
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
    maxWidth = '510px'
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
            document.body.classList.remove('modal-open');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
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
                {children}
            </div>
        </div>,
        document.body
    );
}
