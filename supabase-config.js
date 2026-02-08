// Конфигурация Supabase - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
const SUPABASE_URL = 'https://nnpzazihtzbqmopnayxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ucHphemlodHpicW1vcG5heXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MTcyNzUsImV4cCI6MjA4NjA5MzI3NX0.iU4nlXfrNoLxTbPrKsiAKZU0vq-iAl5BFGtY-Mk9R14';

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
