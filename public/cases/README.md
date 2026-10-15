# Case brief PDFs

Drop case PDFs into this folder. There are **six case briefs total**,
shared across both tracks (Junior and Senior open the same PDF for a given
case number). The paths the website expects are:

```
public/cases/case-01.pdf   -> /cases/case-01.pdf
public/cases/case-02.pdf
public/cases/case-03.pdf
public/cases/case-04.pdf
public/cases/case-05.pdf
public/cases/case-06.pdf
```

- File names must be `case-NN.pdf` where `NN` is zero-padded (`case-01.pdf`
  through `case-06.pdf`).
- Files in `public/` are served verbatim by Vite — the dashboard's
  "Open sealed PDF" button hits them directly in a new tab.
- To rename, move, or point at a different URL, edit `src/lib/cases.ts` —
  the `pdfPath` field for each case is the only place the paths live.

Until a PDF is uploaded the button opens an empty 404, which is a signal
to the organising team that a case file still needs to be dropped in.
