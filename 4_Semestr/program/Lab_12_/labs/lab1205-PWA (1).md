# **Лабораторная работа 3. Часть 5: Progressive Web Apps (PWA) — создание новостного приложения**

## **Тема:** Разработка прогрессивного веб-приложения (PWA) для агрегации новостей с поддержкой офлайн-режима и push-уведомлений

### **Цель работы:**
Получить практические навыки создания прогрессивного веб-приложения (PWA) на основе новостного сайта. Изучить ключевые компоненты PWA: Web App Manifest для установки на устройство, Service Workers для кэширования и офлайн-доступа, а также Push API для уведомлений. Научиться превращать обычный веб-сайт в приложение, которое можно установить на телефон и использовать без интернета .

---

## **Задание: Приложение "Новости PWA" (PWA News Aggregator)**

Разработать прогрессивное веб-приложение для чтения новостей, вдохновленное архитектурой новостных сайтов (например, Lenta.ru). Приложение должно получать новости через публичное API, кэшировать их для офлайн-чтения, поддерживать установку на устройство и отправлять push-уведомления о главных новостях. В качестве источника данных используем NewsAPI.org .

### **1. Настройка проекта**

**Создание структуры проекта:**

```bash
# Создание директории проекта
mkdir pwa-news
cd pwa-news

# Инициализация npm проекта
npm init -y

# Установка зависимостей
npm install express axios dotenv cors
npm install -D nodemon

# Создание директорий
mkdir public
mkdir public/css
mkdir public/js
mkdir public/icons
mkdir public/data
mkdir server
```

**Файл: `package.json` (настройка скриптов)**

```json
{
  "name": "pwa-news",
  "version": "1.0.0",
  "description": "Progressive Web App для новостей",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "build": "echo 'Сборка статических файлов...'"
  },
  "keywords": ["pwa", "news", "service-worker"],
  "author": "",
  "license": "ISC"
}
```

**Файл: `.env` (конфигурация)**

```
PORT=3000
NEWS_API_KEY=your_api_key_here
NEWS_API_URL=https://newsapi.org/v2
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
CONTACT_EMAIL=admin@example.com
```

**Получение API ключей:**

