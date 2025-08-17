import React from "react";

export function Button({ as: Comp = "button", variant = "primary", className = "", ...props }) {
  const v =
    variant === "secondary" ? "btn-secondary" :
    variant === "ghost"     ? "btn-ghost" :
    variant === "danger"    ? "btn-danger" : "btn-primary";
  return <Comp className={`btn ${v} ${className}`} {...props} />;
}

// Backward-compat: both default + named export work
export default Button;

