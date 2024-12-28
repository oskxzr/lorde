from modules.db.db import DB
from uuid import uuid4
database = DB()

id_gen = lambda: str(uuid4())
sessions = database.get_collection("web", "sessions", id_generation_function=id_gen)
users = database.get_collection("web", "users", id_generation_function=id_gen)
user_data = database.get_collection("web", "user_data")