1. **NewsAPI:** Зарегистрироваться на [newsapi.org](https://newsapi.org) и получить API ключ 
2. **VAPID keys:** Сгенерировать для push-уведомлений :
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### **2. Базовый код (70% предоставляется)**

#### **2.1. Серверная часть (Node.js + Express)**

**Файл: `server/index.js`**

```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const webPush = require('web-push');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Настройка VAPID для push-уведомлений
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

webPush.setVapidDetails(
    `mailto:${process.env.CONTACT_EMAIL}`,
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

// Хранилище подписок на push-уведомления
let subscriptions = [];

// Маршруты API
app.get('/api/news', async (req, res) => {
    try {
        const category = req.query.category || 'general';
        const response = await axios.get(`${process.env.NEWS_API_URL}/top-headlines`, {
            params: {
                country: 'ru',
                category: category,
                apiKey: process.env.NEWS_API_KEY,
                pageSize: 20
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('News API error:', error.message);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

app.get('/api/news/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter required' });
        }
        
        const response = await axios.get(`${process.env.NEWS_API_URL}/everything`, {
            params: {
                q: query,
                apiKey: process.env.NEWS_API_KEY,
                pageSize: 20,
                sortBy: 'relevancy'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Search API error:', error.message);
        res.status(500).json({ error: 'Failed to search news' });
    }
});

// TODO: Реализовать эндпоинт для получения категорий новостей
// app.get('/api/categories', (req, res) => { ... });

// Push-уведомления
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    
    // Проверяем, существует ли уже такая подписка
    const exists = subscriptions.some(sub => 
        sub.endpoint === subscription.endpoint
    );
    
    if (!exists) {
        subscriptions.push(subscription);
        console.log('New subscription added. Total:', subscriptions.length);
    }
    
    res.status(201).json({ message: 'Subscribed successfully' });
});

app.post('/api/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    
    subscriptions = subscriptions.filter(sub => 
        sub.endpoint !== endpoint
    );
    
    console.log('Subscription removed. Total:', subscriptions.length);
    res.json({ message: 'Unsubscribed successfully' });
});

app.post('/api/send-notification', async (req, res) => {
    const { title, body, url } = req.body;
    
    const payload = JSON.stringify({
        title: title || 'Новости PWA',
        body: body || 'Есть новые статьи для вас',
        url: url || '/',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png'
    });
    
    const notifications = [];
    
    subscriptions.forEach(subscription => {
        notifications.push(
            webPush.sendNotification(subscription, payload)
                .catch(error => {
                    console.error('Push error:', error);
                    // Удаляем неработающие подписки
                    if (error.statusCode === 410) {
                        subscriptions = subscriptions.filter(sub => 
                            sub.endpoint !== subscription.endpoint
                        );
                    }
                })
        );
    });
    
    await Promise.all(notifications);
    res.json({ message: `Notifications sent to ${subscriptions.length} subscribers` });
});

// TODO: Реализовать эндпоинт для новостей по дате
// app.get('/api/news/archive', async (req, res) => { ... });

// Обработка всех остальных маршрутов (для SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`VAPID Public Key: ${vapidKeys.publicKey}`);
});
```

#### **2.2. Клиентская часть (HTML + CSS + JavaScript)**

**Файл: `public/index.html`**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Новости PWA</title>
    
    <!-- PWA Meta tags -->
    <meta name="theme-color" content="#0F172A">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="PWA News">
    
    <!-- Links -->
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <header>
        <div class="container">
            <h1 class="logo">📰 PWA Новости</h1>
            <nav>
                <button class="nav-btn active" data-category="general">Главное</button>
                <button class="nav-btn" data-category="technology">Технологии</button>
                <button class="nav-btn" data-category="science">Наука</button>
                <button class="nav-btn" data-category="sports">Спорт</button>
                <button class="nav-btn" data-category="entertainment">Культура</button>
            </nav>
            <div class="header-controls">
                <button id="searchToggle" class="icon-btn" aria-label="Поиск">🔍</button>
                <button id="installBtn" class="install-btn hidden" aria-label="Установить приложение">
                    📲 Установить
                </button>
            </div>
        </div>
        
        <!-- Поисковая строка -->
        <div id="searchBar" class="search-bar hidden">
            <div class="container">
                <input type="text" id="searchInput" placeholder="Поиск новостей...">
                <button id="searchBtn">Найти</button>
                <button id="searchClose" class="icon-btn">✕</button>
            </div>
        </div>
    </header>

    <main class="container">
        <div id="newsGrid" class="news-grid">
            <!-- Новости загружаются через JavaScript -->
        </div>
        
        <div id="loadingSpinner" class="spinner hidden">
            <div class="loader"></div>
        </div>
        
        <div id="errorMessage" class="error-message hidden">
            <p>Не удалось загрузить новости. Проверьте подключение к интернету.</p>
            <button id="retryBtn">Повторить</button>
        </div>
        
        <div id="offlineIndicator" class="offline-indicator hidden">
            <span>📴 Вы в офлайн-режиме. Показываются сохраненные новости.</span>
        </div>
    </main>

    <!-- Уведомления -->
    <div id="notificationPermission" class="notification-banner hidden">
        <p>🔔 Хотите получать уведомления о главных новостях?</p>
        <button id="allowNotifications">Разрешить</button>
        <button id="closeNotificationBanner">✕</button>
    </div>

    <footer>
        <div class="container">
            <p>© 2025 PWA Новости. Данные предоставлены <a href="https://newsapi.org" target="_blank">NewsAPI</a></p>
            <p class="pwa-badge">⚡ Прогрессивное веб-приложение</p>
        </div>
    </footer>

    <!-- Скрипты -->
    <script src="/js/app.js"></script>
    <script src="/js/pwa.js"></script>
</body>
</html>
```

**Файл: `public/css/styles.css`**

```css
:root {
    --primary-color: #0F172A;
    --secondary-color: #3B82F6;
    --text-color: #1E293B;
    --bg-color: #F8FAFC;
    --card-bg: #FFFFFF;
    --border-color: #E2E8F0;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header */
header {
    background-color: var(--primary-color);
    color: white;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: var(--shadow);
}

header .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 20px;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
}

nav {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.nav-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 1rem;
    border-radius: 20px;
    transition: all 0.3s;
}

.nav-btn:hover {
    color: white;
    background-color: rgba(255, 255, 255, 0.1);
}

.nav-btn.active {
    color: white;
    background-color: var(--secondary-color);
}

.header-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.icon-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.5rem;
}

.install-btn {
    background-color: var(--secondary-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.3s;
}

.install-btn:hover {
    background-color: #2563EB;
}

.hidden {
    display: none !important;
}

/* Search bar */
.search-bar {
    background-color: white;
    padding: 1rem 0;
    border-top: 1px solid var(--border-color);
}

.search-bar .container {
    display: flex;
    gap: 0.5rem;
}

#searchInput {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
}

#searchBtn {
    background-color: var(--secondary-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
}

/* News grid */
.news-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
    padding: 2rem 0;
}

.news-card {
    background-color: var(--card-bg);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--shadow);
    transition: transform 0.3s, box-shadow 0.3s;
    cursor: pointer;
}

.news-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.news-card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.news-content {
    padding: 1.5rem;
}

.news-title {
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
    line-height: 1.4;
}

.news-description {
    color: #64748B;
    margin-bottom: 1rem;
    font-size: 0.95rem;
}

.news-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: #94A3B8;
}

.news-source {
    font-weight: 600;
    color: var(--secondary-color);
}

.news-card.offline {
    position: relative;
    border: 2px solid #FBBF24;
}

