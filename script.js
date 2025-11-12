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

// Track when overlay animation starts (at 11.3s)
let animationActive = false;
setTimeout(() => {
    animationActive = true;
    document.querySelectorAll('.clickable-point').forEach(point => {
        point.classList.add('animation-active');
    });
}, 11300);

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
        // Only alert if not dragging
        if (e.detail === 1) {
            alert(`Point ${i} clicked! Add your action here.`);
        }
    });
}

// Handle video playback for all points with videos
const videoPoints = [1, 2, 6, 7, 9, 10, 11, 14, 15];

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
