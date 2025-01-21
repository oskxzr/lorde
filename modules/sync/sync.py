from flask import Blueprint, session, request
from modules.db import dbutils
from modules.pages.pages import title_data
from uuid import uuid4
from modules.sync.wordlist import words
import random
sessions = dbutils.sessions
users = dbutils.users
import time

sync = Blueprint("sync", __name__)

rooms = {}

def leave(user_id, room_id):
    if room_id in rooms:
        users = [user for user in rooms[room_id]["users"] if user["_id"] != user_id]
        rooms[room_id]["users"] = users

@sync.route("/create/<path:url>")
def sync_createroom(url:str):
    while True:
        room_id = random.choice(words)
        if room_id not in rooms:
            rooms[room_id] = {
                "room_leader": session["user_data"]["_id"],
                "users": [session["user_data"]],
                "url": url,
                "state": "paused",
                "timestamps": {}
            }
            session["sync_room"] = room_id
            return {"id": room_id, "data": rooms[room_id]}

@sync.route("/update/<path:url>")
def sync_updateroom(url:str):
    headers = request.get_json()
    timestamp_data = headers.get("timestamp")
    url_data = headers.get("url")
    user_id = session["user_data"]["_id"]
    if "sync_room" in session:
        room_id = session["sync_room"]
        if room_id in rooms:
            if timestamp_data:
                rooms[room_id]["timestamps"][user_id][url] = timestamp_data
            if url_data and user_id == rooms[room_id]["room_leader"]:
                rooms[room_id]["url"] = url_data
            return rooms[room_id]

@sync.route("/get")
def sync_getroom():    
    if "sync_room" in session:
        room_id = session["sync_room"]
        if room_id in rooms:
            return rooms[room_id]

@sync.record_once
def register_app_routes(state):
    app = state.app

    @app.route('/join/<room_id>')
    def sync_joinroom(room_id: str):
        user_id = session["user_data"]["_id"]
        if room_id in rooms:
            # are they already in the room
            for user in rooms[room_id]["users"]:
                if user["_id"] == user_id:
                    return "You are already in this room...."
            session["sync_room"] = room_id
            rooms[room_id]["users"].append(session["user_data"])
        return "Joined room"