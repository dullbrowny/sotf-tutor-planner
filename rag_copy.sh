# paths
REPO=~/projects/sotf-tutor-planner
DL=~/Downloads

# make sure folders exist
mkdir -p "$REPO/scripts" \
         "$REPO/src/services" \
         "$REPO/src/pages/Teachers" \
         "$REPO/src/pages/students" \
         "$REPO/public/cbse-pdf/rag" \
         "$REPO/src/domain/cbse"

# --- backups (safe) ---
cp -v "$REPO/src/pages/Teachers/LessonPlanning.jsx"{,.bak} 2>/dev/null || true
cp -v "$REPO/src/components/CitationLink.jsx"{,.bak} 2>/dev/null || true
cp -v "$REPO/src/api/mockApi.js"{,.bak} 2>/dev/null || true
cp -v "$REPO/public/cbse-pdf/manifest.json"{,.bak} 2>/dev/null || true

# --- env files (optional) ---
# copy whichever you have
[ -f "$DL/.env.example" ] && cp -v "$DL/.env.example" "$REPO/.env.example"
[ -f "$DL/.env.local" ]   && cp -v "$DL/.env.local"   "$REPO/.env.local"

# --- build-time scripts ---
cp -v "$DL/llmClient.mjs"         "$REPO/scripts/llmClient.mjs"
cp -v "$DL/llm-enrich-ncert.mjs"  "$REPO/scripts/llm-enrich-ncert.mjs"
cp -v "$DL/build-rag.mjs"         "$REPO/scripts/build-rag.mjs"

# --- runtime services ---
cp -v "$DL/rag.js"        "$REPO/src/services/rag.js"
cp -v "$DL/llmClient.js"  "$REPO/src/services/llmClient.js"

# --- pages / UI ---
cp -v "$DL/ChatPanel.jsx"                   "$REPO/src/pages/ChatPanel.jsx"
# teacher planner (try either filename you downloaded)
cp -v "$DL/LessonPlanning.hierarchical.jsx" "$REPO/src/pages/Teachers/LessonPlanning.jsx" 2>/dev/null || \
cp -v "$DL/LessonPlanning.v2.fixed.jsx"     "$REPO/src/pages/Teachers/LessonPlanning.jsx"
# student consumer
cp -v "$DL/MicroplanConsume.jsx"            "$REPO/src/pages/students/MicroplanConsume.jsx"

# --- optional: earlier drop-ins if you grabbed them too ---
#[ -f "$DL/CitationLink.fixed.jsx" ] && cp -v "$DL/CitationLink.fixed.jsx" "$REPO/src/components/CitationLink.jsx"
#[ -f "$DL/mockApi.fixed.js" ]       && cp -v "$DL/mockApi.fixed.js"       "$REPO/src/api/mockApi.js"

# --- README (optional) ---
#[ -f "$DL/SOTF_llm_rag_DROP_README.md" ] && cp -v "$DL/SOTF_llm_rag_DROP_README.md" "$REPO/"

