# BookFlow — portfolio description

Demo: https://bookflow-demo-c0g0.onrender.com
Public booking: https://bookflow-demo-c0g0.onrender.com/book/willow-studio
Type: personal demonstration project, not client work.

## Español

BookFlow es una aplicación full-stack de reservas y gestión de clientes para pequeños negocios de servicios. La interfaz en inglés reúne calendario diario, semanal y mensual, clientes e historial, servicios, personal, disponibilidad, ausencias y reservas públicas.

El backend combina transacciones, bloqueos por miembro del personal, restricciones PostgreSQL y claves de idempotencia para prevenir solapamientos y duplicados. Las sesiones delimitan los datos de cada negocio.

Demo pública verificada en Render Free y Neon Free: 49 tests automatizados locales aprobados, 36 comprobaciones de API pública y 17 comprobaciones de navegador. Se verificaron reservas, edición/cancelación, concurrencia, aislamiento entre negocios, HTTPS, cookies, CSRF y logout móvil. Incluye documentación y seis capturas con datos ficticios. Es un proyecto personal de demostración; no representa trabajo para un cliente ni disponibilidad de producción garantizada. Recuperación de contraseña/SMTP deshabilitados, cold starts y límites operativos documentados. La actualización desplegada dejó npm audit en 0 vulnerabilidades.

## English

BookFlow is a full-stack appointment and customer management application for small service businesses. Its English interface combines daily, weekly and monthly calendars, customer history, services, staff, availability, time off and public booking.

The backend combines transactions, staff-row locks, PostgreSQL constraints and idempotency keys to prevent overlaps and duplicate bookings. Session-derived tenant scoping keeps business data separate.

Public demo verified on Render Free and Neon Free: 49 passing local automated tests, 36 public API checks and 17 browser checks. Verified paths include booking/edit/cancel, concurrency, tenant isolation, HTTPS, cookies, CSRF and mobile logout. Includes technical documentation and six fictional-data screenshots. This is a personal demonstration project, not client work or a production availability guarantee. Password recovery/SMTP are disabled; free-tier cold starts and operational limitations are documented. The deployed dependency update reports 0 npm audit vulnerabilities.

## Stack

React, Vite, TypeScript, Tailwind integration/custom CSS, React Router, TanStack Query, React Hook Form, Zod, Express, Prisma, PostgreSQL, Luxon, bcrypt, Vitest, React Testing Library, Supertest and Playwright Chromium. Nodemailer is integrated but external email delivery is disabled and unverified.
