//import * as BABYLON from 'https://cdn.babylonjs.com/babylon.max.js';
//import 'https://cdn.babylonjs.com/gui/babylon.gui.min.js'; // GUI добавляется к BABYLON
//import 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js'; // Подключение дополнительных загрузчиков
//import * as dat from 'https://cdn.jsdelivr.net/npm/dat.gui/build/dat.gui.module.js';
//import Stats from 'https://cdn.jsdelivr.net/npm/threejs-utils@0.1.3/lib/stats.module.js';

// Элементы интерфейса
const modal = document.getElementById('modal');

const closeModal = document.getElementById('closeModal');
let canvas = document.getElementById('renderCanvas');
let canvas2 = document.getElementById('modalContent');
let sceneCreated = false;
let engine;
let scene;
let camera;
let advancedTexture;
let statsFPS, statsMS, statsMB;
let currentCircle; // Переменная для хранения текущего круга
// Создаем группы столкновений (лучше использовать битовые маски)
const GROUND_MASK = 1 << 0; // 1
const CIRCLE_MASK = 1 << 1; // 2
let loadingScreen = new BABYLON.DefaultLoadingScreen(canvas, "Loading...");

export function stop3DTour() {
    engine.stopRenderLoop();
};


// Получаем GUI AdvancedTexture


// Функция для создания текстового блока
function createTextBlock(text, top, left, width) {
    const textBlock = new BABYLON.GUI.TextBlock();
    textBlock.text = text;
    textBlock.color = "white"; // Цвет текста
    textBlock.fontSize = 24; // Размер шрифта
    textBlock.top = top;
    textBlock.left = left;
    textBlock.width = width;
    textBlock.textWrapping = BABYLON.GUI.TextWrapping.WordWrap; // Автоматический перенос текста
    advancedTexture.addControl(textBlock);
    return textBlock;
}


