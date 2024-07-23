let chart;
let shouldStopAnalysis = false;
let ffnet;
let videoProcessor;

// // Load the ONNX model
// async function loadModel() {
//     ffnet = await ort.InferenceSession.create('ffnet.onnx');
// }

class VideoProcessor {
    constructor(video, canvas, ctx) {
        this.video = video;
        this.canvas = canvas;
        this.ctx = ctx;
        this.flashCounts = [];
        this.currentFrame = 0;
        this.totalFrames = Math.floor(video.duration * 30); // Assuming 30 fps
        this.shouldStopAnalysis = false;
    }

    async start() {
        this.video.pause();
        this.video.currentTime = 0;
        this.shouldStopAnalysis = false;
        await this.processFrames();
    }

    async processFrames() {
        while (this.currentFrame < this.totalFrames && !this.shouldStopAnalysis) {
            try {
                await Promise.race([
                    this.processNextFrame(),
                    this.checkStopSignal()
                ]);
            } catch (error) {
                if (error === 'STOP_SIGNAL') {
                    break;
                }
                console.error('Error processing frame:', error);
            }
        }
        this.displayResults();
    }

    checkStopSignal() {
        return new Promise((resolve, reject) => {
            const check = () => {
                if (this.shouldStopAnalysis) {
                    reject('STOP_SIGNAL');
                } else {
                    setTimeout(check, 100); // Check every 100ms
                }
            };
            check();
        });
    }

    async processNextFrame() {
        return new Promise((resolve) => {
            this.video.currentTime = this.currentFrame / 30;

            const onSeeked = async () => {
                this.video.removeEventListener('seeked', onSeeked);

                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                const flashes = await detectFlashes(imageData);
                this.flashCounts.push(flashes.length);
                drawFlashes(this.ctx, flashes);

                updateProgressBar(this.currentFrame / this.totalFrames);

                this.currentFrame++;
                resolve();
            };

            this.video.addEventListener('seeked', onSeeked);
        });
    }

    displayResults() {
        displayResults(this.flashCounts);
        document.getElementById('stop-button').style.display = 'none';
    }

    stop() {
        this.shouldStopAnalysis = true;
    }
}

async function analyzeVideo() {
    //const videoFile = document.getElementById('video-upload').files[0];
    if (!currentVideo) {
        alert('Please select a video file first.');
        return;
    }

    // // Ensure the model is loaded
    // if (!ffnet) {
    //     await loadModel();
    // }

    document.getElementById('stop-button').style.display = 'inline-block';

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    //video.src = URL.createObjectURL(videoFile);
    video.src = currentVideo;

    await new Promise(resolve => {
        video.onloadedmetadata = () => {
            video.onloadeddata = () => {
                displayFirstFrame(video);
                resolve();
            };
        };
    });

    const canvas = document.getElementById('video-canvas');
    const ctx = canvas.getContext('2d');

    videoProcessor = new VideoProcessor(video, canvas, ctx);
    await videoProcessor.start();

    // After processing the video (either completely or after stopping)
    const numberFlashes = videoProcessor.flashCounts;
    const m = math.mean(numberFlashes);
    const v = math.variance(numberFlashes);
    const Z = calculateZ(numberFlashes);
    const conclusion = Z > 3 ? "likely synchronous" : "unlikely synchronous";

    // Display the conclusion on top of the video
    displayConclusion(conclusion, m, v, Z);

}

function stopAnalysis() {
    if (videoProcessor) {
        videoProcessor.stop();
    }
    document.getElementById('stop-button').style.display = 'none';
}

async function detectFlashes(imageData) {
    const threshold = 150; // Adjust this value to change sensitivity
    const flashes = [];

    // Convert ImageData to Mat
    const src = cv.matFromImageData(imageData);

    // Convert to grayscale
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply threshold
    const bw = new cv.Mat();
    cv.threshold(gray, bw, threshold, 255, cv.THRESH_BINARY);

    // Find connected components
    const labels = new cv.Mat();
    const stats = new cv.Mat();
    const centroids = new cv.Mat();
    const numComponents = cv.connectedComponentsWithStats(bw, labels, stats, centroids);

    // Collect and validate centroid of each component
    for (let i = 1; i < numComponents; i++) { // Start from 1 to skip the background component
        const x = centroids.doubleAt(i, 0);
        const y = centroids.doubleAt(i, 1);
        const centroid = { x, y };
        if (await validateFlash(centroid, imageData)) {
            flashes.push(centroid);
        }
    }

    // Clean up
    src.delete();
    gray.delete();
    bw.delete();
    labels.delete();
    stats.delete();
    centroids.delete();

    return flashes;
}

