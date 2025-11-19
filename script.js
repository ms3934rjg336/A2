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

    // Save canvas drawing
    const canvasData = drawingCanvas.toDataURL();

    // Save sticky notes
    const stickyNotes = Array.from(container.querySelectorAll('.sticky-note')).map(note => {
        return {
            left: note.style.left,
            top: note.style.top,
            transform: note.style.transform,
            text: note.querySelector('textarea').value
        };
    });

    annotationsData[currentSlide] = {
        canvas: canvasData,
        stickyNotes: stickyNotes
    };
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
