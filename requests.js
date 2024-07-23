let currentVideo = null;

function displayFirstFrame(videoElement) {
    const canvas = document.getElementById('video-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
}

function loadPresetVideo(preset) {
    if (preset === 'TN') {
        currentVideo = 'ffmovsampleTN.MOV'; // Replace with actual path
    } else if (preset === 'KY') {
        currentVideo = 'ffmovsampleKY.MOV'; // Replace with actual path
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous'; // Add this line
    video.src = currentVideo;
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true;
    video.onloadedmetadata = () => {
        video.onloadeddata = () => {
            displayFirstFrame(video);
        };
    };

    showProcessingButtons();
}

// Event listener for file input change
document.getElementById('video-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        currentVideo = URL.createObjectURL(file);
        
        const video = document.createElement('video');
        //video.src = URL.createObjectURL(file);
        video.src = currentVideo;
        video.onloadedmetadata = () => {
            video.onloadeddata = () => {
                displayFirstFrame(video);
            };
        };
    }
});


document.getElementById('video-upload').addEventListener('change', function() {
    showProcessingButtons();
});

function showProcessingButtons() {
    document.getElementById('initial-buttons').style.display = 'none';
    document.getElementById('processing-buttons').style.display = 'block';
}

function updateProgressBar(progress) {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${progress * 100}%`;
    progressBar.textContent = `${Math.round(progress * 100)}%`;
}
