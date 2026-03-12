import { ChatMessage } from "@/types/chat";

/** One localStorage key per profile — chat histories never bleed across profiles. */
const storageKey = (profileName?: string) =>
  profileName ? `cvenom_chat_${profileName}` : 'cvenom_chat_global';

export const useChatPersistence = (profileName?: string) => {
  const saveChat = (messages: ChatMessage[]) => {
    try {
      localStorage.setItem(storageKey(profileName), JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save chat state:', error);
    }
  };

  const loadChat = (): ChatMessage[] => {
    try {
      const saved = localStorage.getItem(storageKey(profileName));
      if (!saved) return [];
      const messages = JSON.parse(saved);
      return messages.map((msg: ChatMessage & { timestamp: string }) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.warn('Failed to load chat state:', error);
      return [];
    }
  };

  const clearChat = () => {
    localStorage.removeItem(storageKey(profileName));
  };

  return { saveChat, loadChat, clearChat };
};
