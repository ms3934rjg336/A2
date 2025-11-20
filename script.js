// Preload all images to prevent white flash
const img00 = new Image();
img00.src = 'site-walk-path/images/00.jpg';

const images = [];
for (let i = 1; i <= 21; i++) {
    const img = new Image();
    const imageNum = String(i).padStart(2, '0');
    img.src = `site-walk-path/images/${imageNum}.jpg`;
    images.push(img);
}
// Preload 21.5 and overlay PNG
const img21_5 = new Image();
img21_5.src = 'site-walk-path/images/21.5.jpg';
const overlayImg = new Image();
overlayImg.src = 'site-walk-path/images/22.png';

// Track when animation is active
let animationActive = true;

// Make points draggable
let draggedElement = null;
let offsetX, offsetY;

document.querySelectorAll('.clickable-point').forEach(point => {
    point.addEventListener('mousedown', function(e) {
        draggedElement = this;
        const rect = this.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        this.style.cursor = 'grabbing';
    });
});

document.addEventListener('mousemove', function(e) {
    if (draggedElement) {
        const x = ((e.clientX - offsetX) / window.innerWidth) * 100;
        const y = ((e.clientY - offsetY) / window.innerHeight) * 100;
        draggedElement.style.left = x + '%';
        draggedElement.style.top = y + '%';
    }
});

document.addEventListener('mouseup', function() {
    if (draggedElement) {
        draggedElement.style.cursor = 'pointer';
        // Log the final position
        console.log(`${draggedElement.id}: left: ${draggedElement.style.left}; top: ${draggedElement.style.top}`);
        draggedElement = null;
    }
});

// Add click handlers to all points
for (let i = 1; i <= 15; i++) {
    const point = document.getElementById(`point${i}`);
    point.addEventListener('click', function(e) {
        // Only trigger action if not dragging
        if (e.detail === 1) {
            if (i === 9) {
                openSlideshow();
            } else {
                alert(`Point ${i} clicked! Add your action here.`);
            }
        }
    });
}

// Handle video playback for all points with videos
const videoPoints = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

videoPoints.forEach(pointNum => {
    const point = document.getElementById(`point${pointNum}`);
    const video = point.querySelector('video');

    if (video) {
        let isExpanding = false;
        let expandTimeout = null;

        point.addEventListener('mouseenter', function() {
            if (animationActive) {
                isExpanding = true;
                // Wait for expansion animation to complete (0.6s) before playing video
                expandTimeout = setTimeout(() => {
                    if (isExpanding) {
                        video.play();
                    }
                }, 600);
            }
        });

        point.addEventListener('mouseleave', function() {
            isExpanding = false;
            if (expandTimeout) {
                clearTimeout(expandTimeout);
            }
            video.pause();
            video.currentTime = 0;
        });
    }
});

// Slideshow functionality for Point 9
let currentSlide = 0;
const totalSlides = 27; // Images from 236 to 262 (27 images total)
const startImageNum = 236;

// Annotation system - store annotations per slide
const annotationsData = {};
let currentTool = null;
let isDrawing = false;
let canvasContext = null;
let drawingCanvas = null;

function openSlideshow() {
    const slideshowPage = document.getElementById('slideshow-page');
    const slideshowImages = document.getElementById('slideshow-images');

    // Clear any existing images
    slideshowImages.innerHTML = '';

    // Load all images
    for (let i = 0; i < totalSlides; i++) {
        const img = document.createElement('img');
        const imageNum = startImageNum + i;
        img.src = `images/astoria_Documentation-${imageNum}.jpg`;
        img.alt = `Slide ${i + 1}`;
        slideshowImages.appendChild(img);
    }

    // Show the slideshow page
    slideshowPage.style.display = 'block';
    currentSlide = 0;
    updateSlidePosition();

    // Initialize canvas for drawing if not already created
    if (!drawingCanvas) {
        initializeCanvas();
        initializeAnnotationTools();
    }

    // Load annotations for first slide
    loadAnnotationsForSlide(0);
}

function closeSlideshow() {
    // Save current slide annotations before closing
    if (drawingCanvas) {
        saveAnnotationsForSlide();
    }
    document.getElementById('slideshow-page').style.display = 'none';
}

