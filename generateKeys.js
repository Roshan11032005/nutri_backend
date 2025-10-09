// generateKeys.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const keysDir = path.join(process.cwd(), "keys");
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir);
}

const privateKeyPath = path.join(keysDir, "private.key");
const publicKeyPath = path.join(keysDir, "public.key");

console.log("Generating RSA key pair...");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);

console.log(`✅ RSA key pair generated at ${keysDir}`);
