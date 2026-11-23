/**
 * Exportación formal (PDF en tinta negra con alertas en rojo + CSV estructurado para Excel)
 * para el Centro de Informes y Auditoría de Hotel Paraíso.
 */

function fmtMoney(valor) {
    const num = Number(valor || 0);
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number.isFinite(num) ? num : 0);
}

function fmtNum(valor) {
    const num = Number(valor || 0);
    return new Intl.NumberFormat('es-MX').format(Number.isFinite(num) ? num : 0);
}

function numPlano(valor) {
    const num = Number(valor || 0);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function formatearMetodoPago(metodo) {
    if (!metodo) return '—';
    const key = String(metodo).trim().toUpperCase();
    const mapa = {
        TARJETA_CREDITO: 'Tarjeta Crédito',
        TARJETA_DEBITO: 'Tarjeta Débito',
        TRANSFERENCIA: 'Transferencia',
        EFECTIVO: 'Efectivo',
        NO_REGISTRADO: 'No registrado'
    };
    return mapa[key] || metodo;
}

function resolverSedeNombre(idHotelFiltro, hoteles) {
    if (!idHotelFiltro) return 'Toda la Cadena';
    const found = (hoteles || []).find(h => String(h.idHotel) === String(idHotelFiltro));
    return found ? `${found.nombre}${found.ciudad ? ` (${found.ciudad})` : ''}` : `Sede #${idHotelFiltro}`;
}

function descargarCsv(filas, nombreArchivo) {
    const csv = '\uFEFF' + filas
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function imprimirHtmlFormal(html) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        document.body.removeChild(iframe);
        window.print();
        return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1200);
    }, 180);
}

