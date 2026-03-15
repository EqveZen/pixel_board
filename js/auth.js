// Регистрация
async function signUp(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        if (data.user) {
            // Создаем профиль
            await supabase.from('profiles').insert([
                { id: data.user.id, email: email }
            ]);
        }
        
        showNotification('Проверьте почту для подтверждения!', 'success');
        closeModal('authModal');
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

// Вход
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        showNotification('Успешный вход!', 'success');
        closeModal('authModal');
        
        // Обновляем интерфейс
        await checkUser();
        
        // Перезагружаем карту если нужно
        if (typeof loadAllCells === 'function') {
            await loadAllCells();
        }
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

// Выход
async function signOut() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Проверка текущего пользователя
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Проверка и обновление интерфейса
async function checkUser() {
    const user = await getCurrentUser();
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (dashboardBtn) dashboardBtn.style.display = 'inline-block';
        if (userInfo) userInfo.textContent = `👤 ${user.email}`;
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (dashboardBtn) dashboardBtn.style.display = 'none';
        if (userInfo) userInfo.textContent = '';
    }
}