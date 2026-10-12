import React, { useState, useEffect } from 'react';
import { X, BedDouble, Building, Layers, Hash, Info, CheckCircle2 } from 'lucide-react';

/**
 * HabitacionModal.jsx
 * Modal para Crear o Editar una Habitación.
 * Consume dinámicamente las listas de Hoteles y Tipos de Habitación desde la BD.
 */
export default function HabitacionModal({
    isOpen,
    onClose,
    onSave,
    habitacionParaEditar,
    hoteles = [],
    tiposHabitacion = []
}) {
    const [formData, setFormData] = useState({
        numero: '',
        piso: 1,
        idHotel: '',
        idTipo: '',
        estado: 'Disponible'
    });
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    // Cuando se abre para editar, precargar datos; si es nueva, limpiar formulario
    useEffect(() => {
        if (habitacionParaEditar) {
            setFormData({
                numero: habitacionParaEditar.numero || '',
                piso: habitacionParaEditar.piso || 1,
                idHotel: habitacionParaEditar.hotel ? habitacionParaEditar.hotel.idHotel : '',
                idTipo: habitacionParaEditar.tipoHabitacion ? habitacionParaEditar.tipoHabitacion.idTipo : '',
                estado: habitacionParaEditar.estado || 'Disponible'
            });
        } else {
            setFormData({
                numero: '',
                piso: 1,
                idHotel: hoteles.length > 0 ? hoteles[0].idHotel : '',
                idTipo: tiposHabitacion.length > 0 ? tiposHabitacion[0].idTipo : '',
                estado: 'Disponible'
            });
        }
        setError('');
    }, [habitacionParaEditar, isOpen, hoteles, tiposHabitacion]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.numero.trim()) {
            setError('Por favor ingresa el número o código de la habitación.');
            return;
        }
        if (!formData.idHotel) {
            setError('Debes seleccionar a qué hotel pertenece la habitación.');
            return;
        }
        if (!formData.idTipo) {
            setError('Debes seleccionar el tipo de habitación.');
            return;
        }
        if (formData.piso < 1) {
            setError('El número de piso debe ser igual o mayor a 1.');
            return;
        }

        try {
            setGuardando(true);
            await onSave({
                numero: formData.numero.trim(),
                piso: parseInt(formData.piso, 10),
                idHotel: parseInt(formData.idHotel, 10),
                idTipo: parseInt(formData.idTipo, 10),
                estado: formData.estado
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Error al guardar la habitación');
        } finally {
            setGuardando(false);
        }
    };

    const isEdit = Boolean(habitacionParaEditar);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header del Modal */}
                <div className="modal-header">
                    <div className="modal-title-wrapper">
                        <div className="modal-icon-badge">
                            <BedDouble size={22} />
                        </div>
                        <div>
                            <h2 className="modal-title">
                                {isEdit ? `Editar Habitación #${habitacionParaEditar.numero}` : 'Registrar Nueva Habitación'}
                            </h2>
                            <p className="modal-subtitle">
                                {isEdit
                                    ? 'Modifica los datos y relaciones de la habitación seleccionada'
                                    : 'Completa la información para dar de alta una nueva habitación'}
                            </p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
                        <X size={20} />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="modal-form">
                    {error && (
                        <div className="alert alert-error">
                            <Info size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-grid">
                        {/* 1. Número de Habitación */}
                        <div className="form-group">
                            <label className="form-label">
                                <Hash size={16} /> Número de Habitación *
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej. 101, 204, Suite-A"
                                value={formData.numero}
                                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                required
                            />
                        </div>

                        {/* 2. Piso */}
                        <div className="form-group">
                            <label className="form-label">
                                <Layers size={16} /> Piso / Nivel *
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                className="form-input"
                                value={formData.piso}
                                onChange={(e) => setFormData({ ...formData, piso: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* 3. Selección de Hotel (Llave Foránea) */}
                    <div className="form-group">
                        <label className="form-label">
                            <Building size={16} /> Hotel de la Cadena *
                        </label>
                        <select
                            className="form-select"
                            value={formData.idHotel}
                            onChange={(e) => setFormData({ ...formData, idHotel: e.target.value })}
                            required
                        >
                            <option value="">-- Selecciona el Hotel --</option>
                            {hoteles.map((h) => (
                                <option key={h.idHotel} value={h.idHotel}>
                                    {h.nombre} ({h.ciudad}) {h.activo ? '• Activo' : '• Inactivo'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Selección de Tipo de Habitación (Llave Foránea) */}
                    <div className="form-group">
                        <label className="form-label">
                            <BedDouble size={16} /> Tipo de Habitación & Categoría *
                        </label>
                        <select
                            className="form-select"
                            value={formData.idTipo}
                            onChange={(e) => setFormData({ ...formData, idTipo: e.target.value })}
                            required
                        >
                            <option value="">-- Selecciona el Tipo de Habitación --</option>
                            {tiposHabitacion.map((t) => (
                                <option key={t.idTipo} value={t.idTipo}>
                                    {t.nombre} — Capacidad: {t.capacidad} pers. — ${Number(t.precioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })}/noche
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 5. Estado de la Habitación */}
                    <div className="form-group">
                        <label className="form-label">
                            <CheckCircle2 size={16} /> Estado Inicial *
                        </label>
                        <select
                            className="form-select"
                            value={formData.estado}
                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        >
                            <option value="Disponible">🟢 Disponible (Lista para rentar)</option>
                            <option value="Ocupada">🔵 Ocupada (Huésped hospedado)</option>
                            <option value="Mantenimiento">🟠 Mantenimiento (Limpieza o reparación)</option>
                        </select>
                    </div>

                    {/* Botones de Acción */}
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={guardando}>
                            {guardando ? 'Guardando...' : isEdit ? 'Actualizar Cambios' : 'Registrar Habitación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
