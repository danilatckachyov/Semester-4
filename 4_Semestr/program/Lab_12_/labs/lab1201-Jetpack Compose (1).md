# **Лабораторная работа 12. Часть 1: Нативная Android-разработка с Jetpack Compose**

## **Тема:** Создание нативного Android-приложения с использованием Jetpack Compose, ViewModel и Room

### **Цель работы:**
Получить практические навыки создания нативного Android-приложения на Kotlin с использованием современного декларативного подхода Jetpack Compose, архитектурных компонентов Jetpack (ViewModel, StateFlow) и локальной базы данных Room.

---

## **Задание: Приложение "Персональный менеджер заметок" (Notes App)**

Разработать нативное Android-приложение для создания, редактирования и просмотра заметок. Приложение должно использовать архитектуру MVVM, хранить данные в локальной базе данных и обеспечивать реактивное обновление интерфейса при изменении данных.

### **1. Настройка проекта**

**Создание нового проекта в Android Studio:**
1. Открыть Android Studio → New Project
2. Выбрать шаблон **"Empty Activity"**
3. Настроить проект:
   - Name: `NotesApp`
   - Package name: `com.example.notesapp`
   - Language: **Kotlin**
   - Minimum SDK: API 24 (Android 7.0)
   - Build configuration language: Kotlin DSL (build.gradle.kts)

**Добавление зависимостей в `app/build.gradle.kts`:**

```kotlin
dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.0")
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    
    // ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    
    // Room
    implementation("androidx.room:room-runtime:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.6")
}
```

**Настройка плагина KSP в `build.gradle.kts` (проект):**

```kotlin
plugins {
    id("com.google.devtools.ksp") version "1.9.0-1.0.13" apply false
}
```

**Синхронизировать проект (Sync Now).**

### **2. Базовый код (70% предоставляется)**

**Файл: `app/src/main/java/com/example/notesapp/data/Note.kt`**

```kotlin
package com.example.notesapp.data

import androidx.room.Entity
import androidx.room.PrimaryKey

// TODO: Добавить поле timestamp (дата создания) типа Long
@Entity(tableName = "notes")
data class Note(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val title: String,
    val content: String
    // TODO: добавить поле createdAt: Long = System.currentTimeMillis()
)
```

**Файл: `app/src/main/java/com/example/notesapp/data/NoteDao.kt`**

```kotlin
package com.example.notesapp.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteDao {
    
    @Query("SELECT * FROM notes ORDER BY id DESC")
    fun getAllNotes(): Flow<List<Note>>
    
    @Insert
    suspend fun insertNote(note: Note)
    
    @Update
    suspend fun updateNote(note: Note)
    
    // TODO: Реализовать метод для удаления заметки
    // Подсказка: используйте аннотацию @Delete
    // fun deleteNote(note: Note)
    
    @Query("SELECT * FROM notes WHERE id = :id")
    suspend fun getNoteById(id: Int): Note?
}
```

**Файл: `app/src/main/java/com/example/notesapp/data/NoteDatabase.kt`**

```kotlin
package com.example.notesapp.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [Note::class], version = 1, exportSchema = false)
abstract class NoteDatabase : RoomDatabase() {
    
    abstract fun noteDao(): NoteDao
    
    companion object {
        @Volatile
        private var INSTANCE: NoteDatabase? = null
        
        fun getDatabase(context: Context): NoteDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    NoteDatabase::class.java,
                    "note_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
```

**Файл: `app/src/main/java/com/example/notesapp/data/NoteRepository.kt`**

```kotlin
package com.example.notesapp.data

import kotlinx.coroutines.flow.Flow

class NoteRepository(private val noteDao: NoteDao) {
    
    val allNotes: Flow<List<Note>> = noteDao.getAllNotes()
    
    suspend fun insertNote(note: Note) {
        noteDao.insertNote(note)
    }
    
    suspend fun updateNote(note: Note) {
        noteDao.updateNote(note)
    }
    
    // TODO: Реализовать метод удаления заметки
    // suspend fun deleteNote(note: Note) { ... }
    
    suspend fun getNoteById(id: Int): Note? {
        return noteDao.getNoteById(id)
    }
}
```

**Файл: `app/src/main/java/com/example/notesapp/ui/NotesViewModel.kt`**

