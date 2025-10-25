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
      if (results.segmentationMask) {
        // Создаем маску из результатов MediaPipe
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = outputWidth;
        maskCanvas.height = outputHeight;
        const maskCtx = maskCanvas.getContext("2d");
        
        // Рисуем маску сегментации
        maskCtx.drawImage(results.segmentationMask, 0, 0, outputWidth, outputHeight);
        
        const maskData = maskCtx.getImageData(0, 0, outputWidth, outputHeight);
        resolve(maskData);
      } else {
        // Если маска не найдена, создаем пустую
        resolve(null);
      }
    });
    
    // Отправляем кадр на обработку
    selfieSegmentation.send({ image: video });
  });
}

// === Улучшенная сегментация с MediaPipe ===
async function getSegmentationMask(selfieSegmentation, video, outputWidth, outputHeight) {
  try {
    const start = performance.now();
    const maskData = await segmentWithMediaPipe(selfieSegmentation, video, outputWidth, outputHeight);
    console.log("inference:", performance.now() - start, "ms");
    
    // Проверяем, что маска содержит данные
    const maskValues = Array.from(maskData.data).filter((val, i) => i % 4 === 0);
    const nonZeroPixels = maskValues.filter(v => v > 0).length;
    
    console.log(`MediaPipe маска: non-zero pixels=${nonZeroPixels}`);
    
    if (nonZeroPixels < 100) {
      console.log("Маска слишком пустая, используем пустую маску");
      return null;
    }
    
    // Улучшаем маску морфологическими операциями
    const improvedMask = improveMask(maskData, outputWidth, outputHeight);
    
    return improvedMask;
  } catch (error) {
    console.error("Ошибка сегментации MediaPipe:", error);
    return null;
  }
}

// === Улучшение маски ===
function improveMask(maskData, width, height) {
  // Создаем canvas для обработки
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Зеркалим
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.putImageData(maskData, 0, 0);

  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(tempCanvas, 0, 0); // рисуем только зеркальную маску
  ctx.restore();
  
  // Применяем размытие для сглаживания
  ctx.filter = "blur(2px)";
  ctx.drawImage(canvas, 0, 0);
  
  // Применяем пороговую обработку для четкости
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // R канал
    // Бинаризация с порогом 128
    const binary = gray > 128 ? 255 : 0;
    data[i] = binary;     // R
    data[i + 1] = binary; // G
    data[i + 2] = binary; // B
    data[i + 3] = 255;    // A
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  // Эрозия для удаления шума
  const eroded = erodeMask(imgData, width, height);
  ctx.putImageData(eroded, 0, 0);
  
  // Дилатация для восстановления размера
  const dilated = dilateMask(eroded, width, height);
  
  return dilated;
}

// === Эрозия маски ===
function erodeMask(imgData, width, height) {
  const result = new ImageData(width, height);
  const data = imgData.data;
  const resultData = result.data;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Проверяем 3x3 окрестность
      let minValue = 255;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
          minValue = Math.min(minValue, data[neighborIdx]);
        }
      }
      
      resultData[idx] = minValue;
      resultData[idx + 1] = minValue;
      resultData[idx + 2] = minValue;
      resultData[idx + 3] = 255;
    }
  }
  
  return result;
}

// === Дилатация маски ===
function dilateMask(imgData, width, height) {
  const result = new ImageData(width, height);
  const data = imgData.data;
  const resultData = result.data;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Проверяем 3x3 окрестность
      let maxValue = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
          maxValue = Math.max(maxValue, data[neighborIdx]);
        }
      }
      
      resultData[idx] = maxValue;
      resultData[idx + 1] = maxValue;
      resultData[idx + 2] = maxValue;
      resultData[idx + 3] = 255;
    }
  }
  
  return result;
}

// === Альфа-блендинг с улучшениями ===
function compositeFrame(ctx, video, maskData, bgCtx, width, height) {
  // Берем пиксели видео и фона
  const frameData = getFrameData(video, width, height);
  const bgData = bgCtx.getImageData(0, 0, width, height);
  
  // Размываем маску для плавных краев
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.putImageData(maskData, 0, 0);
  tempCtx.filter = "blur(6px)";
  tempCtx.drawImage(tempCanvas, 0, 0);
  const blurredMask = tempCtx.getImageData(0, 0, width, height);

  const output = ctx.createImageData(width, height);
  const o = output.data;
  const f = frameData.data;
  const b = bgData.data;
  const m = blurredMask.data;

  // Основной цикл пикселей
  for (let i = 0; i < m.length; i += 4) {
    const alpha = m[i] / 255; // Используем R-канал как маску
    const invAlpha = 1 - alpha;

    o[i]     = f[i]     * alpha + b[i]     * invAlpha;
    o[i + 1] = f[i + 1] * alpha + b[i + 1] * invAlpha;
    o[i + 2] = f[i + 2] * alpha + b[i + 2] * invAlpha;
    o[i + 3] = 255;
  }

  ctx.putImageData(output, 0, 0);
}

function getFrameData(video, width, height) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(video, 0, 0, width, height);
  return tempCtx.getImageData(0, 0, width, height);
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