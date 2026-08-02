<template>
  <div class="vote-receipt card glass">
    <div class="receipt-print-wrapper">
      <div class="receipt-header">
        <h3>
          <PhTicket :size="20" weight="fill" color="var(--accent)" /> Vote
          Receipt
        </h3>
        <p class="receipt-subtitle">Cryptographic proof of your vote</p>
      </div>

      <div class="receipt-body">
        <div class="receipt-warning-banner">
          <PhWarningCircle :size="20" weight="fill" class="warning-icon" />
          <div class="warning-content">
            <span class="warning-title">SECURITY WARNING</span>
            <p class="warning-text">
              This cryptographic receipt is only displayed
              <strong>once</strong>. For security and privacy, after leaving
              this page, these keys, signature, and nullifier
              <strong>cannot be retrieved or viewed again</strong>. Please copy
              your keys, or download/print this receipt now.
            </p>
          </div>
        </div>

        <div class="receipt-section">
          <h4>Election Information</h4>
          <div class="receipt-item">
            <span class="label">Election:</span>
            <span class="value">{{
              receipt.electionName || "Unknown Election"
            }}</span>
          </div>
          <div class="receipt-item">
            <span class="label">Description:</span>
            <span class="value">{{
              receipt.electionDescription || "No description available"
            }}</span>
          </div>
        </div>

        <div class="receipt-section">
          <h4>Transaction Details</h4>
          <div class="receipt-item">
            <span class="label">Transaction Hash:</span>
            <code class="value monospace">{{
              receipt.transactionHash || receipt.txHash
            }}</code>
            <button
              @click="
                copyToClipboard(receipt.transactionHash || receipt.txHash)
              "
              class="btn-copy"
              title="Copy"
            >
              <PhCopy :size="14" /> Copy
            </button>
          </div>
          <div class="receipt-item" v-if="receipt.nullifier">
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

      <div class="receipt-footer-print">
        ¦ VERIFIED ¦ This receipt serves as cryptographic proof of your vote on
        the blockchain. Share only the transaction hash for verification.
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
  PhWarningCircle,
} from "@phosphor-icons/vue";

export default {
  name: "VoteReceipt",
  components: {
    PhTicket,
    PhCopy,
    PhLockKey,
    PhInfo,
    PhDownload,
    PhPrinter,
    PhWarningCircle,
  },
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
      const filename = this.receipt.nullifier
        ? `vote-receipt-${this.receipt.nullifier.substring(0, 8)}.json`
        : `vote-receipt-${this.receipt.transactionHash?.substring(0, 8) || Date.now()}.json`;
      a.download = filename;
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

.receipt-warning-banner {
  display: flex;
  gap: var(--space-3);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid var(--error);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-5);
  align-items: flex-start;
  text-align: left;
}

.warning-icon {
  color: var(--error);
  flex-shrink: 0;
  margin-top: 2px;
}

.warning-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-title {
  font-weight: 700;
  color: var(--error);
  font-size: 0.95rem;
  letter-spacing: 0.5px;
}

