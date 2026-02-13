import subprocess
import tempfile
import os
import re
import sys
import platform


def get_python_cmd():
    """Get the correct python command for this system."""
    if platform.system() == "Windows":
        # Try py launcher first (Windows), then python
        for cmd in ["py", "python"]:
            try:
                subprocess.run([cmd, "--version"], capture_output=True, timeout=3)
                return cmd
            except Exception:
                continue
    return "python3"


def get_gcc_cmd():
    """Check if gcc is available."""
    for cmd in ["gcc", "cc"]:
        try:
            subprocess.run([cmd, "--version"], capture_output=True, timeout=3)
            return cmd
        except Exception:
            continue
    return None


def get_javac_cmd():
    """Check if javac is available."""
    try:
        subprocess.run(["javac", "-version"], capture_output=True, timeout=3)
        return "javac"
    except Exception:
        return None


PYTHON_CMD = get_python_cmd()
GCC_CMD = get_gcc_cmd()
JAVAC_CMD = get_javac_cmd()

print(f"[AI] Python: {PYTHON_CMD}, GCC: {GCC_CMD}, Java: {JAVAC_CMD}")


# ─── Error Pattern Detection ──────────────────────────────
SYNTAX_PATTERNS = {
    "python": [
        r"SyntaxError", r"IndentationError", r"TabError",
        r"invalid syntax", r"unexpected EOF",
    ],
    "javascript": [
        r"SyntaxError", r"Unexpected token", r"Unexpected identifier",
        r"Unexpected end of input", r"Missing .* before",
    ],
    "c": [
        r"error:.*expected", r"error:.*undeclared",
        r"error:.*unknown type", r"error:.*before",
        r"error:.*missing", r"error:.*invalid",
    ],
    "java": [
        r"error:.*expected", r"error:.*cannot find symbol",
        r"error:.*';' expected", r"error:.*illegal start",
        r"error:.*class.*not found", r"error:.*incompatible types",
    ],
}

RUNTIME_PATTERNS = {
    "python": [
        r"Traceback", r"NameError", r"TypeError", r"ValueError",
        r"IndexError", r"KeyError", r"ZeroDivisionError",
        r"AttributeError", r"FileNotFoundError", r"ImportError",
        r"RecursionError", r"OverflowError", r"StopIteration",
    ],
    "javascript": [
        r"ReferenceError", r"TypeError", r"RangeError",
        r"URIError", r"EvalError", r"InternalError",
        r"Error:", r"is not defined", r"is not a function",
    ],
    "c": [
        r"Segmentation fault", r"core dumped", r"Bus error",
        r"Floating point exception", r"Aborted",
        r"stack smashing", r"buffer overflow",
    ],
    "java": [
        r"Exception in thread", r"NullPointerException",
        r"ArrayIndexOutOfBoundsException", r"StackOverflowError",
        r"ClassCastException", r"ArithmeticException",
        r"NumberFormatException", r"OutOfMemoryError",
    ],
}


def classify_error(stderr_text, language):
    """Classify error type from stderr output using patterns."""
    if not stderr_text:
        return None

    # Check syntax errors first
    for pattern in SYNTAX_PATTERNS.get(language, []):
        if re.search(pattern, stderr_text, re.IGNORECASE):
            return "syntax"

    # Check runtime errors
    for pattern in RUNTIME_PATTERNS.get(language, []):
        if re.search(pattern, stderr_text, re.IGNORECASE):
            return "runtime"

    return "unknown"


def count_syntax_errors(stderr_text, language):
    """Count distinct syntax errors in compiler/interpreter output."""
    if not stderr_text:
        return 0
    lines = stderr_text.strip().split("\n")
    error_count = 0
    for line in lines:
        if re.search(r"error", line, re.IGNORECASE):
            error_count += 1
    return max(1, error_count)  # At least 1 if we got here


