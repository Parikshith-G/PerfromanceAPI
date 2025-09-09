from flask import Flask, request, jsonify
import random
import time

app = Flask(__name__)

@app.route("/test", methods=["POST"])
def test():
    data = request.json
    time.sleep(random.uniform(0, 0.2))
    if random.random() < 0.8:
        return jsonify({"status": "ok"}), 200
    else:
        return jsonify({"status": "fail"}), 500

if __name__ == "__main__":
    app.run(port=5000)
