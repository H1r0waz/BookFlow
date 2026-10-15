# BookFlow — portfolio description

## Español

BookFlow es una aplicación full-stack de reservas y gestión de clientes para pequeños negocios de servicios. Su interfaz en inglés integra calendario diario, semanal y mensual, clientes e historial, catálogo de servicios, personal, horarios, ausencias y reservas públicas.

El backend utiliza Express, Prisma y PostgreSQL. La prevención de solapamientos combina transacciones, bloqueos por miembro del personal y una restricción de exclusión en la base de datos. Cada negocio accede a sus propios datos mediante sesiones y operaciones delimitadas por tenant.

Proyecto personal de demostración verificado localmente: **45 pruebas aprobadas**, lint, TypeScript, builds y validación de Prisma. Incluye documentación técnica, datos sintéticos y seis capturas. La preparación para Render + Neon está hecha; no está desplegado ni tiene URL pública. No es trabajo realizado para un cliente. SMTP real y HTTPS productivo siguen pendientes; la recuperación está deshabilitada en modo demo público. Cuatro alertas altas de dependencias permanecen documentadas.

## English

BookFlow is a full-stack appointment and customer management application for small service businesses. Its English interface brings together daily, weekly and monthly calendars, customer history, services, staff, working hours, time off and public booking.

The Express/Prisma/PostgreSQL backend combines transactions, staff-row locks and a database exclusion constraint to prevent overlapping appointments. Session-based tenant scoping keeps business data separate.

Personal demonstration project with **45 passing automated tests**, lint, TypeScript, client/server builds and Prisma validation locally. Includes technical documentation, synthetic data and six screenshots. Render + Neon deployment preparation exists, but no deployment or public URL has been verified. This is not client work. Real SMTP and production HTTPS remain unverified; recovery is disabled in public-demo mode. Four high dependency alerts are documented.

## Technology actually used

React, Vite, TypeScript, Tailwind integration and custom CSS, React Router, TanStack Query, React Hook Form, Zod, Express, Prisma, PostgreSQL, Luxon, bcrypt, Vitest, React Testing Library, Supertest and Playwright Chromium. Nodemailer is integrated but external email delivery is not verified.
