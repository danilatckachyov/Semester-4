# **Лабораторная работа 12. Часть 3: Кроссплатформенная разработка с Flutter**

## **Тема:** Создание кроссплатформенного мобильного приложения с использованием Flutter и философии "Everything is a Widget"

### **Цель работы:**
Получить практические навыки создания кроссплатформенного мобильного приложения на Flutter, изучить виджет-ориентированный подход, работу с состоянием через Provider, использование нативных возможностей через плагины и собственный движок рендеринга Flutter.

---

## **Задание: Приложение "Трекинг активности" (Activity Tracker)**

Разработать кроссплатформенное мобильное приложение для отслеживания физической активности (шаги, тренировки, маршруты). Приложение должно использовать Flutter, архитектуру с провайдерами для управления состоянием, анимации и нативные датчики устройства. Особое внимание уделить кастомным анимациям и плавности интерфейса, которые обеспечивает собственный движок рендеринга Flutter.

### **1. Настройка проекта**

**Установка Flutter SDK и создание проекта:**

```bash
# Установка Flutter (если не установлен)
# Скачать с https://docs.flutter.dev/get-started/install/linux
# Распаковать и добавить в PATH

# Проверка установки
flutter doctor

# Создание нового проекта
flutter create activity_tracker

# Переход в директорию проекта
cd activity_tracker

# Открытие в VS Code (или Android Studio)
code .

# Добавление зависимостей в pubspec.yaml
```

**Файл: `pubspec.yaml` (добавить в секцию dependencies):**

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Для работы с состоянием
  provider: ^6.1.1
  
  # Для навигации
  go_router: ^13.0.0
  
  # Для работы с датчиками
  sensors_plus: ^4.0.0
  pedometer: ^4.0.0
  
  # Для геолокации и карт
  location: ^5.0.0
  google_maps_flutter: ^2.5.0
  
  # Для хранения данных
  sqflite: ^2.3.0
  path: ^1.9.0
  
  # Для графиков
  fl_chart: ^0.66.0
  
  # Для анимаций
  lottie: ^2.7.0
  
  # Для работы с датами
  intl: ^0.18.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

**Установка зависимостей:**

```bash
flutter pub get
```

**Настройка разрешений для Android (`android/app/src/main/AndroidManifest.xml`):**

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Разрешения для Android -->
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
    <uses-permission android:name="android.permission.BODY_SENSORS"/>
    
    <application
        android:label="Activity Tracker"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <!-- Google Maps API ключ (потребуется для карт) -->
        <meta-data android:name="com.google.android.geo.API_KEY"
                   android:value="YOUR_API_KEY_HERE"/>
    </application>
</manifest>
```

**Настройка разрешений для iOS (`ios/Runner/Info.plist`):**

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Приложению нужен доступ к геолокации для отслеживания маршрутов</string>
<key>NSMotionUsageDescription</key>
<string>Приложению нужен доступ к датчикам для подсчета шагов</string>
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
</array>
```

### **2. Базовый код (70% предоставляется)**

**Файл: `lib/models/activity.dart`**

```dart
import 'package:flutter/material.dart';

// Модель для типа активности
enum ActivityType {
  walking,
  running,
  cycling,
  gym;
  
  String get displayName {
    switch (this) {
      case ActivityType.walking:
        return 'Ходьба';
      case ActivityType.running:
        return 'Бег';
      case ActivityType.cycling:
        return 'Велосипед';
      case ActivityType.gym:
        return 'Тренажерный зал';
    }
  }
  
  IconData get icon {
    switch (this) {
      case ActivityType.walking:
        return Icons.directions_walk;
      case ActivityType.running:
        return Icons.directions_run;
      case ActivityType.cycling:
        return Icons.directions_bike;
      case ActivityType.gym:
        return Icons.fitness_center;
    }
  }
  
  Color get color {
    switch (this) {
      case ActivityType.walking:
        return Colors.green;
      case ActivityType.running:
        return Colors.orange;
      case ActivityType.cycling:
        return Colors.blue;
      case ActivityType.gym:
        return Colors.purple;
    }
  }
}

// Модель для записи тренировки
class ActivityRecord {
  final String id;
  final ActivityType type;
  final DateTime startTime;
  final DateTime? endTime;
  final int steps;
  final double distance; // в километрах
  final double calories; // в ккал
  final double? averageHeartRate;
  final List<LatLng>? route; // маршрут
  
  ActivityRecord({
    required this.id,
    required this.type,
    required this.startTime,
    this.endTime,
    required this.steps,
    required this.distance,
    required this.calories,
    this.averageHeartRate,
    this.route,
  });
  
  // Длительность в минутах
  Duration get duration {
    if (endTime == null) return Duration.zero;
    return endTime!.difference(startTime);
  }
  
  // TODO: Добавить вычисляемое свойство для темпа (pace)
  // double get pace { ... }
  
  // TODO: Добавить метод toMap() для сохранения в БД
  // Map<String, dynamic> toMap() { ... }
  
  // TODO: Добавить фабричный метод fromMap() для загрузки из БД
  // factory ActivityRecord.fromMap(Map<String, dynamic> map) { ... }
}

// Вспомогательный класс для координат
class LatLng {
  final double latitude;
  final double longitude;
  
  LatLng(this.latitude, this.longitude);
  
  Map<String, dynamic> toJson() => {
    'lat': latitude,
    'lng': longitude,
  };
  
  factory LatLng.fromJson(Map<String, dynamic> json) {
    return LatLng(json['lat'], json['lng']);
  }
}
```