BABYLON.DefaultLoadingScreen.prototype.displayLoadingUI = function () {

    const canvas = document.getElementById('babylonjsLoading');

    if (!canvas) {
        console.warn("Default Loading Screen canvas is undefined. Ensure it is instantiated using engine's loadingScreen and 'displayLoadingUI' is not overwritten")
        return;
    }

    // Убедитесь, что _canvasTexture, _plane, _advancedTexture и _button не существуют, чтобы избежать проблем при перезагрузке
    if (this._canvasTexture) {
        this._canvasTexture.dispose();
    }
    if (this._plane) {
        this._plane.dispose();
    }
    if (this._advancedTexture) {
        this._advancedTexture.dispose();
    }
    this._button = null;

    // 1. Создание 2D канваса
    const canvasWidth = 900;
    const canvasHeight = 600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error("Error: Could not get 2D rendering context from canvas.");
        return;
    }
    // Фон
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Закругленные углы
    const borderRadius = 30;
    ctx.beginPath();
    ctx.moveTo(borderRadius, 0);
    ctx.lineTo(canvasWidth - borderRadius, 0);
    ctx.arcTo(canvasWidth, 0, canvasWidth, borderRadius, borderRadius);
    ctx.lineTo(canvasWidth, canvasHeight - borderRadius);
    ctx.arcTo(canvasWidth, canvasHeight, canvasWidth - borderRadius, canvasHeight, borderRadius);
    ctx.lineTo(borderRadius, canvasHeight);
    ctx.arcTo(0, canvasHeight, 0, canvasHeight - borderRadius, borderRadius);
    ctx.lineTo(0, borderRadius);
    ctx.arcTo(0, 0, borderRadius, 0, borderRadius);
    ctx.closePath();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fill();


    // Тень
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 1;
    ctx.fill();

    

    // Контейнер для подсказок
    const helpBlocksStartX = canvasWidth * 0.05;
    let helpBlockY = 21.4286 + 17.6471 * 2 + 20;
    const helpBlockHeight = 100;

    const helpBlockStyle = {
        color: "rgb(13, 68, 69)",
    };

    //  Подсказка 1
    let helpBlockX = helpBlocksStartX
    let iconPath = 'icon/icon-mouse.png'
    this.drawHelpBlock(ctx, helpBlockX, helpBlockY, iconPath, "<b>Стрілки або клавіші</b><br><b>W-A-S-D</b><br>Рухайтеся вперед, назад <br>і повертайте", helpBlockStyle);

    // Подсказка 2
    helpBlockX += canvasWidth * 0.35;
    iconPath = 'icon/icon-arrows.png';
    this.drawHelpBlock(ctx, helpBlockX, helpBlockY, iconPath, "<b>Миша / тачпад</b><br>Клацніть лівою кнопкою миші<br>та утримуйте, <br>щоб оглянутись", helpBlockStyle);

    // Подсказка 3
    helpBlockX += canvasWidth * 0.35;
    iconPath = 'icon/icon-left.png';
    this.drawHelpBlock(ctx, helpBlockX, helpBlockY, iconPath, "<b>Клацніть де завгодно</b><br>Клацніть на потрібне місце <br>щоб перейти туди", helpBlockStyle);


    // Заголовок
    ctx.font = "bold 1.4em Arial, serif";
    ctx.fillStyle = "rgb(13, 68, 69)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ВИКОРИСТАННЯ ", canvasWidth / 2, 21.4286 + 17.6471);

    // Разделительная линия
    ctx.strokeStyle = "rgb(176, 181, 181)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvasWidth * 0.05, 21.4286 + 17.6471 * 2)
    ctx.lineTo(canvasWidth * 0.95, 21.4286 + 17.6471 * 2);
    ctx.stroke();
    

    // 2. Создание текстуры
    if (this._canvasTexture) {
        this._canvasTexture.dispose()
    }

    this._canvasTexture = new BABYLON.DynamicTexture(
        "loadingScreenTexture",
        { width: canvasWidth, height: canvasHeight },
        scene,
        true
    );
    this._canvasTexture.update(true, false, () => {
        this._canvasTexture.getContext().drawImage(canvas, 0, 0);
    });


    // 3. Создание плоскости
    if (this._plane) {
        this._plane.dispose()
    }
    this._plane = BABYLON.MeshBuilder.CreatePlane(
        "loadingScreenPlane",
        { width: 2, height: 1 },
        scene
    );

    const material = new BABYLON.StandardMaterial("loadingScreenMaterial", scene);
    material.diffuseTexture = this._canvasTexture;
    material.emissiveColor = new BABYLON.Color3(1, 1, 1); // Делаем текстуру яркой
    this._plane.material = material;


    this._plane.position = new BABYLON.Vector3(0, 1.5, 5); // Расположите перед камерой


    // 4. Создание интерактивного слоя GUI
    /*this._advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "loadingScreenUI",
      true,
        scene
    );
  
    // 5. Создание кнопки "Понятно!"
      const button = Button.CreateSimpleButton("closeButton", "Зрозуміло!");
      button.width = "10em";
      button.height = "2.5em";
      button.color = "rgb(13, 68, 69)";
      button.background = "white";
      button.fontSize = 20;
      button.paddingTop = "0.2em";
      button.paddingBottom = "0.2em"
      button.cornerRadius = 7;
      button.thickness = 1
      button.left = "20%";
      button.top = "80%";
      button.onPointerUpObservable.add(() => {
        this.hideLoadingUI();
        // console.log("clicked")
      });
  
      button.hoverCursor = 'pointer';
    
      this._advancedTexture.addControl(button);
    this._button = button;*/

    this._loadingUIText = null;
};

BABYLON.DefaultLoadingScreen.prototype.drawHelpBlock = function (ctx, helpBlockX, helpBlockY, iconPath, helpText, style) {
    const iconSize = 60;
    const textStartYOffset = 10;
    const maxTextWidth = 200;
    ctx.fillStyle = style.color;
    const img = new Image();
    img.src = iconPath;
    img.onload = () => {
        // Вычисляем координату x для иконки, чтобы отцентрировать ее
        const iconX = helpBlockX + (maxTextWidth - iconSize) / 2;
        ctx.drawImage(img, iconX, helpBlockY, iconSize, iconSize);
        const textLines = helpText.split("<br>");

        let textStartY = helpBlockY + iconSize + textStartYOffset;
        let currentY = textStartY;
        textLines.forEach(line => {
          ctx.font = "1em Arial, serif";
            if (line.startsWith("<b>") && line.endsWith("</b>")) {
                ctx.font = "bold 1em Arial, serif";
                line = line.replace("<b>", "").replace("</b>", "");
            }
            const textWidth = ctx.measureText(line).width;
            const textStartX = helpBlockX + (maxTextWidth - textWidth) / 2;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(line, textStartX, currentY);
            currentY += 18;
        });
    };
};

BABYLON.DefaultLoadingScreen.prototype.hideLoadingUI = function () {
    if (this._plane) {
        this._plane.dispose();
        this._plane = null;
    }
    if (this._canvasTexture) {
        this._canvasTexture.dispose();
        this._canvasTexture = null;
    }
    if (this._button) {
        this._advancedTexture.removeControl(this._button);
        this._button = null;
    }
    if (this._advancedTexture) {
        this._advancedTexture.dispose();
        this._advancedTexture = null;
    }
    document.getElementById("babylonjsLoading").style.display = "none";

    console.log("scene is now loaded");
};




