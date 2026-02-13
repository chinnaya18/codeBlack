from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from analyzer import analyze_code, GCC_CMD, JAVAC_CMD, PYTHON_CMD

app = FastAPI(title="CodeBlack AI Evaluation Service")

# Allow cross-origin requests from the Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    language: str = "python"


@app.post("/analyze")
def analyze_error(payload: AnalyzeErrorRequest):
    """Classify error from stderr output."""
    return analyze_code(stderr=payload.stderr, language=payload.language)


@app.post("/evaluate")
def evaluate_code(payload: EvaluateRequest):
    """
    AI-powered code evaluation:
    - Compiles (C/Java) or syntax-checks (Python/JS)
    - Runs code against test cases
    - Classifies errors: syntax, runtime, logical, timeout
    - Returns error counts for point deduction
    """
    result = analyze_code(
        code=payload.code,
        language=payload.language,
        test_cases=[tc.dict() for tc in payload.test_cases],
        time_limit=payload.time_limit,
    )
    return result


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "codeblack-ai",
        "compilers": {
            "python": PYTHON_CMD,
            "gcc": GCC_CMD or "NOT AVAILABLE",
            "javac": JAVAC_CMD or "NOT AVAILABLE",
            "node": "node",
        },
    }
