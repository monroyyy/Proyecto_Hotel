package com.ico.hotel.services;

import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.models.Huesped;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.models.TipoHabitacion;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
public class PreReservaPdfService {

    private static final Color OCEAN = new Color(22, 50, 79);
    private static final Color TERRACOTTA = new Color(184, 93, 56);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color LIGHT_BG = new Color(248, 250, 252);
    private static final Color BORDER = new Color(226, 232, 240);

    public byte[] generarPdfPreReserva(Reserva r) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.LETTER, 42, 42, 42, 42);
        PdfWriter.getInstance(doc, out);
        doc.open();

        Font fBrand = new Font(Font.HELVETICA, 18, Font.BOLD, Color.WHITE);
        Font fSub = new Font(Font.HELVETICA, 9.5f, Font.NORMAL, new Color(203, 213, 225));
        Font fFolio = new Font(Font.HELVETICA, 12, Font.BOLD, Color.WHITE);
        Font fSec = new Font(Font.HELVETICA, 10.5f, Font.BOLD, OCEAN);
        Font fLabel = new Font(Font.HELVETICA, 9, Font.BOLD, MUTED);
        Font fVal = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(15, 23, 42));
        Font fBold = new Font(Font.HELVETICA, 10, Font.BOLD, OCEAN);
        Font fAccent = new Font(Font.HELVETICA, 11, Font.BOLD, TERRACOTTA);
        Font fSmall = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, MUTED);

        Habitacion hab = r.getHabitacion();
        Hotel hotel = hab != null ? hab.getHotel() : null;
        TipoHabitacion tipo = hab != null ? hab.getTipoHabitacion() : null;
        Huesped huesped = r.getHuesped();

        String folio = r.getFolio() != null ? r.getFolio() : "N/A";
        String hotelNombre = hotel != null && hotel.getNombre() != null ? hotel.getNombre() : "Hotel Paraíso";
        String ciudad = hotel != null && hotel.getCiudad() != null ? hotel.getCiudad() : "México";
        String numHab = hab != null && hab.getNumero() != null ? "#" + hab.getNumero() : "N/A";
        String catNombre = tipo != null && tipo.getNombre() != null ? tipo.getNombre() : "Estándar";
        String titular = huesped != null && huesped.getNombre() != null ? huesped.getNombre() : "Huésped";
        String email = huesped != null && huesped.getEmail() != null ? huesped.getEmail() : "—";
        String tel = huesped != null && huesped.getTelefono() != null ? huesped.getTelefono() : "—";

        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String entrada = r.getFechaEntrada() != null ? r.getFechaEntrada().format(df) : "—";
        String salida = r.getFechaSalida() != null ? r.getFechaSalida().format(df) : "—";
        long noches = (r.getFechaEntrada() != null && r.getFechaSalida() != null)
                ? Math.max(1, ChronoUnit.DAYS.between(r.getFechaEntrada(), r.getFechaSalida()))
                : 1;
        String expira = r.getFechaExpiracion() != null ? r.getFechaExpiracion().format(dtf) + " hrs" : "24 a 48 horas";

        BigDecimal total = r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO;
        BigDecimal anticipoMin = total.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal saldoCheckIn = total.subtract(anticipoMin).setScale(2, RoundingMode.HALF_UP);

        // Encabezado
        PdfPTable header = new PdfPTable(new float[]{3f, 2f});
        header.setWidthPercentage(100);
        header.setSpacingAfter(18);

        PdfPCell cLeft = new PdfPCell();
        cLeft.setBackgroundColor(OCEAN);
        cLeft.setBorder(Rectangle.NO_BORDER);
        cLeft.setPadding(16);
        cLeft.addElement(new Paragraph("HOTEL PARAÍSO", fBrand));
        cLeft.addElement(new Paragraph("Comprobante Oficial de Pre-reserva", fSub));
        header.addCell(cLeft);

        PdfPCell cRight = new PdfPCell();
        cRight.setBackgroundColor(OCEAN);
        cRight.setBorder(Rectangle.NO_BORDER);
        cRight.setPadding(16);
        cRight.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph pFolio = new Paragraph("FOLIO: " + folio, fFolio);
        pFolio.setAlignment(Element.ALIGN_RIGHT);
        Paragraph pEst = new Paragraph("Estado: PRE-RESERVA", fSub);
        pEst.setAlignment(Element.ALIGN_RIGHT);
        cRight.addElement(pFolio);
        cRight.addElement(pEst);
        header.addCell(cRight);
        doc.add(header);

        // Datos del huésped y estancia
        Paragraph sec1 = new Paragraph("Detalles de la Estancia", fSec);
        sec1.setSpacingAfter(8);
        doc.add(sec1);

        PdfPTable tInfo = new PdfPTable(new float[]{1.6f, 3.4f});
        tInfo.setWidthPercentage(100);
        tInfo.setSpacingAfter(16);
        addRow(tInfo, "Huésped Titular", titular, fLabel, fVal);
        addRow(tInfo, "Correo Electrónico", email, fLabel, fVal);
        addRow(tInfo, "Teléfono", tel, fLabel, fVal);
        addRow(tInfo, "Propiedad", hotelNombre + " (" + ciudad + ")", fLabel, fBold);
        addRow(tInfo, "Habitación", numHab + " — " + catNombre, fLabel, fVal);
        addRow(tInfo, "Check-in / Check-out", entrada + " (15:00 hrs)  →  " + salida + " (12:00 hrs)  ·  " + noches + (noches == 1 ? " noche" : " noches"), fLabel, fVal);
        addRow(tInfo, "Ocupantes", (r.getAdultos() != null ? r.getAdultos() : 1) + " adulto(s), " + (r.getNinos() != null ? r.getNinos() : 0) + " niño(s)", fLabel, fVal);
        addRow(tInfo, "Vigencia de Pre-reserva", "Hasta " + expira, fLabel, fAccent);
        doc.add(tInfo);

        // Resumen financiero
        Paragraph sec2 = new Paragraph("Resumen de Pago para Confirmación", fSec);
        sec2.setSpacingAfter(8);
        doc.add(sec2);

        PdfPTable tFin = new PdfPTable(new float[]{3f, 2f});
        tFin.setWidthPercentage(100);
        tFin.setSpacingAfter(16);
        addRowRight(tFin, "Total de la estancia", fmt(total), fVal, fBold, false);
        addRowRight(tFin, "Anticipo requerido para confirmar (50%)", fmt(anticipoMin), fBold, fAccent, true);
        addRowRight(tFin, "Saldo restante a liquidar en Check-in", fmt(saldoCheckIn), fVal, fVal, false);
        doc.add(tFin);

        // Instrucciones y políticas
        PdfPTable box = new PdfPTable(1);
        box.setWidthPercentage(100);
        PdfPCell cNote = new PdfPCell();
        cNote.setBackgroundColor(LIGHT_BG);
        cNote.setBorderColor(BORDER);
        cNote.setPadding(12);
        cNote.addElement(new Paragraph("Instrucciones para confirmar su reservación", fSec));
        cNote.addElement(new Paragraph(
                "• Su habitación queda apartada temporalmente hasta " + expira + ".\n" +
                "• Para confirmar, cubra el 50% de anticipo (" + fmt(anticipoMin) + ") en Recepción o vía transferencia bancaria referenciando su folio " + folio + ".\n" +
                "• Si el plazo vence sin validación del anticipo, la pre-reserva se libera automáticamente.\n" +
                "• Cancelaciones: >72h antes del Check-in = 100% reembolso; 48-72h = 50%; <48h = 0%. No-Show a las 22:00 hrs.",
                fSmall));
        box.addCell(cNote);
        doc.add(box);

        doc.close();
        return out.toByteArray();
    }

    private void addRow(PdfPTable table, String label, String val, Font fLabel, Font fVal) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, fLabel));
        c1.setBorderColor(BORDER);
        c1.setBackgroundColor(LIGHT_BG);
        c1.setPadding(7);
        PdfPCell c2 = new PdfPCell(new Phrase(val, fVal));
        c2.setBorderColor(BORDER);
        c2.setPadding(7);
        table.addCell(c1);
        table.addCell(c2);
    }

    private void addRowRight(PdfPTable table, String label, String val, Font fLabel, Font fVal, boolean highlight) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, fLabel));
        c1.setBorderColor(BORDER);
        if (highlight) c1.setBackgroundColor(LIGHT_BG);
        c1.setPadding(8);
        PdfPCell c2 = new PdfPCell(new Phrase(val, fVal));
        c2.setBorderColor(BORDER);
        if (highlight) c2.setBackgroundColor(LIGHT_BG);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c2.setPadding(8);
        table.addCell(c1);
        table.addCell(c2);
    }

    private String fmt(BigDecimal val) {
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.US);
        nf.setMinimumFractionDigits(2);
        nf.setMaximumFractionDigits(2);
        return "$" + nf.format(val != null ? val : BigDecimal.ZERO) + " MXN";
    }
}