export function start3DTour(modelPath, debug = false) {
    if (!sceneCreated) {

        engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialiasing: true });
        engine.resize();
        scene = new BABYLON.Scene(engine);



        const customLoadingScreen = new BABYLON.DefaultLoadingScreen("babylonjsLoading", "Loading...");
        engine.loadingScreen = customLoadingScreen;
        engine.displayLoadingUI();

        setTimeout(() => {
        loadModel(modelPath, debug);
    }, 1000); // Задержка в миллисекундах

        sceneCreated = true;

        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        //advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");


        const button = BABYLON.GUI.Button.CreateSimpleButton("screenshotButton", "Сделать скриншот");
        button.width = "200px"; // Ширина кнопки
        button.height = "50px"; // Высота кнопки
        button.color = "white"; // Цвет текста
        button.background = "blue"; // Цвет фона
        button.cornerRadius = 20; // Скругленные углы
        button.thickness = 2; // Толщина границ
        button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT; // Выравнивание по горизонтали
        button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP; // Выравнивание по вертикали
        button.left = "10px"; // Отступ слева
        button.top = "10px"; // Отступ сверху

        // Добавляем обработчик события для кнопки
        button.onPointerClickObservable.add(() => {
            // 1. Скрываем кнопку
            advancedTexture.isVisible = false;
            scene.render();
            // 2.  Используем requestAnimationFrame для задержки создания скриншота
            requestAnimationFrame(() => {
                // 3. Создаем скриншот
                BABYLON.Tools.CreateScreenshotUsingRenderTarget(
                    engine,
                    camera,
                    { width: 1920, height: 1080 },
                    undefined,
                    undefined,
                    true,
                    () => {
                        // 4.  После того как скриншот сделан, возвращаем кнопку
                        requestAnimationFrame(() => {
                            advancedTexture.isVisible = true;
                        });
                    }
                );
            });
        });

        advancedTexture.addControl(button);

        // Ограничение высоты камеры
        scene.onBeforeRenderObservable.add(() => {
            if (camera.position.y < 1.5) {
                camera.position.y = 1.5; // Минимальная высота
            }
            if (camera.position.y > 1.5) {
                camera.position.y = 1.5; // Максимальная высота (фиксируем на уровне 1.5)
            }
        });

        /*  camera.onCollide = function (collidedMesh) {
              console.log("Камера столкнулась с объектом: " + collidedMesh.name);
          };
  */
        scene.onBeforeRenderObservable.add(() => {
            frameCounter++;

            if (frameCounter % updateFrequency === 0) {
                //  console.log(`Проверка зеркал на кадре ${frameCounter}`);

                // Поиск ближайшего зеркала
                let closestMirror = null;
                let closestDistance = Infinity;

                scene.meshes.forEach(mesh => {
                    if (mesh.name.includes("mirror")) {
                        // Получаем мировую позицию зеркала
                        const worldPosition = BABYLON.Vector3.TransformCoordinates(mesh.position, mesh.getWorldMatrix());

                        if (camera.isInFrustum(mesh)) {
                            // Вычисляем расстояние от камеры до зеркала с учётом мировых координат
                            const distance = BABYLON.Vector3.Distance(camera.position, worldPosition);

                            // Сохраняем ближайшее зеркало
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestMirror = mesh;
                            }
                        }
                    }
                });

                // Обновление текстуры для ближайшего зеркала
                if (closestMirror) {
                    // console.log(`Обновляется зеркало: ${closestMirror.name}, расстояние: ${closestDistance}`);
                    const mirrorTexture = closestMirror.material.reflectionTexture;
                    if (mirrorTexture) {
                        mirrorTexture.render();
                    }
                }
            }
        });



        scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.event.button === 0) { // Если нажата левая кнопка мыши
                        // console.log("Нажатие мыши, готовимся отслеживать перемещение.");
                        isMouseDown = true;
                        isMouseMoved = false; // Сбросим флаг перемещения
                        lastMousePosition = new BABYLON.Vector2(scene.pointerX, scene.pointerY);
                    }
                    break;

                case BABYLON.PointerEventTypes.POINTERMOVE:
                    {

                        // Проверяем, что pickResult существует и есть пересечение
                        const pickResultMove = scene.pick(scene.pointerX, scene.pointerY, predicateForPick); // Проверяем столкновения только с GROUND_GROUP

                        if (pickResultMove.hit) {

                            /* console.log("Точка пересечения:", pickResultMove.pickedPoint);
                             console.log("Объект, с которым произошло пересечение:", pickResultMove.pickedMesh);
                             if (pickResultMove.pickedMesh) { // Важная проверка на null/undefined
                                 console.log("Имя объекта:", pickResultMove.pickedMesh.name);
                             } else {
                                 console.log("Пересечение произошло, но объект не определен.");
                             }*/



                            var ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), camera);
                            var intersect = scene.pickWithRay(ray, predicateForPick);

                            // Если пересечение найдено, то:
                            if (intersect.hit) {


                                /* console.log("Координаты пересечения:", intersect.pickedPoint);
                                 if (intersect.pickedMesh) { // Важная проверка на null/undefined
                                     console.log("Имя объекта:", intersect.pickedMesh.name);
                                 } else {
                                     console.log("Пересечение произошло, но объект не определен.");
                                 }*/

                                var normal = intersect.getNormal(true); // нормаль на точке пересечения

                                var offset = 0.1;  // Задаем небольшое смещение вдоль нормали (например, 0.1)
                                currentCircle.position = intersect.pickedPoint.add(normal.scale(offset)); // добавляем нормаль, умноженную на смещение

                                // Логируем нормаль
                                // console.log("Нормаль поверхности:", normal.toString());


                                /* var upVector = BABYLON.Vector3.Up(); // стандартная ось "вверх"
                                 var axis = BABYLON.Vector3.Cross(upVector, normal).normalize(); // ось вращения
                                 var angle = Math.acos(BABYLON.Vector3.Dot(upVector, normal)); // угол поворота
                                 currentCircle.rotation = new BABYLON.Quaternion.RotationAxis(axis, angle); // применяем кватернион*/
                                currentCircle.lookAt(intersect.pickedPoint.add(normal));  // Поворачивает объект так, чтобы его локальная ось z была направлена вдоль нормали
                                currentCircle.rotation.x += Math.PI / 2;
                                // console.log("currentCircle.position", currentCircle.position);
                            }






                            // Дальше проверяем движение мыши
                            if (isMouseDown) {
                                const currentMousePosition = new BABYLON.Vector2(scene.pointerX, scene.pointerY);

                                // Проверяем, двигалась ли мышь
                                if (lastMousePosition && !isMouseMoved) {
                                    const deltaX = currentMousePosition.x - lastMousePosition.x;
                                    const deltaY = currentMousePosition.y - lastMousePosition.y;

                                    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) { // Порог для определения перемещения
                                        // console.log("Мышь перемещается.");
                                        isMouseMoved = true;
                                    }
                                }
                                lastMousePosition = currentMousePosition;
                            }
                        }

                        break;
                    }



                case BABYLON.PointerEventTypes.POINTERUP:
                    if (pointerInfo.event.button === 0) { // Если левая кнопка отпущена
                        if (!isMouseMoved) {
                            //console.log("Это был клик без перемещения.");
                            const pickResult = scene.pick(scene.pointerX, scene.pointerY);

                            if (pickResult.hit) {
                                const targetPoint = pickResult.pickedPoint;

                                // Пример перемещения камеры в точку
                                const safePoint = findSafePoint(targetPoint);
                                moveCameraToPoint(safePoint);
                            }
                        } else {
                            // console.log("Мышь перемещалась перед отпусканием.");
                        }

                        // Сбрасываем состояния
                        isMouseDown = false;
                        isMouseMoved = false;
                        lastMousePosition = null;
                    }
                    break;
            }
        });


    } else {
        engine.runRenderLoop(() => {
            statsFPS.begin();
            statsMS.begin();
            statsMB.begin();
            scene.render(); // Возобновляем рендеринг существующей сцены
            statsFPS.end();
            statsMS.end();
            statsMB.end();
        });
    }

};