function updateSlidePosition() {
    const slideshowImages = document.getElementById('slideshow-images');
    const offset = -currentSlide * 100;
    slideshowImages.style.transform = `translateX(${offset}vw)`;
    document.getElementById('slide-counter').textContent = `${currentSlide + 1} / ${totalSlides}`;

    // Load new slide annotations
    if (drawingCanvas) {
        loadAnnotationsForSlide(currentSlide);
    }
}

function nextSlide() {
    if (currentSlide < totalSlides - 1) {
        saveAnnotationsForSlide(); // Save current slide before switching
        currentSlide++;
        updateSlidePosition();
    }
}

function prevSlide() {
    if (currentSlide > 0) {
        saveAnnotationsForSlide(); // Save current slide before switching
        currentSlide--;
        updateSlidePosition();
    }
}

// Event listeners for slideshow controls
document.getElementById('close-slideshow').addEventListener('click', closeSlideshow);
document.getElementById('next-slide').addEventListener('click', nextSlide);
document.getElementById('prev-slide').addEventListener('click', prevSlide);

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    const slideshowPage = document.getElementById('slideshow-page');
    if (slideshowPage.style.display === 'block') {
        if (e.key === 'ArrowRight') {
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            prevSlide();
        } else if (e.key === 'Escape') {
            closeSlideshow();
        }
    }
});

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.getElementById('slideshow-container').addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.getElementById('slideshow-container').addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        nextSlide();
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        prevSlide();
    }
}

// ===== ANNOTATION SYSTEM =====

function initializeCanvas() {
    const container = document.getElementById('slideshow-container');

    // Create canvas overlay
    drawingCanvas = document.createElement('canvas');
    drawingCanvas.className = 'canvas-overlay';
    drawingCanvas.width = window.innerWidth;
    drawingCanvas.height = window.innerHeight;
    canvasContext = drawingCanvas.getContext('2d');

    container.appendChild(drawingCanvas);

    // Canvas drawing event listeners
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseout', stopDrawing);

    // Touch support
    drawingCanvas.addEventListener('touchstart', handleTouchStart);
    drawingCanvas.addEventListener('touchmove', handleTouchMove);
    drawingCanvas.addEventListener('touchend', stopDrawing);
}

function initializeAnnotationTools() {
    const penTool = document.getElementById('pen-tool');
    const eraserTool = document.getElementById('eraser-tool');
    const stickyTool = document.getElementById('sticky-tool');
    const clearAllBtn = document.getElementById('clear-all');

    const penOptions = document.getElementById('pen-options');
    const eraserOptions = document.getElementById('eraser-options');

    // Tool button handlers
    penTool.addEventListener('click', () => {
        currentTool = 'pen';
        activateTool(penTool, penOptions);
        drawingCanvas.style.pointerEvents = 'auto';
    });

    eraserTool.addEventListener('click', () => {
        currentTool = 'eraser';
        activateTool(eraserTool, eraserOptions);
        drawingCanvas.style.pointerEvents = 'auto';
    });

    stickyTool.addEventListener('click', () => {
        currentTool = 'sticky';
        activateTool(stickyTool, null);
        drawingCanvas.style.pointerEvents = 'none';
        createStickyNote();
    });

    clearAllBtn.addEventListener('click', () => {
        clearAllAnnotations();
    });
}

function activateTool(toolButton, optionsPanel) {
    // Remove active class from all tools
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tool-options').forEach(opt => opt.style.display = 'none');

    // Activate selected tool
    toolButton.classList.add('active');
    if (optionsPanel) {
        optionsPanel.style.display = 'flex';
    }
}

function startDrawing(e) {
    if (currentTool !== 'pen' && currentTool !== 'eraser') return;

    isDrawing = true;
    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    canvasContext.beginPath();
    canvasContext.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    if (currentTool !== 'pen' && currentTool !== 'eraser') return;

    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'pen') {
        const color = document.getElementById('pen-color').value;
        const thickness = document.getElementById('pen-thickness').value;

        canvasContext.strokeStyle = color;
        canvasContext.lineWidth = thickness;
        canvasContext.lineCap = 'round';
        canvasContext.lineJoin = 'round';
    } else if (currentTool === 'eraser') {
        const thickness = document.getElementById('eraser-thickness').value;

        canvasContext.globalCompositeOperation = 'destination-out';
        canvasContext.lineWidth = thickness;
        canvasContext.lineCap = 'round';
        canvasContext.lineJoin = 'round';
    }

    canvasContext.lineTo(x, y);
    canvasContext.stroke();

    // Reset composite operation for pen
    if (currentTool === 'eraser') {
        canvasContext.globalCompositeOperation = 'source-over';
    }
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouchStart(e) {
    if (currentTool !== 'pen' && currentTool !== 'eraser') return;

    e.preventDefault();
    isDrawing = true;
    const rect = drawingCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    canvasContext.beginPath();
    canvasContext.moveTo(x, y);
}

