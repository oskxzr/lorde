from modules.db.db import DB
from uuid import uuid4
database = DB()

id_gen = lambda: str(uuid4())
sessions = database.get_collection("web", "sessions", id_generation_function=id_gen, include_created_at=True)
sessions.collection.create_index(
    [("createdAt", 1)], 
    expireAfterSeconds=3 * 24 * 60 * 60  # 3 days in seconds
)
users = database.get_collection("web", "users", id_generation_function=id_gen)
watch_history = database.get_collection("web", "watch_history")

titles = database.get_collection("static", "titles")
error_messages = database.get_collection("static", "error_messages")
categories = database.get_collection("static", "categories")
