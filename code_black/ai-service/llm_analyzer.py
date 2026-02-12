def logical_analysis(code: str, problem: str):
    """Generate a prompt for LLM-based logical analysis of submitted code."""
    prompt = f"""You are a competitive programming judge.
Analyze the following code logically.
Do not fix it. Only classify.

Problem:
{problem}

Code:
{code}

Respond ONLY as JSON:
{{
  "logical_error": true/false,
  "confidence": 0-100,
  "error_type": "none" | "wrong_algorithm" | "edge_case_miss" | "off_by_one" | "other",
  "suggestion": "brief suggestion for improvement"
}}
"""
    return prompt


def generate_feedback(error_type: str, test_results: list):
    """Generate human-readable feedback based on evaluation results."""
    feedback = []

    if error_type == "Syntax Error":
        feedback.append(
            "Your code has syntax errors. Check for missing brackets, colons, or typos."
        )
    elif error_type == "Runtime Error":
        feedback.append(
            "Your code crashed during execution. Common causes: division by zero, "
            "index out of bounds, type errors."
        )
    elif error_type == "Time Limit Exceeded":
        feedback.append(
            "Your code took too long to execute. Consider optimizing your algorithm's "
            "time complexity."
        )
    elif error_type == "Wrong Answer":
        failed = [
            i + 1 for i, t in enumerate(test_results) if not t.get("passed")
        ]
        feedback.append(f"Failed test cases: {failed}")
        feedback.append("Review your logic and edge cases.")
    elif error_type == "Accepted":
        feedback.append("All test cases passed! Great job!")

    return feedback
