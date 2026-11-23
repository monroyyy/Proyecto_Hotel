/**
 * Comprobante oficial de reservación (PDF formal en tinta negra, listo para entregar al huésped).
 * Rojo reservado únicamente para alertas críticas (saldo pendiente, fecha límite de pre-reserva o cancelación).
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

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fmtFechaLarga(fechaStr) {
    if (!fechaStr) return '—';
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${parseInt(partes[2], 10)} de ${meses[parseInt(partes[1], 10) - 1] || partes[1]} de ${partes[0]}`;
}

function fmtFechaHora(s) {
    if (!s) return '—';
    return new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtMetodo(metodo) {
    if (!metodo) return 'No especificado';
    const mapa = {
        TARJETA_CREDITO: 'Tarjeta de Crédito',
        TARJETA_DEBITO: 'Tarjeta de Débito',
        TRANSFERENCIA: 'Transferencia Bancaria',
        EFECTIVO: 'Efectivo'
    };
    return mapa[String(metodo).trim().toUpperCase()] || metodo;
}

export function imprimirComprobanteReserva(r, { ocultarFinanzas = false } = {}) {
    if (!r) return;

    const ahora = new Date();
    const fechaEmision = ahora.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const horaEmision = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    const estado = r.estado || 'Confirmada';
    const esEstadoAlerta = estado === 'Cancelada' || estado === 'No-Show' || estado === 'Pre-reserva';
    const saldoNum = Number(r.saldo || 0);
    const reembolsoNum = Number(r.montoReembolso || 0);

    const extras = [];
    if (r.cuna) extras.push('Cuna solicitada');
    if (r.camaExtra) extras.push('Cama extra');
    if (r.plantaBajaSolicitada) extras.push('Planta baja / accesibilidad');

    const hotelNombre = r.habitacion?.hotel?.nombre || 'Hotel Paraíso';
    const hotelCiudad = r.habitacion?.hotel?.ciudad || '';
    const hotelDir = r.habitacion?.hotel?.direccion || '';

    const finanzasHtml = ocultarFinanzas ? '' : `
        <h2 class="sec-title">Resumen de Tarifas y Pagos (MXN)</h2>
        <table>
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th>Detalle</th>
                    <th class="num">Importe</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Estancia contratada (${r.noches || 1} ${(r.noches || 1) === 1 ? 'noche' : 'noches'})</td>
                    <td>${escapeHtml(r.habitacion?.tipoHabitacion?.nombre || 'Habitación')} · Hab. #${escapeHtml(r.habitacion?.numero || '—')}</td>
                    <td class="num">${fmtMoney(r.total)}</td>
                </tr>
                <tr>
                    <td>Anticipo cubierto</td>
                    <td>Método: ${escapeHtml(fmtMetodo(r.metodoPago))}</td>
                    <td class="num">${fmtMoney(r.anticipo)}</td>
                </tr>
                ${reembolsoNum > 0 ? `
                <tr>
                    <td class="danger">Reembolso aplicado</td>
                    <td>${escapeHtml(r.bancoReembolso || 'Transferencia bancaria')}</td>
                    <td class="num danger">-${fmtMoney(reembolsoNum)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td colspan="2">${saldoNum > 0 ? 'Saldo pendiente por liquidar en Check-In' : 'Saldo pendiente'}</td>
                    <td class="num ${saldoNum > 0 ? 'danger' : ''}">${saldoNum > 0 ? fmtMoney(saldoNum) : '$0.00 (Liquidado)'}</td>
                </tr>
            </tbody>
        </table>
    `;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante ${escapeHtml(r.folio)} — Hotel Paraíso</title>
  <style>
    @page { size: letter portrait; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #000000;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .brand {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 19pt;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .subtitle {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 3px;
    }
    .folio-box {
      text-align: right;
      font-size: 8.5pt;
      line-height: 1.45;
    }
    .folio-num {
      font-size: 13pt;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
    }
    .danger {
      color: #b91c1c !important;
      font-weight: 700;
    }
    .alert-strip {
      border: 1px solid #b91c1c;
      padding: 8px 11px;
      margin-bottom: 14px;
      font-size: 8.8pt;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 14px;
    }
    .info-box {
      border: 1px solid #000000;
      padding: 10px 12px;
    }
    .box-title {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      border-bottom: 1px solid #000000;
      padding-bottom: 4px;
      margin: 0 0 7px;
    }
    .kv {
      margin-bottom: 3.5px;
      font-size: 8.8pt;
    }
    .kv strong { font-weight: 700; }
    .sec-title {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #000000;
      padding-bottom: 3px;
      margin: 16px 0 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.8pt;
    }
    th {
      text-align: left;
      font-weight: 700;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 5.5px 6px;
    }
    td {
      padding: 5.5px 6px;
      border-bottom: 1px solid #d4d4d8;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    tr.total-row td {
      border-top: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
      font-weight: 700;
      padding-top: 6.5px;
      padding-bottom: 6.5px;
    }
    ul.policy-list {
      margin: 0;
      padding-left: 18px;
      font-size: 8.5pt;
    }
    ul.policy-list li {
      margin-bottom: 4px;
    }
    .footer {
      margin-top: 26px;
      padding-top: 10px;
      border-top: 1px solid #000000;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <header class="header">
    <div>
      <h1 class="brand">HOTEL PARAÍSO</h1>
      <div class="subtitle">Comprobante Oficial de Reservación</div>
    </div>
    <div class="folio-box">
      <div class="folio-num">${escapeHtml(r.folio)}</div>
      <div><strong>Estado:</strong> <span class="${esEstadoAlerta ? 'danger' : ''}">${escapeHtml(estado)}</span></div>
      <div><strong>Emisión:</strong> ${escapeHtml(fechaEmision)}, ${escapeHtml(horaEmision)}</div>
    </div>
  </header>

  ${estado === 'Pre-reserva' && r.fechaExpiracion ? `
    <div class="alert-strip">
      <span class="danger">PRE-RESERVA CON VIGENCIA LIMITADA:</span>
      Para garantizar la habitación, el anticipo del 50% debe cubrirse antes del
      <strong class="danger">${escapeHtml(fmtFechaHora(r.fechaExpiracion))}</strong>.
    </div>
  ` : ''}

  <div class="grid-2">
    <div class="info-box">
      <div class="box-title">Datos del Huésped Titular</div>
      <div class="kv"><strong>Nombre:</strong> ${escapeHtml(r.huesped?.nombre || '—')}</div>
      <div class="kv"><strong>Teléfono:</strong> ${escapeHtml(r.huesped?.telefono || '—')}</div>
      <div class="kv"><strong>Correo:</strong> ${escapeHtml(r.huesped?.email || '—')}</div>
      <div class="kv"><strong>Ocupantes:</strong> ${r.adultos || 1} ${(r.adultos || 1) === 1 ? 'adulto' : 'adultos'}${r.ninos > 0 ? `, ${r.ninos} ${r.ninos === 1 ? 'niño' : 'niños'}` : ''}</div>
      ${extras.length > 0 ? `<div class="kv"><strong>Servicios extra:</strong> ${escapeHtml(extras.join(', '))}</div>` : ''}
    </div>

    <div class="info-box">
      <div class="box-title">Detalles de la Estancia</div>
      <div class="kv"><strong>Propiedad:</strong> ${escapeHtml(hotelNombre)}${hotelCiudad ? ` (${escapeHtml(hotelCiudad)})` : ''}</div>
      ${hotelDir ? `<div class="kv"><strong>Dirección:</strong> ${escapeHtml(hotelDir)}</div>` : ''}
      <div class="kv"><strong>Habitación:</strong> #${escapeHtml(r.habitacion?.numero || '—')} · ${escapeHtml(r.habitacion?.tipoHabitacion?.nombre || 'Estándar')} (Piso ${escapeHtml(r.habitacion?.piso ?? '—')})</div>
      <div class="kv"><strong>Check-In:</strong> ${escapeHtml(fmtFechaLarga(r.fechaEntrada))} · a partir de las 15:00 h</div>
      <div class="kv"><strong>Check-Out:</strong> ${escapeHtml(fmtFechaLarga(r.fechaSalida))} · hasta las 12:00 h</div>
    </div>
  </div>

  ${finanzasHtml}

  ${r.observaciones ? `
    <h2 class="sec-title">Observaciones y Peticiones Especiales</h2>
    <p style="margin: 0; font-size: 8.8pt;">${escapeHtml(r.observaciones)}</p>
  ` : ''}

  <h2 class="sec-title">Políticas de Estancia y Cancelación</h2>
  <ul class="policy-list">
    <li><strong>Registro (Check-In):</strong> Presentar este comprobante (impreso o digital) junto con una identificación oficial vigente al llegar a recepción.</li>
    <li><strong>Horarios oficiales:</strong> Entrega de habitación a partir de las 15:00 h; desocupación límite a las 12:00 h del día de salida.</li>
    <li><strong>Política de cancelación:</strong> Más de 72 horas antes de la llegada aplica 100% de reembolso sobre el anticipo; entre 48 y 72 horas aplica 50%; con menos de 48 horas o en caso de No-Show (posterior a las 22:00 h del día de entrada) no aplica reembolso.</li>
  </ul>

  <footer class="footer">
    <div>
      <div><strong>${escapeHtml(hotelNombre)}</strong> · Atención a Huéspedes</div>
      <div>Correo de contacto: contactoshotelparaiso@gmail.com</div>
    </div>
    <div style="text-align: right;">
      <div><strong>Registró:</strong> ${escapeHtml(r.recepcionista || 'Recepción Hotel Paraíso')}</div>
      <div>Folio de referencia: ${escapeHtml(r.folio)}</div>
    </div>
  </footer>
</body>
</html>`;

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
