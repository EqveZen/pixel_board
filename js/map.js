// Состояние карты
let allCells = [];
let selectedCell = null;

// Инициализация
async function initMap() {
    showLoader(true);
    await loadAllCells();
    await checkUser();
    setupEventListeners();
    showLoader(false);
}

// Загрузка всех ячеек
async function loadAllCells() {
    const { data: cells, error } = await supabase
        .from('cells')
        .select('*')
        .order('y')
        .order('x');
    
    if (error) {
        console.error('Ошибка загрузки карты:', error);
        showNotification('Ошибка загрузки карты', 'error');
        return;
    }
    
    allCells = cells;
    renderMap();
    updateStats();
}

// Отрисовка карты
function renderMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    mapContainer.innerHTML = '';
    mapContainer.style.gridTemplateColumns = 'repeat(100, 24px)';
    
    allCells.forEach(cell => {
        const cellDiv = createCellElement(cell);
        mapContainer.appendChild(cellDiv);
    });
}

// Создание элемента ячейки
function createCellElement(cell) {
    const div = document.createElement('div');
    div.className = `cell price-${cell.price}`;
    if (cell.status === 'sold') div.classList.add('sold');
    
    div.dataset.x = cell.x;
    div.dataset.y = cell.y;
    div.dataset.id = cell.id;
    div.dataset.price = cell.price;
    
    // Применяем стиль
    if (cell.status === 'sold' && cell.content) {
        if (cell.content.image) {
            div.style.backgroundImage = `url(${cell.content.image})`;
            div.style.backgroundSize = 'cover';
        } else if (cell.content.color) {
            div.style.backgroundColor = cell.content.color;
        }
    }
    
    // Обработчики
    div.addEventListener('click', (e) => handleCellClick(e, cell));
    div.addEventListener('mouseenter', () => showCellPreview(cell));
    div.addEventListener('mouseleave', hideCellPreview);
    
    return div;
}

// Показ превью ячейки
function showCellPreview(cell) {
    const preview = document.getElementById('cellPreview');
    const coords = document.getElementById('previewCoords');
    const price = document.getElementById('previewPrice');
    const owner = document.getElementById('previewOwner');
    
    if (!preview || !coords || !price || !owner) return;
    
    coords.textContent = `Ячейка (${cell.x}, ${cell.y})`;
    
    // Форматируем цену
    price.innerHTML = `$${cell.price} <small>≈ $${(cell.price * USD_TO_RUB).toFixed(0)} ₽</small>`;
    
    if (cell.status === 'sold') {
        owner.innerHTML = '👤 Занято';
        owner.style.color = '#059669';
    } else {
        owner.innerHTML = '🟢 Свободно';
        owner.style.color = '#2563eb';
    }
    
    preview.classList.add('active');
}

// Скрытие превью
function hideCellPreview() {
    const preview = document.getElementById('cellPreview');
    if (preview) {
        preview.classList.remove('active');
    }
}

// Обработка клика по ячейке
async function handleCellClick(event, cell) {
    event.stopPropagation();
    
    const user = await getCurrentUser();
    
    if (cell.status === 'sold') {
        showCellDetails(cell);
    } else {
        if (!user) {
            showNotification('Сначала войдите в систему!', 'info');
            showAuthModal('login');
            return;
        }
        openBuyModal(cell);
    }
}

// Открытие модалки покупки
function openBuyModal(cell) {
    selectedCell = cell;
    
    const modal = document.getElementById('buyModal');
    const cellInfo = document.getElementById('buyCellInfo');
    const priceUSD = document.getElementById('buyPriceUSD');
    const priceRUB = document.getElementById('buyPriceRUB');
    
    if (!modal || !cellInfo || !priceUSD || !priceRUB) return;
    
    cellInfo.textContent = `Ячейка (${cell.x}, ${cell.y})`;
    priceUSD.textContent = `$${cell.price}`;
    priceRUB.textContent = `≈ ${(cell.price * USD_TO_RUB).toFixed(0)} ₽`;
    
    modal.classList.add('active');
}

// Покупка ячейки
async function processPurchase() {
    if (!selectedCell) return;
    
    const user = await getCurrentUser();
    if (!user) {
        showNotification('Необходима авторизация', 'error');
        return;
    }
    
    showLoader(true);
    
    try {
        // Создаем транзакцию
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert([
                {
                    user_id: user.id,
                    cell_id: selectedCell.id,
                    amount: selectedCell.price,
                    currency: 'USD',
                    status: 'completed',
                    payment_method: 'test'
                }
            ])
            .select()
            .single();
        
        if (transactionError) throw transactionError;
        
        // Обновляем ячейку
        const { error: cellError } = await supabase
            .from('cells')
            .update({ 
                status: 'sold', 
                owner_id: user.id,
                content: {
                    color: selectedCell.content?.color || '#2563eb',
                    link: '',
                    title: '',
                    description: ''
                }
            })
            .eq('id', selectedCell.id);
        
        if (cellError) throw cellError;
        
        showNotification('Поздравляем! Ячейка куплена! 🎉', 'success');
        
        // Перезагружаем карту
        await loadAllCells();
        closeModal('buyModal');
        
    } catch (error) {
        console.error('Ошибка покупки:', error);
        showNotification('Ошибка при покупке', 'error');
    } finally {
        showLoader(false);
    }
}

