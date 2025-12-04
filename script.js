// ===== POINT IMAGE RANGE CONFIGURATION =====
const pointImageRanges = {
    point1: { startImageNum: 8, totalSlides: 20 },    // Images 8-27
    point2: { startImageNum: 180, totalSlides: 42 },  // Images 180-221
    point3: { startImageNum: 90, totalSlides: 26 },   // Images 90-115
    point4: { startImageNum: 62, totalSlides: 28 },   // Images 62-89
    point5: { startImageNum: 54, totalSlides: 8 },    // Images 54-61
    point6: { startImageNum: 116, totalSlides: 32 },  // Images 116-147
    point7: { startImageNum: 148, totalSlides: 32 },  // Images 148-179
    point8: { startImageNum: 300, totalSlides: 7 },   // Images 300-306
    point9: { startImageNum: 222, totalSlides: 14 },  // Images 222-235
    point10: { startImageNum: 263, totalSlides: 25 }, // Images 263-287
    point11: { startImageNum: 236, totalSlides: 27 }, // Images 236-262
    point12: { startImageNum: 288, totalSlides: 12 }, // Images 288-299
    point13: { startImageNum: 28, totalSlides: 26 },  // Images 28-53
    point14: { startImageNum: 1, totalSlides: 7 },    // Images 001-007
    point15: { startImageNum: 1, totalSlides: 7 }     // Images 001-007 (reuse for now)
};

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
            const pointId = `point${i}`;
            const config = pointImageRanges[pointId];

            if (config) {
                openSlideshow(config, pointId);
            } else {
                alert(`Point ${i} clicked! Configuration needed.`);
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

// Slideshow functionality
let currentSlide = 0;
let totalSlides = 27; // Will be set dynamically by config
let startImageNum = 236; // Will be set dynamically by config
let currentPointId = null; // Track which point opened the slideshow

// Annotation system - store annotations per slide
const annotationsData = {};
let currentTool = null;
let isDrawing = false;
let canvasContext = null;
let drawingCanvas = null;

function openSlideshow(config = { startImageNum: 236, totalSlides: 27 }, pointId = null) {
    // Set the slideshow configuration
    startImageNum = config.startImageNum;
    totalSlides = config.totalSlides;
    currentPointId = pointId;
    selectedSlide = pointId; // Link proposal to zone

    const slideshowPage = document.getElementById('slideshow-page');
    const slideshowImages = document.getElementById('slideshow-images');

    // Clear any existing images
    slideshowImages.innerHTML = '';

    // Load all images with proper zero-padding
    for (let i = 0; i < totalSlides; i++) {
        const img = document.createElement('img');
        const imageNum = startImageNum + i;
        const imagePath = `images/astoria_Documentation-${String(imageNum).padStart(3, '0')}.jpg`;

        // Force eager loading to ensure all images load
        img.loading = 'eager';
        img.decoding = 'auto';

        img.src = imagePath;
        img.alt = `Slide ${i + 1}`;

        // Add error handling for failed image loads
        img.onerror = function() {
            console.error(`❌ FAILED to load image: ${imagePath}`);
            this.style.backgroundColor = '#ff0000';
            this.style.border = '5px solid yellow';
            this.alt = `Failed to load: ${imagePath}`;
        };

        // Add load success logging
        img.onload = function() {
            console.log(`✓ Successfully loaded: ${imagePath}`);
        };

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
    const cursorTool = document.getElementById('cursor-tool');
    const penTool = document.getElementById('pen-tool');
    const eraserTool = document.getElementById('eraser-tool');
    const stickyTool = document.getElementById('sticky-tool');
    const clearAllBtn = document.getElementById('clear-all');

    const penOptions = document.getElementById('pen-options');
    const eraserOptions = document.getElementById('eraser-options');

    // Cursor tool handler - allows selecting and moving quick add items
    cursorTool.addEventListener('click', () => {
        currentTool = null; // No drawing tool active
        activateTool(cursorTool, null);
        drawingCanvas.style.pointerEvents = 'none'; // Disable canvas drawing, allow interaction with items
    });

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

// ===== TEMPLATE ICON DRAG & DROP =====

function initializeTemplateDragDrop() {
    const templateIcons = document.querySelectorAll('.template-icon');
    const slideshowContainer = document.getElementById('slideshow-container');

    templateIcons.forEach(icon => {
        icon.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('template', e.target.getAttribute('data-template'));
            e.dataTransfer.setData('iconSrc', e.target.getAttribute('data-icon-src'));
            e.dataTransfer.effectAllowed = 'copy';
            e.target.style.opacity = '0.5';
        });

        icon.addEventListener('dragend', (e) => {
            e.target.style.opacity = '1';
        });
    });

    // Allow drop on slideshow container
    slideshowContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    slideshowContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const template = e.dataTransfer.getData('template');
        const iconSrc = e.dataTransfer.getData('iconSrc');
        if (template) {
            // Get the drop position relative to the slideshow container
            const rect = slideshowContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            createTemplateIcon(iconSrc, x, y);
        }
    });
}

function createTemplateIcon(iconSrc, x, y) {
    const container = document.getElementById('slideshow-container');

    const iconDiv = document.createElement('div');
    iconDiv.className = 'template-icon-instance';
    iconDiv.style.position = 'absolute';
    iconDiv.style.left = x + 'px';
    iconDiv.style.top = y + 'px';
    iconDiv.style.transform = 'translate(-50%, -50%)';
    iconDiv.style.background = 'transparent';
    iconDiv.style.cursor = 'grab';
    iconDiv.style.userSelect = 'none';
    iconDiv.style.pointerEvents = 'auto';
    iconDiv.dataset.scale = '1';
    iconDiv.dataset.iconSrc = iconSrc;

    const iconImg = document.createElement('img');
    iconImg.src = iconSrc;
    iconImg.style.width = '80px';
    iconImg.style.height = '80px';
    iconImg.style.objectFit = 'contain';
    iconImg.style.display = 'block';
    iconImg.style.pointerEvents = 'none';
    iconDiv.appendChild(iconImg);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-sticky';
    deleteBtn.textContent = '×';
    deleteBtn.style.position = 'absolute';
    deleteBtn.style.top = '-5px';
    deleteBtn.style.right = '-5px';
    deleteBtn.addEventListener('click', () => {
        iconDiv.remove();
    });

    // Scale button
    const scaleBtn = document.createElement('button');
    scaleBtn.className = 'delete-sticky'; // Reuse styling
    scaleBtn.textContent = '⤢';
    scaleBtn.style.position = 'absolute';
    scaleBtn.style.top = '-5px';
    scaleBtn.style.left = '-5px';
    scaleBtn.style.fontSize = '1rem';
    scaleBtn.title = 'Scale icon';

    let isScaling = false;
    let startScale = 1;
    let startY = 0;

    scaleBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isScaling = true;
        startY = e.clientY;
        startScale = parseFloat(iconDiv.dataset.scale);
    });

    document.addEventListener('mousemove', (e) => {
        if (isScaling) {
            const deltaY = startY - e.clientY;
            const newScale = Math.max(0.5, Math.min(3, startScale + deltaY / 100));
            iconDiv.dataset.scale = newScale;
            iconImg.style.transform = `scale(${newScale})`;
        }
    });

    document.addEventListener('mouseup', () => {
        isScaling = false;
    });

    iconDiv.appendChild(deleteBtn);
    iconDiv.appendChild(scaleBtn);
    container.appendChild(iconDiv);

    // Make the icon draggable within the container
    makeDraggable(iconDiv);
}

