import Editor from "@monaco-editor/react";

const LANGUAGE_MAP = {
  python: "python",
  javascript: "javascript",
  c: "c",
  java: "java",
};

export default function CodeEditor({
  language,
  locked,
  onCodeChange,
  code,
  round,
}) {
  const isRound1 = round === 1;
  const isRound2 = round === 2;

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        filter: isRound1 ? "blur(3.5px)" : "none",
      }}
    >
      <Editor
        height="100%"
        language={LANGUAGE_MAP[language] || "python"}
        theme="vs-dark"
        value={code}
        onChange={(value) => onCodeChange(value || "")}
        options={{
          readOnly: locked,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: isRound2 ? "off" : "on",
          cursorStyle: isRound2 ? "block" : "line",
          cursorWidth: isRound2 ? 3 : 2,
          renderLineHighlight: isRound2 ? "none" : "all",
          selectionHighlight: !isRound2,
          occurrencesHighlight: !isRound2,
          contextmenu: !isRound2,
          minimap: { enabled: false },
          glyphMargin: false,
          folding: true,
          cursorBlinking: isRound2 ? "expand" : "blink",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 },
          suggest: { showWords: !isRound2 },
        }}
      />

      {/* Round 1 — extra blur overlay to make text truly unreadable */}
      {isRound1 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}

      {/* Blackout overlay for Round 2 — hides text but cursor is visible through gap */}
      {isRound2 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.88)",
            pointerEvents: "none",
            zIndex: 10,
            mixBlendMode: "darken",
          }}
        />
      )}

      {/* Round 2 cursor line indicator — glowing line at cursor area */}
      {isRound2 && (
        <style>{`
          .monaco-editor .cursor {
            background-color: #00ff99 !important;
            border-color: #00ff99 !important;
            box-shadow: 0 0 12px #00ff99, 0 0 24px #00ff9960 !important;
            z-index: 100 !important;
            opacity: 1 !important;
          }
          .monaco-editor .cursors-layer {
            z-index: 100 !important;
          }
        `}</style>
      )}
    </div>
  );
}