function handleTouchMove(e) {
    if (!isDrawing) return;
    if (currentTool !== 'pen' && currentTool !== 'eraser') return;

    e.preventDefault();
    const rect = drawingCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (currentTool === 'pen') {
        const color = document.getElementById('pen-color').value;
        const thickness = document.getElementById('pen-thickness').value;

        canvasContext.strokeStyle = color;
        canvasContext.lineWidth = thickness;
        canvasContext.lineCap = 'round';
        canvasContext.lineJoin = 'round';
    } else if (currentTool === 'eraser') {
        const thickness = document.getElementById('eraser-thickness').value;

        canvasContext.globalCompositeOperation = 'destination-out';
        canvasContext.lineWidth = thickness;
        canvasContext.lineCap = 'round';
        canvasContext.lineJoin = 'round';
    }

    canvasContext.lineTo(x, y);
    canvasContext.stroke();

    if (currentTool === 'eraser') {
        canvasContext.globalCompositeOperation = 'source-over';
    }
}

function createStickyNote() {
    const container = document.getElementById('slideshow-container');

    const stickyNote = document.createElement('div');
    stickyNote.className = 'sticky-note';
    stickyNote.style.left = '50%';
    stickyNote.style.top = '50%';
    stickyNote.style.transform = 'translate(-50%, -50%)';

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Type your note...';
    textarea.addEventListener('mousedown', (e) => e.stopPropagation());
    textarea.addEventListener('touchstart', (e) => e.stopPropagation());

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-sticky';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
        stickyNote.remove();
    });

    stickyNote.appendChild(textarea);
    stickyNote.appendChild(deleteBtn);
    container.appendChild(stickyNote);

    // Make sticky note draggable
    makeDraggable(stickyNote);

    // Focus on textarea
    textarea.focus();
}

function makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    element.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    element.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        // Don't drag if clicking on textarea or delete button
        if (e.target.tagName === 'TEXTAREA' || e.target.classList.contains('delete-sticky')) {
            return;
        }

        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - element.offsetLeft;
            initialY = e.touches[0].clientY - element.offsetTop;
        } else {
            initialX = e.clientX - element.offsetLeft;
            initialY = e.clientY - element.offsetTop;
        }

        isDragging = true;
        element.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return;

        e.preventDefault();

        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }

        element.style.left = currentX + 'px';
        element.style.top = currentY + 'px';
        element.style.transform = 'none';
    }

    function dragEnd() {
        isDragging = false;
        element.style.cursor = 'grab';
    }
}

function saveAnnotationsForSlide() {
    const container = document.getElementById('slideshow-container');

    // Check if canvas has any drawings (not just blank)
    const imageData = canvasContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
    const hasDrawing = imageData.data.some((channel, index) => {
        // Check alpha channel (every 4th value starting at index 3)
        if (index % 4 === 3 && channel !== 0) {
            return true;
        }
        return false;
    });

    // Save canvas drawing only if it has actual content
    const canvasData = hasDrawing ? drawingCanvas.toDataURL() : null;

    // Save sticky notes
    const stickyNotes = Array.from(container.querySelectorAll('.sticky-note')).map(note => {
        return {
            left: note.style.left,
            top: note.style.top,
            transform: note.style.transform,
            text: note.querySelector('textarea').value
        };
    });

    // Only save if there's actual content
    if (canvasData || stickyNotes.length > 0) {
        annotationsData[currentSlide] = {
            canvas: canvasData,
            stickyNotes: stickyNotes,
            comment: annotationsData[currentSlide]?.comment || '' // Preserve existing comment
        };
    } else {
        // Remove entry if no annotations
        delete annotationsData[currentSlide];
    }
}