// Initialize template drag & drop when slideshow opens
const originalOpenSlideshow = openSlideshow;
window.addEventListener('load', () => {
    // Override after page load
    const slideshowPage = document.getElementById('slideshow-page');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target === slideshowPage && slideshowPage.style.display === 'block') {
                initializeTemplateDragDrop();
            }
        });
    });
    observer.observe(slideshowPage, { attributes: true, attributeFilter: ['style'] });
});

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
    // Save sticky notes with percentage-based positions
    const stickyNotes = Array.from(container.querySelectorAll('.sticky-note')).map(note => {
        // Get container dimensions
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        // Get pixel positions
        const leftPx = parseFloat(note.style.left);
        const topPx = parseFloat(note.style.top);

        // Convert to percentages
        const leftPercent = (leftPx / containerWidth) * 100;
        const topPercent = (topPx / containerHeight) * 100;

        return {
            left: leftPercent + '%',
            top: topPercent + '%',
            transform: note.style.transform,
            text: note.querySelector('textarea').value
        };
    });

    // Save template icons with percentage-based positions
    const templateIcons = Array.from(container.querySelectorAll('.template-icon-instance')).map(icon => {
        // Get container dimensions
        const containerWidth = container.offsetWidth || window.innerWidth;
        const containerHeight = container.offsetHeight || window.innerHeight;

        // Get pixel positions
        const leftPx = parseFloat(icon.style.left) || 0;
        const topPx = parseFloat(icon.style.top) || 0;

        // Convert to percentages (safeguard against division by zero)
        const leftPercent = containerWidth > 0 ? (leftPx / containerWidth) * 100 : 50;
        const topPercent = containerHeight > 0 ? (topPx / containerHeight) * 100 : 50;

        console.log('💾 Icon position:', {
            leftPx, topPx,
            containerWidth, containerHeight,
            leftPercent: leftPercent.toFixed(2) + '%',
            topPercent: topPercent.toFixed(2) + '%',
            iconSrc: icon.dataset.iconSrc
        });

        return {
            left: leftPercent + '%',
            top: topPercent + '%',
            transform: icon.style.transform,
            scale: icon.dataset.scale,
            iconSrc: icon.dataset.iconSrc
        };
    });

    // DEBUG: Log what's being saved
    console.log('💾 Saving slide', currentSlide, '- Template icons:', templateIcons.length, templateIcons);

    // Only save if there's actual content (canvas drawing, sticky notes, or template icons)
    if (canvasData || stickyNotes.length > 0 || templateIcons.length > 0) {
        annotationsData[currentSlide] = {
            canvas: canvasData,
            stickyNotes: stickyNotes,
            templateIcons: templateIcons,
            comment: annotationsData[currentSlide]?.comment || '' // Preserve existing comment
        };
    } else {
        // Remove entry if no annotations
        delete annotationsData[currentSlide];
    }
}

function loadAnnotationsForSlide(slideIndex) {
    const container = document.getElementById('slideshow-container');

    // Clear current canvas, sticky notes, and template icons
    canvasContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    container.querySelectorAll('.sticky-note').forEach(note => note.remove());
    container.querySelectorAll('.template-icon-instance').forEach(icon => icon.remove());

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

        // Load template icons
        if (data.templateIcons) {
            data.templateIcons.forEach(iconData => {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'template-icon-instance';
                iconDiv.style.position = 'absolute';
                iconDiv.style.left = iconData.left;
                iconDiv.style.top = iconData.top;
                iconDiv.style.transform = iconData.transform;
                iconDiv.style.background = 'transparent';
                iconDiv.style.cursor = 'grab';
                iconDiv.dataset.scale = iconData.scale;
                iconDiv.dataset.iconSrc = iconData.iconSrc;

                const iconImg = document.createElement('img');
                iconImg.src = iconData.iconSrc;
                iconImg.style.width = '80px';
                iconImg.style.height = '80px';
                iconImg.style.objectFit = 'contain';
                iconImg.style.display = 'block';
                iconImg.style.transform = `scale(${iconData.scale})`;
                iconImg.style.pointerEvents = 'none';
                iconDiv.appendChild(iconImg);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-sticky';
                deleteBtn.textContent = '×';
                deleteBtn.style.position = 'absolute';
                deleteBtn.style.top = '-5px';
                deleteBtn.style.right = '-5px';
                deleteBtn.addEventListener('click', () => {
                    iconDiv.remove();
                });

                iconDiv.appendChild(deleteBtn);
                container.appendChild(iconDiv);

                makeDraggable(iconDiv);
            });
        }
    }
}

