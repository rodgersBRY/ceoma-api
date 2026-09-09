import type { Express } from "express";
import { createApp } from "../src/app/createApp.js";

let app: Express | undefined;

export function getTestApp(): Express {
  app ??= createApp();
  return app;
}