// Включаем стандартный индикатор загрузки (крутящийся круг)






function loadModel(path, debug = false) {
    // Загрузка GLB модели
    // engine.displayLoadingUI();
    // Извлекаем путь из modelPath

    const pathhdr = path.substring(0, path.lastIndexOf('/') + 1);
    // scene.createDefaultEnvironment();
    // scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://playground.babylonjs.com/textures/environment.dds", scene);
    if (debug) {
        scene.debugLayer.show({
            embedMode: true,  // Помещает отладочный слой внутрь страницы
            overlay: true,    // Использует наложение, предотвращая растягивание
        });
    }



    const progressCallback = (progress) => {
        let percentage = (progress.loaded / progress.total) * 100;
        loadingScreen.loadingUIText = `Загрузка модели: ${Math.round(percentage)}%`;
    }

    //loadingScreen.loadingUIText = `Загрузка окружения`;
    const hdrTexture = new BABYLON.HDRCubeTexture(pathhdr + "envMap.hdr", scene, 512);
    // hdrTexture.level = 0.5;
    //scene.activeCamera.exposure = 0.1; 
    // Устанавливаем как карту окружения
    scene.environmentTexture = hdrTexture;

    var dome = new BABYLON.PhotoDome(
        "testdome",
        pathhdr + "environmentTexture.jpg",
        {
            resolution: 32,
            size: 1000,
            useDirectMapping: true
        },
        scene
    );

    BABYLON.SceneLoader.ImportMesh("", "./", path, scene, (meshes) => {
        console.log("Сцена создана.");

        // Создаем кольцо (торус)
        currentCircle = BABYLON.MeshBuilder.CreateTorus("ring", {
            diameter: 0.15, // Диаметр кольца
            thickness: 0.02, // Толщина кольца
            tessellation: 32 // Количество сегментов для гладкости
        }, scene);

        // Создаем материал для кольца
        const material = new BABYLON.StandardMaterial("ringMaterial", scene);
        material.emissiveColor = new BABYLON.Color3(1, 1, 1); // Белый цвет
        material.disableLighting = true; // Отключаем освещение



        material.backFaceCulling = false;
        currentCircle.material = material;
        currentCircle.collisionGroup = CIRCLE_MASK;
        currentCircle.collisionMask = 0; // Не сталкивается ни с чем (или можно указать другую группу, если нужно)
        currentCircle.checkCollisions = false;


        // GlowLayer для выделения светящихся объектов
        const glowLayer = new BABYLON.GlowLayer("glow", scene);
        glowLayer.intensity = 0.5;
        glowLayer.addExcludedMesh(currentCircle);
        camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(-2, 1.5, 1), scene);
        scene.activeCamera.viewport = new BABYLON.Viewport(0, 0, 1, 1);
        camera.setTarget(new BABYLON.Vector3(-3, 1.5, 1)); // Точка, на которую смотрит камера
        camera.minZ = 0.1;
        // Устанавливаем радиус коллизий камеры
        camera.checkCollisions = true;
        camera.collisionsEnabled = true;
        camera.radius = 0.1;  // Радиус столкновения камеры
        camera.ellipsoid = new BABYLON.Vector3(0.2, 1.0, 0.2);
        // Включаем коллизии для объектов на сцене
        scene.collisionsEnabled = true;
        // Закрепляем управление на холсте
        camera.attachControl(canvas, true);
        // Включаем управление клавиатурой
        camera.keysUp.push(87);    // W - вперед
        camera.keysDown.push(83);  // S - назад
        camera.keysLeft.push(65);  // A - влево
        camera.keysRight.push(68); // D - вправо

        // Настраиваем скорость передвижения
        camera.speed = 0.1;

        /*let ssaoPipeline = new BABYLON.SSAO2RenderingPipeline("ssao", scene, {
            ssaoRatio: 0.5,       // Коэффициент разрешения SSAO
            blurRatio: 0.5        // Коэффициент разрешения размытия

        });

        ssaoPipeline.expensiveBlur = true;       // Более качественное размытие
        ssaoPipeline.samples = 16;              // Количество выборок для AO
        ssaoPipeline.maxZ = 424;                // Максимальная глубина AO
        ssaoPipeline.radius = 0.6;                 // Радиус выборки AO
        ssaoPipeline.totalStrength = 3.9;       // Интенсивность AO
        ssaoPipeline.base = 0.6;
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);*/
        // scene.postProcessRenderPipelineManager.attachPipelinesToRender(ssao, true);
        const fxaa = new BABYLON.FxaaPostProcess("fxaa", 1.0, camera);

        // Предполагается, что библиотека SMAA импортирована
        // const taaRenderPipeline = new BABYLON.TAARenderingPipeline("taa", scene, [camera]);

        // taaRenderPipeline.isEnabled = true;
        //  taaRenderPipeline.samples = 8;





        // Добавление Bloom через DefaultRenderingPipeline
        const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
        /* pipeline.bloomEnabled = true;
          pipeline.bloomThreshold = 0.6;
          pipeline.bloomIntensity = 1.0;*/
        engine.runRenderLoop(() => {
            statsFPS.begin();
            statsMS.begin();
            statsMB.begin();
            scene.render(); // Возобновляем рендеринг существующей сцены
            statsFPS.end();
            statsMS.end();
            statsMB.end();
        });


        meshes.forEach((mesh) => {
            // console.log(mesh.name);
            if (mesh.name === "walls")
                return;
            if (mesh.name === "ceillings")
                return;
            if (mesh.name === "outer_walls")
                return;
            if (mesh.name === "floor")
                return;
            if (mesh.name === "carpet_main_room")
                return;
            if (mesh.name === "carpet_hall")
                return;
            if (mesh.name === "bath_floor")
                return;
            if (mesh.name === "carpet_bedroom")
                return;
            if (mesh.name === "bath_carpet")
                return;
            if (mesh.name == "ring")
                return;

            mesh.checkCollisions = true; // Отключаем для всех объектов, кроме этого
            mesh.collisionGroup = GROUND_MASK;
            mesh.collisionMask = GROUND_MASK;
            //mesh.setEnabled(false); 
            //mesh.showBoundingBox = true;
            //mesh.receiveShadows = true; // Модель будет принимать тени
            //mesh.castShadows = true; // Модель будет отбрасывать тени

            if (mesh.material) {
                const material = mesh.material;

                const isMirrorMaterial = material.name && material.name.toLowerCase().includes("mirror");
                // Проверяем условия для металличности и шероховатости
                const isReflectiveMaterial = material.metallic >= 0.9 && material.roughness <= 0.1 && material.reflectivity >= 0.8;
                // Проверяем userData для дополнительной метки
                const hasUserDataMirror = material.userData && material.userData.isMirror;
                //console.log("Found mirror-like material:", material.name);

                if (isMirrorMaterial || isReflectiveMaterial || hasUserDataMirror) {
                    console.log("Found mirror-like material:", material.name, mesh.name);
                    applyMirrorEffect(mesh, scene, camera); // Применяем эффект зеркала                           
                }

                if (material.name === "Material") {//шторы
                    material.indexOfRefraction = 3;
                    // material.metallic = 0.6;
                }

                if (material.name.includes("light")) {

                    const intensity = 1.0; // Уровень интенсивности
                    material.emissiveColor = new BABYLON.Color3(1, 1, 1).scale(intensity);
                    // Создаем точечный свет для материала
                    // const lightPosition = new BABYLON.Vector3(0, 0, 0); // Позиция света относительно объекта
                    // const pointLight = new BABYLON.PointLight("pointLight_" + material.name, lightPosition, scene);

                    // Настраиваем свойства света
                    // pointLight.intensity = intensity; // Интенсивность света
                    // pointLight.diffuse = new BABYLON.Color3(1, 1, 1); // Основной цвет света
                    // pointLight.specular = new BABYLON.Color3(1, 1, 1); // Цвет бликов

                    // Если материал привязан к определенному объекту, устанавливаем позицию света на объект
                    //const mesh = scene.meshes.find(mesh => mesh.material === material);
                }

                if (material.emissiveColor) {

                    // material.emissiveColor = new BABYLON.Color3(1, 1, 0); // Желтое свечение
                    const emissiveIntensity =
                        (material.emissiveColor.r + material.emissiveColor.g + material.emissiveColor.b) / 3;


                    // glowLayer.addIncludedOnlyMesh(mesh);
                    //material.needAlphaBlending = true;
                    //material.backFaceCulling = false;
                    //console.log("Emissive Intensity (average):", emissiveIntensity);

                }


            }
            //loadingScreen.loadingUIText = `Обновление текстур для зеркала`;
            statsFPS = new Stats();
            statsFPS.showPanel(0); // Панель FPS
            document.body.appendChild(statsFPS.dom);

            statsMS = new Stats();
            statsMS.showPanel(1); // Панель MS
            statsMS.dom.style.cssText = 'position:absolute;top:50px;left:0;'; // Сдвиг для отображения рядом
            document.body.appendChild(statsMS.dom);

            statsMB = new Stats();
            statsMB.showPanel(2); // Панель MB
            statsMB.dom.style.cssText = 'position:absolute;top:0;left:80px;'; // Ещё один сдвиг
            document.body.appendChild(statsMB.dom);

        });


    }, function (progress) {
        // progressCallback(progress)
    });



    scene.executeWhenReady(() => {

        scene.meshes.forEach(mesh => {
            if (mesh.name.includes("mirror")) {
                const mirrorTexture = mesh.material.reflectionTexture;
                if (mirrorTexture) {
                    console.log(`Обновление текстуры для зеркала: ${mesh.name}`);
                    mirrorTexture.render(); // Предварительный рендер текстуры
                }
            }
        });
        //loadingScreen.hideLoadingUI();

    });

}

