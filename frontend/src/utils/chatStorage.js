const CHAT_STORAGE_KEY = 'dpr_chat_history';

// Initialize with dummy data if no chat history exists
if (!localStorage.getItem(CHAT_STORAGE_KEY)) {
  const now = new Date().toISOString();
  const dummyData = {
    'sheet1': {
      id: 'sheet1',
      name: 'Sample Project',
      updatedAt: now,
      createdAt: now,
      months: {
        'August 2025': {
          id: 'sheet1_august-2025',
          name: 'August 2025',
          updatedAt: now,
          dates: {
            '2025-08-15': {
              id: 'sheet1_2025-08-15',
              date: '2025-08-15',
              formattedDate: 'Friday, August 15, 2025',
              updatedAt: '2025-08-15T14:46:00Z',
              messages: [
                { id: 'msg1', text: 'Show me the latest updates', isUser: true, timestamp: '2025-08-15T10:30:00Z' },
                { id: 'msg2', text: 'Here are the latest updates from your sheet...', isUser: false, timestamp: '2025-08-15T10:31:00Z' }
              ]
            },
            '2025-08-10': {
              id: 'sheet1_2025-08-10',
              date: '2025-08-10',
              formattedDate: 'Sunday, August 10, 2025',
              updatedAt: '2025-08-10T11:20:00Z',
              messages: [
                { id: 'msg3', text: 'What\'s the status of project X?', isUser: true, timestamp: '2025-08-10T11:15:00Z' },
                { id: 'msg4', text: 'Project X is currently 75% complete...', isUser: false, timestamp: '2025-08-10T11:20:00Z' }
              ]
            }
          }
        }
      }
    },
    'sheet2': {
      id: 'sheet2',
      name: 'Budget Report',
      updatedAt: now,
      createdAt: now,
      months: {
        'August 2025': {
          id: 'sheet2_august-2025',
          name: 'August 2025',
          updatedAt: now,
          dates: {
            '2025-08-16': {
              id: 'sheet2_2025-08-16',
              date: '2025-08-16',
              formattedDate: 'Saturday, August 16, 2025',
              updatedAt: '2025-08-16T09:16:00Z',
              messages: [
                { id: 'msg5', text: 'Show me the budget summary', isUser: true, timestamp: '2025-08-16T09:15:00Z' },
                { id: 'msg6', text: 'Here\'s the budget summary for Q3...', isUser: false, timestamp: '2025-08-16T09:16:00Z' }
              ]
            }
          }
        }
      }
    }
  };
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(dummyData));
  console.log('Dummy data initialized');
}

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => new Date().toISOString().split('T')[0];

// Format date as "Month YYYY" (e.g., "August 2023")
const formatMonthYear = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

// Format date as "Day, Month DD, YYYY" (e.g., "Monday, August 21, 2023")
const formatFullDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('default', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
};

// Get all chats from localStorage
export const getAllChats = () => {
  try {
    const chats = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!chats) return {};
    
    const parsed = JSON.parse(chats);
    
    // If it's an array (old format), convert to object with IDs as keys
    if (Array.isArray(parsed)) {
      const result = {};
      parsed.forEach(chat => {
        if (chat.id) {
          result[chat.id] = chat;
        }
      });
      return result;
    }
    
    // If it's already an object, return as is
    return parsed;
  } catch (error) {
    console.error('Error getting chat history:', error);
    return {};
  }
};

// Save chat history for a specific sheet and date
export const saveChatHistory = (sheetId, sheetName, messages) => {
  try {
    if (!sheetId || !messages || messages.length === 0) return null;
    
    const allChats = getAllChats();
    const now = new Date().toISOString();
    const today = getCurrentDate();
    const monthYear = formatMonthYear(today);
    
    // Create a unique key combining sheetId and date
    const chatKey = `${sheetId}_${today}`;
    
    // Get or create sheet entry
    if (!allChats[sheetId]) {
      allChats[sheetId] = {
        id: sheetId,
        name: sheetName,
        months: {},
        updatedAt: now,
        createdAt: now
      };
    }
    
    // Get or create month entry
    if (!allChats[sheetId].months[monthYear]) {
      allChats[sheetId].months[monthYear] = {
        id: `${sheetId}_${monthYear.replace(/\s+/g, '-').toLowerCase()}`,
        name: monthYear,
        dates: {},
        updatedAt: now
      };
    }
    
    // Create or update chat entry
    allChats[sheetId].months[monthYear].dates[today] = {
      id: chatKey,
      date: today,
      formattedDate: formatFullDate(today),
      messages: [...messages],
      updatedAt: now,
      createdAt: allChats[sheetId].months[monthYear].dates[today]?.createdAt || now
    };
    
    // Update timestamps
    allChats[sheetId].updatedAt = now;
    allChats[sheetId].months[monthYear].updatedAt = now;
    
    // Save to storage
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allChats));
    
    return allChats[sheetId];
  } catch (error) {
    console.error('Error saving chat history:', error);
    return null;
  }
};

