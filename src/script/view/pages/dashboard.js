import TabirIdb from '../../utils/db';
import SignDetector from '../../utils/signDetector';

const Dashboard = {
    async render() {
        return `
            <div class="min-h-screen bg-[#FAF5E5]">
                <!-- Header/Navbar -->
                <header class="bg-white shadow">
                    <nav class="container mx-auto px-4 py-4 flex justify-between items-center">
                        <a href="#" class="w-36 md:w-40">
                            <img src="../img/logo-tabir.png" alt="Logo" />
                        </a>
                        <div class="flex items-center gap-4">
                            <button id="logoutBtn" class="text-[#013366] hover:text-[#4A708B]">Logout</button>
                        </div>
                    </nav>
                </header>

                <!-- Main Content -->
                <main class="container mx-auto px-4 py-8">
                    <div class="bg-white rounded-lg shadow p-6">
                        <h1 class="text-2xl font-bold text-[#013366] mb-6">Welcome to Your Dashboard</h1>
                        
                        <!-- Quick Actions -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div class="bg-[#4A708B] text-white p-6 rounded-lg">
                                <h2 class="text-xl font-semibold mb-2">Upload Video</h2>
                                <p class="mb-4">Upload a pre-recorded video for sign language interpretation</p>
                                <div class="space-y-4">
                                    <input type="file" id="videoUpload" accept="video/*" class="hidden" />
                                    <label for="videoUpload" 
                                        class="inline-block bg-white text-[#4A708B] px-4 py-2 rounded cursor-pointer hover:bg-gray-100 transition-colors">
                                        Choose Video
                                    </label>
                                    <div id="uploadStatus" class="text-sm hidden">
                                        <p class="file-name"></p>
                                        <div class="progress-bar w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                            <div class="progress bg-white h-2.5 rounded-full" style="width: 0%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-[#7A8052] text-white p-6 rounded-lg">
                                <h2 class="text-xl font-semibold mb-2">Live Camera</h2>
                                <p class="mb-4">Use your camera for real-time sign language interpretation</p>
                                <button id="startCamera" class="bg-white text-[#7A8052] px-4 py-2 rounded hover:bg-gray-100 transition-colors">
                                    Start Camera
                                </button>
                            </div>
                        </div>

                        <!-- Video Preview and Detection -->
                        <div id="videoPreview" class="hidden mb-8">
                            <h2 class="text-xl font-semibold text-[#013366] mb-4">Video Preview</h2>
                            <div class="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                <video id="previewPlayer" class="w-full h-full object-contain" playsinline></video>
                                <canvas id="detectionCanvas" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
                            </div>
                            <div class="mt-4">
                                <h3 class="font-semibold text-[#013366] mb-2">Detected Signs</h3>
                                <div id="detectionResults" class="p-4 bg-gray-50 rounded-lg min-h-[50px]">
                                    <p class="text-gray-600">No signs detected yet...</p>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Activity -->
                        <div class="bg-gray-50 p-6 rounded-lg">
                            <h2 class="text-xl font-semibold text-[#013366] mb-4">Recent Activity</h2>
                            <div id="activityList" class="space-y-4">
                                <p class="text-gray-600">No recent activity to show.</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `;
    },

    async afterRender() {
        let signDetector = null;
        let currentStream = null;
        let animationFrameId = null;

        const logoutBtn = document.getElementById('logoutBtn');
        const videoUpload = document.getElementById('videoUpload');
        const uploadStatus = document.getElementById('uploadStatus');
        const videoPreview = document.getElementById('videoPreview');
        const previewPlayer = document.getElementById('previewPlayer');
        const startCameraBtn = document.getElementById('startCamera');
        const activityList = document.getElementById('activityList');
        const detectionResults = document.getElementById('detectionResults');
        const detectionCanvas = document.getElementById('detectionCanvas');

        // Initialize sign detector
        signDetector = new SignDetector();
        await signDetector.initialize();

        // Set up detection result callback
        signDetector.setResultCallback((prediction) => {
            const detectionResults = document.getElementById('detectionResults');

            // Clear the "No signs detected yet..." message if it's there
            if (detectionResults.querySelector('p')?.textContent === 'No signs detected yet...') {
                detectionResults.innerHTML = '';
            }

            // Create and add the new prediction tag
            const resultElement = document.createElement('span');
            resultElement.className = 'inline-block bg-[#013366] text-white px-3 py-1 rounded-full text-sm mr-2 mb-2';
            resultElement.textContent = prediction;

            // Add to the beginning of the results
            if (detectionResults.firstChild) {
                detectionResults.insertBefore(resultElement, detectionResults.firstChild);
            } else {
                detectionResults.appendChild(resultElement);
            }

            // Keep only the last 10 predictions
            while (detectionResults.children.length > 10) {
                detectionResults.removeChild(detectionResults.lastChild);
            }

            // Add to activity list
            const activity = document.createElement('div');
            activity.className = 'flex items-center justify-between p-4 bg-white rounded-lg shadow mb-2';
            activity.innerHTML = `
                <div>
                    <h3 class="font-semibold text-[#013366]">Sign Detected</h3>
                    <p class="text-sm text-gray-600">Detected sign: ${prediction}</p>
                </div>
                <span class="text-[#013366]">🤚</span>
            `;

            if (activityList.firstChild.textContent === 'No recent activity to show.') {
                activityList.innerHTML = '';
            }
            activityList.insertBefore(activity, activityList.firstChild);
        });

        const stopCamera = () => {
            // Stop detection
            if (signDetector) {
                signDetector.stop();
            }

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            // Stop all video tracks
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
                currentStream = null;
            }
            if (previewPlayer) {
                previewPlayer.srcObject = null;
            }

            // Clear canvas
            if (detectionCanvas) {
                const ctx = detectionCanvas.getContext('2d');
                ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
            }

            // Hide video preview
            if (videoPreview) {
                videoPreview.classList.add('hidden');
            }

            // Reset detection results
            if (detectionResults) {
                detectionResults.innerHTML = '<p class="text-gray-600">No signs detected yet...</p>';
            }

            // Reset button
            if (startCameraBtn) {
                startCameraBtn.textContent = 'Start Camera';
                startCameraBtn.className = 'bg-white text-[#7A8052] px-4 py-2 rounded hover:bg-gray-100 transition-colors';
            }
        };

        // Logout handler
        logoutBtn?.addEventListener('click', () => {
            stopCamera();
            localStorage.removeItem('auth_token');
            window.location.hash = '#/';
        });

        // Camera handler
        startCameraBtn?.addEventListener('click', async () => {
            if (startCameraBtn.textContent === 'Stop Camera') {
                stopCamera();
                return;
            }

            try {
                // Change button text to show loading state
                startCameraBtn.textContent = 'Starting...';
                startCameraBtn.disabled = true;

                currentStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                previewPlayer.srcObject = currentStream;
                videoPreview.classList.remove('hidden');

                // Clear any previous detection results
                detectionResults.innerHTML = '<p class="text-gray-600">No signs detected yet...</p>';

                // Wait for video metadata to load before setting canvas size
                await new Promise((resolve) => {
                    previewPlayer.onloadedmetadata = () => {
                        previewPlayer.play();
                        resolve();
                    };
                });

                // Set up canvas size
                detectionCanvas.width = previewPlayer.videoWidth;
                detectionCanvas.height = previewPlayer.videoHeight;

                // Start detection immediately
                signDetector.start();

                // Change button text to "Stop Camera" and update its behavior
                startCameraBtn.textContent = 'Stop Camera';
                startCameraBtn.className = 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors';
                startCameraBtn.disabled = false;

                // Create detection loop
                function detectFrame() {
                    if (previewPlayer && !previewPlayer.paused && !previewPlayer.ended) {
                        signDetector.processFrame(previewPlayer, detectionCanvas);
                        animationFrameId = requestAnimationFrame(detectFrame);
                    }
                }
                detectFrame();

            } catch (error) {
                console.error('Camera error:', error);
                alert('Could not access camera: ' + error.message);
                stopCamera();
            }
        });

        // File upload handler
        videoUpload?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Show upload status
            uploadStatus.classList.remove('hidden');
            uploadStatus.querySelector('.file-name').textContent = file.name;

            // Show video preview
            const videoURL = URL.createObjectURL(file);
            previewPlayer.src = videoURL;
            videoPreview.classList.remove('hidden');

            // Set up canvas size when video metadata is loaded
            previewPlayer.onloadedmetadata = () => {
                detectionCanvas.width = previewPlayer.videoWidth;
                detectionCanvas.height = previewPlayer.videoHeight;
            };

            // Start detection when video plays
            previewPlayer.onplay = () => {
                signDetector.start();
                function detectFrame() {
                    if (!previewPlayer.paused && !previewPlayer.ended) {
                        signDetector.processFrame(previewPlayer, detectionCanvas);
                        requestAnimationFrame(detectFrame);
                    }
                }
                detectFrame();
            };

            try {
                const token = localStorage.getItem('auth_token');
                if (!token) throw new Error('No authentication token found');

                const response = await fetch('YOUR_UPLOAD_ENDPOINT', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });

                const result = await response.json();

                if (response.ok) {
                    // Add to activity list
                    const activity = document.createElement('div');
                    activity.className = 'flex items-center justify-between p-4 bg-white rounded-lg shadow';
                    activity.innerHTML = `
                        <div>
                            <h3 class="font-semibold text-[#013366]">${file.name}</h3>
                            <p class="text-sm text-gray-600">Uploaded successfully</p>
                        </div>
                        <span class="text-green-500">✓</span>
                    `;

                    if (activityList.firstChild.textContent === 'No recent activity to show.') {
                        activityList.innerHTML = '';
                    }
                    activityList.insertBefore(activity, activityList.firstChild);
                } else {
                    throw new Error(result.message || 'Upload failed');
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Failed to upload video: ' + error.message);
                uploadStatus.classList.add('hidden');
            }
        });
    },
};

export default Dashboard; 