**Файл: `lib/models/user_stats.dart`**

```dart
import 'package:flutter/material.dart';

// Модель для статистики пользователя
class UserStats {
  final int totalSteps;
  final double totalDistance;
  final int totalCalories;
  final int totalWorkouts;
  final double averagePace;
  
  UserStats({
    required this.totalSteps,
    required this.totalDistance,
    required this.totalCalories,
    required this.totalWorkouts,
    required this.averagePace,
  });
  
  // TODO: Добавить конструктор по умолчанию
  // UserStats.initial() { ... }
}

// Модель для дневной статистики
class DailyStats {
  final DateTime date;
  final int steps;
  final double distance;
  final int calories;
  final int workouts;
  
  DailyStats({
    required this.date,
    required this.steps,
    required this.distance,
    required this.calories,
    required this.workouts,
  });
  
  // TODO: Добавить метод для агрегации из списка тренировок
  // static DailyStats fromActivities(List<ActivityRecord> activities) { ... }
}
```

**Файл: `lib/services/database_service.dart`**

```dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/activity.dart';
import 'dart:convert';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();
  
  static Database? _database;
  
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }
  
  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'activity_tracker.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }
  
  Future<void> _onCreate(Database db, int version) async {
    // Создание таблицы для тренировок
    await db.execute('''
      CREATE TABLE activities(
        id TEXT PRIMARY KEY,
        type INTEGER NOT NULL,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        steps INTEGER NOT NULL,
        distance REAL NOT NULL,
        calories REAL NOT NULL,
        averageHeartRate REAL,
        route TEXT
      )
    ''');
    
    // TODO: Добавить создание таблицы для дневной статистики
    // CREATE TABLE daily_stats( ...
  }
  
  // Сохранение тренировки
  Future<void> insertActivity(ActivityRecord activity) async {
    final db = await database;
    await db.insert(
      'activities',
      activity.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }
  
  // Получение всех тренировок
  Future<List<ActivityRecord>> getAllActivities() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'activities',
      orderBy: 'startTime DESC',
    );
    
    return List.generate(maps.length, (i) {
      return ActivityRecord.fromMap(maps[i]);
    });
  }
  
  // Получение тренировок за дату
  Future<List<ActivityRecord>> getActivitiesByDate(DateTime date) async {
    final db = await database;
    
    DateTime startOfDay = DateTime(date.year, date.month, date.day);
    DateTime endOfDay = startOfDay.add(const Duration(days: 1));
    
    final List<Map<String, dynamic>> maps = await db.query(
      'activities',
      where: 'startTime >= ? AND startTime < ?',
      whereArgs: [startOfDay.millisecondsSinceEpoch, endOfDay.millisecondsSinceEpoch],
      orderBy: 'startTime DESC',
    );
    
    return List.generate(maps.length, (i) {
      return ActivityRecord.fromMap(maps[i]);
    });
  }
  
  // TODO: Реализовать метод удаления тренировки
  // Future<void> deleteActivity(String id) async { ... }
  
  // TODO: Реализовать метод получения суммарной статистики
  // Future<UserStats> getUserStats() async { ... }
}
```

