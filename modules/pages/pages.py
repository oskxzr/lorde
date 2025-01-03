from flask import Blueprint, render_template, request, jsonify, session
import os
import requests
from modules.pages.media import Media

pages = Blueprint("pages", __name__)

from modules.db import dbutils
titles = dbutils.titles
watch_history = dbutils.watch_history

title_data = {}

def update_title_data():
    print("getting title data...")
    local_title_data = {}
    for entry in titles.find_many({}):
        media = Media(entry["name"])
        media_data = {}
        media_data["data"] = entry
        media_data["metadata"] = media.get_metadata()
        
        if entry["type"] == "SERIES":
            media_data["seasons"] = {}
            for season in entry["seasons"]:
                media_data["seasons"][season] = [episode.get_metadata() for episode in media.get_episodes(int(season))]

        local_title_data[entry["name"]] = media_data
    global title_data
    title_data = local_title_data
    print("finished")
update_title_data()

def test_backend():
    url = os.environ["CDN_BASE"]
    try: 
        request = requests.get(url, timeout=4)
        print(request.status_code)
        return str(request[0].status_code) not in ["3", "4"]
    except:
        return False

@pages.route("/")
def pages_index():
    # if not test_backend():
    #     return render_template("offline.html")
    return render_template("home.html", title_data = title_data)

def get_watch_history(user_id, id, season = None, episode = None):
    watch_history_data = watch_history.find(user_id)
    if watch_history_data:
        if watch_history_data.get(id):
            return watch_history_data[id]
        elif watch_history_data.get(f"{id}_{season}_{episode}"):
            return watch_history_data.get(f"{id}_{season}_{episode}")

@pages.route("/watch/<path:path>")
def pages_watch(path):
    split = path.split("/")
    title = split[0]
    data = titles.find({"_id": title.lower()})
    tracks = []
    path = title.upper()
    season = None
    episode = None
    for quality in data["qualities"]:
        if data["type"] == "MOVIE":
            tracks.append(f"{os.environ["CDN_BASE"]}/video/{path}/{quality}/{path}.mp4")
        else:
            season = split[1].upper()
            episode = split[2].upper()
            tracks.append(f"{os.environ["CDN_BASE"]}/video/{path}/{quality}/{season}/{episode}.mp4")

    last_watched = get_watch_history(session["user_data"]["_id"], path.lower(), season, episode)
    print(last_watched)
    return render_template("player.html", tracks = tracks, title_data = title_data[data["name"]], timestamp = last_watched)

@pages.route("/resettitledata")
def resettitledata():
    update_title_data()
    return "Hello world"

@pages.route("/watchhistory", methods=["POST"])
def watchhistory():
    data = request.form  # For form-encoded data (as in your AJAX request)
    video_url = data.get('url')
    timestamp = data.get('timestamp')
    # e.g /watch/knivesout
    # or  /watch/breakingbad/s01/e01
    split = video_url.split("/")
    # 0 = "" 1 = "watch" 2 = id
    id = split[2]

    data = titles.find(id)

    if data:
        if data["type"] == "MOVIE":
            watch_history.set({"_id": session["user_data"]["_id"], id.lower(): timestamp})
        else:
            id = f"{id.lower()}_{split[3].upper()}_{split[4].upper()}"
            watch_history.set({"_id": session["user_data"]["_id"], id: timestamp})

    # Send a response back to the client
    return "YES MAMA"
