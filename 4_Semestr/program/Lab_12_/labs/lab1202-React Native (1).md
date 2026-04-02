# **Лабораторная работа 12. Часть 2: Кроссплатформенная разработка с React Native**

## **Тема:** Создание кроссплатформенного мобильного приложения с использованием React Native и Expo

### **Цель работы:**
Получить практические навыки создания кроссплатформенного мобильного приложения на React Native, изучить архитектуру с мостом (Bridge), научиться работать с нативными модулями через Expo и реализовать общую кодовую базу для Android и iOS.

---

## **Задание: Приложение "Гео-заметки" (GeoNotes)**

Разработать кроссплатформенное мобильное приложение для создания заметок с привязкой к текущему местоположению. Приложение должно использовать React Native, навигацию, камеру для прикрепления фото и геолокацию. Бизнес-логика должна быть общей для обеих платформ.

### **1. Настройка проекта**

**Установка Expo CLI и создание проекта:**

```bash
# Установка Expo CLI глобально
npm install -g expo-cli

# Создание нового проекта
expo init GeoNotes

# Выбрать шаблон: "blank (TypeScript)"

# Переход в директорию проекта
cd GeoNotes

# Установка дополнительных зависимостей
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install expo-location expo-image-picker expo-sqlite
npm install react-native-maps
npm install @reduxjs/toolkit react-redux
npm install uuid @types/uuid
```

**Запуск проекта:**

```bash
# Запуск в режиме разработки
expo start

# Для запуска на Android (требуется установленное приложение Expo Go)
# Нажмите 'a' в терминале или отсканируйте QR-код

# Для запуска на iOS (требуется macOS и симулятор)
# Нажмите 'i' в терминале
```

### **2. Базовый код (70% предоставляется)**

**Файл: `src/types/index.ts`**

```typescript
// Определение типов данных

export interface GeoNote {
    id: string;
    title: string;
    content: string;
    latitude: number;
    longitude: number;
    address?: string;
    photoUri?: string;
    createdAt: number; // timestamp
    // TODO: Добавить поле updatedAt для отслеживания изменений
}

export interface Location {
    latitude: number;
    longitude: number;
    address?: string;
}

// TODO: Создать тип для состояния приложения (AppState)
// export interface AppState {
//     notes: GeoNote[];
//     currentLocation: Location | null;
//     isLoading: boolean;
//     error: string | null;
// }
```

**Файл: `src/utils/database.ts`**

```typescript
import * as SQLite from 'expo-sqlite';
import { GeoNote } from '../types';

// Открытие базы данных
const db = SQLite.openDatabase('geonotes.db');

// Инициализация базы данных
export const initDatabase = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                `CREATE TABLE IF NOT EXISTS notes (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    address TEXT,
                    photoUri TEXT,
                    createdAt INTEGER NOT NULL
                );`,
                [],
                () => {
                    console.log('Database initialized');
                    resolve();
                },
                (_, error) => {
                    console.error('Database initialization error:', error);
                    reject(error);
                    return false;
                }
            );
        });
    });
};

// Получение всех заметок
export const getNotes = (): Promise<GeoNote[]> => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                'SELECT * FROM notes ORDER BY createdAt DESC',
                [],
                (_, { rows }) => {
                    const notes: GeoNote[] = [];
                    for (let i = 0; i < rows.length; i++) {
                        notes.push(rows.item(i));
                    }
                    resolve(notes);
                },
                (_, error) => {
                    console.error('Get notes error:', error);
                    reject(error);
                    return false;
                }
            );
        });
    });
};

// TODO: Реализовать функцию добавления заметки
// export const addNote = (note: GeoNote): Promise<void> => { ... }

// TODO: Реализовать функцию удаления заметки
// export const deleteNote = (id: string): Promise<void> => { ... }

// TODO: Реализовать функцию обновления заметки
// export const updateNote = (note: GeoNote): Promise<void> => { ... }
```

**Файл: `src/store/notesSlice.ts`**

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GeoNote } from '../types';
import * as database from '../utils/database';

// Асинхронные действия (thunks)
export const loadNotes = createAsyncThunk(
    'notes/loadNotes',
    async () => {
        const notes = await database.getNotes();
        return notes;
    }
);

export const saveNote = createAsyncThunk(
    'notes/saveNote',
    async (note: GeoNote) => {
        // TODO: Реализовать сохранение в БД
        // await database.addNote(note);
        return note;
    }
);

