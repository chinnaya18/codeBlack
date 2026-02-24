// Client-side OpenRouter AI Evaluation Logic with 5 fallback models

const MODELS = [
    "openrouter/free",
    "stepfun/step-3.5-flash:free",
    "arcee-ai/trinity-large-preview:free",
    "upstage/solar-pro-3:free",
];

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function evaluateCodeLocally(code, language, problem) {
    const prompt = `You are a strict AI judge evaluating competitive programming code without running it.

PROBLEM DESCRIPTION:
${problem?.description || "Solve the coding question."}

STUDENT SUBMITTED CODE (Language: ${language}):
\`\`\`${language}
${code}
\`\`\`

Analyze the code and output exactly a valid JSON object matching this structure EXACTLY (no markdown block, just raw JSON).

SCORING CRITERIA:
1. has_logic (boolean): true if the code attempts to solve the problem with reasonable logic. false if it is completely empty, gibberish, or fundamentally irrelevant to the problem.
2. logical_mistakes (boolean): true if their logic is flawed, misses a major edge case, or calculates incorrectly. false if the logic is perfect.
3. syntax_error_count (number): Count the number of obvious syntax errors (missing semicolons, incorrect indentation in Python, missing brackets, typos in keywords).
4. other_error_count (number): Count other errors like runtime errors, out of bounds, division by zero, type mismatches.
5. feedback_line: A single sentence evaluating their code.

{
  "has_logic": true/false,
  "logical_mistakes": true/false,
  "syntax_error_count": <number>,
  "other_error_count": <number>,
  "feedback_line": "..."
}`;

    let lastError = null;
    const adminModel = localStorage.getItem("OPENROUTER_MODEL");
    const activeModels = adminModel ? [adminModel, ...MODELS] : MODELS;

    for (const model of activeModels) {
        try {
            const apiKey = localStorage.getItem("OPENROUTER_API_KEY") || import.meta.env?.VITE_OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_API_KEY || "";

            const response = await fetch(OPENROUTER_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "CodeBlack Evaluation",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }]
                })
            });

            if (!response.ok) {
                throw new Error(`Model ${model} returned ${response.status}`);
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error(`Invalid response format from ${model}`);
            }

            // Parse JSON
            let resultText = content.trim();
            if (resultText.startsWith("\`\`\`json")) resultText = resultText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
            else if (resultText.startsWith("\`\`\`")) resultText = resultText.replace(/\`\`\`/g, "").trim();

            const result = JSON.parse(resultText);

            const finalScore = calculateScore(result, language);
            finalScore.modelUsed = model; // Add model info to the result
            return finalScore;

        } catch (error) {
            console.error(`Local AI Evaluation error with model ${model}:`, error);
            lastError = error;
            // continue to next model
        }
    }

    // If all models fail, we THROW an error.
    // This explicitly prevents the AdminPanel from saving a "0 score" to the database for this student,
    // thereby keeping the submission "pending" until the Admin corrects their API Key or Model choice.
    throw new Error(`Failed to reach OpenRouter AI models: ${lastError?.message || "Unknown error"}. Ensure API Key is correct.`);
}

function calculateScore(result, language) {
    let score = 100;
    const lang = language.toLowerCase();

    let languagePenalty = 0;
    if (lang === "python" || lang === "javascript" || lang === "js") {
        languagePenalty = 10;
    } else if (lang === "java") {
        languagePenalty = 3;
    } else if (lang === "cpp" || lang === "c++") {
        languagePenalty = 2;
    }

    let feedback = [result.feedback_line || "Analyzed successfully."];

    if (languagePenalty > 0) {
        feedback.push(`Language penalty: -${languagePenalty} pts (${lang}).`);
    } else {
        feedback.push(`No language penalty for C.`);
    }

    score -= languagePenalty;
    let errorType = "Accepted";

    if (result.has_logic === false) {
        score = 0;
        errorType = "Irrelevant Program";
        feedback.push("Logic penalty: Score is 0 because logic is completely absent or irrelevant (-100 pts).");
    } else {
        let isFlawed = false;

        if (result.logical_mistakes) {
            score -= 40;
            isFlawed = true;
            feedback.push("Logical mistake penalty: -40 pts.");
        }

        if (result.syntax_error_count > 0) {
            const synPenalty = 3 * result.syntax_error_count;
            score -= synPenalty;
            isFlawed = true;
            feedback.push(`Syntax error penalty: -${synPenalty} pts (${result.syntax_error_count} errors).`);
        }

        if (result.other_error_count > 0) {
            const othPenalty = 5 * result.other_error_count;
            score -= othPenalty;
            isFlawed = true;
            feedback.push(`Other/Runtime error penalty: -${othPenalty} pts (${result.other_error_count} errors).`);
        }

        if (isFlawed) {
            if (result.syntax_error_count > 0) errorType = "Syntax Error";
            else if (result.other_error_count > 0) errorType = "Runtime Error";
            else errorType = "Wrong Answer";
        }
    }

    if (score < 0) score = 0;

    return {
        score,
        feedback,
        errorType
    };
}
