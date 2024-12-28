from flask import Blueprint, render_template

pages = Blueprint("pages", __name__)

@pages.route("/")
def pages_index():
    return render_template("home.html")

@pages.route("/watch")
def pages_watch():
    return "Hello world"