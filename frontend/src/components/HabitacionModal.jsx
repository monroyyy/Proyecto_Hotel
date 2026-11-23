import React, { useState, useEffect } from 'react';
import { BedDouble, Building, Layers, Hash, Info, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';

/**
 * HabitacionModal.jsx
 * Modal limpio para Crear o Editar una Habitación (0 emojis, sin estado fantasma,
 * ocultando información monetaria cuando ocultarFinanzas es true).
 */
export default function HabitacionModal({
    isOpen,
    onClose,
    onSave,
    habitacionParaEditar,
    hoteles = [],
    tiposHabitacion = [],
    pisosDisponibles = [1, 2, 3],
    ocultarFinanzas = false
}) {
    const defaultPiso = pisosDisponibles.length > 0 ? pisosDisponibles[0] : 1;

    const [formData, setFormData] = useState({
        numero: '',
        piso: defaultPiso,
        idHotel: '',
        idTipo: '',
        estado: 'Disponible'
    });
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (habitacionParaEditar) {
            const estadoNorm = ['Disponible', 'Ocupada', 'Mantenimiento'].includes(habitacionParaEditar.estado)
                ? habitacionParaEditar.estado
                : 'Disponible';
            setFormData({
                numero: habitacionParaEditar.numero || '',
                piso: habitacionParaEditar.piso || defaultPiso,
                idHotel: habitacionParaEditar.hotel ? habitacionParaEditar.hotel.idHotel : '',
                idTipo: habitacionParaEditar.tipoHabitacion ? habitacionParaEditar.tipoHabitacion.idTipo : '',
                estado: estadoNorm
            });
        } else {
            setFormData({
                numero: '',
                piso: defaultPiso,
                idHotel: hoteles.length > 0 ? hoteles[0].idHotel : '',
                idTipo: tiposHabitacion.length > 0 ? tiposHabitacion[0].idTipo : '',
                estado: 'Disponible'
            });
        }
        setError('');
    }, [habitacionParaEditar, isOpen, hoteles, tiposHabitacion, defaultPiso]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.numero.trim()) {
            setError('Ingresa el número o código de la habitación.');
            return;
        }
        if (!formData.idHotel) {
            setError('Selecciona a qué propiedad pertenece la habitación.');
            return;
        }
        if (!formData.idTipo) {
            setError('Selecciona la categoría de habitación.');
            return;
        }

        const pisoNum = parseInt(formData.piso, 10);
        if (!formData.piso || isNaN(pisoNum) || !pisosDisponibles.includes(pisoNum)) {
            setError('Selecciona un piso válido.');
            return;
        }

        try {
            setGuardando(true);
            await onSave({
                numero: formData.numero.trim(),
                piso: pisoNum,
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Editar Habitación #${habitacionParaEditar.numero}` : 'Nueva Habitación'}
            subtitle={isEdit ? 'Actualiza los datos de la unidad' : 'Alta de habitación en el inventario'}
            icon={BedDouble}
            maxWidth="520px"
        >
            <form onSubmit={handleSubmit} className="modal-form">
                {error && (
                    <div className="alert alert-error">
                        <Info size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">
                            <Hash size={14} /> Número *
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

                    <div className="form-group">
                        <label className="form-label">
                            <Layers size={14} /> Piso *
                        </label>
                        <select
                            className="form-select"
                            value={formData.piso}
                            onChange={(e) => setFormData({ ...formData, piso: e.target.value })}
                            required
                        >
                            <option value="">Seleccionar piso</option>
                            {pisosDisponibles.map((p) => (
                                <option key={p} value={p}>
                                    Piso {p}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <Building size={14} /> Propiedad *
                    </label>
                    <select
                        className="form-select"
                        value={formData.idHotel}
                        onChange={(e) => setFormData({ ...formData, idHotel: e.target.value })}
                        required
                    >
                        <option value="">Seleccionar propiedad</option>
                        {hoteles.map((h) => (
                            <option key={h.idHotel} value={h.idHotel}>
                                {h.nombre} ({h.ciudad})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <BedDouble size={14} /> Categoría *
                    </label>
                    <select
                        className="form-select"
                        value={formData.idTipo}
                        onChange={(e) => setFormData({ ...formData, idTipo: e.target.value })}
                        required
                    >
                        <option value="">Seleccionar categoría</option>
                        {tiposHabitacion.map((t) => {
                            const cap = t.capacidad || 1;
                            const capTxt = `${cap} ${cap === 1 ? 'huésped' : 'huéspedes'}`;
                            const precioTxt = ocultarFinanzas
                                ? ''
                                : ` · $${Number(t.precioBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}/noche`;
                            return (
                                <option key={t.idTipo} value={t.idTipo}>
                                    {t.nombre} ({capTxt}){precioTxt}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <CheckCircle2 size={14} /> {isEdit ? 'Estado actual *' : 'Estado inicial *'}
                    </label>
                    <select
                        className="form-select"
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                        <option value="Disponible">Disponible</option>
                        <option value="Ocupada">Ocupada</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                    </select>
                </div>

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={guardando}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={guardando}>
                        {guardando ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar habitación'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
