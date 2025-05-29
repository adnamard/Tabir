import { Hands } from '@mediapipe/hands';
import * as tf from '@tensorflow/tfjs';

const IMAGE_SIZE = 224;
const CLASS_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
    'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
    'W', 'X', 'Y', 'Z', 'del', 'blank', 'space'];

const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [0, 5], [5, 9], [9, 13], [13, 17],
];

class SignDetector {
    constructor() {
        this.model = null;
        this.hands = null;
        this.predQueue = [];
        this.PRED_QUEUE_MAXLEN = 5;
        this.lastStableLabel = "";
        this.isDetecting = false;
        this.onResultCallback = null;
        this.processingFrame = false;
        this.lastProcessingTime = Date.now();
        this.processingInterval = 100;
        this.confidenceThreshold = 0.7;
    }

    async initialize() {
        try {
            // Enable memory management
            if (tf.env().get('WEBGL_VERSION') === 2) {
                tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
                tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
            }

            // Load TensorFlow.js model
            this.model = await tf.loadGraphModel('./models/model.json');

            // Warmup the model with a small tensor
            const dummyTensor = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
            const inputs = { 'keras_tensor_1766': dummyTensor };
            const result = this.model.execute(inputs);
            tf.dispose([dummyTensor, result]);

            // Initialize MediaPipe Hands with optimized settings
            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 0, // Use simpler model (0 = Lite, 1 = Full)
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => this.onHandsResults(results));

            return true;
        } catch (error) {
            console.error('Error initializing SignDetector:', error);
            return false;
        }
    }

    setResultCallback(callback) {
        this.onResultCallback = callback;
    }

    async processFrame(videoElement, canvasElement) {
        if (!this.isDetecting || !this.hands || !this.model || this.processingFrame) return;

        const now = Date.now();
        if (now - this.lastProcessingTime < this.processingInterval) return;

        try {
            this.processingFrame = true;
            this.lastProcessingTime = now;

            // Create a temporary canvas to downscale the video
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 640; // Reduced size
            tempCanvas.height = 480; // Reduced size
            const tempCtx = tempCanvas.getContext('2d');

            // Draw the video frame at a smaller size
            tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);

            // Process the downscaled frame
            await this.hands.send({ image: tempCanvas });

            // Clean up
            tempCanvas.remove();

        } catch (error) {
            console.error('Error processing frame:', error);
        } finally {
            this.processingFrame = false;

            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
        }
    }

    async onHandsResults(results) {
        if (!results.multiHandLandmarks?.length) return;

        const landmarks = results.multiHandLandmarks[0];
        const videoElement = document.querySelector('#previewPlayer');
        const canvasElement = document.querySelector('#detectionCanvas');
        const canvasCtx = canvasElement.getContext('2d');

        // Clear canvas
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Calculate bounding box
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        landmarks.forEach(landmark => {
            const x = landmark.x * canvasElement.width;
            const y = landmark.y * canvasElement.height;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        // Add margin to bounding box
        const margin = 20;
        minX = Math.max(0, minX - margin);
        minY = Math.max(0, minY - margin);
        maxX = Math.min(canvasElement.width, maxX + margin);
        maxY = Math.min(canvasElement.height, maxY + margin);

        try {
            // Draw bounding box
            canvasCtx.strokeStyle = '#00ff00';
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeRect(minX, minY, maxX - minX, maxY - minY);

            // Draw hand landmarks and connections
            canvasCtx.fillStyle = '#ff0000';
            landmarks.forEach(landmark => {
                const x = landmark.x * canvasElement.width;
                const y = landmark.y * canvasElement.height;
                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
                canvasCtx.fill();
            });

            canvasCtx.strokeStyle = '#00ff00';
            canvasCtx.lineWidth = 2;
            HAND_CONNECTIONS.forEach(([i, j]) => {
                const start = landmarks[i];
                const end = landmarks[j];
                canvasCtx.beginPath();
                canvasCtx.moveTo(start.x * canvasElement.width, start.y * canvasElement.height);
                canvasCtx.lineTo(end.x * canvasElement.width, end.y * canvasElement.height);
                canvasCtx.stroke();
            });

            // Get prediction if enough time has passed
            if (this.isDetecting && Date.now() - this.lastProcessingTime >= this.processingInterval) {
                const prediction = await this.getPrediction(videoElement, landmarks);
                if (prediction) {
                    this.predQueue.push(prediction);
                    if (this.predQueue.length > this.PRED_QUEUE_MAXLEN) {
                        this.predQueue.shift();
                    }

                    const stablePrediction = this.getStablePrediction();
                    if (stablePrediction && this.onResultCallback) {
                        this.onResultCallback(stablePrediction);
                    }
                }
            }
        } catch (error) {
            console.error('Error in onHandsResults:', error);
        }
    }

    async getPrediction(videoElement, landmarks) {
        try {
            // Extract hand region
            const { handImage, bbox } = this.extractHandRegion(videoElement, landmarks);
            if (!handImage) return null;

            // Preprocess image for model
            const tensor = tf.tidy(() => {
                return tf.browser.fromPixels(handImage)
                    .resizeBilinear([IMAGE_SIZE, IMAGE_SIZE])
                    .expandDims(0)
                    .div(255.0);
            });

            // Get prediction
            const inputs = { 'keras_tensor_1766': tensor };
            const prediction = await this.model.execute(inputs);
            const probabilities = await prediction.data();
            const maxProb = Math.max(...probabilities);
            const classIndex = probabilities.indexOf(maxProb);

            // Cleanup
            tf.dispose([tensor, prediction]);
            handImage.remove();

            // Only return prediction if confidence is high enough
            return maxProb >= this.confidenceThreshold ? CLASS_NAMES[classIndex] : null;
        } catch (error) {
            console.error('Error getting prediction:', error);
            return null;
        }
    }

    extractHandRegion(videoElement, landmarks) {
        const margin = 25;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        // Find bounding box
        landmarks.forEach(landmark => {
            const x = landmark.x * videoElement.videoWidth;
            const y = landmark.y * videoElement.videoHeight;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        // Add margin
        minX = Math.max(0, minX - margin);
        minY = Math.max(0, minY - margin);
        maxX = Math.min(videoElement.videoWidth, maxX + margin);
        maxY = Math.min(videoElement.videoHeight, maxY + margin);

        const width = maxX - minX;
        const height = maxY - minY;

        if (width <= 0 || height <= 0) return { handImage: null, bbox: null };

        // Create temporary canvas for extraction
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            videoElement,
            minX, minY, width, height,
            0, 0, width, height
        );

        return {
            handImage: canvas,
            bbox: { x: minX, y: minY, width, height }
        };
    }

    getStablePrediction() {
        if (this.predQueue.length < this.PRED_QUEUE_MAXLEN) return null;

        const counts = {};
        this.predQueue.forEach(pred => {
            counts[pred] = (counts[pred] || 0) + 1;
        });

        // Require at least 60% agreement for a stable prediction
        const threshold = Math.floor(this.PRED_QUEUE_MAXLEN * 0.6);
        for (const [pred, count] of Object.entries(counts)) {
            if (count >= threshold && pred !== this.lastStableLabel) {
                this.lastStableLabel = pred;
                return pred;
            }
        }

        return null;
    }

    start() {
        this.isDetecting = true;
        this.predQueue = [];
        this.lastStableLabel = "";
        this.processingFrame = false;
        this.lastProcessingTime = 0;
    }

    stop() {
        this.isDetecting = false;
        this.predQueue = [];
        this.lastStableLabel = "";
        this.processingFrame = false;

        // Force cleanup
        if (this.model) {
            tf.dispose(this.model);
        }
        tf.disposeVariables();
    }
}

export default SignDetector; 