```kotlin
package com.example.notesapp.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.notesapp.data.Note
import com.example.notesapp.data.NoteRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class NotesViewModel(
    private val repository: NoteRepository
) : ViewModel() {
    
    private val _notes = MutableStateFlow<List<Note>>(emptyList())
    val notes: StateFlow<List<Note>> = _notes.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    init {
        loadNotes()
    }
    
    private fun loadNotes() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Подписываемся на Flow из репозитория
                repository.allNotes.collect { notesList ->
                    _notes.value = notesList
                }
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun addNote(title: String, content: String) {
        viewModelScope.launch {
            val note = Note(
                title = title,
                content = content
                // TODO: При добавлении поля timestamp, не забудьте добавить его здесь
            )
            repository.insertNote(note)
        }
    }
    
    // TODO: Реализовать метод updateNote
    // fun updateNote(id: Int, title: String, content: String) { ... }
    
    // TODO: Реализовать метод deleteNote
    // fun deleteNote(note: Note) { ... }
}
```

**Файл: `app/src/main/java/com/example/notesapp/ui/NotesScreen.kt`**

```kotlin
package com.example.notesapp.ui

import androidx.compose.foundation.clickable
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
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.notesapp.data.Note

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesScreen(
    viewModel: NotesViewModel = viewModel(),
    onNoteClick: (Int) -> Unit = {},
    onAddClick: () -> Unit = {}
) {
    val notes by viewModel.notes.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Мои заметки") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddClick) {
                Icon(Icons.Default.Add, contentDescription = "Добавить")
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (isLoading && notes.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else {
                NotesList(
                    notes = notes,
                    onNoteClick = onNoteClick
                )
            }
        }
    }
}

@Composable
fun NotesList(
    notes: List<Note>,
    onNoteClick: (Int) -> Unit
) {
    if (notes.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Нет заметок. Нажмите + чтобы создать",
                style = MaterialTheme.typography.bodyLarge
            )
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(notes) { note ->
                NoteItem(
                    note = note,
                    onClick = { onNoteClick(note.id) }
                )
            }
        }
    }
}

@Composable
fun NoteItem(
    note: Note,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = note.title,
                style = MaterialTheme.typography.titleLarge
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = note.content,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 2
            )
            // TODO: Добавить отображение даты создания
            // Если поле createdAt будет добавлено, вывести его здесь
        }
    }
}
```

**Файл: `app/src/main/java/com/example/notesapp/ui/AddEditNoteScreen.kt`**

```kotlin
package com.example.notesapp.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditNoteScreen(
    onSaveClick: (String, String) -> Unit,
    onNavigateBack: () -> Unit,
    initialTitle: String = "",
    initialContent: String = ""
) {
    var title by remember { mutableStateOf(initialTitle) }
    var content by remember { mutableStateOf(initialContent) }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (initialTitle.isEmpty()) "Новая заметка" else "Редактирование") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Text("Назад")
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            if (title.isNotBlank() && content.isNotBlank()) {
                                onSaveClick(title, content)
                                onNavigateBack()
                            }
                        },
                        enabled = title.isNotBlank() && content.isNotBlank()
                    ) {
                        Text("Сохранить")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Заголовок") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            
            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                label = { Text("Содержание") },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                minLines = 5
            )
        }
    }
}
```

**Файл: `app/src/main/java/com/example/notesapp/MainActivity.kt`**

```kotlin
package com.example.notesapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.notesapp.data.NoteDatabase
import com.example.notesapp.data.NoteRepository
import com.example.notesapp.ui.AddEditNoteScreen
import com.example.notesapp.ui.NotesScreen
import com.example.notesapp.ui.NotesViewModel
import com.example.notesapp.ui.theme.NotesAppTheme

class MainActivity : ComponentActivity() {
    
    private lateinit var noteRepository: NoteRepository
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val database = NoteDatabase.getDatabase(this)
        noteRepository = NoteRepository(database.noteDao())
        
        setContent {
            NotesAppTheme {
                NotesApp(noteRepository)
            }
        }
    }
}

@Composable
fun NotesApp(noteRepository: NoteRepository) {
    val navController = rememberNavController()
    
    NavHost(
        navController = navController,
        startDestination = "notes_list"
    ) {
        composable("notes_list") {
            NotesScreen(
                viewModel = viewModel(
                    factory = NotesViewModelFactory(noteRepository)
                ),
                onNoteClick = { noteId ->
                    // TODO: Реализовать навигацию к экрану редактирования
                    // navController.navigate("add_edit_note/$noteId")
                },
                onAddClick = {
                    navController.navigate("add_edit_note")
                }
            )
        }
        
        composable("add_edit_note") {
            AddEditNoteScreen(
                onSaveClick = { title, content ->
                    // TODO: Получить ViewModel и вызвать addNote
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        // TODO: Добавить маршрут для редактирования существующей заметки
        // composable("add_edit_note/{noteId}") { backStackEntry ->
        //     val noteId = backStackEntry.arguments?.getString("noteId")?.toInt() ?: 0
        //     // Загрузить заметку по ID и передать в экран
        // }
    }
}
```