**Файл: `lib/services/sensor_service.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:pedometer/pedometer.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:location/location.dart';

class SensorService extends ChangeNotifier {
  // Шагомер
  Pedometer? _pedometer;
  int _stepCount = 0;
  int get stepCount => _stepCount;
  
  // Геолокация
  final Location _location = Location();
  LocationData? _currentLocation;
  LocationData? get currentLocation => _currentLocation;
  final List<LocationData> _route = [];
  List<LocationData> get route => List.unmodifiable(_route);
  
  // Акселерометр (для определения активности)
  double _accelerometerMagnitude = 0.0;
  double get accelerometerMagnitude => _accelerometerMagnitude;
  
  bool _isTracking = false;
  bool get isTracking => _isTracking;
  
  SensorService() {
    _initLocation();
    _initSensors();
  }
  
  void _initLocation() async {
    // Проверка и запрос разрешений
    bool serviceEnabled = await _location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await _location.requestService();
      if (!serviceEnabled) return;
    }
    
    PermissionStatus permissionGranted = await _location.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await _location.requestPermission();
      if (permissionGranted != PermissionStatus.granted) return;
    }
    
    // Получение текущего местоположения
    _location.onLocationChanged.listen((LocationData location) {
      _currentLocation = location;
      if (_isTracking) {
        _route.add(location);
      }
      notifyListeners();
    });
  }
  
  void _initSensors() async {
    // Инициализация шагомера
    try {
      _pedometer = Pedometer();
      _pedometer?.stepCountStream.listen(
        (StepCount step) {
          _stepCount = step.steps;
          notifyListeners();
        },
        onError: (error) {
          print('Step count error: $error');
        },
      );
    } catch (e) {
      print('Pedometer initialization error: $e');
    }
    
    // Чтение акселерометра
    accelerometerEvents.listen((AccelerometerEvent event) {
      // Вычисляем магнитуду ускорения
      _accelerometerMagnitude = event.x.abs() + event.y.abs() + event.z.abs();
      // TODO: Использовать для определения типа активности
      notifyListeners();
    });
  }
  
  void startTracking() {
    _isTracking = true;
    _route.clear();
    notifyListeners();
  }
  
  void stopTracking() {
    _isTracking = false;
    notifyListeners();
  }
  
  void resetRoute() {
    _route.clear();
    notifyListeners();
  }
  
  // Расчет пройденного расстояния по маршруту (в км)
  double calculateDistance() {
    if (_route.isEmpty) return 0.0;
    
    double totalDistance = 0.0;
    for (int i = 0; i < _route.length - 1; i++) {
      totalDistance += _calculateDistanceBetween(
        _route[i].latitude!,
        _route[i].longitude!,
        _route[i + 1].latitude!,
        _route[i + 1].longitude!,
      );
    }
    return totalDistance / 1000; // в километрах
  }
  
  // Формула гаверсинуса для расчета расстояния между точками
  double _calculateDistanceBetween(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371e3; // радиус Земли в метрах
    double phi1 = lat1 * (3.14159 / 180);
    double phi2 = lat2 * (3.14159 / 180);
    double deltaPhi = (lat2 - lat1) * (3.14159 / 180);
    double deltaLambda = (lon2 - lon1) * (3.14159 / 180);
    
    double a = (deltaPhi / 2).sin() * (deltaPhi / 2).sin() +
        phi1.cos() * phi2.cos() * (deltaLambda / 2).sin() * (deltaLambda / 2).sin();
    double c = 2 * a.sqrt().atan2((1 - a).sqrt());
    
    return R * c; // расстояние в метрах
  }
  
  // TODO: Добавить метод для определения типа активности по данным датчиков
  // ActivityType detectActivityType() { ... }
  
  @override
  void dispose() {
    _pedometer = null;
    super.dispose();
  }
}
```

**Файл: `lib/providers/activity_provider.dart`**

```dart
import 'package:flutter/material.dart';
import '../models/activity.dart';
import '../services/database_service.dart';

class ActivityProvider extends ChangeNotifier {
  final DatabaseService _databaseService = DatabaseService();
  
  List<ActivityRecord> _activities = [];
  List<ActivityRecord> get activities => _activities;
  
  ActivityRecord? _currentActivity;
  ActivityRecord? get currentActivity => _currentActivity;
  
  bool _isLoading = false;
  bool get isLoading => _isLoading;
  
  String? _error;
  String? get error => _error;
  
  ActivityProvider() {
    loadActivities();
  }
  
  Future<void> loadActivities() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      _activities = await _databaseService.getAllActivities();
    } catch (e) {
      _error = 'Ошибка загрузки: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  Future<void> saveActivity(ActivityRecord activity) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      await _databaseService.insertActivity(activity);
      _activities.insert(0, activity);
      // Сортировка по дате
      _activities.sort((a, b) => b.startTime.compareTo(a.startTime));
    } catch (e) {
      _error = 'Ошибка сохранения: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  // TODO: Реализовать метод удаления активности
  // Future<void> deleteActivity(String id) async { ... }
  
  // TODO: Реализовать метод получения статистики за период
  // UserStats getStatsForPeriod(DateTime start, DateTime end) { ... }
  
  // Начать новую тренировку
  void startNewActivity(ActivityType type) {
    _currentActivity = ActivityRecord(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: type,
      startTime: DateTime.now(),
      steps: 0,
      distance: 0.0,
      calories: 0.0,
      route: [],
    );
    notifyListeners();
  }
  
  // Обновить текущую тренировку
  void updateCurrentActivity({
    int? steps,
    double? distance,
    double? calories,
    List<LatLng>? route,
  }) {
    if (_currentActivity == null) return;
    
    _currentActivity = ActivityRecord(
      id: _currentActivity!.id,
      type: _currentActivity!.type,
      startTime: _currentActivity!.startTime,
      steps: steps ?? _currentActivity!.steps,
      distance: distance ?? _currentActivity!.distance,
      calories: calories ?? _currentActivity!.calories,
      route: route ?? _currentActivity!.route,
    );
    notifyListeners();
  }
  
  // Завершить текущую тренировку
  Future<void> finishCurrentActivity() async {
    if (_currentActivity == null) return;
    
    final completedActivity = ActivityRecord(
      id: _currentActivity!.id,
      type: _currentActivity!.type,
      startTime: _currentActivity!.startTime,
      endTime: DateTime.now(),
      steps: _currentActivity!.steps,
      distance: _currentActivity!.distance,
      calories: _currentActivity!.calories,
      route: _currentActivity!.route,
    );
    
    await saveActivity(completedActivity);
    _currentActivity = null;
    notifyListeners();
  }
}
```

**Файл: `lib/providers/theme_provider.dart`**

