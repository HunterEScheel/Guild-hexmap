import { useState } from "react";

interface DatePickerModalProps {
  onConfirm: (date: string) => void;
  onCancel: () => void;
}

export function DatePickerModal({ onConfirm, onCancel }: DatePickerModalProps) {
  const [date, setDate] = useState("");

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e1e36",
          borderRadius: 8,
          padding: 24,
          width: 320,
          border: "1px solid #2e2e4a",
        }}
      >
        <h3
          style={{
            margin: "0 0 8px",
            color: "#e8e8f0",
            fontFamily: "'Cinzel', serif",
            fontSize: 18,
          }}
        >
          Schedule Quest
        </h3>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>
          When would you like to play this quest?
        </p>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 4,
            border: "1px solid #2e2e4a",
            background: "#12121f",
            color: "#e8e8f0",
            fontSize: 14,
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid #2e2e4a",
              color: "#9ca3af",
              borderRadius: 4,
              padding: "6px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            disabled={!date}
            onClick={() => onConfirm(date)}
            style={{
              background: date ? "#4ade80" : "#2e2e4a",
              color: date ? "#000" : "#6b7280",
              border: "none",
              borderRadius: 4,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: date ? "pointer" : "not-allowed",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
