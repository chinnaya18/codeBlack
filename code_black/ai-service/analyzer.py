import subprocess
import tempfile
import os


def analyze_code(
    code=None, language="python", test_cases=None, time_limit=5000, stderr=None
):
    """
    Analyze submitted code by running it against test cases.
    Returns structured results with error classification.
    """
    # Simple error classification from stderr
    if stderr:
        if "SyntaxError" in stderr:
            return {"type": "syntax", "penalty": 50}
        if "RuntimeError" in stderr or "Exception" in stderr:
            return {"type": "runtime", "penalty": 30}
        if "TimeoutError" in stderr or "Timeout" in stderr:
            return {"type": "timeout", "penalty": 20}
        return {"type": "logical", "penalty": 10}

    if not code or not test_cases:
        return {"error": "Missing code or test cases"}

    results = {
        "syntax_error": False,
        "runtime_error": False,
        "timed_out": False,
        "test_results": [],
    }

    for tc in test_cases:
        try:
            # Write code to temp file
            suffix = ".py" if language == "python" else ".js"
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=suffix, delete=False
            ) as f:
                f.write(code)
                filepath = f.name

            # Determine command
            if language == "python":
                cmd = ["python", filepath]
            elif language == "javascript":
                cmd = ["node", filepath]
            else:
                return {"error": f"Unsupported language: {language}"}

            # Execute with timeout
            timeout_sec = time_limit / 1000
            proc = subprocess.run(
                cmd,
                input=tc["input"],
                capture_output=True,
                text=True,
                timeout=timeout_sec,
            )

            # Clean up
            os.unlink(filepath)

            if proc.returncode != 0:
                stderr_out = proc.stderr.lower()
                if "syntaxerror" in stderr_out or "syntax error" in stderr_out:
                    results["syntax_error"] = True
                    break
                else:
                    results["runtime_error"] = True
                    break

            actual = proc.stdout.strip()
            expected = tc["expected"].strip()
            results["test_results"].append(
                {
                    "passed": actual == expected,
                    "expected": expected,
                    "actual": actual,
                }
            )

        except subprocess.TimeoutExpired:
            results["timed_out"] = True
            try:
                os.unlink(filepath)
            except Exception:
                pass
            break
        except Exception:
            results["runtime_error"] = True
            break

    return results
