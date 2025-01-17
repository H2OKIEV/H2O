//import * as BABYLON from 'https://cdn.babylonjs.com/babylon.max.js';
//import 'https://cdn.babylonjs.com/gui/babylon.gui.min.js'; // GUI добавляется к BABYLON
//import 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js'; // Подключение дополнительных загрузчиков
//import * as dat from 'https://cdn.jsdelivr.net/npm/dat.gui/build/dat.gui.module.js';
//import Stats from 'https://cdn.jsdelivr.net/npm/threejs-utils@0.1.3/lib/stats.module.js';

// Элементы интерфейса
const modal = document.getElementById('modal');

const closeModal = document.getElementById('closeModal');
let canvas = document.getElementById('renderCanvas');
let sceneCreated = false;
let engine;
let scene;
let camera;
let statsFPS, statsMS, statsMB;


export function stop3DTour() {
    engine.stopRenderLoop();
};

export function start3DTour(modelPath, debug = false) {
    if (!sceneCreated) {

        engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialiasing: true });

        scene = new BABYLON.Scene(engine);


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

        statsFPS = new Stats();
        statsFPS.showPanel(0); // Панель FPS
        document.body.appendChild(statsFPS.dom);

        statsMS = new Stats();
        statsMS.showPanel(1); // Панель MS
        statsMS.dom.style.cssText = 'position:absolute;top:40px;left:0;'; // Сдвиг для отображения рядом
        document.body.appendChild(statsMS.dom);

        statsMB = new Stats();
        statsMB.showPanel(2); // Панель MB
        statsMB.dom.style.cssText = 'position:absolute;top:0;left:80px;'; // Ещё один сдвиг
        document.body.appendChild(statsMB.dom);



        // Ограничение высоты камеры
        scene.onBeforeRenderObservable.add(() => {
            if (camera.position.y < 1.5) {
                camera.position.y = 1.5; // Минимальная высота
            }
            if (camera.position.y > 1.5) {
                camera.position.y = 1.5; // Максимальная высота (фиксируем на уровне 1.5)
            }
        });

        let ssaoPipeline = new BABYLON.SSAO2RenderingPipeline("ssao", scene, {
            ssaoRatio: 0.5,       // Коэффициент разрешения SSAO
            blurRatio: 0.5        // Коэффициент разрешения размытия

        });

        ssaoPipeline.expensiveBlur = true;       // Более качественное размытие
        ssaoPipeline.samples = 16;              // Количество выборок для AO
        ssaoPipeline.maxZ = 424;                // Максимальная глубина AO
        ssaoPipeline.radius = 0.6;                 // Радиус выборки AO
        ssaoPipeline.totalStrength = 3.9;       // Интенсивность AO
        ssaoPipeline.base = 0.6;
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);

        const fxaa = new BABYLON.FxaaPostProcess("fxaa", 1.0, camera);

        // Предполагается, что библиотека SMAA импортирована
        // const taaRenderPipeline = new BABYLON.TAARenderingPipeline("taa", scene, [camera]);

        // taaRenderPipeline.isEnabled = true;
        //  taaRenderPipeline.samples = 8;


        // Включаем управление клавиатурой
        camera.keysUp.push(87);    // W - вперед
        camera.keysDown.push(83);  // S - назад
        camera.keysLeft.push(65);  // A - влево
        camera.keysRight.push(68); // D - вправо

        // Настраиваем скорость передвижения
        camera.speed = 0.1;
        camera.onCollide = function (collidedMesh) {
            console.log("Камера столкнулась с объектом: " + collidedMesh.name);
        };

        // Добавление Bloom через DefaultRenderingPipeline
        const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
        /* pipeline.bloomEnabled = true;
          pipeline.bloomThreshold = 0.6;
          pipeline.bloomIntensity = 1.0;*/

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

        engine.resize();
        scene.loadingUIText = "Загрузка...";  // Текст для отображения на экране
        //scene.loadingScreen = new BABYLON.DefaultLoadingScreen(engine, scene);
        // scene.loadingScreen.displayLoadingUI(); // Показываем экран загрузки
        // Замените на путь к вашему GBL файлу
        loadModel(modelPath, debug);
        sceneCreated = true;
        engine.runRenderLoop(() => {
            statsFPS.begin();
            statsMS.begin();
            statsMB.begin();
            scene.render(); // Возобновляем рендеринг существующей сцены
            statsFPS.end();
            statsMS.end();
            statsMB.end();
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

// Создаем группы столкновений (лучше использовать битовые маски)
const GROUND_MASK = 1 << 0; // 1
const CIRCLE_MASK = 1 << 1; // 2






//  const gui = new dat.GUI();

// Создаем папку для SSAO настроек
// const ssaoFolder = gui.addFolder('SSAO Settings');

// Управляем параметрами через пользовательские действия
/* ssaoFolder.add({ ssaoRatio: 0.5 }, 'ssaoRatio', 0.1, 1).name('SSAO Ratio').onChange(function (value) {
     ssaoPipeline.dispose(); // Удаляем старый пайплайн
     ssaoPipeline = new BABYLON.SSAO2RenderingPipeline("ssao", scene, {
         ssaoRatio: value, // Обновляем параметр
         blurRatio: ssaoPipeline.blurRatio // Сохраняем остальные настройки
     });
     ssaoPipeline.samples = 16;
     ssaoPipeline.expensiveBlur = true;
     scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);
 });

 ssaoFolder.add({ blurRatio: 0.5 }, 'blurRatio', 0.1, 1).name('Blur Ratio').onChange(function (value) {
     ssaoPipeline.dispose(); // Удаляем старый пайплайн
     ssaoPipeline = new BABYLON.SSAO2RenderingPipeline("ssao", scene, {
         ssaoRatio: ssaoPipeline.ssaoRatio, // Сохраняем остальные настройки
         blurRatio: value
     });
     ssaoPipeline.samples = 16;
     ssaoPipeline.expensiveBlur = true;
     scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssao", camera);
 });*/

// Добавляем другие параметры напрямую
/*  ssaoFolder.add(ssaoPipeline, 'samples', 1, 32).name('Samples').onChange(function (value) {
      ssaoPipeline.samples = Math.floor(value);
  });

  ssaoFolder.add(ssaoPipeline, 'maxZ', 1, 1000).name('Max Z').onChange(function (value) {
      ssaoPipeline.maxZ = value;
  });

  ssaoFolder.add(ssaoPipeline, 'radius', 0.1, 5).name('Radius').onChange(function (value) {
      ssaoPipeline.radius = value;
  });

  ssaoFolder.add(ssaoPipeline, 'totalStrength', 0, 10).name('Total Strength').onChange(function (value) {
      ssaoPipeline.totalStrength = value;
  });

  ssaoFolder.add(ssaoPipeline, 'base', 0, 1).name('Base').onChange(function (value) {
      ssaoPipeline.base = value;
  });

  // Открываем GUI
  ssaoFolder.open();*/






// Создание света
// const light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(-1, -2, -1), scene);
// light.position = new BABYLON.Vector3(10, 10, 0);
// Включение теней
// light.shadowMinZ = 1;
// light.shadowMaxZ = 1000;
// const shadowGenerator = new BABYLON.ShadowGenerator(1024, light);

// Создание пола, чтобы увидеть тени
//const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
// ground.receiveShadows = true; // Пол также будет принимать тени
// Загрузка HDRI текстуры по умолчанию


// Загрузка GLB файла по умолчанию
/*  BABYLON.SceneLoader.Append("./", "untitled.glb", scene, function (scene) {
      scene.createDefaultCameraOrLight(true, true, true); // Создаем стандартную камеру и свет, если их нет
  });*/




let currentCircle; // Переменная для хранения текущего круга


//  var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

/*  const progressBar = new BABYLON.GUI.Rectangle();
  progressBar.width = "400px";
  progressBar.height = "20px";
  progressBar.color = "white";
  progressBar.thickness = 2;
  progressBar.background = "green";
  progressBar.top = "10px";
  progressBar.left = "10px";
  progressBar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  progressBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  advancedTexture.addControl(progressBar);

  // Текст с процентом
  const progressText = new BABYLON.GUI.TextBlock();
  progressText.text = "Загрузка: 0%";
  progressText.color = "white";
  progressText.fontSize = 24;
  progressText.top = "15px";
  progressText.left = "15px";
  progressText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  progressText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  advancedTexture.addControl(progressText);*/


/*   var fpsTextBlock = new BABYLON.GUI.TextBlock();
   fpsTextBlock.text = "FPS: 0";
   fpsTextBlock.fontSize = 24;
   fpsTextBlock.color = "white";
   fpsTextBlock.top = "10px";
   fpsTextBlock.left = "10px";
   advancedTexture.addControl(fpsTextBlock);*/
/* scene.onDataLoadedObservable.add(() => {
     console.log("Загрузка завершена");

     // Скрытие загрузочного экрана
     advancedTexture.dispose(); // Удалить GUI
 });*/


/*  document.getElementById("loadModelButton").onclick = function () {
      const modelPath = "Model/flat_1C1/flat_1C1.glb"; // Замените на путь к вашему GBL файлу
      loadModel(modelPath);
  };*/

function loadModel(path, debug = false) {
    // Загрузка GLB модели
    BABYLON.SceneLoader.ImportMesh("", "./", path, scene, (meshes) => {


        meshes.forEach(function (mesh) {

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
            }

        });

        // Установка свойств для отбрасывания теней
        /*  meshes.forEach(mesh => {
              mesh.receiveShadows = true; // Модель будет принимать тени
              mesh.castShadows = true; // Модель будет отбрасывать тени
              // Дополнительно: можно настроить материал, если требуется
          });*/

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

          /*  if (mesh.name === "main_room_lamp_primitive0") { // Проверяем, что меш существует
               
                // Получаем позицию меша для размещения света
                const meshPosition = mesh.getAbsolutePosition();
                console.log("Mesh found:", mesh.name, meshPosition);
                // Создаем точечный свет (PointLight) в позиции меша
                const light = new BABYLON.PointLight("meshLight_" + mesh.name, meshPosition, scene);

                // Устанавливаем интенсивность света
                light.intensity = 10;

                // Дополнительные настройки света (по желанию)
                light.diffuse = new BABYLON.Color3(1, 1, 1); // Цвет диффузного освещения
                light.specular = new BABYLON.Color3(0.5, 0.5, 0.5); // Цвет бликов
                light.range = 100; // Радиус действия света (опционально)

                // Привязываем свет к мешу (опционально)
                // Это позволит свету двигаться вместе с мешем
                //light.parent = mesh;

            } else {
                // console.error("Mesh not found for material:", mesh.name);
            }*/

            mesh.checkCollisions = true; // Отключаем для всех объектов, кроме этого
            mesh.collisionGroup = GROUND_MASK;
            mesh.collisionMask = GROUND_MASK;
            // mesh.showBoundingBox = true;

        });

        // Настраиваем материалы после загрузки
        scene.meshes.forEach(mesh => {

           

            if (mesh.material) {
                const material = mesh.material;
                // console.log("material", material.name, material.roughness);
                // Проверяем и добавляем свечение
                if (material.emissiveColor) {
                    if (mesh.name == "ring")
                        return;

                    // material.emissiveColor = new BABYLON.Color3(1, 1, 0); // Желтое свечение
                    const emissiveIntensity =
                        (material.emissiveColor.r + material.emissiveColor.g + material.emissiveColor.b) / 3;

                    if (material.name.includes("light")) {

                        const intensity = 2.0; // Уровень интенсивности
                        material.emissiveColor = new BABYLON.Color3(1, 1, 1).scale(intensity);
                        // Создаем точечный свет для материала
                        // const lightPosition = new BABYLON.Vector3(0, 0, 0); // Позиция света относительно объекта
                        // const pointLight = new BABYLON.PointLight("pointLight_" + material.name, lightPosition, scene);

                        // Настраиваем свойства света
                        // pointLight.intensity = intensity; // Интенсивность света
                        // pointLight.diffuse = new BABYLON.Color3(1, 1, 1); // Основной цвет света
                        // pointLight.specular = new BABYLON.Color3(1, 1, 1); // Цвет бликов

                        // Если материал привязан к определенному объекту, устанавливаем позицию света на объект
                        const mesh = scene.meshes.find(mesh => mesh.material === material);



                    }

                    /* if(material.name == "Material.002") {
                         material.alpha = 0.25;
                     }*/



                    /* if (material.name.includes("Ccl Net Curtain Fabric") || material.name === "Material") {
                         console.log("emissiveColor", material.name);
                         material.subSurface.isTranslucencyEnabled = true; // Включение эффекта полупрозрачности
                         // material.subSurface.translucencyIntensity = 0.8; // Интенсивность рассеивания света
                         // material.albedoColor = new BABYLON.Color3(1, 1, 1); // Цвет материала
                         // material.alpha = 0.8; // Дополнительная прозрачность
                         //material.metallic = 0.5;
                         //material.roughness = 0.2;
                     }*/
                    // glowLayer.addIncludedOnlyMesh(mesh);
                    //material.needAlphaBlending = true;
                    //material.backFaceCulling = false;
                    //console.log("Emissive Intensity (average):", emissiveIntensity);

                }

                // Добавляем меш в GlowLayer
                //glowLayer.addIncludedOnlyMesh(mesh);
            }
        });
        // Извлекаем путь из modelPath
        const pathhdr = path.substring(0, path.lastIndexOf('/') + 1);
        // scene.createDefaultEnvironment();
        // scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://playground.babylonjs.com/textures/environment.dds", scene);
        if (debug)
            scene.debugLayer.show({
                embedMode: true,  // Помещает отладочный слой внутрь страницы
                overlay: true,    // Использует наложение, предотвращая растягивание
            });

        /* scene.debugLayer.show({
          embedMode: true, // Размещение отладочного слоя внутри веб-страницы
          position: BABYLON.DebugLayer.Position.TOP_RIGHT, // Позиция отладочного слоя
          overlay: true // Использовать наложение, чтобы не растягивать экран
      });*/
        // scene.debugLayer.setSize(window.innerWidth * 0.5, window.innerHeight * 0.5);
        // Теперь создаем HDR текстуру, используя тот же путь
        const hdrTexture = new BABYLON.HDRCubeTexture(pathhdr + "envMap.hdr", scene, 512);
        // hdrTexture.level = 0.5;
        //scene.activeCamera.exposure = 0.1; 
        // Устанавливаем как карту окружения
        scene.environmentTexture = hdrTexture;
        /* scene.environmentTexture.coordinatesMode = BABYLON.Texture.SPHERICAL_MODE;
 scene.environmentTexture.gammaSpace = false;
 scene.imageProcessingConfiguration.toneMappingEnabled = true;
 scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES; // Использование ACES*/
        //  scene.environmentTexture.rotationY = Math.PI ; 
        // scene.environmentIntensity = 0.5;
        // scene.environmentIntensity = 3.0;
        // scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Черный фон
        //scene.createDefaultSkybox(hdrTexture, true, 1000, 0.3); // Skybox

        // Добавление света
        /* var light2 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
        light2.intensity = 0.5;*/

        // Создаем направленный свет (как солнце)
        /*const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(0, -1, 0), scene);
        
        // Настроим яркость света, чтобы она была похожа на солнечное освещение
        sunLight.intensity = 1.0;  // Интенсивность света (можно настроить в зависимости от сцены)
        
        // Устанавливаем цвет света для имитации солнечного цвета
        sunLight.diffuse = new BABYLON.Color3(1, 1, 0.9);  // Желтоватый оттенок, как у солнца
        
        // Настроим позицию, чтобы солнечные лучи падали под правильным углом
        // В Blender солнце обычно расположено высоко над сценой, направлено вниз
        sunLight.position = new BABYLON.Vector3(0, 100, 0); // Высота света (можно настроить в зависимости от нужд)
        sunLight.setDirectionToTarget(new BABYLON.Vector3(0, 0, 0)); // Направление света к центру сцены
        
        // Настроим тени от солнечного света, если это необходимо
        sunLight.shadowMinZ = 1.0;  // Минимальное расстояние от света для теней
        sunLight.shadowMaxZ = 1000.0;  // Максимальное расстояние для теней*/

        //progressBar.width = "100%"; // Заполнить прогресс-бар
        // progressText.text = "Загрузка завершена!";


    }, function (progress) {
        // Обновление процента загрузки
        // let percentage = (progress.loaded / progress.total) * 100;
        //progressBar.width = percentage + "%";
        // progressText.text = `Загрузка: ${Math.round(percentage)}%`;
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

// Обработчик клика для движения камеры
/* canvas.addEventListener("click", function (event) {
     console.log("Mouse up detected:", event.button);
     // Если левая кнопка мыши была нажата и не было перемещения мыши
     if (event.button === 0 && !isMouseMoved) {
         const pickResult = scene.pick(scene.pointerX, scene.pointerY);

         if (pickResult.hit) {
             // Точка, в которую мы хотим двигать камеру
             const targetPoint = pickResult.pickedPoint;

             // Ищем ближайшую точку, где нет коллизий
             const safePoint = findSafePoint(targetPoint);

             // Двигаем камеру в безопасную точку
             moveCameraToPoint(safePoint);
         }
     }
 });*/

// Обработчик зажатия левой кнопки мыши
/* canvas.addEventListener("mousedown", function (event) {

     if (event.button === 0) { // Проверяем, если нажата левая кнопка мыши
         isMouseDown = true;
         isMouseMoved = false; // Сбросим флаг, если зажали кнопку
         lastMousePosition = new BABYLON.Vector2(scene.pointerX, scene.pointerY);
     }
 });*/


/*  scene.onPointerMove = function (evt) {
             const pickResult = scene.pick(evt.clientX, evt.clientY);
 
             if (pickResult.hit) {
                 console.log("Точка пересечения:", pickResult.pickedPoint);
                 console.log("Объект, с которым произошло пересечение:", pickResult.pickedMesh);
             }
         };*/

// Добавляем GUI для рисования круга


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