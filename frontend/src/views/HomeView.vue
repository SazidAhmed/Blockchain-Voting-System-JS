<template>
  <div class="home">
    <div class="hero">
      <h1>University Blockchain Voting System</h1>
      <p>A secure, transparent, and verifiable voting platform</p>
      <div class="cta-buttons" v-if="!isAuthenticated">
        <router-link to="/login" class="btn btn-primary">Login</router-link>
        <router-link to="/register" class="btn btn-secondary">Register</router-link>
      </div>
      <div v-else>
        <router-link to="/elections" class="btn btn-primary">View Elections</router-link>
      </div>
    </div>

    <div class="features">
      <div class="feature">
        <h3>Secure</h3>
        <p>End-to-end encryption ensures your vote remains private while being verifiable.</p>
      </div>
      <div class="feature">
        <h3>Transparent</h3>
        <p>Blockchain technology provides a transparent and immutable record of all votes.</p>
      </div>
      <div class="feature">
        <h3>Accessible</h3>
        <p>Vote from anywhere on campus using your university credentials.</p>
      </div>
    </div>

    <div class="how-it-works">
      <h2>How It Works</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <h4>Register</h4>
          <p>Create an account using your university ID</p>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <h4>Verify</h4>
          <p>Verify your identity to receive voting credentials</p>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <h4>Vote</h4>
          <p>Cast your encrypted vote in active elections</p>
        </div>
        <div class="step">
          <div class="step-number">4</div>
          <h4>Verify</h4>
          <p>Verify your vote was counted correctly</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'HomeView',
  computed: {
    ...mapGetters(['isAuthenticated'])
  }
}
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.hero {
  text-align: center;
  padding: 60px 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 40px;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: #2c3e50;
}

.hero p {
  font-size: 1.2rem;
  color: #6c757d;
  margin-bottom: 30px;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-secondary {
  background-color: #ecf0f1;
  color: #2c3e50;
}

.btn-secondary:hover {
  background-color: #bdc3c7;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
}

.feature {
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.feature h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: #2c3e50;
}

.how-it-works {
  text-align: center;
  margin-bottom: 60px;
}

.how-it-works h2 {
  font-size: 2rem;
  margin-bottom: 40px;
  color: #2c3e50;
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 30px;
}

.step {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #3498db;
  color: white;
  border-radius: 50%;
  margin: 0 auto 15px;
  font-weight: bold;
}

.step h4 {
  margin-bottom: 10px;
  color: #2c3e50;
}
</style>