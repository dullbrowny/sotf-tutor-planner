# Demo Automation Conventions

- Prefer `data-testid` for all interactive controls referenced by scripts.
- Stable names (do not encode UI copy). Examples:
  - nav: `nav-teacher`, `nav-student`, `nav-admin`, `nav-parent`
  - teacher tabs: `teacher-tab-handout`, `teacher-tab-responses`, `teacher-tab-inbox`
  - actions: `btn-assign`, `review-accept`, `btn-submit`
  - student today: `student-today`, `section-<index>-start`, `submission-textarea`
  - admin KPIs: `kpi-submissions-today`
- Changing any `data-testid` requires updating `public/demo_scripts/*.json`.
- Scripts must be deterministic: no network calls; seed state into localStorage.
