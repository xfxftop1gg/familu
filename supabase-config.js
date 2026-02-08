// Конфигурация Supabase - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
const SUPABASE_URL = 'https://ваш-проект.supabase.co';
const SUPABASE_ANON_KEY = 'ваш-anon-ключ';

// Инициализация клиента Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: false
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Проверка подключения
supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.warn('Supabase: Не удалось подключиться. Используется офлайн режим.');
    } else {
        console.log('Supabase: Подключение успешно установлено');
    }
});