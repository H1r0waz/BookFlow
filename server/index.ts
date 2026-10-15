import "dotenv/config";
import express from "express";
import path from "node:path";
import { app } from "./app.js";
import { readConfig } from "./config.js";
const config = readConfig();
if (config.production) {
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
}
app.listen(config.port, config.host, () =>
  console.log("BookFlow API listening on port " + config.port),
);
