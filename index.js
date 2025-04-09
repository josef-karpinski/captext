const gallery = document.getElementById('gallery');
const generateTextButton = document.getElementById('generate-text-button');
let pastedImages = [];

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

// Run Tesseract on all pasted images and download results
generateTextButton.addEventListener('click', async () => {
  if (!pastedImages.length) {
    alert('No images pasted yet!');
    return;
  }
  
  try {
    const ocrPromises = pastedImages.map((imageData, index) => {
      return Tesseract.recognize(imageData, 'eng', {
        logger: (m) => console.log(`Image ${index+1}:`, m)  // Track OCR progress
      })
      .then(({ data: { text } }) => `Image ${index + 1} Text:\n${text}\n\n`)
      .catch(err => `Error processing image ${index + 1}: ${err}\n`);
    });
    
    // Wait for all OCR promises to resolve
    const results = await Promise.all(ocrPromises);
    
    // Combine and download as a .txt file
    downloadTextFile(results.join(''));
  } catch (err) {
    console.error('Something went wrong with OCR:', err);
  }
});

function downloadTextFile(text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'captext.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}