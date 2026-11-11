import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Trash2, CheckCircle2, HelpCircle } from 'lucide-react';

/**
 * ConfirmDialog.jsx
 * Diálogo de confirmación accesible con variantes semánticas y tokens del sistema.
 */
export default function ConfirmDialog({
    isOpen = false,
    onClose,
    onConfirm,
    title = '¿Confirmar acción?',
    subtitle = 'Esta acción no se puede deshacer',
    message = '¿Está seguro de que desea proceder?',
    confirmText = 'Eliminar',
    cancelText = 'Cancelar',
    type = 'danger', // 'danger' | 'warning' | 'info'
    loading = false
}) {
    if (!isOpen) return null;

    const iconMap = {
        danger: AlertTriangle,
        warning: AlertTriangle,
        info: HelpCircle,
        success: CheckCircle2
    };

    const Icon = iconMap[type] || AlertTriangle;

    const badgeClass = type === 'danger'
        ? 'confirm-badge-danger'
        : type === 'warning'
        ? 'confirm-badge-warning'
        : 'confirm-badge-info';

    const btnClass = type === 'danger'
        ? 'btn btn-danger'
        : 'btn btn-primary';

    return (
        <Modal
            isOpen={isOpen}
            onClose={loading ? undefined : onClose}
            maxWidth="440px"
        >
            <div className="confirm-dialog-content">
                <div className={`confirm-dialog-icon-wrapper ${badgeClass}`}>
                    <Icon size={26} />
                </div>
                
                <h3 className="confirm-dialog-title">{title}</h3>
                {subtitle && <p className="confirm-dialog-subtitle">{subtitle}</p>}
                
                <div className="confirm-dialog-body">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                <div className="confirm-dialog-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={btnClass}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Procesando...' : (
                            <>
                                {type === 'danger' && <Trash2 size={16} />}
                                {confirmText}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
