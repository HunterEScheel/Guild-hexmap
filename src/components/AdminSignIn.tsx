import { useState, type CSSProperties, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

interface AdminSignInProps {
  /** The signed-in account, if any. Set but not admin shows the "not the admin" view. */
  user: User | null;
  /** True while the account's admin status is still being looked up. */
  checking: boolean;
  onSignOut: () => void;
  onClose: () => void;
}

/** Where the provider sends the admin back to: this page, as it was. */
function returnUrl(): string {
  return window.location.origin + window.location.pathname + window.location.search;
}

const secondaryButton: CSSProperties = {
  background: "transparent",
  color: "#9ca3af",
  border: "1px solid #3e3e5a",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 13,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  background: "#6366f1",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const providerButton: CSSProperties = {
  width: "100%",
  background: "#12121f",
  color: "#e8e8f0",
  border: "1px solid #3e3e5a",
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

/**
 * Sign-in for the map's one admin account. Players never see this; they use the
 * map anonymously. The same GitHub, Discord and email options as the other apps
 * on jaeg.click, and the session they create is shared with those apps.
 */
export function AdminSignIn({ user, checking, onSignOut, onClose }: AdminSignInProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauth = async (provider: "github" | "discord") => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: returnUrl() },
    });
    if (error) setError(error.message);
  };

  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: returnUrl() },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  let body;
  if (user && checking) {
    body = (
      <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
        Checking admin access...
      </p>
    );
  } else if (user) {
    body = (
      <>
        <p style={{ color: "#e8e8f0", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Signed in as {user.email ?? "an account without an email"} — this account
          isn't the admin.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondaryButton}>
            Close
          </button>
          <button onClick={onSignOut} style={primaryButton}>
            Sign out
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <form onSubmit={sendLink}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={() => oauth("github")} style={providerButton}>
            Continue with GitHub
          </button>
          <button type="button" onClick={() => oauth("discord")} style={providerButton}>
            Continue with Discord
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "16px 0",
            color: "#6b7280",
            fontSize: 12,
          }}
        >
          <span style={{ flex: 1, height: 1, background: "#2e2e4a" }} />
          or email link
          <span style={{ flex: 1, height: 1, background: "#2e2e4a" }} />
        </div>
        {sent ? (
          <p style={{ color: "#34d399", fontSize: 13, margin: 0 }}>
            Check your email for a sign-in link.
          </p>
        ) : (
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: `1px solid ${error ? "#ef4444" : "#3e3e5a"}`,
              background: "#12121f",
              color: "#e8e8f0",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        )}
        {error && (
          <p style={{ color: "#ef4444", fontSize: 12, margin: "8px 0 0" }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={secondaryButton}>
            Cancel
          </button>
          {!sent && (
            <button
              type="submit"
              disabled={sending || !email}
              style={{
                ...primaryButton,
                background: sending ? "#3730a3" : "#6366f1",
                cursor: sending || !email ? "not-allowed" : "pointer",
                opacity: sending || !email ? 0.7 : 1,
              }}
            >
              {sending ? "Sending..." : "Send magic link"}
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
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
          borderRadius: 12,
          padding: 24,
          width: 300,
          border: "1px solid #2e2e4a",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            color: "#e8e8f0",
            fontSize: 18,
          }}
        >
          Admin Sign In
        </h3>
        {body}
      </div>
    </div>
  );
}