```dart
import 'package:flutter/material.dart';

class ThemeProvider extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;
  ThemeMode get themeMode => _themeMode;
  
  bool get isDarkMode {
    if (_themeMode == ThemeMode.system) {
      // TODO: Определить системную тему
      return false;
    }
    return _themeMode == ThemeMode.dark;
  }
  
  void toggleTheme() {
    if (_themeMode == ThemeMode.light) {
      _themeMode = ThemeMode.dark;
    } else if (_themeMode == ThemeMode.dark) {
      _themeMode = ThemeMode.light;
    } else {
      _themeMode = ThemeMode.light;
    }
    notifyListeners();
  }
  
  // TODO: Добавить методы для сохранения/загрузки темы
}

// Темы приложения
class AppThemes {
  static final lightTheme = ThemeData(
    primarySwatch: Colors.blue,
    brightness: Brightness.light,
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      elevation: 4,
    ),
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
  );
  
  static final darkTheme = ThemeData(
    primarySwatch: Colors.blue,
    brightness: Brightness.dark,
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      elevation: 4,
    ),
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
  );
}
```

**Файл: `lib/widgets/activity_card.dart`**

```dart
import 'package:flutter/material.dart';
import '../models/activity.dart';
import 'package:intl/intl.dart';

class ActivityCard extends StatelessWidget {
  final ActivityRecord activity;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  
  const ActivityCard({
    Key? key,
    required this.activity,
    this.onTap,
    this.onDelete,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm');
    final durationFormat = DateFormat('HH:mm:ss').format(
      DateTime.fromMillisecondsSinceEpoch(activity.duration.inMilliseconds)
    );
    
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Верхняя строка с иконкой и заголовком
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: activity.type.color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      activity.type.icon,
                      color: activity.type.color,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          activity.type.displayName,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          dateFormat.format(activity.startTime),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  if (onDelete != null)
                    IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: onDelete,
                      color: Colors.grey,
                    ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Статистика
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatItem(
                    icon: Icons.timer,
                    value: durationFormat,
                    label: 'Длительность',
                  ),
                  _buildStatItem(
                    icon: Icons.directions_walk,
                    value: activity.steps.toString(),
                    label: 'Шаги',
                  ),
                  _buildStatItem(
                    icon: Icons.straighten,
                    value: '${activity.distance.toStringAsFixed(2)} км',
                    label: 'Дистанция',
                  ),
                  _buildStatItem(
                    icon: Icons.local_fire_department,
                    value: '${activity.calories.toStringAsFixed(0)} ккал',
                    label: 'Калории',
                  ),
                ],
              ),
              
              // TODO: Добавить индикатор наличия маршрута
              // if (activity.route != null && activity.route!.isNotEmpty)
              //   _buildRouteIndicator(),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildStatItem({
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Column(
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }
  
  // TODO: Реализовать индикатор маршрута
  // Widget _buildRouteIndicator() { ... }
}
```

**Файл: `lib/widgets/stats_chart.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../models/user_stats.dart';

class StatsChart extends StatelessWidget {
  final List<MapEntry<DateTime, int>> data;
  final String title;
  final Color color;
  
  const StatsChart({
    Key? key,
    required this.data,
    required this.title,
    required this.color,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Center(
        child: Text('Нет данных для отображения'),
      );
    }
    
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: _getMaxY() * 1.1,
                  barGroups: _buildBarGroups(),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: _getBottomTitles,
                        reservedSize: 30,
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                      ),
                    ),
                    topTitles: AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: FlGridData(show: false),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  double _getMaxY() {
    double max = 0;
    for (var entry in data) {
      if (entry.value > max) max = entry.value.toDouble();
    }
    return max;
  }
  
  List<BarChartGroupData> _buildBarGroups() {
    return data.asMap().entries.map((entry) {
      return BarChartGroupData(
        x: entry.key,
        barRods: [
          BarChartRodData(
            toY: entry.value.value.toDouble(),
            color: color,
            width: 16,
            borderRadius: BorderRadius.circular(4),
          ),
        ],
      );
    }).toList();
  }
  
  Widget _getBottomTitles(double value, TitleMeta meta) {
    if (value.toInt() >= data.length) return const SizedBox();
    final date = data[value.toInt()].key;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Text(
        '${date.day}/${date.month}',
        style: const TextStyle(fontSize: 10),
      ),
    );
  }
  
  // TODO: Добавить поддержку линейных графиков
  // Widget _buildLineChart() { ... }
}
```

