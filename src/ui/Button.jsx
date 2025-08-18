// src/ui/Button.jsx
import React from "react";

/**
 * Unified Button component
 * - Works with both:  import Button from ".../Button";
 *                     import { Button } from ".../Button";
 * - Variants map onto theme.css utility classes.
 */
function UIButton({ variant = "primary", size = "md", className = "", ...props }) {
  const vmap = {
    primary: "btn btn-primary",
    secondary: "btn btn-outline",
    outline: "btn btn-outline",
    ghost: "btn btn-ghost",
    danger: "btn btn-danger",
    warning: "btn btn-warning",
  };
  const sm = size === "sm" ? " text-sm px-3 py-1.5 " : "";
  return <button {...props} className={`${vmap[variant] || vmap.primary}${sm} ${className}`} />;
}

export default UIButton;
export const Button = UIButton; // named export for existing imports

