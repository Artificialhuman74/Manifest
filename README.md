# PESU Slide Downloader

Chrome extension to bulk-download slides and notes from PESU Academy course units.

---

## What you need to install

### 1. Chrome (or any Chromium-based browser)
- Google Chrome, Microsoft Edge, or Brave will all work.
- Firefox does **not** support Chrome extensions.

### 2. LibreOffice *(only needed for the Convert PPTs to PDF feature)*
LibreOffice is free and open-source office software that the extension uses to convert `.pptx` files to PDF.

**Download and install:** https://www.libreoffice.org/download/download-libreoffice/

After installing LibreOffice, run the one-time setup script to connect it to the extension:

```bash
bash install_native_host.sh
```

When prompted, open `chrome://extensions`, find **PESU Slide Downloader**, copy its ID, and paste it in the terminal.

Then reload the extension in `chrome://extensions`. The **Convert PPTs to PDF** toggle will now work.

If you skip this step, everything works normally — the Convert toggle will fall back to downloading `.pptx` files as-is.

---

### 3. `pdf-lib.min.js` *(only needed for the Merge PDFs feature)*
The merge feature requires this file to be present in the extension folder. It is not bundled because of file size.

**Download it once and place it in the `pesu-downloader` folder:**

**Mac / Linux:**
```bash
curl -L "https://unpkg.com/pdf-lib/dist/pdf-lib.min.js" -o pdf-lib.min.js
```

**Windows (PowerShell):**
```powershell
Invoke-WebRequest "https://unpkg.com/pdf-lib/dist/pdf-lib.min.js" -OutFile pdf-lib.min.js
```

After downloading, your folder should look like this:
```
pesu-downloader/
  background.js
  content.js
  manifest.json
  pdf-lib.min.js   ← this one
  ...
```

If you skip this step, everything works normally — the Merge toggle just won't function.

---

## Loading the extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `pesu-downloader` folder
5. The extension icon appears in your toolbar

To reload after a code change: click the refresh icon on the extension card in `chrome://extensions`.

---

## Usage

1. Go to [PESU Academy](https://www.pesuacademy.com) and log in
2. Navigate to **My Courses** and open a course
3. Click the extension icon — a floating panel appears
4. *(Optional)* Toggle **Convert PPTs to PDF** to convert any PowerPoint files to PDF on the fly
5. *(Optional)* Toggle **Merge PDFs after download** and set a filename
6. Click **Slides** or **Notes** to start downloading
7. Files are saved to `Downloads/PESU_Slides/<unit name>/`

---

## No build tools needed

- No Node.js, no `npm install`, no package manager steps
- Core download features work entirely inside Chrome with the files as-is
- LibreOffice and pdf-lib are only needed for their respective optional features
