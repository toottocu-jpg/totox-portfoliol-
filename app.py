import os
import sqlite3
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, session
import psycopg
from psycopg.rows import dict_row
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "portfolio.db"
DATABASE_URL = os.environ.get("DATABASE_URL")
USING_POSTGRES = bool(DATABASE_URL)
app = Flask(__name__, static_folder=BASE_DIR)
app.secret_key = os.environ.get("PORTFOLIO_SECRET_KEY", "local-portfolio-secret-key")
ADMIN_PASSWORD = os.environ.get("PORTFOLIO_ADMIN_PASSWORD", "tottox2026")


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_authenticated"):
            return jsonify({"error": "Admin girişi gerekli."}), 401
        return view(*args, **kwargs)

    return wrapped


def get_db():
    if USING_POSTGRES:
        return psycopg.connect(DATABASE_URL, row_factory=dict_row)
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def db_execute(connection, query, params=()):
    if USING_POSTGRES:
        return connection.execute(query.replace("?", "%s"), params)
    return connection.execute(query.replace("%s", "?"), params)


def db_executemany(connection, query, params):
    if USING_POSTGRES:
        return connection.executemany(query.replace("?", "%s"), params)
    return connection.executemany(query.replace("%s", "?"), params)


def init_db():
    with get_db() as connection:
        if USING_POSTGRES:
            connection.execute("CREATE TABLE IF NOT EXISTS messages (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)")
            connection.execute("CREATE TABLE IF NOT EXISTS projects (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, accent TEXT NOT NULL DEFAULT '#b6ff3f')")
            connection.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        else:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
                CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, accent TEXT NOT NULL DEFAULT '#b6ff3f');
                CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
                """
            )
        if db_execute(connection, "SELECT COUNT(*) AS count FROM projects").fetchone()["count"] == 0:
            db_executemany(
                connection,
                "INSERT INTO projects (title, category, description, accent) VALUES (?, ?, ?, ?)",
                [
                    ("ORGANİK BÜYÜME", "Web tasarımı", "Sosyal medya büyümesi için hazırlanan modern, neon detaylı marka sitesi.", "#b6ff3f"),
                    ("SPOTIFY KEŞFET", "Web uygulaması", "Spotify sanatçılarını ve parçalarını keşfetmeye yardımcı olan arama deneyimi.", "#7ce7ff"),
                    ("PYTHON TEMELLERİ", "Python öğrenimi", "Python öğrenirken hazırlanan çalışmalar, denemeler ve ilk web uygulamaları.", "#ff6bdf"),
                ],
            )


@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:filename>")
def assets(filename):
    return send_from_directory(BASE_DIR, filename)


@app.get("/api/projects")
def projects():
    with get_db() as connection:
        rows = db_execute(connection, "SELECT * FROM projects ORDER BY id DESC").fetchall()
    return jsonify([dict(row) for row in rows])


@app.post("/api/admin/login")
def admin_login():
    data = request.get_json(silent=True) or {}
    if data.get("password") != ADMIN_PASSWORD:
        return jsonify({"error": "Şifre hatalı."}), 401
    session["admin_authenticated"] = True
    return jsonify({"message": "Admin girişi başarılı."})


@app.post("/api/auth/register")
def register_user():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if "@" not in email or len(password) < 6:
        return jsonify({"error": "Geçerli bir e-posta ve en az 6 karakterli şifre gerekli."}), 400
    try:
        with get_db() as connection:
            db_execute(
                connection,
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (email, generate_password_hash(password)),
            )
    except sqlite3.IntegrityError:
        return jsonify({"error": "Bu e-posta zaten kayıtlı."}), 409
    session["user_email"] = email
    return jsonify({"message": "Kayıt başarılı.", "email": email}), 201


@app.post("/api/auth/login")
def user_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    with get_db() as connection:
        user = db_execute(connection, "SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "E-posta veya şifre hatalı."}), 401
    session["user_email"] = email
    return jsonify({"message": "Giriş başarılı.", "email": email})


@app.get("/api/auth/session")
def user_session():
    return jsonify({"authenticated": bool(session.get("user_email")), "email": session.get("user_email")})


@app.post("/api/auth/logout")
def user_logout():
    session.pop("user_email", None)
    return jsonify({"message": "Oturum kapatıldı."})


@app.get("/api/admin/session")
def admin_session():
    return jsonify({"authenticated": bool(session.get("admin_authenticated"))})


@app.post("/api/admin/logout")
def admin_logout():
    session.pop("admin_authenticated", None)
    return jsonify({"message": "Admin oturumu kapatıldı."})


@app.post("/api/messages")
def create_message():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    message = str(data.get("message", "")).strip()
    if not name or not email or not message:
        return jsonify({"error": "Tüm alanları doldurman gerekiyor."}), 400
    with get_db() as connection:
        db_execute(
            connection,
            "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)",
            (name, email, message),
        )
    return jsonify({"message": "Mesajın başarıyla alındı."}), 201


@app.get("/api/admin/summary")
@admin_required
def admin_summary():
    with get_db() as connection:
        message_count = db_execute(connection, "SELECT COUNT(*) AS count FROM messages").fetchone()["count"]
        project_count = db_execute(connection, "SELECT COUNT(*) AS count FROM projects").fetchone()["count"]
        latest = db_execute(
            connection,
            "SELECT id, name, email, message, created_at FROM messages ORDER BY id DESC LIMIT 8"
        ).fetchall()
        projects = db_execute(
            connection,
            "SELECT id, title, category FROM projects ORDER BY id DESC"
        ).fetchall()
    return jsonify(
        {
            "message_count": message_count,
            "project_count": project_count,
            "availability": "Açık",
            "messages": [dict(row) for row in latest],
            "projects": [dict(row) for row in projects],
        }
    )


def delete_row(table, row_id):
    if table not in {"messages", "projects"}:
        return False
    with get_db() as connection:
        cursor = db_execute(connection, f"DELETE FROM {table} WHERE id = ?", (row_id,))
        deleted = cursor.rowcount
    return deleted > 0


@app.delete("/api/admin/projects/<int:project_id>")
@admin_required
def delete_project(project_id):
    if not delete_row("projects", project_id):
        return jsonify({"error": "Proje bulunamadı."}), 404
    return jsonify({"message": "Proje silindi."})


@app.delete("/api/admin/messages/<int:message_id>")
@admin_required
def delete_message(message_id):
    if not delete_row("messages", message_id):
        return jsonify({"error": "Mesaj bulunamadı."}), 404
    return jsonify({"message": "Mesaj silindi."})


init_db()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=os.environ.get("FLASK_DEBUG") == "1",
    )
