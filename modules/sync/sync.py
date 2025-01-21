from flask import Blueprint, session
from modules.db import dbutils
from modules.pages.pages import title_data
from uuid import uuid4
sessions = dbutils.sessions
users = dbutils.users

sync = Blueprint("sync", __name__)

rooms = {}

def leave(user_id, room_id):
    if room_id in rooms:
        users = [user for user in rooms[room_id]["users"] if user["_id"] != user_id]
        rooms[room_id]["users"] = users

@sync.route("/create")
def sync_createroom():
    room_id = str(uuid4())
    rooms[room_id] = {
        "room_leader": session["user_data"],
        "users": [session["user_data"]]
    }
    session["sync_room"] = room_id
    return "Create room"

@sync.route("/update")
def sync_updateroom():
    return "Update room"

@sync.route("/get")
def sync_updateroom():
    return "Update room"

@sync.record_once
def register_app_routes(state):
    app = state.app

    @app.route('/join/<room_id>')
    def sync_joinroom(room_id: str):
        return "Join room"