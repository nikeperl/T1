// MediaPipe для сегментации людей

let currentBackground = null;
let showOriginal = false;

const canvas = document.getElementById('outputCanvas');
canvas.addEventListener('click', () => {
    canvas.classList.toggle('fullscreen');
});

document.addEventListener('DOMContentLoaded', () => {
    const primaryInput = document.getElementById('primary_color');
    const secondaryInput = document.getElementById('secondary_color');
    const primaryDisplay = document.getElementById('primary_color_display');
    const secondaryDisplay = document.getElementById('secondary_color_display');

    // Инициализация отображения выбранных цветов
    function updateColor(display, input) {
        display.style.backgroundColor = input.value;
    }
    updateColor(primaryDisplay, primaryInput);
    updateColor(secondaryDisplay, secondaryInput);

    primaryInput.addEventListener('input', () => updateColor(primaryDisplay, primaryInput));
    secondaryInput.addEventListener('input', () => updateColor(secondaryDisplay, secondaryInput));

    // Клик по квадрату открывает color picker
    primaryDisplay.addEventListener('click', () => primaryInput.click());
    secondaryDisplay.addEventListener('click', () => secondaryInput.click());

    // Функция сохранения
    const saveBtn = document.getElementById('saveUserBtn');
    saveBtn.addEventListener('click', () => {
        const employeeData = {
            employee: {
                full_name: document.getElementById('full_name').value,
                position: document.getElementById('position').value,
                company: document.getElementById('company').value,
                department: document.getElementById('department').value,
                office_location: document.getElementById('office_location').value,
                contact: {
                    email: document.getElementById('email').value,
                    telegram: document.getElementById('telegram').value
                },
                branding: {
                    logo_url: document.getElementById('logo_url').value,
                    corporate_colors: {
                        primary: primaryInput.value,
                        secondary: secondaryInput.value
                    },
                    slogan: document.getElementById('slogan').value
                },
                privacy_level: document.getElementById('privacy_level').value
            }
        };

        // Сохраняем в localStorage (перезаписывает при повторном сохранении)
        localStorage.setItem('employeeProfile', JSON.stringify(employeeData));
        alert('Данные сохранены!');
    });

    // Если есть сохранённые данные, загружаем их
    const savedData = localStorage.getItem('employeeProfile');
    if (savedData) {
        const data = JSON.parse(savedData);
        document.getElementById('full_name').value = data.employee.full_name || '';
        document.getElementById('position').value = data.employee.position || '';
        document.getElementById('company').value = data.employee.company || '';
        document.getElementById('department').value = data.employee.department || '';
        document.getElementById('office_location').value = data.employee.office_location || '';
        document.getElementById('email').value = data.employee.contact.email || '';
        document.getElementById('telegram').value = data.employee.contact.telegram || '';
        document.getElementById('logo_url').value = data.employee.branding.logo_url || '';
        document.getElementById('slogan').value = data.employee.branding.slogan || '';
        primaryInput.value = data.employee.branding.corporate_colors.primary || '#0052CC';
        secondaryInput.value = data.employee.branding.corporate_colors.secondary || '#00B8D9';
        updateColor(primaryDisplay, primaryInput);
        updateColor(secondaryDisplay, secondaryInput);
        document.getElementById('privacy_level').value = data.employee.privacy_level || 'medium';
    }
});

// Галерея фонов
function setupGallery() {
  const gallery = document.getElementById("bgGallery");
  const backgrounds = [
    "backgrounds/bg1.png",
    "backgrounds/bg2.png",
    "backgrounds/bg3.png",
    "backgrounds/bg4.png"
  ];

  gallery.innerHTML = ""; // Очистка
  backgrounds.forEach((bg, i) => {
    const img = document.createElement("img");
    img.src = bg;
    img.className = "bg-thumb";
    img.title = `Фон ${i + 1}`;
    img.loading = "lazy";
    img.onclick = () => {
      currentBackground = bg;
    };
    gallery.appendChild(img);
  });
}

async function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
    });
}

