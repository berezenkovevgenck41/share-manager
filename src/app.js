document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('share-form');
    const itemsContainer = document.getElementById('items-container');
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    
    if (document.getElementById('lend-date')) {
        document.getElementById('lend-date').valueAsDate = new Date();
    }

    let items = JSON.parse(localStorage.getItem('sharedItems')) || [];

    function isOverdue(returnDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const returnDate = new Date(returnDateStr);
        return returnDate < today;
    }

    function renderItems() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const categoryFilter = filterCategory.value;

        // Створюємо копію масиву із збереженням точних оригінальних індексів
        let itemsWithIndices = items.map((item, index) => ({ item, index }));

        // 1. Фільтрація за текстом та категорією
        let filtered = itemsWithIndices.filter(entry => {
            const matchesSearch = entry.item.name.toLowerCase().includes(searchTerm) || 
                                  entry.item.friend.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || entry.item.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        // 2. Сортування: активні вгорі, повернуті — в самому низу
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

        // 3. Виведення карток на екран
        filtered.forEach((entry) => {
            const item = entry.item;
            const originalIndex = entry.index; // Завжди точний номер елемента в базі
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

        // Навішування подій строго на правильні індекси
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'), 10);
                markAsReturned(index);
            });
        });
    }

    // Додавання нової речі
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
        
        document.getElementById('item-name').value = '';
        document.getElementById('friend-name').value = '';
        document.getElementById('return-date').value = '';
        
        renderItems();
    });

    // Переведення в сірий стан (архів) замість видалення
    function markAsReturned(index) {
        items[index].returned = true;
        items[index].actualReturnDate = new Date().toISOString().split('T')[0];
        saveToLocalStorage();
        renderItems();
    }

    function saveToLocalStorage() {
        localStorage.setItem('sharedItems', JSON.stringify(items));
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Пошук працює автоматично при введенні літер
    searchInput.addEventListener('input', renderItems);
    filterCategory.addEventListener('change', renderItems);

    renderItems();
});
