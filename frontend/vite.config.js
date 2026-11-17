import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function cspHtmlPlugin() {
  return {
    name: 'hotel-csp-html',
    transformIndexHtml(html, ctx) {
      const isDev = Boolean(ctx?.server);
      const scriptSrc = isDev ? "'self' 'unsafe-inline'" : "'self'";
      const connectSrc = isDev
        ? "'self' http://localhost:8080 http://127.0.0.1:8080 http://localhost:8081 http://127.0.0.1:8081 ws://localhost:5173 ws://127.0.0.1:5173 ws://localhost:5174 ws://127.0.0.1:5174"
        : "'self' http://localhost:8080 http://127.0.0.1:8080 http://localhost:8081 http://127.0.0.1:8081";
      const csp = [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://images.unsplash.com",
        `connect-src ${connectSrc}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="${csp}" />`
      );
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspHtmlPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