export const removeNote = createAsyncThunk(
    'notes/removeNote',
    async (id: string) => {
        // TODO: Реализовать удаление из БД
        // await database.deleteNote(id);
        return id;
    }
);

interface NotesState {
    items: GeoNote[];
    loading: boolean;
    error: string | null;
}

const initialState: NotesState = {
    items: [],
    loading: false,
    error: null
};

const notesSlice = createSlice({
    name: 'notes',
    initialState,
    reducers: {
        // Синхронные действия (не используются с БД, но можно добавить при необходимости)
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // loadNotes
            .addCase(loadNotes.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loadNotes.fulfilled, (state, action: PayloadAction<GeoNote[]>) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(loadNotes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to load notes';
            })
            
            // TODO: Добавить обработчики для saveNote
            // .addCase(saveNote.pending, ...)
            // .addCase(saveNote.fulfilled, ...)
            // .addCase(saveNote.rejected, ...)
            
            // TODO: Добавить обработчики для removeNote
            // .addCase(removeNote.fulfilled, (state, action) => {
            //     state.items = state.items.filter(note => note.id !== action.payload);
            // })
    }
});

export const { clearError } = notesSlice.actions;
export default notesSlice.reducer;
```

**Файл: `src/store/index.ts`**

```typescript
import { configureStore } from '@reduxjs/toolkit';
import notesReducer from './notesSlice';

export const store = configureStore({
    reducer: {
        notes: notesReducer
    }
});

// Типы для использования в компонентах
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Файл: `src/hooks/reduxHooks.ts`**

```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

// Типизированные хуки для использования вместо обыших useDispatch и useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**Файл: `src/screens/NotesListScreen.tsx`**

```tsx
import React, { useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { loadNotes } from '../store/notesSlice';

interface NotesListScreenProps {
    navigation: any;
}

const NotesListScreen: React.FC<NotesListScreenProps> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const { items: notes, loading, error } = useAppSelector(state => state.notes);

    useEffect(() => {
        dispatch(loadNotes());
    }, [dispatch]);

    const renderNoteItem = ({ item }: any) => (
        <TouchableOpacity
            style={styles.noteItem}
            onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
        >
            <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>{item.title}</Text>
                <Text style={styles.noteDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
            <Text style={styles.noteContent} numberOfLines={2}>
                {item.content}
            </Text>
            {item.address && (
                <Text style={styles.noteAddress} numberOfLines={1}>
                    📍 {item.address}
                </Text>
            )}
            {/* TODO: Добавить индикатор наличия фото */}
            {/* {item.photoUri && <Text style={styles.photoIndicator}>📷</Text>} */}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Ошибка: {error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => dispatch(loadNotes())}
                >
                    <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {notes.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Нет заметок</Text>
                    <Text style={styles.emptySubtext}>
                        Нажмите + чтобы создать первую заметку
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notes}
                    renderItem={renderNoteItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
            
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddNote')}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
    },
    listContent: {
        padding: 16
    },
    noteItem: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    noteTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1
    },
    noteDate: {
        fontSize: 12,
        color: '#666',
        marginLeft: 8
    },
    noteContent: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8
    },
    noteAddress: {
        fontSize: 12,
        color: '#007AFF'
    },
    photoIndicator: {
        position: 'absolute',
        top: 16,
        right: 16,
        fontSize: 16
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center'
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        marginBottom: 16
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#007AFF',
        borderRadius: 8
    },
    retryText: {
        color: 'white',
        fontWeight: 'bold'
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8
    },
    fabText: {
        fontSize: 24,
        color: 'white',
        fontWeight: 'bold'
    }
});

export default NotesListScreen;
```

**Файл: `src/screens/AddNoteScreen.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../hooks/reduxHooks';
import { saveNote } from '../store/notesSlice';
import { GeoNote } from '../types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface AddNoteScreenProps {
    navigation: any;
}

