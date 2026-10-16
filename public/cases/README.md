# Case brief PDFs

Seven case briefs — one PDF per case, served verbatim by Vite from `public/`.

Each track runs its own dedicated pool:

- **Junior · "The Mystery Squad"** — 5 easy cases, spin wheel.
  `e1.pdf` … `e5.pdf`
- **Senior · "The Mystery Masters"** — 2 hard cases, coin toss.
  `h1.pdf`, `h2.pdf`

Paths the frontend expects:

```
public/cases/e1.pdf   -> /cases/e1.pdf
public/cases/e2.pdf
public/cases/e3.pdf
public/cases/e4.pdf
public/cases/e5.pdf
public/cases/h1.pdf
public/cases/h2.pdf
```

- Filenames must be lower-case. The frontend builds the URL from the
  label as `label.toLowerCase() + '.pdf'`.
- To rename, move, or point at a different URL, edit `src/lib/cases.ts` —
  the `CATALOG` map there is the single source of truth.

The DB stores a numeric `case_number`:

- 1..5 → easy pool, junior track only
- 6..7 → hard pool, senior track only

`assign_case()` on the server enforces the track → pool boundary.