**Файл: `lib/screens/home_screen.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/activity_provider.dart';
import '../providers/sensor_provider.dart';
import '../widgets/activity_card.dart';
import '../models/activity.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity Tracker'),
        actions: [
          // Кнопка переключения темы
          Consumer<ThemeProvider>(
            builder: (context, themeProvider, child) {
              return IconButton(
                icon: Icon(
                  themeProvider.isDarkMode
                      ? Icons.light_mode
                      : Icons.dark_mode,
                ),
                onPressed: () => themeProvider.toggleTheme(),
              );
            },
          ),
        ],
      ),
      body: Consumer2<ActivityProvider, SensorProvider>(
        builder: (context, activityProvider, sensorProvider, child) {
          if (activityProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }
          
          if (activityProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 48,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Ошибка: ${activityProvider.error}',
                    style: const TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => activityProvider.loadActivities(),
                    child: const Text('Повторить'),
                  ),
                ],
              ),
            );
          }
          
          // Индикатор текущей тренировки
          if (activityProvider.currentActivity != null) {
            return _buildCurrentActivity(
              context,
              activityProvider.currentActivity!,
              sensorProvider,
            );
          }
          
          // Список тренировок
          return _buildActivitiesList(context, activityProvider);
        },
      ),
      floatingActionButton: Consumer<ActivityProvider>(
        builder: (context, provider, child) {
          if (provider.currentActivity != null) {
            // TODO: Кнопка завершения тренировки
            return FloatingActionButton(
              onPressed: () => _finishActivity(context),
              child: const Icon(Icons.stop),
            );
          } else {
            // Кнопка начала новой тренировки
            return FloatingActionButton(
              onPressed: () => _showStartActivityDialog(context),
              child: const Icon(Icons.play_arrow),
            );
          }
        },
      ),
    );
  }
  
  Widget _buildActivitiesList(
    BuildContext context,
    ActivityProvider provider,
  ) {
    if (provider.activities.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.fitness_center,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Нет тренировок',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Начните первую тренировку',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }
    
    return ListView.builder(
      itemCount: provider.activities.length,
      itemBuilder: (context, index) {
        final activity = provider.activities[index];
        return ActivityCard(
          activity: activity,
          onTap: () => _showActivityDetails(context, activity),
          onDelete: () => _confirmDelete(context, activity),
        );
      },
    );
  }
  
  Widget _buildCurrentActivity(
    BuildContext context,
    ActivityRecord activity,
    SensorProvider sensorProvider,
  ) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: activity.type.color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              activity.type.icon,
              size: 48,
              color: activity.type.color,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            activity.type.displayName,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 32),
          
          // Статистика текущей тренировки
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildCurrentStat(
                  context,
                  'Шаги',
                  activity.steps.toString(),
                  Icons.directions_walk,
                ),
                _buildCurrentStat(
                  context,
                  'Дистанция',
                  '${activity.distance.toStringAsFixed(2)} км',
                  Icons.straighten,
                ),
                _buildCurrentStat(
                  context,
                  'Калории',
                  '${activity.calories.toStringAsFixed(0)}',
                  Icons.local_fire_department,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // TODO: Добавить индикатор темпа (pace)
          
          // Анимация активности
          if (sensorProvider.accelerometerMagnitude > 5)
            const Text('🏃‍♂️ Активное движение'),
        ],
      ),
    );
  }
  
  Widget _buildCurrentStat(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) {
    return Column(
      children: [
        Icon(icon, color: Colors.blue),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
  
  void _showStartActivityDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Новая тренировка'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: ActivityType.values.map((type) {
            return ListTile(
              leading: Icon(type.icon, color: type.color),
              title: Text(type.displayName),
              onTap: () {
                Navigator.pop(context);
                _startActivity(context, type);
              },
            );
          }).toList(),
        ),
      ),
    );
  }
  
  void _startActivity(BuildContext context, ActivityType type) {
    final provider = Provider.of<ActivityProvider>(context, listen: false);
    final sensorProvider = Provider.of<SensorProvider>(context, listen: false);
    
    provider.startNewActivity(type);
    sensorProvider.startTracking();
  }
  
  void _finishActivity(BuildContext context) async {
    final provider = Provider.of<ActivityProvider>(context, listen: false);
    final sensorProvider = Provider.of<SensorProvider>(context, listen: false);
    
    // TODO: Обновить данные текущей тренировки перед завершением
    // provider.updateCurrentActivity(
    //   steps: sensorProvider.stepCount,
    //   distance: sensorProvider.calculateDistance(),
    // );
    
    await provider.finishCurrentActivity();
    sensorProvider.stopTracking();
    sensorProvider.resetRoute();
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Тренировка сохранена')),
    );
  }
  
  void _showActivityDetails(BuildContext context, ActivityRecord activity) {
    // TODO: Перейти на экран деталей
    // Navigator.push(
    //   context,
    //   MaterialPageRoute(
    //     builder: (context) => ActivityDetailScreen(activity: activity),
    //   ),
    // );
  }
  
  void _confirmDelete(BuildContext context, ActivityRecord activity) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Удаление'),
        content: const Text('Вы уверены, что хотите удалить эту тренировку?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () {
              // TODO: Вызвать метод удаления
              // Provider.of<ActivityProvider>(context, listen: false)
              //     .deleteActivity(activity.id);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
  }
}
```