def analyze_logical_errors(test_results):
    """Analyze test results to determine logical error severity."""
    if not test_results:
        return 0

    total = len(test_results)
    failed = sum(1 for t in test_results if not t.get("passed", False))

    if failed == 0:
        return 0

    return failed  # Number of logical errors = failed test cases


def compile_c(code, output_path):
    """Compile C code. Returns (success, stderr)."""
    if not GCC_CMD:
        # Try using the Windows-compatible approach
        # Check for cl.exe (MSVC) or tcc as fallback
        for alt_cmd in ["tcc", "cl"]:
            try:
                subprocess.run([alt_cmd], capture_output=True, timeout=3)
                break
            except Exception:
                alt_cmd = None

        if not alt_cmd:
            return False, "C compiler (gcc) not found on this system. Please install MinGW or GCC."

    with tempfile.NamedTemporaryFile(mode="w", suffix=".c", delete=False) as f:
        f.write(code)
        src_path = f.name

    try:
        result = subprocess.run(
            [GCC_CMD or "gcc", src_path, "-o", output_path, "-lm"],
            capture_output=True, text=True, timeout=15
        )
        return result.returncode == 0, result.stderr
    except Exception as e:
        return False, str(e)
    finally:
        try:
            os.unlink(src_path)
        except Exception:
            pass


def compile_java(code):
    """Compile Java code. Returns (success, class_name, tmp_dir, stderr)."""
    if not JAVAC_CMD:
        return False, None, None, "Java compiler (javac) not found."

    # Extract class name from code
    match = re.search(r"(?:public\s+)?class\s+(\w+)", code)
    class_name = match.group(1) if match else "Main"

    tmp_dir = tempfile.mkdtemp()
    src_path = os.path.join(tmp_dir, f"{class_name}.java")

    with open(src_path, "w") as f:
        f.write(code)

    try:
        result = subprocess.run(
            ["javac", src_path],
            capture_output=True, text=True, timeout=20
        )
        return result.returncode == 0, class_name, tmp_dir, result.stderr
    except Exception as e:
        return False, class_name, tmp_dir, str(e)


def run_code(code, language, input_data, time_limit_ms=5000):
    """
    Execute code in the specified language with input.
    Returns: { stdout, stderr, timed_out, exit_code, execution_time_ms }
    """
    timeout_sec = max(time_limit_ms / 1000, 2)

    if language == "python":
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(code)
            filepath = f.name
        cmd = [PYTHON_CMD, filepath]
        cleanup = [filepath]

    elif language == "javascript":
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
            f.write(code)
            filepath = f.name
        cmd = ["node", filepath]
        cleanup = [filepath]

    elif language == "c":
        output_path = tempfile.mktemp(suffix=".exe" if platform.system() == "Windows" else "")
        success, stderr = compile_c(code, output_path)
        if not success:
            return {
                "stdout": "",
                "stderr": stderr,
                "timed_out": False,
                "exit_code": 1,
                "compilation_error": True,
            }
        cmd = [output_path]
        cleanup = [output_path]

    elif language == "java":
        success, class_name, tmp_dir, stderr = compile_java(code)
        if not success:
            return {
                "stdout": "",
                "stderr": stderr,
                "timed_out": False,
                "exit_code": 1,
                "compilation_error": True,
            }
        cmd = ["java", "-cp", tmp_dir, class_name]
        cleanup = []  # We'll clean up the whole tmp_dir later

    else:
        return {
            "stdout": "",
            "stderr": f"Unsupported language: {language}",
            "timed_out": False,
            "exit_code": 1,
        }

    try:
        import time
        start = time.time()
        proc = subprocess.run(
            cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
        elapsed = int((time.time() - start) * 1000)

        return {
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
            "timed_out": False,
            "exit_code": proc.returncode,
            "execution_time_ms": elapsed,
        }

    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Time Limit Exceeded",
            "timed_out": True,
            "exit_code": -1,
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "timed_out": False,
            "exit_code": 1,
        }
    finally:
        for f in cleanup:
            try:
                os.unlink(f)
            except Exception:
                pass
        # Clean up Java temp dir
        if language == "java" and tmp_dir:
            try:
                import shutil
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass


