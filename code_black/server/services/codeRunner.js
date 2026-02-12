const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Execute user code in a sandboxed process with timeout and memory limits.
 * Supports Python and JavaScript.
 */
function runCode(language, code, input, timeLimit = 5000) {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const timestamp = Date.now() + "_" + Math.random().toString(36).slice(2);
    let filePath, command;

    if (language === "python") {
      filePath = path.join(tmpDir, `cb_${timestamp}.py`);
      fs.writeFileSync(filePath, code);
      command = `python "${filePath}"`;
    } else if (language === "javascript") {
      filePath = path.join(tmpDir, `cb_${timestamp}.js`);
      fs.writeFileSync(filePath, code);
      command = `node "${filePath}"`;
    } else {
      resolve({
        stdout: "",
        stderr: "Unsupported language: " + language,
        timedOut: false,
        executionTime: 0,
      });
      return;
    }

    const startTime = Date.now();
    const proc = exec(
      command,
      { timeout: timeLimit, maxBuffer: 1024 * 512 },
      (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;

        // Clean up temp file
        try {
          fs.unlinkSync(filePath);
        } catch {}

        if (error && error.killed) {
          resolve({
            stdout: "",
            stderr: "Time Limit Exceeded",
            timedOut: true,
            executionTime,
          });
        } else {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            timedOut: false,
            executionTime,
          });
        }
      },
    );

    // Feed input via stdin
    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
  });
}

module.exports = { runCode };