// === Переключение режимов ===
function setupToggleButton() {
  const toggleBtn = document.getElementById("toggleMode");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      showOriginal = !showOriginal;
      toggleBtn.textContent = showOriginal ? "Показать с фоном" : "Показать оригинал";
      toggleBtn.style.background = showOriginal ? "#ff4444" : "#0052CC";
    });
  }
}

// === Запуск камеры ===
async function startCamera() {
    try {
        const constraints = { video: true, audio: false };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.getElementById('video');
        videoElement.srcObject = stream;
        await videoElement.play();
        return videoElement;
    } catch (err) {
        console.error('Ошибка доступа к камере:', err);
    }
}

// === Инициализация MediaPipe ===
async function initializeMediaPipe() {
  try {
    console.log("[MediaPipe] Инициализация SelfieSegmentation...");
    
    // Ждем загрузки MediaPipe
    await new Promise(resolve => {
      if (window.SelfieSegmentation) {
        resolve();
      } else {
        const checkMediaPipe = setInterval(() => {
          if (window.SelfieSegmentation) {
            clearInterval(checkMediaPipe);
            resolve();
          }
        }, 100);
      }
    });
    
    const selfieSegmentation = new window.SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      }
    });
    
    selfieSegmentation.setOptions({
      modelSelection: 1, // 0 = general, 1 = landscape
      selfieMode: true
    });
    
    console.log("[MediaPipe] ✅ SelfieSegmentation инициализирован");
    
    // Обновляем статус
    const statusEl = document.getElementById("status");
    statusEl.textContent = "MediaPipe загружен (оптимизированная производительность)";
    statusEl.style.color = "#00ff00";
    
    return selfieSegmentation;
  } catch (error) {
    console.error("[MediaPipe] Ошибка инициализации:", error);
    throw new Error("Не удалось инициализировать MediaPipe");
  }
}

// === Сегментация с MediaPipe ===
async function segmentWithMediaPipe(selfieSegmentation, video, outputWidth, outputHeight) {
  return new Promise((resolve) => {
    selfieSegmentation.onResults((results) => {
      if (!results.segmentationMask) {
        resolve(null);
        return;
      }
      resolve(results.segmentationMask);
    });

    selfieSegmentation.send({ image: video });
  });
}

// === Улучшенная сегментация с MediaPipe + уменьшение размера ===
async function getSegmentationMask(selfieSegmentation, video, outputWidth, outputHeight) {
  try {
    const start = performance.now();

    // Масштаб
    const SCALE = 0.7;
    const scaledW = Math.round(outputWidth * SCALE);
    const scaledH = Math.round(outputHeight * SCALE);

    // Сегментация на уменьшенном размере
    const maskCanvas = await segmentWithMediaPipe(selfieSegmentation, video, scaledW, scaledH);
    if (!maskCanvas) {
      console.warn("MediaPipe: пустая маска");
      return null;
    }

    // Получаем ImageData независимо от типа
    let maskData;
    if (maskCanvas instanceof HTMLCanvasElement) {
      maskData = maskCanvas.getContext("2d").getImageData(0, 0, scaledW, scaledH);
    } else if (maskCanvas instanceof ImageBitmap) {
      const offscreen = new OffscreenCanvas(scaledW, scaledH);
      const ctx = offscreen.getContext("2d");
      ctx.drawImage(maskCanvas, 0, 0, scaledW, scaledH);
      maskData = ctx.getImageData(0, 0, scaledW, scaledH);
    } else {
      console.error("Неизвестный тип маски MediaPipe:", maskCanvas);
      return null;
    }

    // Проверка маски
    let nonZeroPixels = 0;
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i] > 0) nonZeroPixels++;
    }

    console.log(`inference: ${(performance.now() - start).toFixed(1)} ms`);
    console.log(`MediaPipe маска: non-zero pixels=${nonZeroPixels}`);

    if (nonZeroPixels < 50) {
      console.log("Маска слишком пустая, используем пустую");
      return null;
    }

    // Улучшаем маску (морфология)
    const improvedSmall = improveMask(maskData, scaledW, scaledH);

    // Создаём холст с маленькой маской
    const tempCanvas = new OffscreenCanvas(scaledW, scaledH);
    tempCanvas.getContext("2d").putImageData(improvedSmall, 0, 0);

    // Масштабируем обратно до оригинального размера
    const upscaled = new OffscreenCanvas(outputWidth, outputHeight);
    const upCtx = upscaled.getContext("2d");
    upCtx.imageSmoothingEnabled = true;
    upCtx.imageSmoothingQuality = "medium";
    upCtx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);

    const finalMask = upCtx.getImageData(0, 0, outputWidth, outputHeight);
    return finalMask;

  } catch (error) {
    console.error("Ошибка сегментации MediaPipe:", error);
    return null;
  }
}

