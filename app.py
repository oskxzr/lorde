######## Environment variables for local environment
import os, json

if os.path.exists('environmentvariables.json'):
    with open('environmentvariables.json', 'r') as file:
        variables = json.load(file)
        for key, value in variables.items():
            os.environ[key] = value
else:
    print("Environment variables file is not existent.")

######## Flask app setup and other imports
from flask import Flask
app = Flask(__name__)
app.secret_key = os.environ["FLASK_SECRET"]

######## Blueprints
from modules.auth.auth import auth
app.register_blueprint(auth, url_prefix="/auth")

from modules.pages.pages import pages
app.register_blueprint(pages)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=9999, debug=True)