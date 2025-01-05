from flask import Blueprint, session, redirect, request, render_template, jsonify
from modules.db import dbutils
import bcrypt
import time
from modules.pages.pages import title_data
sessions = dbutils.sessions
users = dbutils.users
user_data = dbutils.user_data

auth = Blueprint("auth", __name__)

def add_user(username, password):
    encrypted_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    user_id = users.set({"username": username, "password": encrypted_password})
    return user_id

@auth.route("/")
def auth_index():
    redirect = request.args.get("r")
    if redirect and "/watch" in redirect and len(redirect.split("/")) >= 3:
        title = redirect.split("/")[2]
        if title and title in title_data:
            logo = title_data[title]["metadata"]["logo"]
            return render_template("auth.html", logo = logo)  
    return render_template("auth.html")

@auth.route("/logout")
def auth_logout():
    session.pop("session_key")
    session.pop("user_data")
    return redirect("/")

@auth.route("/login", methods=['POST'])
def auth_login():
    username = request.form.get('username')
    password = request.form.get('password')

    user_data = users.find({"username": username})
    if user_data:
        encrypted_password = user_data["password"]
        if bcrypt.checkpw(password.encode('utf-8'), encrypted_password):
            session_key = sessions.set({"user_id": user_data["_id"]})
            session["session_key"] = session_key
            return jsonify({"message": 'Success'})
    time.sleep(1)
    return jsonify({"error": 'Incorrect username or password.'})

@auth.before_app_request
def auth_before_request():
    # Skip auth check for static files
    if request.path.startswith("/static"):
        return

    # Session data
    current_session = session.get("session_key")
    user = None
    session_data = None

    if current_session:
        session_data = sessions.find(current_session)
        if session_data and "user_id" in session_data:
            user = users.find(session_data["user_id"])

    # Clear invalid session
    if not current_session or not session_data or not user:
        session.clear()

    # Handle authentication for different routes
    is_auth_route = request.path.startswith("/auth")
    is_home = request.path == "/"
    is_logout = "/auth/logout" in request.path

    if not (is_auth_route or is_home):
        if not (current_session and session_data and user):
            return redirect(f"/auth?r={request.path}")

    if is_auth_route and not is_logout and user:
        return redirect("/")

    # Update user data for authenticated requests
    if user:
        try:
            ud = user_data.find(user["_id"])
            if not ud:
                ud = {
                    "_id": user["_id"],
                    "watch_history": {}
                }
                user_data.set(ud)
            session["user_data"] = ud
        except Exception:
            pass