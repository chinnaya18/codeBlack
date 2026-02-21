const { GoogleGenAI } = require("@google/genai");

// Make sure to add GEMINI_API_KEY to your .env file
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "YOUR_KEY_HERE"
});

async function getLLMScore(code, language, problem) {
    if (!process.env.GEMINI_API_KEY) {
        return {
            score: 0,
            errorType: "Server Config Error",
            feedback: [
                "LLM strictly requires an API key.",
                "Please create a free key in Google AI Studio and put 'GEMINI_API_KEY=your_key' in server/.env"
            ]
        };
    }

    const prompt = `You are a strict AI judge evaluating competitive programming code without running it.

PROBLEM DESCRIPTION:
${problem.description}

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
}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        let resultText = response.text.trim();
        const result = JSON.parse(resultText);

        // Initial 100 Points
        let score = 100;

        // 1. Language Deductions
        const lang = language.toLowerCase();
        let languagePenalty = 0;
        if (lang === "python" || lang === "javascript" || lang === "js") {
            languagePenalty = 10;
        } else if (lang === "java") {
            languagePenalty = 3;
        } // 'c' has 0 deduction

        // Build the feedback list
        let feedback = [result.feedback_line];
        if (languagePenalty > 0) {
            if (lang === "java") {
                feedback.push(`Language penalty: -3 pts (Java).`);
            } else {
                feedback.push(`Language penalty: -10 pts (${lang}).`);
            }
        } else {
            feedback.push(`No language penalty for C.`);
        }

        // 2. Logic Deductions
        score -= languagePenalty;
        let errorType = "Accepted";

        if (result.has_logic === false) {
            score = 0;
            errorType = "Irrelevant Program";
            feedback.push("Logic penalty: Score is 0 because logic is completely absent or irrelevant (-100 pts).");
        } else {
            let isFlawed = false;

            // 3. Logical Mistakes (-40)
            if (result.logical_mistakes) {
                score -= 40;
                isFlawed = true;
                feedback.push("Logical mistake penalty: -40 pts.");
            }

            // 4. Syntax Errors (-3 each)
            if (result.syntax_error_count > 0) {
                const synPenalty = 3 * result.syntax_error_count;
                score -= synPenalty;
                isFlawed = true;
                feedback.push(`Syntax error penalty: -${synPenalty} pts (${result.syntax_error_count} errors).`);
            }

            // 5. Other / Runtime errors (-5 each)
            if (result.other_error_count > 0) {
                const othPenalty = 5 * result.other_error_count;
                score -= othPenalty;
                isFlawed = true;
                feedback.push(`Other/Runtime error penalty: -${othPenalty} pts (${result.other_error_count} errors).`);
            }

            // Set correct error type
            if (isFlawed) {
                if (result.syntax_error_count > 0) errorType = "Syntax Error";
                else if (result.other_error_count > 0) errorType = "Runtime Error";
                else errorType = "Wrong Answer";
            }
        }

        // Ensure score doesn't dip below 0
        if (score < 0) score = 0;

        return {
            score,
            feedback,
            errorType
        };
    } catch (error) {
        console.error("LLM Evaluation Failed:", error);
        return {
            score: 0,
            errorType: "LLM Request Failed",
            feedback: [
                "Failed to reach the AI model.",
                error.message
            ]
        };
    }
}

module.exports = { getLLMScore };
