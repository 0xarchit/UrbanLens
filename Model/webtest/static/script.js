const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const originalImage = document.getElementById('original-image');
const resultImage = document.getElementById('result-image');
const loadingSpinner = document.getElementById('loading-spinner');
const resetBtn = document.getElementById('reset-btn');
const stats = document.getElementById('stats');


dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

resetBtn.addEventListener('click', () => {
    previewSection.classList.add('hidden');
    resetBtn.classList.add('hidden');
    dropZone.classList.remove('hidden');
    fileInput.value = '';
    resultImage.classList.add('hidden');
    stats.textContent = '';
});

async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }

    
    dropZone.classList.add('hidden');
    previewSection.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
    
    
    const reader = new FileReader();
    reader.onload = (e) => originalImage.src = e.target.result;
    reader.readAsDataURL(file);

    
    const formData = new FormData();
    formData.append('file', file);

    
    loadingSpinner.classList.remove('hidden');
    resultImage.classList.add('hidden');

    try {
        const response = await fetch('/detect', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            
            resultImage.src = data.result_url + '?t=' + new Date().getTime(); 
            resultImage.onload = () => {
                loadingSpinner.classList.add('hidden');
                resultImage.classList.remove('hidden');
            };
            stats.textContent = `Detections: ${data.detections}`;
            stats.classList.remove('hidden');
        } else {
            console.error('Error:', data);
            alert('Error processing image');
            loadingSpinner.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        loadingSpinner.classList.add('hidden');
        alert('Failed to connect to server');
    }
}
