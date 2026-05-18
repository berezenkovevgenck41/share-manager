document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('share-form');
    const itemsContainer = document.getElementById('items-container');
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    
    // Встановлюємо сьогоднішню дату за замовчуванням
    const lendDateInput = document.getElementById('lend-date');
    if (lendDateInput) {
        lendDateInput.valueAsDate = new Date();
    }

    let items = [];

    // ІНІЦІАЛІЗАЦІЯ ДАНИХ (Завантаження демо-даних або локальних збережень)
    function initializeData() {
        const storedData = localStorage.getItem('sharedItems');
        
        if (storedData) {
            // Якщо дані вже є у браузері користувача
            items = JSON.parse(storedData);
            renderItems();
        } else {
            // Перший запуск: завантажуємо seed.json із папки data/
            fetch('data/seed.json')
                .then(response => {
                    if (!response.ok) throw new Error('Не вдалося завантажити seed data');
                    return response.json();
                })
                .then(data => {
                    items = data;
                    saveToLocalStorage(); // Зберігаємо демо-дані в браузер
                    renderItems();
                })
                .catch(error => {
                    console.error('Помилка ініціалізації:', error);
                    items = [];
                    renderItems();
                });
        }
    }

    // Перевірка протермінування дедлайну
    function isOverdue(returnDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Обнуляємо час для точного порівняння дат
        const returnDate = new Date(returnDateStr);
        return returnDate < today;
    }

    // Головна функція відображення списку
    function renderItems() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const categoryFilter = filterCategory.value;

        // Зберігаємо оригінальні індекси для коректного оновлення статусу
        let itemsWithIndices = items.map((item, index) => ({ item, index }));

        // Фільтрація
        let filtered = itemsWithIndices.filter(entry => {
            const matchesSearch = entry.item.name.toLowerCase().includes(searchTerm) || 
                                  entry.item.friend.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || entry.item.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        // Сортування (повернуті речі йдуть униз)
        filtered.sort((a, b) => {
            if (a.item.returned && !b.item.returned) return 1;
            if (!a.item.returned && b.item.returned) return -1;
            return 0;
        });

        itemsContainer.innerHTML = '';

        if (filtered.length === 0) {
            itemsContainer.innerHTML = '<li class="empty-state">Нічого не знайдено або каталог порожній.</li>';
            return;
        }

        // Генерація HTML для кожної картки
        filtered.forEach((entry) => {
            const item = entry.item;
            const originalIndex = entry.index; 
            const overdue = !item.returned && isOverdue(item.returnDate);
            
            const li = document.createElement('li');
            li.className = `item-card ${item.returned ? 'returned' : ''} ${overdue ? 'overdue' : ''}`;
            
            li.innerHTML = `
                <div class="item-details">
                    <div class="item-header">
                        <span class="item-title">${escapeHTML(item.name)}</span>
                        <span class="item-category">${item.category}</span>
                    </div>
                    <span class="item-info">Кому позичено: <b>${escapeHTML(item.friend)}</b></span>
                    <span class="item-info">Видано: ${formatDate(item.lendDate)} | Дедлайн: <b>${formatDate(item.returnDate)}</b></span>
                    ${overdue ? '<span class="overdue-badge">⚠️ Термін повернення минув!</span>' : ''}
                    ${item.returned ? `<span class="returned-badge">✔ Повернено: ${formatDate(item.actualReturnDate)}</span>` : ''}
                </div>
                ${!item.returned ? `<button class="delete-btn" data-index="${originalIndex}">Повернуто ✔</button>` : ''}
            `;
            itemsContainer.appendChild(li);
        });

        // Додаємо обробники для нових кнопок "Повернуто"
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'), 10);
                markAsReturned(index);
            });
        });
    }

    // Обробка форми додавання нового запису
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newItem = {
                name: document.getElementById('item-name').value,
                category: document.getElementById('category').value,
                friend: document.getElementById('friend-name').value,
                lendDate: document.getElementById('lend-date').value,
                returnDate: document.getElementById('return-date').value,
                returned: false,
                actualReturnDate: null
            };

            items.push(newItem);
            saveToLocalStorage();
            
            // Очищення полів
            document.getElementById('item-name').value = '';
            document.getElementById('friend-name').value = '';
            document.getElementById('return-date').value = '';
            
            renderItems();
        });
    }

    // Зміна статусу на "Повернуто"
    function markAsReturned(index) {
        items[index].returned = true;
        items[index].actualReturnDate = new Date().toISOString().split('T')[0]; // Записуємо поточну дату
        saveToLocalStorage();
        renderItems();
    }

    // Збереження в LocalStorage
    function saveToLocalStorage() {
        localStorage.setItem('sharedItems', JSON.stringify(items));
    }

    // Форматування дати у звичний вигляд DD.MM.YYYY
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
    }

    // Захист від XSS-ін'єкцій
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Обробники для пошуку та фільтрації
    if (searchInput) searchInput.addEventListener('input', renderItems);
    if (filterCategory) filterCategory.addEventListener('change', renderItems);

    // Запуск застосунку
    initializeData();
});
