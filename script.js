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

function submitToCommunity() {
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

    // Get proposal details
    const title = document.getElementById('proposal-title').value.trim();
    const budget = parseInt(document.getElementById('proposal-budget').value);
    const description = document.getElementById('proposal-description').value.trim();

    // Validate required fields
    if (!title) {
        alert('Please enter a proposal title.');
        document.getElementById('proposal-title').focus();
        return;
    }

    if (!budget || budget <= 0) {
        alert('Please enter a valid budget amount.');
        document.getElementById('proposal-budget').focus();
        return;
    }

    if (!description) {
        alert('Please enter a description for your proposal.');
        document.getElementById('proposal-description').focus();
        return;
    }

    // Get reference photos
    const photoInput = document.getElementById('reference-photos');
    const referencePhotos = [];
    if (photoInput.files.length > 0) {
        // In a real app, we'd upload these to a server
        // For now, we'll just store the file names
        for (let i = 0; i < Math.min(photoInput.files.length, 5); i++) {
            referencePhotos.push(photoInput.files[i].name);
        }
    }

    const confirmMsg = `Submit your proposal to the community?\n\nTitle: ${title}\nBudget: $${budget.toLocaleString()}\nAnnotated Slides: ${annotatedSlides.length}\n\nYour proposal will be visible to all community members who can vote and contribute!`;

    if (confirm(confirmMsg)) {
        // Save to localStorage as community proposal
        const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');

        const newProposal = {
            id: Date.now(),
            timestamp: Date.now(),
            date: new Date().toLocaleString(),
            title: title,
            budget: budget,
            description: description,
            annotations: JSON.parse(JSON.stringify(annotationsData)), // Deep copy
            referencePhotos: referencePhotos,
            votes: {
                build: 0,
                demolish: 0
            },
            funding: {
                raised: 0,
                backers: 0
            }
        };

        proposals.push(newProposal);
        localStorage.setItem('communityProposals', JSON.stringify(proposals));

        // Show success message
        alert('Success! Your proposal has been submitted to the community.\n\nCommunity members can now view, vote, and contribute to your project!');

        // Clear form and go back to home
        document.getElementById('proposal-title').value = '';
        document.getElementById('proposal-budget').value = '';
        document.getElementById('proposal-description').value = '';
        document.getElementById('reference-photos').value = '';
        document.getElementById('photo-preview').innerHTML = '';

        closeSubmissionPage();
        closeSlideshow();

        // Go back to homepage properly
        document.getElementById('slideshow3').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('slideshow3').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');

        document.querySelectorAll('.clickable-point').forEach(point => {
            point.style.display = 'none';
            point.classList.remove('animation-active');
        });
        document.getElementById('cursor-demo').classList.remove('active');

        document.querySelector('main').classList.remove('hidden');
        document.querySelector('header').classList.remove('hidden');
        hideBackToMenuButton();

        // Reload proposals on landing page
        loadProposals();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ===== COMMUNITY PROPOSALS FUNCTIONALITY =====

// Load and display proposals on landing page
function loadProposals() {
    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    const proposalsList = document.getElementById('proposals-list');

    if (!proposalsList) return;

    if (proposals.length === 0) {
        proposalsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; font-family: Verdana, Arial, sans-serif;">
                <p style="font-size: 1.1rem; margin-bottom: 10px;">No proposals yet!</p>
                <p style="font-size: 0.9rem;">Be the first to submit a community proposal.</p>
            </div>
        `;
        return;
    }

    // Sort by net votes (Build - Demolish) and show top 3
    const topProposals = proposals.sort((a, b) => {
        const aNetVotes = a.votes.build - a.votes.demolish;
        const bNetVotes = b.votes.build - b.votes.demolish;
        return bNetVotes - aNetVotes;
    }).slice(0, 3);

    proposalsList.innerHTML = topProposals.map(proposal => createProposalCard(proposal)).join('');

    // Add event listeners for voting and funding
    attachProposalEventListeners();
}

// Create HTML for a proposal card
function createProposalCard(proposal) {
    const fundingPercent = Math.min((proposal.funding.raised / proposal.budget) * 100, 100);
    const netVotes = proposal.votes.build - proposal.votes.demolish;

    return `
        <div class="proposal-card" data-proposal-id="${proposal.id}">
            <div class="proposal-header">
                <div>
                    <h3 class="proposal-title">${proposal.title}</h3>
                    <div class="proposal-meta">Submitted ${proposal.date} • ${Object.keys(proposal.annotations).length} annotated slides</div>
                </div>
                <div class="proposal-budget">
                    <div class="budget-label">Project Budget</div>
                    <div class="budget-amount">$${proposal.budget.toLocaleString()}</div>
                </div>
            </div>

            <div class="proposal-description">${proposal.description}</div>

            <div class="funding-section">
                <strong style="font-size: 0.9rem; color: #333;">Community Funding</strong>
                <div class="funding-progress-bar">
                    <div class="funding-progress-fill" style="width: ${fundingPercent}%"></div>
                </div>
                <div class="funding-stats">
                    <span class="funding-raised">$${proposal.funding.raised.toLocaleString()} raised of $${proposal.budget.toLocaleString()}</span>
                    <span class="funding-backers">${proposal.funding.backers} ${proposal.funding.backers === 1 ? 'backer' : 'backers'}</span>
                </div>
                <button class="contribute-btn" data-proposal-id="${proposal.id}">💰 Contribute to this Project</button>
            </div>

            <div class="voting-section">
                <div class="vote-group">
                    <button class="vote-btn vote-build" data-proposal-id="${proposal.id}" data-vote-type="build">
                        👍 BUILD
                    </button>
                    <span class="vote-count">${proposal.votes.build}</span>
                    <span class="vote-label">Votes</span>
                </div>
                <div style="font-size: 1.5rem; font-weight: bold; color: ${netVotes >= 0 ? '#66BB66' : '#CC3333'}; padding: 0 15px;">
                    ${netVotes >= 0 ? '+' : ''}${netVotes}
                </div>
                <div class="vote-group">
                    <button class="vote-btn vote-demolish" data-proposal-id="${proposal.id}" data-vote-type="demolish">
                        👎 DEMOLISH
                    </button>
                    <span class="vote-count">${proposal.votes.demolish}</span>
                    <span class="vote-label">Votes</span>
                </div>
            </div>
        </div>
    `;
}

// Attach event listeners to proposal cards
function attachProposalEventListeners() {
    // Vote buttons
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', handleVote);
    });

    // Contribute buttons
    document.querySelectorAll('.contribute-btn').forEach(btn => {
        btn.addEventListener('click', handleContribution);
    });
}

// Handle voting
function handleVote(e) {
    // Check if user is signed in
    if (!checkSignIn()) {
        showSignInModal();
        return;
    }

    const proposalId = parseInt(e.currentTarget.getAttribute('data-proposal-id'));
    const voteType = e.currentTarget.getAttribute('data-vote-type');

    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    const proposalIndex = proposals.findIndex(p => p.id === proposalId);

    if (proposalIndex === -1) return;

    // Increment vote
    proposals[proposalIndex].votes[voteType]++;

    // Save back to localStorage
    localStorage.setItem('communityProposals', JSON.stringify(proposals));

    // Reload proposals
    loadProposals();
    // Also reload if on browse page
    const browsePage = document.getElementById('browse-proposals-page');
    if (browsePage && browsePage.classList.contains('active')) {
        loadAllProposals();
    }

    // Show feedback
    const voteLabel = voteType === 'build' ? 'BUILD 👍' : 'DEMOLISH 👎';
    alert(`Your vote for "${voteLabel}" has been recorded!\n\nProposal: ${proposals[proposalIndex].title}`);
}

// Handle contributions
function handleContribution(e) {
    const proposalId = parseInt(e.currentTarget.getAttribute('data-proposal-id'));

    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    const proposalIndex = proposals.findIndex(p => p.id === proposalId);

    if (proposalIndex === -1) return;

    const proposal = proposals[proposalIndex];
    const remaining = proposal.budget - proposal.funding.raised;

    // Prompt for contribution amount
    const amountStr = prompt(`Contribute to: ${proposal.title}\n\nBudget: $${proposal.budget.toLocaleString()}\nRaised: $${proposal.funding.raised.toLocaleString()}\nRemaining: $${remaining.toLocaleString()}\n\nHow much would you like to contribute?`, '100');

    if (amountStr === null) return; // User cancelled

    const amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid contribution amount.');
        return;
    }

    // Add contribution
    proposals[proposalIndex].funding.raised += amount;
    proposals[proposalIndex].funding.backers++;

    // Save back to localStorage
    localStorage.setItem('communityProposals', JSON.stringify(proposals));

    // Reload proposals
    loadProposals();

    // Show success message
    const newTotal = proposals[proposalIndex].funding.raised;
    const percentFunded = Math.min((newTotal / proposal.budget) * 100, 100).toFixed(1);

    alert(`Thank you for your contribution of $${amount.toLocaleString()}!\n\nProject: ${proposal.title}\nTotal Raised: $${newTotal.toLocaleString()} (${percentFunded}% funded)`);
}

// Load proposals when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadProposals();
});

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
document.getElementById('submit-to-community').addEventListener('click', submitToCommunity);

// Event listener for back to menu button
document.getElementById('back-to-menu').addEventListener('click', goBackToMenu);

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

// Board Info page functions
function openBoardPage() {
    const boardPage = document.getElementById('board-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.add('page-hidden');
    header.classList.add('page-hidden');
    boardPage.classList.add('active');
}

function closeBoardPage() {
    const boardPage = document.getElementById('board-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.remove('page-hidden');
    header.classList.remove('page-hidden');
    boardPage.classList.remove('active');
}

// Events page functions
function openEventsPage() {
    const eventsPage = document.getElementById('events-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.add('page-hidden');
    header.classList.add('page-hidden');
    eventsPage.classList.add('active');
}

function closeEventsPage() {
    const eventsPage = document.getElementById('events-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.remove('page-hidden');
    header.classList.remove('page-hidden');
    eventsPage.classList.remove('active');
}

// Contact page functions
function openContactPage() {
    const contactPage = document.getElementById('contact-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.add('page-hidden');
    header.classList.add('page-hidden');
    contactPage.classList.add('active');
}

function closeContactPage() {
    const contactPage = document.getElementById('contact-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.remove('page-hidden');
    header.classList.remove('page-hidden');
    contactPage.classList.remove('active');
}

// Meeting Minutes page functions
function openMeetingsPage() {
    const meetingsPage = document.getElementById('meetings-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.add('page-hidden');
    header.classList.add('page-hidden');
    meetingsPage.classList.add('active');
}

function closeMeetingsPage() {
    const meetingsPage = document.getElementById('meetings-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.remove('page-hidden');
    header.classList.remove('page-hidden');
    meetingsPage.classList.remove('active');
}

// Resources page functions
function openResourcesPage() {
    const resourcesPage = document.getElementById('resources-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.add('page-hidden');
    header.classList.add('page-hidden');
    resourcesPage.classList.add('active');
}

function closeResourcesPage() {
    const resourcesPage = document.getElementById('resources-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.remove('page-hidden');
    header.classList.remove('page-hidden');
    resourcesPage.classList.remove('active');
}

// Event listeners for form pages
document.getElementById('close-mission').addEventListener('click', closeMissionPage);
document.getElementById('close-member').addEventListener('click', closeMemberPage);
document.getElementById('close-board').addEventListener('click', closeBoardPage);
document.getElementById('close-events').addEventListener('click', closeEventsPage);
document.getElementById('close-contact').addEventListener('click', closeContactPage);
document.getElementById('close-meetings').addEventListener('click', closeMeetingsPage);
document.getElementById('close-resources').addEventListener('click', closeResourcesPage);

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

// ===== NAVIGATION LINKS FUNCTIONALITY =====

// Community map link
document.getElementById('nav-community').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('menu-community').click();
});

// All proposals link
document.getElementById('nav-proposals').addEventListener('click', (e) => {
    e.preventDefault();
    // Scroll to proposals section
    const proposalsSection = document.querySelector('.recent-submissions');
    if (proposalsSection) {
        proposalsSection.scrollIntoView({ behavior: 'smooth' });
    }
});

// Create proposal link
document.getElementById('nav-create').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('menu-community').click();
});

// Landing page action buttons
document.getElementById('btn-create-proposal').addEventListener('click', () => {
    document.getElementById('menu-community').click();
});

document.getElementById('btn-browse-proposals').addEventListener('click', () => {
    // Scroll to proposals section
    const proposalsSection = document.querySelector('.recent-submissions');
    if (proposalsSection) {
        proposalsSection.scrollIntoView({ behavior: 'smooth' });
    }
});

document.getElementById('view-all-proposals').addEventListener('click', () => {
    // Could open a full proposals page in the future
    // For now, just reload to show all proposals
    loadProposals();
});

// Navigation sidebar links
document.getElementById('nav-home').addEventListener('click', (e) => {
    e.preventDefault();
    // Scroll to top of page (home)
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('nav-board').addEventListener('click', (e) => {
    e.preventDefault();
    openBoardPage();
});

document.getElementById('nav-events').addEventListener('click', (e) => {
    e.preventDefault();
    openEventsPage();
});

document.getElementById('nav-contact').addEventListener('click', (e) => {
    e.preventDefault();
    openContactPage();
});

document.getElementById('nav-meetings').addEventListener('click', (e) => {
    e.preventDefault();
    openMeetingsPage();
});

document.getElementById('nav-resources').addEventListener('click', (e) => {
    e.preventDefault();
    openResourcesPage();
});

// Header button links
document.getElementById('mission-button').addEventListener('click', () => {
    openMissionPage();
});

document.getElementById('member-button').addEventListener('click', () => {
    openMemberPage();
});

// ===== SIGN IN FUNCTIONALITY =====

// Track if user is signed in
let userSignedIn = false;

// Demo credentials
const DEMO_USER = {
    username: 'user@halletts.org',
    password: 'password'
};

function showSignInModal() {
    const modal = document.getElementById('signin-modal');
    modal.classList.add('active');
    document.getElementById('signin-username').value = '';
    document.getElementById('signin-password').value = '';
    document.getElementById('signin-error').classList.remove('active');
    setTimeout(() => {
        document.getElementById('signin-username').focus();
    }, 100);
}

function hideSignInModal() {
    const modal = document.getElementById('signin-modal');
    modal.classList.remove('active');
    document.getElementById('signin-error').classList.remove('active');
}

function checkSignIn() {
    return userSignedIn;
}

// Sign in form handler
document.getElementById('signin-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('signin-username').value.trim();
    const password = document.getElementById('signin-password').value;
    const errorDiv = document.getElementById('signin-error');

    if (username === DEMO_USER.username && password === DEMO_USER.password) {
        userSignedIn = true;
        hideSignInModal();
        alert('Welcome! You are now signed in.');
    } else {
        errorDiv.classList.add('active');
    }
});

document.getElementById('signin-cancel').addEventListener('click', hideSignInModal);

// Close modal when clicking outside
document.getElementById('signin-modal').addEventListener('click', (e) => {
    if (e.target.id === 'signin-modal') {
        hideSignInModal();
    }
});

// ===== BROWSE ALL PROPOSALS PAGE =====

function openBrowseProposalsPage() {
    const browsePage = document.getElementById('browse-proposals-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.add('page-hidden');
    header.classList.add('page-hidden');
    browsePage.classList.add('active');

    // Load all proposals
    loadAllProposals();
}

function closeBrowseProposalsPage() {
    const browsePage = document.getElementById('browse-proposals-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');

    main.classList.remove('page-hidden');
    header.classList.remove('page-hidden');
    browsePage.classList.remove('active');
}

function loadAllProposals() {
    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    const allProposalsList = document.getElementById('all-proposals-list');

    if (!allProposalsList) return;

    if (proposals.length === 0) {
        allProposalsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; font-family: Verdana, Arial, sans-serif;">
                <p style="font-size: 1.1rem; margin-bottom: 10px;">No proposals yet!</p>
                <p style="font-size: 0.9rem;">Be the first to submit a community proposal.</p>
            </div>
        `;
        return;
    }

    // Sort by net votes (Build - Demolish) descending
    const sortedProposals = proposals.sort((a, b) => {
        const aNetVotes = a.votes.build - a.votes.demolish;
        const bNetVotes = b.votes.build - b.votes.demolish;
        return bNetVotes - aNetVotes;
    });

    allProposalsList.innerHTML = sortedProposals.map(proposal => createProposalCard(proposal)).join('');

    // Add event listeners for voting and funding
    attachProposalEventListeners();
}

document.getElementById('close-browse-proposals').addEventListener('click', closeBrowseProposalsPage);