.offline-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: #FBBF24;
    color: #000;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
}

/* Loading spinner */
.spinner {
    display: flex;
    justify-content: center;
    padding: 2rem;
}

.loader {
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--secondary-color);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Error message */
.error-message {
    text-align: center;
    padding: 2rem;
    color: #EF4444;
}

.error-message button {
    background-color: var(--secondary-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    margin-top: 1rem;
    cursor: pointer;
}

/* Offline indicator */
.offline-indicator {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #FBBF24;
    color: #000;
    padding: 0.75rem 1.5rem;
    border-radius: 30px;
    font-size: 0.9rem;
    box-shadow: var(--shadow);
    z-index: 1000;
}

/* Notification banner */
.notification-banner {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: white;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 1000;
    max-width: 400px;
}

.notification-banner button {
    background-color: var(--secondary-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
}

.notification-banner button:last-child {
    background-color: transparent;
    color: var(--text-color);
    padding: 0.25rem 0.5rem;
}

/* Footer */
footer {
    background-color: var(--primary-color);
    color: white;
    padding: 2rem 0;
    margin-top: 2rem;
}

footer a {
    color: var(--secondary-color);
    text-decoration: none;
}

.pwa-badge {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    opacity: 0.8;
}

/* Responsive */
@media (max-width: 768px) {
    header .container {
        flex-direction: column;
        gap: 1rem;
    }
    
    nav {
        justify-content: center;
    }
    
    .news-grid {
        grid-template-columns: 1fr;
    }
    
    .notification-banner {
        left: 20px;
        right: 20px;
        max-width: none;
    }
}
```

**Файл: `public/js/app.js` (основное приложение)**

```javascript
// Состояние приложения
const state = {
    currentCategory: 'general',
    articles: [],
    isLoading: false,
    error: null,
    isOffline: !navigator.onLine,
    searchMode: false,
    searchQuery: ''
};

// DOM элементы
const newsGrid = document.getElementById('newsGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const offlineIndicator = document.getElementById('offlineIndicator');
const navButtons = document.querySelectorAll('.nav-btn');
const searchToggle = document.getElementById('searchToggle');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchClose = document.getElementById('searchClose');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    checkOnlineStatus();
});

function initApp() {
    loadNews(state.currentCategory);
    updateOfflineIndicator();
}

function setupEventListeners() {
    // Навигация по категориям
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            setActiveCategory(category);
            state.searchMode = false;
            searchBar.classList.add('hidden');
            loadNews(category);
        });
    });
    
    // Поиск
    searchToggle.addEventListener('click', toggleSearch);
    searchBtn.addEventListener('click', performSearch);
    searchClose.addEventListener('click', closeSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Повторная загрузка
    retryBtn.addEventListener('click', () => {
        loadNews(state.currentCategory);
    });
    
    // Online/offline события
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

function setActiveCategory(category) {
    state.currentCategory = category;
    navButtons.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function toggleSearch() {
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden')) {
        searchInput.focus();
        state.searchMode = true;
    }
}

function closeSearch() {
    searchBar.classList.add('hidden');
    state.searchMode = false;
    searchInput.value = '';
    loadNews(state.currentCategory);
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    state.searchQuery = query;
    state.isLoading = true;
    updateUI();
    
    try {
        const response = await fetch(`/api/news/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        displayNews(data.articles);
    } catch (error) {
        console.error('Search error:', error);
        showError('Не удалось выполнить поиск');
        
        // Пробуем загрузить из кэша
        loadCachedNews();
    } finally {
        state.isLoading = false;
        updateUI();
    }
}

async function loadNews(category) {
    state.isLoading = true;
    state.error = null;
    updateUI();
    
    try {
        const response = await fetch(`/api/news?category=${category}`);
        if (!response.ok) throw new Error('Failed to fetch news');
        
        const data = await response.json();
        displayNews(data.articles);
        
        // Сохраняем в кэш для офлайн-режима
        cacheNews(category, data.articles);
    } catch (error) {
        console.error('Load news error:', error);
        showError('Не удалось загрузить новости');
        
        // Загружаем из кэша если есть
        loadCachedNews(category);
    } finally {
        state.isLoading = false;
        updateUI();
    }
}

function displayNews(articles) {
    if (!articles || articles.length === 0) {
        newsGrid.innerHTML = '<p class="no-news">Новости не найдены</p>';
        return;
    }
    
    state.articles = articles;
    
    const html = articles.map(article => createNewsCard(article)).join('');
    newsGrid.innerHTML = html;
    
    // Добавляем обработчики кликов на карточки
    document.querySelectorAll('.news-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            openArticle(articles[index]);
        });
    });
}

function createNewsCard(article) {
    const imageUrl = article.urlToImage || '/icons/news-placeholder.jpg';
    const date = new Date(article.publishedAt).toLocaleDateString('ru-RU');
    const isOffline = article._cached || false;
    
    return `
        <div class="news-card ${isOffline ? 'offline' : ''}">
            ${isOffline ? '<span class="offline-badge">Сохранено</span>' : ''}
            <img src="${imageUrl}" alt="${article.title}" loading="lazy">
            <div class="news-content">
                <h3 class="news-title">${article.title}</h3>
                <p class="news-description">${article.description || 'Нет описания'}</p>
                <div class="news-meta">
                    <span class="news-source">${article.source.name}</span>
                    <span class="news-date">${date}</span>
                </div>
            </div>
        </div>
    `;
}

function openArticle(article) {
    // Открываем в новой вкладке, но можно реализовать модальное окно
    window.open(article.url, '_blank');
}

function updateUI() {
    if (state.isLoading) {
        loadingSpinner.classList.remove('hidden');
        newsGrid.classList.add('hidden');
        errorMessage.classList.add('hidden');
    } else if (state.error) {
        loadingSpinner.classList.add('hidden');
        newsGrid.classList.add('hidden');
        errorMessage.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
        newsGrid.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    }
}

function showError(message) {
    state.error = message;
    updateUI();
}

function checkOnlineStatus() {
    state.isOffline = !navigator.onLine;
    updateOfflineIndicator();
}

function handleOnline() {
    state.isOffline = false;
    updateOfflineIndicator();
    // Пробуем перезагрузить свежие новости
    if (!state.searchMode) {
        loadNews(state.currentCategory);
    }
}

function handleOffline() {
    state.isOffline = true;
    updateOfflineIndicator();
    // Загружаем из кэша
    loadCachedNews(state.currentCategory);
}

function updateOfflineIndicator() {
    if (state.isOffline) {
        offlineIndicator.classList.remove('hidden');
    } else {
        offlineIndicator.classList.add('hidden');
    }
}

// Кэширование новостей для офлайн-режима
async function cacheNews(category, articles) {
    if (!('caches' in window)) return;
    
    try {
        const cache = await caches.open('news-cache');
        
        // Добавляем флаг, что это кэшированные данные
        const cachedArticles = articles.map(article => ({
            ...article,
            _cached: true,
            _cachedAt: Date.now()
        }));
        
        const response = new Response(JSON.stringify(cachedArticles), {
            headers: { 'Content-Type': 'application/json' }
        });
        
        await cache.put(`/api/news?category=${category}`, response);
        console.log(`Cached news for category: ${category}`);
    } catch (error) {
        console.error('Cache error:', error);
    }
}

async function loadCachedNews(category = state.currentCategory) {
    if (!('caches' in window)) return;
    
    try {
        const cache = await caches.open('news-cache');
        const response = await cache.match(`/api/news?category=${category}`);
        
        if (response) {
            const articles = await response.json();
            displayNews(articles);
            console.log('Loaded news from cache');
        } else {
            console.log('No cached news found');
        }
    } catch (error) {
        console.error('Load cached news error:', error);
    }
}

// TODO: Реализовать функцию для сохранения статей для офлайн-чтения
// function saveArticleForOffline(article) { ... }

// TODO: Реализовать функцию для удаления старых кэшированных статей
// function cleanOldCache() { ... }
```

**Файл: `public/js/pwa.js` (PWA функциональность)**

```javascript
// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered:', registration.scope);
            
            // Проверяем обновления
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('New service worker found');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

// Установка приложения (Add to Home Screen)
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Предотвращаем автоматическое отображение
    e.preventDefault();
    
    // Сохраняем событие для последующего вызова
    deferredPrompt = e;
    
    // Показываем кнопку установки
    installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // Показываем диалог установки
    deferredPrompt.prompt();
    
    // Ждем ответ пользователя
    const { outcome } = await deferredPrompt.userChoice;
    console.log('User choice:', outcome);
    
    // Очищаем
    deferredPrompt = null;
    installBtn.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
    console.log('App installed successfully');
    installBtn.classList.add('hidden');
});

// Push-уведомления
const notificationBanner = document.getElementById('notificationPermission');
const allowNotificationsBtn = document.getElementById('allowNotifications');
const closeNotificationBtn = document.getElementById('closeNotificationBanner');

async function setupPushNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('Push notifications not supported');
        return;
    }
    
    // Проверяем, не спрашивали ли уже
    if (localStorage.getItem('notificationPermissionAsked')) {
        return;
    }
    
    // Показываем баннер через некоторое время
    setTimeout(() => {
        if (Notification.permission === 'default') {
            notificationBanner.classList.remove('hidden');
        }
    }, 5000);
    
    allowNotificationsBtn.addEventListener('click', requestNotificationPermission);
    closeNotificationBtn.addEventListener('click', () => {
        notificationBanner.classList.add('hidden');
        localStorage.setItem('notificationPermissionAsked', 'true');
    });
}

async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            notificationBanner.classList.add('hidden');
            localStorage.setItem('notificationPermissionAsked', 'true');
            
            // Подписываемся на push-уведомления
            await subscribeToPush();
        }
    } catch (error) {
        console.error('Notification permission error:', error);
    }
}

async function subscribeToPush() {
    try {
        // Получаем VAPID публичный ключ с сервера
        const response = await fetch('/api/vapid-public-key');
        const { publicKey } = await response.json();
        
        // Регистрируем сервис воркер (если еще не зарегистрирован)
        const registration = await navigator.serviceWorker.ready;
        
        // Подписываемся
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        
        console.log('Push subscription created');
        
        // Отправляем подписку на сервер
        await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        
        console.log('Subscription sent to server');
    } catch (error) {
        console.error('Push subscription error:', error);
    }
}

// Вспомогательная функция для конвертации ключа
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Показ уведомления о обновлении
function showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'notification-banner';
    updateBanner.innerHTML = `
        <p>🔄 Доступна новая версия приложения</p>
        <button onclick="window.location.reload()">Обновить</button>
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(updateBanner);
}

// Инициализация PWA функциональности
document.addEventListener('DOMContentLoaded', () => {
    setupPushNotifications();
});

// TODO: Реализовать функцию для отписки от push-уведомлений
// async function unsubscribeFromPush() { ... }

// TODO: Реализовать функцию для проверки кэшированных ресурсов
// async function checkCacheSize() { ... }
```

**Файл: `public/manifest.json` (Web App Manifest)**

```json
{
    "name": "PWA Новости - прогрессивное новостное приложение",
    "short_name": "PWA News",
    "description": "Новостное приложение с поддержкой офлайн-режима и push-уведомлений",
    "theme_color": "#0F172A",
    "background_color": "#F8FAFC",
    "display": "standalone",
    "display_override": ["window-controls-overlay", "standalone"],
    "scope": "/",
    "start_url": "/",
    "orientation": "portrait-primary",
    "dir": "ltr",
    "lang": "ru",
    "icons": [
        {
            "src": "/icons/icon-72x72.png",
            "sizes": "72x72",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "/icons/icon-96x96.png",
            "sizes": "96x96",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "/icons/icon-128x128.png",
            "sizes": "128x128",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "/icons/icon-144x144.png",
            "sizes": "144x144",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "/icons/icon-152x152.png",
            "sizes": "152x152",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "/icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/icons/icon-384x384.png",
            "sizes": "384x384",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "/icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ],
    "screenshots": [
        {
            "src": "/screenshots/home.jpg",
            "sizes": "1280x720",
            "type": "image/jpeg",
            "form_factor": "wide",
            "label": "Главная страница приложения"
        },
        {
            "src": "/screenshots/mobile.jpg",
            "sizes": "720x1280",
            "type": "image/jpeg",
            "form_factor": "narrow",
            "label": "Мобильная версия"
        }
    ],
    "shortcuts": [
        {
            "name": "Главные новости",
            "short_name": "Главное",
            "description": "Просмотр главных новостей",
            "url": "/?category=general",
            "icons": [{ "src": "/icons/shortcut-general.png", "sizes": "96x96" }]
        },
        {
            "name": "Технологии",
            "short_name": "Техно",
            "description": "Новости технологий",
            "url": "/?category=technology",
            "icons": [{ "src": "/icons/shortcut-tech.png", "sizes": "96x96" }]
        }
    ],
    "categories": ["news", "productivity"],
    "prefer_related_applications": false
}
```

**Файл: `public/service-worker.js` (Service Worker с кэшированием)**

```javascript
const CACHE_NAME = 'pwa-news-v1';
const API_CACHE_NAME = 'api-cache-v1';
const STATIC_CACHE_NAME = 'static-v1';

// Ресурсы для предварительного кэширования
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/pwa.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/news-placeholder.jpg',
    '/icons/badge-72x72.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    // Очистка старых кэшей
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && 
                        cacheName !== API_CACHE_NAME && 
                        cacheName !== STATIC_CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Стратегии кэширования
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // API запросы
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }
    
    // Статические ресурсы
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticRequest(request));
        return;
    }
    
    // HTML страницы
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(request));
        return;
    }
    
    // Остальные запросы
    event.respondWith(handleGenericRequest(request));
});

