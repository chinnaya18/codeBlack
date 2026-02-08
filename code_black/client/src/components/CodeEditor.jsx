import Editor from "@monaco-editor/react";

export default function CodeEditor({ round, locked, onCodeChange }) {
  const isRound1 = round === 1;
  const isRound2 = round === 2;

  return (
    <div
      style={{
        height: "calc(100vh - 50px)",
        backgroundColor: "#000",
        filter: isRound1 ? "blur(1.5px)" : "none",
        userSelect: isRound2 ? "none" : "auto",
      }}
    >
      <Editor
        height="100%"
        language="javascript"
        theme={isRound2 ? "vs-dark" : "vs-dark"}
        value={""}
        onChange={(value) => onCodeChange(value)}
        options={{
          readOnly: locked,

          /* 🔴 BLACKOUT MODE */
          fontSize: 14,
          fontFamily: "JetBrains Mono",
          lineNumbers: "off",
          cursorStyle: isRound2 ? "block" : "line",
          renderLineHighlight: "none",
          selectionHighlight: false,
          occurrencesHighlight: false,
          contextmenu: !isRound2,

          minimap: { enabled: false },
          glyphMargin: false,
          folding: false,

          /* 🔴 VISUAL BLACKOUT */
          cursorBlinking: "solid",
        }}
      />

      {/* Overlay to hide everything visually */}
      {isRound2 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "black",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
