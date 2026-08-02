#!/usr/bin/env node
// Build a client-side vote package for integration tests, mirroring the
// frontend's createVotePackage (services/frontend/src/services/crypto.js).
// Usage: node vote-package.js <electionId> <candidateId> <electionPublicKeyPemOrBase64>
// Prints a JSON vote package to stdout: {encryptedBallot, nullifier, electionId, timestamp, signature, publicKey}
const crypto = require("crypto");

function canonicalJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

const [, , electionId, candidateId, publicKeyRaw] = process.argv;
if (!electionId || !candidateId || !publicKeyRaw) {
  console.error(
    "usage: vote-package.js <electionId> <candidateId> <publicKey>",
  );
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "P-256",
  publicKeyEncoding: { type: "spki", format: "der" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const publicKeyB64 = publicKey.toString("base64");

// Nullifier: SHA-256 of private key + electionId (matches frontend generateNullifier)
const nullifier = crypto
  .createHash("sha256")
  .update(privateKey + "||" + electionId)
  .digest("hex");

const ballot = {
  candidateId: Number(candidateId),
  timestamp: Date.now(),
  electionId: String(electionId),
};

// Election public key is PEM (or base64 SPKI) — normalize to PEM for publicEncrypt
let encryptKey = publicKeyRaw;
if (!publicKeyRaw.includes("-----BEGIN PUBLIC KEY-----")) {
  const der = Buffer.from(publicKeyRaw, "base64");
  encryptKey = {
    key: der,
    format: "der",
    type: "spki",
  };
}
const encryptedBallot = crypto
  .publicEncrypt(
    {
      key: encryptKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(JSON.stringify(ballot), "utf8"),
  )
  .toString("base64");

const votePackage = {
  encryptedBallot,
  nullifier,
  electionId: String(electionId),
  timestamp: ballot.timestamp,
};

const sign = crypto.createSign("sha256");
sign.update(canonicalJson(votePackage), "utf8");
sign.end();
const signature = sign
  .sign({ key: privateKey, dsaEncoding: "ieee-p1363" })
  .toString("base64");

console.log(
  JSON.stringify({
    ...votePackage,
    signature,
    publicKey: publicKeyB64,
  }),
);
