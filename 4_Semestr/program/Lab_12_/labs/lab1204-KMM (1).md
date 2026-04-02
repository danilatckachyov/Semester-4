# **Лабораторная работа 12. Часть 4: Kotlin Multiplatform Mobile (KMM) — общая бизнес-логика**

## **Тема:** Разработка приложения с общей бизнес-логикой на Kotlin Multiplatform и нативным UI (Jetpack Compose + SwiftUI)

### **Цель работы:**
Получить практические навыки создания приложения с использованием Kotlin Multiplatform Mobile, научиться выделять общую бизнес-логику в shared-модуль, использовать механизм ожидаемых/фактических объявлений (expect/actual) и интегрировать общий код с нативным UI на Android (Jetpack Compose) и iOS (SwiftUI).

---

## **Задание: Приложение "Калькулятор расходов" (Expense Tracker)**

Разработать кроссплатформенное приложение для учёта личных расходов с использованием KMM. Общая бизнес-логика (расчёты, работа с базой данных, валидация) должна быть реализована в shared-модуле на Kotlin. UI должен быть полностью нативным: Jetpack Compose для Android и SwiftUI для iOS. Приложение должно демонстрировать преимущества KMM — переиспользование кода при сохранении нативного UX.

### **1. Настройка проекта KMM**

**Создание проекта с помощью KMM плагина в Android Studio:**

1. Открыть Android Studio → New Project
2. Выбрать шаблон **"Kotlin Multiplatform App"**
3. Настроить проект:
   - Name: `ExpenseTracker`
   - Package name: `com.example.expensetracker`
   - Minimum SDK: API 24
   - Application name: ExpenseTracker

**Структура проекта после создания:**

```
ExpenseTracker/
├── shared/                 # Общий Kotlin Multiplatform модуль
│   ├── src/
│   │   ├── androidMain/    # Android-специфичный код
│   │   ├── commonMain/     # Общий код для всех платформ
│   │   └── iosMain/        # iOS-специфичный код
│   └── build.gradle.kts
├── androidApp/             # Android-приложение (Jetpack Compose)
│   └── src/
├── iosApp/                 # iOS-приложение (SwiftUI)
│   └── Sources/
└── build.gradle.kts
```

**Файл: `shared/build.gradle.kts` — зависимости общего модуля:**

```kotlin
kotlin {
    androidTarget()
    iosX64()
    iosArm64()
    iosSimulatorArm64()
    
    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")
                
                // Koin для DI
                implementation("io.insert-koin:koin-core:3.5.3")
                implementation("io.insert-koin:koin-compose:1.1.2")
                
                // SQLDelight для БД
                implementation("app.cash.sqldelight:coroutines-extensions:2.0.2")
                implementation("app.cash.sqldelight:runtime:2.0.2")
            }
        }
        
        val androidMain by getting {
            dependencies {
                implementation("app.cash.sqldelight:android-driver:2.0.2")
            }
        }
        
        val iosMain by getting {
            dependencies {
                implementation("app.cash.sqldelight:native-driver:2.0.2")
            }
        }
    }
}

// Настройка SQLDelight
sqldelight {
    databases {
        create("ExpenseDatabase") {
            packageName.set("com.example.expensetracker.db")
            srcDirs("src/commonMain/sqldelight")
        }
    }
}
```

**Файл: `shared/src/commonMain/sqldelight/com/example/expensetracker/db/ExpenseDatabase.sq`**

```sql
-- Таблица категорий расходов
CREATE TABLE category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    isDefault INTEGER AS Boolean DEFAULT 0
);

-- Таблица расходов
CREATE TABLE expense (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    categoryId INTEGER NOT NULL,
    description TEXT,
    date INTEGER NOT NULL, -- timestamp
    isSynced INTEGER AS Boolean DEFAULT 0,
    FOREIGN KEY(categoryId) REFERENCES category(id)
);

-- Таблица бюджета по категориям
CREATE TABLE budget (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryId INTEGER NOT NULL UNIQUE,
    amount REAL NOT NULL,
    month INTEGER NOT NULL, -- month timestamp (first day of month)
    FOREIGN KEY(categoryId) REFERENCES category(id)
);

-- Вставка стандартных категорий
INSERT INTO category (name, color, icon, isDefault) VALUES
    ('🍔 Еда', '#FF5722', 'restaurant', 1),
    ('🚗 Транспорт', '#2196F3', 'directions_car', 1),
    ('🏠 Жильё', '#4CAF50', 'home', 1),
    ('💊 Здоровье', '#F44336', 'favorite', 1),
    ('🎮 Развлечения', '#9C27B0', 'movie', 1),
    ('🛒 Покупки', '#FF9800', 'shopping_cart', 1);
```

### **2. Базовый код общего модуля (shared)**

**Файл: `shared/src/commonMain/kotlin/com/example/expensetracker/models/Expense.kt`**