// Get all chats for a specific sheet
export const getChatsBySheetId = (sheetId) => {
  try {
    const allChats = getAllChats();
    
    // Convert the flat structure to an array of chats for the UI
    const result = [];
    
    // Get all chats for this sheet
    const sheetChats = Object.values(allChats).filter(chat => chat.sheetId === sheetId);
    
    // Sort chats by updatedAt (newest first)
    const sortedChats = sheetChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Group chats by date
    const chatsByDate = {};
    sortedChats.forEach(chat => {
      const date = chat.date;
      if (!chatsByDate[date]) {
        chatsByDate[date] = [];
      }
      chatsByDate[date].push(chat);
    });
    
    // Convert to the expected format
    Object.entries(chatsByDate).forEach(([date, chats]) => {
      // Get the most recent chat for this date
      const latestChat = chats[0];
      
      result.push({
        id: latestChat.id,
        name: latestChat.sheetName,
        type: 'date',
        sheetId: latestChat.sheetId,
        month: formatMonthYear(date),
        messages: latestChat.messages || [],
        updatedAt: latestChat.updatedAt,
        date: date,
        formattedDate: formatFullDate(date)
      });
    });
    
    // Sort by date (newest first)
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
    
  } catch (error) {
    console.error('Error getting chats by sheet ID:', error);
    return [];
  }
};

// Get a specific chat by ID
export const getChatById = (chatId) => {
  try {
    const allChats = getAllChats();
    
    // Search through all sheets, months, and dates to find the chat
    for (const sheetId in allChats) {
      const sheet = allChats[sheetId];
      for (const month in sheet.months || {}) {
        const monthData = sheet.months[month];
        for (const date in monthData.dates || {}) {
          const chat = monthData.dates[date];
          if (chat.id === chatId) {
            return {
              ...chat,
              sheetId,
              sheetName: sheet.name,
              month: monthData.name
            };
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting chat by ID:', error);
    return null;
  }
};

// Delete a specific chat
export const deleteChat = (chatId) => {
  try {
    const allChats = getAllChats();
    let deleted = false;

    // Search through all sheets, months, and dates to find and delete the chat
    for (const sheetId in allChats) {
      const sheet = allChats[sheetId];
      for (const month in sheet.months || {}) {
        const monthData = sheet.months[month];
        for (const date in monthData.dates || {}) {
          if (monthData.dates[date].id === chatId) {
            delete monthData.dates[date];
            deleted = true;
            break;
          }
        }
        // Clean up empty months
        if (monthData.dates && Object.keys(monthData.dates).length === 0) {
          delete sheet.months[month];
        }
      }
      // Clean up empty sheets
      if (sheet.months && Object.keys(sheet.months).length === 0) {
        delete allChats[sheetId];
      }
    }

    if (deleted) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allChats));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
};

// Get today's chat for a sheet if it exists
export const getTodaysChat = (sheetId) => {
  try {
    const allChats = getAllChats();
    const sheet = allChats[sheetId];
    if (!sheet) return null;
    
    const today = getCurrentDate();
    const monthYear = formatMonthYear(today);
    
    // Check if there's a chat for today
    if (sheet.months?.[monthYear]?.dates?.[today]) {
      const chat = sheet.months[monthYear].dates[today];
      return {
        ...chat,
        sheetId,
        sheetName: sheet.name,
        month: monthYear
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting today\'s chat:', error);
    return null;
  }
};

// Clear chat history for a specific sheet
export const clearChatHistory = (sheetId) => {
  try {
    const allChats = getAllChats();
    // Initialize chat history if it doesn't exist
    if (!localStorage.getItem('dpr_chat_history')) {
      const dummyData = {
        'sheet1': {
          '2025-08': {
            '2025-08-15': [
              {
                id: 'chat1',
                date: '2025-08-15T10:30:00Z',
                updatedAt: '2025-08-15T10:30:00Z',
                messages: [
                  { id: 'msg1', text: 'Show me the latest updates', isUser: true, timestamp: '2025-08-15T10:30:00Z' },
                  { id: 'msg2', text: 'Here are the latest updates from your sheet...', isUser: false, timestamp: '2025-08-15T10:31:00Z' }
                ]
              },
              {
                id: 'chat2',
                date: '2025-08-15T14:45:00Z',
                updatedAt: '2025-08-15T14:45:00Z',
                messages: [
                  { id: 'msg3', text: 'What\'s the status of project X?', isUser: true, timestamp: '2025-08-15T14:45:00Z' },
                  { id: 'msg4', text: 'Project X is currently 75% complete...', isUser: false, timestamp: '2025-08-15T14:46:00Z' }
                ]
              }
            ]
          }
        },
        'sheet2': {
          '2025-08': {
            '2025-08-16': [
              {
                id: 'chat3',
                date: '2025-08-16T09:15:00Z',
                updatedAt: '2025-08-16T09:15:00Z',
                messages: [
                  { id: 'msg5', text: 'Show me the budget summary', isUser: true, timestamp: '2025-08-16T09:15:00Z' },
                  { id: 'msg6', text: 'Here\'s the budget summary for Q3...', isUser: false, timestamp: '2025-08-16T09:16:00Z' }
                ]
              }
            ]
          }
        }
      };
      localStorage.setItem('dpr_chat_history', JSON.stringify(dummyData));
    }
    if (allChats[sheetId]) {
      delete allChats[sheetId];
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allChats));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
};