function clearAllAnnotations() {
    // Clear canvas
    canvasContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Remove all sticky notes and template icons
    const container = document.getElementById('slideshow-container');
    container.querySelectorAll('.sticky-note').forEach(note => note.remove());
    container.querySelectorAll('.template-icon-instance').forEach(icon => icon.remove());

    // Clear from storage
    annotationsData[currentSlide] = {
        canvas: null,
        stickyNotes: [],
        templateIcons: []
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
    const header = document.querySelector('header');

    // Hide slideshow and header, show submission
    slideshowPage.style.display = 'none';
    submissionPage.style.display = 'block';
    if (header) {
        header.style.display = 'none';
    }

    // Generate submission preview
    generateSubmissionPreview();
}

function closeSubmissionPage() {
    const submissionPage = document.getElementById('submission-page');
    const slideshowPage = document.getElementById('slideshow-page');
    const header = document.querySelector('header');
    const main = document.querySelector('main');

    // Hide submission, show slideshow
    submissionPage.style.display = 'none';
    slideshowPage.style.display = 'block';

    // Only show header if we're not in map mode (main content is visible)
    if (header && !main.classList.contains('hidden')) {
        header.style.display = 'flex';
    }
}

function generateSubmissionPreview() {
    const grid = document.getElementById('annotated-slides-grid');
    grid.innerHTML = '';

    // Get all slides that have annotations
    const annotatedSlides = Object.keys(annotationsData).filter(slideIndex => {
        const data = annotationsData[slideIndex];
        return data && (data.canvas || (data.stickyNotes && data.stickyNotes.length > 0) || (data.templateIcons && data.templateIcons.length > 0));
    });

    if (annotatedSlides.length === 0) {
        // Show empty state
        grid.innerHTML = `
            <div class="empty-state">
                <h2>No Annotations Yet</h2>
                <p>Go back and add drawings, sticky notes, or quick add items to your slides</p>
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
        const iconCount = data.templateIcons ? data.templateIcons.length : 0;

        // Create card
        const card = document.createElement('div');
        card.className = 'submission-slide-card';
        card.innerHTML = `
            <div style="position: relative;">
                <img src="images/astoria_Documentation-${String(imageNum).padStart(3, '0')}.jpg" class="submission-slide-image" alt="Slide ${slideNum}">
                <div class="submission-overlay-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></div>
            </div>
            <div class="submission-slide-info">
                <div class="submission-slide-title">Slide ${slideNum} of ${totalSlides}</div>
                <div class="submission-slide-meta">
                    ${hasDrawing ? '<span class="submission-badge badge-drawing">Drawings</span>' : ''}
                    ${noteCount > 0 ? `<span class="submission-badge badge-notes">${noteCount} Note${noteCount > 1 ? 's' : ''}</span>` : ''}
                    ${iconCount > 0 ? `<span class="submission-badge badge-icons">${iconCount} Icon${iconCount > 1 ? 's' : ''}</span>` : ''}
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

        // Render annotations in overlay - wait for image to load for proper sizing
        setTimeout(() => {
            const overlayContainer = card.querySelector('.submission-overlay-container');
            if (!overlayContainer) return;

            // Draw canvas layer if exists
            if (hasDrawing) {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = overlayContainer.offsetWidth;
                    canvas.height = overlayContainer.offsetHeight;
                    canvas.style.position = 'absolute';
                    canvas.style.top = '0';
                    canvas.style.left = '0';
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    canvas.style.pointerEvents = 'none';
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    overlayContainer.appendChild(canvas);
                };
                img.src = data.canvas;
            }

            // Render template icons if they exist
            if (data.templateIcons && data.templateIcons.length > 0) {
                data.templateIcons.forEach(iconData => {
                    const iconDiv = document.createElement('div');
                    iconDiv.style.position = 'absolute';
                    iconDiv.style.left = iconData.left;
                    iconDiv.style.top = iconData.top;
                    iconDiv.style.transform = 'translate(-50%, -50%)';
                    iconDiv.style.pointerEvents = 'none';
                    iconDiv.style.zIndex = '999';

                    const iconImg = document.createElement('img');
                    iconImg.src = iconData.iconSrc;
                    iconImg.style.width = '40px';
                    iconImg.style.height = '40px';
                    iconImg.style.objectFit = 'contain';
                    iconImg.style.transform = `scale(${iconData.scale || 1})`;
                    iconDiv.appendChild(iconImg);

                    overlayContainer.appendChild(iconDiv);
                });
            }

            // Render sticky notes if they exist
            if (data.stickyNotes && data.stickyNotes.length > 0) {
                data.stickyNotes.forEach(noteData => {
                    const noteDiv = document.createElement('div');
                    noteDiv.style.position = 'absolute';
                    noteDiv.style.left = noteData.left;
                    noteDiv.style.top = noteData.top;
                    noteDiv.style.transform = 'translate(-50%, -50%)';
                    noteDiv.style.background = '#FFFFCC';
                    noteDiv.style.padding = '5px';
                    noteDiv.style.border = '2px solid #999';
                    noteDiv.style.fontSize = '0.7rem';
                    noteDiv.style.maxWidth = '100px';
                    noteDiv.style.pointerEvents = 'none';
                    noteDiv.style.overflow = 'hidden';
                    noteDiv.style.zIndex = '998';
                    noteDiv.textContent = noteData.text;
                    overlayContainer.appendChild(noteDiv);
                });
            }
        }, 100);
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
        return data && (data.canvas || (data.stickyNotes && data.stickyNotes.length > 0) || (data.templateIcons && data.templateIcons.length > 0));
    });

    if (annotatedSlides.length === 0) {
        alert('No annotations to download. Please add some drawings, notes, or quick add items first.');
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
            summary += 'Contains drawings\n';
        }

        if (data.stickyNotes && data.stickyNotes.length > 0) {
            summary += `${data.stickyNotes.length} Sticky Note(s):\n`;
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
        return data && (data.canvas || (data.stickyNotes && data.stickyNotes.length > 0) || (data.templateIcons && data.templateIcons.length > 0));
    });

    if (annotatedSlides.length === 0) {
        alert('No annotations to submit. Please add some drawings, notes, or quick add items first.');
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

    customConfirm(confirmMsg, 'Submit Proposal').then((confirmed) => {
    if (confirmed) {
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
            selectedSlide: selectedSlide, // Add the zone/slide info
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
        customAlert('Your proposal has been submitted to the community.\n\nCommunity members can now view, vote, and contribute to your project!', 'Success!').then(() => {
            // Clear form and go back to home
            document.getElementById('proposal-title').value = '';
            document.getElementById('proposal-budget').value = '';
            document.getElementById('proposal-description').value = '';
            document.getElementById('reference-photos').value = '';
            document.getElementById('photo-preview').innerHTML = '';

            // Close submission and slideshow pages
            closeSubmissionPage();
            closeSlideshow();

            // Hide all slideshow-related elements
            document.getElementById('slideshow3').style.display = 'none';
            document.getElementById('overlay').style.display = 'none';
            document.getElementById('slideshow3').classList.remove('active');
            document.getElementById('overlay').classList.remove('active');
            document.getElementById('slideshow-page').style.display = 'none';
            document.getElementById('submission-page').style.display = 'none';

            // Hide all clickable points
            document.querySelectorAll('.clickable-point').forEach(point => {
                point.style.display = 'none';
                point.classList.remove('animation-active');
            });
            document.getElementById('cursor-demo').classList.remove('active');

            // Show main content and header
            const main = document.querySelector('main');
            const header = document.querySelector('header');
            main.classList.remove('hidden');
            header.classList.remove('hidden');
            main.style.display = '';
            header.style.display = '';

            hideBackToMenuButton();

            // Reload proposals on landing page
            loadProposals();

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    });
}

// ===== COMMUNITY PROPOSALS FUNCTIONALITY =====

// Diagnostic function to check what's in proposals
function checkProposalData() {
    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    console.log('=== PROPOSAL DIAGNOSTIC ===');
    console.log('Total proposals:', proposals.length);

    proposals.forEach((proposal, index) => {
        console.log(`\nProposal ${index + 1}:`, proposal.title);
        console.log('  ID:', proposal.id);
        console.log('  Annotations:', Object.keys(proposal.annotations || {}).length, 'slides');

        Object.keys(proposal.annotations || {}).forEach(slideKey => {
            const ann = proposal.annotations[slideKey];
            console.log(`  Slide ${slideKey}:`);
            console.log('    - Canvas:', ann.canvas ? 'YES' : 'NO');
            console.log('    - Sticky notes:', ann.stickyNotes?.length || 0);
            console.log('    - Template icons:', ann.templateIcons?.length || 0);
            if (ann.templateIcons && ann.templateIcons.length > 0) {
                ann.templateIcons.forEach((icon, i) => {
                    console.log(`      Icon ${i}:`, icon);
                });
            }
        });
    });
    console.log('=== END DIAGNOSTIC ===');
}

// Fix icon paths and positions in existing proposals (migration function)
function fixIconPathsInProposals() {
    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    let fixed = false;

    proposals.forEach(proposal => {
        if (proposal.annotations) {
            Object.keys(proposal.annotations).forEach(slideKey => {
                const annotation = proposal.annotations[slideKey];
                if (annotation.templateIcons && annotation.templateIcons.length > 0) {
                    annotation.templateIcons.forEach(icon => {
                        // Fix lowercase archive path
                        if (icon.iconSrc && icon.iconSrc.startsWith('archive/')) {
                            console.log('🔧 Fixing path:', icon.iconSrc, '→', icon.iconSrc.replace('archive/', 'Archive/'));
                            icon.iconSrc = icon.iconSrc.replace('archive/', 'Archive/');
                            fixed = true;
                        }

                        // Fix file names with spaces to underscores
                        const spaceToUnderscore = [
                            ['swing set.png', 'swing_set.png'],
                            ['trash bin.png', 'trash_bin.png'],
                            ['bus stop.png', 'bus_stop.png'],
                            ['recycling bin.png', 'recycling_bin.png'],
                            ['composting bin.png', 'composting_bin.png'],
                            ['community garden.png', 'community_garden.png'],
                            ['street light.png', 'street_light.png'],
                            ['street light-01.png', 'street_light.png'],
                            ['street light-02.png', 'street_light.png'],
                            ['water fountain.png', 'water_fountain.png'],
                            ['bike rack.png', 'bike_rack.png']
                        ];

                        spaceToUnderscore.forEach(([oldName, newName]) => {
                            if (icon.iconSrc && icon.iconSrc.includes(oldName)) {
                                console.log('🔧 Fixing filename:', icon.iconSrc, '→', icon.iconSrc.replace(oldName, newName));
                                icon.iconSrc = icon.iconSrc.replace(oldName, newName);
                                fixed = true;
                            }
                        });

                        // Fix Infinity% positions (set to center as default)
                        if (icon.left === 'Infinity%' || icon.top === 'Infinity%' ||
                            icon.left.includes('Infinity') || icon.top.includes('Infinity')) {
                            console.log('🔧 Fixing invalid position for icon:', icon.iconSrc);
                            console.log('   Old position:', icon.left, icon.top);
                            icon.left = '50%';
                            icon.top = '50%';
                            console.log('   New position:', icon.left, icon.top);
                            fixed = true;
                        }
                    });
                }
            });
        }
    });

    if (fixed) {
        localStorage.setItem('communityProposals', JSON.stringify(proposals));
        console.log('✅ Fixed icon paths and positions in proposals. Reloading...');
        loadProposals();
    } else {
        console.log('ℹ️ No icon paths or positions needed fixing.');
    }
}

// Load fully funded proposals into sidebar
function loadFullyFundedProposals() {
    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    const fullyFundedSection = document.getElementById('fully-funded-section');
    const fullyFundedList = document.getElementById('fully-funded-list');

    if (!fullyFundedSection || !fullyFundedList) return;

    // Filter proposals that have reached 100% funding
    const fullyFunded = proposals.filter(p => p.funding.raised >= p.budget);

    if (fullyFunded.length === 0) {
        fullyFundedSection.style.display = 'none';
        return;
    }

    // Show section and populate with proposals
    fullyFundedSection.style.display = 'block';

    fullyFundedList.innerHTML = fullyFunded.map(proposal => `
        <div style="background: white; border: 2px solid #66BB66; padding: 8px; margin-bottom: 10px; cursor: pointer;"
             onclick="window.location.hash = 'proposal-${proposal.id}'">
            <div style="font-weight: bold; color: #003366; margin-bottom: 4px; font-size: 0.8rem;">${proposal.title}</div>
            <div style="background: #FFE066; color: #CC6600; padding: 3px 6px; font-size: 0.65rem; font-weight: bold; text-align: center; border: 1px solid #CCAA00; margin-bottom: 4px;">
                DEVELOPER REVIEW
            </div>
            <div style="color: #666; font-size: 0.7rem;">Budget: $${proposal.budget.toLocaleString()}</div>
            <div style="color: #66BB66; font-size: 0.7rem; font-weight: bold;">✓ 100% Funded</div>
            <div style="color: #666; font-size: 0.65rem; margin-top: 3px;">${proposal.funding.backers} backers</div>
        </div>
    `).join('');
}

// Load and display proposals on landing page
function loadProposals() {
    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    const proposalsList = document.getElementById('proposals-list');

    if (!proposalsList) return;

    // Filter out fully funded proposals (they go to sidebar instead)
    const nonFullyFundedProposals = proposals.filter(p => p.funding.raised < p.budget);

    if (proposals.length === 0) {
        proposalsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; font-family: Verdana, Arial, sans-serif;">
                <p style="font-size: 1.1rem; margin-bottom: 10px;">No proposals yet!</p>
                <p style="font-size: 0.9rem;">Be the first to submit a community proposal.</p>
            </div>
        `;
        loadFullyFundedProposals();
        return;
    }

    if (nonFullyFundedProposals.length === 0) {
        proposalsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; font-family: Verdana, Arial, sans-serif;">
                <p style="font-size: 1.1rem; margin-bottom: 10px;">All proposals are fully funded! 🎉</p>
                <p style="font-size: 0.9rem;">Check the "FULLY FUNDED" section in the sidebar for projects under developer review.</p>
            </div>
        `;
        loadFullyFundedProposals();
        return;
    }

    // Sort by net votes (Build - Demolish) and show top 3 (excluding fully funded)
    const topProposals = nonFullyFundedProposals.sort((a, b) => {
        const aNetVotes = a.votes.build - a.votes.demolish;
        const bNetVotes = b.votes.build - b.votes.demolish;
        return bNetVotes - aNetVotes;
    }).slice(0, 3);

    proposalsList.innerHTML = topProposals.map(proposal => createProposalCard(proposal)).join('');

    // Add event listeners for voting and funding
    attachProposalEventListeners();

    // Load fully funded proposals in sidebar
    loadFullyFundedProposals();
}

// Create image preview for proposal card
function createProposalImagePreview(proposal) {
    // Check if proposal has annotations
    if (!proposal.annotations || Object.keys(proposal.annotations).length === 0) {
        console.log('No annotations found for proposal:', proposal.id);
        return '';
    }

    // Get FIRST annotated slide only
    const firstSlideKey = Object.keys(proposal.annotations).sort((a, b) => parseInt(a) - parseInt(b))[0];
    const pointId = proposal.selectedSlide;
    const config = pointImageRanges[pointId];

    if (!config) {
        console.error('❌ No config found for pointId:', pointId);
        console.error('   Proposal ID:', proposal.id);
        console.error('   Proposal Title:', proposal.title);
        console.error('   Available point configs:', Object.keys(pointImageRanges).join(', '));
        console.error('   This proposal was likely created before all points were configured.');
        console.error('   Solution: Open check-proposals.html to view and clear invalid proposals.');

        // Return a placeholder with error message instead of empty
        return `
            <div style="margin: 12px 0; padding: 20px; background: #fff3cd; border: 3px solid #ffc107; border-style: outset;">
                <div style="color: #856404; font-family: Verdana, Arial, sans-serif;">
                    <strong>⚠️ Configuration Error</strong>
                    <p style="margin: 10px 0; font-size: 0.9rem;">This proposal has an invalid zone configuration (${pointId}).
                    It was likely created before all zones were configured.</p>
                    <p style="margin: 10px 0; font-size: 0.85rem;">
                        <strong>To fix:</strong> Open <code>check-proposals.html</code> to view and clear invalid proposals,
                        or use <code>clearAllProposals()</code> in the browser console.
                    </p>
                </div>
            </div>
        `;
    }

    const slideIndex = parseInt(firstSlideKey);
    const imageNum = config.startImageNum + slideIndex;
    const imagePath = `images/astoria_Documentation-${String(imageNum).padStart(3, '0')}.jpg`;
    const annotation = proposal.annotations[firstSlideKey];

    // DEBUG: Log annotation data
    console.log('📋 Proposal ID:', proposal.id, 'Title:', proposal.title);
    console.log('   Canvas exists:', !!annotation.canvas);
    console.log('   Template icons:', annotation.templateIcons);
    console.log('   Sticky notes:', annotation.stickyNotes);

    // Render template icons HTML
    let iconsHTML = '';
    if (annotation.templateIcons && annotation.templateIcons.length > 0) {
        console.log('   ✅ Rendering', annotation.templateIcons.length, 'template icons');
        iconsHTML = annotation.templateIcons.map(iconData =>
            `<div style="position: absolute; left: ${iconData.left}; top: ${iconData.top}; transform: translate(-50%, -50%); pointer-events: none; z-index: 999;">
                <img src="${iconData.iconSrc}" style="width: 30px; height: 30px; object-fit: contain; transform: scale(${iconData.scale || 1});">
            </div>`
        ).join('');
    } else {
        console.log('   ❌ No template icons to render');
    }

    // Render sticky notes HTML
    let notesHTML = '';
    if (annotation.stickyNotes && annotation.stickyNotes.length > 0) {
        notesHTML = annotation.stickyNotes.map(noteData =>
            `<div style="position: absolute; left: ${noteData.left}; top: ${noteData.top}; transform: translate(-50%, -50%); background: #FFFFCC; padding: 3px; border: 1px solid #999; font-size: 0.5rem; max-width: 60px; pointer-events: none; overflow: hidden; z-index: 998;">${noteData.text}</div>`
        ).join('');
    }

    return `
        <div style="margin: 12px 0; padding: 10px; background: #f5f5f5; border: 2px solid #999; border-style: inset;">
            <div style="position: relative; width: 100%; max-width: 400px; margin: 0 auto;">
                <div class="proposal-preview-image"
                     data-image-path="${imagePath}"
                     data-canvas-url="${annotation.canvas || ''}"
                     data-proposal-id="${proposal.id}"
                     data-annotation='${JSON.stringify(annotation).replace(/'/g, '&apos;').replace(/"/g, '&quot;')}'
                     style="position: relative; aspect-ratio: 4/3; border: 2px solid #666; border-style: outset; overflow: hidden; background: #000; cursor: pointer;">
                    <img src="${imagePath}" style="width: 100%; height: 100%; object-fit: contain;" alt="Slide ${slideIndex + 1}">
                    ${annotation.canvas ? `<img src="${annotation.canvas}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none;">` : ''}
                    ${iconsHTML}
                    ${notesHTML}
                    <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 3px; font-size: 0.7rem; font-family: Verdana, Arial, sans-serif;">Click to expand</div>
                </div>
            </div>
        </div>
    `;
}

// Expand proposal preview in modal
function expandProposalPreview(imagePath, canvasDataUrl, proposalId, annotationData) {
    // Create full-screen modal
    const modal = document.createElement('div');
    modal.className = 'login-modal active';
    modal.style.zIndex = '10000';

    // Render template icons HTML
    let iconsHTML = '';
    if (annotationData && annotationData.templateIcons && annotationData.templateIcons.length > 0) {
        iconsHTML = annotationData.templateIcons.map(iconData =>
            `<div style="position: absolute; left: ${iconData.left}; top: ${iconData.top}; transform: translate(-50%, -50%); pointer-events: none; z-index: 999;">
                <img src="${iconData.iconSrc}" style="width: 80px; height: 80px; object-fit: contain; transform: scale(${iconData.scale || 1});">
            </div>`
        ).join('');
    }

    // Render sticky notes HTML
    let notesHTML = '';
    if (annotationData && annotationData.stickyNotes && annotationData.stickyNotes.length > 0) {
        notesHTML = annotationData.stickyNotes.map(noteData =>
            `<div style="position: absolute; left: ${noteData.left}; top: ${noteData.top}; transform: translate(-50%, -50%); background: #FFFFCC; padding: 8px; border: 2px solid #999; font-size: 1rem; max-width: 150px; pointer-events: none; z-index: 998; white-space: pre-wrap;">${noteData.text}</div>`
        ).join('');
    }

    modal.innerHTML = `
        <div class="login-box" style="max-width: 95vw; max-height: 95vh; width: 95vw; height: 95vh; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="position: relative; width: 100%; height: calc(100% - 50px); display: flex; align-items: center; justify-content: center; background: #000;">
                <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <div style="position: relative; max-width: 100%; max-height: 100%; aspect-ratio: 4/3;">
                        <img src="${imagePath}"
                             style="width: 100%; height: 100%; object-fit: contain; display: block;"
                             alt="Proposal full view">
                        ${canvasDataUrl ? `<img src="${canvasDataUrl}"
                             style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none;">` : ''}
                        ${iconsHTML}
                        ${notesHTML}
                    </div>
                </div>
            </div>
            <button onclick="this.closest('.login-modal').remove()"
                    style="margin-top: 10px; padding: 10px 20px; background: #D3D3D3; border: 2px outset #999; cursor: pointer; font-family: Verdana, Arial, sans-serif; font-weight: bold;">Close</button>
        </div>
    `;

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Close on ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(modal);
}

// Create HTML for a proposal card
function createProposalCard(proposal) {
    const fundingPercent = Math.min((proposal.funding.raised / proposal.budget) * 100, 100);
    const netVotes = proposal.votes.build - proposal.votes.demolish;
    const isFullyFunded = proposal.funding.raised >= proposal.budget;

    return `
        <div class="proposal-card" data-proposal-id="${proposal.id}">
            <div class="proposal-header">
                <div>
                    <h3 class="proposal-title">${proposal.title}</h3>
                    ${isFullyFunded ? '<div style="display: inline-block; background: #FFE066; color: #CC6600; padding: 4px 10px; font-size: 0.7rem; font-weight: bold; border: 2px solid #CCAA00; margin: 5px 0;">📋 DEVELOPER REVIEW</div>' : ''}
                    <div class="proposal-meta">Submitted ${proposal.date} • ${Object.keys(proposal.annotations).length} annotated slides</div>
                </div>
                <div class="proposal-budget">
                    <div class="budget-label">Project Budget</div>
                    <div class="budget-amount">$${proposal.budget.toLocaleString()}</div>
                </div>
            </div>

            <div class="proposal-description">${proposal.description}</div>

            ${createProposalImagePreview(proposal)}

            <div class="funding-section">
                <strong style="font-size: 0.9rem; color: #333;">Community Funding</strong>
                <div class="funding-progress-bar">
                    <div class="funding-progress-fill" style="width: ${fundingPercent}%"></div>
                </div>
                <div class="funding-stats">
                    <span class="funding-raised">$${proposal.funding.raised.toLocaleString()} raised of $${proposal.budget.toLocaleString()}</span>
                    <span class="funding-backers">${proposal.funding.backers} ${proposal.funding.backers === 1 ? 'backer' : 'backers'}</span>
                </div>
                <button class="contribute-btn" data-proposal-id="${proposal.id}">Contribute to this Project</button>
            </div>

            <div class="voting-section">
                <div class="vote-group">
                    <button class="vote-btn vote-build" data-proposal-id="${proposal.id}" data-vote-type="build">
                        BUILD
                    </button>
                    <span class="vote-count">${proposal.votes.build}</span>
                    <span class="vote-label">Votes</span>
                </div>
                <div style="font-size: 1.5rem; font-weight: bold; color: ${netVotes >= 0 ? '#66BB66' : '#CC3333'}; padding: 0 15px;">
                    ${netVotes >= 0 ? '+' : ''}${netVotes}
                </div>
                <div class="vote-group">
                    <button class="vote-btn vote-demolish" data-proposal-id="${proposal.id}" data-vote-type="demolish">
                        DEMOLISH
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

    // Image preview click to expand
    document.querySelectorAll('.proposal-preview-image').forEach(preview => {
        preview.addEventListener('click', (e) => {
            const imagePath = e.currentTarget.getAttribute('data-image-path');
            const canvasUrl = e.currentTarget.getAttribute('data-canvas-url');
            const proposalId = e.currentTarget.getAttribute('data-proposal-id');
            const annotationJSON = e.currentTarget.getAttribute('data-annotation');

            let annotationData = null;
            if (annotationJSON) {
                try {
                    annotationData = JSON.parse(annotationJSON);
                } catch (err) {
                    console.error('Failed to parse annotation data:', err);
                }
            }

            expandProposalPreview(imagePath, canvasUrl, proposalId, annotationData);
        });
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

    const proposal = proposals[proposalIndex];

    // Show vote confirmation modal
    showVoteModal(proposal, voteType, () => {
        // Increment vote
        proposals[proposalIndex].votes[voteType]++;

        // Save back to localStorage
        localStorage.setItem('communityProposals', JSON.stringify(proposals));

        // Reload proposals
        loadProposals();
        // Also reload if on browse page (refresh the badges)
        const browsePage = document.getElementById('browse-proposals-page');
        if (browsePage && browsePage.style.display === 'block') {
            loadProposalBadges();
        }
    });
}

// Handle contributions
function handleContribution(e) {
    // Check if user is signed in
    if (!checkSignIn()) {
        showSignInModal();
        return;
    }

    const proposalId = parseInt(e.currentTarget.getAttribute('data-proposal-id'));
    console.log('handleContribution called for proposal ID:', proposalId);

    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    console.log('Total proposals loaded:', proposals.length);

    const proposalIndex = proposals.findIndex(p => p.id === proposalId);
    console.log('Proposal index found:', proposalIndex);

    if (proposalIndex === -1) {
        console.error('Proposal not found!');
        return;
    }

    const proposal = proposals[proposalIndex];
    console.log('Current proposal funding:', proposal.funding);

    // Show contribution modal
    showContributionModal(proposal, (amount) => {
        console.log('Contribution callback triggered with amount:', amount);
        console.log('Before contribution - Raised:', proposals[proposalIndex].funding.raised);

        // Add contribution
        proposals[proposalIndex].funding.raised += amount;
        proposals[proposalIndex].funding.backers++;

        console.log('After contribution - Raised:', proposals[proposalIndex].funding.raised);
        console.log('After contribution - Backers:', proposals[proposalIndex].funding.backers);

        // Save back to localStorage
        localStorage.setItem('communityProposals', JSON.stringify(proposals));
        console.log('Saved to localStorage');

        // Verify save
        const savedProposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
        const savedProposal = savedProposals.find(p => p.id === proposalId);
        console.log('Verified saved proposal funding:', savedProposal?.funding);

        // Use setTimeout to ensure DOM updates after save completes
        setTimeout(() => {
            // Reload proposals on homepage
            loadProposals();
            console.log('Reloaded proposals on homepage');

            // Also reload if on browse page (refresh the badges)
            const browsePage = document.getElementById('browse-proposals-page');
            if (browsePage && browsePage.style.display === 'block') {
                loadProposalBadges();
                console.log('Reloaded badges on browse page');
            }

            // Reload zone modal if it's open
            const zoneModal = document.getElementById('zone-proposals-modal');
            if (zoneModal && zoneModal.classList.contains('active')) {
                // Re-render the proposals in the modal
                const zoneId = proposal.selectedSlide;
                const zoneName = zonePositions.find(z => z.id === zoneId)?.name || 'Zone';
                showZoneProposals(zoneId, zoneName);
                console.log('Reloaded zone modal');
            }
        }, 100);
    });
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
    // Check if browse page is open and close it
    const browsePage = document.getElementById('browse-proposals-page');
    if (browsePage && browsePage.style.display === 'block') {
        closeBrowseProposalsPage();
        return;
    }

    // Check if slideshow is open and close it
    const slideshowPage = document.getElementById('slideshow-page');
    if (slideshowPage && slideshowPage.style.display === 'block') {
        closeSlideshow();
    }

    // Check if submission page is open and close it
    const submissionPage = document.getElementById('submission-page');
    if (submissionPage && submissionPage.style.display === 'block') {
        closeSubmissionPage();
    }

    // Hide aerial map elements
    document.getElementById('slideshow3').style.display = 'none';
    document.getElementById('slideshow3').style.opacity = '0';
    document.getElementById('slideshow3').classList.remove('active');
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('overlay').style.opacity = '0';
    document.getElementById('overlay').classList.remove('active');

    document.querySelectorAll('.clickable-point').forEach(point => {
        point.style.display = 'none';
        point.classList.remove('animation-active');
    });
    document.getElementById('cursor-demo').classList.remove('active');

    // Show main menu
    document.querySelector('main').classList.remove('page-hidden');
    document.querySelector('main').style.display = 'block';
    document.querySelector('header').classList.remove('page-hidden');
    document.querySelector('header').style.display = 'flex';

    // Hide back button
    hideBackToMenuButton();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (!checkSignIn()) {
        showSignInModal();
        return;
    }
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
    if (!checkSignIn()) {
        showSignInModal();
        return;
    }
    document.getElementById('menu-community').click();
});

// Landing page action buttons
document.getElementById('btn-create-proposal').addEventListener('click', () => {
    if (!checkSignIn()) {
        showSignInModal();
        return;
    }
    document.getElementById('menu-community').click();
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

// TEMPORARY: Disable sign-in requirement for demo/testing
const SIGN_IN_DISABLED = true;

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
    // TEMPORARY: Return true if sign-in is disabled (for demo/testing)
    if (SIGN_IN_DISABLED) {
        return true;
    }
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

// ===== VOTE MODAL =====

let currentVoteCallback = null;

function showVoteModal(proposal, voteType, callback) {
    currentVoteCallback = callback;

    const modal = document.getElementById('vote-modal');
    const voteLabel = voteType === 'build' ? 'BUILD' : 'DEMOLISH';

    // Set title and question
    document.getElementById('vote-modal-title').textContent = proposal.title;
    document.getElementById('vote-modal-question').textContent = `Vote to ${voteLabel}?`;

    // Limit description to 150 characters
    const description = proposal.description.length > 150
        ? proposal.description.substring(0, 150) + '...'
        : proposal.description;
    document.getElementById('vote-modal-description').textContent = description;

    // Set budget
    document.getElementById('vote-modal-budget').textContent = `$${proposal.budget.toLocaleString()}`;

    // Show first image if available
    const imageContainer = document.getElementById('vote-modal-image');
    if (proposal.referencePhotos && proposal.referencePhotos.length > 0) {
        imageContainer.innerHTML = `<img src="${proposal.referencePhotos[0]}" style="max-width: 100%; max-height: 200px; border: 2px solid #999;">`;
    } else {
        imageContainer.innerHTML = '';
    }

    modal.classList.add('active');
}

function hideVoteModal() {
    const modal = document.getElementById('vote-modal');
    modal.classList.remove('active');
    currentVoteCallback = null;
}

document.getElementById('vote-confirm').addEventListener('click', () => {
    if (currentVoteCallback) {
        currentVoteCallback();
    }
    hideVoteModal();
});

document.getElementById('vote-cancel').addEventListener('click', hideVoteModal);

document.getElementById('vote-modal').addEventListener('click', (e) => {
    if (e.target.id === 'vote-modal') {
        hideVoteModal();
    }
});

// ===== CONTRIBUTION MODAL =====

let currentContributionCallback = null;

function showContributionModal(proposal, callback) {
    currentContributionCallback = callback;

    const modal = document.getElementById('contribution-modal');
    const remaining = proposal.budget - proposal.funding.raised;

    // Set title
    document.getElementById('contribution-modal-title').textContent = proposal.title;

    // Limit description to 150 characters
    const description = proposal.description.length > 150
        ? proposal.description.substring(0, 150) + '...'
        : proposal.description;
    document.getElementById('contribution-modal-description').textContent = description;

    // Set funding details
    document.getElementById('contribution-modal-budget').textContent = `$${proposal.budget.toLocaleString()}`;
    document.getElementById('contribution-modal-raised').textContent = `$${proposal.funding.raised.toLocaleString()}`;
    document.getElementById('contribution-modal-remaining').textContent = `$${remaining.toLocaleString()}`;
    document.getElementById('contribution-modal-backers').textContent = proposal.funding.backers;

    // Show first image if available
    const imageContainer = document.getElementById('contribution-modal-image');
    if (proposal.referencePhotos && proposal.referencePhotos.length > 0) {
        imageContainer.innerHTML = `<img src="${proposal.referencePhotos[0]}" style="max-width: 100%; max-height: 200px; border: 2px solid #999;">`;
    } else {
        imageContainer.innerHTML = '';
    }

    // Reset amount input
    document.getElementById('contribution-amount').value = '100';

    modal.classList.add('active');
}

function hideContributionModal() {
    const modal = document.getElementById('contribution-modal');
    modal.classList.remove('active');
    currentContributionCallback = null;
}

// Preset amount buttons
document.querySelectorAll('.preset-amount-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove selected class from all buttons
        document.querySelectorAll('.preset-amount-btn').forEach(b => b.classList.remove('selected'));
        // Add selected class to clicked button
        e.target.classList.add('selected');
        // Set the amount
        const amount = e.target.getAttribute('data-amount');
        document.getElementById('contribution-amount').value = amount;
    });
});

document.getElementById('contribution-continue').addEventListener('click', () => {
    const amount = parseInt(document.getElementById('contribution-amount').value);

    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid contribution amount.');
        return;
    }

    // Show payment modal
    showPaymentModal(amount);
});

document.getElementById('contribution-cancel').addEventListener('click', hideContributionModal);

document.getElementById('contribution-modal').addEventListener('click', (e) => {
    if (e.target.id === 'contribution-modal') {
        hideContributionModal();
    }
});

// ===== PAYMENT MODAL =====

let currentPaymentAmount = 0;

function showPaymentModal(amount) {
    currentPaymentAmount = amount;
    const modal = document.getElementById('payment-modal');

    // Display amount
    document.getElementById('payment-amount-display').textContent = `Amount: $${amount.toLocaleString()}`;

    // Reset form
    document.getElementById('payment-form').reset();

    // Hide contribution modal (but don't clear the callback!)
    document.getElementById('contribution-modal').classList.remove('active');

    // Show payment modal
    modal.classList.add('active');
}

function hidePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('active');
}

// Format card number with spaces
document.getElementById('card-number').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
});