```kotlin
package com.example.expensetracker.models

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

@Serializable
data class Category(
    val id: Long,
    val name: String,
    val color: String,
    val icon: String,
    val isDefault: Boolean = false
)

@Serializable
data class Expense(
    val id: Long,
    val amount: Double,
    val categoryId: Long,
    val description: String?,
    val date: Instant,
    val isSynced: Boolean = false
) {
    // Валидация суммы
    fun isValid(): Boolean = amount > 0
    
    // Форматирование даты для отображения
    fun formattedDate(): String {
        // TODO: Добавить форматирование с учетом локали
        return date.toString()
    }
}

@Serializable
data class Budget(
    val id: Long,
    val categoryId: Long,
    val amount: Double,
    val month: Instant // первый день месяца
) {
    // Расчет остатка бюджета
    fun remainingAmount(totalSpent: Double): Double = amount - totalSpent
    
    // Процент использования
    fun usagePercentage(totalSpent: Double): Double {
        if (amount <= 0) return 0.0
        return (totalSpent / amount).coerceIn(0.0, 1.0)
    }
}

// TODO: Создать data class для статистики
// data class CategoryStats(
//     val category: Category,
//     val totalSpent: Double,
//     val budget: Double?,
//     val transactionCount: Int
// )
```

**Файл: `shared/src/commonMain/kotlin/com/example/expensetracker/db/Database.kt`**

```kotlin
package com.example.expensetracker.db

import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToList
import com.example.expensetracker.ExpenseDatabase
import com.example.expensetracker.models.Category
import com.example.expensetracker.models.Expense
import com.example.expensetracker.models.Budget
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.datetime.Instant
import kotlinx.datetime.toKotlinInstant
import kotlinx.datetime.toJavaInstant
import kotlinx.datetime.toLocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atStartOfDay
import kotlinx.datetime.LocalDate
import kotlinx.datetime.number

class Database(
    private val driver: SqlDriver
) {
    private val db = ExpenseDatabase(driver)
    
    // Категории
    fun getAllCategories(): Flow<List<Category>> {
        return db.categoryQueries.selectAll()
            .asFlow()
            .mapToList(Dispatchers.IO)
            .map { list ->
                list.map { category ->
                    Category(
                        id = category.id,
                        name = category.name,
                        color = category.color,
                        icon = category.icon,
                        isDefault = category.isDefault == 1L
                    )
                }
            }
    }
    
    suspend fun insertCategory(category: Category) {
        db.categoryQueries.insert(
            name = category.name,
            color = category.color,
            icon = category.icon,
            isDefault = if (category.isDefault) 1 else 0
        )
    }
    
    // Расходы
    fun getExpensesForMonth(year: Int, month: Int): Flow<List<Expense>> {
        val startOfMonth = LocalDate(year, month, 1)
            .atStartOfDay(TimeZone.currentSystemDefault())
        val endOfMonth = LocalDate(year, month, 1)
            .plusMonths(1)
            .atStartOfDay(TimeZone.currentSystemDefault())
        
        return db.expenseQueries.selectByDateRange(
            start = startOfMonth.toEpochMilliseconds(),
            end = endOfMonth.toEpochMilliseconds()
        ).asFlow().mapToList(Dispatchers.IO).map { list ->
            list.map { expense ->
                Expense(
                    id = expense.id,
                    amount = expense.amount,
                    categoryId = expense.categoryId,
                    description = expense.description,
                    date = Instant.fromEpochMilliseconds(expense.date),
                    isSynced = expense.isSynced == 1L
                )
            }
        }
    }
    
    suspend fun insertExpense(expense: Expense) {
        db.expenseQueries.insert(
            amount = expense.amount,
            categoryId = expense.categoryId,
            description = expense.description,
            date = expense.date.toEpochMilliseconds(),
            isSynced = if (expense.isSynced) 1 else 0
        )
    }
    
    suspend fun deleteExpense(id: Long) {
        db.expenseQueries.deleteById(id)
    }
    
    suspend fun updateExpense(expense: Expense) {
        db.expenseQueries.update(
            id = expense.id,
            amount = expense.amount,
            categoryId = expense.categoryId,
            description = expense.description,
            date = expense.date.toEpochMilliseconds(),
            isSynced = if (expense.isSynced) 1 else 0
        )
    }
    
    // Бюджеты
    fun getBudgetForMonth(year: Int, month: Int): Flow<List<Budget>> {
        val monthStart = LocalDate(year, month, 1)
            .atStartOfDay(TimeZone.currentSystemDefault())
        
        return db.budgetQueries.selectByMonth(monthStart.toEpochMilliseconds())
            .asFlow()
            .mapToList(Dispatchers.IO)
            .map { list ->
                list.map { budget ->
                    Budget(
                        id = budget.id,
                        categoryId = budget.categoryId,
                        amount = budget.amount,
                        month = Instant.fromEpochMilliseconds(budget.month)
                    )
                }
            }
    }
    
    suspend fun insertBudget(budget: Budget) {
        db.budgetQueries.insert(
            categoryId = budget.categoryId,
            amount = budget.amount,
            month = budget.month.toEpochMilliseconds()
        )
    }
    
    suspend fun updateBudget(budget: Budget) {
        db.budgetQueries.update(
            id = budget.id,
            amount = budget.amount
        )
    }
    
    // TODO: Реализовать метод получения статистики по категориям
    // suspend fun getCategoryStats(year: Int, month: Int): List<CategoryStats> { ... }
}
```

**Файл: `shared/src/commonMain/kotlin/com/example/expensetracker/db/DatabaseDriverFactory.kt`**

```kotlin
package com.example.expensetracker.db

import app.cash.sqldelight.db.SqlDriver

expect class DatabaseDriverFactory {
    fun createDriver(): SqlDriver
}
```

**Файл: `shared/src/androidMain/kotlin/com/example/expensetracker/db/DatabaseDriverFactory.kt`**

```kotlin
package com.example.expensetracker.db

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import com.example.expensetracker.ExpenseDatabase

actual class DatabaseDriverFactory(
    private val context: Context
) {
    actual fun createDriver(): SqlDriver {
        return AndroidSqliteDriver(
            schema = ExpenseDatabase.Schema,
            name = "expense.db",
            context = context
        )
    }
}
```

