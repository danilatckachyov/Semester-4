from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from datetime import date, timedelta

from models import BookCreate, BookResponse, BookUpdate, BorrowRequest, BookDetailResponse, Genre
from main import books_db, borrow_records, get_next_id, book_to_response

router = APIRouter()

# GET /books - получение списка всех книг с фильтрацией
@router.get("/books", response_model=List[BookResponse])
async def get_books(
    genre: Optional[Genre] = Query(None, description="Фильтр по жанру"),
    author: Optional[str] = Query(None, description="Фильтр по автору"),
    available_only: bool = Query(False, description="Только доступные книги"),
    skip: int = Query(0, ge=0, description="Количество книг для пропуска"),
    limit: int = Query(100, ge=1, le=1000, description="Лимит книг на странице")
):
    filtered_books = []
    for book_id, book_data in books_db.items():
        if genre and book_data["genre"] != genre:
            continue
        if author and author.lower() not in book_data["author"].lower():
            continue
        if available_only and not book_data.get("available", True):
            continue
        filtered_books.append(book_to_response(book_id, book_data))
    return filtered_books[skip:skip+limit]

# GET /books/{book_id} - получение книги по ID
@router.get("/books/{book_id}", response_model=BookDetailResponse)
async def get_book(book_id: int):
    if book_id not in books_db:
        raise HTTPException(status_code=404, detail="Книга не найдена")
    book_data = books_db[book_id]
    response = BookDetailResponse(
        id=book_id,
        title=book_data["title"],
        author=book_data["author"],
        genre=book_data["genre"],
        publication_year=book_data["publication_year"],
        pages=book_data["pages"],
        isbn=book_data["isbn"],
        available=book_data.get("available", True)
    )
    if book_id in borrow_records:
        record = borrow_records[book_id]
        response.borrowed_by = record["borrower_name"]
        response.borrowed_date = record["borrowed_date"]
        response.return_date = record["return_date"]
    return response

# POST /books - создание новой книги
@router.post("/books", response_model=BookResponse, status_code=201)
async def create_book(book: BookCreate):
    for b in books_db.values():
        if b["isbn"] == book.isbn:
            raise HTTPException(status_code=400, detail="Книга с таким ISBN уже существует")
    book_id = get_next_id()
    books_db[book_id] = book.dict()
    books_db[book_id]["available"] = True
    return book_to_response(book_id, books_db[book_id])

# PUT /books/{book_id} - полное обновление книги
@router.put("/books/{book_id}", response_model=BookResponse)
async def update_book(book_id: int, book_update: BookUpdate):
    if book_id not in books_db:
        raise HTTPException(status_code=404, detail="Книга не найдена")
    current = books_db[book_id]
    update_data = book_update.dict(exclude_unset=True)
    if "isbn" in update_data:
        for id_, b in books_db.items():
            if id_ != book_id and b["isbn"] == update_data["isbn"]:
                raise HTTPException(status_code=400, detail="Книга с таким ISBN уже существует")
    current.update(update_data)
    books_db[book_id] = current
    return book_to_response(book_id, books_db[book_id])

# DELETE /books/{book_id} - удаление книги
@router.delete("/books/{book_id}", status_code=204)
async def delete_book(book_id: int):
    if book_id not in books_db:
        raise HTTPException(status_code=404, detail="Книга не найдена")
    if not books_db[book_id].get("available", True):
        raise HTTPException(status_code=400, detail="Нельзя удалить взятую книгу")
    books_db.pop(book_id)
    borrow_records.pop(book_id, None)
    return None

# POST /books/{book_id}/borrow - заимствование книги
@router.post("/books/{book_id}/borrow", response_model=BookDetailResponse)
async def borrow_book(book_id: int, borrow_request: BorrowRequest):
    if book_id not in books_db:
        raise HTTPException(status_code=404, detail="Книга не найдена")
    if not books_db[book_id].get("available", True):
        raise HTTPException(status_code=400, detail="Книга уже взята")
    books_db[book_id]["available"] = False
    borrowed_date = date.today()
    return_date = borrowed_date + timedelta(days=borrow_request.return_days)
    borrow_records[book_id] = {
        "borrower_name": borrow_request.borrower_name,
        "borrowed_date": borrowed_date,
        "return_date": return_date
    }
    response = BookDetailResponse(
        id=book_id,
        title=books_db[book_id]["title"],
        author=books_db[book_id]["author"],
        genre=books_db[book_id]["genre"],
        publication_year=books_db[book_id]["publication_year"],
        pages=books_db[book_id]["pages"],
        isbn=books_db[book_id]["isbn"],
        available=False,
        borrowed_by=borrow_request.borrower_name,
        borrowed_date=borrowed_date,
        return_date=return_date
    )
    return response

# POST /books/{book_id}/return - возврат книги
@router.post("/books/{book_id}/return", response_model=BookResponse)
async def return_book(book_id: int):
    if book_id not in books_db:
        raise HTTPException(status_code=404, detail="Книга не найдена")
    if books_db[book_id].get("available", True):
        raise HTTPException(status_code=400, detail="Книга не была взята")
    books_db[book_id]["available"] = True
    borrow_records.pop(book_id, None)
    return book_to_response(book_id, books_db[book_id])

# GET /stats - статистика библиотеки
@router.get("/stats")
async def get_library_stats():
    stats = {
        "total_books": len(books_db),
        "available_books": 0,
        "borrowed_books": 0,
        "books_by_genre": {},
        "most_prolific_author": None
    }
    author_count = {}
    for book in books_db.values():
        if book.get("available", True):
            stats["available_books"] += 1
        else:
            stats["borrowed_books"] += 1
        genre = book["genre"]
        stats["books_by_genre"].setdefault(genre, 0)
        stats["books_by_genre"][genre] += 1
        author = book["author"]
        author_count[author] = author_count.get(author, 0) + 1
    if author_count:
        stats["most_prolific_author"] = max(author_count, key=author_count.get)
    return stats
