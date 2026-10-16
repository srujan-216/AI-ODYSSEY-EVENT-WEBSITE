# Case brief PDFs

Seven case briefs, shared across both tracks (Junior and Senior open the
same PDF for a given case). Split into two pools:

- **Easy** — spin the wheel. 5 cases: `e1.pdf` … `e5.pdf`
- **Hard** — toss the coin. 2 cases: `h1.pdf`, `h2.pdf`

```
public/cases/e1.pdf   -> /cases/e1.pdf
public/cases/e2.pdf
public/cases/e3.pdf
public/cases/e4.pdf
public/cases/e5.pdf
public/cases/h1.pdf
public/cases/h2.pdf
```

- Filenames must be lower-case (`e1.pdf` … `h2.pdf`). The frontend builds
  the URL from `label.toLowerCase() + '.pdf'`.
- `public/` is served verbatim by Vite — the dashboard's "Open sealed PDF"
  button links to these paths directly.
- To rename, move, or point at a different URL, edit `src/lib/cases.ts` —
  the `CATALOG` map there is the single source of truth.

The DB stores a numeric `case_number`: 1..5 → easy, 6..7 → hard.
