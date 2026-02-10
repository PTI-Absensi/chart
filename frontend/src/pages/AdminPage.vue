<template>
  <div class="page animate-in">
    <header class="page-header">
      <div>
        <h1>Admin</h1>
        <p class="muted">Role dan user (scaffolding).</p>
      </div>
    </header>

    <section class="card panel">
      <h2>Roles</h2>
      <div class="chip-row">
        <span v-for="role in roles" :key="role" class="chip">{{ role }}</span>
      </div>
    </section>

    <section class="card panel">
      <h2>Users</h2>
      <div v-if="users.length === 0" class="empty">Belum ada user.</div>
      <div class="user-list">
        <div v-for="user in users" :key="user.username" class="user-item">
          <strong>{{ user.username }}</strong>
          <span class="meta">{{ user.roles.join(', ') }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiFetch } from '../utils/api'

type User = { username: string; roles: string[] }

const roles = ref<string[]>([])
const users = ref<User[]>([])

const loadRoles = async () => {
  const res = await apiFetch('/permissions/roles')
  const json = await res.json()
  roles.value = json.data || []
}

const loadUsers = async () => {
  const res = await apiFetch('/permissions/users')
  const json = await res.json()
  users.value = json.data || []
}

onMounted(() => {
  loadRoles()
  loadUsers()
})
</script>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.muted {
  color: var(--muted);
}

.card.panel {
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  padding: 18px;
  box-shadow: var(--shadow-soft);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--surface);
}

.user-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.user-item {
  border: 1px solid var(--stroke);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.meta {
  color: var(--muted);
}

.empty {
  color: var(--muted);
  padding: 12px 0;
}
</style>
