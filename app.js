// Конфигурация пользователей
const FAMILY_USERS = {
    'mama': { name: 'Мама', password: '78', role: 'mother' },
    'papa': { name: 'Папа', password: '78', role: 'father' },
    'sun': { name: 'Сын', password: '78', role: 'son' },
    'doch': { name: 'Дочь', password: '78', role: 'daughter' }
};

const RELATIONSHIPS = {
    'mama': { 'sun': 'сын', 'doch': 'дочь', 'papa': 'муж' },
    'papa': { 'sun': 'сын', 'doch': 'дочь', 'mama': 'жена' },
    'sun': { 'mama': 'мама', 'papa': 'папа', 'doch': 'сестра' },
    'doch': { 'mama': 'мама', 'papa': 'папа', 'sun': 'брат' }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    const page = window.location.pathname.split('/').pop();
    
    switch(page) {
        case 'login.html':
            initLoginPage();
            break;
        case 'chat.html':
            initChatPage();
            break;
        case 'index.html':
        case '':
            initHomePage();
            break;
    }
});

// Главная страница
function initHomePage() {
    // Автоматический редирект если авторизован
    const user = JSON.parse(sessionStorage.getItem('familyChatUser'));
    if (user) {
        window.location.href = 'chat.html';
    }
}

// Страница входа
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!loginForm) return;
    
    // Автофокус на поле логина
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Валидация
        if (!username || !password) {
            showError('Введите логин и пароль');
            return;
        }
        
        // Проверка пользователя
        const user = FAMILY_USERS[username];
        if (!user || user.password !== password) {
            showError('Неверный логин или пароль');
            return;
        }
        
        // Сохраняем пользователя
        const userData = {
            username: username,
            name: user.name,
            role: user.role
        };
        
        sessionStorage.setItem('familyChatUser', JSON.stringify(userData));
        
        // Обновляем время входа в Supabase
        try {
            await supabaseClient
                .from('users')
                .upsert({
                    username: username,
                    name: user.name,
                    last_seen: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
        } catch (error) {
            console.log('Локальный режим: данные не сохранены в Supabase');
        }
        
        // Переходим в чат
        window.location.href = 'chat.html';
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
}

// Страница чата
async function initChatPage() {
    // Проверка авторизации
    const user = JSON.parse(sessionStorage.getItem('familyChatUser'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Обновляем имя пользователя
    document.getElementById('currentUserName').textContent = user.name;
    
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', function() {
        sessionStorage.removeItem('familyChatUser');
        window.location.href = 'index.html';
    });
    
    // Загружаем контакты
    await loadContacts(user.username);
    
    // Инициализация формы отправки
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    
    messageForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const messageText = messageInput.value.trim();
        if (!messageText) return;
        
        const activeContact = document.querySelector('.contact.active');
        if (!activeContact) return;
        
        const receiver = activeContact.dataset.username;
        
        try {
            // Отправляем сообщение в Supabase
            await supabaseClient
                .from('messages')
                .insert({
                    chat_id: getChatId(user.username, receiver),
                    sender: user.username,
                    receiver: receiver,
                    message: messageText,
                    created_at: new Date().toISOString()
                });
            
            // Очищаем поле ввода
            messageInput.value = '';
            
            // Фокус обратно на поле ввода
            messageInput.focus();
            
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            alert('Не удалось отправить сообщение. Проверьте подключение.');
        }
    });
    
    // Включаем кнопку отправки при вводе текста
    messageInput.addEventListener('input', function() {
        const sendBtn = document.querySelector('.send-btn');
        const hasText = this.value.trim().length > 0;
        const hasContact = document.querySelector('.contact.active');
        
        sendBtn.disabled = !hasText || !hasContact;
        this.disabled = !hasContact;
    });
}

