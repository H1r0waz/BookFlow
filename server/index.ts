import "dotenv/config";
import express from "express";
import path from "node:path";
import { app } from "./app.js";
if (process.env.NODE_ENV === "production") {
  if (
    !process.env.APP_ORIGIN?.startsWith("https://") ||
    !process.env.DATABASE_URL ||
    !process.env.SMTP_URL ||
    !process.env.MAIL_FROM
  )
    throw new Error(
      "Production requires HTTPS APP_ORIGIN, DATABASE_URL, SMTP_URL and MAIL_FROM.",
    );
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
}
app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log("BookFlow API listening on port " + (process.env.PORT || 3001)),
);
