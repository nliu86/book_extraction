// Global variables
let selectedFile = null;

// DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const extractBtn = document.getElementById('extractBtn');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const extractedText = document.getElementById('extractedText');
const bookInfo = document.getElementById('bookInfo');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const progressUpdates = document.getElementById('progressUpdates');

// File input change handler
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
});

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    } else {
        showError('Invalid File', 'Please upload an image file (JPG, PNG, JPEG)');
    }
});

// Click on drop zone to open file dialog
dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.parentElement.classList.contains('drop-zone-content')) {
        fileInput.click();
    }
});

// Handle file selection
function handleFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Invalid File Type', 'Please upload an image file (JPG, PNG, JPEG)');
        return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('File Too Large', 'Please upload an image smaller than 10MB');
        return;
    }
    
    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewContainer.style.display = 'flex';
        document.querySelector('.drop-zone-content').style.display = 'none';
        extractBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

// Remove image
function removeImage() {
    selectedFile = null;
    previewImage.src = '';
    previewContainer.style.display = 'none';
    document.querySelector('.drop-zone-content').style.display = 'flex';
    extractBtn.disabled = true;
    fileInput.value = '';
}

// Extract text
extractBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    // Hide all sections except loading
    hideAllSections();
    loadingSection.style.display = 'block';
    extractBtn.disabled = true;
    
    // Clear previous progress updates
    progressUpdates.innerHTML = '';
    
    try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        // Use fetch with progress endpoint
        console.log('Starting SSE request to /api/extract-book-progress');
        const response = await fetch('/api/extract-book-progress', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response received:', response);
        console.log('Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('Stream ended');
                break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            console.log('Received chunk:', chunk);
            buffer += chunk;
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                console.log('Processing line:', line);
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        console.log('Parsed data:', data);
                        
                        if (data.type === 'progress') {
                            displayProgressUpdate(data);
                        } else if (data.type === 'result') {
                            if (data.success) {
                                showResults(data);
                            } else {
                                handleError(
                                    data.errorType === 'not_a_book' ? 400 :
                                    data.errorType === 'book_not_found' ? 404 :
                                    data.errorType === 'no_preview' ? 404 : 500,
                                    data.error
                                );
                            }
                            extractBtn.disabled = false;
                        } else if (data.type === 'error') {
                            showError('Processing Error', data.message);
                            extractBtn.disabled = false;
                        }
                    } catch (error) {
                        console.error('Error parsing SSE data:', error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Extraction error:', error);
        // Fallback to regular extraction
        fallbackToRegularExtraction();
    }
});

// Show results
function showResults(data) {
    hideAllSections();
    resultsSection.style.display = 'block';
    
    // Display book info
    bookInfo.innerHTML = `
        <p><strong>Title:</strong> ${data.title || 'Unknown'}</p>
        <p><strong>Author:</strong> ${data.author || 'Unknown'}</p>
        <p><strong>Book Type:</strong> ${data.bookType === 'fiction' ? 'Fiction' : 'Non-fiction'}</p>
        <p><strong>Page Extracted:</strong> ${data.bookType === 'fiction' ? '2nd page of content' : '1st page of content'}</p>
        <p><strong>Confidence:</strong> ${(data.confidence * 100).toFixed(0)}%</p>
    `;
    
    // Display extracted text
    extractedText.value = data.text || 'No text could be extracted from this book.';
}

// Handle errors
function handleError(status, errorMsg) {
    if (status === 400 && errorMsg.includes('not contain a book')) {
        showError('Not a Book Cover', 'The image does not appear to be a book cover. Please take a clear photo of a book cover and try again.');
    } else if (status === 404 && errorMsg.includes('not found')) {
        showError('Book Not Found', 'We couldn\'t find this book in our database. Please try with a different book.');
    } else if (status === 404 && errorMsg.includes('preview')) {
        showError('No Preview Available', 'Unfortunately, this book doesn\'t have preview pages available on Google Books.');
    } else {
        showError('Extraction Failed', errorMsg || 'An error occurred while processing your book. Please try again.');
    }
}

// Show error
function showError(title, message) {
    hideAllSections();
    errorSection.style.display = 'block';
    errorTitle.textContent = title;
    errorMessage.textContent = message;
}

// Hide all sections
function hideAllSections() {
    loadingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Reset upload
function resetUpload() {
    removeImage();
    hideAllSections();
}

// Copy text to clipboard
async function copyText() {
    try {
        await navigator.clipboard.writeText(extractedText.value);
        
        // Show feedback
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        copyBtn.style.backgroundColor = '#48bb78';
        copyBtn.style.color = 'white';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.backgroundColor = '';
            copyBtn.style.color = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text:', err);
        // Fallback for older browsers
        extractedText.select();
        document.execCommand('copy');
    }
}

// Display progress update
function displayProgressUpdate(update) {
    const progressDiv = document.createElement('div');
    progressDiv.className = 'progress-update';
    
    // Add stage-specific styling
    if (update.stage === 'error' || update.message.toLowerCase().includes('error') || update.message.toLowerCase().includes('failed')) {
        progressDiv.classList.add('error');
    } else if (update.stage === 'completed') {
        progressDiv.classList.add('success');
    } else if (update.message.toLowerCase().includes('trying') || update.message.toLowerCase().includes('attempt')) {
        progressDiv.classList.add('warning');
    }
    
    // Format timestamp
    const timestamp = new Date(update.timestamp).toLocaleTimeString();
    
    let content = `
        <span class="progress-update-time">${timestamp}</span>
        <span class="progress-update-message">${update.message}</span>
    `;
    
    // Add details if available
    if (update.details) {
        const detailsText = [];
        if (update.details.volumeNumber && update.details.totalVolumes) {
            detailsText.push(`Volume ${update.details.volumeNumber} of ${update.details.totalVolumes}`);
        }
        if (update.details.currentPage) {
            detailsText.push(`Page ${update.details.currentPage}`);
        }
        if (update.details.confidence !== undefined) {
            detailsText.push(`Confidence: ${(update.details.confidence * 100).toFixed(0)}%`);
        }
        
        if (detailsText.length > 0) {
            content += `<div class="progress-update-details">${detailsText.join(' • ')}</div>`;
        }
    }
    
    progressDiv.innerHTML = content;
    progressUpdates.appendChild(progressDiv);
    
    // Auto-scroll to latest update
    progressUpdates.scrollTop = progressUpdates.scrollHeight;
}

// Fallback to regular extraction if SSE fails
async function fallbackToRegularExtraction() {
    try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        const response = await fetch('/api/extract-book', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showResults(data);
        } else {
            handleError(response.status, data.error);
        }
    } catch (error) {
        console.error('Network error:', error);
        showError('Network Error', 'Failed to connect to the server. Please check your connection and try again.');
    } finally {
        extractBtn.disabled = false;
    }
}