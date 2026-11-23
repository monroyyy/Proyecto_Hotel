/**
 * Utilidades profesionales de exportación del Dashboard Financiero (Hotel Paraíso):
 * - exportarDashboardCsv: Archivo CSV con UTF-8 BOM, metadatos y valores numéricos puros listos para Excel.
 * - exportarDashboardPdf: Informe formal corporativo en tinta negra (con rojo únicamente para alertas/riesgos),
 *   viñetas ejecutivas y tablas contables sencillas, impreso mediante iframe oculto (sin bloqueo de popups).
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

function resolverSedeNombre(idHotelFiltro, hoteles) {
    if (!idHotelFiltro) return 'Toda la Cadena';
    const found = (hoteles || []).find(h => String(h.idHotel) === String(idHotelFiltro));
    return found ? `${found.nombre} (${found.ciudad})` : `Sede #${idHotelFiltro}`;
}

export function exportarDashboardCsv({ anoSeleccionado, idHotelFiltro, hoteles, kpis, rendimientoHoteles, user }) {
    const sedeNombre = resolverSedeNombre(idHotelFiltro, hoteles);
    const fechaEmision = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const emisor = user?.nombre || 'Don Roberto (Gerente General)';
    const metodos = Array.isArray(kpis?.metodosPago) ? kpis.metodosPago : [];
    const embudo = kpis?.embudo || {};
    const totalSol = Number(embudo.totalSolicitudes || 0);
    const pctEmb = (n) => (totalSol > 0 ? ((Number(n || 0) / totalSol) * 100).toFixed(1) : '0.0');

    const filas = [
        [`HOTEL PARAÍSO — REPORTE FINANCIERO EJECUTIVO · EJERCICIO ${anoSeleccionado} · ${sedeNombre.toUpperCase()}`],
        ['Emitido_Por', emisor, 'Moneda', 'MXN', fechaEmision],
        [],
        ['SECCION', 'INDICADOR', 'VALOR_NUMERICO', 'UNIDAD', 'NOTAS'],
        ['Resumen_KPI', 'Ingresos_Contratados_Brutos', numPlano(kpis?.ingresosBrutos), 'MXN', `${(kpis?.cambioIngresosPct ?? 0) >= 0 ? '+' : ''}${kpis?.cambioIngresosPct ?? 0}% vs año anterior`],
        ['Resumen_KPI', 'Ingreso_Neto_Contratado', numPlano(kpis?.ingresosNetos), 'MXN', 'Ingresos brutos menos reembolsos'],
        ['Resumen_KPI', 'Ocupacion_Promedio', Number(kpis?.ocupacionPorcentaje ?? 0).toFixed(1), '%', `${kpis?.nochesVendidas ?? 0} noches vendidas`],
        ['Resumen_KPI', 'ADR_Tarifa_Promedio', numPlano(kpis?.adr), 'MXN', 'Por habitación ocupada'],
        ['Resumen_KPI', 'RevPAR_Rendimiento', numPlano(kpis?.revpar), 'MXN', `${kpis?.totalHabitaciones ?? 0} habitaciones activas`],
        ['Resumen_KPI', 'Tasa_Cancelacion', Number(kpis?.tasaCancelacion ?? 0).toFixed(1), '%', `No-Show: ${kpis?.tasaNoShow ?? 0}% (${kpis?.noShows ?? 0} casos)`],
        ['Resumen_KPI', 'Estancia_Promedio_ALOS', Number(kpis?.estanciaPromedioNoches ?? 0).toFixed(1), 'noches', 'Promedio por reservación'],
        ['Resumen_KPI', 'Anticipacion_Promedio_LeadTime', Number(kpis?.anticipacionPromedioDias ?? 0).toFixed(1), 'dias', 'Días previos al Check-In'],
        [],
        ['Flujo_Caja', 'Anticipos_Cobrados', numPlano(kpis?.anticiposCobrados), 'MXN', 'Garantía recibida (50%)'],
        ['Flujo_Caja', 'Saldos_Liquidados', numPlano(kpis?.saldosLiquidados), 'MXN', 'Estancias finalizadas'],
        ['Flujo_Caja', 'Saldos_Pendientes_Lobby', numPlano(kpis?.saldosPendientes), 'MXN', 'Proyectado por cobrar en Check-In'],
        ['Flujo_Caja', 'Penalizaciones_Retenidas', numPlano(kpis?.penalizacionesRetenidas), 'MXN', 'No-Show y cancelaciones'],
        ['Flujo_Caja', 'Reembolsos_Dispersados', (-Math.abs(Number(kpis?.reembolsosDevueltos || 0))).toFixed(2), 'MXN', 'Egreso por reembolso bancario'],
        [],
        ...metodos.map(m => [
            'Metodo_Pago', m.nombre, numPlano(m.monto), 'MXN', `${m.operaciones} cobros (${m.porcentaje}%)`
        ]),
        [],
        ['Embudo', 'Solicitudes_Totales', totalSol, 'reservas', '100.0%'],
        ['Embudo', 'Confirmadas', Number(embudo.confirmadas || 0), 'reservas', `${pctEmb(embudo.confirmadas)}%`],
        ['Embudo', 'Finalizadas', Number(embudo.finalizadas || 0), 'reservas', `${pctEmb(embudo.finalizadas)}%`],
        ['Embudo', 'Canceladas_NoShow', Number(embudo.canceladasNoShow || 0), 'reservas', `${pctEmb(embudo.canceladasNoShow)}%`],
        [],
        ['PROPIEDAD', 'CIUDAD', 'BRUTO_MXN', 'NETO_MXN', 'OCUPACION_PCT', 'ADR_MXN', 'REVPAR_MXN', 'RESERVAS'],
        ...(rendimientoHoteles || []).map(h => [
            h.nombre,
            h.ciudad,
            numPlano(h.ingresosBrutos),
            numPlano(h.ingresosNetos),
            Number(h.ocupacionPorcentaje ?? 0).toFixed(1),
            numPlano(h.adr),
            numPlano(h.revpar),
            Number(h.totalReservas ?? 0)
        ])
    ];

    const csv = '\uFEFF' + filas
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const slugSede = sedeNombre.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const link = document.createElement('a');
    link.href = url;
    link.download = `HotelParaiso_Financiero_${anoSeleccionado}_${slugSede}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportarDashboardPdf({ anoSeleccionado, idHotelFiltro, hoteles, kpis, rendimientoHoteles, user }) {
    const sedeNombre = resolverSedeNombre(idHotelFiltro, hoteles);
    const ahora = new Date();
    const fechaEmision = ahora.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const horaEmision = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const folio = `RPT-${anoSeleccionado}-FIN-${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}`;
    const emisor = user?.nombre || 'Don Roberto (Gerente General)';

    const cambioPct = Number(kpis?.cambioIngresosPct ?? 0);
    const tasaCancel = Number(kpis?.tasaCancelacion ?? 0);
    const tasaNoShow = Number(kpis?.tasaNoShow ?? 0);
    const noShows = Number(kpis?.noShows ?? 0);
    const reembolsos = Number(kpis?.reembolsosDevueltos ?? 0);
    const pulso = kpis?.pulsoHoy || {};
    const preCriticas = Number(pulso.preReservasCriticas ?? 0);

    const metodos = Array.isArray(kpis?.metodosPago) ? kpis.metodosPago : [];
    const totalMetodosOps = metodos.reduce((acc, m) => acc + Number(m.operaciones || 0), 0);
    const embudo = kpis?.embudo || {};
    const totalSol = Number(embudo.totalSolicitudes || 0);
    const pctEmb = (n) => (totalSol > 0 ? `${((Number(n || 0) / totalSol) * 100).toFixed(1)}%` : '0.0%');

    const hotelesLista = Array.isArray(rendimientoHoteles) ? rendimientoHoteles : [];

    // Viñetas ejecutivas formales (todo en tinta negra; alertas/riesgos en rojo #b91c1c)
    const vinetasHtml = `
        <ul class="bullet-list">
            <li>
                <strong>Ingresos del ejercicio ${anoSeleccionado}:</strong> Se registran
                <strong>${fmtMoney(kpis?.ingresosBrutos)}</strong> contratados brutos y un ingreso neto de
                <strong>${fmtMoney(kpis?.ingresosNetos)}</strong>
                (<span class="${cambioPct < 0 ? 'danger' : ''}">${cambioPct >= 0 ? '+' : ''}${cambioPct}%</span> respecto al ejercicio anterior).
            </li>
            <li>
                <strong>Desempeño operativo:</strong> Ocupación promedio de <strong>${kpis?.ocupacionPorcentaje ?? 0}%</strong>
                (${fmtNum(kpis?.nochesVendidas)} noches vendidas), tarifa promedio diaria (ADR) de <strong>${fmtMoney(kpis?.adr)}</strong>,
                RevPAR de <strong>${fmtMoney(kpis?.revpar)}</strong>, estancia promedio de <strong>${kpis?.estanciaPromedioNoches ?? 0} noches</strong>
                y anticipación media de <strong>${kpis?.anticipacionPromedioDias ?? 0} días</strong>.
            </li>
            <li>
                <strong>Riesgo por cancelaciones, No-Show y reembolsos:</strong>
                <span class="${tasaCancel >= 15 ? 'danger' : ''}">Tasa de cancelación del ${tasaCancel}%</span>,
                <span class="${noShows > 0 ? 'danger' : ''}">No-Show del ${tasaNoShow}% (${noShows} casos)</span>
                y egresos por reembolsos bancarios de <span class="${reembolsos > 0 ? 'danger' : ''}">-${fmtMoney(reembolsos)}</span>.
            </li>
            <li>
                <strong>Control diario (Hoy):</strong> ${pulso.llegadasHoy ?? 0} llegadas programadas,
                ${pulso.checkOutsHoy ?? 0} salidas con saldo pendiente de ${fmtMoney(pulso.saldoCheckOutsHoy)}
                y <span class="${preCriticas > 0 ? 'danger' : ''}">${preCriticas} pre-reservas críticas por vencer en menos de 4 horas</span>.
            </li>
        </ul>
    `;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Informe Financiero ${anoSeleccionado} — Hotel Paraíso</title>
  <style>
    @page { size: letter portrait; margin: 16mm 15mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.42;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #000000;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .org-title {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 18pt;
      font-weight: 700;
      color: #000000;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .doc-subtitle {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #111111;
      margin-top: 3px;
    }
    .meta-block {
      text-align: right;
      font-size: 8pt;
      line-height: 1.45;
      color: #111111;
    }
    .sec-title {
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #000000;
      padding-bottom: 3px;
      margin: 15px 0 8px;
      color: #000000;
    }
    .bullet-list {
      margin: 0;
      padding-left: 18px;
    }
    .bullet-list li {
      margin-bottom: 5px;
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
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      align-items: start;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    th {
      text-align: left;
      font-weight: 700;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 5px 6px;
      color: #000000;
    }
    td {
      padding: 4.5px 6px;
      border-bottom: 1px solid #d4d4d8;
      color: #000000;
    }
    tr.total-row td {
      border-top: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
      font-weight: 700;
      padding-top: 6px;
      padding-bottom: 6px;
    }
    .footer-sign {
      margin-top: 26px;
      padding-top: 10px;
      border-top: 1px solid #000000;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8pt;
      color: #111111;
    }
    .sign-line {
      width: 210px;
      border-top: 1px solid #000000;
      text-align: center;
      padding-top: 4px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <header class="doc-header">
    <div>
      <h1 class="org-title">HOTEL PARAÍSO</h1>
      <div class="doc-subtitle">Informe Financiero y Operativo · Dirección General</div>
    </div>
    <div class="meta-block">
      <div><strong>Folio:</strong> ${escapeHtml(folio)}</div>
      <div><strong>Periodo:</strong> Ejercicio ${anoSeleccionado} · ${escapeHtml(sedeNombre)}</div>
      <div><strong>Fecha de emisión:</strong> ${escapeHtml(fechaEmision)}, ${escapeHtml(horaEmision)}</div>
      <div><strong>Emitido por:</strong> ${escapeHtml(emisor)}</div>
    </div>
  </header>

  <h2 class="sec-title">I. Resumen Ejecutivo y Hallazgos Clave</h2>
  ${vinetasHtml}

  <div class="two-cols">
    <div>
      <h2 class="sec-title">II. Conciliación de Flujo de Caja</h2>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="num">Importe (MXN)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Anticipos cobrados (50%)</td><td class="num">${fmtMoney(kpis?.anticiposCobrados)}</td></tr>
          <tr><td>Saldos liquidados (Finalizadas)</td><td class="num">${fmtMoney(kpis?.saldosLiquidados)}</td></tr>
          <tr><td>Saldos pendientes por cobrar</td><td class="num">${fmtMoney(kpis?.saldosPendientes)}</td></tr>
          <tr><td>Penalizaciones retenidas</td><td class="num">${fmtMoney(kpis?.penalizacionesRetenidas)}</td></tr>
          <tr>
            <td class="${reembolsos > 0 ? 'danger' : ''}">Reembolsos bancarios dispersados</td>
            <td class="num ${reembolsos > 0 ? 'danger' : ''}">-${fmtMoney(reembolsos)}</td>
          </tr>
          <tr class="total-row">
            <td>Ingreso Neto Contratado</td>
            <td class="num">${fmtMoney(kpis?.ingresosNetos)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <h2 class="sec-title">III. Métodos de Pago y Conversión</h2>
      <table>
        <thead>
          <tr>
            <th>Método de Pago</th>
            <th class="num">Cobros</th>
            <th class="num">Part.</th>
            <th class="num">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${metodos.map(m => `
            <tr>
              <td>${escapeHtml(m.nombre)}</td>
              <td class="num">${fmtNum(m.operaciones)}</td>
              <td class="num">${m.porcentaje}%</td>
              <td class="num">${fmtMoney(m.monto)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>Total Cobrado</td>
            <td class="num">${fmtNum(totalMetodosOps)}</td>
            <td class="num">100%</td>
            <td class="num">${fmtMoney(kpis?.totalCobradoMetodos)}</td>
          </tr>
        </tbody>
      </table>

      <table style="margin-top: 10px;">
        <thead>
          <tr>
            <th>Etapa del Embudo</th>
            <th class="num">Reservas</th>
            <th class="num">%</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Solicitudes totales</td><td class="num">${fmtNum(totalSol)}</td><td class="num">100.0%</td></tr>
          <tr><td>Confirmadas</td><td class="num">${fmtNum(embudo.confirmadas)}</td><td class="num">${pctEmb(embudo.confirmadas)}</td></tr>
          <tr><td>Estancias finalizadas</td><td class="num">${fmtNum(embudo.finalizadas)}</td><td class="num">${pctEmb(embudo.finalizadas)}</td></tr>
          <tr>
            <td class="${Number(embudo.canceladasNoShow || 0) > 0 ? 'danger' : ''}">Canceladas / No-Show</td>
            <td class="num ${Number(embudo.canceladasNoShow || 0) > 0 ? 'danger' : ''}">${fmtNum(embudo.canceladasNoShow)}</td>
            <td class="num ${Number(embudo.canceladasNoShow || 0) > 0 ? 'danger' : ''}">${pctEmb(embudo.canceladasNoShow)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <h2 class="sec-title">IV. Rendimiento Consolidado por Propiedad (${anoSeleccionado})</h2>
  <table>
    <thead>
      <tr>
        <th>Propiedad</th>
        <th>Ciudad</th>
        <th class="num">Bruto</th>
        <th class="num">Neto</th>
        <th class="num">Ocup.</th>
        <th class="num">ADR</th>
        <th class="num">RevPAR</th>
        <th class="num">Res.</th>
      </tr>
    </thead>
    <tbody>
      ${hotelesLista.map(h => `
        <tr>
          <td><strong>${escapeHtml(h.nombre)}</strong>${h.activo === false ? ' (Inactiva)' : ''}</td>
          <td>${escapeHtml(h.ciudad)}</td>
          <td class="num">${fmtMoney(h.ingresosBrutos)}</td>
          <td class="num">${fmtMoney(h.ingresosNetos)}</td>
          <td class="num ${Number(h.ocupacionPorcentaje || 0) < 5 ? 'danger' : ''}">${h.ocupacionPorcentaje}%</td>
          <td class="num">${fmtMoney(h.adr)}</td>
          <td class="num">${fmtMoney(h.revpar)}</td>
          <td class="num">${fmtNum(h.totalReservas)}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="2">Total Consolidado (${hotelesLista.length} propiedades)</td>
        <td class="num">${fmtMoney(kpis?.ingresosBrutos)}</td>
        <td class="num">${fmtMoney(kpis?.ingresosNetos)}</td>
        <td class="num">${kpis?.ocupacionPorcentaje ?? 0}%</td>
        <td class="num">${fmtMoney(kpis?.adr)}</td>
        <td class="num">${fmtMoney(kpis?.revpar)}</td>
        <td class="num">${fmtNum(kpis?.totalReservas)}</td>
      </tr>
    </tbody>
  </table>

  <footer class="footer-sign">
    <div>
      <div><strong>Nota de confidencialidad:</strong> Información financiera de uso exclusivo para Dirección General.</div>
      <div>Valores en rojo indican egresos por reembolso, cancelaciones, No-Show o alertas de riesgo operativo.</div>
    </div>
    <div class="sign-line">
      <strong>${escapeHtml(emisor)}</strong><br />
      Validación de Dirección General
    </div>
  </footer>
</body>
</html>`;

    // Imprimir mediante iframe oculto para evitar bloqueo de popups y abrir diálogo nativo Guardar como PDF
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
