# CapText

CapText is a simple in-browser OCR tool that allows users to paste images from the clipboard, extract text using Tesseract.js, and download the results as a `.txt` file.

## Features

- Paste images directly using `Ctrl + V`
- Displays pasted images in a gallery
- Performs OCR using Tesseract.js
- Processes images in mini-batches for efficiency
- Downloads extracted text as a plain text file

## Files

- `index.html` – Main HTML layout and script includes  
- `index.css` – Basic styling for the drop area and gallery  
- `index.js` – JavaScript logic for image handling, OCR, batching, and download

## Usage

1. Open `index.html` in a browser.
2. Paste one or more images using `Ctrl + V`.
3. Click "Generate Text" to start OCR.
4. A `.txt` file containing the extracted text will be downloaded.

## Dependencies

- [Tesseract.js](https://cdn.jsdelivr.net/npm/tesseract.js@6.0.0)

This dependency is loaded via CDN in `index.html`.

## License

MIT
