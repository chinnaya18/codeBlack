from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from analyzer import analyze_code

app = FastAPI(title="CodeBlack AI Evaluation Service")


class TestCase(BaseModel):
    input: str
    expected: str


class EvaluateRequest(BaseModel):
    code: str
    language: str
    test_cases: List[TestCase]
    time_limit: int = 5000


class AnalyzeErrorRequest(BaseModel):
    stderr: str


@app.post("/analyze")
def analyze_error(payload: AnalyzeErrorRequest):
    """Classify error from stderr output."""
    return analyze_code(stderr=payload.stderr)


@app.post("/evaluate")
def evaluate_code(payload: EvaluateRequest):
    """Run code against test cases and return results."""
    return analyze_code(
        code=payload.code,
        language=payload.language,
        test_cases=[tc.dict() for tc in payload.test_cases],
        time_limit=payload.time_limit,
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "codeblack-ai"}