**Файл: `lib/screens/stats_screen.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/activity_provider.dart';
import '../widgets/stats_chart.dart';

class StatsScreen extends StatelessWidget {
  const StatsScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Статистика'),
      ),
      body: Consumer<ActivityProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          final stats = _calculateStats(provider.activities);
          final chartData = _prepareChartData(provider.activities);
          
          return SingleChildScrollView(
            child: Column(
              children: [
                // Карточки с общей статистикой
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.5,
                    children: [
                      _buildStatCard(
                        context,
                        'Шаги',
                        '${stats['totalSteps']}',
                        Icons.directions_walk,
                        Colors.blue,
                      ),
                      _buildStatCard(
                        context,
                        'Дистанция',
                        '${stats['totalDistance']} км',
                        Icons.straighten,
                        Colors.green,
                      ),
                      _buildStatCard(
                        context,
                        'Калории',
                        '${stats['totalCalories']}',
                        Icons.local_fire_department,
                        Colors.orange,
                      ),
                      _buildStatCard(
                        context,
                        'Тренировки',
                        '${stats['totalWorkouts']}',
                        Icons.fitness_center,
                        Colors.purple,
                      ),
                    ],
                  ),
                ),
                
                // График активности
                StatsChart(
                  data: chartData,
                  title: 'Активность за последние 7 дней',
                  color: Colors.blue,
                ),
                
                // TODO: Добавить график с типами тренировок
              ],
            ),
          );
        },
      ),
    );
  }
  
  Widget _buildStatCard(
    BuildContext context,
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
  
  Map<String, dynamic> _calculateStats(List activities) {
    int totalSteps = 0;
    double totalDistance = 0.0;
    int totalCalories = 0;
    int totalWorkouts = activities.length;
    
    for (var activity in activities) {
      totalSteps += activity.steps;
      totalDistance += activity.distance;
      totalCalories += activity.calories.toInt();
    }
    
    return {
      'totalSteps': totalSteps,
      'totalDistance': totalDistance.toStringAsFixed(2),
      'totalCalories': totalCalories,
      'totalWorkouts': totalWorkouts,
    };
  }
  
  List<MapEntry<DateTime, int>> _prepareChartData(List activities) {
    // Группировка по дням за последние 7 дней
    final now = DateTime.now();
    final data = <DateTime, int>{};
    
    for (int i = 6; i >= 0; i--) {
      final date = DateTime(now.year, now.month, now.day - i);
      data[date] = 0;
    }
    
    for (var activity in activities) {
      final day = DateTime(
        activity.startTime.year,
        activity.startTime.month,
        activity.startTime.day,
      );
      if (data.containsKey(day)) {
        data[day] = (data[day] ?? 0) + activity.steps;
      }
    }
    
    return data.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
  }
}
```

**Файл: `lib/main.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/activity_provider.dart';
import 'providers/sensor_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/home_screen.dart';
import 'screens/stats_screen.dart';
import 'services/database_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Инициализация базы данных
  final databaseService = DatabaseService();
  await databaseService.database;
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => SensorProvider()),
        ChangeNotifierProvider(create: (_) => ActivityProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return MaterialApp(
            title: 'Activity Tracker',
            debugShowCheckedModeBanner: false,
            theme: AppThemes.lightTheme,
            darkTheme: AppThemes.darkTheme,
            themeMode: themeProvider.themeMode,
            home: const MainNavigation(),
          );
        },
      ),
    );
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({Key? key}) : super(key: key);
  
  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = [
    const HomeScreen(),
    const StatsScreen(),
  ];
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home),
            label: 'Главная',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart),
            label: 'Статистика',
          ),
        ],
      ),
    );
  }
}
```

### **3. Задания для самостоятельного выполнения (30% дописать)**

#### **A. Реализация полной работы с базой данных** (обязательно)

**Задание:** Дописать методы для работы с SQLite в `activity.dart` и `database_service.dart`.

**Файл: `lib/models/activity.dart`**

```dart
// TODO: Добавить вычисляемое свойство для темпа (pace)
double get pace {
  if (distance == 0 || duration.inMinutes == 0) return 0;
  // Темп = минуты на километр
  return duration.inMinutes / distance;
}

// TODO: Реализовать метод toMap() для сохранения в БД
Map<String, dynamic> toMap() {
  return {
    'id': id,
    'type': type.index,
    'startTime': startTime.millisecondsSinceEpoch,
    'endTime': endTime?.millisecondsSinceEpoch,
    'steps': steps,
    'distance': distance,
    'calories': calories,
    'averageHeartRate': averageHeartRate,
    'route': route != null ? jsonEncode(route!.map((p) => p.toJson()).toList()) : null,
  };
}

// TODO: Реализовать фабричный метод fromMap() для загрузки из БД
factory ActivityRecord.fromMap(Map<String, dynamic> map) {
  return ActivityRecord(
    id: map['id'],
    type: ActivityType.values[map['type']],
    startTime: DateTime.fromMillisecondsSinceEpoch(map['startTime']),
    endTime: map['endTime'] != null 
        ? DateTime.fromMillisecondsSinceEpoch(map['endTime']) 
        : null,
    steps: map['steps'],
    distance: map['distance'],
    calories: map['calories'],
    averageHeartRate: map['averageHeartRate'],
    route: map['route'] != null 
        ? (jsonDecode(map['route']) as List)
            .map((p) => LatLng.fromJson(p))
            .toList()
        : null,
  );
}
```

**Файл: `lib/services/database_service.dart`**

