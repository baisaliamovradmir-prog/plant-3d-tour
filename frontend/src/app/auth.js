// Вход и роли (ФТ-1, ФТ-2). Токен и пользователь хранятся в localStorage, клиент API
// подставляет токен в заголовок Authorization. Права по-настоящему проверяет сервер (НФТ-5),
// здесь роль нужна только чтобы не показывать недоступные разделы.
import { create } from 'zustand'
import { api, ROLES } from '../3d'

const TOKEN_KEY = 'auth.token'
const USER_KEY = 'auth.user'

function read(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    /* приватный режим — вход живёт до перезагрузки */
  }
}
function readUser() {
  try {
    return JSON.parse(read(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuth = create((set, get) => ({
  user: read(TOKEN_KEY) ? readUser() : null,

  async login(credentials) {
    const { token, user } = await api.login(credentials)
    write(TOKEN_KEY, token)
    write(USER_KEY, JSON.stringify(user))
    set({ user })
    return user
  },
  async register(data) {
    const { token, user } = await api.register(data)
    write(TOKEN_KEY, token)
    write(USER_KEY, JSON.stringify(user))
    set({ user })
    return user
  },
  logout() {
    write(TOKEN_KEY, null)
    write(USER_KEY, null)
    set({ user: null })
  },
  // 152-ФЗ: удаление аккаунта по запросу пользователя
  async deleteAccount() {
    const { user } = get()
    if (!user) return
    await api.deleteAccount(user.email)
    get().logout()
  },
}))

// Какие разделы доступны ролям.
export const CAN = {
  dashboard: ['manager', 'admin'],
  editor: ['editor', 'admin'],
}

export function can(user, what) {
  return !!user && CAN[what].includes(user.role)
}

export const roleName = (role) => ROLES[role] || role
