// Конфигурация Supabase - ЗАМЕНИ НА СВОИ ЗНАЧЕНИЯ!
const SUPABASE_URL = 'https://tbxnyazcqrfvmqxfmutr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRieG55YXpjcXJmdm1xeGZtdXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDQwMTcsImV4cCI6MjA4OTE4MDAxN30.fQ1-EYsl-cuxyHQ_Zgygl2HWCSeWl0YNpeXgC40LD_Q';

// Создаем клиент Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Курс USD к RUB для отображения
const USD_TO_RUB = 90;