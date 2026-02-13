const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Add MSYS2 gcc to PATH if on Windows and not already available
if (os.platform() === "win32") {
  const msys2Gcc = "C:\\msys64\\mingw64\\bin";
  if (fs.existsSync(path.join(msys2Gcc, "gcc.exe"))) {
    process.env.PATH = msys2Gcc + ";" + process.env.PATH;
  }
}

/**
 * Execute user code with timeout and proper error classification.
 * Supports: Python, JavaScript, C, Java
 * 
 * This is a LOCAL runner used as a fallback. The main evaluation
 * goes through the AI service (aiService.js → Python FastAPI).
 */
function runCode(language, code, input, timeLimit = 5000) {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const timestamp = Date.now() + "_" + Math.random().toString(36).slice(2);
    const isWindows = os.platform() === "win32";
    let filePath, command;
    const filesToClean = [];

    try {
      if (language === "python") {
        filePath = path.join(tmpDir, `cb_${timestamp}.py`);
        fs.writeFileSync(filePath, code);
        filesToClean.push(filePath);
        const pythonCmd = isWindows ? "py" : "python3";
        command = `${pythonCmd} "${filePath}"`;
      } else if (language === "javascript") {
        filePath = path.join(tmpDir, `cb_${timestamp}.js`);
        fs.writeFileSync(filePath, code);
        filesToClean.push(filePath);
        command = `node "${filePath}"`;
      } else if (language === "c") {
        filePath = path.join(tmpDir, `cb_${timestamp}.c`);
        const outPath = path.join(tmpDir, `cb_${timestamp}${isWindows ? ".exe" : ""}`);
        fs.writeFileSync(filePath, code);
        filesToClean.push(filePath, outPath);

        try {
          execSync(`gcc "${filePath}" -o "${outPath}" -lm 2>&1`, { timeout: 15000 });
        } catch (compileErr) {
          const stderr = compileErr.stdout ? compileErr.stdout.toString() : compileErr.message;
          cleanup(filesToClean);
          resolve({
            stdout: "",
            stderr: stderr,
            timedOut: false,
            executionTime: 0,
            compilationError: true,
          });
          return;
        }
        command = `"${outPath}"`;
      } else if (language === "java") {
        const className = `CB_${timestamp.replace(/[^a-zA-Z0-9]/g, "_")}`;
        let javaCode = code;
        javaCode = javaCode.replace(/public\s+class\s+\w+/g, `public class ${className}`);
        if (!javaCode.includes(`class ${className}`)) {
          javaCode = javaCode.replace(/class\s+\w+/g, `class ${className}`);
        }
        if (!javaCode.includes(`class ${className}`)) {
          javaCode = `import java.util.*;\npublic class ${className} {\n${code}\n}`;
        }

        filePath = path.join(tmpDir, `${className}.java`);
        fs.writeFileSync(filePath, javaCode);
        filesToClean.push(filePath, path.join(tmpDir, `${className}.class`));

        try {
          execSync(`javac "${filePath}" 2>&1`, { timeout: 20000 });
        } catch (compileErr) {
          const stderr = compileErr.stdout ? compileErr.stdout.toString() : compileErr.message;
          cleanup(filesToClean);
          resolve({
            stdout: "",
            stderr: stderr,
            timedOut: false,
            executionTime: 0,
            compilationError: true,
          });
          return;
        }
        command = `java -cp "${tmpDir}" ${className}`;
      } else {
        resolve({
          stdout: "",
          stderr: "Unsupported language: " + language,
          timedOut: false,
          executionTime: 0,
        });
        return;
      }
    } catch (setupErr) {
      resolve({
        stdout: "",
        stderr: "Setup error: " + setupErr.message,
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
        cleanup(filesToClean);

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
            exitCode: error ? error.code : 0,
          });
        }
      },
    );

    if (input !== undefined && input !== null) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
  });
}

function cleanup(files) {
  for (const f of files) {
    try { fs.unlinkSync(f); } catch {}
  }
}

module.exports = { runCode };
