<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="handleCancel">
        <div class="modal-card glass" :class="`modal-${type}`">
          <div class="modal-icon">
            <PhCheckCircle
              v-if="type === 'success'"
              :size="40"
              weight="fill"
              color="var(--success)"
            />
            <PhXCircle
              v-else-if="type === 'error'"
              :size="40"
              weight="fill"
              color="var(--error)"
            />
            <PhWarning
              v-else-if="type === 'warning'"
              :size="40"
              weight="fill"
              color="var(--warning)"
            />
            <PhInfo v-else :size="40" weight="fill" color="var(--accent)" />
          </div>
          <h3 class="modal-title">{{ title }}</h3>
          <p class="modal-message">{{ message }}</p>
          <div class="modal-actions">
            <button
              v-if="showCancel"
              class="btn btn-secondary"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="btn"
              :class="type === 'error' ? 'btn-danger' : 'btn-primary'"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import {
  PhCheckCircle,
  PhXCircle,
  PhWarning,
  PhInfo,
} from "@phosphor-icons/vue";

export default {
  name: "AppModal",
  components: { PhCheckCircle, PhXCircle, PhWarning, PhInfo },
  props: {
    show: { type: Boolean, default: false },
    type: { type: String, default: "info" },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    confirmText: { type: String, default: "OK" },
    cancelText: { type: String, default: "Cancel" },
    showCancel: { type: Boolean, default: false },
  },
  emits: ["confirm", "cancel"],
  methods: {
    handleConfirm() {
      this.$emit("confirm");
    },
    handleCancel() {
      this.$emit("cancel");
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-card {
  max-width: 420px;
  width: 100%;
  padding: 32px 28px 24px;
  border-radius: var(--radius-lg);
  text-align: center;
}

.modal-icon {
  margin-bottom: 16px;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.modal-message {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.modal-card.modal-success {
  border-top: 3px solid var(--success);
}
.modal-card.modal-error {
  border-top: 3px solid var(--error);
}
.modal-card.modal-warning {
  border-top: 3px solid var(--warning);
}
.modal-card.modal-info {
  border-top: 3px solid var(--accent);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card {
  transform: scale(0.9);
  opacity: 0;
}
.modal-leave-to .modal-card {
  transform: scale(0.9);
  opacity: 0;
}
</style>
