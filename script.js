import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.mjs";

let currentBackground = null;

// Сохранение данных
function saveUserDynamic() {
    const btn = document.getElementById('saveUserBtn');

    btn.addEventListener('click', () => {
        const full_name = document.getElementById('full_name').value;
        const position = document.getElementById('position').value;
        const company = document.getElementById('company').value;
        const department = document.getElementById('department').value;
        const office_location = document.getElementById('office_location').value;
        const email = document.getElementById('email').value;
        const telegram = document.getElementById('telegram').value;

        if (!full_name || !position || !company || !email) {
            alert('Пожалуйста, заполните все обязательные поля.');
            return;
        }

        const user = {
            "employee": {
                full_name,
                position,
                company,
                department,
                office_location,
                contact: { email, telegram },
                branding: {
                    logo_url: "",
                    corporate_colors: { primary: "#0052CC", secondary: "#00B8D9" },
                    slogan: ""
                },
                privacy_level: "medium"
            }
        };

        // Загружаем текущих пользователей из localStorage
        let users = JSON.parse(localStorage.getItem('users')) || {};
        users[email] = user; // ключ — email для уникальности
        localStorage.setItem('users', JSON.stringify(users));

        alert('Пользователь сохранен!');
        console.log('Все пользователи:', users);
    });
}

// Генерация случайного паттерна
function generateRandomColorBackground(width = 640, height = 480) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Генерация случайного цвета
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    ctx.fillRect(0, 0, width, height);

    return canvas.toDataURL();
}


// Галерея фонов
function setupGallery() {
    const videoWrapper = document.querySelector('.video-wrapper');
    const gallery = document.getElementById('bgGallery');

    const backgrounds = [
        generateRandomColorBackground(),
        generateRandomColorBackground(),
        generateRandomColorBackground(),
        generateRandomColorBackground()
    ];

    backgrounds.forEach((bg, index) => {
        const img = document.createElement('img');
        img.src = bg;
        img.title = `Фон ${index + 1}`;
        img.addEventListener('click', () => {
            currentBackground = bg;
        });
        gallery.appendChild(img);
    });

    currentBackground = backgrounds[0];
}

// Запуск камеры
async function startCamera() {
    try {
        const constraints = { video: true, audio: false };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.getElementById('video');
        videoElement.srcObject = stream;
        await videoElement.play();
        console.log("Камера запущена", video);
        return videoElement;
    } catch (err) {
        console.error('Ошибка доступа к камере:', err);
    }
}

// ONNX сегментация человека apple/deeplabv3-mobilevit-small
async function loadSegmentationModel(modelUrl) {
    const session = await ort.InferenceSession.create(modelUrl);
    console.log("Модель загружена", session);
    return session;
}

function getTestMask(width = 512, height = 512) {
    const t0 = performance.now();
    const personMask = new Uint8ClampedArray(width * height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 4;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const index = y * width + x;
            personMask[index] = dist <= radius ? 255 : 0;
        }
    }

    const inferenceTime = performance.now() - t0;

    return { mask: personMask, width, height, inferenceTime };
}

async function getPersonMask(session, videoElement) {
    const width = 512; // размер модели
    const height = 512;

    // 1. Копируем текущий кадр видео в canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, width, height);

    // 2. Получаем данные пикселей
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = new Float32Array(width * height * 3);

    // Преобразуем в BGR [0,1]
    for (let i = 0; i < width * height; i++) {
        data[i*3+0] = imageData.data[i*4+2]/255.0; // B
        data[i*3+1] = imageData.data[i*4+1]/255.0; // G
        data[i*3+2] = imageData.data[i*4+0]/255.0; // R
    }

    // 3. Создаем тензор
    const inputTensor = new ort.Tensor('float32', data, [1, 3, height, width]); // [N,C,H,W]
    const feeds = {};
    feeds[session.inputNames[0]] = inputTensor;

    // 4. Запускаем инференс
    try {
        const t0 = performance.now();
        const output = await session.run(feeds);
        const inferenceTime = performance.now() - t0;

        console.log("INFERENCE time:", inferenceTime.toFixed(2), "ms");

        // 5. Получаем маску (обычно последний слой - логиты классов)
        const maskData = output[session.outputNames[0]].data; // shape: [1, 21, H, W] для 21 класса
        // Убираем все кроме класса "человек" (в deeplabv3 15-й класс)
        const personMask = new Uint8ClampedArray(width * height);

        for (let i = 0; i < width * height; i++) {
            personMask[i] = maskData[i + 15 * width * height] > 0.5 ? 255 : 0;
        }

        return { mask: personMask, width, height, inferenceTime };

    } catch (e) {
        console.error("Ошибка инференса ONNX:", e);
        return null;
    }
}