const AddNoteScreen: React.FC<AddNoteScreenProps> = ({ navigation }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [address, setAddress] = useState<string | undefined>();
    const [photoUri, setPhotoUri] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    
    const dispatch = useAppDispatch();

    useEffect(() => {
        getCurrentLocation();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        // Запрос разрешения на камеру
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
            Alert.alert('Внимание', 'Необходимо разрешение на использование камеры');
        }
    };

    const getCurrentLocation = async () => {
        setIsLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Ошибка', 'Нет доступа к геолокации');
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({});
            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude
            });

            // Получение адреса по координатам (обратное геокодирование)
            const addresses = await Location.reverseGeocodeAsync({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude
            });

            if (addresses.length > 0) {
                const addr = addresses[0];
                const addressString = [
                    addr.street,
                    addr.district,
                    addr.city,
                    addr.country
                ].filter(Boolean).join(', ');
                setAddress(addressString);
            }
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Ошибка', 'Не удалось получить местоположение');
        } finally {
            setIsLoading(false);
        }
    };

    const takePhoto = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setPhotoUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Ошибка', 'Не удалось сделать фото');
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Ошибка', 'Введите заголовок заметки');
            return;
        }

        if (!content.trim()) {
            Alert.alert('Ошибка', 'Введите содержание заметки');
            return;
        }

        if (!location) {
            Alert.alert('Ошибка', 'Не удалось определить местоположение');
            return;
        }

        const newNote: GeoNote = {
            id: uuidv4(),
            title: title.trim(),
            content: content.trim(),
            latitude: location.latitude,
            longitude: location.longitude,
            address,
            photoUri,
            createdAt: Date.now()
        };

        try {
            // TODO: Диспатчить действие saveNote
            // await dispatch(saveNote(newNote)).unwrap();
            
            Alert.alert('Успех', 'Заметка сохранена', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось сохранить заметку');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                <Text style={styles.label}>Заголовок</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Введите заголовок"
                />

                <Text style={styles.label}>Содержание</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Введите содержание"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                />

                <View style={styles.locationContainer}>
                    <Text style={styles.label}>Местоположение</Text>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                    ) : location ? (
                        <View>
                            <Text style={styles.locationText}>
                                📍 {address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                            </Text>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={getCurrentLocation}
                            >
                                <Text style={styles.refreshButtonText}>Обновить</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.locationButton}
                            onPress={getCurrentLocation}
                        >
                            <Text style={styles.locationButtonText}>Получить местоположение</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.photoContainer}>
                    <Text style={styles.label}>Фото</Text>
                    <TouchableOpacity
                        style={styles.photoButton}
                        onPress={takePhoto}
                    >
                        <Text style={styles.photoButtonText}>
                            {photoUri ? '📸 Фото добавлено' : '📷 Сделать фото'}
                        </Text>
                    </TouchableOpacity>
                    {/* TODO: Добавить предпросмотр фото если photoUri есть */}
                </View>

                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        (!title.trim() || !content.trim() || !location) && styles.saveButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={!title.trim() || !content.trim() || !location}
                >
                    <Text style={styles.saveButtonText}>Сохранить</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    form: {
        padding: 16
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333'
    },
    input: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    textArea: {
        minHeight: 100
    },
    locationContainer: {
        marginBottom: 16
    },
    locationText: {
        fontSize: 14,
        color: '#007AFF',
        marginBottom: 8
    },
    refreshButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#e1f5fe',
        borderRadius: 4
    },
    refreshButtonText: {
        color: '#007AFF',
        fontSize: 12
    },
    locationButton: {
        backgroundColor: '#e1f5fe',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    locationButtonText: {
        color: '#007AFF',
        fontWeight: 'bold'
    },
    photoContainer: {
        marginBottom: 24
    },
    photoButton: {
        backgroundColor: '#e1f5fe',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    photoButtonText: {
        color: '#007AFF',
        fontWeight: 'bold'
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc'
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default AddNoteScreen;
```

**Файл: `src/screens/NoteDetailScreen.tsx`**

```tsx
import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Alert
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { removeNote } from '../store/notesSlice';

interface NoteDetailScreenProps {
    navigation: any;
    route: any;
}

const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({ navigation, route }) => {
    const { noteId } = route.params;
    const dispatch = useAppDispatch();
    const note = useAppSelector(state =>
        state.notes.items.find(item => item.id === noteId)
    );

    useEffect(() => {
        if (!note) {
            navigation.goBack();
        }
    }, [note, navigation]);

    const handleDelete = () => {
        Alert.alert(
            'Удаление заметки',
            'Вы уверены, что хотите удалить эту заметку?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // TODO: Диспатчить действие removeNote
                            // await dispatch(removeNote(noteId)).unwrap();
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Ошибка', 'Не удалось удалить заметку');
                        }
                    }
                }
            ]
        );
    };

    if (!note) {
        return null;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{note.title}</Text>
                <Text style={styles.date}>
                    {new Date(note.createdAt).toLocaleString()}
                </Text>
            </View>

            <View style={styles.contentContainer}>
                <Text style={styles.content}>{note.content}</Text>
            </View>

            {note.address && (
                <View style={styles.addressContainer}>
                    <Text style={styles.addressLabel}>📍 Адрес:</Text>
                    <Text style={styles.addressText}>{note.address}</Text>
                </View>
            )}

            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: note.latitude,
                        longitude: note.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01
                    }}
                >
                    <Marker
                        coordinate={{
                            latitude: note.latitude,
                            longitude: note.longitude
                        }}
                        title={note.title}
                    />
                </MapView>
            </View>

            {note.photoUri && (
                <View style={styles.photoContainer}>
                    <Text style={styles.photoLabel}>📷 Фото:</Text>
                    <Image source={{ uri: note.photoUri }} style={styles.photo} />
                </View>
            )}

            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Удалить заметку</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        backgroundColor: 'white',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    date: {
        fontSize: 14,
        color: '#666'
    },
    contentContainer: {
        backgroundColor: 'white',
        padding: 20,
        marginTop: 1
    },
    content: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24
    },
    addressContainer: {
        backgroundColor: 'white',
        padding: 20,
        marginTop: 1
    },
    addressLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4
    },
    addressText: {
        fontSize: 14,
        color: '#007AFF'
    },
    mapContainer: {
        height: 200,
        marginTop: 1,
        backgroundColor: 'white'
    },
    map: {
        flex: 1
    },
    photoContainer: {
        backgroundColor: 'white',
        padding: 20,
        marginTop: 1
    },
    photoLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    photo: {
        width: '100%',
        height: 200,
        borderRadius: 8
    },
    deleteButton: {
        backgroundColor: '#ff3b30',
        margin: 20,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center'
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default NoteDetailScreen;
```

**Файл: `App.tsx`**

```tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { store } from './src/store';
import NotesListScreen from './src/screens/NotesListScreen';
import AddNoteScreen from './src/screens/AddNoteScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';
import { initDatabase } from './src/utils/database';
import { Alert } from 'react-native';

const Stack = createStackNavigator();

export default function App() {
    useEffect(() => {
        // Инициализация базы данных при запуске
        initDatabase().catch(error => {
            Alert.alert('Ошибка', 'Не удалось инициализировать базу данных');
            console.error(error);
        });
    }, []);

    return (
        <Provider store={store}>
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName="NotesList"
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: '#007AFF'
                        },
                        headerTintColor: 'white',
                        headerTitleStyle: {
                            fontWeight: 'bold'
                        }
                    }}
                >
                    <Stack.Screen
                        name="NotesList"
                        component={NotesListScreen}
                        options={{ title: 'Гео-заметки' }}
                    />
                    <Stack.Screen
                        name="AddNote"
                        component={AddNoteScreen}
                        options={{ title: 'Новая заметка' }}
                    />
                    <Stack.Screen
                        name="NoteDetail"
                        component={NoteDetailScreen}
                        options={{ title: 'Детали заметки' }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </Provider>
    );
}
```

### **3. Задания для самостоятельного выполнения (30% дописать)**

#### **A. Реализация работы с базой данных** (обязательно)

**Задание:** Дописать функции для работы с SQLite в файле `database.ts` для полного CRUD (Create, Read, Update, Delete).

**Файл: `src/utils/database.ts`**

```typescript
// TODO: Реализовать функцию добавления заметки
export const addNote = (note: GeoNote): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                'INSERT INTO notes (id, title, content, latitude, longitude, address, photoUri, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [note.id, note.title, note.content, note.latitude, note.longitude, note.address || null, note.photoUri || null, note.createdAt],
                (_, result) => {
                    console.log('Note added:', result);
                    resolve();
                },
                (_, error) => {
                    console.error('Add note error:', error);
                    reject(error);
                    return false;
                }
            );
        });
    });
};