// Обработка API запросов (Stale-While-Revalidate)
async function handleApiRequest(request) {
    try {
        // Пробуем получить из сети
        const networkResponse = await fetch(request);
        
        // Если успешно, кэшируем
        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network request failed, trying cache:', request.url);
        
        // Если сеть недоступна, пробуем кэш
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Если нет в кэше, возвращаем офлайн-страницу
        return caches.match('/');
    }
}

// Обработка статических ресурсов (Cache-First)
async function handleStaticRequest(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Static asset fetch failed:', request.url);
        // Возвращаем заглушку для изображений
        if (request.destination === 'image') {
            return caches.match('/icons/news-placeholder.jpg');
        }
        return new Response('Resource not available offline', { status: 404 });
    }
}

// Обработка навигационных запросов (Network-First с офлайн-страницей)
async function handleNavigationRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Navigation failed, serving offline page');
        const cachedResponse = await caches.match('/');
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Offline page not cached', { status: 503 });
    }
}

// Общая обработка запросов
async function handleGenericRequest(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        return await fetch(request);
    } catch (error) {
        console.error('Request failed:', request.url);
        return new Response('Request failed', { status: 408 });
    }
}

// Проверка, является ли запрос статическим ресурсом
function isStaticAsset(request) {
    const extensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    const url = request.url.toLowerCase();
    return extensions.some(ext => url.endsWith(ext));
}