/*  function applyMirrorEffectToMesh(mesh, scene) {

      const hdrTexture = new BABYLON.HDRCubeTexture("путь/к/файлу.exr", scene, 256, false, true, true, function () {
          console.log("HDR texture loaded successfully!"); // Вывод в консоль при успехе
          // Здесь код для применения материала к мешу
          const mirrorMaterial = new BABYLON.StandardMaterial("mirrorMaterial", scene);
          mirrorMaterial.reflectionTexture = hdrTexture;
          mirrorMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.CUBIC_MODE;
          mirrorMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
          mirrorMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
          mesh.material = mirrorMaterial;

      }, function (message, exception) {
          console.error("Error loading HDR texture:", message, exception); // Вывод ошибки в консоль
          if (exception) {
              console.error("Detailed error:", exception); // Дополнительная информация об ошибке
          }
      });
  }*/
function applyMirrorEffectToMesh(mesh, scene) {

    // const hdrTexture = new BABYLON.HDRCubeTexture("Model/Mirrors/hall_mirror_primitive0/6_in_ones.exr", scene, 512);
    /*   const hdrTexture = new BABYLON.HDRCubeTexture("Model/Mirrors/hall_mirror_primitive0/6_in_ones.exr", scene, 512); // 128 - размер текстуры

// Создание материала
const mirrorMaterial = new BABYLON.StandardMaterial("mirrorMaterial", scene);
mirrorMaterial.reflectionTexture = hdrTexture;
mirrorMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE; // Важно для зеркал
mirrorMaterial.specularColor = new BABYLON.Color3(0, 0, 0); // Отключаем блики от материала, оставляем только отражения
mirrorMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // Убираем диффузный цвет

// Применение материала к мешу
mesh.material = mirrorMaterial;*/
    //return;

    // Создаем отражающую текстуру CubeTexture
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 0.5 }, scene);

    const cubeTexture = new BABYLON.CubeTexture("Model/Mirrors/hall_mirror_primitive0/skybox", scene);

    // Создаем материал для зеркального эффекта
    const mirrorMaterial = new BABYLON.StandardMaterial("mirrorMaterial", scene);
    mirrorMaterial.reflectionTexture = cubeTexture;
    mirrorMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    // mirrorMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.CUBIC_MODE;
    mirrorMaterial.specularColor = new BABYLON.Color3(0, 0, 0); // Отключаем блики
    mirrorMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // Отключаем диффузный свет

    // Применяем материал к переданному мешу
    mesh.material = mirrorMaterial;


    skybox.material = mirrorMaterial;

    skybox.position.x -= 1;
    skybox.position.z += 1;
    skybox.position.y += 1;
    mesh.scaling = new BABYLON.Vector3(1, 1, 1); // Восстановление масштаба
    // mirrorMaterial.reflectionTexture.level = 0.5; // Уменьшаем интенсивность
}