```dart
// TODO: Реализовать метод удаления тренировки
Future<void> deleteActivity(String id) async {
  final db = await database;
  await db.delete(
    'activities',
    where: 'id = ?',
    whereArgs: [id],
  );
}

// TODO: Реализовать метод получения суммарной статистики
Future<UserStats> getUserStats() async {
  final db = await database;
  
  // Получить все записи
  final List<Map<String, dynamic>> maps = await db.query('activities');
  
  int totalSteps = 0;
  double totalDistance = 0.0;
  int totalCalories = 0;
  int totalWorkouts = maps.length;
  double totalPace = 0.0;
  
  for (var map in maps) {
    totalSteps += map['steps'];
    totalDistance += map['distance'];
    totalCalories += map['calories'].toInt();
    
    // Расчет темпа (если есть endTime)
    if (map['endTime'] != null) {
      final start = DateTime.fromMillisecondsSinceEpoch(map['startTime']);
      final end = DateTime.fromMillisecondsSinceEpoch(map['endTime']);
      final duration = end.difference(start);
      if (duration.inMinutes > 0 && map['distance'] > 0) {
        totalPace += duration.inMinutes / map['distance'];
      }
    }
  }
  
  double averagePace = totalWorkouts > 0 ? totalPace / totalWorkouts : 0;
  
  return UserStats(
    totalSteps: totalSteps,
    totalDistance: totalDistance,
    totalCalories: totalCalories,
    totalWorkouts: totalWorkouts,
    averagePace: averagePace,
  );
}
```

#### **B. Реализация определения типа активности** (обязательно)

**Задание:** Дописать метод для автоматического определения типа активности на основе данных с датчиков.

**Файл: `lib/services/sensor_service.dart`**

```dart
// TODO: Реализовать метод определения типа активности
ActivityType detectActivityType() {
  // Используем магнитуду акселерометра для определения
  if (_accelerometerMagnitude < 3) {
    return ActivityType.gym; // Силовые тренировки или отдых
  } else if (_accelerometerMagnitude < 6) {
    return ActivityType.walking; // Ходьба
  } else if (_accelerometerMagnitude < 10) {
    return ActivityType.running; // Бег
  } else {
    return ActivityType.cycling; // Велосипед (имитация)
  }
  
  // TODO: Более точное определение можно сделать по паттернам движения
  // Например, анализировать частоту шагов или вариабельность
}

// TODO: Добавить метод для расчета калорий
double calculateCalories(int steps, double distance, Duration duration) {
  // Упрощенная формула: вес (75 кг) * MET * время в часах
  // Для ходьбы MET ~3.5, для бега ~8.0
  double met;
  switch (detectActivityType()) {
    case ActivityType.walking:
      met = 3.5;
      break;
    case ActivityType.running:
      met = 8.0;
      break;
    case ActivityType.cycling:
      met = 6.0;
      break;
    case ActivityType.gym:
      met = 4.0;
      break;
  }
  
  double weight = 75.0; // можно добавить ввод веса пользователем
  double hours = duration.inMinutes / 60.0;
  
  return weight * met * hours;
}
```

#### **C. Реализация кастомных анимаций** (дополнительно)

**Задание:** Создать кастомный анимированный виджет для отображения прогресса тренировки с использованием собственного движка рендеринга Flutter.

**Файл: `lib/widgets/progress_ring.dart`**

```dart
import 'package:flutter/material.dart';

class ProgressRing extends StatefulWidget {
  final double progress; // 0.0 to 1.0
  final double size;
  final Color color;
  final Widget child;
  
  const ProgressRing({
    Key? key,
    required this.progress,
    this.size = 120,
    this.color = Colors.blue,
    required this.child,
  }) : super(key: key);
  
  @override
  State<ProgressRing> createState() => _ProgressRingState();
}

class _ProgressRingState extends State<ProgressRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    
    _animation = Tween<double>(
      begin: 0,
      end: widget.progress,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
    
    _controller.forward();
  }
  
  @override
  void didUpdateWidget(ProgressRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.progress != widget.progress) {
      _controller.forward(from: 0);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return CustomPaint(
          size: Size(widget.size, widget.size),
          painter: _ProgressRingPainter(
            progress: _animation.value,
            color: widget.color,
          ),
          child: Center(child: widget.child),
        );
      },
    );
  }
  
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

class _ProgressRingPainter extends CustomPainter {
  final double progress;
  final Color color;
  
  _ProgressRingPainter({
    required this.progress,
    required this.color,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    final strokeWidth = 12.0;
    
    // Фоновый круг
    final backgroundPaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    
    canvas.drawCircle(center, radius - strokeWidth / 2, backgroundPaint);
    
    // Прогресс
    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius - strokeWidth / 2),
      -90 * (3.14159 / 180), // Начинаем с верхней точки
      360 * (3.14159 / 180) * progress,
      false,
      progressPaint,
    );
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return true;
  }
}
```

**Использование в HomeScreen:**

```dart
// TODO: Добавить анимированное кольцо прогресса в _buildCurrentActivity
ProgressRing(
  progress: sensorProvider.stepCount / 10000, // цель 10000 шагов
  size: 150,
  color: activity.type.color,
  child: Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Text(
        '${sensorProvider.stepCount}',
        style: const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
        ),
      ),
      const Text('шагов'),
    ],
  ),
)
```

### **4. Запуск и проверка**

```bash
# Запуск в режиме разработки
flutter run

# Для запуска на конкретном устройстве
flutter run -d android
flutter run -d ios

# Очистка и пересборка
flutter clean
flutter pub get
flutter run

# Создание release-сборки для Android
flutter build apk --release

# Создание release-сборки для iOS (только на macOS)
flutter build ios --release

# Проверка на наличие проблем
flutter analyze

# Запуск тестов
flutter test
```

