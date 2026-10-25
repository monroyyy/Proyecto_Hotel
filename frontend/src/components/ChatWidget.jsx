import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { marked } from 'marked';

// Configurar marked para saltos de línea automáticos y tablas
marked.setOptions({
    breaks: true,
    gfm: true
});

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            sender: 'bot',
            text: '\u00A1Hola! Soy el Recepcionista Virtual. Con gusto le asisto con informaci\u00F3n sobre nuestros hoteles, disponibilidad de habitaciones, servicios y tarifas.'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState('gemini');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const typeMessage = (fullText, index) => {
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setMessages((prev) => {
                const updated = [...prev];
                updated[index] = { sender: 'bot', text: fullText.slice(0, i) };
                return updated;
            });
            if (i >= fullText.length) clearInterval(interval);
        }, 10);
    };

    // Parser para extraer botones de acción interactivos generados por la IA: [BOTON: Etiqueta | Acción/Consulta]
    const parseBotContent = (rawText) => {
        if (!rawText) return { cleanText: '', buttons: [] };
        
        const buttonRegex = /\[BOTON:\s*([^|\]]+)\|\s*([^\]]+)\]/gi;
        const buttons = [];
        let match;
        
        while ((match = buttonRegex.exec(rawText)) !== null) {
            buttons.push({
                label: match[1].trim(),
                prompt: match[2].trim()
            });
        }
        
        const cleanText = rawText.replace(buttonRegex, '').trim();
        return { cleanText, buttons };
    };

    const handleButtonClick = (actionPrompt) => {
        if (isLoading) return;
        handleSend(null, actionPrompt);
    };

    const handleSend = async (e, overridePrompt = null) => {
        e?.preventDefault();
        const userText = (overridePrompt || input).trim();
        if (!userText || isLoading) return;

        if (!overridePrompt) setInput('');
        setIsLoading(true);

        setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
        setMessages((prev) => [...prev, { sender: 'bot', text: '' }]);
        const botIndex = messages.length + 1;

        try {
            const response = await fetch('http://localhost:8080/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userText, model })
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
            typeMessage(data, botIndex);

        } catch (error) {
            console.error('Error al llamar al Recepcionista Virtual:', error);
            let friendlyError = '⚠️ El asistente virtual no pudo responder tu consulta. Intenta de nuevo en 1 minuto.';

            if (error.name === 'TypeError' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                friendlyError = '⚠️ No se pudo establecer conexión con el servidor del hotel (backend apagado o sin red). Por favor, intenta de nuevo en 1 minuto.';
            } else if (error.message) {
                friendlyError = `⚠️ ${error.message}`;
            }

            setMessages((prev) => {
                const updated = [...prev];
                updated[botIndex] = {
                    sender: 'bot',
                    text: friendlyError
                };
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-widget-container">
            {isOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <div className="chat-header-title">
                            <div className="chat-avatar"><Bot size={18} /></div>
                            <div>
                                <h4 className="chat-name">Recepcionista Virtual</h4>
                                <span className="chat-status">
                                    <span className="status-dot"></span> En línea · Recepción
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
                            <button className="chat-close-btn" title="Cerrar ventana" onClick={() => setIsOpen(false)}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, index) => {
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
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-quick-suggestions">
                        {[
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

                    <form onSubmit={handleSend} className="chat-input-form">
                        <input
                            type="text"
                            placeholder="Pregunte sobre hoteles, tarifas, habitaciones..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            className="chat-input"
                        />
                        <button type="submit" disabled={!input.trim() || isLoading} className="chat-send-btn">
                            {isLoading ? <Loader2 size={18} className="spin-icon" /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            )}

            <button
                className={`chat-floating-btn ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Abrir recepcionista virtual"
            >
                {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
                {!isOpen && <span className="notification-badge">IA</span>}
            </button>
        </div>
    );
}