// === Улучшение маски (морфология + зеркалирование) ===
function improveMask(maskData, width, height) {
  const start = performance.now();
  const src = maskData.data;
  const mask = new Uint8ClampedArray(width * height);

  // 1. Бинаризация и зеркалирование
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const gray = src[idx];
      mask[y * width + (width - 1 - x)] = gray > 128 ? 255 : 0;
    }
  }

  // 2. Эрозия + Дилатация
  const eroded = new Uint8ClampedArray(mask.length);
  const dilated = new Uint8ClampedArray(mask.length);
  const offsets = [-1, 0, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let min = 255;
      let max = 0;

      for (let dy of offsets) {
        for (let dx of offsets) {
          const val = mask[(y + dy) * width + (x + dx)];
          min = Math.min(min, val);
          max = Math.max(max, val);
        }
      }

      eroded[y * width + x] = min;
      dilated[y * width + x] = max;
    }
  }

  // 3. Собираем итоговое ImageData
  const result = new ImageData(width, height);
  const resData = result.data;
  for (let i = 0; i < width * height; i++) {
    const v = dilated[i];
    resData[i * 4] = v;
    resData[i * 4 + 1] = v;
    resData[i * 4 + 2] = v;
    resData[i * 4 + 3] = 255;
  }

  console.log("improve mask:", performance.now() - start, "ms");

  return result;
}


// === Подготовка (создаём кэш один раз) ===
const blendCache = {
  tempCanvas: null,
  tempCtx: null,
  blurCanvas: null,
  blurCtx: null,
  frameCanvas: null,
  frameCtx: null
};

// === Оптимизированный альфа-блендинг ===
function compositeFrame(ctx, video, maskData, bgCtx, width, height) {
  const start = performance.now();

  // --- 1. Инициализация кэша ---
  if (!blendCache.tempCanvas) {
    blendCache.tempCanvas = new OffscreenCanvas(width, height);
    blendCache.tempCtx = blendCache.tempCanvas.getContext("2d");
    blendCache.blurCanvas = new OffscreenCanvas(width, height);
    blendCache.blurCtx = blendCache.blurCanvas.getContext("2d");
    blendCache.frameCanvas = new OffscreenCanvas(width, height);
    blendCache.frameCtx = blendCache.frameCanvas.getContext("2d");
  }

  const tempCtx = blendCache.tempCtx;
  const blurCtx = blendCache.blurCtx;
  const frameCtx = blendCache.frameCtx;

  // --- 2. Получаем кадр видео и фона ---
  frameCtx.drawImage(video, 0, 0, width, height);
  const frameData = frameCtx.getImageData(0, 0, width, height);
  const bgData = bgCtx.getImageData(0, 0, width, height);

  // --- 3. Размытие маски (используем OffscreenCanvas + putImageData) ---
  blurCtx.filter = "blur(4px)"; // меньше — быстрее
  blurCtx.putImageData(maskData, 0, 0);
  blurCtx.drawImage(blendCache.blurCanvas, 0, 0); // применяем фильтр
  const blurredMask = blurCtx.getImageData(0, 0, width, height);

  // --- 4. Альфа-композитинг (векторизованный цикл) ---
  const o = ctx.createImageData(width, height);
  const od = o.data;
  const fd = frameData.data;
  const bd = bgData.data;
  const md = blurredMask.data;

  // Основной цикл: сведен к минимуму, с ручной инлайновой арифметикой
  for (let i = 0; i < md.length; i += 4) {
    const a = md[i] / 255;
    const ia = 1 - a;

    od[i]     = fd[i]     * a + bd[i]     * ia;
    od[i + 1] = fd[i + 1] * a + bd[i + 1] * ia;
    od[i + 2] = fd[i + 2] * a + bd[i + 2] * ia;
    od[i + 3] = 255;
  }

  // --- 5. Отрисовка результата ---
  ctx.putImageData(o, 0, 0);

  console.log("compositeFrame optimized:", (performance.now() - start).toFixed(2), "ms");
}