.warning-text {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-primary);
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
  @page {
    margin: 0;
    size: auto;
  }

  /* Hide everything first */
  body > *:not(.vote-receipt),
  #app-root > *:not(.main-content),
  .main-content > *:not(.router-view),
  .vote-success > *:not(.success-card),
  .success-card > *:not(.vote-receipt) {
    display: none !important;
  }

  body * {
    visibility: hidden !important;
  }

  /* Force top alignment and remove gaps */
  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    background: #fff !important;
  }

  #app,
  #app-root,
  main,
  .main-content,
  .router-view,
  .vote-success,
  .success-card {
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: none !important;
    position: static !important;
  }

  /* Explicitly show and reset the receipt container */
  .vote-receipt,
  .vote-receipt * {
    visibility: visible !important;
  }

  /* Remove all navigation, footer, actions, and buttons */
  nav,
  .navbar,
  .nav-inner,
  footer,
  .footer,
  .receipt-actions,
  .actions,
  .btn-copy,
  .btn,
  button,
  .router-link-active,
  a {
    display: none !important;
  }

  .vote-receipt {
    display: block !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 10mm !important; /* Standard print margin */
    background: white !important;
    color: #1a1a2e !important;
    box-sizing: border-box !important;
  }

  .receipt-footer-print {
    display: block;
    text-align: center;
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid #dee2e6;
    font-size: 9px;
    color: #777;
    letter-spacing: 0.5px;
  }

  .receipt-print-wrapper {
    border: 3px double #1a1a2e;
    padding: 24px 24px 20px 24px;
    position: relative;
    background: white !important;
    margin: 0 auto;
    box-sizing: border-box;
    width: 100%;
  }

  .receipt-print-wrapper::before {
    content: "BLOCKCHAIN VOTING SYSTEM";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 0 12px;
    font-size: 10px;
    letter-spacing: 2px;
    color: #666;
    font-weight: 600;
  }

  .receipt-header {
    text-align: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #1a1a2e;
    page-break-after: avoid;
  }

  .receipt-header h3 {
    color: #1a1a2e;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin: 0 0 4px;
    display: block;
  }

  .receipt-header h3 svg {
    display: none !important;
  }

  .receipt-header h3::after {
    content: "OFFICIAL VOTE RECEIPT";
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    color: #555;
    margin-top: 4px;
  }

  .receipt-subtitle {
    color: #666;
    margin: 4px 0 0;
    font-size: 11px;
    font-style: italic;
  }

  .receipt-body {
    margin-bottom: 0;
  }

  .receipt-warning-banner {
    display: flex;
    gap: 12px;
    background: #fdf3f4 !important;
    border: 1px solid #dc3545 !important;
    border-left: 4px solid #dc3545 !important;
    border-radius: 4px;
    padding: 10px 14px;
    margin-bottom: 14px;
    align-items: flex-start;
    text-align: left;
  }

  .warning-icon {
    color: #dc3545 !important;
    flex-shrink: 0;
    margin-top: 1px;
    display: inline-block !important;
  }

  .warning-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .warning-title {
    font-weight: 700;
    color: #dc3545;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  .warning-text {
    margin: 0;
    font-size: 10px;
    line-height: 1.4;
    color: #333;
  }

  .receipt-section {
    background: #f8f9fa !important;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }

  .receipt-section h4 {
    color: #1a1a2e;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #dee2e6;
    display: block;
  }

  .receipt-section h4 svg {
    display: none !important;
  }

  .receipt-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 6px;
    gap: 6px;
  }

  .receipt-item:last-child {
    margin-bottom: 0;
  }

  .receipt-item .label {
    color: #555;
    font-weight: 600;
    min-width: 130px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .receipt-item .label::after {
    content: ":";
  }

  .receipt-item .value {
    color: #1a1a2e;
    flex: 1;
    word-break: break-all;
    font-size: 11px;
    line-height: 1.4;
    font-weight: 500;
  }

  .monospace {
    font-family: "Courier New", Courier, monospace !important;
    background: white !important;
    border: 1px solid #ddd !important;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 10px;
    color: #222;
    word-break: break-all;
  }

  .small {
    font-size: 9px;
  }

  .info-section {
    background: #fdfdfd !important;
    border: 1px solid #dee2e6;
    border-left: 4px solid #1a1a2e !important;
  }

  .info-section ul {
    margin: 4px 0;
    padding-left: 14px;
    list-style: none;
  }

  .info-section li {
    color: #333;
    margin-bottom: 4px;
    line-height: 1.4;
    font-size: 10px;
    position: relative;
    padding-left: 10px;
  }

  .info-section li::before {
    content: "◆";
    position: absolute;
    left: 0;
    color: #1a1a2e;
    font-size: 8px;
    top: 1px;
  }

  .info-section li:last-child {
    margin-bottom: 0;
  }

  .info-section li strong {
    color: #1a1a2e;
    font-weight: 700;
  }

  .receipt-header,
  .receipt-section h4,
  .receipt-section,
  .receipt-warning-banner {
    page-break-inside: avoid;
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
