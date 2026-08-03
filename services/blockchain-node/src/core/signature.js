const crypto = require("crypto");

// Canonical JSON: keys sorted for deterministic serialization (H-03)
function canonicalJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function sha256(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest();
}

// Verify an ECDSA P-256 signature. publicKey is a base64 SPKI DER, signature is
// base64 raw r||s (IEEE P-1363). data can be a string or object (canonicalized).
function verifyECDSASignature(publicKeyBase64, signatureBase64, data) {
  try {
    const dataStr =
      typeof data === "object" ? canonicalJson(data) : String(data);
    const verifier = crypto.createVerify("sha256");
    verifier.update(dataStr, "utf8");
    verifier.end();

    const publicKeyDer = Buffer.from(publicKeyBase64, "base64");
    const signatureBuffer = Buffer.from(signatureBase64, "base64");

    return verifier.verify(
      {
        key: publicKeyDer,
        format: "der",
        type: "spki",
        dsaEncoding: "ieee-p1363",
      },
      signatureBuffer,
    );
  } catch (error) {
    return false;
  }
}

module.exports = { verifyECDSASignature, canonicalJson, sha256 };