def analyze_code(
    code=None, language="python", test_cases=None, time_limit=5000, stderr=None
):
    """
    AI-powered code evaluation:
    1. Compile (for C/Java) or syntax-check
    2. Run against each test case
    3. Classify errors: syntax, runtime, logical, timeout
    4. Return detailed results with error counts for point deduction
    """
    # Simple error classification from stderr (legacy endpoint)
    if stderr and not code:
        error_type = classify_error(stderr, language)
        if error_type == "syntax":
            return {"type": "syntax", "penalty": 7}
        elif error_type == "runtime":
            return {"type": "runtime", "penalty": 8}
        return {"type": "logical", "penalty": 10}

    if not code or not test_cases:
        return {"error": "Missing code or test cases"}

    results = {
        "compilation_error": False,
        "syntax_error": False,
        "runtime_error": False,
        "timed_out": False,
        "syntax_error_count": 0,
        "runtime_error_count": 0,
        "logical_error_count": 0,
        "error_details": "",
        "test_results": [],
    }

    # ── Step 1: Run first test case to check for compilation/syntax errors ──
    first_result = run_code(code, language, test_cases[0]["input"], time_limit)

    # Compilation error (C/Java)
    if first_result.get("compilation_error"):
        results["compilation_error"] = True
        results["syntax_error"] = True
        results["error_details"] = first_result["stderr"]
        results["syntax_error_count"] = count_syntax_errors(first_result["stderr"], language)
        return results

    # Timeout on first test
    if first_result["timed_out"]:
        results["timed_out"] = True
        return results

    # Check stderr for syntax/runtime errors
    if first_result["exit_code"] != 0 and first_result["stderr"]:
        error_type = classify_error(first_result["stderr"], language)
        if error_type == "syntax":
            results["syntax_error"] = True
            results["syntax_error_count"] = count_syntax_errors(first_result["stderr"], language)
            results["error_details"] = first_result["stderr"]
            return results
        elif error_type == "runtime":
            results["runtime_error"] = True
            results["runtime_error_count"] = 1
            results["error_details"] = first_result["stderr"]
            return results
        elif first_result["exit_code"] != 0:
            # Unknown error with non-zero exit → treat as runtime
            results["runtime_error"] = True
            results["runtime_error_count"] = 1
            results["error_details"] = first_result["stderr"]
            return results

    # First test case output comparison
    actual = first_result["stdout"].replace("\r\n", "\n").strip()
    expected = test_cases[0]["expected"].replace("\r\n", "\n").strip()
    results["test_results"].append({
        "passed": actual == expected,
        "expected": expected,
        "actual": actual,
    })

    # ── Step 2: Run remaining test cases ──
    for tc in test_cases[1:]:
        result = run_code(code, language, tc["input"], time_limit)

        if result["timed_out"]:
            results["timed_out"] = True
            break

        if result["exit_code"] != 0 and result["stderr"]:
            error_type = classify_error(result["stderr"], language)
            if error_type == "runtime":
                results["runtime_error"] = True
                results["runtime_error_count"] += 1
                results["error_details"] = result["stderr"]
                break
            elif result["exit_code"] != 0:
                results["runtime_error"] = True
                results["runtime_error_count"] += 1
                results["error_details"] = result["stderr"]
                break

        actual = result["stdout"].replace("\r\n", "\n").strip()
        expected_out = tc["expected"].replace("\r\n", "\n").strip()
        results["test_results"].append({
            "passed": actual == expected_out,
            "expected": expected_out,
            "actual": actual,
        })

    # ── Step 3: Count logical errors (failed test cases) ──
    results["logical_error_count"] = analyze_logical_errors(results["test_results"])

    return results
