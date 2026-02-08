def logical_analysis(code: str, problem: str):
    prompt = f"""
You are a competitive programming judge.
Analyze the following code logically.
Do not fix it. Only classify.

Problem:
{problem}

Code:
{code}

Respond ONLY as JSON:
{{
  "logical_error": true/false,
  "confidence": 0-100
}}
"""
    return prompt