// Format expiry date with slash
document.getElementById('card-expiry').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
});

// Only allow numbers in CVC
document.getElementById('card-cvc').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Only allow numbers in ZIP
document.getElementById('billing-zip').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Payment form handler
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();

    console.log('Payment form submitted with amount:', currentPaymentAmount);

    // Process payment (fake)
    if (currentContributionCallback) {
        console.log('Calling contribution callback');
        currentContributionCallback(currentPaymentAmount);
        // Clear callback after use
        currentContributionCallback = null;
    } else {
        console.error('No contribution callback found!');
    }

    hidePaymentModal();

    // Show success message AFTER reload completes
    setTimeout(() => {
        customAlert(`Thank you for contributing $${currentPaymentAmount.toLocaleString()}!`, 'Payment Successful!');
    }, 200);
});

document.getElementById('payment-cancel').addEventListener('click', () => {
    hidePaymentModal();
    // Show contribution modal again
    document.getElementById('contribution-modal').classList.add('active');
});

document.getElementById('payment-modal').addEventListener('click', (e) => {
    if (e.target.id === 'payment-modal') {
        hidePaymentModal();
    }
});

// ===== BROWSE ALL PROPOSALS PAGE (SPATIAL MAP VIEW) =====

// Define zone positions (matching the clickable points from the map)
const zonePositions = [
    { id: 'point1', left: '51.503596%', top: '4.894534%', name: 'Zone 1' },
    { id: 'point2', left: '51.553199%', top: '15.704843%', name: 'Zone 2' },
    { id: 'point3', left: '61.921444%', top: '15.378307%', name: 'Zone 3' },
    { id: 'point4', left: '72.160424%', top: '17.922234%', name: 'Zone 4' },
    { id: 'point5', left: '66.835161%', top: '28.004598%', name: 'Zone 5' },
    { id: 'point6', left: '51.361641%', top: '37.181801%', name: 'Zone 6' },
    { id: 'point7', left: '66.849518%', top: '42.853055%', name: 'Zone 7' },
    { id: 'point8', left: '22.755235%', top: '45.283878%', name: 'Zone 8' },
    { id: 'point9', left: '30.786059%', top: '45.480583%', name: 'Zone 9' },
    { id: 'point10', left: '38.273481%', top: '45.094269%', name: 'Zone 10' },
    { id: 'point11', left: '45.709004%', top: '45.444688%', name: 'Zone 11' },
    { id: 'point12', left: '51.406013%', top: '57.324289%', name: 'Zone 12' },
    { id: 'point13', left: '66.717644%', top: '56.887496%', name: 'Zone 13' },
    { id: 'point14', left: '23.904598%', top: '69.77731%', name: 'Zone 14' },
    { id: 'point15', left: '34.860905%', top: '79.744504%', name: 'Zone 15' }
];

