const gallery = document.getElementById('gallery');
const generateTextButton = document.getElementById('generate-text-button');
const fileInput = document.getElementById('file-input'); // Add a file input element in your HTML
let pastedImages = [];
let pdfTexts = [];

// Handle paste events to capture images from clipboard
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items || [];
  
  for (const item of items) {
    // Ensure it's actually an image
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (!file) continue;
      
      // Convert to base64 so Tesseract can read it
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        gallery.appendChild(img);
        
        // Store the base64 data in an array for later OCR
        pastedImages.push(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  }
});

// Handle file input for PDFs
fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  for (const file of files) {
    if (file.type === 'application/pdf') {
      try {
        const pdfText = await extractTextFromPDF(file);
        pdfTexts.push(pdfText);
      } catch (err) {
        console.error('Error processing PDF:', err);
      }
    } else {
      alert('Only PDF files are supported for this option.');
    }
  }
});

// Run Tesseract on all pasted images and download results
generateTextButton.addEventListener('click', async () => {
  if (!pastedImages.length && !pdfTexts.length) {
    alert('No images or PDFs processed yet!');
    return;
  }
  
  try {
    // Process images
    const imageResults = await processImagesBatches(pastedImages, 10);
    
    // Combine image and PDF results
    const allResults = [...imageResults, ...pdfTexts];
    
    // Combine and download as a .txt file
    downloadTextFile(allResults.join(''));
  } catch (err) {
    console.error('Something went wrong with OCR:', err);
  }
});

// Function to extract text from a PDF file
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

// not used
async function processImagesSequentially(images) {
  const results = [];
  for (let i = 0; i < images.length; i++) {
    try {
      const result = await Tesseract.recognize(images[i], 'eng', {
        logger: (m) => console.log(`Image ${i + 1}:`, m)
      });
      results.push(`Image ${i + 1} Text:\n${result.data.text}\n\n`);
    } catch (err) {
      results.push(`Error processing image ${i + 1}: ${err}\n`);
    }
  }
  return results;
}

async function processImagesBatches(images, batchSize = 2) {
  const results = [];
  let imageCounter = 1;

  const processBatch = async (batch, batchIndex, globalStartIndex) => {
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
    // Sort and insert based on original index
    batchResults.sort((a, b) => a.index - b.index).forEach(r => results[r.index] = r.text);
  };

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    await processBatch(batch, Math.floor(i / batchSize), i);
  }

  return results;
}

function downloadTextFile(text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'captext.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}