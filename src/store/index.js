import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  user:       null,
  agentDoc:   null,   // datos del agente en Firestore
  setUser:    (user)     => set({ user }),
  setAgentDoc:(agentDoc) => set({ agentDoc }),

  // ── Agent status ─────────────────────────────────────────────────────────
  // 'online' | 'break' | 'offline'
  agentStatus: 'online',
  setAgentStatus: (agentStatus) => set({ agentStatus }),

  // ── Conversations ─────────────────────────────────────────────────────────
  conversations:        [],
  activeConversationId: null,
  setConversations:     (conversations)        => set({ conversations }),
  setActiveConversation:(activeConversationId) => set({ activeConversationId }),
  updateConversation: (id, patch) => set(s => ({
    conversations: s.conversations.map(c => c.id === id ? { ...c, ...patch } : c)
  })),
  addConversation: (conv) => set(s => ({
    conversations: [conv, ...s.conversations]
  })),

  // ── Agents list (for admin) ───────────────────────────────────────────────
  agents: [],
  setAgents: (agents) => set({ agents }),

  // ── UI ────────────────────────────────────────────────────────────────────
  sidebarSection: 'conversations',
  setSidebarSection: (sidebarSection) => set({ sidebarSection }),
  toast: null,
  showToast: (msg, type = 'success') => {
    set({ toast: { msg, type } })
    setTimeout(() => set({ toast: null }), 2800)
  },
}))
