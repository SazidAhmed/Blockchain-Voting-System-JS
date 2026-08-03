<template>
  <div class="explorer">
    <!-- Header -->
    <div class="explorer-header">
      <div class="header-left">
        <h1>
          <PhLink :size="24" weight="fill" color="var(--accent)" /> Blockchain
          Explorer
        </h1>
        <p>Inspect every block and transaction on the voting chain</p>
      </div>
      <div class="header-right">
        <span class="node-badge" :class="nodeHealthClass">
          <PhCheckCircle
            v-if="nodeStatus.status === 'healthy'"
            :size="14"
            weight="fill"
            color="var(--success)"
          />
          <PhXCircle v-else :size="14" weight="fill" color="var(--error)" />
          {{ nodeStatus.status || "connecting…" }}
        </span>
        <button class="btn-refresh" @click="loadAll" :disabled="loading">
          {{ loading ? "⟳ Loading…" : "⟳ Refresh" }}
        </button>
        <label class="auto-refresh-toggle">
          <input type="checkbox" v-model="autoRefresh" class="toggle-input" />
          <span class="toggle-track" aria-hidden="true"></span>
          <span class="toggle-text">Auto-refresh 10s</span>
        </label>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-label">Nodes</div>
        <div class="stat-value" :class="nodesHealthClass">
          {{ networkStatus.healthyNodes ?? "—"
          }}<span class="stat-sub">/{{ networkStatus.totalNodes ?? "—" }}</span>
        </div>
        <div class="stat-hint">healthy</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Chain Height</div>
        <div class="stat-value">{{ chain.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Votes</div>
        <div class="stat-value">{{ totalVotes }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Last Block</div>
        <div class="stat-value">{{ lastBlockAge }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Validator</div>
        <div class="stat-value">{{ nodeStatus.nodeId || "—" }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Uptime</div>
        <div class="stat-value">{{ nodeStatus.uptimeFormatted || "—" }}</div>
      </div>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <PhMagnifyingGlass
          :size="16"
          color="var(--text-muted)"
          class="search-icon"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by block #, block hash, or transaction hash…"
          class="search-input"
        />
      </div>
      <button v-if="searchQuery" class="btn-clear" @click="searchQuery = ''">
        ✕ Clear
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-banner">
      <PhWarning :size="16" /> {{ error }}
    </div>

    <!-- Block List -->
    <div v-if="!loading || chain.length" class="block-list">
      <div
        v-for="block in pagedChain"
        :key="block.index"
        class="block-card"
        :class="{
          expanded: expandedBlock === block.index,
          genesis: block.index === 0,
        }"
        @click="toggleBlock(block.index)"
      >
        <!-- Block Summary Row -->
        <div class="block-summary">
          <div class="block-index">
            <span
              class="badge"
              :class="block.index === 0 ? 'badge-genesis' : 'badge-block'"
            >
              {{ block.index === 0 ? "Genesis" : `#${block.index}` }}
            </span>
          </div>

          <div class="block-hash">
            <span class="label">Hash</span>
            <code class="hash">{{ short(block.hash) }}</code>
          </div>

          <div class="block-txs">
            <span class="label">Transactions</span>
            <span class="tx-count">{{ txCount(block) }}</span>
          </div>

          <div class="block-validator">
            <span class="label">Validator</span>
            <span>{{ block.validator || "genesis" }}</span>
          </div>

          <div class="block-time">
            <span class="label">Time</span>
            <span>{{ formatTime(block.timestamp) }}</span>
          </div>

          <div class="expand-icon">
            <PhCaretUp v-if="expandedBlock === block.index" :size="14" />
            <PhCaretDown v-else :size="14" />
          </div>
        </div>

        <!-- Block Detail Panel -->
        <transition name="slide">
          <div
            v-if="expandedBlock === block.index"
            class="block-detail"
            @click.stop
          >
            <div class="detail-grid">
              <div class="detail-section">
                <h3>Block Info</h3>
                <div class="detail-row">
                  <span class="key">Index</span>
                  <span class="val">{{ block.index }}</span>
                </div>
                <div class="detail-row">
                  <span class="key">Timestamp</span>
                  <span class="val">{{ formatFullTime(block.timestamp) }}</span>
                </div>
                <div class="detail-row">
                  <span class="key">Nonce</span>
                  <span class="val">{{ block.nonce }}</span>
                </div>
                <div class="detail-row">
                  <span class="key">Validator</span>
                  <span class="val">{{ block.validator || "genesis" }}</span>
                </div>
              </div>

              <div class="detail-section">
                <h3>Cryptographic Data</h3>
                <div class="detail-row">
                  <span class="key">Hash</span>
                  <code
                    class="hash-full copyable"
                    @click="copy(block.hash)"
                    title="Click to copy"
                    >{{ block.hash }}</code
                  >
                </div>
                <div class="detail-row">
                  <span class="key">Prev Hash</span>
                  <code
                    class="hash-full copyable"
                    @click="copy(block.previousHash)"
                    title="Click to copy"
                    >{{ block.previousHash }}</code
                  >
                </div>
                <div class="detail-row">
                  <span class="key">Merkle Root</span>
                  <code
                    class="hash-full copyable"
                    @click="copy(block.merkleRoot)"
                    title="Click to copy"
                    >{{ block.merkleRoot }}</code
                  >
                </div>
                <div class="detail-row" v-if="block.signature">
                  <span class="key">Signature</span>
                  <code
                    class="hash-full copyable"
                    @click="copy(block.signature)"
                    title="Click to copy"
                    >{{ block.signature }}</code
                  >
                </div>
              </div>
            </div>

            <!-- Transactions -->
            <div class="transactions-section">
              <h3>
                Transactions
                <span class="tx-badge">{{ txCount(block) }}</span>
              </h3>

              <div v-if="block.index === 0" class="genesis-msg">
                <PhLeaf :size="16" /> Genesis Block — {{ block.data.message }}
              </div>

              <div v-else-if="txCount(block) === 0" class="no-tx">
                No transactions in this block.
              </div>

              <div
                v-for="(tx, i) in block.data.transactions"
                :key="i"
                class="tx-card"
              >
                <div class="tx-header">
                  <span class="tx-type" :class="tx.type">{{ tx.type }}</span>
                  <span class="tx-election" v-if="tx.electionId"
                    >Election #{{ tx.electionId }}</span
                  >
                  <span class="tx-time">{{
                    formatFullTime(tx.timestamp)
                  }}</span>
                </div>
                <div class="tx-body">
                  <div class="tx-row" v-if="tx.nullifier">
                    <span class="key">Nullifier</span>
                    <code
                      class="hash-full copyable"
                      @click="copy(tx.nullifier)"
                      title="Click to copy"
                      >{{ tx.nullifier }}</code
                    >
                  </div>
                  <div class="tx-row" v-if="tx.transactionHash">
                    <span class="key">Transaction Hash</span>
                    <code
                      class="hash-full copyable"
                      @click="copy(tx.transactionHash)"
                      title="Click to copy"
                      >{{ tx.transactionHash }}</code
                    >
                  </div>
                  <div class="tx-row" v-if="tx.encryptedBallot">
                    <span class="key">Encrypted Ballot</span>
                    <code
                      class="hash-full copyable"
                      @click="copy(tx.encryptedBallot)"
                      title="Click to copy"
                      >{{ tx.encryptedBallot }}</code
                    >
                  </div>
                  <div class="tx-row" v-if="tx.signature">
                    <span class="key">Signature</span>
                    <code
                      class="hash-full copyable"
                      @click="copy(tx.signature)"
                      title="Click to copy"
                      >{{ short(tx.signature, 40) }}</code
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div v-if="filteredChain.length === 0 && !loading" class="no-results">
        No blocks match your search.
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <div class="pagination-info">{{ paginationInfo }}</div>
        <div class="pagination-controls">
          <button
            class="page-btn"
            @click="prevPage"
            :disabled="currentPage === 1"
          >
            &#8249;
          </button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            class="page-btn"
            :class="{ active: p === currentPage, ellipsis: p === '...' }"
            :disabled="p === '...'"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="page-btn"
            @click="nextPage"
            :disabled="currentPage === totalPages"
          >
            &#8250;
          </button>
        </div>
        <div class="page-size-selector">
          <label>Per page:</label>
          <select v-model.number="pageSize" @change="currentPage = 1">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-else class="loading-state">
      <div class="skeleton" v-for="n in 3" :key="n"></div>
    </div>

    <!-- Copy toast -->
    <transition name="toast-fade">
      <div v-if="copyToast" class="copy-toast">
        <PhCheckCircle :size="14" /> Copied to clipboard
      </div>
    </transition>
  </div>
</template>

<script>
import axios from "axios";
import {
  PhLink,
  PhCheckCircle,
  PhXCircle,
  PhWarning,
  PhLeaf,
  PhCaretUp,
  PhCaretDown,
  PhMagnifyingGlass,
} from "@phosphor-icons/vue";

const BLOCKCHAIN_URL =
  import.meta.env.VITE_BLOCKCHAIN_URL || "http://localhost:3001";

const blockchainHeaders = import.meta.env.VITE_BLOCKCHAIN_API_KEY
  ? { "x-api-key": import.meta.env.VITE_BLOCKCHAIN_API_KEY }
  : {};

export default {
  name: "BlockchainExplorer",

  components: {
    PhLink,
    PhCheckCircle,
    PhXCircle,
    PhWarning,
    PhLeaf,
    PhCaretUp,
    PhCaretDown,
    PhMagnifyingGlass,
  },

  data() {
    return {
      chain: [],
      nodeStatus: {},
      networkStatus: {},
      loading: false,
      error: null,
      expandedBlock: null,
      searchQuery: "",
      autoRefresh: false,
      refreshTimer: null,
      copyToast: false,
      now: Date.now(),
      clockTimer: null,
      currentPage: 1,
      pageSize: 10,
    };
  },

  computed: {
    totalVotes() {
      return this.chain.reduce((sum, b) => {
        const txs = b.data?.transactions || [];
        return sum + txs.filter((t) => t.type === "VOTE").length;
      }, 0);
    },

    lastBlockAge() {
      if (!this.chain.length) return "—";
      const last = this.chain[this.chain.length - 1];
      const diff = Math.floor((this.now - last.timestamp) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return `${Math.floor(diff / 3600)}h ago`;
    },

    filteredChain() {
      if (!this.searchQuery.trim()) return [...this.chain].reverse();
      const q = this.searchQuery.trim().toLowerCase();
      return [...this.chain]
        .filter((b) => this.blockMatchesSearch(b, q))
        .reverse();
    },

    totalPages() {
      return Math.max(1, Math.ceil(this.filteredChain.length / this.pageSize));
    },

    pagedChain() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredChain.slice(start, start + this.pageSize);
    },

    pageNumbers() {
      const total = this.totalPages;
      const current = this.currentPage;
      if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
      const pages = [];
      pages.push(1);
      if (current > 3) pages.push("...");
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push("...");
      pages.push(total);
      return pages;
    },

    paginationInfo() {
      const total = this.filteredChain.length;
      if (total === 0) return "";
      const start = (this.currentPage - 1) * this.pageSize + 1;
      const end = Math.min(this.currentPage * this.pageSize, total);
      return `Showing ${start}–${end} of ${total} blocks`;
    },

    nodeHealthClass() {
      return this.nodeStatus.status === "healthy"
        ? "node-healthy"
        : "node-unhealthy";
    },

    nodesHealthClass() {
      const { healthyNodes, totalNodes } = this.networkStatus;
      if (!totalNodes) return "";
      return healthyNodes === totalNodes
        ? "nodes-all-healthy"
        : "nodes-degraded";
    },
  },

  methods: {
    async loadAll() {
      this.loading = true;
      this.error = null;
      try {
        const [chainRes, statusRes, networkRes] = await Promise.all([
          axios.get(`${BLOCKCHAIN_URL}/chain`, { headers: blockchainHeaders }),
          axios.get(`${BLOCKCHAIN_URL}/node/status`, {
            headers: blockchainHeaders,
          }),
          axios.get(`${BLOCKCHAIN_URL}/network/status`, {
            headers: blockchainHeaders,
          }),
        ]);
        this.chain = chainRes.data.chain || [];
        this.nodeStatus = statusRes.data || {};
        this.networkStatus = networkRes.data || {};
      } catch (e) {
        this.error = `Cannot connect to blockchain node at ${BLOCKCHAIN_URL} — is it running?`;
      } finally {
        this.loading = false;
      }
    },

    toggleBlock(index) {
      this.expandedBlock = this.expandedBlock === index ? null : index;
    },

    goToPage(p) {
      if (p === "..." || p < 1 || p > this.totalPages) return;
      this.currentPage = p;
      this.expandedBlock = null;
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    prevPage() {
      if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
    },
    nextPage() {
      if (this.currentPage < this.totalPages)
        this.goToPage(this.currentPage + 1);
    },

    txCount(block) {
      return block.data?.transactions?.length || 0;
    },

    blockMatchesSearch(block, query) {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        block.index.toString() === q ||
        block.hash.toLowerCase().includes(q) ||
        block.previousHash?.toLowerCase().includes(q) ||
        (block.data?.transactions || []).some(
          (tx) =>
            tx.transactionHash?.toLowerCase().includes(q) ||
            tx.nullifier?.toLowerCase().includes(q) ||
            tx.signature?.toLowerCase().includes(q) ||
            tx.electionId?.toString() === q,
        )
      );
    },

    short(str, len = 16) {
      if (!str) return "—";
      return str.length > len * 2 + 3
        ? `${str.slice(0, len)}…${str.slice(-len)}`
        : str;
    },

    formatTime(ts) {
      const d = new Date(ts);
      return d.toLocaleString();
    },

    formatFullTime(ts) {
      if (!ts) return "—";
      return new Date(ts).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    },

    async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.copyToast = true;
        setTimeout(() => {
          this.copyToast = false;
        }, 2000);
      } catch {}
    },

    startAutoRefresh() {
      this.stopAutoRefresh();
      this.refreshTimer = setInterval(this.loadAll, 10000);
    },

    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },
  },

  watch: {
    autoRefresh(val) {
      val ? this.startAutoRefresh() : this.stopAutoRefresh();
    },
    searchQuery() {
      this.currentPage = 1;
      this.expandedBlock = null;
    },
  },

  async mounted() {
    await this.loadAll();
    this.clockTimer = setInterval(() => {
      this.now = Date.now();
    }, 1000);
  },

  beforeUnmount() {
    this.stopAutoRefresh();
    if (this.clockTimer) clearInterval(this.clockTimer);
  },
};
</script>

<style scoped>
/* ── Base ── */
.explorer {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px;
  font-family: var(--font-sans);
  color: var(--text-primary);
}

/* ── Header ── */
.explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}
.explorer-header h1 {
  margin: 0 0 4px;
  font-size: 1.8rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.explorer-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.node-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
}
.node-healthy {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}
.node-unhealthy {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
}

