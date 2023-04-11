
const uploadForm = document.getElementById('uploadForm');
const videoInput = document.getElementById('videoInput');
const uploadedVideo = document.getElementById('uploadedVideo');
const videoCanvas = document.getElementById('videoCanvas');
const canvasContext = videoCanvas.getContext('2d');

const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdLabel = document.getElementById('thresholdLabel');
let threshold = Math.round(thresholdSlider.value); //is that line necessary?

thresholdSlider.addEventListener('input', () => {
  const value = Math.round(thresholdSlider.value);
  thresholdValue.textContent = value;
  threshold = value;
});



let numberFlashes = [];
//let numberFlashesCorrected;
const chartCanvas = document.getElementById('chartCanvas');
const chartContext = chartCanvas.getContext('2d');
const chart = new Chart(chartContext, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'number of flashes per frame',
      data: numberFlashes,
      borderColor: 'rgba(255, 99, 132, 1)', // Change the curve color to a distinctive color
      tension: 0.1,
    }],
  },
  options: {
    scales: {
      x: {
        type: 'linear',
        min: 0,
        grid: {
          color: (context) => context.tick.value === 0 ? '#ffe680' : 'transparent', // Show only x=0 grid line
        },
        title: {
          display: true,
          text: 'time (seconds)',
          color: '#ffe680',
          font: {
            size: 14,
          },
        },
        ticks: {
          stepSize: 1,
          autoSkip: false,
          maxRotation: 0,
          color: '#ffe680',
          font: {
            size: 14,
          },
          callback: function(value, index, values) {
            return value.toFixed(0);
          },
        },
      },
      y: {
        grid: {
          color: (context) => context.tick.value === 0 ? '#ffe680' : 'transparent', // Show only x=0 grid line
        },
        title: {
          display: true,
          text: 'number of flashes',
          color: '#ffe680',
          font: {
            size: 14,
          },
        },
        ticks: {
          color: '#ffe680',
          font: {
            size: 14,
          },
        },
      },
    },
  },
});





// uploadForm.addEventListener('submit', async (event) => {
//   event.preventDefault();
//
//   if (videoInput.files.length === 0) {
//     alert('Please select a video file.');
//     return;
//   }
//
//   const fileURL = URL.createObjectURL(videoInput); //.files[0]);
//   uploadedVideo.src = fileURL;
//
//   uploadedVideo.onloadedmetadata = () => {
//     videoCanvas.width = uploadedVideo.videoWidth;
//     videoCanvas.height = uploadedVideo.videoHeight;
//     readFrames(uploadedVideo, videoCanvas, canvasContext);
//     uploadedVideo.play(); // Add this line
//   };
// });

document.addEventListener('DOMContentLoaded', () => {
    const userMovieInput = document.getElementById('user-movie');
    const testMovieBtnKY = document.getElementById('test-movie-ky');
    const testMovieBtnTN = document.getElementById('test-movie-tn');
    const movieForm = document.getElementById('movie-form');
    let selectedMovie = null;

    userMovieInput.addEventListener('change', (event) => {
        if (event.target.files && event.target.files[0]) {
            selectedMovie = event.target.files[0];
        }
    });

    testMovieBtnKY.addEventListener('click', () => {
        fetch('ffmovsampleKY.MOV')
            .then((response) => response.blob())
            .then((blob) => {
                selectedMovie = new File([blob], 'ffmovsampleKY.MOV', { type: 'video/quicktime' });

                testMovieBtnKY.style.backgroundColor = 'green';
            })
            .catch((error) => {
                console.error('Error fetching test.mp4:', error);
            });
    });

    testMovieBtnTN.addEventListener('click', () => {
        fetch('ffmovsampleTN.MOV')
            .then((response) => response.blob())
            .then((blob) => {
                selectedMovie = new File([blob], 'ffmovsampleTN.MOV', { type: 'video/quicktime' });

                testMovieBtnTN.style.backgroundColor = 'green';
            })
            .catch((error) => {
                console.error('Error fetching test.mp4:', error);
            });
    });

    // movieForm.addEventListener('submit', (event) => {
    //     event.preventDefault();
    //     if (!selectedMovie) {
    //         alert('Please select a movie before processing.');
    //         return;
    //     }
    //
    //     // Process the selected movie using your JavaScript logic
    //     processMovie(selectedMovie);

        uploadForm.addEventListener('submit', async (event) => {
          event.preventDefault();

          if (!selectedMovie) {
            alert('Please select a video file.');
            return;
          }

          const fileURL = URL.createObjectURL(selectedMovie); //.files[0]);
          uploadedVideo.src = fileURL;

          const processButton = document.getElementById('submit-btn'); ///

          uploadedVideo.onloadedmetadata = () => {
            videoCanvas.width = uploadedVideo.videoWidth;
            videoCanvas.height = uploadedVideo.videoHeight;

            processButton.style.backgroundColor = 'orange'; ///

            readFrames(uploadedVideo, videoCanvas, canvasContext);
            // uploadedVideo.play(); // Add this line
          };
        });

});