// TODO: Реализовать функцию удаления заметки
export const deleteNote = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                'DELETE FROM notes WHERE id = ?',
                [id],
                (_, result) => {
                    console.log('Note deleted:', result);
                    resolve();
                },
                (_, error) => {
                    console.error('Delete note error:', error);
                    reject(error);
                    return false;
                }
            );
        });
    });
};

// TODO: Реализовать функцию обновления заметки
export const updateNote = (note: GeoNote): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                'UPDATE notes SET title = ?, content = ?, address = ?, photoUri = ? WHERE id = ?',
                [note.title, note.content, note.address || null, note.photoUri || null, note.id],
                (_, result) => {
                    console.log('Note updated:', result);
                    resolve();
                },
                (_, error) => {
                    console.error('Update note error:', error);
                    reject(error);
                    return false;
                }
            );
        });
    });
};
```

#### **B. Реализация Redux-обработчиков** (обязательно)

**Задание:** Дописать обработчики асинхронных действий в `notesSlice.ts` и связать их с реальными вызовами БД.

**Файл: `src/store/notesSlice.ts`**

```typescript
// TODO: Раскомментировать и исправить импорты
import * as database from '../utils/database';

// TODO: Дописать saveNote thunk
export const saveNote = createAsyncThunk(
    'notes/saveNote',
    async (note: GeoNote) => {
        await database.addNote(note);
        return note;
    }
);

