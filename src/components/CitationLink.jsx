import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { buildLocalPdfUrl } from "../services/manifest.js";

function isSafeLocal(url) {
  return typeof url === "string" && /^\/cbse-pdf\/sources\//.test(url);
}

export default function CitationLink({ chapter, page = 1, zoom = "page-width", children }) {
  const href = useMemo(() => buildLocalPdfUrl(chapter, { page, zoom }) || "#", [chapter, page, zoom]);
  const safe = isSafeLocal(href);
  return (
    <a href={href} target="_blank" rel="noreferrer" className={safe ? "link" : "link disabled"}>
      {children || "Open"}
    </a>
  );
}
CitationLink.propTypes = {
  chapter: PropTypes.any,
  page: PropTypes.number,
  zoom: PropTypes.string,
  children: PropTypes.node,
};

