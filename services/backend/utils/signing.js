const crypto = require("crypto");

function generateToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

function generateKeypair() {
  return {
    publicKey: crypto.randomBytes(32).toString("hex"),
    privateKey: crypto.randomBytes(32).toString("hex"),
  };
}

function generateNullifier(userId, electionId, privateKey) {
  const data = userId + electionId + privateKey;
  return crypto.createHash("sha256").update(data).digest("hex");
}

function verifyECDSASignature(publicKeyBase64, signatureBase64, data) {
  try {
    const dataStr =
      typeof data === "object" ? JSON.stringify(data) : String(data);
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
    console.error("ECDSA verification error:", error.message);
    return false;
  }
}

module.exports = {
  generateToken,
  generateKeypair,
  generateNullifier,
  verifyECDSASignature,
};
