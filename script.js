let isScanning = false;
let codeReader;

// Handle option change
async function handleOptionChange() {
    const selectedOption = document.getElementById("options").value;
    const scannerDiv = document.getElementById("barcode-scanner");
    const submitBtn = document.getElementById("submit-btn");

    if (selectedOption === "ta_attendance") {
        scannerDiv.style.display = "block";
        submitBtn.style.display = "none";
        await startScanner();
    } else {
        scannerDiv.style.display = "none";
        stopScanner();
    }
}

// Start ZXing Barcode Scanner
async function startScanner() {
    if (isScanning) return; // Prevent multiple instances
    isScanning = true;

    // Initialize the ZXing Barcode reader
    codeReader = new ZXing.BrowserMultiFormatReader();

    try {
        // List video input devices
        const videoInputDevices = await codeReader.getVideoInputDevices();

        // Filter devices to find the back camera (label may contain 'back' or 'environment')
        const backCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'));

        // If no back camera is found, default to the first device
        const selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;

        console.log(`Started decoding from camera with id ${selectedDeviceId}`);

        const video = document.getElementById('video');

        // Start decoding from the video device
        const controls = await codeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, error, controls) => {
            if (result) {
                const code = result.text;
                alert("Barcode detected: " + code);

                // Stop scanning immediately after the first barcode detection
                controls.stop(); // Stop the camera feed
                isScanning = false; // Set scanning to false to allow restarting
                stopScanner(); // Ensure that video and tracks are stopped

                // Submit the detected barcode to Google Sheets
                updateToGoogleSheets(code);
            }
            if (error && !(error instanceof ZXing.NotFoundException)) {
                console.error(error);
            }
        });

        // Automatically stop the scanner after 20 seconds if no barcode is detected
        setTimeout(() => {
            controls.stop();
            isScanning = false; // Allow restarting if needed
        }, 20000);
    } catch (err) {
        console.error("Error accessing video devices:", err);
        stopScanner();
    }
}

// Stop the scanner
function stopScanner() {
    const video = document.getElementById('video');
    if (video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    isScanning = false;
}

// Function to update barcode data to Google Sheets
// Ensure this is the correct URL from your web app deployment
const webAppURL = 'https://script.google.com/macros/s/AKfycbwKdxmRFKDvtzKpScKJhviuswlB1QK3xc8NdDtKXVcmCBgv9IM5jFxyu5XI6cVSOnYoyQ/exec';

async function updateToGoogleSheets(barcode) {
    const submitBtn = document.getElementById("submit-btn");

    const data = {
        barcode: barcode,
        timestamp: new Date().toISOString()
    };

    console.log("Sending data to Google Sheets:", data); // Debugging log

    try {
        const response = await fetch(webAppURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        console.log("Response received:", response);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Data updated to Google Sheets:", result);

        alert('Barcode submitted successfully!');
        submitBtn.style.display = "block"; // Show Submit button if needed

    } catch (error) {
        console.error('Error updating to Google Sheets:', error);
        alert('Failed to submit barcode. Check your connection or Apps Script.');
    }
}