async function createCubeMirror(mesh, scene, urls) {
    if (urls.length !== 6) {
        console.error("Требуется 6 URL-адресов для кубической текстуры.");
        return;
    }

    // 1. Создаем кубическую текстуру
    const cubeTexture = new BABYLON.CubeTexture.CreateFromPrefilteredData(urls, scene);

    // 2. Создаем материал
    const mirrorMaterial = new BABYLON.StandardMaterial("cubeMirrorMaterial_" + mesh.name, scene);
    mirrorMaterial.reflectionTexture = cubeTexture;
    mirrorMaterial.roughness = 0.0; // Для зеркального отражения
    mirrorMaterial.metallic = 1.0; // Для металлического блеска (по желанию)
    mirrorMaterial.disableLighting = true; // Отключаем стандартное освещение

    // 3. Применяем материал к мешу
    mesh.material = mirrorMaterial;

    return cubeTexture;
}

// Пример использования:
const urls = [
    "Model/Mirrors/hall_mirror_primitive0/image_px.jpg", // Справа
    "Model/Mirrors/hall_mirror_primitive0/image_nx.jpg", // Слева
    "Model/Mirrors/hall_mirror_primitive0/image_py.jpg", // Сверху
    "Model/Mirrors/hall_mirror_primitive0/image_ny.jpg", // Снизу
    "Model/Mirrors/hall_mirror_primitive0/image_pz.jpg", // Спереди
    "Model/Mirrors/hall_mirror_primitive0/image_nz.jpg", // Сзади
];