// TODO: Дописать removeNote thunk
export const removeNote = createAsyncThunk(
    'notes/removeNote',
    async (id: string) => {
        await database.deleteNote(id);
        return id;
    }
);

// TODO: Добавить обработчики в extraReducers
.addCase(saveNote.pending, (state) => {
    state.loading = true;
    state.error = null;
})
.addCase(saveNote.fulfilled, (state, action: PayloadAction<GeoNote>) => {
    state.loading = false;
    state.items.push(action.payload);
    // Сортируем по дате (новые сверху)
    state.items.sort((a, b) => b.createdAt - a.createdAt);
})
.addCase(saveNote.rejected, (state, action) => {
    state.loading = false;
    state.error = action.error.message || 'Failed to save note';
})

.addCase(removeNote.pending, (state) => {
    state.loading = true;
    state.error = null;
})
.addCase(removeNote.fulfilled, (state, action: PayloadAction<string>) => {
    state.loading = false;
    state.items = state.items.filter(note => note.id !== action.payload);
})
.addCase(removeNote.rejected, (state, action) => {
    state.loading = false;
    state.error = action.error.message || 'Failed to delete note';
})
```

#### **C. Улучшение пользовательского интерфейса** (дополнительно)

**Задание:** Добавить дополнительные визуальные улучшения в приложение:

1. **Индикатор наличия фото** в списке заметок (файл `NotesListScreen.tsx`)

```tsx
// TODO: Добавить индикатор фото в renderNoteItem
{
    item.photoUri && (
        <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>📷</Text>
        </View>
    )
}

// Добавить стили
photoBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
},
photoBadgeText: {
    color: 'white',
    fontSize: 12
}
```

2. **Предпросмотр фото** на экране создания заметки (файл `AddNoteScreen.tsx`)

```tsx
// TODO: Добавить предпросмотр фото после съемки
{
    photoUri && (
        <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.preview} />
            <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => setPhotoUri(undefined)}
            >
                <Text style={styles.removePhotoText}>✕</Text>
            </TouchableOpacity>
        </View>
    )
}

// Добавить стили
previewContainer: {
    marginTop: 12,
    position: 'relative'
},
preview: {
    width: '100%',
    height: 200,
    borderRadius: 8
},
removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center'
},
removePhotoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
}
```

3. **Индикация загрузки** при сохранении заметки

```tsx
// Добавить состояние загрузки в AddNoteScreen
const [isSaving, setIsSaving] = useState(false);

// Модифицировать handleSave
const handleSave = async () => {
    setIsSaving(true);
    try {
        // ... существующий код
        await dispatch(saveNote(newNote)).unwrap();
    } finally {
        setIsSaving(false);
    }
};

// Изменить кнопку сохранения
<TouchableOpacity
    style={[
        styles.saveButton,
        (!title.trim() || !content.trim() || !location || isSaving) && styles.saveButtonDisabled
    ]}
    onPress={handleSave}
    disabled={!title.trim() || !content.trim() || !location || isSaving}
>
    {isSaving ? (
        <ActivityIndicator color="white" />
    ) : (
        <Text style={styles.saveButtonText}>Сохранить</Text>
    )}
</TouchableOpacity>
```

### **4. Запуск и проверка**

```bash
# Запуск в режиме разработки
expo start

# Для Android (требуется эмулятор или устройство с Expo Go)
# Нажмите 'a' в терминале

# Для iOS (только на macOS)
# Нажмите 'i' в терминале

# Очистка кеша (если возникли проблемы)
expo start -c

