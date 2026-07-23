const crypto = require('crypto');
const EC = require('elliptic').ec;

function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateKeypair() {
  return {
    publicKey: crypto.randomBytes(32).toString('hex'),
    privateKey: crypto.randomBytes(32).toString('hex')
  };
}

function generateNullifier(userId, electionId, privateKey) {
  const data = userId + electionId + privateKey;
  return crypto.createHash('sha256').update(data).digest('hex');
}

function encryptBallot(ballot, electionPublicKey) {
  const ballotStr = JSON.stringify(ballot);
  return crypto.createHash('sha256').update(ballotStr + electionPublicKey).digest('hex');
}

function signData(data, privateKey) {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  return crypto.createHmac('sha256', privateKey).update(dataStr).digest('hex');
}

function verifySignature(data, signature, publicKey) {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const expectedSignature = crypto.createHmac('sha256', publicKey).update(dataStr).digest('hex');
  return signature === expectedSignature;
}

function verifyECDSASignature(publicKeyBase64, signatureBase64, data) {
  try {
    const ec = new EC('p256');
    const publicKeyDer = Buffer.from(publicKeyBase64, 'base64');
    
    let keyStart = -1;
    for (let i = 0; i < publicKeyDer.length - 65; i++) {
      if (publicKeyDer[i] === 0x03 && publicKeyDer[i + 2] === 0x00 && publicKeyDer[i + 3] === 0x04) {
        keyStart = i + 3;
        break;
      }
    }
    
    if (keyStart === -1) return false;
    if (publicKeyDer[keyStart] !== 0x04) return false;
    
    const xHex = publicKeyDer.slice(keyStart + 1, keyStart + 33).toString('hex');
    const yHex = publicKeyDer.slice(keyStart + 33, keyStart + 65).toString('hex');
    
    const publicKey = ec.keyFromPublic({ x: xHex, y: yHex }, 'hex');
    
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const msgHash = crypto.createHash('sha256').update(dataStr, 'utf8').digest();
    
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    if (signatureBuffer.length !== 64) return false;
    
    const r = signatureBuffer.slice(0, 32).toString('hex');
    const s = signatureBuffer.slice(32, 64).toString('hex');
    
    return publicKey.verify(msgHash, { r, s });
  } catch (error) {
    return false;
  }
}

module.exports = {
  generateToken,
  generateKeypair,
  generateNullifier,
  encryptBallot,
  signData,
  verifySignature,
  verifyECDSASignature
};