**Файл: `shared/src/iosMain/kotlin/com/example/expensetracker/db/DatabaseDriverFactory.kt`**

```kotlin
package com.example.expensetracker.db

import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.native.NativeSqliteDriver
import com.example.expensetracker.ExpenseDatabase

actual class DatabaseDriverFactory {
    actual fun createDriver(): SqlDriver {
        return NativeSqliteDriver(
            schema = ExpenseDatabase.Schema,
            name = "expense.db"
        )
    }
}
```

**Файл: `shared/src/commonMain/kotlin/com/example/expensetracker/viewmodels/ExpensesViewModel.kt`**

```kotlin
package com.example.expensetracker.viewmodels

import com.example.expensetracker.db.Database
import com.example.expensetracker.models.Category
import com.example.expensetracker.models.Expense
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.todayIn

class ExpensesViewModel(
    private val database: Database
) {
    private val viewModelScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    
    // Состояние UI
    private val _state = MutableStateFlow(ExpensesState())
    val state: StateFlow<ExpensesState> = _state.asStateFlow()
    
    // Текущие дата и время
    private val currentDate = Clock.System.now()
    private val currentLocalDate = currentDate.toLocalDateTime(TimeZone.currentSystemDefault()).date
    
    private var _currentMonth = MutableStateFlow(
        LocalDate(currentLocalDate.year, currentLocalDate.monthNumber, 1)
    )
    
    init {
        loadData()
    }
    
    private fun loadData() {
        combine(
            database.getAllCategories(),
            _currentMonth.flatMapLatest { date ->
                database.getExpensesForMonth(date.year, date.monthNumber)
            },
            _currentMonth.flatMapLatest { date ->
                database.getBudgetForMonth(date.year, date.monthNumber)
            }
        ) { categories, expenses, budgets ->
            _state.update { it.copy(
                categories = categories,
                expenses = expenses,
                budgets = budgets,
                isLoading = false
            )}
        }.catch { error ->
            _state.update { it.copy(
                error = error.message,
                isLoading = false
            )}
        }.launchIn(viewModelScope)
    }
    
    fun addExpense(amount: Double, categoryId: Long, description: String?) {
        viewModelScope.launch {
            val expense = Expense(
                id = 0,
                amount = amount,
                categoryId = categoryId,
                description = description,
                date = Clock.System.now()
            )
            database.insertExpense(expense)
        }
    }
    
    fun deleteExpense(id: Long) {
        viewModelScope.launch {
            database.deleteExpense(id)
        }
    }
    
    fun setMonth(year: Int, month: Int) {
        _currentMonth.value = LocalDate(year, month, 1)
    }
    
    fun previousMonth() {
        val current = _currentMonth.value
        val newMonth = if (current.monthNumber == 1) {
            LocalDate(current.year - 1, 12, 1)
        } else {
            LocalDate(current.year, current.monthNumber - 1, 1)
        }
        _currentMonth.value = newMonth
    }
    
    fun nextMonth() {
        val current = _currentMonth.value
        val newMonth = if (current.monthNumber == 12) {
            LocalDate(current.year + 1, 1, 1)
        } else {
            LocalDate(current.year, current.monthNumber + 1, 1)
        }
        _currentMonth.value = newMonth
    }
    
    // TODO: Реализовать метод расчета статистики
    // fun calculateCategoryStats(): List<CategoryStats> { ... }
    
    // TODO: Реализовать метод установки бюджета
    // fun setBudget(categoryId: Long, amount: Double) { ... }
    
    fun clearError() {
        _state.update { it.copy(error = null) }
    }
    
    fun onCleared() {
        viewModelScope.cancel()
    }
}

data class ExpensesState(
    val categories: List<Category> = emptyList(),
    val expenses: List<Expense> = emptyList(),
    val budgets: List<Budget> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null
) {
    // Общая сумма расходов за месяц
    val totalExpenses: Double
        get() = expenses.sumOf { it.amount }
    
    // Расходы по категориям
    val expensesByCategory: Map<Long, Double>
        get() = expenses.groupBy { it.categoryId }
            .mapValues { (_, list) -> list.sumOf { it.amount } }
    
    // TODO: Добавить вычисляемое свойство для топ-категорий
    // val topCategories: List<Pair<Category, Double>>
}
```

**Файл: `shared/src/commonMain/kotlin/com/example/expensetracker/utils/CurrencyFormatter.kt`**

```kotlin
package com.example.expensetracker.utils

import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

expect class CurrencyFormatter {
    fun formatAmount(amount: Double): String
    fun formatDate(timestamp: Instant): String
    fun formatMonth(year: Int, month: Int): String
}

// TODO: Создать expect/actual для форматирования дат и валюты
```

**Файл: `shared/src/androidMain/kotlin/com/example/expensetracker/utils/CurrencyFormatter.kt`**

