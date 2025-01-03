from flask import Blueprint, session, redirect, request, render_template, jsonify
from modules.db import dbutils
import bcrypt
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
    return render_template("auth.html")

@auth.route("/logout")
def auth_logout():
    del session["session_key"]
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
            return jsonify(message='Success'), 200
        else:
            return jsonify(error='Invalid credentials'), 401
    return jsonify(error="Could not find your account"), 400

@auth.before_app_request
def auth_beforerequest():
    if (not request.path.startswith("/static")):

        # Get session data
        current_session = session.get("session_key")
        session_data = sessions.find(current_session)
        if session_data and "user_id" in session_data:
            user = users.find(session_data["user_id"])

        # Allow requests from auth and the homepage through
        if (not request.path.startswith("/auth")) and (request.path != "/"):
            if not session or not session_data:
                if session:
                    session.pop("session_key") # Remove the session key from the session object if it is invalid
                return redirect(f"/auth?r={request.path}")
            if not user: # If there is no user associated with the user id from the session, e.g if the account was deleted since the session was initialised
                session.pop("session_key") 
                return redirect(f"/auth?r={request.path}")
        # If they're on auth, make sure that they're not logged in
        elif request.path.startswith("/auth") and "logout" not in request.path and session and session_data and user:
                return redirect("/")
            
        # Request is allowed through, set/init userdata
        try: #if theyre going to the home page unlogged in or auth
            ud = user_data.find(user["_id"])
            if not ud:
                ud = {"_id": user["_id"], "watch_history": {}}
                user_data.set(ud)
            session["user_data"] = ud
        except: pass