// Показ деталей ячейки
function showCellDetails(cell) {
    const modal = document.getElementById('cellDetailsModal');
    const content = document.getElementById('cellDetailsContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div style="text-align: center;">
            <div style="width: 100px; height: 100px; background: ${cell.content?.color || '#ccc'}; margin: 0 auto 20px; border-radius: 8px;"></div>
            <h3>Ячейка (${cell.x}, ${cell.y})</h3>
            <p>💰 Цена: $${cell.price}</p>
            <p>👤 Владелец: ${cell.owner_id ? 'ID: ' + cell.owner_id.substring(0,8) + '...' : 'Неизвестно'}</p>
            ${cell.content?.link ? `<p>🔗 Ссылка: <a href="${cell.content.link}" target="_blank">${cell.content.link}</a></p>` : ''}
            ${cell.content?.title ? `<p>📝 Название: ${cell.content.title}</p>` : ''}
            ${cell.content?.description ? `<p>📄 ${cell.content.description}</p>` : ''}
        </div>
    `;
    
    modal.classList.add('active');
}

// Обновление статистики
async function updateStats() {
    const total = allCells.length;
    const sold = allCells.filter(c => c.status === 'sold').length;
    const available = total - sold;
    const revenue = allCells.filter(c => c.status === 'sold').reduce((sum, c) => sum + c.price, 0);
    
    const totalEl = document.getElementById('totalCells');
    const soldEl = document.getElementById('soldCells');
    const availableEl = document.getElementById('availableCells');
    const revenueEl = document.getElementById('totalRevenue');
    
    if (totalEl) totalEl.innerHTML = `${total} <small>ячеек</small>`;
    if (soldEl) soldEl.innerHTML = `${sold} <small>($${revenue})</small>`;
    if (availableEl) availableEl.innerHTML = `${available} <small>доступно</small>`;
    if (revenueEl) revenueEl.innerHTML = `$${revenue} <small>продано</small>`;
}

// Поиск ячеек
async function searchCells(query) {
    if (!query || !query.trim()) {
        renderMap();
        return;
    }
    
    const searchLower = query.toLowerCase();
    
    // Поиск по координатам
    const coordMatch = query.match(/(\d+)[,\s]+(\d+)/);
    if (coordMatch) {
        const x = parseInt(coordMatch[1]);
        const y = parseInt(coordMatch[2]);
        
        const cell = allCells.find(c => c.x === x && c.y === y);
        if (cell) {
            highlightCells([cell]);
        }
        return;
    }
    
    // Поиск по цене
    if (searchLower.startsWith('$')) {
        const price = parseInt(searchLower.slice(1));
        if (!isNaN(price)) {
            const cells = allCells.filter(c => c.price === price);
            highlightCells(cells);
            return;
        }
    }
    
    showNotification('Ничего не найдено', 'info');
}

// Подсветка ячеек
function highlightCells(cells) {
    // Сбрасываем подсветку
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '';
        cell.style.zIndex = '1';
    });
    
    if (!cells || cells.length === 0) {
        showNotification('Ничего не найдено', 'info');
        return;
    }
    
    cells.forEach((cell, index) => {
        const cellElement = document.querySelector(`[data-x="${cell.x}"][data-y="${cell.y}"]`);
        if (cellElement) {
            cellElement.style.border = '3px solid #f59e0b';
            cellElement.style.zIndex = '2';
            
            if (index === 0) {
                cellElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
    
    showNotification(`Найдено ячеек: ${cells.length}`, 'success');
}

// Фильтрация по цене
function filterByPrice(priceRange) {
    if (!priceRange) {
        renderMap();
        return;
    }
    
    const [min, max] = priceRange.split('-').map(Number);
    const cells = allCells.filter(c => c.price >= min && c.price <= max);
    
    highlightCells(cells);
}

// Навигация по карте
function moveMap(direction) {
    const wrapper = document.querySelector('.map-wrapper');
    if (!wrapper) return;
    
    const scrollAmount = 300;
    
    switch(direction) {
        case 'up':
            wrapper.scrollTop -= scrollAmount;
            break;
        case 'down':
            wrapper.scrollTop += scrollAmount;
            break;
        case 'left':
            wrapper.scrollLeft -= scrollAmount;
            break;
        case 'right':
            wrapper.scrollLeft += scrollAmount;
            break;
    }
}

// Показать/скрыть загрузчик
function showLoader(show) {
    const loader = document.getElementById('loadingIndicator');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

// Настройка обработчиков
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchCells(e.target.value);
            }
        });
    }
    
    const priceFilter = document.getElementById('priceFilter');
    if (priceFilter) {
        priceFilter.addEventListener('change', (e) => {
            filterByPrice(e.target.value);
        });
    }
}

// Экспорт данных
function exportMap() {
    const data = {
        cells: allCells,
        stats: {
            total: allCells.length,
            sold: allCells.filter(c => c.status === 'sold').length,
            revenue: allCells.filter(c => c.status === 'sold').reduce((sum, c) => sum + c.price, 0)
        },
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel-map-${Date.now()}.json`;
    a.click();
    
    showNotification('Экспорт завершен', 'success');
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initMap);