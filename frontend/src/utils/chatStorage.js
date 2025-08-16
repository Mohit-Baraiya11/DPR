const CHAT_STORAGE_KEY = 'dpr_chat_history';

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => new Date().toISOString().split('T')[0];

// Save chat history for a specific sheet and date
export const saveChatHistory = (sheetId, messages) => {
  try {
    if (!sheetId || !messages || messages.length === 0) return null;
    
    const allChats = getAllChats();
    const now = new Date().toISOString();
    const today = getCurrentDate();
    
    // Create a unique key combining sheetId and date
    const chatKey = `${sheetId}_${today}`;
    
    // Check if a chat already exists for this sheet and date
    const existingChat = allChats[chatKey];
    
    // If no existing chat or we want to force a new one
    const chat = existingChat || {
      id: chatKey,
      sheetId,
      date: today,
      createdAt: now,
      messages: []
    };
    
    chat.title = new Date(today).toLocaleDateString();
    chat.messages = [...messages];
    chat.updatedAt = now;
    
    // Save to storage
    allChats[chatKey] = chat;
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allChats));
    
    return chat;
  } catch (error) {
    console.error('Error saving chat history:', error);
    return null;
  }
};

// Get chat history for a specific sheet
export const getChatHistory = (sheetId) => {
  try {
    const allChats = getAllChats();
    const sheetChats = Object.values(allChats).filter(chat => chat.sheetId === sheetId);
    return sheetChats.reduce((acc, chat) => acc.concat(chat.messages), []);
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
};

// Get all chats for a specific sheet, organized by month
export const getChatsBySheetId = (sheetId) => {
  try {
    const allChats = getAllChats();
    
    // Filter chats by sheetId and sort by date (newest first)
    const sheetChats = Object.values(allChats)
      .filter(chat => chat.sheetId === sheetId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Group by month
    return sheetChats.reduce((acc, chat) => {
      if (!chat.updatedAt) return acc;
      
      const date = new Date(chat.updatedAt);
      const monthYear = date.toISOString().slice(0, 7); // YYYY-MM format
      
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      
      acc[monthYear].push(chat);
      return acc;
    }, {});
      
  } catch (error) {
    console.error('Error getting chats by sheet ID:', error);
    return {};
  }
};

// Get today's chat for a sheet if it exists
export const getTodaysChat = (sheetId) => {
  try {
    const allChats = getAllChats();
    const today = getCurrentDate();
    const chatKey = `${sheetId}_${today}`;
    
    return allChats[chatKey] || null;
  } catch (error) {
    console.error('Error getting today\'s chat:', error);
    return null;
  }
};

// Clear chat history for a specific sheet
export const clearChatHistory = (sheetId) => {
  try {
    const allChats = getAllChats();
    const updatedChats = Object.entries(allChats).reduce((acc, [key, chat]) => {
      if (chat.sheetId !== sheetId) {
        acc[key] = chat;
      }
      return acc;
    }, {});
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updatedChats));
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
};

// Get all chats from localStorage
const getAllChats = () => {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error parsing chat history:', error);
    return {};
  }
};

// Get a specific chat by ID
export const getChatById = (chatId) => {
  try {
    const allChats = getAllChats();
    return allChats[chatId] || null;
  } catch (error) {
    console.error('Error getting chat by ID:', error);
    return null;
  }
};

// Delete a specific chat
export const deleteChat = (chatId) => {
  try {
    const allChats = getAllChats();
    if (allChats[chatId]) {
      delete allChats[chatId];
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allChats));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
};