async function validateFlash(centroid, imageData, ffnet) {
    if (true) {
        return true;
    } else {
        const patchSize = 65;
        const halfPatchSize = Math.floor(patchSize / 2);
        const { x, y } = { x: Math.round(centroid.x), y: Math.round(centroid.y) };

        const xmin = Math.max(0, x - halfPatchSize);
        const xmax = Math.min(imageData.width - 1, x + halfPatchSize);
        const ymin = Math.max(0, y - halfPatchSize);
        const ymax = Math.min(imageData.height - 1, y + halfPatchSize);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = patchSize;
        canvas.height = patchSize;

        // Fill the canvas with black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, patchSize, patchSize);

        const sourceWidth = xmax - xmin + 1;
        const sourceHeight = ymax - ymin + 1;
        const destX = Math.max(0, halfPatchSize - x);
        const destY = Math.max(0, halfPatchSize - y);

        // Create a temporary canvas to hold the full image data
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);

        try {
            // Draw the patch from the full image onto our small canvas
            ctx.drawImage(
                tempCanvas,
                xmin,
                ymin,
                sourceWidth,
                sourceHeight,
                destX,
                destY,
                sourceWidth,
                sourceHeight
            );
        } catch (e) {
            console.error("Error drawing the patch:", e);
            return false; // Return false if we can't draw the patch
        }

        const patch = ctx.getImageData(0, 0, patchSize, patchSize);
        const input = preprocessPatch(patch);

        // Classify patch using the ONNX model
        const feeds = { 'imageinput': new ort.Tensor('float32', input.data, input.dims) };
        const results = await ffnet.run(feeds);

        const pred = results.softmax.data;

        // Assume the model returns 1 for firefly flash and 0 for others
        return pred[1] > pred[0];
    }
}

function preprocessPatch(patch) {
    const channels = 3; // Assuming RGB
    const patchSize = 65;
    const input = new Float32Array(1 * channels * patchSize * patchSize); // Including batch size
    const data = patch.data;

    // Normalize pixel values to [0, 1] range
    for (let i = 0; i < patchSize * patchSize; i++) {
        for (let c = 0; c < channels; c++) {
            input[i * channels + c] = data[i * 4 + c] / 255.0;
        }
    }

    return {
        data: input,
        dims: [1, channels, patchSize, patchSize]
    };
}


function drawFlashes(ctx, flashes) {
    if (!Array.isArray(flashes)) {
        console.error('flashes is not an array:', flashes);
        return;
    }
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 2;

    flashes.forEach(flash => {
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, 10, 0, 2 * Math.PI);
        ctx.stroke();
    });
}

function calculateP(numberFlashes) {
    const Z = calculateZ(numberFlashes);
    const p = 1 - math.erf(Math.abs(Z));
    return p;
}

function calculateZ(numberFlashes) {
    const m = math.mean(numberFlashes);
    const s = math.std(numberFlashes);
    const n = numberFlashes.length;
    const Z = (s * s - m) * n * Math.sqrt(n - 1) / Math.sqrt(2 * n * m * (n * m - 1));
    return Z;
}

function displayConclusion(conclusion, meanFlashes, varianceFlashes, zValue) {
    const conclusionContainer = document.getElementById('conclusion-container');
    const likelyElement = document.getElementById('likely');
    const unlikelyElement = document.getElementById('unlikely');
    const meanElement = document.getElementById('mean-nf');
    const varianceElement = document.getElementById('variance-nf');
    const zElement = document.getElementById('z-value');

    if (conclusion === "likely synchronous") {
        likelyElement.classList.add('highlighted');
        unlikelyElement.classList.remove('highlighted');
    } else {
        unlikelyElement.classList.add('highlighted');
        likelyElement.classList.remove('highlighted');
    }

    meanElement.textContent = meanFlashes.toFixed(2);
    varianceElement.textContent = varianceFlashes.toFixed(2);
    zElement.textContent = zValue.toFixed(2);

    conclusionContainer.style.display = 'block';
}
