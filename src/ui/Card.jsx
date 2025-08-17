import React from "react";

export function Card({ title, actions = null, className = "", children }) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          {title ? <div className="title">{title}</div> : <div />}
          {actions}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

// Backward-compat: both default + named export work
export default Card;

