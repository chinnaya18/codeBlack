import Editor from "@monaco-editor/react";
import { useState, useRef, useCallback } from "react";

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
  const [cursorLine, setCursorLine] = useState(1);
  const [totalLines, setTotalLines] = useState(1);
  const editorRef = useRef(null);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorLine(e.position.lineNumber);
    });
    // Track total lines
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model) {
        setTotalLines(model.getLineCount());
      }
    });
    // Initial line count
    const model = editor.getModel();
    if (model) {
      setTotalLines(model.getLineCount());
    }
  }, []);

  // Get first character of current line for round 2
  const getFirstLetterOfLine = () => {
    if (!code) return "";
    const lines = code.split("\n");
    const currentLine = lines[cursorLine - 1];
    if (!currentLine) return "";
    for (let char of currentLine) {
      if (char !== " " && char !== "\t") {
        return char;
      }
    }
    return "";
  };

  // Keep side frame for round 2 but remove markers
  const renderLineScale = () => {
    if (!isRound2) return null;

    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "16px",
          bottom: "16px",
          width: "42px",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          pointerEvents: "none",
          borderRight: "1px solid #1a1a1a",
          background: "linear-gradient(90deg, #000000, #00000000)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* First letter of current line */}
        <div
          style={{
            fontSize: "14px",
            color: "#00ff99",
            fontWeight: "bold",
            fontFamily: "'JetBrains Mono', monospace",
            textShadow: "0 0 8px #00ff9960",
            minHeight: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {getFirstLetterOfLine()}
        </div>
      </div>
    );
  };

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
        onMount={handleEditorMount}
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
          padding: { top: 16, left: isRound2 ? 48 : 0 },
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

      {/* Blackout overlay for Round 2 — fully black, cursor visible through gap */}
      {isRound2 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "42px",
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,1)",
            pointerEvents: "none",
            zIndex: 10,
            mixBlendMode: "darken",
          }}
        />
      )}

      {/* Round 2 line position scale on the left */}
      {isRound2 && renderLineScale()}

      {/* Round 2 cursor styling — no highlight glow */}
      {isRound2 && (
        <style>{`
          .monaco-editor .cursor {
            background-color: #00ff99 !important;
            border-color: #00ff99 !important;
            box-shadow: none !important;
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