// Push-уведомления
self.addEventListener('push', (event) => {
    console.log('Push received:', event);
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = {
                title: 'Новости PWA',
                body: event.data.text(),
                url: '/'
            };
        }
    }
    
    const options = {
        body: data.body || 'Есть новые новости',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now()
        },
        actions: [
            {
                action: 'open',
                title: 'Открыть'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ],
        tag: 'news-notification',
        renotify: true,
        requireInteraction: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Новости PWA', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(windowClients => {
            // Проверяем, есть ли уже открытое окно
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Если нет, открываем новое
            return clients.openWindow(urlToOpen);
        })
    );
});

// TODO: Реализовать фоновую синхронизацию
// self.addEventListener('sync', (event) => { ... });

// TODO: Реализовать стратегию Network-First для критических ресурсов
// async function handleCriticalRequest(request) { ... }
```

### **3. Задания для самостоятельного выполнения (30% дописать)**

#### **A. Реализация эндпоинтов API** (обязательно)

**Задание:** Дописать недостающие эндпоинты в серверной части для получения категорий и архивных новостей.

**Файл: `server/index.js`**

```javascript
// TODO: Реализовать эндпоинт для получения категорий новостей
app.get('/api/categories', (req, res) => {
    const categories = [
        { id: 'general', name: 'Главное', icon: '📰' },
        { id: 'technology', name: 'Технологии', icon: '💻' },
        { id: 'science', name: 'Наука', icon: '🔬' },
        { id: 'sports', name: 'Спорт', icon: '⚽' },
        { id: 'entertainment', name: 'Культура', icon: '🎭' },
        { id: 'business', name: 'Бизнес', icon: '💼' },
        { id: 'health', name: 'Здоровье', icon: '🏥' }
    ];
    res.json(categories);
});

