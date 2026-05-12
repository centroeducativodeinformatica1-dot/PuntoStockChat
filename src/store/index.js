import { create } from 'zustand'

export const useStore = create((set) => ({
  user:       null,
  agentDoc:   null,
  setUser:    (user)      => set({ user }),
  setAgentDoc:(agentDoc)  => set({ agentDoc }),

  agentStatus: 'online',
  setAgentStatus: (agentStatus) => set({ agentStatus }),

  conversations:        [],
  activeConversationId: null,
  setConversations:     (conversations)        => set({ conversations }),
  setActiveConversation:(activeConversationId) => set({ activeConversationId }),
  updateConversation: (id, patch) => set(s => ({
    conversations: s.conversations.map(c => c.id === id ? { ...c, ...patch } : c)
  })),
  addConversation: (conv) => set(s => ({ conversations: [conv, ...s.conversations] })),

  agents: [],
  setAgents: (agents) => set({ agents }),

  sidebarSection: 'conversations',
  setSidebarSection: (sidebarSection) => set({ sidebarSection }),

  toast: null,
  showToast: (msg, type = 'success') => {
    set({ toast: { msg, type } })
    setTimeout(() => set({ toast: null }), 2800)
  },
}))