function loadAnnotationsForSlide(slideIndex) {
    const container = document.getElementById('slideshow-container');

    // Clear current canvas and sticky notes
    canvasContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    container.querySelectorAll('.sticky-note').forEach(note => note.remove());

    // Load saved annotations if they exist
    if (annotationsData[slideIndex]) {
        const data = annotationsData[slideIndex];

        // Load canvas drawing
        if (data.canvas) {
            const img = new Image();
            img.onload = () => {
                canvasContext.drawImage(img, 0, 0);
            };
            img.src = data.canvas;
        }

        // Load sticky notes
        if (data.stickyNotes) {
            data.stickyNotes.forEach(noteData => {
                const stickyNote = document.createElement('div');
                stickyNote.className = 'sticky-note';
                stickyNote.style.left = noteData.left;
                stickyNote.style.top = noteData.top;
                stickyNote.style.transform = noteData.transform;

                const textarea = document.createElement('textarea');
                textarea.value = noteData.text;
                textarea.placeholder = 'Type your note...';
                textarea.addEventListener('mousedown', (e) => e.stopPropagation());
                textarea.addEventListener('touchstart', (e) => e.stopPropagation());

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-sticky';
                deleteBtn.textContent = '×';
                deleteBtn.addEventListener('click', () => {
                    stickyNote.remove();
                });

                stickyNote.appendChild(textarea);
                stickyNote.appendChild(deleteBtn);
                container.appendChild(stickyNote);

                makeDraggable(stickyNote);
            });
        }
    }
}

function clearAllAnnotations() {
    // Clear canvas
    canvasContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Remove all sticky notes
    const container = document.getElementById('slideshow-container');
    container.querySelectorAll('.sticky-note').forEach(note => note.remove());

    // Clear from storage
    annotationsData[currentSlide] = {
        canvas: null,
        stickyNotes: []
    };
}

// ===== SUBMISSION PAGE FUNCTIONALITY =====

function openSubmissionPage() {
    // Save current slide before opening submission page
    if (drawingCanvas) {
        saveAnnotationsForSlide();
    }

    const submissionPage = document.getElementById('submission-page');
    const slideshowPage = document.getElementById('slideshow-page');

    // Hide slideshow, show submission
    slideshowPage.style.display = 'none';
    submissionPage.style.display = 'block';

    // Generate submission preview
    generateSubmissionPreview();
}

function closeSubmissionPage() {
    const submissionPage = document.getElementById('submission-page');
    const slideshowPage = document.getElementById('slideshow-page');

    // Hide submission, show slideshow
    submissionPage.style.display = 'none';
    slideshowPage.style.display = 'block';
}

function generateSubmissionPreview() {
    const grid = document.getElementById('annotated-slides-grid');
    grid.innerHTML = '';

    // Get all slides that have annotations
    const annotatedSlides = Object.keys(annotationsData).filter(slideIndex => {
        const data = annotationsData[slideIndex];
        return data && (data.canvas || (data.stickyNotes && data.stickyNotes.length > 0));
    });

    if (annotatedSlides.length === 0) {
        // Show empty state
        grid.innerHTML = `
            <div class="empty-state">
                <h2>No Annotations Yet</h2>
                <p>Go back and add drawings or sticky notes to your slides</p>
            </div>
        `;
        return;
    }

    // Sort slides by index
    annotatedSlides.sort((a, b) => parseInt(a) - parseInt(b));

    // Create card for each annotated slide
    annotatedSlides.forEach(slideIndex => {
        const data = annotationsData[slideIndex];
        const slideNum = parseInt(slideIndex) + 1;
        const imageNum = startImageNum + parseInt(slideIndex);

        // Count annotations
        const hasDrawing = data.canvas !== null && data.canvas !== undefined;
        const noteCount = data.stickyNotes ? data.stickyNotes.length : 0;

        // Create card
        const card = document.createElement('div');
        card.className = 'submission-slide-card';
        card.innerHTML = `
            <div style="position: relative;">
                <img src="images/astoria_Documentation-${imageNum}.jpg" class="submission-slide-image" alt="Slide ${slideNum}">
                <canvas class="submission-canvas-overlay" width="${window.innerWidth}" height="${window.innerHeight}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></canvas>
            </div>
            <div class="submission-slide-info">
                <div class="submission-slide-title">Slide ${slideNum} of ${totalSlides}</div>
                <div class="submission-slide-meta">
                    ${hasDrawing ? '<span class="submission-badge badge-drawing">✏️ Drawings</span>' : ''}
                    ${noteCount > 0 ? `<span class="submission-badge badge-notes">📝 ${noteCount} Note${noteCount > 1 ? 's' : ''}</span>` : ''}
                </div>
                <div class="slide-comment-section">
                    <div class="slide-comment-label">Comments for Developer:</div>
                    <textarea class="slide-comment-textarea" data-slide-index="${slideIndex}" placeholder="Add any comments or notes for the developer about this slide...">${data.comment || ''}</textarea>
                </div>
            </div>
        `;

        grid.appendChild(card);

        // Add event listener to save comments
        const textarea = card.querySelector('.slide-comment-textarea');
        textarea.addEventListener('input', (e) => {
            const index = e.target.getAttribute('data-slide-index');
            if (annotationsData[index]) {
                annotationsData[index].comment = e.target.value;
            }
        });

        // Draw annotations on the preview canvas
        if (hasDrawing) {
            const canvas = card.querySelector('.submission-canvas-overlay');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = data.canvas;
        }
    });
}

