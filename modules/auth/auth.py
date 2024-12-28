from flask import Blueprint, session, redirect, request, render_template
from modules.db import dbutils
sessions = dbutils.sessions
users = dbutils.users
user_data = dbutils.user_data

auth = Blueprint("auth", __name__)

@auth.route("/")
def auth_index():
    return render_template("auth.html")

@auth.before_app_request
def auth_beforerequest():
    if (not request.path.startswith("/static")):

        # Get session data
        current_session = session.get("session_key")
        session_data = sessions.find(current_session)
        if session_data and "user_id" in session_data:
            user = users.find(session_data.user_id)

        # Allow requests from auth and the homepage through
        if (not request.path.startswith("/auth")) and (request.path != "/"):
            if not session or not session_data:
                if session:
                    session.pop("session_key") # Remove the session key from the session object if it is invalid
                return redirect("/auth")
            if not user: # If there is no user associated with the user id from the session, e.g if the account was deleted since the session was initialised
                session.pop("session_key") 
                return redirect("/auth")
        # If they're on auth, make sure that they're not logged in
        else:
            if session and session_data and user:
                return redirect("/")
            