// === Основной цикл ===
async function startBackgroundReplacement() {
    const statusEl = document.getElementById("status");
    statusEl.textContent = "Запуск камеры...";

    const video = await startCamera();
    const { videoWidth, videoHeight } = video;

    console.log("Видео размеры:", videoWidth, "x", videoHeight);

    statusEl.textContent = "Загрузка MediaPipe...";
    const selfieSegmentation = await initializeMediaPipe();
    statusEl.style.display = "none";

    const canvas = document.getElementById("outputCanvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Предварительно создаём один фоновой canvas (без пересоздания в каждом кадре)
    const bgCanvas = document.createElement("canvas");
    const bgCtx = bgCanvas.getContext("2d");
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;

    let maskData = null;
    let bgImageCache = null;
    let fps = 0;

    async function loop() {
        const start = performance.now();
        let temp = null;

        try {
            if (showOriginal) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            } else {
                // Готовим фон
                if (currentBackground) {
                    // Замена изображением
                    if (!bgImageCache || bgImageCache.src !== currentBackground) {
                        bgImageCache = await loadImage(currentBackground);
                    }
                    bgCtx.drawImage(bgImageCache, 0, 0, canvas.width, canvas.height);
                } else {
                    // Размытие фона через downscale → blur → upscale
                    const scale = 0.4;
                    const w = canvas.width * scale;
                    const h = canvas.height * scale;

                    const bgTempCanvas = document.createElement('canvas');
                    bgTempCanvas.width = w;
                    bgTempCanvas.height = h;
                    const tempCtx = bgTempCanvas.getContext('2d');

                    tempCtx.drawImage(video, 0, 0, w, h);

                    tempCtx.filter = 'blur(10px)';
                    tempCtx.drawImage(bgTempCanvas, 0, 0);

                    bgCtx.filter = 'none';
                    bgCtx.drawImage(bgTempCanvas, 0, 0, canvas.width, canvas.height);
                }
                // Получаем маску сегментации
                maskData = await getSegmentationMask(selfieSegmentation, video, canvas.width, canvas.height);
                temp = performance.now() - start;
                console.log("trans mask:", temp, "ms");

                if (maskData) {
                    const hasValidMask = maskData && maskData.data?.some((v, i) => !(i % 4) && v > 50);

                    if (hasValidMask) {
                        compositeFrame(ctx, video, maskData, bgCtx, canvas.width, canvas.height);
                    }
                }
                temp = performance.now() - temp - start;
                console.log("compose:", temp, "ms");
            }

            // FPS
            const elapsed = performance.now() - start;
            fps = (1000 / elapsed).toFixed(1);
            document.getElementById("fps").innerText = `FPS: ${fps}`;
            console.log("time for frame:", elapsed, "ms");

        } catch (error) {
            console.error("Ошибка обработки кадра:", error);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        requestAnimationFrame(loop);
    }

    loop();
}

// === Инициализация ===
setupGallery();
setupToggleButton();
startBackgroundReplacement().catch(err => {
  console.error("Ошибка запуска:", err);
  const statusEl = document.getElementById("status");
  statusEl.textContent = `Ошибка: ${err.message}`;
  statusEl.style.color = "#ff4444";
  alert("Не удалось запустить MediaPipe. Проверьте подключение к интернету.");
});