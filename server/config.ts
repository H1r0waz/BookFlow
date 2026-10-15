export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === "production";
  const origin = env.APP_ORIGIN || (production ? "" : "http://127.0.0.1:5173");
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("APP_ORIGIN must be an absolute origin.");
  }
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    (production
      ? url.protocol !== "https:"
      : !["http:", "https:"].includes(url.protocol))
  )
    throw new Error(
      "APP_ORIGIN must be an exact origin, with HTTPS in production.",
    );
  if (production && !env.DATABASE_URL)
    throw new Error("Production requires DATABASE_URL.");
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be between 1 and 65535.");
  const recovery =
    env.PASSWORD_RESET_MODE || (production ? "disabled" : "local");
  if (
    !["disabled", "local", "smtp"].includes(recovery) ||
    (production && recovery === "local")
  )
    throw new Error(
      "PASSWORD_RESET_MODE must be disabled or smtp in production.",
    );
  if (recovery === "smtp" && (!env.SMTP_URL || !env.MAIL_FROM))
    throw new Error("SMTP recovery requires SMTP_URL and MAIL_FROM.");
  const proxyHops = Number(env.TRUST_PROXY_HOPS || 0);
  if (![0, 1].includes(proxyHops))
    throw new Error("TRUST_PROXY_HOPS must be 0 or 1.");
  return {
    production,
    origin,
    port,
    recovery,
    proxyHops,
    host: env.HOST || (production ? "0.0.0.0" : "127.0.0.1"),
  };
}