**Файл: `app/src/main/java/com/example/notesapp/ui/NotesViewModelFactory.kt`**

```kotlin
package com.example.notesapp.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.notesapp.data.NoteRepository

class NotesViewModelFactory(
    private val repository: NoteRepository
) : ViewModelProvider.Factory {
    
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(NotesViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return NotesViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
```

### **3. Задания для самостоятельного выполнения (30% дописать)**

#### **A. Добавление поля даты создания** (обязательно)

**Задание:** Модифицировать класс `Note`, добавив поле `createdAt` для хранения времени создания заметки. Обновить соответствующие методы для работы с этим полем.

**Файл: `app/src/main/java/com/example/notesapp/data/Note.kt`**

```kotlin
// TODO: Раскомментировать и добавить поле createdAt
// Подсказка: используйте Long для хранения timestamp
```

**Файл: `app/src/main/java/com/example/notesapp/ui/NotesViewModel.kt`**

```kotlin
fun addNote(title: String, content: String) {
    viewModelScope.launch {
        val note = Note(
            title = title,
            content = content
            // TODO: Добавить поле createdAt с текущим временем
            // createdAt = System.currentTimeMillis()
        )
        repository.insertNote(note)
    }
}
```

**Файл: `app/src/main/java/com/example/notesapp/ui/NotesScreen.kt`**

```kotlin
// TODO: Модифицировать NoteItem для отображения даты
// Подсказка: создайте функцию formatDate(timestamp: Long): String
// Используйте java.text.SimpleDateFormat или androidx.compose.material3.DatePicker
```

#### **B. Реализация удаления заметок** (обязательно)

**Задание:** Добавить возможность удаления заметок. Реализовать соответствующие методы в DAO, репозитории и ViewModel. Добавить кнопку удаления в элемент списка.

**Файл: `app/src/main/java/com/example/notesapp/data/NoteDao.kt`**

```kotlin
// TODO: Раскомментировать и реализовать метод удаления
@Delete
suspend fun deleteNote(note: Note)
```

**Файл: `app/src/main/java/com/example/notesapp/data/NoteRepository.kt`**

```kotlin
// TODO: Раскомментировать и реализовать метод удаления
suspend fun deleteNote(note: Note) {
    // Вызвать соответствующий метод DAO
}
```

**Файл: `app/src/main/java/com/example/notesapp/ui/NotesViewModel.kt`**

```kotlin
// TODO: Раскомментировать и реализовать метод удаления
fun deleteNote(note: Note) {
    viewModelScope.launch {
        // Вызвать метод репозитория
    }
}
```

**Файл: `app/src/main/java/com/example/notesapp/ui/NotesScreen.kt`**

```kotlin
// TODO: Модифицировать NoteItem, добавив иконку корзины
// Подсказка: используйте IconButton с Icons.Default.Delete
// При клике вызывайте viewModel.deleteNote(note)
```

#### **C. Редактирование заметок** (дополнительно)

**Задание:** Реализовать полноценное редактирование существующих заметок. Для этого необходимо:
1. Добавить навигацию с параметром `noteId`
2. Загружать заметку по ID при открытии экрана редактирования
3. Передавать загруженные данные в `AddEditNoteScreen`

**Файл: `app/src/main/java/com/example/notesapp/ui/NotesViewModel.kt`**

```kotlin
// TODO: Добавить метод getNoteById(id: Int): StateFlow<Note?>
private val _currentNote = MutableStateFlow<Note?>(null)
val currentNote: StateFlow<Note?> = _currentNote.asStateFlow()

fun loadNoteById(id: Int) {
    viewModelScope.launch {
        val note = repository.getNoteById(id)
        _currentNote.value = note
    }
}

// TODO: Добавить метод updateNote
fun updateNote(id: Int, title: String, content: String) {
    viewModelScope.launch {
        // Получить существующую заметку, обновить поля и вызвать repository.updateNote
    }
}
```

**Файл: `app/src/main/java/com/example/notesapp/MainActivity.kt`**

```kotlin
// TODO: Добавить маршрут с параметром в NavHost
composable("add_edit_note/{noteId}") { backStackEntry ->
    val noteId = backStackEntry.arguments?.getString("noteId")?.toInt() ?: 0
    // Создать ViewModel и загрузить заметку по ID
    // Передать данные в AddEditNoteScreen
}
```

### **4. Запуск и проверка**

```bash
# Очистка проекта
./gradlew clean

# Сборка проекта
./gradlew assembleDebug

# Установка на подключенное устройство или эмулятор
./gradlew installDebug

# Запуск тестов (если есть)
./gradlew test
```

