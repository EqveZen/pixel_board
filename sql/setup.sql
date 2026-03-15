-- Создаем таблицу profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT,
    balance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу cells
CREATE TABLE IF NOT EXISTS cells (
    id SERIAL PRIMARY KEY,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
    status TEXT DEFAULT 'free' CHECK (status IN ('free', 'sold', 'reserved')),
    content JSONB DEFAULT '{"color": "#e2e8f0", "link": "", "image": null, "title": null, "description": null}'::jsonb,
    price INTEGER NOT NULL DEFAULT 4,
    reserved_until TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(x, y)
);

-- Создаем таблицу transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE SET NULL,
    cell_id INTEGER REFERENCES cells ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT,
    yookassa_id TEXT UNIQUE,
    payment_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_cells_coords ON cells(x, y);
CREATE INDEX IF NOT EXISTS idx_cells_owner ON cells(owner_id);
CREATE INDEX IF NOT EXISTS idx_cells_status ON cells(status);
CREATE INDEX IF NOT EXISTS idx_cells_price ON cells(price);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cells_updated_at ON cells;
CREATE TRIGGER update_cells_updated_at
    BEFORE UPDATE ON cells
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функция создания профиля при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер на создание профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Заполняем ячейки (5000 штук)
INSERT INTO cells (x, y, status, content, price)
SELECT 
    x, 
    y, 
    'free',
    jsonb_build_object(
        'color', 
        CASE 
            WHEN x BETWEEN 40 AND 60 AND y BETWEEN 20 AND 30 THEN '#fbbf24'
            WHEN x BETWEEN 30 AND 70 AND y BETWEEN 15 AND 35 THEN '#93c5fd'
            ELSE '#e2e8f0'
        END,
        'link', '',
        'image', null,
        'title', null,
        'description', null
    ),
    CASE 
        WHEN x BETWEEN 40 AND 60 AND y BETWEEN 20 AND 30 THEN 20
        WHEN x BETWEEN 30 AND 70 AND y BETWEEN 15 AND 35 THEN 12
        ELSE 4
    END
FROM 
    generate_series(1, 100) x,
    generate_series(1, 50) y
ON CONFLICT (x, y) DO NOTHING;

-- RLS политики
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Политики для cells
CREATE POLICY "Anyone can view cells" 
    ON cells FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can buy cells" 
    ON cells FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Политики для transactions
CREATE POLICY "Users can view own transactions" 
    ON transactions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert transactions" 
    ON transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);