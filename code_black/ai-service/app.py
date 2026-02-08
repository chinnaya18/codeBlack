from fastapi import FastAPI
from analyzer import analyze

app = FastAPI()

@app.post("/analyze")
def analyze_error(payload: dict):
    return analyze(payload.get("stderr", ""))
