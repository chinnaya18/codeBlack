import Editor from "@monaco-editor/react";

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
        filter: isRound1 ? "blur(1.2px)" : "none",
      }}
    >
      <Editor
        height="100%"
        language={language === "python" ? "python" : "javascript"}
        theme="vs-dark"
        value={code}
        onChange={(value) => onCodeChange(value || "")}
        options={{
          readOnly: locked,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: isRound2 ? "off" : "on",
          cursorStyle: isRound2 ? "block" : "line",
          renderLineHighlight: isRound2 ? "none" : "all",
          selectionHighlight: !isRound2,
          occurrencesHighlight: !isRound2,
          contextmenu: !isRound2,
          minimap: { enabled: false },
          glyphMargin: false,
          folding: true,
          cursorBlinking: isRound2 ? "solid" : "blink",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 },
          suggest: { showWords: !isRound2 },
        }}
      />

      {/* Blackout overlay for Round 2 - hides typed text */}
      {isRound2 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.95)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