function readFrames(video, canvas, ctx) {
  let processing = false;
  const fps = video.getAttribute('fps') || 30;

  video.addEventListener('timeupdate', function onTimeUpdate() {
    if (processing) {
      return;
    }


    processing = true;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const processedCanvas = document.getElementById('processedCanvas');
    const processedContext = processedCanvas.getContext('2d');
    processedCanvas.width = canvas.width;
    processedCanvas.height = canvas.height;
    processedContext.drawImage(canvas, 0, 0);


    const frameImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const [brightSpots, coordinates] = processFrame(frameImageData,threshold);
    numberFlashes.push(brightSpots);

    const processedImageData = processedContext.getImageData(0, 0, canvas.width, canvas.height);
    drawBlobs(coordinates);


    if (video.currentTime < video.duration) {
      video.currentTime += 1 / fps; // Read the next frame (assuming 30fps)
      processing = false;
    } else {
      video.removeEventListener('timeupdate', onTimeUpdate);

      processedCanvas.remove();

      //let numberFlashesCorrected = correctFlashes(numberFlashes,Math.round(fps));
      correctFlashes(numberFlashes,Math.round(fps));

      updateChart();
      // downloadFile();
      const Z = calculateZ(numberFlashes);
      console.log(Z);
    }
  });

  video.currentTime = 0; // Start reading frames from the beginning
}


function processFrame(imageData, threshold) {
  // Convert the imageData to a Mat object
  const mat = cv.matFromImageData(imageData);

  // Convert to grayscale
  cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);

  // Apply Gaussian blur
  cv.GaussianBlur(mat, mat, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);

  // Apply thresholding
  cv.threshold(mat, mat, threshold, 255, cv.THRESH_BINARY);

  // Count the number of bright spots
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(mat, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
  const brightSpots = contours.size();

  const coordinates = [];
   for (let i = 0; i < brightSpots; i++) {
     const moments = cv.moments(contours.get(i));
     const centerX = Math.round(moments.m10 / moments.m00);
     const centerY = Math.round(moments.m01 / moments.m00);
     coordinates.push([centerX, centerY]);
     //console.log(coordinates);
   }

  // Free memory
  contours.delete();
  hierarchy.delete();
  mat.delete();

  return [brightSpots, coordinates];
}

// function correctFlashes(numberFlashes, k) {
//   const n = numberFlashes.length;
//   const numberFlashesCorrected = new Array(n).fill(0);
//   const halfWindow = Math.floor(k / 2);
//
//   for (let i = 0; i < n; i++) {
//     // Compute the minimum value within the sliding window
//     let mv = Infinity;
//     for (let j = Math.max(0, i - halfWindow); j <= Math.min(n - 1, i + halfWindow); j++) {
//       mv = Math.min(mv, numberFlashes[j]);
//     }
//
//     // Subtract the minimum value from the current frame
//     numberFlashesCorrected[i] = 1; //numberFlashes[i] - mv;
//   }
//   //console.log(numberFlashesCorrected)
//   return numberFlashesCorrected;
// }

