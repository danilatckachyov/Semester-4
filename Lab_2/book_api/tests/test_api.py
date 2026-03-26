import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_book():
    response = client.post("/api/v1/books", json={
        "title": "Преступление и наказание",
        "author": "Фёдор Достоевский",
        "genre": "fiction",
        "publication_year": 1866,
        "pages": 671,
        "isbn": "9781234567898"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Преступление и наказание"
    assert data["available"] is True

def test_get_books():
    response = client.get("/api/v1/books")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_borrow_and_return_book():
    # Создать книгу
    response = client.post("/api/v1/books", json={
        "title": "Война и мир",
        "author": "Лев Толстой",
        "genre": "fiction",
        "publication_year": 1869,
        "pages": 1225,
        "isbn": "9781234567897"
    })
    book_id = response.json()["id"]
    # Взять книгу
    response = client.post(f"/api/v1/books/{book_id}/borrow", json={
        "borrower_name": "Иван Иванов",
        "return_days": 14
    })
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert data["borrowed_by"] == "Иван Иванов"
    # Вернуть книгу
    response = client.post(f"/api/v1/books/{book_id}/return")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True

def test_delete_taken_book():
    # Создать книгу
    response = client.post("/api/v1/books", json={
        "title": "Мастер и Маргарита",
        "author": "Михаил Булгаков",
        "genre": "fiction",
        "publication_year": 1967,
        "pages": 480,
        "isbn": "9781234567899"
    })
    book_id = response.json()["id"]
    # Взять книгу
    client.post(f"/api/v1/books/{book_id}/borrow", json={
        "borrower_name": "Пётр Петров",
        "return_days": 7
    })
    # Попытка удалить взятую книгу
    response = client.delete(f"/api/v1/books/{book_id}")
    assert response.status_code == 400
    assert "Нельзя удалить взятую книгу" in response.text