.btn-refresh {
  padding: 8px 16px;
  background: var(--accent);
  color: var(--bg-card);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: opacity 0.2s;
}
.btn-refresh:hover:not(:disabled) {
  opacity: 0.85;
}
.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auto-refresh-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.auto-refresh-toggle .toggle-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.auto-refresh-toggle .toggle-track {
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.auto-refresh-toggle .toggle-track::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-card);
  box-shadow: var(--shadow);
  transform: translateY(-50%);
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.auto-refresh-toggle .toggle-input:checked + .toggle-track {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  border-color: var(--accent);
}

.auto-refresh-toggle .toggle-input:checked + .toggle-track::after {
  transform: translate(18px, -50%);
  background: var(--accent);
}

.auto-refresh-toggle .toggle-text {
  font-weight: 600;
}

/* ── Stats Bar ── */
.stats-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.stat-card {
  flex: 1;
  min-width: 130px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow);
}
.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-sub {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--text-muted);
}
.stat-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 2px;
}
.nodes-all-healthy {
  color: var(--success);
}
.nodes-degraded {
  color: var(--warning);
}

/* ── Search ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0 12px;
  transition: border-color 0.2s;
}
.search-input-wrapper:focus-within {
  border-color: var(--accent);
}
.search-icon {
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  outline: none;
  color: var(--text-primary);
}
.btn-clear {
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.btn-clear:hover {
  background: var(--border);
}

/* ── Error ── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  margin-bottom: 16px;
  color: var(--warning);
}

/* ── Block List ── */
.block-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
}
.block-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--border-hover);
}
.block-card.genesis {
  border-left: 4px solid var(--success);
}
.block-card.expanded {
  border-color: var(--accent);
  box-shadow: var(--shadow-lg);
}