let frameCounter = 0; // Счетчик кадров
const updateFrequency = 2; // Обновлять каждые 2 кадра





function applyMirrorEffect(mesh, scene, camera) {
    // Создаём текстуру зеркала
    const mirrorTexture = new BABYLON.MirrorTexture("mirrorTexture_" + mesh.name, 1024, scene, true);

    let mirrorPlane;

    if (mesh.getClassName() === "Mesh" && mesh.geometry) { // Проверка, что это Mesh и у него есть геометрия
        // Попытка получить нормаль на основе геометрии (лучше для плоских поверхностей)
        mesh.computeWorldMatrix(true);
        const worldVertices = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const worldMatrix = mesh.getWorldMatrix();

        if (worldVertices && worldVertices.length >= 9) {
            const p1 = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(worldVertices[0], worldVertices[1], worldVertices[2]), worldMatrix);
            const p2 = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(worldVertices[3], worldVertices[4], worldVertices[5]), worldMatrix);
            const p3 = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(worldVertices[6], worldVertices[7], worldVertices[8]), worldMatrix);

            let normal = BABYLON.Vector3.Cross(p2.subtract(p1), p3.subtract(p1)).normalize();

            if (mesh.name.includes("bath_mirror_primitive0")) {
                normal = new BABYLON.Vector3(0, 0, -1);
            }

            mirrorPlane = BABYLON.Plane.FromPositionAndNormal(mesh.getAbsolutePosition(), normal);
            console.log("Using geometry-based normal for mirror:", mesh.name); // Отладочное сообщение
        } else {
            console.warn("Mesh has no vertices or not enough vertices to calculate normal. Falling back to default normal.", mesh.name);
        }
    }

    if (!mirrorPlane) { // Если не удалось вычислить нормаль по геометрии или это не Mesh
        // Используем нормаль, направленную вверх (подходит для кругов и других случаев)
        const normal = BABYLON.Vector3.Up(); // Или BABYLON.Vector3.Forward() или другая, в зависимости от ориентации


        mirrorPlane = BABYLON.Plane.FromPositionAndNormal(mesh.getAbsolutePosition(), normal);
        console.log("Using default normal (Up) for mirror:", mesh.name); // Отладочное сообщение
    }

    mirrorTexture.mirrorPlane = mirrorPlane;

    // Создаём материал для зеркала
    const mirrorMaterial = new BABYLON.StandardMaterial("mirrorMaterial_" + mesh.name, scene);
    mirrorMaterial.reflectionTexture = mirrorTexture;
    mirrorMaterial.disableLighting = false;
    mirrorMaterial.reflectionTexture.level = 0.8; // Настройка интенсивности отражения
    mirrorTexture.refreshRate = 0;
    // Применяем материал к объекту
    mesh.material = mirrorMaterial;

    // Настраиваем, какие объекты будут отражаться
    mirrorTexture.renderList = scene.meshes.filter((m) => m !== mesh);
    //mesh.position.x += 0.1; // Немного поднимаем зеркало над поверхностью
    // mesh.rotation.y = Math.PI; // 180 градусов в радианах
    // Отладочный вывод
    console.log("Mirror Plane:", mirrorPlane);
    console.log("Mirror Plane Normal:", mirrorPlane.normal);
    console.log("Mirror Plane Distance:", mirrorPlane.d);
}