function downloadSubmission() {
    // Save current slide first
    if (drawingCanvas) {
        saveAnnotationsForSlide();
    }

    // Get all annotated slides
    const annotatedSlides = Object.keys(annotationsData).filter(slideIndex => {
        const data = annotationsData[slideIndex];
        return data && (data.canvas || (data.stickyNotes && data.stickyNotes.length > 0));
    });

    if (annotatedSlides.length === 0) {
        alert('No annotations to download. Please add some drawings or notes first.');
        return;
    }

    // Create a summary of all annotations
    let summary = 'HALLETTS POINT COMMUNITY SUBMISSION\n';
    summary += '=' .repeat(50) + '\n\n';
    summary += `Total Annotated Slides: ${annotatedSlides.length}\n`;
    summary += `Submission Date: ${new Date().toLocaleString()}\n\n`;
    summary += '=' .repeat(50) + '\n\n';

    annotatedSlides.sort((a, b) => parseInt(a) - parseInt(b));

    annotatedSlides.forEach(slideIndex => {
        const data = annotationsData[slideIndex];
        const slideNum = parseInt(slideIndex) + 1;
        const imageNum = startImageNum + parseInt(slideIndex);

        summary += `SLIDE ${slideNum} (Image: astoria_Documentation-${imageNum}.jpg)\n`;
        summary += '-'.repeat(50) + '\n';

        if (data.canvas) {
            summary += '✏️ Contains drawings\n';
        }

        if (data.stickyNotes && data.stickyNotes.length > 0) {
            summary += `📝 ${data.stickyNotes.length} Sticky Note(s):\n`;
            data.stickyNotes.forEach((note, idx) => {
                summary += `  ${idx + 1}. ${note.text || '(empty note)'}\n`;
            });
        }

        if (data.comment && data.comment.trim()) {
            summary += `💬 Developer Comment:\n  ${data.comment.trim()}\n`;
        }

        summary += '\n';
    });

    // Create download link
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halletts-point-submission-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Submission summary downloaded!\n\n${annotatedSlides.length} annotated slide(s) included.`);
}

function submitToDeveloper() {
    // Save current slide first
    if (drawingCanvas) {
        saveAnnotationsForSlide();
    }

    // Get all annotated slides
    const annotatedSlides = Object.keys(annotationsData).filter(slideIndex => {
        const data = annotationsData[slideIndex];
        return data && (data.canvas || (data.stickyNotes && data.stickyNotes.length > 0));
    });

    if (annotatedSlides.length === 0) {
        alert('No annotations to submit. Please add some drawings or notes first.');
        return;
    }

    // In a real application, this would send data to a server
    // For now, we'll show a confirmation message
    const confirmMsg = `You are about to submit ${annotatedSlides.length} annotated slide(s) to the developer.\n\nThis submission includes:\n`;

    let drawingCount = 0;
    let noteCount = 0;
    let commentCount = 0;

    annotatedSlides.forEach(slideIndex => {
        const data = annotationsData[slideIndex];
        if (data.canvas) drawingCount++;
        if (data.stickyNotes) noteCount += data.stickyNotes.length;
        if (data.comment && data.comment.trim()) commentCount++;
    });

    const fullMsg = confirmMsg + `- ${drawingCount} slide(s) with drawings\n- ${noteCount} sticky note(s)\n- ${commentCount} developer comment(s)\n\nDo you want to proceed?`;

    if (confirm(fullMsg)) {
        // Save to localStorage for developer portal
        const submissions = JSON.parse(localStorage.getItem('developerSubmissions') || '[]');

        const newSubmission = {
            timestamp: Date.now(),
            date: new Date().toLocaleString(),
            annotations: JSON.parse(JSON.stringify(annotationsData)) // Deep copy
        };

        submissions.push(newSubmission);
        localStorage.setItem('developerSubmissions', JSON.stringify(submissions));

        // Show success message
        alert('Thank you! Your feedback has been submitted to the developer.\n\nThe Halletts Point Community Planning team will review your suggestions.');

        // Optionally, download a copy for the user
        downloadSubmission();
    }
}

// ===== DEVELOPER PORTAL FUNCTIONALITY =====

// Developer credentials
const DEVELOPER_CREDENTIALS = {
    username: 'rjg336@cornell.edu',
    password: 'password'
};

function openDeveloperPortal() {
    // Show login modal
    const loginModal = document.getElementById('login-modal');
    loginModal.classList.add('active');

    // Clear previous inputs
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.remove('active');

    // Focus on username field
    setTimeout(() => {
        document.getElementById('login-username').focus();
    }, 100);
}

function authenticateAndOpenPortal() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    // Validate credentials
    if (username === DEVELOPER_CREDENTIALS.username && password === DEVELOPER_CREDENTIALS.password) {
        // Hide login modal
        const loginModal = document.getElementById('login-modal');
        loginModal.classList.remove('active');

        // Show developer portal
        const developerPage = document.getElementById('developer-page');
        const main = document.querySelector('main');
        const header = document.querySelector('header');

        main.style.display = 'none';
        header.style.display = 'none';
        developerPage.style.display = 'block';

        // Load submissions
        loadDeveloperSubmissions();
    } else {
        // Show error message
        errorDiv.classList.add('active');

        // Shake animation for error
        const loginBox = document.querySelector('.login-box');
        loginBox.style.animation = 'shake 0.5s';
        setTimeout(() => {
            loginBox.style.animation = '';
        }, 500);
    }
}

function cancelLogin() {
    const loginModal = document.getElementById('login-modal');
    loginModal.classList.remove('active');
    document.getElementById('login-error').classList.remove('active');
}

function closeDeveloperPortal() {
    const developerPage = document.getElementById('developer-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    // Show main content
    main.style.display = 'block';
    header.style.display = 'block';
    developerPage.style.display = 'none';
}

function loadDeveloperSubmissions() {
    const submissions = JSON.parse(localStorage.getItem('developerSubmissions') || '[]');
    const submissionsList = document.getElementById('submissions-list');

    // Calculate stats
    let totalSlides = 0;
    let totalComments = 0;

    submissions.forEach(submission => {
        const slideCount = Object.keys(submission.annotations).length;
        totalSlides += slideCount;

        Object.values(submission.annotations).forEach(data => {
            if (data.comment && data.comment.trim()) {
                totalComments++;
            }
        });
    });

    // Update stats
    document.getElementById('total-submissions').textContent = submissions.length;
    document.getElementById('total-slides').textContent = totalSlides;
    document.getElementById('total-comments').textContent = totalComments;

    // Clear existing content
    submissionsList.innerHTML = '';

    if (submissions.length === 0) {
        submissionsList.innerHTML = `
            <div class="empty-state">
                <h2>No Submissions Yet</h2>
                <p>Community submissions will appear here</p>
            </div>
        `;
        return;
    }

    // Display submissions (newest first)
    submissions.reverse().forEach((submission, index) => {
        const submissionItem = document.createElement('div');
        submissionItem.className = 'submission-item';

        const annotatedSlides = Object.keys(submission.annotations);

        submissionItem.innerHTML = `
            <div class="submission-item-header">
                <div class="submission-date">Submission ${submissions.length - index} - ${submission.date}</div>
                <div class="submission-count">${annotatedSlides.length} annotated slides</div>
            </div>
            <div class="submission-slides" id="submission-${submission.timestamp}"></div>
        `;

        submissionsList.appendChild(submissionItem);

        // Add slides to this submission
        const slidesContainer = document.getElementById(`submission-${submission.timestamp}`);

        annotatedSlides.sort((a, b) => parseInt(a) - parseInt(b)).forEach(slideIndex => {
            const data = submission.annotations[slideIndex];
            const slideNum = parseInt(slideIndex) + 1;
            const imageNum = startImageNum + parseInt(slideIndex);

            const slideCard = document.createElement('div');
            slideCard.className = 'submission-slide-card';

            const hasDrawing = data.canvas !== null && data.canvas !== undefined;
            const noteCount = data.stickyNotes ? data.stickyNotes.length : 0;

            // Get bidding data
            const slideKey = `${submission.timestamp}_${slideIndex}`;
            const allBids = data.bids || [];
            const lowestBid = allBids.length > 0 ? Math.min(...allBids.map(b => b.amount)) : null;

            slideCard.innerHTML = `
                <div style="position: relative;">
                    <img src="images/astoria_Documentation-${imageNum}.jpg" class="submission-slide-image" alt="Slide ${slideNum}">
                    <canvas class="submission-canvas-overlay" width="${window.innerWidth}" height="${window.innerHeight}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></canvas>
                </div>
                <div class="submission-slide-info">
                    <div class="submission-slide-title">Slide ${slideNum}</div>
                    <div class="submission-slide-meta">
                        ${hasDrawing ? '<span class="submission-badge badge-drawing">✏️ Drawings</span>' : ''}
                        ${noteCount > 0 ? `<span class="submission-badge badge-notes">📝 ${noteCount} Note${noteCount > 1 ? 's' : ''}</span>` : ''}
                    </div>
                    ${data.comment && data.comment.trim() ? `
                        <div class="slide-comment-section">
                            <div class="slide-comment-label">Developer Comment:</div>
                            <div style="padding: 10px; background: #f9f9f9; border-radius: 6px; font-size: 0.9rem; color: #333;">${data.comment}</div>
                        </div>
                    ` : ''}
                    ${noteCount > 0 ? `
                        <div class="slide-comment-section">
                            <div class="slide-comment-label">Sticky Notes:</div>
                            <ul style="margin: 10px 0; padding-left: 20px; font-size: 0.9rem;">
                                ${data.stickyNotes.map(note => `<li>${note.text || '(empty)'}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <div class="developer-actions">
                        <div class="bidding-section">
                            <div class="bid-input-wrapper">
                                <input type="number" class="bid-input" placeholder="Enter bid amount" min="0" step="100" data-slide-key="${slideKey}">
                            </div>
                            <button class="bid-btn" data-slide-key="${slideKey}">Place Bid</button>
                        </div>
                        <div class="bid-status-container" data-slide-key="${slideKey}"></div>
                    </div>
                    ${allBids.length > 0 ? `
                        <div class="all-bids-section">
                            <div class="all-bids-label">All Bids (${allBids.length})</div>
                            <div class="bid-list">
                                ${allBids.sort((a, b) => a.amount - b.amount).map(bid => `
                                    <div class="bid-item ${bid.amount === lowestBid ? 'lowest' : ''}">
                                        <span>Developer ${bid.developerId}</span>
                                        <span class="bid-item-amount">$${bid.amount.toLocaleString()}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            slidesContainer.appendChild(slideCard);

            // Add event listener to bid button
            const bidBtn = slideCard.querySelector('.bid-btn');
            const bidInput = slideCard.querySelector('.bid-input');

            bidBtn.addEventListener('click', () => {
                const amount = parseFloat(bidInput.value);
                if (!amount || amount <= 0) {
                    alert('Please enter a valid bid amount');
                    return;
                }
                handleBidSubmission(submission.timestamp, slideIndex, amount, slideCard);
            });

            // Draw annotations on canvas
            if (hasDrawing) {
                const canvas = slideCard.querySelector('.submission-canvas-overlay');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = data.canvas;
            }
        });
    });
}

