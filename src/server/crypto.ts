import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const newToken = () => randomBytes(32).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
