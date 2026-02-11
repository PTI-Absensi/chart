<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Masuk</h1>
      <p class="muted">Gunakan akun admin untuk mengakses dashboard.</p>
      <form @submit.prevent="submit">
        <label>
          Username
          <input v-model="username" type="text" autocomplete="username" required />
        </label>
        <label>
          Password
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit">Login</button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { setToken } from '../utils/auth'
import { apiFetch } from '../utils/api'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')

const submit = async () => {
  error.value = ''
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    const json = await res.json()
    if (!res.ok || json.status !== 'success') {
      error.value = json.detail || 'Login gagal'
      return
    }
    setToken(json.token)
    router.push('/')
  } catch (err) {
    error.value = 'Login gagal'
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-card {
  width: min(360px, 92vw);
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.login-card h1 {
  margin: 0 0 8px;
  font-family: var(--font-display);
}

.muted {
  color: var(--muted);
  margin: 0 0 16px;
}

form {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font-body);
}

button {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.error {
  color: #d9482f;
  font-size: 0.9rem;
}
</style>