# Создание production-сборки
expo build:android
expo build:ios
```

**Проверка функциональности:**
1. Создание заметки с геолокацией
2. Добавление фото к заметке
3. Просмотр списка заметок
4. Просмотр деталей заметки на карте
5. Удаление заметки

### **5. Что должно быть в отчёте:**

1. **Исходный код:**
   - Файл `database.ts` с реализованными CRUD-операциями
   - Файл `notesSlice.ts` с полными обработчиками thunk-действий
   - Модифицированные файлы с UI-улучшениями (если выполнялось дополнительное задание)
   - Файл `App.tsx` с настроенной навигацией

2. **Скриншоты:**
   - Главный экран со списком заметок (минимум 2 заметки)
   - Экран создания заметки с заполненными полями и фото
   - Экран детального просмотра с картой и фото
   - Процесс удаления заметки (диалог подтверждения)

3. **Ответы на вопросы:**
   - В чем заключается архитектура React Native и как работает мост (Bridge)?
   - Какие преимущества дает использование Redux Toolkit для управления состоянием?
   - Чем отличается работа с нативными модулями (камера, геолокация) в React Native от нативной разработки?
   - Как обеспечивается кроссплатформенность кода в React Native?

### **6. Критерии оценивания:**

#### **Обязательные требования (минимум для зачета):**
- **Работа с БД:** Реализованы все CRUD-операции, данные сохраняются после перезапуска приложения
- **Redux-обработчики:** Корректно реализованы все thunk-действия и обработчики состояний
- **Геолокация:** Приложение получает текущее местоположение и отображает его на карте

#### **Дополнительные критерии (для повышения оценки):**
- **UI-улучшения:** Добавлены индикаторы фото, предпросмотр, индикация загрузки
- **Обработка ошибок:** Реализована обработка всех возможных ошибок (нет геолокации, нет разрешений)
- **Валидация:** Проверка вводимых данных и корректные сообщения об ошибках

#### **Неприемлемые ошибки:**
- Утечки памяти при работе с навигацией
- Отсутствие обработки асинхронных операций (необработанные промисы)
- Жестко закодированные ключи API или чувствительные данные

### **7. Полезные команды для Ubuntu:**

```bash
# Установка Node.js и npm (если не установлены)
sudo apt update
sudo apt install nodejs npm

# Установка Expo CLI
npm install -g expo-cli

# Установка зависимостей проекта
npm install

# Запуск с очисткой кеша
expo start -c

# Просмотр логов устройства
expo logs

# Создание APK для Android
expo build:android -t apk

# Проверка типов TypeScript
npx tsc --noEmit

# Линтинг кода
npx eslint src/
```

### **8. Структура проекта:**

```
GeoNotes/
├── src/
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── database.ts
│   ├── store/
│   │   ├── index.ts
│   │   └── notesSlice.ts
│   ├── hooks/
│   │   └── reduxHooks.ts
│   └── screens/
│       ├── NotesListScreen.tsx
│       ├── AddNoteScreen.tsx
│       └── NoteDetailScreen.tsx
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
└── babel.config.js
```

### **9. Советы по выполнению:**

1. **Изучите архитектуру моста:** Понимание того, как React Native общается с нативными модулями, поможет при отладке проблем с камерой и геолокацией.

2. **Используйте Expo Go для быстрой разработки:** Он позволяет тестировать приложение на реальном устройстве без сборки, но имеет ограничения по нативным модулям.

3. **Для отладки Redux** установите React Native Debugger или используйте расширение Redux DevTools в браузере при remote-отладке.

4. **Работа с геолокацией в эмуляторе:** В Android Studio можно задать тестовые координаты через Extended Controls (три точки в панели эмулятора) → Location.

5. **Типичные проблемы и их решения:**
   - **"Unable to resolve module"** — проверьте правильность путей в импортах
   - **"Network request failed"** — проверьте подключение к интернету и настройки эмулятора
   - **"Camera permission denied"** — убедитесь, что запросили разрешения до использования

6. **Для работы с картой в эмуляторе Android** установить Google Play Services (в некоторых эмуляторах использовать образ с Google APIs).

**Примечание:** В задании предоставлено ~70% кода. Ваша задача — понять архитектуру React Native приложения, работу с Redux Toolkit для управления состоянием, взаимодействие с нативными модулями через Expo, и дописать недостающие ~30% функциональности для полноценной работы приложения.