**Проверка функциональности:**
1. Запуск приложения на эмуляторе или реальном устройстве
2. Начало тренировки с выбором типа
3. Отслеживание шагов и местоположения в реальном времени
4. Завершение и сохранение тренировки
5. Просмотр списка тренировок
6. Просмотр статистики и графиков
7. (Дополнительно) Анимации прогресса

### **5. Что должно быть в отчёте:**

1. **Исходный код:**
   - Файл `activity.dart` с реализованными методами toMap/fromMap
   - Файл `database_service.dart` с методами удаления и статистики
   - Файл `sensor_service.dart` с методом определения типа активности
   - Файл `progress_ring.dart` (если выполнялось дополнительное задание)
   - Модифицированные экраны с интеграцией новой функциональности

2. **Скриншоты:**
   - Главный экран со списком тренировок
   - Экран текущей тренировки с данными с датчиков
   - Экран статистики с графиками
   - (Для дополнительного задания) Анимированное кольцо прогресса

3. **Ответы на вопросы:**
   - В чем преимущество собственного движка рендеринга Flutter перед использованием нативных виджетов?
   - Как Flutter обеспечивает 60+ FPS при сложных анимациях?
   - Чем отличается работа с датчиками в Flutter от нативной разработки?
   - Какие паттерны управления состоянием использованы в приложении и почему?

### **6. Критерии оценивания:**

#### **Обязательные требования (минимум для зачета):**
- **Работа с БД:** Реализованы все CRUD-операции, данные сохраняются корректно
- **Сенсоры:** Приложение получает данные с шагомера и геолокации
- **Определение активности:** Реализован метод определения типа активности по датчикам

#### **Дополнительные критерии (для повышения оценки):**
- **Кастомные анимации:** Реализовано анимированное кольцо прогресса с использованием CustomPainter
- **Графики:** Добавлены дополнительные типы графиков (круговые для типов тренировок)
- **Оптимизация:** Корректная обработка жизненного цикла и освобождение ресурсов

#### **Неприемлемые ошибки:**
- Утечки подписок на сенсоры (не вызван dispose)
- Блокировка UI-потока при работе с БД
- Отсутствие обработки отсутствия разрешений

### **7. Полезные команды для Ubuntu:**

```bash
# Установка Flutter (если не установлен)
cd ~
wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.16.0-stable.tar.xz
tar xf flutter_linux_3.16.0-stable.tar.xz
export PATH="$PATH:`pwd`/flutter/bin"

# Проверка установки
flutter doctor

# Настройка Android Studio (требуется установленная Android Studio)
flutter config --android-studio-dir=/usr/local/android-studio

# Принятие лицензий Android
flutter doctor --android-licenses

# Просмотр списка устройств
flutter devices

# Очистка кеша сборки
flutter clean

# Получение зависимостей
flutter pub get

# Запуск с профилированием производительности
flutter run --profile

# Создание отчета о производительности
flutter run --trace-startup --profile
```

### **8. Структура проекта:**

```
activity_tracker/
├── lib/
│   ├── models/
│   │   ├── activity.dart
│   │   └── user_stats.dart
│   ├── providers/
│   │   ├── activity_provider.dart
│   │   ├── sensor_provider.dart
│   │   └── theme_provider.dart
│   ├── services/
│   │   ├── database_service.dart
│   │   └── sensor_service.dart
│   ├── screens/
│   │   ├── home_screen.dart
│   │   └── stats_screen.dart
│   ├── widgets/
│   │   ├── activity_card.dart
│   │   ├── stats_chart.dart
│   │   └── progress_ring.dart (дополнительно)
│   └── main.dart
├── assets/ (для Lottie-анимаций)
├── test/
├── android/
├── ios/
├── pubspec.yaml
└── README.md
```

### **9. Советы по выполнению:**

1. **Изучите философию Flutter:** "Everything is a Widget" — поймите, как композиция виджетов позволяет строить сложные интерфейсы.

2. **Работа с эмулятором:** Для тестирования шагомера в эмуляторе Android используйте Extended Controls → Virtual Sensors → Step Counter.

3. **Для отладки анимаций** используйте Flutter DevTools: `flutter pub global run devtools`

4. **Provider vs setState:** Понимание разницы между локальным состоянием (setState) и глобальным (Provider) критически важно.

5. **Типичные проблемы:**
   - **"Gradle build failed"** — проверьте версии в android/build.gradle
   - **"Permission denied"** — проверьте манифесты для Android и Info.plist для iOS
   - **"No devices found"** — запустите эмулятор или подключите устройство

6. **Для работы с картами** потребуется API ключ Google Maps. Получите его в Google Cloud Console и добавьте в манифест.

7. **Тестирование на реальном устройстве** дает более точные данные с сенсоров, чем эмулятор.

**Примечание:** В задании предоставлено ~70% кода. Ваша задача — понять философию Flutter, работу с виджетами, управление состоянием через Provider, взаимодействие с нативными сенсорами через плагины, и дописать недостающие ~30% функциональности для полноценного приложения с кастомными анимациями.