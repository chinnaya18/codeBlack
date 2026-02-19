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

  // Generate line scale markers for round 2
  const renderLineScale = () => {
    if (!isRound2) return null;
    const lines = Math.max(totalLines, 20);
    const scaleHeight = 100; // percentage
    const markers = [];

    // Show every 5th line + current line
    for (let i = 1; i <= lines; i++) {
      const isCurrentLine = i === cursorLine;
      const isMarker = i === 1 || i % 5 === 0 || isCurrentLine;
      if (!isMarker) continue;

      const topPercent = ((i - 1) / Math.max(lines - 1, 1)) * scaleHeight;

      markers.push(
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${topPercent}%`,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            height: "1px",
            transition: "all 0.15s ease",
          }}
        >
          {/* Line number label */}
          <span
            style={{
              fontSize: isCurrentLine ? "11px" : "8px",
              color: isCurrentLine ? "#00ff99" : "#333",
              fontWeight: isCurrentLine ? "bold" : "normal",
              fontFamily: "'JetBrains Mono', monospace",
              width: "28px",
              textAlign: "right",
              paddingRight: "4px",
              textShadow: isCurrentLine ? "0 0 8px #00ff99" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {i}
          </span>
          {/* Tick mark */}
          <div
            style={{
              width: isCurrentLine ? "10px" : "4px",
              height: isCurrentLine ? "3px" : "1px",
              background: isCurrentLine ? "#00ff99" : "#222",
              boxShadow: isCurrentLine ? "0 0 6px #00ff99" : "none",
              transition: "all 0.15s ease",
            }}
          />
        </div>
      );
    }

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
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          {markers}
        </div>
        {/* Current line indicator at bottom */}
        <div
          style={{
            textAlign: "center",
            padding: "4px 0",
            borderTop: "1px solid #1a1a1a",
            color: "#00ff99",
            fontSize: "10px",
            fontWeight: "bold",
            fontFamily: "'JetBrains Mono', monospace",
            textShadow: "0 0 8px #00ff9960",
          }}
        >
          L{cursorLine}
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