```kotlin
package com.example.expensetracker.utils

import android.icu.text.DateFormat
import android.icu.text.NumberFormat
import com.example.expensetracker.models.Expense
import kotlinx.datetime.Instant
import kotlinx.datetime.toJavaInstant
import java.util.Locale

actual class CurrencyFormatter {
    private val currencyFormat = NumberFormat.getCurrencyInstance(Locale.getDefault())
    private val dateFormat = DateFormat.getDateInstance(DateFormat.MEDIUM)
    private val monthFormat = DateFormat.getDateInstance(DateFormat.LONG)
    
    actual fun formatAmount(amount: Double): String {
        return currencyFormat.format(amount)
    }
    
    actual fun formatDate(timestamp: Instant): String {
        return dateFormat.format(java.util.Date(timestamp.toEpochMilliseconds()))
    }
    
    actual fun formatMonth(year: Int, month: Int): String {
        val calendar = java.util.Calendar.getInstance()
        calendar.set(year, month - 1, 1)
        return monthFormat.format(calendar.time)
    }
}
```

**Файл: `shared/src/iosMain/kotlin/com/example/expensetracker/utils/CurrencyFormatter.kt`**

```kotlin
package com.example.expensetracker.utils

import kotlinx.datetime.Instant
import platform.Foundation.NSDate
import platform.Foundation.NSDateFormatter
import platform.Foundation.NSNumberFormatter
import platform.Foundation.NSLocale
import platform.Foundation.currentLocale

actual class CurrencyFormatter {
    private val numberFormatter = NSNumberFormatter().apply {
        numberStyle = NSNumberFormatterCurrencyStyle
        locale = NSLocale.currentLocale
    }
    
    private val dateFormatter = NSDateFormatter().apply {
        dateStyle = NSDateFormatterMediumStyle
    }
    
    private val monthFormatter = NSDateFormatter().apply {
        dateFormat = "MMMM yyyy"
    }
    
    actual fun formatAmount(amount: Double): String {
        return numberFormatter.stringFromNumber(amount) ?: "$amount"
    }
    
    actual fun formatDate(timestamp: Instant): String {
        val date = NSDate(timestamp.toEpochMilliseconds() / 1000.0)
        return dateFormatter.stringFromDate(date) ?: timestamp.toString()
    }
    
    actual fun formatMonth(year: Int, month: Int): String {
        val calendar = platform.Foundation.NSCalendar.currentCalendar
        val components = platform.Foundation.NSDateComponents().apply {
            this.year = year
            this.month = month
            this.day = 1
        }
        val date = calendar.dateFromComponents(components) ?: return ""
        return monthFormatter.stringFromDate(date) ?: ""
    }
}
```

### **3. Базовый код Android-приложения (androidApp)**

**Файл: `androidApp/src/main/java/com/example/expensetracker/android/MainActivity.kt`**

```kotlin
package com.example.expensetracker.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.expensetracker.android.ui.ExpenseTrackerApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ExpenseTrackerApp(
                        context = applicationContext
                    )
                }
            }
        }
    }
}
```

**Файл: `androidApp/src/main/java/com/example/expensetracker/android/ui/ExpenseTrackerApp.kt`**

```kotlin
package com.example.expensetracker.android.ui

import android.app.Application
import android.content.Context
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.expensetracker.db.Database
import com.example.expensetracker.db.DatabaseDriverFactory
import com.example.expensetracker.viewmodels.ExpensesViewModel

@Composable
fun ExpenseTrackerApp(
    context: Context
) {
    // Инициализация базы данных
    val database = remember {
        val driverFactory = DatabaseDriverFactory(context)
        Database(driverFactory.createDriver())
    }
    
    // Создание ViewModel
    val viewModel: ExpensesViewModel = viewModel(
        factory = ExpensesViewModelFactory(database)
    )
    
    // Основная навигация
    var selectedTab by remember { mutableStateOf(0) }
    
    when (selectedTab) {
        0 -> ExpensesScreen(
            viewModel = viewModel,
            onNavigateToAdd = { /* TODO */ }
        )
        1 -> StatsScreen(viewModel)
        2 -> SettingsScreen()
    }
    
    // Bottom Navigation Bar
    BottomNavigationBar(
        selectedTab = selectedTab,
        onTabSelected = { selectedTab = it }
    )
}
```

**Файл: `androidApp/src/main/java/com/example/expensetracker/android/ui/ExpensesScreen.kt`**

```kotlin
package com.example.expensetracker.android.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.expensetracker.models.Expense
import com.example.expensetracker.utils.CurrencyFormatter
import com.example.expensetracker.viewmodels.ExpensesViewModel
import com.example.expensetracker.viewmodels.ExpensesState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpensesScreen(
    viewModel: ExpensesViewModel,
    onNavigateToAdd: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    val currencyFormatter = remember { CurrencyFormatter() }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Расходы") },
                actions = {
                    // Переключение месяцев
                    MonthSelector(
                        viewModel = viewModel,
                        formatter = currencyFormatter
                    )
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onNavigateToAdd) {
                Icon(Icons.Default.Add, contentDescription = "Добавить")
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                ExpensesContent(
                    state = state,
                    formatter = currencyFormatter,
                    onDeleteExpense = { expense ->
                        viewModel.deleteExpense(expense.id)
                    }
                )
            }
        }
    }
}

@Composable
fun MonthSelector(
    viewModel: ExpensesViewModel,
    formatter: CurrencyFormatter
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(horizontal = 8.dp)
    ) {
        IconButton(onClick = { viewModel.previousMonth() }) {
            Text("<")
        }
        
        Text(
            text = "Ноябрь 2024", // TODO: Получить из viewModel
            modifier = Modifier.padding(horizontal = 8.dp)
        )
        
        IconButton(onClick = { viewModel.nextMonth() }) {
            Text(">")
        }
    }
}

@Composable
fun ExpensesContent(
    state: ExpensesState,
    formatter: CurrencyFormatter,
    onDeleteExpense: (Expense) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Заголовок с общей суммой
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Всего за месяц",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = formatter.formatAmount(state.totalExpenses),
                        style = MaterialTheme.typography.headlineMedium
                    )
                }
            }
        }
        
        // Список расходов
        items(state.expenses) { expense ->
            ExpenseItem(
                expense = expense,
                formatter = formatter,
                category = state.categories.find { it.id == expense.categoryId },
                onDelete = { onDeleteExpense(expense) }
            )
        }
    }
}

@Composable
fun ExpenseItem(
    expense: Expense,
    formatter: CurrencyFormatter,
    category: Category?,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Иконка категории
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(
                            color = Color(android.graphics.Color.parseColor(category?.color ?: "#808080")),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = category?.icon ?: "📦",
                        fontSize = 20.sp
                    )
                }
                
                // Детали
                Column {
                    Text(
                        text = category?.name ?: "Без категории",
                        fontWeight = FontWeight.Bold
                    )
                    expense.description?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = formatter.formatDate(expense.date),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            
            // Сумма и удаление
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatter.formatAmount(expense.amount),
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(end = 8.dp)
                )
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Удалить",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}
```