function correctFlashes(numberFlashes, k) {
  const n = numberFlashes.length;
  const halfWindow = Math.floor(k / 2);
  const baseline = new Array(n).fill(0);

  for (let i = halfWindow; i < n - halfWindow; i++) {
    const windowStart = i - halfWindow;
    const windowEnd = i + halfWindow;
    const windowMin = Math.min(...numberFlashes.slice(windowStart, windowEnd + 1));
    baseline[i] = windowMin;
  }

  for (let i = 0; i < n; i++) {
    numberFlashes[i] -= baseline[i];
  }

  //return numberFlashes;
}



// function updateChart() {
//   const fps = uploadedVideo.getAttribute('fps') || 30;
//   const numSeconds = Math.ceil(uploadedVideo.duration);
//   //chart.options.scales.x.ticks = Array.from(Array(numSeconds + 1).keys());
//   chart.data.labels = numberFlashes.map((_, index) => Math.round((index + 1) / fps * 10) / 10);
//   chart.update();
// }

// function updateChart() {
//   const fps = uploadedVideo.getAttribute('fps') || 30;
//   const numSeconds = Math.ceil(uploadedVideo.duration);
//   const tolerance = 1 / (2 * fps); // Half a frame duration as tolerance
//
//   chart.data.labels = numberFlashes.map((_, index) => {
//     const currentTime = (index + 1) / fps;
//     const nearestSecond = Math.round(currentTime);
//
//     if (Math.abs(currentTime - nearestSecond) <= tolerance) {
//       return nearestSecond;
//     } else {
//       return '';
//     }
//   });
//
//   chart.update();
// }

// function updateChart() {
//   const fps = uploadedVideo.getAttribute('fps') || 30;
//   const numSeconds = Math.ceil(uploadedVideo.duration);
//
//   const labels = [];
//   for (let i = 0; i < numberFlashes.length; i++) {
//     const currentTime = i / fps;
//     const nearestSecond = Math.round(currentTime);
//     if (Math.abs(currentTime - nearestSecond) < 0.5 / fps) {
//       labels.push(nearestSecond);
//     } else {
//       labels.push('');
//     }
//   }
//
//   chart.data.labels = labels;
//
//   chart.update();
// }

// function updateChart() {
//   const fps = uploadedVideo.getAttribute('fps') || 30;
//   const numSeconds = Math.ceil(uploadedVideo.duration);
//
//   chart.data.labels = numberFlashes.map((_, index) => index / fps);
//
//   // Update the chart options
//   chart.options.scales.x = {
//     type: 'linear',
//     min: 0,
//     max: numSeconds,
//     ticks: {
//       stepSize: 1,
//       autoSkip: false,
//       maxRotation: 0,
//       callback: function(value, index, values) {
//         return value.toFixed(0);
//       }
//     }
//   };
//
//   chart.update();
// }

function updateChart() {
  const fps = uploadedVideo.getAttribute('fps') || 30;
  const numSeconds = Math.ceil(uploadedVideo.duration);

  chart.data.labels = numberFlashes.map((_, index) => index / fps);
  chart.update();
}



















// function updateChart() {
//   const fps = uploadedVideo.getAttribute('fps') || 30;
//   const numSeconds = Math.ceil(uploadedVideo.duration);
//   chart.options.scales.x.ticks = Array.from(Array(numSeconds + 1).keys());
//   chart.options.scales.x.stepSize = 1;
//   chart.data.labels = chart.options.scales.x.ticks.map((val) => val + "s");
//   chart.update();
//   console.log(5);
// }










// const math = require('mathjs');