// Загрузка контактов
async function loadContacts(currentUser) {
    const contactsList = document.getElementById('contactsList');
    const onlineCount = document.getElementById('onlineCount');
    
    if (!contactsList) return;
    
    contactsList.innerHTML = '<div class="loading">Загрузка семьи...</div>';
    
    try {
        // Получаем пользователей из Supabase
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*');
        
        if (error) throw error;
        
        // Создаем список контактов
        contactsList.innerHTML = '';
        let onlineUsers = 0;
        
        for (const [username, userData] of Object.entries(FAMILY_USERS)) {
            if (username === currentUser) continue;
            
            // Находим пользователя в базе
            const dbUser = users?.find(u => u.username === username);
            const lastSeen = dbUser?.last_seen ? new Date(dbUser.last_seen) : null;
            const isOnline = lastSeen && (Date.now() - lastSeen.getTime() < 5 * 60 * 1000);
            
            if (isOnline) onlineUsers++;
            
            const contactElement = createContactElement(
                username,
                userData.name,
                RELATIONSHIPS[currentUser][username] || username,
                lastSeen,
                isOnline
            );
            
            contactsList.appendChild(contactElement);
        }
        
        // Обновляем счетчик онлайн
        if (onlineCount) {
            onlineCount.textContent = `${onlineUsers} онлайн`;
        }
        
        // Активируем первый контакт
        const firstContact = contactsList.querySelector('.contact');
        if (firstContact) {
            firstContact.classList.add('active');
            await loadChat(currentUser, firstContact.dataset.username);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
        contactsList.innerHTML = '<div class="loading">Офлайн режим</div>';
        
        // Локальный fallback
        loadContactsOffline(currentUser);
    }
}

// Загрузка контактов в офлайн режиме
function loadContactsOffline(currentUser) {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;
    
    contactsList.innerHTML = '';
    
    for (const [username, userData] of Object.entries(FAMILY_USERS)) {
        if (username === currentUser) continue;
        
        const contactElement = createContactElement(
            username,
            userData.name,
            RELATIONSHIPS[currentUser][username] || username,
            null,
            false
        );
        
        contactsList.appendChild(contactElement);
    }
    
    // Активируем первый контакт
    const firstContact = contactsList.querySelector('.contact');
    if (firstContact) {
        firstContact.classList.add('active');
        loadChatOffline(currentUser, firstContact.dataset.username);
    }
}

// Создание элемента контакта
function createContactElement(username, name, displayName, lastSeen, isOnline) {
    const div = document.createElement('div');
    div.className = 'contact';
    div.dataset.username = username;
    
    let statusText = 'Никогда не был(а) в сети';
    if (lastSeen) {
        const now = new Date();
        const diffMs = now - lastSeen;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {
            statusText = 'Только что';
        } else if (diffMins < 60) {
            statusText = `${diffMins} минут назад`;
        } else if (diffMins < 1440) {
            const hours = Math.floor(diffMins / 60);
            statusText = `${hours} ${getHoursWord(hours)} назад`;
        } else {
            statusText = lastSeen.toLocaleDateString('ru-RU');
        }
    }
    
    div.innerHTML = `
        <div class="contact-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="contact-info">
            <h4>${displayName}</h4>
            <div class="online-status">
                ${isOnline ? '<span class="online-dot"></span> онлайн' : statusText}
            </div>
        </div>
    `;
    
    div.addEventListener('click', async function() {
        // Снимаем активный класс с других контактов
        document.querySelectorAll('.contact').forEach(c => {
            c.classList.remove('active');
        });
        
        // Добавляем активный класс текущему
        this.classList.add('active');
        
        // Загружаем чат
        const currentUser = JSON.parse(sessionStorage.getItem('familyChatUser')).username;
        try {
            await loadChat(currentUser, username);
        } catch (error) {
            loadChatOffline(currentUser, username);
        }
        
        // Активируем поле ввода
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.querySelector('.send-btn');
        if (messageInput && sendBtn) {
            messageInput.disabled = false;
            sendBtn.disabled = messageInput.value.trim().length === 0;
            messageInput.focus();
        }
    });
    
    return div;
}

// Получение правильной формы слова "час"
function getHoursWord(hours) {
    if (hours === 1) return 'час';
    if (hours >= 2 && hours <= 4) return 'часа';
    return 'часов';
}

// Загрузка чата
async function loadChat(sender, receiver) {
    const messagesContainer = document.getElementById('messagesContainer');
    const chatTitle = document.getElementById('chatTitle');
    const chatStatus = document.getElementById('chatStatus');
    
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '<div class="loading">Загрузка сообщений...</div>';
    
    try {
        // Получаем сообщения из Supabase
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .eq('chat_id', getChatId(sender, receiver))
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // Отображаем сообщения
        displayMessages(messages || [], sender);
        
        // Обновляем заголовок
        if (chatTitle) {
            chatTitle.textContent = `Чат с ${RELATIONSHIPS[sender][receiver] || receiver}`;
        }
        
        // Обновляем статус
        if (chatStatus) {
            chatStatus.textContent = messages?.length 
                ? `${messages.length} сообщений` 
                : 'Нет сообщений';
        }
        
        // Подписываемся на новые сообщения
        subscribeToMessages(sender, receiver);
        
    } catch (error) {
        console.error('Ошибка загрузки чата:', error);
        messagesContainer.innerHTML = '<div class="loading">Офлайн режим</div>';
        
        // Пробуем загрузить из localStorage
        loadChatOffline(sender, receiver);
    }
}

// Загрузка чата в офлайн режиме
function loadChatOffline(sender, receiver) {
    const messagesContainer = document.getElementById('messagesContainer');
    const chatTitle = document.getElementById('chatTitle');
    const chatStatus = document.getElementById('chatStatus');
    
    if (!messagesContainer) return;
    
    // Получаем сообщения из localStorage
    const chatId = getChatId(sender, receiver);
    const messages = JSON.parse(localStorage.getItem(`chat_${chatId}`)) || [];
    
    // Отображаем сообщения
    displayMessages(messages, sender);
    
    // Обновляем заголовок
    if (chatTitle) {
        chatTitle.textContent = `Чат с ${RELATIONSHIPS[sender][receiver] || receiver}`;
    }
    
    if (chatStatus) {
        chatStatus.textContent = messages.length 
            ? `${messages.length} сообщений (офлайн)` 
            : 'Нет сообщений';
    }
}

// Отображение сообщений
function displayMessages(messages, currentUser) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="empty-chat">
                <i class="fas fa-comment-alt"></i>
                <p>Нет сообщений. Начните общение первым!</p>
            </div>
        `;
        return;
    }
    
    messages.forEach(message => {
        const isMyMessage = message.sender === currentUser;
        const messageElement = createMessageElement(message, isMyMessage, currentUser);
        messagesContainer.appendChild(messageElement);
    });
    
    // Прокручиваем вниз
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Создание элемента сообщения
function createMessageElement(message, isMyMessage, currentUser) {
    const div = document.createElement('div');
    div.className = `message ${isMyMessage ? 'my-message' : ''}`;
    
    const time = message.created_at 
        ? formatTime(new Date(message.created_at))
        : 'только что';
    
    const senderName = isMyMessage 
        ? 'Вы' 
        : (RELATIONSHIPS[currentUser][message.sender] || message.sender);
    
    div.innerHTML = `
        <div class="message-sender">${senderName}</div>
        <div class="message-content">${message.message}</div>
        <div class="message-time">${time}</div>
    `;
    
    return div;
}

// Форматирование времени
function formatTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
        return 'только что';
    } else if (diffMins < 60) {
        return `${diffMins} мин назад`;
    } else {
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// Получение ID чата
function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

// Подписка на новые сообщения
function subscribeToMessages(sender, receiver) {
    const chatId = getChatId(sender, receiver);
    
    // Отписываемся от предыдущей подписки
    if (window.messageSubscription) {
        supabaseClient.removeChannel(window.messageSubscription);
    }
    
    // Подписываемся на новые сообщения
    window.messageSubscription = supabaseClient
        .channel(`messages:${chatId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
        }, (payload) => {
            const currentUser = JSON.parse(sessionStorage.getItem('familyChatUser')).username;
            const newMessage = payload.new;
            const isMyMessage = newMessage.sender === currentUser;
            
            // Добавляем сообщение в чат
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                // Убираем сообщение "нет сообщений"
                const emptyChat = messagesContainer.querySelector('.empty-chat');
                if (emptyChat) {
                    emptyChat.remove();
                }
                
                const messageElement = createMessageElement(newMessage, isMyMessage, currentUser);
                messagesContainer.appendChild(messageElement);
                
                // Прокручиваем вниз
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // Обновляем счетчик сообщений
                const chatStatus = document.getElementById('chatStatus');
                if (chatStatus) {
                    const messageCount = messagesContainer.querySelectorAll('.message').length;
                    chatStatus.textContent = `${messageCount} сообщений`;
                }
            }
            
            // Сохраняем в localStorage для офлайн режима
            saveMessageToLocalStorage(newMessage, chatId);
        })
        .subscribe();
}

// Сохранение сообщения в localStorage
function saveMessageToLocalStorage(message, chatId) {
    const key = `chat_${chatId}`;
    const messages = JSON.parse(localStorage.getItem(key)) || [];
    messages.push(message);
    localStorage.setItem(key, JSON.stringify(messages));
}

// Проверка подключения к Supabase
function checkSupabaseConnection() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    // Периодическая проверка соединения
    setInterval(async () => {
        try {
            await supabaseClient.from('users').select('count', { count: 'exact', head: true });
            statusElement.className = 'connection-status connected';
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Подключено';
        } catch (error) {
            statusElement.className = 'connection-status disconnected';
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Офлайн';
        }
    }, 10000);
}

// Инициализация после загрузки страницы чата
if (window.location.pathname.includes('chat.html')) {
    setTimeout(checkSupabaseConnection, 1000);
}