import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    MessageSquare, X, Send, Bot, User, Sparkles, Loader2, Square, RotateCcw,
    Maximize2, Minimize2, Plus, Trash2, MessageCircle, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { marked } from 'marked';
import ConfirmDialog from './ConfirmDialog';

// Configurar marked para saltos de línea automáticos y tablas
marked.setOptions({
    breaks: true,
    gfm: true
});

const DEFAULT_WELCOME_MSG = {
    sender: 'bot',
    text: '¡Hola! Soy el Recepcionista Virtual. Con gusto le asisto con información sobre nuestros hoteles, disponibilidad de habitaciones, servicios y tarifas.'
};

const STORAGE_SESSIONS_KEY = 'hotel_chat_sessions_v2';
const STORAGE_ACTIVE_ID_KEY = 'hotel_chat_active_session_id_v2';

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Lista de conversaciones guardadas (solo las que tienen mensajes reales)
    const [conversations, setConversations] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Error al cargar conversaciones guardadas:', e);
        }
        return [];
    });

    // ID de la conversación activa en memoria. Si no hay conversaciones guardadas, genera un ID nuevo pendiente
    const [activeId, setActiveId] = useState(() => {
        try {
            const savedId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
            if (savedId) return savedId;
        } catch (e) {}
        return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `rec-${Date.now()}`;
    });

    // Mensajes para un chat nuevo antes de ser guardado
    const [pendingMessages, setPendingMessages] = useState([]);

    // Buscar si la conversación activa ya existe en la lista guardada
    const currentConv = useMemo(() => {
        return conversations.find(c => c.id === activeId) || null;
    }, [conversations, activeId]);

    // Mensajes a mostrar: los de la conversación guardada o los pendientes
    const messages = currentConv ? (currentConv.messages || []) : pendingMessages;

    // Sincronizar conversaciones y sesión activa en localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(conversations));
        } catch (e) {
            console.error('Error al guardar conversaciones:', e);
        }
    }, [conversations]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeId);
        } catch (e) {}
    }, [activeId]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState('gemini');
    const messagesEndRef = useRef(null);
    const abortControllerRef = useRef(null);
    const typingIntervalRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen, isFullscreen]);

    // Actualizador de mensajes para la conversación activa (guardada o pendiente)
    const updateActiveMessages = (updater) => {
        setConversations(prev => {
            const exists = prev.some(c => c.id === activeId);
            if (exists) {
                return prev.map(conv => {
                    if (conv.id === activeId) {
                        const newMessages = typeof updater === 'function' ? updater(conv.messages || []) : updater;
                        return {
                            ...conv,
                            messages: newMessages,
                            updatedAt: Date.now()
                        };
                    }
                    return conv;
                });
            } else {
                // Actualizar estado pendiente
                setPendingMessages(prevPend => typeof updater === 'function' ? updater(prevPend) : updater);
                return prev;
            }
        });
    };

    const typeMessage = (fullText, index) => {
        let i = 0;
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        
        typingIntervalRef.current = setInterval(() => {
            i += 2; // velocidad ágil
            updateActiveMessages((prev) => {
                const updated = [...prev];
                updated[index] = { sender: 'bot', text: fullText.slice(0, Math.min(i, fullText.length)) };
                return updated;
            });
            if (i >= fullText.length) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
            }
        }, 12);
    };

    // Parser para extraer botones de acción interactivos generados por la IA: [BOTON: Etiqueta | Acción/Consulta]
    const parseBotContent = (rawText) => {
        if (!rawText) return { cleanText: '', buttons: [] };
        
        // Soporta [BOTON: ... | ...] y variaciones con negritas [**BOTON: ...**]
        const buttonRegex = /\[(?:\*{1,2})?BOTON:\s*([^|\]]+)\|\s*([^\]*]+)(?:\*{1,2})?\]/gi;
        const buttons = [];
        let match;
        
        while ((match = buttonRegex.exec(rawText)) !== null) {
            buttons.push({
                label: match[1].replace(/\*/g, '').trim(),
                prompt: match[2].replace(/\*/g, '').trim()
            });
        }
        
        let cleanText = rawText.replace(buttonRegex, '').trim();

        // REGLA FUNDAMENTAL DE UX: Si el mensaje ya contiene una tabla de detalle, NO mostrar botones
        const hasTable = cleanText.includes('| ---') || cleanText.includes('|:---') || cleanText.includes('| :---') || cleanText.includes('|---');
        if (hasTable) {
            cleanText = cleanText
                .replace(/(?:\*{1,2})?(?:opciones?|botones?|seleccione|elija|acciones?)[^:\n]*:?(?:\*{1,2})?/gi, '')
                .replace(/(?:¿?de\s*qué\s*propiedad\s*desea\s*consultar[^\n]*|por\s*favor,?\s*seleccione[^\n]*|puede\s*(?:seleccionar|elegir)[^\n]*)/gi, '')
                .replace(/^\s*[-*•]\s*$/gm, '')
                .replace(/(\n\s*por\s*favor,?\s*$|\n\s*puede\s*seleccionar:?\s*$)/gi, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            return { cleanText, buttons: [] };
        }

        return { cleanText, buttons };
    };

    const handleButtonClick = (actionPrompt) => {
        if (isLoading) return;
        handleSend(null, actionPrompt);
    };

    const handleCancelQuery = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
        }
        setIsLoading(false);
        updateActiveMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].sender === 'bot' && !updated[lastIdx].text) {
                updated[lastIdx] = {
                    sender: 'bot',
                    text: '⏹️ *Consulta detenida por el recepcionista.*'
                };
            }
            return updated;
        });
    };

    // Crear una nueva conversación (estilo Gemini / ChatGPT: inicia limpia sin guardarse hasta el primer envío)
    const handleNewConversation = () => {
        if (isLoading) handleCancelQuery();
        const freshId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `rec-${Date.now()}`;
        setActiveId(freshId);
        setPendingMessages([]);
        setInput('');
    };

    // Cambiar de conversación
    const handleSelectConversation = (id) => {
        if (id === activeId) return;
        if (isLoading) handleCancelQuery();
        setActiveId(id);
        setInput('');
    };

    // Estado para confirmación de eliminación con el diseño del sistema
    const [convToDelete, setConvToDelete] = useState(null);

    // Solicitar confirmación antes de eliminar una conversación del historial
    const handleRequestDeleteConversation = (e, conv) => {
        e.stopPropagation();
        setConvToDelete(conv);
    };

    // Confirmación ejecutada por el usuario
    const handleConfirmDelete = () => {
        if (!convToDelete) return;
        const id = convToDelete.id;
        if (isLoading && id === activeId) handleCancelQuery();

        const remaining = conversations.filter(c => c.id !== id);
        setConversations(remaining);
        if (activeId === id) {
            if (remaining.length > 0) {
                setActiveId(remaining[0].id);
            } else {
                handleNewConversation();
            }
        }
        setConvToDelete(null);
    };

    const handleSend = async (e, overridePrompt = null) => {
        e?.preventDefault();
        const userText = (overridePrompt || input).trim();
        if (!userText || isLoading) return;

        if (!overridePrompt) setInput('');
        setIsLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Calcular título a partir del primer mensaje
        const isFirstMessage = messages.length === 0 || !messages.some(m => m.sender === 'user');
        const computedTitle = isFirstMessage 
            ? (userText.length > 28 ? userText.slice(0, 25) + '...' : userText)
            : (currentConv?.title || userText);

        const newMsgs = [
            ...messages,
            { sender: 'user', text: userText },
            { sender: 'bot', text: '' }
        ];
        const botIndex = newMsgs.length - 1;

        // Si la conversación no existía aún en el historial guardado, se crea formalmente en este primer mensaje (estilo Gemini)
        setConversations(prev => {
            const exists = prev.some(c => c.id === activeId);
            if (exists) {
                return prev.map(c => {
                    if (c.id === activeId) {
                        return {
                            ...c,
                            title: computedTitle,
                            updatedAt: Date.now(),
                            messages: newMsgs
                        };
                    }
                    return c;
                });
            } else {
                const created = {
                    id: activeId,
                    title: computedTitle,
                    updatedAt: Date.now(),
                    messages: newMsgs
                };
                return [created, ...prev];
            }
        });

        try {
            const response = await fetch('http://localhost:8080/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userText, model, conversationId: activeId }),
                signal: controller.signal
            });

            if (!response.ok) {
                if (response.status === 500) {
                    throw new Error('El asistente está procesando demasiadas solicitudes en este momento. Intenta de nuevo en 1 minuto.');
                } else if (response.status === 429) {
                    throw new Error('Se ha superado temporalmente el límite de consultas por minuto. Por favor, intenta de nuevo en 1 minuto o cambia de modelo.');
                } else if (response.status === 503 || response.status === 504) {
                    throw new Error('El servicio de IA se encuentra temporalmente fuera de línea. Intenta de nuevo en 1 minuto.');
                } else {
                    throw new Error('No pudimos procesar tu consulta en este momento. Intenta de nuevo en 1 minuto.');
                }
            }

            const data = await response.text();
            if (!data || !data.trim()) {
                throw new Error('El asistente no pudo generar una respuesta en este momento. Por favor, intenta de nuevo en 1 minuto.');
            }
            typeMessage(data, botIndex);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Consulta cancelada por el usuario');
                return;
            }

            console.error('Error al llamar al Recepcionista Virtual:', error);
            let friendlyError = '⚠️ El asistente virtual no pudo responder tu consulta. Intenta de nuevo en 1 minuto.';

            if (error.name === 'TypeError' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                friendlyError = '⚠️ No se pudo establecer conexión con el servidor del hotel (backend apagado o sin red). Por favor, intenta de nuevo en 1 minuto.';
            } else if (error.message) {
                friendlyError = `⚠️ ${error.message}`;
            }

            updateActiveMessages((prev) => {
                const updated = [...prev];
                updated[botIndex] = {
                    sender: 'bot',
                    text: friendlyError
                };
                return updated;
            });
        } finally {
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    const handleCloseChat = () => {
        if (isLoading) handleCancelQuery();
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 220);
    };

    const handleToggleChat = () => {
        if (isOpen) {
            handleCloseChat();
        } else {
            setIsOpen(true);
        }
    };

    return (
        <div className={`chat-widget-container ${isFullscreen && isOpen ? 'fullscreen-active' : ''}`}>
            {isOpen && (
                <div className={`chat-window ${isFullscreen ? 'chat-window-fullscreen' : ''} ${isClosing ? 'chat-window-exit' : 'chat-window-enter'}`}>
                    {/* Header Principal del Asistente */}
                    <div className="chat-header">
                        <div className="chat-header-title">
                            {/* Botón para colapsar/expandir barra lateral en pantalla completa */}
                            {isFullscreen && (
                                <button 
                                    className="chat-sidebar-toggle-btn" 
                                    title={isSidebarOpen ? "Ocultar panel de chats" : "Mostrar panel de chats"}
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                >
                                    {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                                </button>
                            )}
                            <div className="chat-avatar"><Bot size={18} /></div>
                            <div>
                                <h4 className="chat-name">Recepcionista Virtual</h4>
                                <span className="chat-status">
                                    <span className="status-dot"></span> En línea · Recepción {isFullscreen && '· Pantalla Completa'}
                                </span>
                            </div>
                        </div>
                        <div className="chat-header-actions">
                            <div className="chat-model-wrapper">
                                <span className="chat-model-label">Motor:</span>
                                <select
                                    className="chat-model-select"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                >
                                    <option value="gemini">Gemini</option>
                                    <option value="ollama">Ollama</option>
                                </select>
                            </div>
                            
                            {/* Botón de Nueva Conversación */}
                            <button
                                className="chat-action-icon-btn"
                                title="Nueva conversación (+)"
                                onClick={handleNewConversation}
                            >
                                <Plus size={16} />
                            </button>

                            {/* Botón Limpiar conversación actual */}
                            <button
                                className="chat-action-icon-btn"
                                title="Reiniciar mensajes de esta conversación"
                                onClick={() => {
                                    if (isLoading) handleCancelQuery();
                                    updateActiveMessages([]);
                                }}
                            >
                                <RotateCcw size={15} />
                            </button>

                            {/* Botón Pantalla Completa / Restaurar */}
                            <button
                                className="chat-action-icon-btn chat-fullscreen-btn"
                                title={isFullscreen ? "Restaurar a ventana normal" : "Pantalla completa"}
                                onClick={() => setIsFullscreen(!isFullscreen)}
                            >
                                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>

                            {/* Botón Cerrar */}
                            <button className="chat-close-btn" title="Cerrar ventana" onClick={handleCloseChat}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Cuerpo Principal del Chat (con Sidebar si está en Pantalla Completa) */}
                    <div className="chat-body-layout">
                        {/* SIDEBAR DE CONVERSACIONES (Estilo ChatGPT / Gemini) */}
                        {isFullscreen && isSidebarOpen && (
                            <aside className="chat-sidebar">
                                <div className="chat-sidebar-header">
                                    <button 
                                        className="chat-new-chat-btn"
                                        onClick={handleNewConversation}
                                    >
                                        <Plus size={16} />
                                        <span>Nueva conversación</span>
                                    </button>
                                </div>

                                <div className="chat-conversations-list">
                                    <div className="chat-conversations-heading">Historial de conversaciones</div>
                                    {conversations.length === 0 ? (
                                        <div className="chat-no-conversations">
                                            <span>No hay conversaciones anteriores guardadas.</span>
                                        </div>
                                    ) : (
                                        conversations.map(conv => {
                                            const isActive = conv.id === activeId;
                                            return (
                                                <div
                                                    key={conv.id}
                                                    className={`chat-conv-item ${isActive ? 'active' : ''}`}
                                                    onClick={() => handleSelectConversation(conv.id)}
                                                >
                                                    <MessageCircle size={15} className="chat-conv-item-icon" />
                                                    <span className="chat-conv-item-title" title={conv.title}>
                                                        {conv.title || 'Conversación'}
                                                    </span>
                                                    <button
                                                        className="chat-conv-delete-btn"
                                                        title="Eliminar conversación"
                                                        onClick={(e) => handleRequestDeleteConversation(e, conv)}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="chat-sidebar-footer">
                                    <div className="chat-sidebar-meta">
                                        <Sparkles size={14} className="sparkle-icon" />
                                        <span>IA Hotel Paraíso</span>
                                    </div>
                                    <span className="chat-sidebar-badge">
                                        {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
                                    </span>
                                </div>
                            </aside>
                        )}

                        {/* ÁREA DE CONTENIDO Y MENSAJES */}
                        <div className="chat-main-area">
                            <div className="chat-messages">
                                {messages.length === 0 ? (
                                    <div className="chat-welcome-container">
                                        <div className="chat-welcome-hero">
                                            <div className="chat-welcome-avatar">
                                                <Bot size={36} />
                                            </div>
                                            <h2 className="chat-welcome-title">¿En qué puedo ayudarte hoy?</h2>
                                            <p className="chat-welcome-subtitle">
                                                Soy el Recepcionista Virtual de <strong>Hotel Paraíso</strong> y <strong>Hotel Paraíso Ejecutivo</strong>. 
                                                Pregúntame sobre disponibilidad, tarifas, estatus de habitaciones o solicitud de reservaciones.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
                                        const { cleanText, buttons } = msg.sender === 'bot' 
                                            ? parseBotContent(msg.text) 
                                            : { cleanText: msg.text, buttons: [] };

                                        return (
                                            <div
                                                key={index}
                                                className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
                                            >
                                                {msg.sender === 'bot' && (
                                                    <div className="bubble-icon bot-icon"><Sparkles size={14} /></div>
                                                )}
                                                <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
                                                    {msg.text ? (
                                                        msg.sender === 'bot' ? (
                                                            <>
                                                                <div 
                                                                    className="markdown-content"
                                                                    dangerouslySetInnerHTML={{ __html: marked.parse(cleanText) }} 
                                                                />
                                                                {buttons.length > 0 && (
                                                                    <div className="chat-action-buttons">
                                                                        {buttons.map((btn, bIdx) => (
                                                                            <button
                                                                                key={bIdx}
                                                                                type="button"
                                                                                className={`chat-action-btn ${btn.label.toLowerCase().includes('ambos') ? 'chat-action-btn-both' : ''}`}
                                                                                onClick={() => handleButtonClick(btn.prompt)}
                                                                            >
                                                                                🏢 {btn.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                                        )
                                                    ) : (
                                                        <div className="streaming-indicator">
                                                            <Loader2 size={16} className="spin-icon" />
                                                            <span>Consultando información...</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {msg.sender === 'user' && (
                                                    <div className="bubble-icon user-icon"><User size={14} /></div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Sugerencias Rápidas */}
                            <div className="chat-quick-suggestions">
                                {[
                                    { label: '📝 Reservar habitación', q: 'Quiero hacer una reservación para la habitación 102' },
                                    { label: '⏳ Habitaciones en pre-reserva', q: 'Dame las habitaciones en pre reserva' },
                                    { label: '🔍 Consultar reservación', q: 'Consultar reservación HP-2026-00009' },
                                    { label: '💎 Habitación más cara', q: '¿Cuál es la habitación más cara del hotel?' },
                                    { label: '📊 Resumen operativo de hoy', q: 'Dame el resumen operativo completo del Hotel Paraíso' },
                                    { label: '🟢 Disponibles hoy', q: '¿Qué habitaciones están disponibles actualmente?' },
                                    { label: '♿ Libres en planta baja', q: '¿Qué habitaciones están disponibles en planta baja para un adulto mayor?' },
                                    { label: '🛠️ Mantenimiento (Hotel)', q: 'Dame las habitaciones en mantenimiento de un hotel en específico' },
                                    { label: '🔧 Mantenimiento (Ambos)', q: '¿Qué habitaciones están en mantenimiento? Revisa en ambos hoteles' },
                                    { label: '🏨 Habitaciones Hotel Paraíso', q: '¿Qué habitaciones tiene el Hotel Paraíso?' },
                                    { label: '📊 Total ambos hoteles', q: '¿Cuántas habitaciones hay por ambos hoteles?' },
                                    { label: '🔍 Estatus de habitación', q: '¿Qué estatus tiene la habitación 202 del Hotel Paraíso?' },
                                    { label: '👥 Para 4 personas', q: '¿Qué habitaciones o tipos tienen para 4 personas?' },
                                    { label: '💵 Tipos y precios', q: '¿Qué tipos de habitaciones existen y cuánto cuestan?' },
                                    { label: '⏳ Vigencia pre-reserva', q: '¿Cuánto tiempo dura una pre-reserva y cuándo se cancela si no pagan?' },
                                    { label: '❌ Cancelación y reembolso', q: '¿Cuál es la política de cancelación y porcentaje de reembolso según los días?' },
                                    { label: '🌙 No-Show a las 10 PM', q: '¿Cómo se maneja el No-Show a las 8 PM y a las 10 PM?' },
                                    { label: '🚨 Sobreventa (Overbooking)', q: '¿Cuál es el protocolo del hotel en caso de sobreventa o overbooking?' },
                                    { label: '💰 Ingreso potencial', q: '¿Cuánto dinero se ingresaría si se rentan todas las habitaciones?' }
                                ].map((chip) => (
                                    <button
                                        key={chip.label}
                                        type="button"
                                        className="suggestion-chip"
                                        onClick={() => setInput(chip.q)}
                                        disabled={isLoading}
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>

                            {/* Formulario de Entrada */}
                            <form onSubmit={handleSend} className="chat-input-form">
                                <input
                                    type="text"
                                    placeholder={isLoading ? "El recepcionista está respondiendo..." : "Pregunte sobre hoteles, tarifas, habitaciones o reservaciones..."}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isLoading}
                                    className="chat-input"
                                />
                                {isLoading ? (
                                    <button
                                        type="button"
                                        onClick={handleCancelQuery}
                                        className="chat-stop-btn"
                                        title="Detener / Cancelar respuesta"
                                        aria-label="Detener respuesta"
                                    >
                                        <Square size={16} fill="white" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="chat-send-btn"
                                        title="Enviar consulta"
                                        aria-label="Enviar consulta"
                                    >
                                        <Send size={18} />
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <button
                className={`chat-floating-btn ${isOpen ? 'active' : ''}`}
                onClick={handleToggleChat}
                aria-label="Asistente de Recepción"
                title={isOpen ? "Minimizar asistente" : "Abrir Asistente de Recepción"}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && (
                    <span className="chat-status-beacon" title="Servicio disponible">
                        <span className="chat-status-beacon-ring"></span>
                        <span className="chat-status-beacon-dot"></span>
                    </span>
                )}
            </button>

            {/* Diálogo de confirmación con el diseño del sistema */}
            <ConfirmDialog
                isOpen={Boolean(convToDelete)}
                onClose={() => setConvToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar conversación?"
                subtitle="Historial de Asistente IA"
                message={
                    convToDelete ? (
                        <>
                            ¿Está seguro de que desea eliminar la conversación <strong>"{convToDelete.title || 'esta conversación'}"</strong>?
                            Esta acción no se puede deshacer y borrará los mensajes registrados.
                        </>
                    ) : ''
                }
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}