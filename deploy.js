// Run with: node deploy.js
const { execSync } = require("child_process");
const fs = require("fs");

// This downloads stellar CLI and deploys for you
console.log("Creating contract WASM...");

const wasmBase64 = `YOUR_WASM_BASE64_HERE`;
const wasmBuffer = Buffer.from(wasmBase64, "base64");
fs.writeFileSync("poll_contract.wasm", wasmBuffer);
console.log("WASM file created!");