// Handle bid submission
function handleBidSubmission(timestamp, slideIndex, amount, slideCard) {
    // Get submissions from localStorage
    const submissions = JSON.parse(localStorage.getItem('developerSubmissions') || '[]');

    // Find the submission
    const submissionIdx = submissions.findIndex(s => s.timestamp === timestamp);
    if (submissionIdx === -1) return;

    // Get or initialize bids array
    if (!submissions[submissionIdx].annotations[slideIndex]) return;
    if (!submissions[submissionIdx].annotations[slideIndex].bids) {
        submissions[submissionIdx].annotations[slideIndex].bids = [];
    }

    // Generate a developer ID (in real app, this would be from logged-in user)
    const developerId = `DEV${Math.floor(Math.random() * 9000) + 1000}`;

    // Add the bid
    const newBid = {
        developerId: developerId,
        amount: amount,
        timestamp: Date.now()
    };

    submissions[submissionIdx].annotations[slideIndex].bids.push(newBid);

    // Save back to localStorage
    localStorage.setItem('developerSubmissions', JSON.stringify(submissions));

    // Reload the submissions to update UI
    loadDeveloperSubmissions();

    // Show success message
    const allBids = submissions[submissionIdx].annotations[slideIndex].bids;
    const lowestBid = Math.min(...allBids.map(b => b.amount));

    if (amount === lowestBid) {
        alert(`Bid placed successfully!\n\nYour bid of $${amount.toLocaleString()} is currently the LOWEST BID. You are winning this project!`);
    } else {
        alert(`Bid placed successfully!\n\nYour bid: $${amount.toLocaleString()}\nLowest bid: $${lowestBid.toLocaleString()}\n\nYou need to bid lower to win this project.`);
    }
}

