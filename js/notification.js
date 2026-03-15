// Показ уведомлений
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notificationMessage');
    
    if (!notification || !messageEl) return;
    
    messageEl.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Закрытие модалки
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Показать модалку авторизации
function showAuthModal(type) {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const btn = document.getElementById('authBtn');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    
    if (!modal || !title || !btn) return;
    
    title.textContent = type === 'login' ? 'Вход' : 'Регистрация';
    btn.textContent = type === 'login' ? 'Войти' : 'Зарегистрироваться';
    
    // Очищаем поля
    if (email) email.value = '';
    if (password) password.value = '';
    
    btn.onclick = async () => {
        const emailValue = document.getElementById('email')?.value;
        const passwordValue = document.getElementById('password')?.value;
        
        if (!emailValue || !passwordValue) {
            showNotification('Заполните все поля', 'error');
            return;
        }
        
        if (type === 'login') {
            await signIn(emailValue, passwordValue);
        } else {
            await signUp(emailValue, passwordValue);
        }
    };
    
    modal.classList.add('active');
}