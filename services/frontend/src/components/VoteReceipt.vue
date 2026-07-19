<template>
  <div class="vote-receipt card glass">
    <div class="receipt-header">
      <h3>
        <PhTicket :size="20" weight="fill" color="var(--accent)" /> Vote Receipt
      </h3>
      <p class="receipt-subtitle">Cryptographic proof of your vote</p>
    </div>

    <div class="receipt-body">
      <div class="receipt-section">
        <h4>Transaction Details</h4>
        <div class="receipt-item">
          <span class="label">Transaction Hash:</span>
          <code class="value monospace">{{
            receipt.transactionHash || receipt.txHash
          }}</code>
          <button
            @click="copyToClipboard(receipt.transactionHash || receipt.txHash)"
            class="btn-copy"
            title="Copy"
          >
            <PhCopy :size="14" /> Copy
          </button>
        </div>
        <div class="receipt-item">
          <span class="label">Nullifier:</span>
          <code class="value monospace">{{ receipt.nullifier }}</code>
          <button
            @click="copyToClipboard(receipt.nullifier)"
            class="btn-copy"
            title="Copy"
          >
            <PhCopy :size="14" /> Copy
          </button>
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
          <code class="value monospace small">{{
            truncate(receipt.signature, 32)
          }}</code>
        </div>
        <div class="receipt-item">
          <span class="label">Encryption:</span>
          <span class="value"
            ><PhLockKey :size="14" weight="fill" color="var(--success)" />
            RSA-OAEP 2048-bit</span
          >
        </div>
      </div>

      <div class="receipt-section info-section">
        <h4><PhInfo :size="16" weight="fill" /> Important Information</h4>
        <ul>
          <li>
            <strong>Privacy Protected:</strong> This receipt cannot be used to
            reveal who you voted for.
          </li>
          <li>
            <strong>Verifiable:</strong> You can verify your vote was counted
            without revealing your choice.
          </li>
          <li>
            <strong>Keep This Safe:</strong> Save this receipt to verify your
            vote later.
          </li>
          <li>
            <strong>Nullifier:</strong> Unique identifier that prevents
            double-voting while preserving anonymity.
          </li>
        </ul>
      </div>
    </div>

    <div class="receipt-actions">
      <button @click="downloadReceipt" class="btn btn-primary">
        <PhDownload :size="16" /> Download Receipt
      </button>
      <button @click="printReceipt" class="btn btn-secondary">
        <PhPrinter :size="16" /> Print Receipt
      </button>
    </div>
  </div>
</template>

<script>
import {
  PhTicket,
  PhCopy,
  PhLockKey,
  PhInfo,
  PhDownload,
  PhPrinter,
} from "@phosphor-icons/vue";

export default {
  name: "VoteReceipt",
  components: { PhTicket, PhCopy, PhLockKey, PhInfo, PhDownload, PhPrinter },
  props: {
    receipt: {
      type: Object,
      required: true,
    },
  },
  methods: {
    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    },

    truncate(str, length) {
      if (!str) return "";
      if (str.length <= length) return str;
      return str.substring(0, length) + "..." + str.substring(str.length - 8);
    },

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    },

    downloadReceipt() {
      const receiptData = {
        type: "Blockchain Voting Receipt",
        ...this.receipt,
        downloadedAt: new Date().toISOString(),
        warning:
          "This receipt is for verification purposes only and cannot be used to reveal voting choices.",
      };

      const blob = new Blob([JSON.stringify(receiptData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vote-receipt-${this.receipt.nullifier.substring(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    printReceipt() {
      window.print();
    },
  },
};
</script>

<style scoped>
.vote-receipt {
  padding: var(--space-6);
  max-width: 700px;
  margin: 0 auto;
}

.receipt-header {
  text-align: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 2px solid var(--accent);
}

.receipt-header h3 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2) 0;
  color: var(--text-primary);
  font-size: 1.4rem;
}

.receipt-subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.85rem;
}

.receipt-body {
  margin-bottom: var(--space-6);
}

.receipt-section {
  margin-bottom: var(--space-5);
  padding: var(--space-4);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.receipt-section h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3) 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.receipt-item {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  gap: var(--space-2);
}

.receipt-item .label {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 140px;
  font-size: 0.85rem;
}

.receipt-item .value {
  color: var(--text-primary);
  flex: 1;
  word-break: break-all;
}

.monospace {
  font-family: var(--font-mono);
  background: var(--bg-card);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  word-break: break-all;
  border: 1px solid var(--border);
}

.small {
  font-size: 0.8rem;
}

.btn-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  padding: 3px 8px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-copy:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.info-section {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-left: 4px solid var(--accent);
}

.info-section ul {
  margin: 0;
  padding-left: var(--space-5);
}

.info-section li {
  margin-bottom: var(--space-2);
  color: var(--text-primary);
  line-height: 1.6;
  font-size: 0.85rem;
}

.receipt-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-3);
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
    border: 1px solid #ccc;
  }
}

@media (max-width: 600px) {
  .receipt-item {
    flex-direction: column;
    align-items: flex-start;
  }
  .receipt-item .label {
    margin-bottom: var(--space-1);
    min-width: auto;
  }
  .receipt-actions {
    flex-direction: column;
  }
  .btn {
    width: 100%;
  }
}
</style>
