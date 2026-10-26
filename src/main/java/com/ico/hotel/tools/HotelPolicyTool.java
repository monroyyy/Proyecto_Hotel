package com.ico.hotel.tools;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Slf4j
public class HotelPolicyTool {

    @Tool(description = "Consultar la política oficial de cancelación de reservaciones y porcentaje de reembolso según los días u horas de anticipación. Útil para: ¿Cuál es la política de cancelación y porcentaje de reembolso según los días?, ¿Cuánto me reembolsan si cancelo?, ¿Cómo cancelo una reservación?")
    public Map<String, Object> consultarPoliticaCancelacionYReembolsos() {
        log.info("Tool invocada — consultarPoliticaCancelacionYReembolsos");
        return Map.of(
                "politica", "Política Oficial de Cancelación y Reembolsos de la Cadena Hotelera",
                "tramo_1_mas_72_horas", "Más de 72 horas de anticipación al check-in (a partir de 73 horas o 4 días): 100% de reembolso del anticipo mediante transferencia.",
                "tramo_2_entre_48_y_72_horas", "Entre 48 y 72 horas de anticipación (ej. 50 horas, 60 horas): Únicamente el 50% de reembolso del anticipo (se retiene el otro 50% por penalización comercial).",
                "tramo_3_menos_48_horas", "Menos de 48 horas de anticipación (ej. 24h, 36h o mismo día): 0% de reembolso (penalización total del anticipo).",
                "requisitos_reembolso", "Nombre del titular, banco, cuenta CLABE interbancaria (18 dígitos) y autorización/firma obligatoria de Don Roberto (Gerente General)."
        );
    }

    @Tool(description = "Consultar el tiempo de vigencia de una pre-reserva temporal y cuándo se cancela si el cliente no paga el anticipo. Útil para: ¿Cuánto tiempo dura una pre-reserva?, ¿Cuándo se cancela una pre-reserva si no pagan?")
    public Map<String, Object> consultarPoliticaPreReserva() {
        log.info("Tool invocada — consultarPoliticaPreReserva");
        return Map.of(
                "politica", "Regla de Pre-reservas Temporales (Apartado sin pago)",
                "plazo_limite", "Plazo estricto de 24 a 48 horas para recibir y validar el comprobante del 50% de anticipo.",
                "consecuencia_falta_pago", "Si expira el plazo sin comprobante bancario, el cuarto se libera de inmediato y la pre-reserva se cancela automáticamente para evitar bloqueos fantasma."
        );
    }

    @Tool(description = "Consultar el procedimiento y manejo oficial de No-Show y llegadas tardías a las 8 PM (20:00 hrs) y 10 PM (22:00 hrs). Útil para: ¿Cómo se maneja el No-Show a las 8 PM y a las 10 PM?, ¿Qué pasa si el huésped llega tarde?")
    public Map<String, Object> consultarProtocoloNoShow() {
        log.info("Tool invocada — consultarProtocoloNoShow");
        return Map.of(
                "politica", "Protocolo Oficial de Llegadas Tardías y No-Show",
                "revision_20_00_hrs", "A las 20:00 hrs (8:00 PM) recepción monitorea reservaciones pendientes y contacta telefónicamente al cliente.",
                "notificacion_cliente", "Si el cliente notifica antes de las 20:00 hrs que viene en camino retrasado, se anota en bitácora y la habitación se protege después de las 22:00 hrs.",
                "declaracion_no_show_22_00_hrs", "A las 22:00 hrs (10:00 PM), si el huésped no llegó, no notificó y no contesta llamadas: se declara formalmente No-Show, se retiene el 100% del anticipo y la habitación se libera de inmediato para venta a clientes de paso (walk-in)."
        );
    }

    @Tool(description = "Consultar el protocolo del hotel en caso de sobreventa o sobrecupo (overbooking). Útil para: ¿Cuál es el protocolo del hotel en caso de sobreventa o overbooking?, ¿Qué hacemos si hay sobreventa?")
    public Map<String, Object> consultarProtocoloSobreventa() {
        log.info("Tool invocada — consultarProtocoloSobreventa");
        return Map.of(
                "politica", "Protocolo Oficial ante Sobreventa o Duplicidad (Overbooking)",
                "reubicacion", "Reubicar de inmediato al huésped en un hotel con convenio de categoría similar o superior.",
                "traslado", "Hotel Paraíso absorbe al 100% el traslado en taxi de sitio seguro.",
                "diferencia_tarifa", "Cubre cualquier diferencia de tarifa si la del nuevo hotel es superior.",
                "cortesia", "Otorga desayuno o amenidad de cortesía especial.",
                "prioridad", "Prioridad absoluta de protección para adultos mayores o personas con movilidad reducida."
        );
    }
}
