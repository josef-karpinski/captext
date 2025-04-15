// Import pdf.js from the CDN (version 5.0.375) as an ES module.
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.0.375/pdf.min.mjs";

// Set up the pdf.js worker (ensure the worker file is the corresponding module version).
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.0.375/pdf.worker.min.mjs";

const gallery = document.getElementById('gallery');
const generateTextButton = document.getElementById('generate-text-button');
const fileTypeSelect = document.getElementById('file-type-select');
const fileInputScreenshots = document.getElementById('file-input-screenshots');
const fileInputPDFs = document.getElementById('file-input-pdfs');

let pastedImages = [];
let pdfFiles = [];
let pdfTexts = [];

/**
 * Toggle file input visibility and clear stored data based on selection.
 */
fileTypeSelect.addEventListener('change', (e) => {
  const selectedType = e.target.value;
  
  if (selectedType === 'screenshots') {
    fileInputScreenshots.style.display = 'block';
    fileInputScreenshots.disabled = false;
    fileInputPDFs.style.display = 'none';
    fileInputPDFs.disabled = true;
    fileInputPDFs.value = '';
    pdfFiles = [];
  } else if (selectedType === 'pdfs') {
    fileInputPDFs.style.display = 'block';
    fileInputPDFs.disabled = false;
    fileInputScreenshots.style.display = 'none';
    fileInputScreenshots.disabled = true;
    fileInputScreenshots.value = '';
    pastedImages = [];
    gallery.innerHTML = '';
  }
});

// Process paste events (only allow images in "screenshots" mode).
document.addEventListener('paste', (e) => {
  if (fileTypeSelect.value !== 'screenshots') return;
  
  const items = e.clipboardData?.items || [];
  const itemsArray = (typeof items.forEach === 'function') ? items : Array.from(items);
  
  itemsArray.forEach(item => {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        gallery.appendChild(img);
        pastedImages.push(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  });
});

// Process screenshot file input.
fileInputScreenshots.addEventListener('change', (e) => {
  if (pdfFiles.length > 0) {
    alert('You can only upload screenshots or PDFs, not both.');
    fileInputScreenshots.value = '';
    return;
  }
  const files = Array.from(e.target.files);
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target.result;
      gallery.appendChild(img);
      pastedImages.push(event.target.result);
    };
    reader.readAsDataURL(file);
  });
});

// Process PDF file input.
fileInputPDFs.addEventListener('change', (e) => {
  if (pastedImages.length > 0) {
    alert('You can only upload screenshots or PDFs, not both.');
    fileInputPDFs.value = '';
    return;
  }
  const files = Array.from(e.target.files);
  pdfFiles = files.filter((file) => file.type === 'application/pdf');
  if (pdfFiles.length === 0) {
    alert('Only PDF files are supported for this option.');
  }
});

// Run OCR on images and PDFs when the button is clicked.
generateTextButton.addEventListener('click', async () => {
  if (!pastedImages.length && !pdfFiles.length) {
    alert('No images or PDFs processed yet!');
    return;
  }

  try {
    // Process images (if any).
    const imageResults = pastedImages.length > 0 
      ? await processImagesBatches(pastedImages, 10) 
      : [];

    // Process PDFs (if any).
    pdfTexts = [];
    if (pdfFiles.length > 0) {
      for (const file of pdfFiles) {
        const pdfText = await extractTextFromPDF(file);
        pdfTexts.push(pdfText);
      }
    }

    // Combine image and PDF results.
    const allResults = [...imageResults, ...pdfTexts];

    // Download as a .txt file.
    downloadTextFile(allResults.join(''));
  } catch (err) {
    console.error('Something went wrong with OCR:', err);
  }
});

// Extract text from a PDF file using pdf.js.
async function extractTextFromPDF(file) {
  const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    text += `Page ${i}:\n${pageText}\n\n`;
  }

  return text;
}

// Process images in batches using Tesseract.js.
async function processImagesBatches(images, batchSize = 2) {
  const results = [];
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const batchResults = await processBatch(batch, Math.floor(i / batchSize), i);
    results.push(...batchResults);
  }
  
  return results;
}

async function processBatch(batch, batchIndex, globalStartIndex) {
  const batchPromises = batch.map((imageData, index) =>
    Tesseract.recognize(imageData, 'eng', {
      logger: (m) => console.log(`Batch ${batchIndex + 1}, Image ${index + 1}:`, m),
    })
    .then(({ data: { text } }) => ({
      index: globalStartIndex + index,
      text: `Image ${globalStartIndex + index + 1} Text:\n${text}\n\n`
    }))
    .catch(err => ({
      index: globalStartIndex + index,
      text: `Error processing image ${globalStartIndex + index + 1}: ${err}\n`
    }))
  );

  const batchResults = await Promise.all(batchPromises);
  batchResults.sort((a, b) => a.index - b.index);
  return batchResults.map(r => r.text);
}

// Download the combined text as a .txt file.
function downloadTextFile(text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'captext.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