### **4. Базовый код iOS-приложения (iosApp)**

**Файл: `iosApp/Sources/iosApp/iosApp.swift`**

```swift
import SwiftUI
import shared

@main
struct iosApp: App {
    // Инициализация общей логики
    let database: Database
    let viewModel: ExpensesViewModel
    let currencyFormatter: CurrencyFormatter
    
    init() {
        // Создание драйвера базы данных для iOS
        let driverFactory = DatabaseDriverFactory()
        self.database = Database(driverFactory: driverFactory)
        self.viewModel = ExpensesViewModel(database: database)
        self.currencyFormatter = CurrencyFormatter()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView(
                viewModel: viewModel,
                formatter: currencyFormatter
            )
        }
    }
}
```

**Файл: `iosApp/Sources/iosApp/ContentView.swift`**

```swift
import SwiftUI
import shared

struct ContentView: View {
    @ObservedObject private var viewModel: ExpensesObservableViewModel
    private let formatter: CurrencyFormatter
    
    init(viewModel: ExpensesViewModel, formatter: CurrencyFormatter) {
        self.viewModel = ExpensesObservableViewModel(wrapped: viewModel)
        self.formatter = formatter
    }
    
    var body: some View {
        TabView {
            ExpensesScreen(
                viewModel: viewModel,
                formatter: formatter
            )
            .tabItem {
                Label("Расходы", systemImage: "list.bullet")
            }
            
            StatsScreen(
                viewModel: viewModel,
                formatter: formatter
            )
            .tabItem {
                Label("Статистика", systemImage: "chart.pie")
            }
            
            SettingsScreen()
                .tabItem {
                    Label("Настройки", systemImage: "gear")
                }
        }
    }
}

// ObservableObject-обертка для ViewModel
class ExpensesObservableViewModel: ObservableObject {
    private let viewModel: ExpensesViewModel
    @Published var state: ExpensesState = ExpensesState()
    private var stateDisposable: StateDisposable?
    
    init(wrapped: ExpensesViewModel) {
        self.viewModel = wrapped
        self.stateDisposable = wrapped.state.subscribe { [weak self] state in
            self?.state = state
        }
    }
    
    func addExpense(amount: Double, categoryId: Int64, description: String?) {
        viewModel.addExpense(amount: amount, categoryId: categoryId, description: description)
    }
    
    func deleteExpense(id: Int64) {
        viewModel.deleteExpense(id: id)
    }
    
    deinit {
        stateDisposable?.dispose()
    }
}

protocol StateDisposable {
    func dispose()
}

extension Kotlinx_coroutines_coreJob: StateDisposable {}
```

**Файл: `iosApp/Sources/iosApp/ExpensesScreen.swift`**

```swift
import SwiftUI
import shared

struct ExpensesScreen: View {
    @ObservedObject var viewModel: ExpensesObservableViewModel
    let formatter: CurrencyFormatter
    @State private var showingAddExpense = false
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.state.isLoading {
                    ProgressView()
                } else {
                    List {
                        // Заголовок с общей суммой
                        Section {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Всего за месяц")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Text(formatter.formatAmount(amount: viewModel.state.totalExpenses))
                                    .font(.largeTitle)
                                    .fontWeight(.bold)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 8)
                        }
                        
                        // Список расходов
                        Section("Детали") {
                            ForEach(viewModel.state.expenses, id: \.id) { expense in
                                ExpenseItemView(
                                    expense: expense,
                                    formatter: formatter,
                                    category: viewModel.state.categories.first(where: { $0.id == expense.categoryId })
                                )
                            }
                            .onDelete { indexSet in
                                for index in indexSet {
                                    let expense = viewModel.state.expenses[index]
                                    viewModel.deleteExpense(id: expense.id)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Расходы")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddExpense = true }) {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .navigationBarLeading) {
                    MonthSelectorView(viewModel: viewModel, formatter: formatter)
                }
            }
            .sheet(isPresented: $showingAddExpense) {
                AddExpenseSheet(
                    viewModel: viewModel,
                    formatter: formatter,
                    isPresented: $showingAddExpense
                )
            }
        }
    }
}

struct ExpenseItemView: View {
    let expense: Expense
    let formatter: CurrencyFormatter
    let category: Category?
    
    var body: some View {
        HStack(spacing: 12) {
            // Иконка категории
            ZStack {
                Circle()
                    .fill(Color(hex: category?.color ?? "#808080"))
                    .frame(width: 40, height: 40)
                Text(category?.icon ?? "📦")
                    .font(.system(size: 20))
            }
            
            // Детали
            VStack(alignment: .leading, spacing: 4) {
                Text(category?.name ?? "Без категории")
                    .font(.headline)
                if let description = expense.desc {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Text(formatter.formatDate(timestamp: expense.date))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Сумма
            Text(formatter.formatAmount(amount: expense.amount))
                .font(.headline)
                .foregroundColor(.primary)
        }
        .padding(.vertical, 4)
    }
}

struct MonthSelectorView: View {
    @ObservedObject var viewModel: ExpensesObservableViewModel
    let formatter: CurrencyFormatter
    @State private var currentMonth: LocalDate = LocalDate(year: 2024, monthNumber: 11, dayOfMonth: 1)
    
    var body: some View {
        HStack {
            Button(action: { viewModel.previousMonth() }) {
                Image(systemName: "chevron.left")
            }
            
            Text("Ноябрь 2024") // TODO: Получить из viewModel
                .font(.subheadline)
                .frame(minWidth: 100)
            
            Button(action: { viewModel.nextMonth() }) {
                Image(systemName: "chevron.right")
            }
        }
    }
}

// Расширение для создания Color из hex
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
```