export function exportarInformeCsv({ pestana, anoSeleccionado, periodoTexto, idHotelFiltro, hoteles, informeData, filasCompletas, user }) {
    const sedeNombre = resolverSedeNombre(idHotelFiltro, hoteles);
    const etiquetaPeriodo = periodoTexto || `Ejercicio ${anoSeleccionado}`;
    const fechaEmision = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const emisor = user?.nombre || 'Don Roberto (Gerente General)';
    const slugSede = sedeNombre.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const slugPeriodo = etiquetaPeriodo.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const filas = Array.isArray(filasCompletas) ? filasCompletas : (informeData?.filas || []);

    if (pestana === 'financiero') {
        const rows = [
            [`HOTEL PARAÍSO — AUDITORÍA DE CONCILIACIÓN DE CAJA · ${etiquetaPeriodo.toUpperCase()} · ${sedeNombre.toUpperCase()}`],
            ['Emitido_Por', emisor, 'Moneda', 'MXN', 'Fecha', fechaEmision],
            [],
            ['RESUMEN', 'INGRESO_NETO_CAJA', numPlano(informeData?.ingresosNetosCaja), 'ANTICIPOS', numPlano(informeData?.totalAnticiposCobrados), 'LIQUIDADOS', numPlano(informeData?.totalSaldosLiquidados), 'PENALIZACIONES', numPlano(informeData?.totalPenalizaciones), 'REEMBOLSOS', (-Math.abs(Number(informeData?.totalReembolsos || 0))).toFixed(2)],
            [],
            ['FOLIO', 'TITULAR', 'SEDE', 'HABITACION', 'ENTRADA', 'SALIDA', 'NOCHES', 'TOTAL_MXN', 'ANTICIPO_MXN', 'LIQUIDADO_MXN', 'PENALIZACION_MXN', 'REEMBOLSO_MXN', 'METODO_PAGO', 'ESTADO'],
            ...filas.map(f => [
                f.folio,
                f.titular,
                f.hotel,
                f.habitacionNumero,
                f.fechaEntrada,
                f.fechaSalida,
                f.noches,
                numPlano(f.total),
                numPlano(f.anticipo),
                numPlano(f.saldoLiquidado),
                numPlano(f.penalizacionRetenida),
                f.montoReembolso > 0 ? (-Math.abs(Number(f.montoReembolso))).toFixed(2) : '0.00',
                formatearMetodoPago(f.metodoPago),
                f.estado
            ])
        ];
        descargarCsv(rows, `HotelParaiso_Conciliacion_Caja_${slugPeriodo}_${slugSede}.csv`);
        return;
    }

    if (pestana === 'ocupacion') {
        const rows = [
            [`HOTEL PARAÍSO — AUDITORÍA DE OCUPACIÓN POR HABITACIÓN · ${etiquetaPeriodo.toUpperCase()} · ${sedeNombre.toUpperCase()}`],
            ['Emitido_Por', emisor, 'Moneda', 'MXN', 'Fecha', fechaEmision],
            [],
            ['HABITACION', 'PISO', 'SEDE', 'CATEGORIA', 'TARIFA_BASE_MXN', 'NOCHES_VENDIDAS', 'OCUPACION_PCT', 'RESERVACIONES', 'INGRESOS_MXN'],
            ...filas.map(h => [
                h.numero,
                h.piso,
                h.hotel,
                h.categoria,
                numPlano(h.precioBase),
                Number(h.nochesOcupadas || 0),
                Number(h.tasaOcupacionPct || 0).toFixed(1),
                Number(h.totalReservas || 0),
                numPlano(h.ingresosTotales)
            ])
        ];
        descargarCsv(rows, `HotelParaiso_Ocupacion_Habitaciones_${slugPeriodo}_${slugSede}.csv`);
        return;
    }

    if (pestana === 'cuentas') {
        const rows = [
            [`HOTEL PARAÍSO — CUENTAS POR COBRAR (SALDOS PENDIENTES) · ${etiquetaPeriodo.toUpperCase()} · ${sedeNombre.toUpperCase()}`],
            ['Emitido_Por', emisor, 'Moneda', 'MXN', 'Fecha', fechaEmision],
            [],
            ['FOLIO', 'TITULAR', 'SEDE', 'HABITACION', 'CHECK_IN', 'CHECK_OUT', 'NOCHES', 'TOTAL_MXN', 'ANTICIPO_MXN', 'SALDO_PENDIENTE_MXN', 'DIAS_LLEGADA', 'ESTADO'],
            ...filas.map(f => [
                f.folio,
                f.titular,
                f.hotel,
                f.habitacionNumero,
                f.fechaEntrada,
                f.fechaSalida,
                f.noches,
                numPlano(f.total),
                numPlano(f.anticipo),
                numPlano(f.saldoPendiente),
                Number(f.diasParaLlegada ?? 0),
                f.estado
            ])
        ];
        descargarCsv(rows, `HotelParaiso_Cuentas_Por_Cobrar_${slugPeriodo}_${slugSede}.csv`);
        return;
    }

    const rows = [
        [`HOTEL PARAÍSO — AUDITORÍA DE CANCELACIONES Y REEMBOLSOS · ${etiquetaPeriodo.toUpperCase()} · ${sedeNombre.toUpperCase()}`],
        ['Emitido_Por', emisor, 'Moneda', 'MXN', 'Fecha', fechaEmision],
        [],
        ['FOLIO', 'TITULAR', 'ENTRADA_PREVISTA', 'REGLA_APLICADA', 'TOTAL_ESTANCIA_MXN', 'ANTICIPO_MXN', 'REEMBOLSADO_MXN', 'PENALIZACION_MXN', 'BANCO', 'CLABE', 'AUTORIZADO_POR'],
        ...filas.map(f => [
            f.folio,
            f.titular,
            f.fechaEntrada,
            f.reglaAplicada || '—',
            numPlano(f.totalEstancia),
            numPlano(f.anticipoPagado),
            f.montoReembolsado > 0 ? (-Math.abs(Number(f.montoReembolsado))).toFixed(2) : '0.00',
            numPlano(f.penalizacionRetenida),
            f.bancoReembolso || '—',
            f.clabeReembolso || '—',
            f.autorizadoPor || '—'
        ])
    ];
    descargarCsv(rows, `HotelParaiso_Cancelaciones_Reembolsos_${slugPeriodo}_${slugSede}.csv`);
}

