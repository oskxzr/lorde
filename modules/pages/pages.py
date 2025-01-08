from flask import Blueprint, render_template, request, jsonify, session, abort
import os
import requests
from modules.pages.media import Media
import time
from werkzeug.exceptions import HTTPException

pages = Blueprint("pages", __name__)

from modules.db import dbutils
titles = dbutils.titles
watch_history = dbutils.watch_history
error_templates = dbutils.error_messages

title_data = {}

def get_next_episode(show_id, season, episode):
    season_num = int(season[1:])
    episode_num = int(episode[1:])
    
    current_season_episodes = len(title_data[show_id.lower()]["seasons"][str(season_num)])
    
    if episode_num < current_season_episodes:
        # Next episode in the same season
        return {
            "season": season,
            "episode": f"E{(episode_num + 1):02}",
            "timestamp": 0
        }
    elif str(season_num + 1) in title_data[show_id.lower()]["seasons"]:
        # First episode of the next season
        return {
            "season": f"S{(season_num + 1):02}",
            "episode": "E01",
            "timestamp": 0
        }
    # No next episode available
    return None

def create_continue_watching(user_watch_history):
    continue_watching = {}
    for key in user_watch_history:
        data = user_watch_history[key].copy()
        
        split = key.split("_")
        if len(split) > 1:
            # For TV shows
            show_id = split[0]
            data["id"] = show_id
            data["season"] = split[1]
            data["episode"] = split[2]
            
            season_num = int(data["season"][1:])
            episode_num = int(data["episode"][1:])
            
            episode_length = title_data[show_id]["seasons"][str(season_num)][episode_num-1]["time"]["m"]
            minutes_remaining = ((episode_length) - (float(data["timestamp"]) / 60))
            
            # If episode is >95% complete, set up the next episode
            if minutes_remaining <= 1.5:
                next_episode_data = get_next_episode(show_id, data["season"], data["episode"])
                if next_episode_data:
                    data.update(next_episode_data)
            
            # Only update if this episode was watched later than the existing one
            if show_id not in continue_watching or data["time"] > continue_watching[show_id]["time"]:
                continue_watching[show_id] = data
        else:
            # For movies
            data["id"] = key
            continue_watching[key] = data
    return {k: v for k, v in sorted(continue_watching.items(), key=lambda item: item[1]["time"], reverse=True)}

def update_title_data():
    print("getting title data...")
    local_title_data = {}
    for entry in titles.find_many({}):
        media = Media(entry)
        media_data = {}
        media_data["data"] = entry
        media_data["metadata"] = media.get_metadata()
        
        if entry["type"] == "SERIES":
            media_data["seasons"] = {}
            for season in entry["seasons"]:
                media_data["seasons"][season] = [episode.get_metadata() for episode in media.get_episodes(int(season))]

        local_title_data[entry["_id"]] = media_data
    global title_data
    title_data = local_title_data
    print("finished")
update_title_data()

def test_backend():
    url = os.environ["CDN_BASE"]
    response = requests.get(url, timeout=4)
    print(response.status_code, response.status_code == 404 , type(response.status_code)) # Prints 404, class 'int'
    if response.status_code == 404:
        return True # Doesnt return
    return str(response.status_code)[0] not in ["3", "4"]
    
@pages.app_errorhandler(HTTPException)
def handle_http_exception(e):
    error_details = error_templates.find(str(e.code)) or error_templates.find("default")
    if not error_details.get("error"):
        error_details["error"] = f"{e.code} {e.name}"
    return render_template('error.html', details = error_details)

@pages.route("/")
def pages_index():
    # test = test_backend()
    # if not test:
    #     return render_template("error.html", details = error_templates.find("backend"))
    user_watch_history = {}
    if session.get("user_data"):
        user_watch_history = watch_history.find(session.get("user_data")["_id"]) or {}
    if user_watch_history != {} and "_id" in user_watch_history:
        del user_watch_history["_id"]
    return render_template("home.html", title_data = title_data, watch_history = user_watch_history, continue_watching = create_continue_watching(user_watch_history), logged_in = session.get("session_key") != None)
    # return render_template("home.html", title_data = title_data)

@pages.route('/error/<int:code>')
def simulate_error(code):
    abort(code)

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
    data = titles.find(title.lower())
    tracks = []
    path = title.upper()
    season = None
    episode = None
    subtitles = None
    next_episode = None
    if data and data["type"] == "MOVIE":
        subtitles = f"/static/subtitles/{path}.vtt"
    else:
        season = split[1].upper()
        episode = split[2].upper()
        next_episode_data = get_next_episode(path, season, episode)
        if next_episode_data:
            next_episode = next_episode_data
            next_episode["data"] = title_data[path.lower()]["seasons"][str(int(next_episode["season"][1:]))][int(next_episode["episode"][1:])-1]
            next_episode["title"] = path
        subtitles = f"/static/subtitles/{path}/{season}/{episode}.vtt"

    for quality in data["qualities"]:
        if data["type"] == "MOVIE":
            tracks.append({"src": f"{os.environ["CDN_BASE"]}/video/{path}/{quality}/{path}.mp4", 'quality': int(quality[:-1])})
        else:
            tracks.append({"src": f"{os.environ["CDN_BASE"]}/video/{path}/{quality}/{season}/{episode}.mp4", 'quality': int(quality[:-1])})

    last_watched = get_watch_history(session["user_data"]["_id"], path.lower(), season, episode)
    
    return render_template(
        "watch.html", 
        tracks=tracks, 
        title_data=title_data[path.lower()], 
        timestamp=last_watched.get("timestamp") if last_watched else None, 
        subtitles=subtitles, 
        next_episode=next_episode
    )



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
    id = split[2].lower()

    data = titles.find(id)

    if data:
        if data["type"] == "MOVIE":
            watch_history.set({"_id": session["user_data"]["_id"], id: {"timestamp": timestamp, "time": time.time()}})
        else:
            id = f"{id.lower()}_{split[3].upper()}_{split[4].upper()}"
            watch_history.set({"_id": session["user_data"]["_id"], id: {"timestamp": timestamp, "time": time.time()}})

    # Send a response back to the client
    return "YES MAMA"
