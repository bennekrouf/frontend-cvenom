import { ChatMessage } from "@/types/chat";

const CHAT_STORAGE_KEY = 'cvenom_chat_state';

export const useChatPersistence = () => {
  const saveChat = (messages: ChatMessage[]) => {
    try {
      console.log('💾 Saving chat:', messages.length, 'messages');
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save chat state:', error);
    }
  };

  const loadChat = (): ChatMessage[] => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      console.log('📂 Loading chat - raw data:', saved);
      if (!saved) {
        console.log('📂 No saved chat found');
        return [];
      }

      const messages = JSON.parse(saved);
      const parsedMessages = messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      console.log('📂 Loaded chat:', parsedMessages.length, 'messages');
      return parsedMessages;
    } catch (error) {
      console.warn('Failed to load chat state:', error);
      return [];
    }
  };

  const clearChat = () => {
    console.log('🗑️ Clearing chat');
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return { saveChat, loadChat, clearChat };
};