**Файл: `iosApp/Sources/iosApp/AddExpenseSheet.swift`**

```swift
import SwiftUI
import shared

struct AddExpenseSheet: View {
    @ObservedObject var viewModel: ExpensesObservableViewModel
    let formatter: CurrencyFormatter
    @Binding var isPresented: Bool
    
    @State private var amount = ""
    @State private var selectedCategoryId: Int64?
    @State private var description = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("Сумма") {
                    TextField("0.00", text: $amount)
                        .keyboardType(.decimalPad)
                }
                
                Section("Категория") {
                    ForEach(viewModel.state.categories, id: \.id) { category in
                        HStack {
                            Text("\(category.icon) \(category.name)")
                            Spacer()
                            if selectedCategoryId == category.id {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedCategoryId = category.id
                        }
                    }
                }
                
                Section("Описание") {
                    TextField("Необязательно", text: $description)
                }
            }
            .navigationTitle("Новый расход")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        isPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        saveExpense()
                        isPresented = false
                    }
                    .disabled(amount.isEmpty || selectedCategoryId == nil)
                }
            }
        }
    }
    
    private func saveExpense() {
        guard let amountDouble = Double(amount),
              let categoryId = selectedCategoryId else {
            return
        }
        
        viewModel.addExpense(
            amount: amountDouble,
            categoryId: categoryId,
            description: description.isEmpty ? nil : description
        )
    }
}
```

### **5. Задания для самостоятельного выполнения (30% дописать)**

#### **A. Реализация статистики по категориям** (обязательно)

**Задание:** Дописать метод `getCategoryStats` в `Database.kt` для получения статистики расходов по категориям за месяц.

**Файл: `shared/src/commonMain/kotlin/com/example/expensetracker/db/Database.kt`**

```kotlin
// TODO: Реализовать метод получения статистики по категориям
suspend fun getCategoryStats(year: Int, month: Int): List<CategoryStats> {
    val startOfMonth = LocalDate(year, month, 1)
        .atStartOfDay(TimeZone.currentSystemDefault())
    val endOfMonth = LocalDate(year, month, 1)
        .plusMonths(1)
        .atStartOfDay(TimeZone.currentSystemDefault())
    
    // Получаем все категории
    val categories = getAllCategories().first()
    
    // Получаем расходы за месяц
    val expenses = getExpensesForMonth(year, month).first()
    
    // Получаем бюджеты
    val budgets = getBudgetForMonth(year, month).first()
    
    // Группируем расходы по категориям
    val expensesByCategory = expenses.groupBy { it.categoryId }
    
    // Формируем статистику
    return categories.map { category ->
        val categoryExpenses = expensesByCategory[category.id] ?: emptyList()
        val totalSpent = categoryExpenses.sumOf { it.amount }
        val budget = budgets.find { it.categoryId == category.id }
        
        CategoryStats(
            category = category,
            totalSpent = totalSpent,
            budget = budget?.amount,
            transactionCount = categoryExpenses.size
        )
    }
}

// Добавить data class CategoryStats в models
```

#### **B. Реализация установки бюджета** (обязательно)

**Задание:** Дописать методы для управления бюджетом в `ExpensesViewModel`.

**Файл: `shared/src/commonMain/kotlin/com/example/expensetracker/viewmodels/ExpensesViewModel.kt`**

```kotlin
// TODO: Реализовать метод установки бюджета
fun setBudget(categoryId: Long, amount: Double) {
    viewModelScope.launch {
        // Проверяем, есть ли уже бюджет на этот месяц
        val existingBudget = _state.value.budgets.find { it.categoryId == categoryId }
        
        if (existingBudget != null) {
            // Обновляем существующий
            val updatedBudget = existingBudget.copy(amount = amount)
            database.updateBudget(updatedBudget)
        } else {
            // Создаем новый
            val newBudget = Budget(
                id = 0,
                categoryId = categoryId,
                amount = amount,
                month = _currentMonth.value.atStartOfDay(TimeZone.currentSystemDefault())
            )
            database.insertBudget(newBudget)
        }
    }
}

// TODO: Добавить вычисляемое свойство для топ-категорий в ExpensesState
val topCategories: List<Pair<Category, Double>>
    get() {
        val categoryTotals = expenses.groupBy { it.categoryId }
            .mapValues { (_, list) -> list.sumOf { it.amount } }
        
        return categories.mapNotNull { category ->
            categoryTotals[category.id]?.let { total ->
                category to total
            }
        }.sortedByDescending { it.second }
            .take(3)
    }
```

