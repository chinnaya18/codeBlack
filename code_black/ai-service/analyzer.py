def analyze(stderr: str):
    if "SyntaxError" in stderr:
        return {"type": "syntax", "penalty": 15}
    if "RuntimeError" in stderr or "Exception" in stderr:
        return {"type": "runtime", "penalty": 10}
    return {"type": "logical", "penalty": 5}
