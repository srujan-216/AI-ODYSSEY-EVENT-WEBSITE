# Case brief PDFs

Drop case PDFs into this folder. The paths referenced by the website are:

```
public/cases/junior/case-01.pdf   -> /cases/junior/case-01.pdf
public/cases/junior/case-02.pdf
...
public/cases/junior/case-08.pdf

public/cases/senior/case-01.pdf   -> /cases/senior/case-01.pdf
public/cases/senior/case-02.pdf
...
public/cases/senior/case-10.pdf
```

- File names must be `case-NN.pdf` where `NN` is zero-padded (e.g. `case-01.pdf`, `case-10.pdf`).
- Files in `public/` are served verbatim by Vite — the dashboard's "Open case
  brief" button hits them directly in a new tab.
- To rename, move, or point at a different URL, edit `src/lib/cases.ts` — the
  `pdfPath` field for each case is the only place the paths live.

Until a PDF is uploaded the button will open an empty 404, which is a signal
to the organising team that a case file still needs to be dropped in.