#### **C. Создание экрана статистики с графиками** (дополнительно)

**Задание:** Создать экран статистики с отображением круговой диаграммы расходов по категориям.

**Файл: `androidApp/src/main/java/com/example/expensetracker/android/ui/StatsScreen.kt`**

```kotlin
package com.example.expensetracker.android.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.expensetracker.viewmodels.ExpensesViewModel
import com.example.expensetracker.utils.CurrencyFormatter
import kotlin.math.min

@Composable
fun StatsScreen(
    viewModel: ExpensesViewModel
) {
    val state by viewModel.state.collectAsState()
    val formatter = remember { CurrencyFormatter() }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Распределение расходов",
                        style = MaterialTheme.typography.titleMedium
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Круговая диаграмма
                    PieChart(
                        data = state.expensesByCategory.map { (categoryId, amount) ->
                            val category = state.categories.find { it.id == categoryId }
                            PieChartData(
                                value = amount.toFloat(),
                                color = Color(android.graphics.Color.parseColor(category?.color ?: "#808080")),
                                label = category?.name ?: "Другое"
                            )
                        },
                        total = state.totalExpenses.toFloat()
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Легенда
                    state.topCategories.forEach { (category, amount) ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(16.dp)
                                        .background(
                                            color = Color(android.graphics.Color.parseColor(category.color)),
                                            shape = CircleShape
                                        )
                                )
                                Text(category.name)
                            }
                            Text(formatter.formatAmount(amount))
                        }
                    }
                }
            }
        }
        
        item {
            Text(
                text = "Бюджеты",
                style = MaterialTheme.typography.titleLarge
            )
        }
        
        items(state.categories) { category ->
            val budget = state.budgets.find { it.categoryId == category.id }
            val spent = state.expensesByCategory[category.id] ?: 0.0
            
            BudgetItem(
                category = category,
                budget = budget,
                spent = spent,
                formatter = formatter
            )
        }
    }
}

data class PieChartData(
    val value: Float,
    val color: Color,
    val label: String
)

@Composable
fun PieChart(
    data: List<PieChartData>,
    total: Float
) {
    Canvas(
        modifier = Modifier
            .size(200.dp)
            .align(Alignment.CenterHorizontally)
    ) {
        var startAngle = 0f
        data.forEach { slice ->
            val sweepAngle = (slice.value / total) * 360f
            drawArc(
                color = slice.color,
                startAngle = startAngle,
                sweepAngle = sweepAngle,
                useCenter = true
            )
            startAngle += sweepAngle
        }
    }
}

@Composable
fun BudgetItem(
    category: Category,
    budget: Budget?,
    spent: Double,
    formatter: CurrencyFormatter
) {
    val budgetAmount = budget?.amount ?: 0.0
    val progress = if (budgetAmount > 0) (spent / budgetAmount).toFloat() else 0f
    
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${category.icon} ${category.name}",
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${formatter.formatAmount(spent)} / ${formatter.formatAmount(budgetAmount)}"
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Прогресс-бар
            LinearProgressIndicator(
                progress = min(progress, 1f),
                modifier = Modifier.fillMaxWidth(),
                color = if (progress > 1f) MaterialTheme.colorScheme.error
                        else MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.primaryContainer
            )
        }
    }
}
```

### **6. Запуск и проверка**

```bash
# Сборка общего модуля
./gradlew build

# Запуск Android-приложения
./gradlew installDebug

# Сборка iOS-фреймворка (для Xcode)
./gradlew shared:assembleSharedXCFramework

# Открыть iOS проект в Xcode
open iosApp/iosApp.xcodeproj

# Запуск тестов общего модуля
./gradlew shared:test

# Очистка проекта
./gradlew clean
```

**Проверка функциональности:**
1. Запуск Android-приложения на эмуляторе или устройстве
2. Запуск iOS-приложения в симуляторе Xcode
3. Добавление расходов на Android
4. Просмотр расходов на iOS (данные из общей БД)
5. Установка бюджета и проверка статистики

### **7. Что должно быть в отчёте:**

1. **Исходный код:**
   - Файл `Database.kt` с реализованным методом `getCategoryStats`
   - Файл `ExpensesViewModel.kt` с методами управления бюджетом
   - Файл `StatsScreen.kt` для Android (если выполнялось дополнительное задание)
   - Файлы SwiftUI для iOS экранов статистики (аналог StatsScreen)

2. **Скриншоты:**
   - Android-приложение: главный экран с расходами
   - Android-приложение: экран статистики с круговой диаграммой
   - iOS-приложение: главный экран с расходами
   - iOS-приложение: экран добавления расхода
   - Доказательство общей бизнес-логики (одинаковые данные на обеих платформах)

3. **Ответы на вопросы:**
   - В чем преимущество KMM перед другими кроссплатформенными решениями?
   - Как работает механизм `expect`/`actual` в Kotlin Multiplatform?
   - Какие сложности возникают при интеграции общего модуля с iOS?
   - Как обеспечивается потокобезопасность при работе с общей базой данных?

### **8. Критерии оценивания:**

