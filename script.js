const startButton = document.querySelector('[data-record-element-id="startRecording"]');
const pauseButton = document.querySelector('[data-record-element-id="pauseRecording"]');
const resumeButton = document.querySelector('[data-record-element-id="resumeRecording"]');
const stopButton = document.querySelector('[data-record-element-id="stopRecording"]');
const includeAudioCheckbox = document.querySelector('[data-record-element-id="includeAudio"]');
const recordingTimeDisplay = document.querySelector('[data-record-element-id="recordingTime"]');
const fileNameInput = document.querySelector('[data-record-element-id="fileName"]');
const addDateCheckbox = document.querySelector('[data-record-element-id="addDate"]');
const datePositionRadios = document.getElementsByName('datePosition');
const saveSettingsButton = document.querySelector('[data-record-element-id="saveSettings"]');

let mediaRecorder;
let recordedChunks = [];
let startTime;
let accumulatedTime = 0;
let recordingTimeInterval;

// Load settings from localStorage on page load
window.onload = () => {
  const settings = JSON.parse(localStorage.getItem('screenRecorderSettings'));
  if (settings) {
    includeAudioCheckbox.checked = settings.includeAudio;
    fileNameInput.value = settings.fileName;
    addDateCheckbox.checked = settings.addDate;
    document.querySelector(`input[name="datePosition"][value="${settings.datePosition}"]`).checked = true;
  }
};

// Save settings to localStorage
saveSettingsButton.addEventListener('click', () => {
  const settings = {
    includeAudio: includeAudioCheckbox.checked,
    fileName: fileNameInput.value,
    addDate: addDateCheckbox.checked,
    datePosition: document.querySelector('input[name="datePosition"]:checked').value
  };
  localStorage.setItem('screenRecorderSettings', JSON.stringify(settings));
  alert('Settings saved!');
});

startButton.addEventListener('click', async () => {
  const includeAudio = includeAudioCheckbox.checked;
  const displayMediaOptions = {
    video: { mediaSource: 'screen' },
    audio: includeAudio
  };

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

    if (includeAudio) {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = audioStream.getAudioTracks()[0];
      stream.addTrack(audioTrack);
    }

    const options = { mimeType: 'video/webm' };
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = function(event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = function() {
      clearInterval(recordingTimeInterval);
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      let fileName = fileNameInput.value || 'recorded-video';
      if (addDateCheckbox.checked) {
        const date = new Date().toISOString().replace(/[:.]/g, '-');
        if (document.querySelector('input[name="datePosition"]:checked').value === 'prefix') {
          fileName = `${date}-${fileName}`;
        } else {
          fileName = `${fileName}-${date}`;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${fileName}.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    };

    mediaRecorder.start();
    startTime = Date.now();
    accumulatedTime = 0;
    recordingTimeInterval = setInterval(updateRecordingTime, 1000);

    startButton.disabled = true;
    pauseButton.disabled = false;
    stopButton.disabled = false;
  } catch (err) {
    console.error('Error: ' + err);
  }
});

pauseButton.addEventListener('click', () => {
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    clearInterval(recordingTimeInterval);
    accumulatedTime += Date.now() - startTime;
    pauseButton.disabled = true;
    resumeButton.disabled = false;
  }
});

resumeButton.addEventListener('click', () => {
  if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    startTime = Date.now();
    recordingTimeInterval = setInterval(updateRecordingTime, 1000);
    pauseButton.disabled = false;
    resumeButton.disabled = true;
  }
});

stopButton.addEventListener('click', () => {
  if (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused') {
    mediaRecorder.stop();
    clearInterval(recordingTimeInterval);
    startButton.disabled = false;
    pauseButton.disabled = true;
    resumeButton.disabled = true;
    stopButton.disabled = true;
  }
});

function updateRecordingTime() {
  const elapsedTime = Math.floor((Date.now() - startTime + accumulatedTime) / 1000);
  recordingTimeDisplay.textContent = `Recording time: ${elapsedTime}s`;
}
