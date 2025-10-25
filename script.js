// MediaPipe для сегментации людей

let showOriginal = false;
let bgImageCache = null;
let currentEmployeeData = null;
let logoImageCache = null;
let fps = 0;

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

        currentEmployeeData = employeeData; // Сохраняем данные глобально

        // Кэшируем логотип
        if (employeeData.employee.branding.logo_url) {
            loadImage(employeeData.employee.branding.logo_url).then(img => { 
                logoImageCache = img; 
            });
        } else {
            logoImageCache = null; // Сбрасываем, если URL пуст
        }

        // Сохраняем в localStorage (перезаписывает при повторном сохранении)
        localStorage.setItem('employeeProfile', JSON.stringify(employeeData));
        alert('Данные сохранены!');
    });

    // Если есть сохранённые данные, загружаем их
    const savedData = localStorage.getItem('employeeProfile');
    if (savedData) {
        const data = JSON.parse(savedData);

        currentEmployeeData = data; // Сохраняем данные глобально

        // Кэшируем логотип при загрузке
        if (data.employee.branding.logo_url) {
            loadImage(data.employee.branding.logo_url).then(img => { 
                logoImageCache = img; 
            });
        } else {
            logoImageCache = null;
        }

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
    // Отобразить в панели просмотра, если есть сохранённые данные
    if (savedData) {
        try {
            renderUserProfile(JSON.parse(savedData));
        } catch (err) {
            console.warn('Ошибка разбора сохранённых данных для отображения', err);
        }
    }
});

function drawCanvasOverlay(ctx, employeeData) {
    if (!employeeData || !employeeData.employee) {
        return; // Нечего рисовать
    }

    const e = employeeData.employee;
    const primary = e.branding?.corporate_colors?.primary || '#0052CC';
    const secondary = e.branding?.corporate_colors?.secondary || '#00B8D9';
    
    // Получаем размеры canvas для позиционирования
    const canvas = ctx.canvas;
    const padding = 20; // Отступ от краев
    const lineHeight = 30; // Примерная высота строки (подберите)
    const logoSize = 40; // Размер логотипа (подберите)
    
    // ВНИМАНИЕ: Стили (шрифты, точные отступы) нужно будет 
    // настроить вручную, чтобы они соответствовали вашим CSS.
    // Canvas не понимает CSS, здесь "ручное" позиционирование.

    // --- Левая колонка (overlay-left) ---
    let currentY = padding + (logoSize / 2); // Начинаем с Y
    let currentX = padding;
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle'; // Выравниваем по центру по вертикали

    // Логотип
    if (logoImageCache && e.branding?.logo_url) {
        try {
            // Рисуем логотип в (padding, padding)
            ctx.drawImage(logoImageCache, padding, padding, logoSize, logoSize);
            currentX += logoSize + 10; // Сдвигаем X для текста
        } catch (err) {
            console.warn("Ошибка отрисовки логотипа", err);
            logoImageCache = null; // Ошибка, не пытаемся рисовать снова
        }
    }

    // Компания
    ctx.fillStyle = primary;
    ctx.font = 'bold 24px Arial';
    ctx.fillText(e.company || '', currentX, currentY);

    // Сдвигаемся вниз под логотип/компанию
    currentY = padding + logoSize + 15;

    // Слоган
    ctx.font = '18px Arial';
    ctx.fillText(e.branding?.slogan || '', padding, currentY);
    currentY += lineHeight;

    // Отдел
    ctx.fillStyle = secondary;
    ctx.font = '16px Arial';
    ctx.fillText(e.department || '', padding, currentY);
    currentY += lineHeight;

    // Офис
    ctx.fillText(e.office_location || '', padding, currentY);


    // --- Правая колонка (overlay-right) ---
    currentY = padding + (lineHeight / 2); // Сбрасываем Y
    const rightX = canvas.width - padding; // Координата X правого края
    ctx.textAlign = 'right'; // Выравниваем текст по правому краю

    // Имя
    ctx.fillStyle = primary;
    ctx.font = 'bold 28px Arial';
    ctx.fillText(e.full_name || '', rightX, currentY);
    currentY += lineHeight + 4;

    // Должность
    ctx.font = '20px Arial';
    ctx.fillText(e.position || '', rightX, currentY);
    currentY += lineHeight + 10; // Больший отступ

    // Контакты
    ctx.fillStyle = secondary;
    ctx.font = '16px Arial';
    if (e.contact?.email) {
        ctx.fillText(e.contact.email, rightX, currentY);
        currentY += lineHeight - 5; // Чуть плотнее
    }
    if (e.contact?.telegram) {
        ctx.fillText(e.contact.telegram, rightX, currentY);
    }
}