/* ── Block Summary ── */
.block-summary {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  flex-wrap: wrap;
}
.block-index {
  min-width: 80px;
}
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
}
.badge-genesis {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}
.badge-block {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}

.block-hash,
.block-txs,
.block-validator,
.block-time {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 120px;
}
.label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}
code.hash {
  font-size: 0.82rem;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  color: var(--text-primary);
}
.tx-count {
  font-weight: 700;
  color: var(--error);
  font-size: 1rem;
}
.expand-icon {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.8rem;
}

/* ── Block Detail ── */
.block-detail {
  border-top: 1px solid var(--border);
  padding: 20px;
  background: var(--bg-secondary);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}
@media (max-width: 700px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.detail-section h3 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin: 0 0 12px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}
.detail-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
}
.detail-row .key {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.detail-row .val {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
}
code.hash-full {
  font-size: 0.75rem;
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  color: var(--text-primary);
  word-break: break-all;
}
code.copyable {
  cursor: pointer;
  transition: background 0.15s;
}
code.copyable:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

/* ── Transactions ── */
.transactions-section h3 {
  font-size: 1rem;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tx-badge {
  background: var(--error);
  color: var(--bg-card);
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 700;
}
.genesis-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}
.no-tx {
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.9rem;
}
.tx-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
  overflow: hidden;
}
.tx-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.tx-type {
  font-weight: 700;
  font-size: 0.8rem;
  padding: 3px 10px;
  border-radius: 12px;
  text-transform: uppercase;
}
.tx-type.VOTE {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.tx-type.ELECTION {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  color: var(--warning);
}
.tx-election {
  font-size: 0.82rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 3px 8px;
  border-radius: 10px;
}
.tx-time {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-left: auto;
}
.tx-body {
  padding: 10px 14px;
}
.tx-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}
.tx-row .key {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ── Loading skeleton ── */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton {
  height: 72px;
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--border) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  border-radius: var(--radius-lg);
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ── Pagination ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 20px 0 4px;
  border-top: 1px solid var(--border);
  margin-top: 8px;
}
.pagination-info {
  font-size: 0.82rem;
  color: var(--text-muted);
}
.pagination-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled):not(.ellipsis) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}
.page-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg-card);
  font-weight: 700;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.page-btn.ellipsis {
  cursor: default;
  border-color: transparent;
  background: transparent;
}
.page-size-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-muted);
}
.page-size-selector select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  outline: none;
  cursor: pointer;
  background: var(--bg-card);
  color: var(--text-primary);
}

/* ── No results ── */
.no-results {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-size: 1rem;
}

/* ── Slide transition ── */
.slide-enter-active,
.slide-leave-active {
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease;
  overflow: hidden;
  max-height: 2000px;
}
.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Toast ── */
.copy-toast {
  display: flex;
  align-items: center;
  gap: 6px;
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--text-primary);
  color: var(--bg-card);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  z-index: 9999;
  box-shadow: var(--shadow-lg);
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}
</style>