export function exportarInformePdf({ pestana, anoSeleccionado, periodoTexto, idHotelFiltro, hoteles, informeData, filasCompletas, user }) {
    const sedeNombre = resolverSedeNombre(idHotelFiltro, hoteles);
    const etiquetaPeriodo = periodoTexto || `Ejercicio ${anoSeleccionado}`;
    const ahora = new Date();
    const fechaEmision = ahora.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const horaEmision = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const emisor = user?.nombre || 'Don Roberto (Gerente General)';
    const filas = Array.isArray(filasCompletas) ? filasCompletas : (informeData?.filas || []);

    const codigos = {
        financiero: { titulo: 'Auditoría de Conciliación de Caja', prefijo: 'CAJA' },
        ocupacion: { titulo: 'Auditoría de Ocupación por Habitación', prefijo: 'OCUP' },
        cancelaciones: { titulo: 'Auditoría de Cancelaciones y Reembolsos', prefijo: 'CANC' },
        cuentas: { titulo: 'Informe de Cuentas por Cobrar (Saldos Pendientes)', prefijo: 'CXC' }
    };
    const meta = codigos[pestana] || codigos.financiero;
    const folio = `AUD-${anoSeleccionado}-${meta.prefijo}-${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}`;

    let vinetasHtml = '';
    let tablaHtml = '';

    if (pestana === 'financiero') {
        const reembolsos = Number(informeData?.totalReembolsos || 0);
        const cobradoBruto = Number(informeData?.totalAnticiposCobrados || 0) + Number(informeData?.totalSaldosLiquidados || 0);
        vinetasHtml = `
            <ul class="bullet-list">
                <li><strong>Ingreso neto en caja:</strong> <strong>${fmtMoney(informeData?.ingresosNetosCaja)}</strong> sobre ${fmtNum(filas.length)} reservaciones auditadas en el ejercicio ${anoSeleccionado}.</li>
                <li><strong>Recaudación efectiva:</strong> ${fmtMoney(cobradoBruto)} (${fmtMoney(informeData?.totalAnticiposCobrados)} en anticipos y ${fmtMoney(informeData?.totalSaldosLiquidados)} en saldos liquidados).</li>
                <li><strong>Penalizaciones y egresos:</strong> ${fmtMoney(informeData?.totalPenalizaciones)} retenidos por política y <span class="${reembolsos > 0 ? 'danger' : ''}">-${fmtMoney(reembolsos)}</span> dispersados en reembolsos bancarios.</li>
            </ul>
        `;
        tablaHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Folio</th>
                        <th>Titular</th>
                        <th>Sede / Hab.</th>
                        <th>Estancia</th>
                        <th class="num">Total</th>
                        <th class="num">Anticipo</th>
                        <th class="num">Liquidado</th>
                        <th class="num">Penal.</th>
                        <th class="num">Reembolso</th>
                        <th>Método</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas.map(f => {
                        const esRiesgo = f.estado === 'Cancelada' || f.estado === 'No-Show' || Number(f.montoReembolso || 0) > 0;
                        return `
                            <tr>
                                <td class="nowrap"><strong>${escapeHtml(f.folio)}</strong></td>
                                <td>${escapeHtml(f.titular)}</td>
                                <td>${escapeHtml(f.hotel)} (#${escapeHtml(f.habitacionNumero)})</td>
                                <td class="nowrap">${escapeHtml(f.fechaEntrada)} / ${escapeHtml(f.fechaSalida)} (${f.noches}n)</td>
                                <td class="num">${fmtMoney(f.total)}</td>
                                <td class="num">${fmtMoney(f.anticipo)}</td>
                                <td class="num">${fmtMoney(f.saldoLiquidado)}</td>
                                <td class="num">${Number(f.penalizacionRetenida || 0) > 0 ? fmtMoney(f.penalizacionRetenida) : '—'}</td>
                                <td class="num ${Number(f.montoReembolso || 0) > 0 ? 'danger' : ''}">${Number(f.montoReembolso || 0) > 0 ? `-${fmtMoney(f.montoReembolso)}` : '—'}</td>
                                <td>${escapeHtml(formatearMetodoPago(f.metodoPago))}</td>
                                <td class="${esRiesgo ? 'danger' : ''}">${escapeHtml(f.estado)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } else if (pestana === 'ocupacion') {
        vinetasHtml = `
            <ul class="bullet-list">
                <li><strong>Inventario auditado:</strong> <strong>${fmtNum(informeData?.totalHabitaciones)} habitaciones</strong> con <strong>${fmtNum(informeData?.totalNochesVendidas)} noches vendidas</strong> en el ejercicio ${anoSeleccionado}.</li>
                <li><strong>Desempeño consolidado:</strong> Tasa de ocupación global de <strong>${informeData?.ocupacionGlobalPct ?? 0}%</strong> e ingresos generados por hospedaje de <strong>${fmtMoney(informeData?.totalIngresosGenerados)}</strong>.</li>
                <li><strong>Criterio de alerta:</strong> Las unidades con ocupación inferior al 5.0% se resaltan en rojo para revisión tarifaria o comercial.</li>
            </ul>
        `;
        tablaHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Habitación</th>
                        <th>Piso</th>
                        <th>Propiedad</th>
                        <th>Categoría</th>
                        <th class="num">Tarifa Base</th>
                        <th class="num">Noches</th>
                        <th class="num">Ocup. %</th>
                        <th class="num">Res.</th>
                        <th class="num">Ingresos</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas.map(h => `
                        <tr>
                            <td class="nowrap"><strong>Hab. ${escapeHtml(h.numero)}</strong></td>
                            <td class="nowrap">Piso ${escapeHtml(h.piso)}</td>
                            <td>${escapeHtml(h.hotel)}</td>
                            <td>${escapeHtml(h.categoria)}</td>
                            <td class="num">${fmtMoney(h.precioBase)}</td>
                            <td class="num">${fmtNum(h.nochesOcupadas)}</td>
                            <td class="num ${Number(h.tasaOcupacionPct || 0) < 5 ? 'danger' : ''}">${h.tasaOcupacionPct}%</td>
                            <td class="num">${fmtNum(h.totalReservas)}</td>
                            <td class="num"><strong>${fmtMoney(h.ingresosTotales)}</strong></td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="5">Total Consolidado (${filas.length} habitaciones)</td>
                        <td class="num">${fmtNum(informeData?.totalNochesVendidas)}</td>
                        <td class="num">${informeData?.ocupacionGlobalPct ?? 0}%</td>
                        <td class="num">—</td>
                        <td class="num">${fmtMoney(informeData?.totalIngresosGenerados)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    } else if (pestana === 'cuentas') {
        const cuentasUrg = Number(informeData?.cuentasProximas7Dias || 0);
        vinetasHtml = `
            <ul class="bullet-list">
                <li><strong>Saldo total por cobrar:</strong> <strong>${fmtMoney(informeData?.totalSaldoPorCobrar)}</strong> distribuidos en <strong>${fmtNum(informeData?.totalCuentas)} reservaciones vigentes</strong> (${escapeHtml(etiquetaPeriodo)}).</li>
                <li><strong>Anticipos ya garantizados:</strong> ${fmtMoney(informeData?.totalAnticipoRecibido)} recibidos al confirmar.</li>
                <li><strong>Cobro inmediato (&le; 7 días o en casa):</strong> <span class="${cuentasUrg > 0 ? 'danger' : ''}">${fmtNum(cuentasUrg)} cuentas por ${fmtMoney(informeData?.saldoProximos7Dias)}</span> (${fmtNum(informeData?.cuentasEnCasa)} huéspedes actualmente en casa).</li>
            </ul>
        `;
        tablaHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Folio</th>
                        <th>Titular</th>
                        <th>Sede / Hab.</th>
                        <th>Estancia</th>
                        <th class="num">Total</th>
                        <th class="num">Anticipo</th>
                        <th class="num">Saldo por Cobrar</th>
                        <th>Plazo</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas.map(f => {
                        const dias = Number(f.diasParaLlegada ?? 0);
                        const urgente = dias <= 7 || f.estado === 'Ocupada';
                        const plazoTxt = f.estado === 'Ocupada' ? 'En casa' : (dias < 0 ? `Vencido (${Math.abs(dias)}d)` : dias === 0 ? 'Llega hoy' : `En ${dias} días`);
                        return `
                            <tr>
                                <td class="nowrap"><strong>${escapeHtml(f.folio)}</strong></td>
                                <td>${escapeHtml(f.titular)}</td>
                                <td>${escapeHtml(f.hotel)} (#${escapeHtml(f.habitacionNumero)})</td>
                                <td class="nowrap">${escapeHtml(f.fechaEntrada)} / ${escapeHtml(f.fechaSalida)} (${f.noches}n)</td>
                                <td class="num">${fmtMoney(f.total)}</td>
                                <td class="num">${fmtMoney(f.anticipo)}</td>
                                <td class="num ${urgente ? 'danger' : ''}"><strong>${fmtMoney(f.saldoPendiente)}</strong></td>
                                <td class="nowrap ${urgente ? 'danger' : ''}">${escapeHtml(plazoTxt)}</td>
                                <td>${escapeHtml(f.estado)}</td>
                            </tr>
                        `;
                    }).join('')}
                    <tr class="total-row">
                        <td colspan="6">Total Saldo por Cobrar (${filas.length} cuentas)</td>
                        <td class="num">${fmtMoney(informeData?.totalSaldoPorCobrar)}</td>
                        <td colspan="2"></td>
                    </tr>
                </tbody>
            </table>
        `;
    } else {
        const totalReemb = Number(informeData?.totalReembolsado || 0);
        const noShows = Number(informeData?.casosNoShow || 0);
        vinetasHtml = `
            <ul class="bullet-list">
                <li><strong>Casos auditados:</strong> <strong>${fmtNum(informeData?.totalCasos)} casos</strong> (${fmtNum(informeData?.casosReembolso100)} con reembolso 100%, ${fmtNum(informeData?.casosReembolso50)} con reembolso 50% y <span class="${noShows > 0 ? 'danger' : ''}">${fmtNum(noShows)} No-Shows</span>).</li>
                <li><strong>Impacto en tesorería:</strong> <span class="${totalReemb > 0 ? 'danger' : ''}">-${fmtMoney(totalReemb)}</span> autorizados en reembolsos bancarios y <strong>${fmtMoney(informeData?.totalPenalizacionesRetenidas)}</strong> recuperados por penalización.</li>
            </ul>
        `;
        tablaHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Folio</th>
                        <th>Titular</th>
                        <th>Entrada</th>
                        <th>Política Aplicada</th>
                        <th class="num">Anticipo</th>
                        <th class="num">Reembolso</th>
                        <th class="num">Penalización</th>
                        <th>Banco / CLABE</th>
                        <th>Autorizó</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas.map(f => {
                        const regla = String(f.reglaAplicada || '—');
                        const esNoShow = regla.toLowerCase().includes('no-show') || regla.toLowerCase().includes('0%');
                        return `
                            <tr>
                                <td class="nowrap"><strong>${escapeHtml(f.folio)}</strong></td>
                                <td>${escapeHtml(f.titular)}</td>
                                <td class="nowrap">${escapeHtml(f.fechaEntrada)}</td>
                                <td class="${esNoShow ? 'danger' : ''}">${escapeHtml(regla)}</td>
                                <td class="num">${fmtMoney(f.anticipoPagado)}</td>
                                <td class="num ${Number(f.montoReembolsado || 0) > 0 ? 'danger' : ''}">${Number(f.montoReembolsado || 0) > 0 ? `-${fmtMoney(f.montoReembolsado)}` : '—'}</td>
                                <td class="num">${Number(f.penalizacionRetenida || 0) > 0 ? fmtMoney(f.penalizacionRetenida) : '—'}</td>
                                <td>${escapeHtml(f.bancoReembolso || '—')}${f.clabeReembolso ? `<br /><span class="mono">${escapeHtml(f.clabeReembolso)}</span>` : ''}</td>
                                <td>${escapeHtml(f.autorizadoPor || '—')}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(meta.titulo)} ${anoSeleccionado} — Hotel Paraíso</title>
  <style>
    @page { size: letter landscape; margin: 13mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      font-size: 8.5pt;
      line-height: 1.38;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .org-title {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 16pt;
      font-weight: 700;
      margin: 0;
      color: #000000;
    }
    .doc-subtitle {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 2px;
      color: #111111;
    }
    .meta-block {
      text-align: right;
      font-size: 7.8pt;
      line-height: 1.4;
    }
    .sec-title {
      font-size: 8.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #000000;
      padding-bottom: 2px;
      margin: 12px 0 7px;
    }
    .bullet-list {
      margin: 0 0 10px;
      padding-left: 18px;
    }
    .bullet-list li {
      margin-bottom: 4px;
    }
    .danger {
      color: #b91c1c !important;
      font-weight: 700;
    }
    .num {
      font-variant-numeric: tabular-nums;
      text-align: right;
      white-space: nowrap;
    }
    .nowrap { white-space: nowrap; }
    .mono { font-variant-numeric: tabular-nums; font-size: 7.5pt; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
      text-align: left;
      font-weight: 700;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 4.5px 5px;
      color: #000000;
    }
    td {
      padding: 4px 5px;
      border-bottom: 1px solid #d4d4d8;
      color: #000000;
      vertical-align: top;
    }
    tr.total-row td {
      border-top: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
      font-weight: 700;
      padding: 5px;
    }
    .footer-sign {
      margin-top: 22px;
      padding-top: 8px;
      border-top: 1px solid #000000;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 7.8pt;
      page-break-inside: avoid;
    }
    .sign-line {
      width: 210px;
      border-top: 1px solid #000000;
      text-align: center;
      padding-top: 4px;
      margin-top: 22px;
    }
  </style>
</head>
<body>
  <header class="doc-header">
    <div>
      <h1 class="org-title">HOTEL PARAÍSO</h1>
      <div class="doc-subtitle">${escapeHtml(meta.titulo)} · Dirección General</div>
    </div>
    <div class="meta-block">
      <div><strong>Folio:</strong> ${escapeHtml(folio)}</div>
      <div><strong>Periodo:</strong> ${escapeHtml(etiquetaPeriodo)} · ${escapeHtml(sedeNombre)}</div>
      <div><strong>Fecha de emisión:</strong> ${escapeHtml(fechaEmision)}, ${escapeHtml(horaEmision)}</div>
      <div><strong>Emitido por:</strong> ${escapeHtml(emisor)}</div>
    </div>
  </header>

  <h2 class="sec-title">I. Resumen de Auditoría</h2>
  ${vinetasHtml}

  <h2 class="sec-title">II. Desglose Detallado</h2>
  ${tablaHtml}

  <footer class="footer-sign">
    <div>
      <div><strong>Nota de confidencialidad:</strong> Reporte de auditoría de uso exclusivo para Dirección General y Contabilidad.</div>
      <div>Valores en rojo indican egresos por reembolso, cancelaciones, No-Show o unidades con ocupación crítica (&lt;5%).</div>
    </div>
    <div class="sign-line">
      <strong>${escapeHtml(emisor)}</strong><br />
      Validación de Dirección General
    </div>
  </footer>
</body>
</html>`;

    imprimirHtmlFormal(html);
}
