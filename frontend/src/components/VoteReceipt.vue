<template>
  <div class="vote-receipt">
    <div class="receipt-header">
      <h3>🎫 Vote Receipt</h3>
      <p class="receipt-subtitle">Cryptographic proof of your vote</p>
    </div>
    
    <div class="receipt-body">
      <div class="receipt-section vote-result">
        <h4>✓ Your Vote</h4>
        <div class="receipt-item">
          <span class="label">Candidate:</span>
          <span class="value candidate-name">{{ receipt.candidateName || 'Encrypted Vote' }}</span>
        </div>
      </div>
      
      <div class="receipt-section">
        <h4>Transaction Details</h4>
        <div class="receipt-item">
          <span class="label">Transaction Hash:</span>
          <code class="value monospace">{{ receipt.transactionHash || receipt.txHash }}</code>
          <button @click="copyToClipboard(receipt.transactionHash || receipt.txHash)" class="btn-copy">📋</button>
        </div>
        <div class="receipt-item">
          <span class="label">Nullifier:</span>
          <code class="value monospace">{{ receipt.nullifier }}</code>
          <button @click="copyToClipboard(receipt.nullifier)" class="btn-copy">📋</button>
        </div>
        <div class="receipt-item">
          <span class="label">Timestamp:</span>
          <span class="value">{{ formatTimestamp(receipt.timestamp) }}</span>
        </div>
      </div>
      
      <div class="receipt-section" v-if="receipt.signature">
        <h4>Cryptographic Verification</h4>
        <div class="receipt-item">
          <span class="label">Digital Signature:</span>
          <code class="value monospace small">{{ truncate(receipt.signature, 32) }}</code>
        </div>
        <div class="receipt-item">
          <span class="label">Encryption:</span>
          <span class="value">✓ RSA-OAEP 2048-bit</span>
        </div>
      </div>
      
      <div class="receipt-section info-section">
        <h4>📌 Important Information</h4>
        <ul>
          <li><strong>Privacy Protected:</strong> This receipt cannot be used to reveal who you voted for.</li>
          <li><strong>Verifiable:</strong> You can verify your vote was counted without revealing your choice.</li>
          <li><strong>Keep This Safe:</strong> Save this receipt to verify your vote later.</li>
          <li><strong>Nullifier:</strong> Unique identifier that prevents double-voting while preserving anonymity.</li>
        </ul>
      </div>
    </div>
    
    <div class="receipt-actions">
      <button @click="downloadReceipt" class="btn btn-primary">
        💾 Download Receipt
      </button>
      <button @click="printReceipt" class="btn btn-secondary">
        🖨️ Print Receipt
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VoteReceipt',
  props: {
    receipt: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatTimestamp(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      })
    },
    
    truncate(str, length) {
      if (!str) return ''
      if (str.length <= length) return str
      return str.substring(0, length) + '...' + str.substring(str.length - 8)
    },
    
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        alert('Copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    },
    
    downloadReceipt() {
      const receiptData = {
        type: 'Blockchain Voting Receipt',
        ...this.receipt,
        downloadedAt: new Date().toISOString(),
        warning: 'This receipt is for verification purposes only and cannot be used to reveal voting choices.'
      }
      
      const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vote-receipt-${this.receipt.nullifier.substring(0, 8)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    
    printReceipt() {
      window.print()
    }
  }
}
</script>

<style scoped>
.vote-receipt {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 30px;
  max-width: 700px;
  margin: 0 auto;
}

.receipt-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #3498db;
}

.receipt-header h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1.8rem;
}

.receipt-subtitle {
  color: #7f8c8d;
  margin: 0;
  font-size: 0.95rem;
}

.receipt-body {
  margin-bottom: 30px;
}

.receipt-section {
  margin-bottom: 25px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.receipt-section h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.receipt-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.receipt-item .label {
  font-weight: 600;
  color: #34495e;
  min-width: 140px;
  margin-right: 10px;
}

.receipt-item .value {
  color: #2c3e50;
  flex: 1;
  word-break: break-all;
}

.monospace {
  font-family: 'Courier New', Courier, monospace;
  background-color: #ecf0f1;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.small {
  font-size: 0.8rem;
}

.btn-copy {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px 8px;
  margin-left: 8px;
  transition: transform 0.2s;
}

.btn-copy:hover {
  transform: scale(1.2);
}

.info-section {
  background-color: #e8f4f8;
  border-left: 4px solid #3498db;
}

.info-section ul {
  margin: 0;
  padding-left: 20px;
}

.info-section li {
  margin-bottom: 8px;
  color: #2c3e50;
  line-height: 1.6;
}

.vote-result {
  background-color: #d4edda;
  border-left: 4px solid #2ecc71;
}

.vote-result h4 {
  color: #155724;
}

.candidate-name {
  font-size: 1.3rem;
  font-weight: 600;
  color: #155724;
}

.receipt-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn {
  padding: 12px 24px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.btn-secondary {
  background-color: #ecf0f1;
  color: #2c3e50;
}

.btn-secondary:hover {
  background-color: #bdc3c7;
  transform: translateY(-2px);
}

@media print {
  .receipt-actions {
    display: none;
  }
  
  .btn-copy {
    display: none;
  }
  
  .vote-receipt {
    box-shadow: none;
  }
}

@media (max-width: 600px) {
  .receipt-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .receipt-item .label {
    margin-bottom: 5px;
  }
  
  .receipt-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
