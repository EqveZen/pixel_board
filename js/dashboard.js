let currentUser = null;
let userCells = [];
let selectedCell = null;
let selectedColor = '#2563eb';

// Загрузка данных
async function loadDashboard() {
    showLoader(true);
    
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    const userEmail = document.getElementById('userEmail');
    if (userEmail) {
        userEmail.textContent = `👤 ${currentUser.email}`;
    }
    
    await Promise.all([
        loadUserCells(),
        loadTransactions()
    ]);
    
    const dashboardContent = document.getElementById('dashboardContent');
    if (dashboardContent) {
        dashboardContent.style.display = 'block';
    }
    
    showLoader(false);
}

// Загрузка ячеек пользователя
async function loadUserCells() {
    const { data: cells, error } = await supabase
        .from('cells')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('x')
        .order('y');
    
    if (error) {
        showNotification('Ошибка загрузки ячеек', 'error');
        return;
    }
    
    userCells = cells;
    displayUserCells();
}

// Отображение ячеек
function displayUserCells() {
    const container = document.getElementById('myCellsContainer');
    const noCells = document.getElementById('noCells');
    const userCellsEl = document.getElementById('userCells');
    
    if (!container || !noCells || !userCellsEl) return;
    
    if (userCells.length === 0) {
        container.innerHTML = '';
        noCells.style.display = 'block';
        userCellsEl.textContent = '0';
        return;
    }
    
    noCells.style.display = 'none';
    userCellsEl.textContent = userCells.length;
    
    let totalSpent = 0;
    let html = '';
    
    userCells.forEach(cell => {
        totalSpent += cell.price;
        html += `
            <div class="my-cell-item" onclick="selectCellForEdit(${cell.id})">
                <div class="coords">(${cell.x}, ${cell.y})</div>
                <div class="price">$${cell.price}</div>
                <div style="font-size: 12px; color: #666;">
                    ${cell.content?.title || 'Без названия'}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    const userSpent = document.getElementById('userSpent');
    if (userSpent) {
        userSpent.textContent = `$${totalSpent}`;
    }
}

// Выбор ячейки для редактирования
async function selectCellForEdit(cellId) {
    selectedCell = userCells.find(c => c.id === cellId);
    if (!selectedCell) return;
    
    const editCard = document.getElementById('editCard');
    const selectedCellInfo = document.getElementById('selectedCellInfo');
    const cellTitle = document.getElementById('cellTitle');
    const cellLink = document.getElementById('cellLink');
    const cellDescription = document.getElementById('cellDescription');
    
    if (!editCard || !selectedCellInfo || !cellTitle || !cellLink || !cellDescription) return;
    
    editCard.style.display = 'block';
    selectedCellInfo.innerHTML = `
        <p><strong>Ячейка (${selectedCell.x}, ${selectedCell.y})</strong></p>
        <p>Цена: $${selectedCell.price}</p>
    `;
    
    cellTitle.value = selectedCell.content?.title || '';
    cellLink.value = selectedCell.content?.link || '';
    cellDescription.value = selectedCell.content?.description || '';
    
    selectedColor = selectedCell.content?.color || '#2563eb';
    highlightSelectedColor(selectedColor);
    
    editCard.scrollIntoView({ behavior: 'smooth' });
}

// Выбор цвета
function selectColor(color) {
    selectedColor = color;
    highlightSelectedColor(color);
}

function highlightSelectedColor(color) {
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.style.background === color) {
            opt.classList.add('selected');
        }
    });
}

// Сохранение изменений
async function saveCellChanges() {
    if (!selectedCell) return;
    
    const title = document.getElementById('cellTitle')?.value || '';
    const link = document.getElementById('cellLink')?.value || '';
    const description = document.getElementById('cellDescription')?.value || '';
    
    const updates = {
        content: {
            ...selectedCell.content,
            title: title,
            link: link,
            description: description,
            color: selectedColor
        }
    };
    
    const { error } = await supabase
        .from('cells')
        .update(updates)
        .eq('id', selectedCell.id);
    
    if (error) {
        showNotification('Ошибка сохранения', 'error');
    } else {
        showNotification('Изменения сохранены!', 'success');
        
        selectedCell.content = updates.content;
        const index = userCells.findIndex(c => c.id === selectedCell.id);
        if (index !== -1) {
            userCells[index].content = updates.content;
        }
        
        showPreview();
    }
}

// Предпросмотр
function showPreview() {
    const modal = document.getElementById('previewModal');
    const previewCell = document.getElementById('previewCell');
    const previewTitle = document.getElementById('previewTitle');
    const previewLink = document.getElementById('previewLink');
    const title = document.getElementById('cellTitle')?.value || '';
    const link = document.getElementById('cellLink')?.value || '';
    
    if (!modal || !previewCell || !previewTitle || !previewLink) return;
    
    previewCell.style.backgroundColor = selectedColor;
    previewCell.textContent = `(${selectedCell.x}, ${selectedCell.y})`;
    
    previewTitle.textContent = title || 'Без названия';
    previewLink.innerHTML = link ? `<a href="${link}" target="_blank">${link}</a>` : '';
    
    modal.classList.add('active');
}

// Загрузка транзакций
async function loadTransactions() {
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (error) {
        showNotification('Ошибка загрузки транзакций', 'error');
        return;
    }
    
    displayTransactions(transactions);
}

// Отображение транзакций
function displayTransactions(transactions) {
    const container = document.getElementById('transactionsContainer');
    const noTransactions = document.getElementById('noTransactions');
    
    if (!container || !noTransactions) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '';
        noTransactions.style.display = 'block';
        return;
    }
    
    noTransactions.style.display = 'none';
    
    let html = '';
    transactions.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString();
        html += `
            <div class="transaction-item">
                <div>
                    <div style="font-weight: bold;">$${t.amount}</div>
                    <div style="font-size: 12px; color: #666;">${date}</div>
                </div>
                <div>
                    <span class="transaction-status status-${t.status}">${t.status}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Показать/скрыть загрузчик
function showLoader(show) {
    const loader = document.getElementById('loadingIndicator');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', loadDashboard);