// ===== BACK TO MENU FUNCTIONALITY =====

function showBackToMenuButton() {
    document.getElementById('back-to-menu').classList.add('active');
}

function hideBackToMenuButton() {
    document.getElementById('back-to-menu').classList.remove('active');
}

function goBackToMenu() {
    // Hide aerial map elements
    document.getElementById('slideshow3').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.querySelectorAll('.clickable-point').forEach(point => {
        point.style.display = 'none';
        point.classList.remove('animation-active');
    });
    document.getElementById('cursor-demo').classList.remove('active');

    // Show main menu
    document.querySelector('main').classList.remove('hidden');
    document.querySelector('header').classList.remove('hidden');

    // Hide back button
    hideBackToMenuButton();
}

// Event listeners for submission page
document.getElementById('view-submission').addEventListener('click', openSubmissionPage);
document.getElementById('back-to-slideshow').addEventListener('click', closeSubmissionPage);
document.getElementById('download-submission').addEventListener('click', downloadSubmission);
document.getElementById('submit-to-developer').addEventListener('click', submitToDeveloper);

// Event listeners for developer portal
document.getElementById('close-developer').addEventListener('click', closeDeveloperPortal);

// Event listener for back to menu button
document.getElementById('back-to-menu').addEventListener('click', goBackToMenu);