// Переменные для отслеживания состояний кнопки мыши
let isMouseDown = false;
let isMouseMoved = false;
let lastMousePosition = null;





const predicate = (mesh) => {
    return (mesh.collisionMask & GROUND_MASK) !== 0;
};

const predicateForPick = (mesh) => {
    return (mesh.collisionMask & GROUND_MASK) !== 0 && mesh !== currentCircle; // Исключаем currentCircle
};





// Функция для поиска безопасной точки без коллизий
function findSafePoint(targetPoint) {
    const ray = new BABYLON.Ray(camera.position, targetPoint.subtract(camera.position).normalize(), 100); // Рэй от камеры в точку клика
    const hit = scene.pickWithRay(ray);  // Проверяем на столкновение с объектами

    // Если рэй не пересекает объекты, значит можно двигаться прямо к точке
    if (!hit.hit) {
        return targetPoint;
    } else {
        // Если столкновение найдено, возвращаем точку чуть ближе, чтобы избежать пересечения
        return hit.pickedPoint.subtract(ray.direction.scale(0.5));  // Понижаем точку немного
    }
}


// Функция для плавного движения камеры
function moveCameraToPoint(targetPoint) {
    // Начальные координаты камеры
    const startPosition = camera.position.clone();
    // Направление, в котором должна двигаться камера
    const direction = targetPoint.subtract(camera.position).normalize();
    // Время движения (в миллисекундах)
    const duration = 1000;
    // Плавное движение с помощью tween
    BABYLON.Animation.CreateAndStartAnimation("moveCamera", camera, "position", 60, duration / 30, startPosition, targetPoint, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

}


// Цикл рендера
/* engine.runRenderLoop(function () {
     stats.begin(); // Начало измерения производительности
     scene.render();
     // fpsTextBlock.text = "FPS: " + Math.round(engine.getFps());
     stats.end(); // Конец измерения производительности
 });*/

// Изменение размера окна
window.addEventListener("resize", function () {
    engine.resize();
});