#### **Обязательные требования (минимум для зачета):**
- **Общая логика:** Корректная работа базы данных и ViewModel на обеих платформах
- **Статистика:** Реализован метод `getCategoryStats`, данные корректно агрегируются
- **Бюджеты:** Реализована установка и отображение бюджетов

#### **Дополнительные критерии (для повышения оценки):**
- **Графики:** Реализована круговая диаграмма на обеих платформах
- **Синхронизация:** Данные синхронизируются между платформами через общий модуль
- **Производительность:** Оптимизированы запросы к БД, нет блокировок UI

#### **Неприемлемые ошибки:**
- Утечки памяти из-за неправильной обработки корутин
- Блокировка UI-потока при работе с БД
- Отсутствие обработки ошибок при работе с expect/actual

### **9. Полезные команды для Ubuntu и macOS:**

```bash
# Для Ubuntu (Android разработка)
# Проверка установки Kotlin
kotlinc -version

# Сборка проекта
./gradlew build

# Запуск тестов
./gradlew test

# Для macOS (iOS разработка)
# Установка CocoaPods (если не установлен)
sudo gem install cocoapods

# Установка pod-зависимостей для iOS
cd iosApp
pod install

# Открытие проекта в Xcode
open iosApp.xcworkspace

# Общие команды
# Генерация документации
./gradlew dokka

# Проверка кода линтером
./gradlew ktlintCheck

# Форматирование кода
./gradlew ktlintFormat
```

### **10. Структура проекта (полная):**

```
ExpenseTracker/
├── shared/
│   ├── src/
│   │   ├── commonMain/
│   │   │   ├── kotlin/com/example/expensetracker/
│   │   │   │   ├── models/
│   │   │   │   │   ├── Category.kt
│   │   │   │   │   ├── Expense.kt
│   │   │   │   │   └── Budget.kt
│   │   │   │   ├── db/
│   │   │   │   │   ├── Database.kt
│   │   │   │   │   └── DatabaseDriverFactory.kt
│   │   │   │   ├── viewmodels/
│   │   │   │   │   └── ExpensesViewModel.kt
│   │   │   │   └── utils/
│   │   │   │       └── CurrencyFormatter.kt
│   │   │   └── sqldelight/com/example/expensetracker/db/
│   │   │       └── ExpenseDatabase.sq
│   │   ├── androidMain/
│   │   │   └── kotlin/com/example/expensetracker/
│   │   │       ├── db/
│   │   │       │   └── DatabaseDriverFactory.kt
│   │   │       └── utils/
│   │   │           └── CurrencyFormatter.kt
│   │   └── iosMain/
│   │       └── kotlin/com/example/expensetracker/
│   │           ├── db/
│   │           │   └── DatabaseDriverFactory.kt
│   │           └── utils/
│   │               └── CurrencyFormatter.kt
│   └── build.gradle.kts
├── androidApp/
│   ├── src/main/java/com/example/expensetracker/android/
│   │   ├── MainActivity.kt
│   │   ├── ui/
│   │   │   ├── ExpenseTrackerApp.kt
│   │   │   ├── ExpensesScreen.kt
│   │   │   ├── StatsScreen.kt
│   │   │   └── SettingsScreen.kt
│   │   └── viewmodel/
│   │       └── ExpensesViewModelFactory.kt
│   └── build.gradle.kts
├── iosApp/
│   ├── Sources/
│   │   ├── iosApp/
│   │   │   ├── iosApp.swift
│   │   │   ├── ContentView.swift
│   │   │   ├── ExpensesScreen.swift
│   │   │   ├── AddExpenseSheet.swift
│   │   │   └── StatsScreen.swift
│   │   └── (другие файлы SwiftUI)
│   ├── iosApp.xcodeproj
│   └── Podfile
├── build.gradle.kts
└── settings.gradle.kts
```

### **11. Советы по выполнению:**

1. **Понимание expect/actual:** Механизм ожидаемых/фактических объявлений — ключевая концепция KMM. Изучите, как платформо-зависимый код отделяется от общего.

2. **Работа с SQLDelight:** Все SQL-запросы пишутся в .sq файлах и компилируются в типобезопасный Kotlin-код.

3. **iOS интеграция:** Для работы с общим модулем в iOS нужно импортировать сгенерированный фреймворк. Убедитесь, что пути в Xcode настроены правильно.

4. **Отладка на iOS:** Используйте Xcode для отладки SwiftUI части и Android Studio для общей логики.

5. **Типичные проблемы:**
   - **"Unresolved reference"** — выполните `./gradlew build` для генерации кода
   - **"Expected class has no actual declaration"** — проверьте, что для всех expect есть actual на каждой платформе
   - **iOS сборка падает** — проверьте, что фреймворк собран (`./gradlew shared:assembleSharedXCFramework`)

6. **Coroutines на iOS:** Kotlin coroutines требуют специальной обработки на iOS. В проекте используется `StateDisposable` для отписки.

7. **Тестирование:** Общую логику можно тестировать на JVM без запуска эмуляторов:
```kotlin
// shared/src/commonTest/kotlin/...
class ExpensesViewModelTest {
    @Test
    fun testAddExpense() {
        // Тестирование логики
    }
}
```

**Примечание:** В задании предоставлено ~70% кода. Ваша задача — понять архитектуру KMM, механизм разделения общего и платформо-зависимого кода, работу с SQLDelight и интеграцию с нативным UI (Jetpack Compose и SwiftUI), а затем дописать недостающие ~30% функциональности для полноценного приложения с общей бизнес-логикой.