function calculateP(numberFlashes) {


  const Z = calculateZ(numberFlashes);

  // Calculate the complementary error function of the absolute value of Z
  const p = 1-math.erf(Math.abs(Z));

  // const pValueElement = document.getElementById('p-value');
  // pValueElement.innerText = Z;

  return p; //p;

}

function calculateZ(numberFlashes) {
  // Calculate the mean and standard deviation of the array
  const m = math.mean(numberFlashes);
  const s = math.std(numberFlashes);

  // Calculate the value of Z using a placeholder function
  const n = numberFlashes.length;

  const Z = (s*s - m)*n*math.sqrt(n-1)/math.sqrt(2*n*m*(n*m-1));

  const testValueElement = document.getElementById('test-value');
  if (Math.abs(Z) > 2) {
    testValueElement.textContent = 'probably synchronous';
  } else {
    testValueElement.textContent = 'unlikely to be synchronous';
  }

  // Display the mean and variance
  const meanElement = document.getElementById('mean-nf');
  const varianceElement = document.getElementById('variance-nf');
  const zElement = document.getElementById('z-value');

  meanElement.textContent = m.toFixed(2); // Display the mean with 2 decimal places
  varianceElement.textContent = (s * s).toFixed(2); // Display the variance with 2 decimal places
  zElement.textContent = Z.toFixed(2);

  return Z;
}


function drawBlobs(coordinates) {

  const processedCanvas = document.getElementById('processedCanvas');
  const ctx = processedCanvas.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 4;

  for (let i = 0; i < coordinates.length; i++) {

    const x = coordinates[i][0];
    const y = coordinates[i][1];
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, 2 * Math.PI);
    ctx.stroke();

  }

}




// function loadTestVideo() {
//     const videoInput = document.getElementById('videoInput');
//     const file = new File(['testmov/'], 'ffmovsampleKY.MOV');
//     videoInput.files = [file];
//
//     console.log(videoInput.files);
// }

// function loadTestVideo() {
//   const videoInput = document.getElementById('videoInput');
//   videoInput.value = "ffmovsampleKY.MOV";
//   // const file = new File([""], "ffmovsampleKY.MOV", { type: "video/mov" });
//   // const fileList = new FileList();
//   // fileList.add(file);
//   // videoInput.files = fileList;
// }

async function loadTestVideo() {
  try {
    const response = await fetch('ffmovsampleKY.MOV');
    const blob = await response.blob();
    videoInput = new File([blob], 'ffmovsampleKY.MOV', { type: 'video/quicktime' });
  } catch (error) {
    console.error('Error fetching test.mp4:', error);
  }
}





// function loadTestVideo() {
//   const videoInput = document.getElementById('videoInput');
//   const file = new File(['ffmovsampleKY.MOV'], 'ffmovsampleKY.MOV', { type: 'video/quicktime' });
//   const fileList = new FileList();
//   fileList.append(file);
// Object.defineProperty(videoInput, 'files', {
//   value: fileList,
//   writable: false,
// });

//   console.log(videoInput.files);
// }






// function downloadFile() {
//   const data = meanIntensities.join('\n');
//   const blob = new Blob([data], { type: 'text/plain' });
//   const url = URL.createObjectURL(blob);
//   const link = document.createElement('a');
//   link.href = url;
//   link.download = 'mean_intensities.txt';
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(url);
// }


function highlightTarget(targetId) {
  const target = document.getElementById(targetId);

  if (target) {
    target.classList.add("highlight");

    setTimeout(function () {
      target.classList.remove("highlight");
    }, 2000); // Remove the highlight after 2000 milliseconds (2 seconds)
  }
}

window.addEventListener("hashchange", function (event) {
  const targetId = window.location.hash.substring(1); // Remove the '#' from the hash
  highlightTarget(targetId);
});

const links = document.querySelectorAll(".highlight-link");

links.forEach((link) => {
  link.addEventListener("click", function (event) {
    const targetId = this.getAttribute("href").substring(1); // Remove the '#' from the href
    highlightTarget(targetId);
  });
});