// Event listeners for login modal
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    authenticateAndOpenPortal();
});

document.getElementById('login-cancel').addEventListener('click', cancelLogin);

// Close login modal when clicking outside
document.getElementById('login-modal').addEventListener('click', (e) => {
    if (e.target.id === 'login-modal') {
        cancelLogin();
    }
});

// ===== FORM PAGES FUNCTIONALITY =====

function openMissionPage() {
    const missionPage = document.getElementById('mission-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    // Hide main content using CSS classes
    main.classList.add('page-hidden');
    header.classList.add('page-hidden');
    missionPage.classList.add('active');
}

function closeMissionPage() {
    const missionPage = document.getElementById('mission-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    // Show main content using CSS classes
    main.classList.remove('page-hidden');
    header.classList.remove('page-hidden');
    missionPage.classList.remove('active');
}

function openMemberPage() {
    const memberPage = document.getElementById('member-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    // Hide main content using CSS classes
    main.classList.add('page-hidden');
    header.classList.add('page-hidden');
    memberPage.classList.add('active');
}

function closeMemberPage() {
    const memberPage = document.getElementById('member-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    // Show main content using CSS classes
    main.classList.remove('page-hidden');
    header.classList.remove('page-hidden');
    memberPage.classList.remove('active');
}

// Event listeners for form pages
document.getElementById('close-mission').addEventListener('click', closeMissionPage);
document.getElementById('close-member').addEventListener('click', closeMemberPage);

// Handle membership form submission
document.getElementById('membership-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // In a real application, this would send data to a server
    console.log('Membership application submitted:', data);

    alert('Thank you for your membership application!\n\nYour application has been received and will be reviewed by our team. We\'ll contact you at ' + data.email + ' within 3-5 business days.');

    // Reset form and close page
    e.target.reset();
    closeMemberPage();
});