function openBrowseProposalsPage() {
    const browsePage = document.getElementById('browse-proposals-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const slideshow3 = document.getElementById('slideshow3');
    const overlay = document.getElementById('overlay');

    // Hide main content
    main.style.display = 'none';
    header.style.display = 'none';

    // Show map background with proper styling
    slideshow3.style.display = 'block';
    slideshow3.style.backgroundImage = 'url("aerial-imagery/site-aerial.jpg")';
    slideshow3.style.backgroundSize = 'cover';
    slideshow3.style.backgroundPosition = 'center';
    slideshow3.style.opacity = '1';

    overlay.style.display = 'block';
    overlay.style.opacity = '1';

    browsePage.style.display = 'block';

    // Show back button
    showBackToMenuButton();

    // Load proposal count badges on the map
    loadProposalBadges();
}

function closeBrowseProposalsPage() {
    const browsePage = document.getElementById('browse-proposals-page');
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const slideshow3 = document.getElementById('slideshow3');
    const overlay = document.getElementById('overlay');

    // Hide map and badges
    slideshow3.style.display = 'none';
    slideshow3.style.opacity = '0';
    overlay.style.display = 'none';
    overlay.style.opacity = '0';
    browsePage.style.display = 'none';
    browsePage.innerHTML = ''; // Clear badges

    // Show main content and remove any hidden classes
    main.style.display = 'block';
    main.classList.remove('page-hidden');
    main.classList.remove('hidden');
    header.style.display = 'flex';
    header.classList.remove('page-hidden');
    header.classList.remove('hidden');

    // Hide back button
    hideBackToMenuButton();
}

function loadProposalBadges() {
    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    const browsePage = document.getElementById('browse-proposals-page');

    // Count proposals per zone
    const zoneCounts = {};
    zonePositions.forEach(zone => {
        zoneCounts[zone.id] = proposals.filter(p => p.selectedSlide === zone.id).length;
    });

    // Create badges for each zone
    browsePage.innerHTML = zonePositions.map(zone => {
        const count = zoneCounts[zone.id] || 0;
        const hasProposals = count > 0;

        return `
            <div class="proposal-count-badge ${hasProposals ? '' : 'no-proposals'}"
                 data-zone-id="${zone.id}"
                 data-zone-name="${zone.name}"
                 style="left: ${zone.left}; top: ${zone.top};"
                 ${hasProposals ? `onclick="showZoneProposals('${zone.id}', '${zone.name}')"` : ''}>
                ${count}
            </div>
        `;
    }).join('');
}

function showZoneProposals(zoneId, zoneName) {
    const proposals = JSON.parse(localStorage.getItem('communityProposals') || '[]');
    const zoneProposals = proposals.filter(p => p.selectedSlide === zoneId);

    // Sort by net votes
    const sortedProposals = zoneProposals.sort((a, b) => {
        const aNetVotes = a.votes.build - a.votes.demolish;
        const bNetVotes = b.votes.build - b.votes.demolish;
        return bNetVotes - aNetVotes;
    });

    // Set modal title
    document.getElementById('zone-modal-title').textContent = `${zoneName} Proposals`;
    document.getElementById('zone-modal-subtitle').textContent = `${sortedProposals.length} proposal${sortedProposals.length !== 1 ? 's' : ''} in this zone`;

    // Load proposals into modal
    const zoneProposalsList = document.getElementById('zone-proposals-list');
    zoneProposalsList.innerHTML = sortedProposals.map(proposal => createProposalCard(proposal)).join('');

    // Show modal
    document.getElementById('zone-proposals-modal').classList.add('active');

    // Add event listeners for voting and funding
    attachProposalEventListeners();
}

function hideZoneProposalsModal() {
    document.getElementById('zone-proposals-modal').classList.remove('active');
}

// Event listeners for zone modal
document.getElementById('close-zone-modal').addEventListener('click', hideZoneProposalsModal);

document.getElementById('zone-proposals-modal').addEventListener('click', (e) => {
    if (e.target.id === 'zone-proposals-modal') {
        hideZoneProposalsModal();
    }
});

// Wire up browse proposals buttons
document.getElementById('view-all-proposals').addEventListener('click', openBrowseProposalsPage);
document.getElementById('btn-browse-proposals').addEventListener('click', openBrowseProposalsPage);

// ===== CUSTOM ALERT/CONFIRM MODALS =====

let customAlertCallback = null;
let customConfirmCallback = null;

function customAlert(message, title = 'Success!') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        document.getElementById('custom-alert-title').textContent = title;
        document.getElementById('custom-alert-message').textContent = message;

        customAlertCallback = () => {
            modal.classList.remove('active');
            customAlertCallback = null;
            resolve();
        };

        modal.classList.add('active');
    });
}

function customConfirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        document.getElementById('custom-confirm-title').textContent = title;
        document.getElementById('custom-confirm-message').textContent = message;

        customConfirmCallback = (result) => {
            modal.classList.remove('active');
            customConfirmCallback = null;
            resolve(result);
        };

        modal.classList.add('active');
    });
}

document.getElementById('custom-alert-ok').addEventListener('click', () => {
    if (customAlertCallback) customAlertCallback();
});

document.getElementById('custom-confirm-ok').addEventListener('click', () => {
    if (customConfirmCallback) customConfirmCallback(true);
});

document.getElementById('custom-confirm-cancel').addEventListener('click', () => {
    if (customConfirmCallback) customConfirmCallback(false);
});

document.getElementById('custom-alert-modal').addEventListener('click', (e) => {
    if (e.target.id === 'custom-alert-modal' && customAlertCallback) {
        customAlertCallback();
    }
});

document.getElementById('custom-confirm-modal').addEventListener('click', (e) => {
    if (e.target.id === 'custom-confirm-modal' && customConfirmCallback) {
        customConfirmCallback(false);
    }
});

// ===== PRE-DRAWN TEMPLATES =====

const templates = {
    bench: { title: 'Install Park Bench', budget: 1500, description: 'Add a comfortable park bench for community members to rest and enjoy the outdoors.' },
    swing: { title: 'Add Swing Set', budget: 8000, description: 'Install a safe, modern swing set for children to enjoy.' },
    trash: { title: 'Place Trash Can', budget: 300, description: 'Add a durable trash receptacle to keep our community clean.' },
    slide: { title: 'Install Playground Slide', budget: 5000, description: 'Add a fun and safe slide for children in the playground area.' },
    shelter: { title: 'Build Bus Shelter', budget: 15000, description: 'Construct a weather-protected shelter for bus riders.' },
    recycle: { title: 'Add Recycling Bin', budget: 400, description: 'Place recycling bins to promote environmental sustainability.' },
    compost: { title: 'Install Composting Bin', budget: 600, description: 'Add composting bins for organic waste management.' },
    garden: { title: 'Create Community Garden', budget: 12000, description: 'Establish a shared garden space for residents to grow vegetables and flowers.' },
    light: { title: 'Install Street Light', budget: 3500, description: 'Add lighting to improve safety and visibility in the evening.' },
    fountain: { title: 'Add Water Fountain', budget: 2500, description: 'Install a public drinking fountain for community members and visitors.' },
    bike: { title: 'Install Bike Rack', budget: 800, description: 'Add secure bike parking to encourage cycling in the community.' },
    tree: { title: 'Plant Trees', budget: 2000, description: 'Plant new trees to beautify the area and improve air quality.' }
};

document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const template = templates[e.currentTarget.getAttribute('data-template')];
        if (template) {
            document.getElementById('proposal-title').value = template.title;
            document.getElementById('proposal-budget').value = template.budget;
            document.getElementById('proposal-description').value = template.description;
            customAlert('Template applied! You can now customize the details or submit as-is.', 'Template Added');
        }
    });
});

// ===== ADMIN FUNCTION TO CLEAR ALL PROPOSALS =====
// Run this in browser console: clearAllProposals()
window.clearAllProposals = function() {
    if (confirm('Are you sure you want to delete ALL community proposals? This cannot be undone!')) {
        localStorage.removeItem('communityProposals');
        console.log('All proposals cleared from localStorage');

        // Reload the page to show empty state
        loadProposals();

        // Also reload if on browse page
        const browsePage = document.getElementById('browse-proposals-page');
        if (browsePage && browsePage.style.display === 'block') {
            loadProposalBadges();
        }

        // Close zone modal if open
        const zoneModal = document.getElementById('zone-proposals-modal');
        if (zoneModal && zoneModal.classList.contains('active')) {
            zoneModal.classList.remove('active');
        }

        alert('All proposals have been cleared!');
    }
};
