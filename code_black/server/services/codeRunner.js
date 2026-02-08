const { exec } = require("child_process");

module.exports = (language, codeFile) => {
  return new Promise((resolve) => {
    exec(
      `docker run --rm --network none codeblack-${language}`,
      { timeout: 2000, maxBuffer: 1024 * 100 },
      (err, stdout, stderr) => {
        resolve({ stdout, stderr });
      },
    );
  });
};