**Проверка через Android Studio:**
1. Подключить устройство или запустить эмулятор (Pixel 6 API 30+)
2. Нажать кнопку Run (зеленый треугольник)
3. Проверить работу приложения:
   - Создание заметки
   - Отображение списка заметок
   - Удаление заметки
   - (Дополнительно) Редактирование заметки

### **5. Что должно быть в отчёте:**

1. **Исходный код:**
   - Все файлы с реализованными TODO-задачами
   - Файл `Note.kt` с добавленным полем `createdAt`
   - Файл `NoteDao.kt` с методом удаления
   - Файл `NotesViewModel.kt` с методами удаления и (опционально) редактирования
   - Файл `NotesScreen.kt` с модифицированным `NoteItem`

2. **Скриншоты:**
   - Главный экран со списком заметок (минимум 2 заметки)
   - Экран создания новой заметки
   - Экран с подтверждением удаления (или процесс удаления)
   - (Для дополнительного задания) Экран редактирования заметки

3. **Ответы на вопросы:**
   - В чем преимущество использования Flow и StateFlow перед обычными списками?
   - Почему ViewModel не уничтожается при повороте экрана и как это влияет на UX?
   - Какие преимущества дает использование Room по сравнению с прямым использованием SQLite?

### **6. Критерии оценивания:**

#### **Обязательные требования (минимум для зачета):**
- **Добавление поля createdAt:** Поле добавлено в модель, корректно сохраняется и отображается на экране
- **Удаление заметок:** Реализована возможность удаления заметок через кнопку в списке
- **Корректная работа БД:** Заметки сохраняются после перезапуска приложения

#### **Дополнительные критерии (для повышения оценки):**
- **Редактирование заметок:** Реализована возможность редактирования существующих заметок
- **Обработка ошибок:** Добавлена обработка граничных случаев (пустые заметки, ошибки БД)
- **Улучшение UI:** Добавлено форматирование даты, подтверждение удаления (Dialog)

#### **Неприемлемые ошибки:**
- Утечки памяти в ViewModel (ссылки на Context или Activity)
- Выполнение долгих операций на главном потоке (например, запросы к БД без корутин)
- Отсутствие обработки `null` значений при работе с базой данных

### **7. Полезные команды для Ubuntu:**

```bash
# Просмотр списка подключенных устройств
adb devices

# Установка приложения вручную
adb install app/build/outputs/apk/debug/app-debug.apk

# Просмотр логов приложения
adb logcat | grep "NotesApp"

# Очистка данных приложения
adb shell pm clear com.example.notesapp

# Создание отладочной сборки
./gradlew assembleDebug

# Запуск линтера для проверки кода
./gradlew lint
```

### **8. Структура проекта:**

```
NotesApp/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/notesapp/
│   │   │   │   ├── data/
│   │   │   │   │   ├── Note.kt
│   │   │   │   │   ├── NoteDao.kt
│   │   │   │   │   ├── NoteDatabase.kt
│   │   │   │   │   └── NoteRepository.kt
│   │   │   │   ├── ui/
│   │   │   │   │   ├── NotesViewModel.kt
│   │   │   │   │   ├── NotesViewModelFactory.kt
│   │   │   │   │   ├── NotesScreen.kt
│   │   │   │   │   └── AddEditNoteScreen.kt
│   │   │   │   ├── MainActivity.kt
│   │   │   │   └── ui/theme/
│   │   │   └── res/ (ресурсы автоматически)
│   │   └── test/ (тесты)
│   └── build.gradle.kts
├── build.gradle.kts (проект)
└── settings.gradle.kts
```

### **9. Советы по выполнению:**

1. **Начинайте с малого:** Сначала добавьте поле `createdAt` и убедитесь, что приложение компилируется. Затем переходите к удалению, потом к редактированию.

2. **Используйте Logcat:** При возникновении ошибок смотрите логи. Room часто выводит понятные сообщения об ошибках SQL.

3. **Проверяйте жизненный цикл:** Поверните эмулятор и убедитесь, что данные не теряются. Это проверит правильность использования ViewModel.

4. **Для форматирования даты используйте:**

```kotlin
import java.text.SimpleDateFormat
import java.util.Locale

fun formatDate(timestamp: Long): String {
    val dateFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
    return dateFormat.format(timestamp)
}
```

5. **Не забывайте про корутины:** Все операции с БД должны выполняться в `viewModelScope.launch { }`.

**Примечание:** В задании предоставлено ~70% кода. Ваша задача — понять логику работы архитектуры MVVM, взаимодействие с Room и реактивное обновление UI через StateFlow, а затем дописать недостающие ~30% функциональности.