// Галерея фонов
async function setupGallery() {
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
    img.onclick = async () => {
      bgImageCache = await loadImage(bg);
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

// === Сегментация (возвращает Canvas, а не ImageData) ===
async function getSegmentationMaskCanvas(selfieSegmentation, video, outputWidth, outputHeight) {
    try {
        const start = performance.now();

        // Масштаб
        const SCALE = 0.7; // Оставляем масштабирование, это хорошая оптимизация
        const scaledW = Math.round(outputWidth * SCALE);
        const scaledH = Math.round(outputHeight * SCALE);

        // Сегментация на уменьшенном размере
        const maskCanvas = await segmentWithMediaPipe(selfieSegmentation, video, scaledW, scaledH);
        if (!maskCanvas) {
            console.warn("MediaPipe: пустая маска");
            return null;
        }
        
        // Мы больше не используем improveMask, которая делала зеркалирование.
        // Вместо этого мы отзеркалим и масштабируем маску обратно на GPU.

        // Используем OffscreenCanvas для масштабирования (он быстрее)
        // Создаём кэш, если его нет
        if (!blendCache.upscaledCanvas) {
            blendCache.upscaledCanvas = new OffscreenCanvas(outputWidth, outputHeight);
            blendCache.upscaledCtx = blendCache.upscaledCanvas.getContext("2d");
             blendCache.upscaledCtx.imageSmoothingEnabled = true;
            blendCache.upscaledCtx.imageSmoothingQuality = "medium";
        }

        const upscaled = blendCache.upscaledCanvas;
        const upCtx = blendCache.upscaledCtx;

        // Очищаем и отзеркаливаем (как это делала improveMask)
        upCtx.clearRect(0, 0, outputWidth, outputHeight);
        upCtx.save();
        upCtx.scale(-1, 1); // Зеркалим по X
        upCtx.translate(-outputWidth, 0);
        
        // Рисуем маску (маленькую) на большой холст (с масштабированием и зеркалированием)
        upCtx.drawImage(maskCanvas, 0, 0, outputWidth, outputHeight);
        
        upCtx.restore(); // Возвращаем transform

        console.log(`getMaskCanvas: ${(performance.now() - start).toFixed(1)} ms`);

        // Возвращаем готовый холст (GPU-объект)
        return upscaled;

    } catch (error) {
        console.error("Ошибка сегментации MediaPipe:", error);
        return null;
    }
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

// === Оптимизированный альфа-блендинг (на GPU) ===
function compositeFrame(ctx, video, maskCanvas, bgCtx, width, height) {
    const start = performance.now();

    // --- 1. Инициализация кэша (только blurCanvas) ---
    if (!blendCache.blurCanvas) {
        blendCache.blurCanvas = new OffscreenCanvas(width, height);
        blendCache.blurCtx = blendCache.blurCanvas.getContext("2d", { willReadFrequently: true });
        // Устанавливаем высокое качество сглаживания один раз
        blendCache.blurCtx.imageSmoothingEnabled = true;
        blendCache.blurCtx.imageSmoothingQuality = "medium";
    }
    const blurCtx = blendCache.blurCtx;

    // --- 2. Размытие маски (всё на GPU) ---
    // Очищаем предыдущую маску
    blurCtx.clearRect(0, 0, width, height); 
    // Устанавливаем фильтр
    blurCtx.filter = "blur(4px)";
    // Рисуем маску (полученную от getSegmentationMaskCanvas)
    blurCtx.drawImage(maskCanvas, 0, 0, width, height);
    // Сбрасываем фильтр, чтобы он применился
    blurCtx.filter = "none";

    // --- 3. Композитинг (всё на GPU) ---

    // Шаг 1: Рисуем видео (человек) на главный холст
    ctx.drawImage(video, 0, 0, width, height);

    // Шаг 2: "Вырезаем" человека по размытой маске
    // 'destination-in' оставляет только те пиксели 'destination' (видео),
    // которые пересекаются с 'source' (размытой маской).
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(blendCache.blurCanvas, 0, 0);

    // Шаг 3: Рисуем фон *под* вырезанным человеком
    // 'destination-over' рисует 'source' (фон) *позади* 'destination' (человека).
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(bgCtx.canvas, 0, 0, width, height);

    // Шаг 4: Сбрасываем операцию для следующего кадра
    ctx.globalCompositeOperation = 'source-over';

    console.log("compositeFrame GPU:", (performance.now() - start).toFixed(2), "ms");
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

    async function loop() {
        const start = performance.now();
        let temp = null;

        try {
            if (showOriginal) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            } else {
                // Готовим фон
                if (bgImageCache) {
                    // Замена изображением
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

                // Накладываем текст
                drawCanvasOverlay(bgCtx, currentEmployeeData);
                
                // Получаем маску сегментации (теперь это Canvas)
                const maskCanvas = await getSegmentationMaskCanvas(selfieSegmentation, video, canvas.width, canvas.height);
                temp = performance.now() - start;
                console.log("trans mask (canvas):", temp, "ms");

                if (maskCanvas) {
                    // Вызываем новую GPU-версию композитинга
                    compositeFrame(ctx, video, maskCanvas, bgCtx, canvas.width, canvas.height);
                } else {
                    // Если маски нет (ошибка), просто рисуем видео
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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