// TODO: Реализовать эндпоинт для новостей по дате
app.get('/api/news/archive', async (req, res) => {
    try {
        const { date, category = 'general' } = req.query;
        
        if (!date) {
            return res.status(400).json({ error: 'Date parameter required' });
        }
        
        // Используем everything endpoint с сортировкой по дате
        const response = await axios.get(`${process.env.NEWS_API_URL}/everything`, {
            params: {
                q: category === 'general' ? 'news' : category,
                from: date,
                to: date,
                sortBy: 'publishedAt',
                apiKey: process.env.NEWS_API_KEY,
                pageSize: 50,
                language: 'ru'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Archive API error:', error.message);
        res.status(500).json({ error: 'Failed to fetch archive news' });
    }
});
```

#### **B. Реализация сохранения статей для офлайн-чтения** (обязательно)

**Задание:** Добавить функциональность сохранения отдельных статей для офлайн-чтения с использованием IndexedDB.

**Файл: `public/js/app.js`**

```javascript
// TODO: Реализовать функцию для сохранения статьи для офлайн-чтения
function saveArticleForOffline(article) {
    if (!('indexedDB' in window)) {
        alert('IndexedDB не поддерживается вашим браузером');
        return;
    }
    
    // Открываем базу данных
    const request = indexedDB.open('NewsDB', 1);
    
    request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Создаем хранилище для статей, если его нет
        if (!db.objectStoreNames.contains('savedArticles')) {
            const store = db.createObjectStore('savedArticles', { keyPath: 'url' });
            store.createIndex('savedAt', 'savedAt', { unique: false });
        }
    };
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['savedArticles'], 'readwrite');
        const store = transaction.objectStore('savedArticles');
        
        // Добавляем статью с меткой времени
        const articleToSave = {
            ...article,
            savedAt: Date.now(),
            _cached: true
        };
        
        store.put(articleToSave);
        
        transaction.oncomplete = () => {
            showNotification('Статья сохранена для офлайн-чтения');
            
            // Обновляем UI карточки
            updateArticleCardForOffline(article.url);
        };
        
        transaction.onerror = (error) => {
            console.error('Error saving article:', error);
            showNotification('Ошибка при сохранении статьи', 'error');
        };
        
        db.close();
    };
}

// TODO: Реализовать функцию для загрузки сохраненных статей
async function loadSavedArticles() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('NewsDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['savedArticles'], 'readonly');
            const store = transaction.objectStore('savedArticles');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result);
                db.close();
            };
            
            getAllRequest.onerror = () => {
                reject(getAllRequest.error);
                db.close();
            };
        };
    });
}

