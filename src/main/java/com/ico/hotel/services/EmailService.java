package com.ico.hotel.services;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

/**
 * Servicio para el envío de correos electrónicos de verificación mediante Gmail SMTP.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.verification.expiration-minutes:30}")
    private int expirationMinutes;

    public boolean enviarCorreoVerificacion(String destinatario, String nombreUsuario, String token) {
        String codigo = (token != null && token.contains("-"))
                ? token.substring(0, token.indexOf("-"))
                : token;
        String baseUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        String enlaceVerificacion = baseUrl + "/verificar-correo?token=" + token + "&email=" + destinatario;

        if (mailFrom == null || mailFrom.isBlank() || mailFrom.contains("tu_correo@")
                || mailPassword == null || mailPassword.isBlank() || mailPassword.contains("xxxx")) {
            log.warn("====================================================================================");
            log.warn("[MODO DESARROLLO - SMTP NO CONFIGURADO EN .env]");
            log.warn("Destinatario: {} ({})", nombreUsuario, destinatario);
            log.warn("CÓDIGO DE VERIFICACIÓN (4 DÍGITOS): {}", codigo);
            log.warn("Enlace de verificación generado: {}", enlaceVerificacion);
            log.warn("Configure MAIL_USERNAME y MAIL_PASSWORD en su archivo .env para envío real por Gmail.");
            log.warn("====================================================================================");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom, "Hotel Paraíso - Reservaciones");
            helper.setTo(destinatario);
            helper.setSubject("Tu código de verificación: " + codigo + " - Hotel Paraíso");

            String html = construirPlantillaHtml(nombreUsuario, enlaceVerificacion, codigo, expirationMinutes);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Correo de verificación con código {} enviado exitosamente a: {}", codigo, destinatario);
            return true;
        } catch (Exception e) {
            log.error("No se pudo enviar el correo vía SMTP a {}: {}. Código de 4 dígitos de respaldo: {}",
                    destinatario, e.getMessage(), codigo);
            return false;
        }
    }

    private String construirPlantillaHtml(String nombre, String enlace, String codigo, int minutos) {
        String digitosHtml = "";
        if (codigo != null && codigo.length() == 4) {
            StringBuilder sb = new StringBuilder();
            for (char c : codigo.toCharArray()) {
                sb.append("<span style=\"display: inline-block; width: 48px; height: 56px; line-height: 56px; margin: 0 6px; background: #f5f0e8; border: 2px solid #b85d38; border-radius: 10px; font-size: 26px; font-weight: 800; color: #16324f; text-align: center; font-family: monospace;\">")
                  .append(c)
                  .append("</span>");
            }
            digitosHtml = sb.toString();
        } else {
            digitosHtml = "<span style=\"font-size: 28px; font-weight: 800; letter-spacing: 8px; color: #16324f;\">" + codigo + "</span>";
        }

        return """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2d9cc; border-radius: 14px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #16324f, #1f4870); padding: 26px 28px; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Hotel Paraíso</h1>
                        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Costa &amp; Hospitalidad · Verificación de Seguridad</p>
                    </div>
                    <div style="padding: 28px; color: #1e293b; line-height: 1.6;">
                        <h2 style="margin-top: 0; font-size: 18px; color: #16324f;">¡Hola, %s!</h2>
                        <p>Gracias por registrarte en <strong>Hotel Paraíso</strong>. Ingresa el siguiente <strong>código de 4 dígitos</strong> en la pantalla de verificación para activar tu cuenta:</p>
                        <div style="text-align: center; margin: 28px 0; padding: 18px; background: #fcfaf7; border-radius: 12px; border: 1px dashed #e2d9cc;">
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #627d98; margin-bottom: 10px; font-weight: 700;">Tu código de verificación</div>
                            <div>%s</div>
                        </div>
                        <p style="font-size: 13px; color: #475569; text-align: center;">O si lo prefieres, también puedes confirmar directamente con este botón:</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="%s" style="background: #b85d38; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                                Verificar cuenta automáticamente
                            </a>
                        </div>
                        <p style="font-size: 12px; color: #64748b; margin-top: 18px; text-align: center;">
                            <strong>Importante:</strong> Este código es de un solo uso y expirará en <strong>%d minutos</strong>.
                        </p>
                    </div>
                </div>
                """.formatted(nombre, digitosHtml, enlace, minutos);
    }

    /**
     * Envía de forma asíncrona el código OTP de 6 dígitos para recuperación de contraseña.
     * Por seguridad, nunca registra el código en los logs de la aplicación.
     */
    @Async("mailTaskExecutor")
    public CompletableFuture<Boolean> enviarCorreoRecuperacion(String destinatario, String nombreUsuario, String codigo6Digitos) {
        String baseUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        String enlaceRecuperacion = baseUrl + "/recuperar-password?email=" + destinatario;

        if (mailFrom == null || mailFrom.isBlank() || mailFrom.contains("tu_correo@")
                || mailPassword == null || mailPassword.isBlank() || mailPassword.contains("xxxx")) {
            log.info("[RECUPERACION] Solicitud de código OTP procesada en modo local sin SMTP configurado (código omitido de logs).");
            return CompletableFuture.completedFuture(false);
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom, "Hotel Paraíso - Seguridad");
            helper.setTo(destinatario);
            helper.setSubject("Código de recuperación de contraseña - Hotel Paraíso");

            String html = construirPlantillaRecuperacionHtml(nombreUsuario, enlaceRecuperacion, codigo6Digitos, 15);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Correo de recuperación enviado vía SMTP correctamente.");
            return CompletableFuture.completedFuture(true);
        } catch (Exception e) {
            log.error("No se pudo enviar el correo de recuperación vía SMTP: {}", e.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    private String construirPlantillaRecuperacionHtml(String nombre, String enlace, String codigo, int minutos) {
        StringBuilder sb = new StringBuilder();
        if (codigo != null) {
            for (char c : codigo.toCharArray()) {
                sb.append("<span style=\"display: inline-block; width: 42px; height: 50px; line-height: 50px; margin: 0 4px; background: #f5f0e8; border: 2px solid #16324f; border-radius: 10px; font-size: 24px; font-weight: 800; color: #16324f; text-align: center; font-family: monospace;\">")
                  .append(c)
                  .append("</span>");
            }
        }
        String nombreSeguro = (nombre != null && !nombre.isBlank()) ? nombre : "viajero";
        return """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2d9cc; border-radius: 14px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #16324f, #1f4870); padding: 26px 28px; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Hotel Paraíso</h1>
                        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Restablecimiento de Contraseña</p>
                    </div>
                    <div style="padding: 28px; color: #1e293b; line-height: 1.6;">
                        <h2 style="margin-top: 0; font-size: 18px; color: #16324f;">Hola, %s</h2>
                        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Ingresa el siguiente <strong>código de 6 dígitos</strong> para continuar:</p>
                        <div style="text-align: center; margin: 26px 0; padding: 18px; background: #fcfaf7; border-radius: 12px; border: 1px dashed #e2d9cc;">
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #627d98; margin-bottom: 10px; font-weight: 700;">Código de un solo uso</div>
                            <div>%s</div>
                        </div>
                        <div style="text-align: center; margin: 18px 0;">
                            <a href="%s" style="background: #b85d38; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                                Ir a restablecer contraseña
                            </a>
                        </div>
                        <p style="font-size: 12px; color: #64748b; margin-top: 18px; text-align: center;">
                            Este código es válido durante <strong>%d minutos</strong> y permite máximo <strong>5 intentos</strong>. Si no solicitaste este cambio, ignora este mensaje.
                        </p>
                    </div>
                </div>
                """.formatted(nombreSeguro, sb.toString(), enlace, minutos);
    }
}
