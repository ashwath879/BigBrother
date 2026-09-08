import os
from flask import Flask
from flask_cors import CORS
from db.database import init_db
from api.routes import api

def create_app():
    app = Flask(__name__)
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*",
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": False,
            }
        }
    )

    init_db()

    app.register_blueprint(api, url_prefix="/api")

    @app.route("/")
    def home():
        return "Server is running"

    return app

if __name__ == "__main__":
    app = create_app()
    backend_port = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "5000")))
    app.run(host="0.0.0.0", port=backend_port, debug=True)