// TODO: Реализовать функцию для удаления старых сохраненных статей
function cleanOldCache(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 дней по умолчанию
    const request = indexedDB.open('NewsDB', 1);
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['savedArticles'], 'readwrite');
        const store = transaction.objectStore('savedArticles');
        const index = store.index('savedAt');
        
        const cutoff = Date.now() - maxAge;
        const range = IDBKeyRange.upperBound(cutoff);
        
        index.openCursor(range).onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
        
        transaction.oncomplete = () => {
            console.log('Old articles cleaned');
            db.close();
        };
    };
}
```

#### **C. Реализация фоновой синхронизации** (дополнительно)

**Задание:** Добавить фоновую синхронизацию для отправки сохраненных действий при восстановлении соединения.

**Файл: `public/service-worker.js`**

```javascript
// TODO: Добавить обработку фоновой синхронизации
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-articles') {
        event.waitUntil(syncArticles());
    }
});

async function syncArticles() {
    try {
        // Получаем сохраненные действия из IndexedDB
        const actions = await getPendingActions();
        
        for (const action of actions) {
            try {
                await fetch(action.url, {
                    method: action.method,
                    headers: action.headers,
                    body: action.body
                });
                
                // Удаляем выполненное действие
                await removePendingAction(action.id);
            } catch (error) {
                console.error('Failed to sync action:', error);
            }
        }
        
        // Уведомляем пользователя
        if (actions.length > 0) {
            self.registration.showNotification('Синхронизация завершена', {
                body: `Сохраненные действия (${actions.length}) синхронизированы`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png'
            });
        }
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// TODO: Добавить функцию для сохранения действий при офлайн-режиме
function saveActionForSync(action) {
    // Сохраняем действие в IndexedDB
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SyncDB', 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pendingActions')) {
                db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['pendingActions'], 'readwrite');
            const store = transaction.objectStore('pendingActions');
            
            store.add({
                ...action,
                createdAt: Date.now()
            });
            
            transaction.oncomplete = () => {
                db.close();
                resolve();
            };
            
            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };
        };
        
        request.onerror = () => reject(request.error);
    });
}
```

#### **D. Реализация кастомной стратегии кэширования** (дополнительно)

**Задание:** Добавить стратегию Network-First для критических ресурсов с таймаутом.

**Файл: `public/service-worker.js`**

```javascript
// TODO: Реализовать стратегию Network-First с таймаутом
async function handleNetworkFirstWithTimeout(request, timeout = 3000) {
    const timeoutPromise = new Promise((resolve) => {
        setTimeout(async () => {
            const cached = await caches.match(request);
            resolve(cached || new Response('Request timeout', { status: 408 }));
        }, timeout);
    });
    
    const fetchPromise = fetch(request.clone())
        .then(async (response) => {
            if (response.ok) {
                const cache = await caches.open(STATIC_CACHE_NAME);
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(async () => {
            const cached = await caches.match(request);
            return cached || new Response('Network failed', { status: 503 });
        });
    
    return Promise.race([fetchPromise, timeoutPromise]);
}

// TODO: Добавить в обработчик fetch для критических ресурсов
if (isCriticalRequest(request)) {
    event.respondWith(handleNetworkFirstWithTimeout(request));
}

function isCriticalRequest(request) {
    const criticalPaths = ['/index.html', '/css/styles.css', '/js/app.js'];
    return criticalPaths.some(path => request.url.includes(path));
}
```

### **4. Запуск и проверка**

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Открыть в браузере
# http://localhost:3000

# Сборка для production
npm run build
NODE_ENV=production npm start

# Проверка Lighthouse (в Chrome DevTools)
# 1. Открыть DevTools (F12)
# 2. Перейти на вкладку Lighthouse
# 3. Выбрать категорию "Progressive Web App"
# 4. Нажать "Generate report"
```

**Проверка PWA функциональности:**

1. **Манифест и установка:**
   - Проверить в DevTools (Application → Manifest)
   - Должна появиться кнопка установки в адресной строке

2. **Service Worker:**
   - Проверить в DevTools (Application → Service Workers)
   - Статус: "Activated and running"

3. **Офлайн-режим:**
   - Отключить интернет в DevTools (Network → Offline)
   - Перезагрузить страницу — должны отображаться кэшированные новости 

4. **Push-уведомления:**
   - Разрешить уведомления
   - Отправить тестовое уведомление через API:
```bash
curl -X POST http://localhost:3000/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{"title":"Тест","body":"Тестовое уведомление","url":"/"}'
```

### **5. Что должно быть в отчёте:**

1. **Исходный код:**
   - Файл `server/index.js` с реализованными эндпоинтами
   - Файл `public/js/app.js` с функциями сохранения статей
   - Файл `public/service-worker.js` с реализованной синхронизацией (если выполнялось доп. задание)
   - Файл `public/manifest.json` с корректными иконками

2. **Скриншоты:**
   - Главный экран приложения с загруженными новостями
   - Экран с кэшированными статьями в офлайн-режиме
   - Диалог установки приложения (Add to Home Screen)
   - Скриншот отчета Lighthouse с оценкой PWA (не ниже 90)
   - Push-уведомление на устройстве

3. **Ответы на вопросы:**
   - В чем разница между Cache-First и Network-First стратегиями кэширования?
   - Как Service Worker обеспечивает работу приложения в офлайн-режиме?
   - Какие данные хранятся в манифесте и зачем нужен каждый параметр?
   - Как работают push-уведомления в PWA и чем отличаются от нативных?
   - Какие ограничения есть у PWA по сравнению с нативными приложениями? 

### **6. Критерии оценивания:**

#### **Обязательные требования (минимум для зачета):**
- **API эндпоинты:** Реализованы все запрошенные эндпоинты, данные корректно загружаются
- **Офлайн-доступ:** Service Worker кэширует новости, приложение работает без интернета
- **Установка:** Корректно настроен манифест, приложение устанавливается на устройство

#### **Дополнительные критерии (для повышения оценки):**
- **Сохранение статей:** Реализовано сохранение отдельных статей в IndexedDB
- **Фоновая синхронизация:** Реализована синхронизация действий при восстановлении соединения
- **Push-уведомления:** Полная поддержка push-уведомлений с VAPID ключами
- **Производительность:** Оценка Lighthouse PWA не ниже 95

#### **Неприемлемые ошибки:**
- Service Worker не кэширует ресурсы (приложение не работает офлайн)
- Отсутствует манифест или иконки (приложение не устанавливается)
- Утечки памяти при работе с IndexedDB
- Нет обработки ошибок при отсутствии сети

### **7. Полезные команды для Ubuntu:**

```bash
# Генерация VAPID ключей для push-уведомлений
npm install -g web-push
web-push generate-vapid-keys

# Создание иконок для PWA (требуется ImageMagick)
# Установка ImageMagick
sudo apt-get install imagemagick

# Создание иконок разных размеров
convert icon-original.png -resize 72x72 public/icons/icon-72x72.png
convert icon-original.png -resize 96x96 public/icons/icon-96x96.png
convert icon-original.png -resize 128x128 public/icons/icon-128x128.png
convert icon-original.png -resize 144x144 public/icons/icon-144x144.png
convert icon-original.png -resize 152x152 public/icons/icon-152x152.png
convert icon-original.png -resize 192x192 public/icons/icon-192x192.png
convert icon-original.png -resize 384x384 public/icons/icon-384x384.png
convert icon-original.png -resize 512x512 public/icons/icon-512x512.png

# Проверка валидности манифеста
npx pwaviz public/manifest.json

# Анализ Service Worker
npx workbox-cli wizard

# Деплой на Netlify или Vercel
npm run build
npx netlify deploy
```

### **8. Структура проекта:**

```
pwa-news/
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   └── pwa.js
│   ├── icons/
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   ├── icon-512x512.png
│   │   ├── badge-72x72.png
│   │   └── news-placeholder.jpg
│   ├── screenshots/
│   │   ├── home.jpg
│   │   └── mobile.jpg
│   ├── index.html
│   ├── manifest.json
│   ├── service-worker.js
│   └── offline.html
├── server/
│   └── index.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

### **9. Советы по выполнению:**

1. **Изучите архитектуру PWA:** Понимание жизненного цикла Service Worker критически важно для отладки .

2. **Используйте DevTools:** Вкладка Application в Chrome DevTools предоставляет всю информацию о Service Worker, кэше и манифесте.

3. **Тестирование офлайн-режима:**
   - В DevTools: Network → Offline
   - Или физически отключите Wi-Fi

4. **VAPID ключи:** Обязательно сохраните сгенерированные ключи в `.env` — они нужны для работы push-уведомлений .

5. **Типичные проблемы:**
   - **Service Worker не регистрируется** — проверьте путь к файлу и HTTPS (в production PWA требуют HTTPS)
   - **Кэш не обновляется** — увеличьте версию в `CACHE_NAME`
   - **Иконки не отображаются** — проверьте пути в манифесте
   - **Push-уведомления не работают** — убедитесь, что VAPID ключи совпадают на клиенте и сервере

6. **Оптимизация:**
   - Используйте Workbox для сложных стратегий кэширования 
   - Минифицируйте CSS и JS для production
   - Оптимизируйте изображения

7. **Тестирование на реальных устройствах:**
   - Для Android: используйте Chrome Remote Debugging
   - Для iOS: используйте Safari Web Inspector

**Примечание:** В задании предоставлено ~70% кода. Ваша задача — понять принципы работы прогрессивных веб-приложений, жизненный цикл Service Worker, стратегии кэширования, работу с IndexedDB и Push API, а затем дописать недостающие ~30% функциональности для полноценного PWA, которое можно установить на телефон и читать новости без интернета.