async function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
    });
}

function resizeMask(personMask, srcWidth, srcHeight, dstWidth, dstHeight) {
    // создаем RGBA-буфер для исходной маски
    const rgba = new Uint8ClampedArray(srcWidth * srcHeight * 4);
    for (let i = 0, j = 0; i < personMask.length; i++, j += 4) {
        const v = personMask[i];
        rgba[j] = rgba[j + 1] = rgba[j + 2] = v;
        rgba[j + 3] = 255;
    }

    // создаем OffscreenCanvas и рисуем с масштабированием
    const srcCanvas = new OffscreenCanvas(srcWidth, srcHeight);
    const sctx = srcCanvas.getContext('2d');
    sctx.putImageData(new ImageData(rgba, srcWidth, srcHeight), 0, 0);

    const dstCanvas = new OffscreenCanvas(dstWidth, dstHeight);
    const dctx = dstCanvas.getContext('2d');
    dctx.drawImage(srcCanvas, 0, 0, dstWidth, dstHeight);

    // получаем обратно grayscale маску
    const resized = dctx.getImageData(0, 0, dstWidth, dstHeight).data;
    const mask = new Uint8ClampedArray(dstWidth * dstHeight);
    for (let i = 0, j = 0; i < mask.length; i++, j += 4) mask[i] = resized[j];

    return mask;
}

// Наложение человека на фон
function createBackgroundMerger(video, backgroundImg, width, height) {
    const videoCanvas = document.createElement('canvas');
    videoCanvas.width = width;
    videoCanvas.height = height;
    const vctx = videoCanvas.getContext('2d');

    const outputCanvas = new OffscreenCanvas(width, height);
    const octx = outputCanvas.getContext('2d');

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgctx = bgCanvas.getContext('2d');
    bgctx.drawImage(backgroundImg, 0, 0, width, height);
    const bgData = bgctx.getImageData(0, 0, width, height);

    const videoData = vctx.getImageData(0, 0, width, height);
    const outputData = octx.createImageData(width, height);

    return function merge(personMask) {
        // 1. Кадр видео
        vctx.drawImage(video, 0, 0, width, height);
        const v = vctx.getImageData(0, 0, width, height).data;
        const b = bgData.data;
        const o = outputData.data;

        // 2. Альфа-смешивание (векторизовано, без объектов)
        for (let i = 0, j = 0; i < personMask.length; i++, j += 4) {
            const a = personMask[i] / 255;
            const ia = 1 - a;
            o[j]   = v[j]   * a + b[j]   * ia;
            o[j+1] = v[j+1] * a + b[j+1] * ia;
            o[j+2] = v[j+2] * a + b[j+2] * ia;
            o[j+3] = 255;
        }

        octx.putImageData(outputData, 0, 0);
        return outputCanvas;
    };
}


async function startBackgroundReplacement(modelUrl) {
    const video = await startCamera();
    const session = await loadSegmentationModel(modelUrl);

    const { videoWidth, videoHeight } = video;
    const outputCanvas = document.getElementById('outputCanvas');
    const ctx = outputCanvas.getContext('2d', { willReadFrequently: true });
    outputCanvas.width = videoWidth;
    outputCanvas.height = videoHeight;

    async function loop() {
        const t0 = performance.now();

        // const { mask, width, height, inferenceTime } = await getPersonMask(session, video);
        const { mask, width, height, inferenceTime } = await getTestMask();
        const resizedMask = resizeMask(mask, width, height, videoWidth, videoHeight);

         // Загружаем текущий фон
        const bgImg = await loadImage(currentBackground);

        // Создаем merger на лету (можно оптимизировать, если заранее держать)
        const merge = createBackgroundMerger(video, bgImg, videoWidth, videoHeight);
        const mergedCanvas = merge(resizedMask);

        ctx.drawImage(mergedCanvas, 0, 0);

        const total = performance.now() - t0;

        console.log("total time:", total.toFixed(2), "ms");
        requestAnimationFrame(loop);
    }

    loop();
}

setupGallery();
const modelUrl = 'deeplabv3-mobilevit-small.onnx';

startBackgroundReplacement(modelUrl);