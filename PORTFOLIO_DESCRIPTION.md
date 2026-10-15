# BookFlow — portfolio description

## Español

BookFlow es una aplicación full-stack de reservas y gestión de clientes para pequeños negocios de servicios. Su interfaz en inglés integra calendario diario, semanal y mensual, clientes e historial, catálogo de servicios, personal, horarios, ausencias y reservas públicas.

El backend utiliza Express, Prisma y PostgreSQL. La prevención de solapamientos combina transacciones, bloqueos por miembro del personal y una restricción de exclusión en la base de datos. Cada negocio accede a sus propios datos mediante sesiones y operaciones delimitadas por tenant.

Proyecto de portafolio verificado localmente: **33 pruebas aprobadas**, lint, TypeScript, builds y validación de Prisma. Incluye documentación técnica, datos sintéticos y seis capturas. No está desplegado. SMTP real y HTTPS productivo siguen pendientes. Cuatro alertas altas de dependencias permanecen documentadas; no se presenta como producto certificado ni listo para producción.

## English

BookFlow is a full-stack appointment and customer management application for small service businesses. Its English interface brings together daily, weekly and monthly calendars, customer history, services, staff, working hours, time off and public booking.

The Express/Prisma/PostgreSQL backend combines transactions, staff-row locks and a database exclusion constraint to prevent overlapping appointments. Session-based tenant scoping keeps business data separate.

Locally verified portfolio release: **33 passing automated tests**, lint, TypeScript, client/server builds and Prisma validation. Includes technical documentation, synthetic demo data and six screenshots. Not deployed. Real SMTP and production HTTPS remain unverified. Four high dependency alerts are documented; this is not a security certification or a claim of production readiness.

## Technology actually used

React, Vite, TypeScript, Tailwind integration and custom CSS, React Router, TanStack Query, React Hook Form, Zod, Express, Prisma, PostgreSQL, Luxon, bcrypt, Vitest, React Testing Library, Supertest and Playwright Chromium. Nodemailer is integrated but external email delivery is not verified.
