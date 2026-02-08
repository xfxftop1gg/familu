# 👨‍👩‍👧‍👦 Семейный Чат

Приватный чат для семьи с использованием Supabase и GitHub Pages.

## 🚀 Быстрый старт

1. **Склонируйте репозиторий** или скачайте файлы
2. **Настройте Supabase**:
   - Создайте проект на [supabase.com](https://supabase.com)
   - Получите URL и anon ключ из Settings → API
   - Вставьте в файл `supabase-config.js`

3. **Создайте таблицы в Supabase**:
```sql
-- Таблица пользователей
CREATE TABLE users (
    username TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица сообщений
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Включите RLS и создайте политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Anyone can read users" 
ON users FOR SELECT USING (true);

CREATE POLICY "Anyone can insert/update users" 
ON users FOR ALL USING (true);

CREATE POLICY "Anyone can read messages" 
ON messages FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages" 
ON messages FOR INSERT WITH CHECK (true);