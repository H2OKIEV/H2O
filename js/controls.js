function onMouseMove(event) {
    // Преобразуем координаты мыши в диапазон [-1, 1]
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    // Обновляем Raycaster
    raycaster.setFromCamera(mouse, camera);

    // Пересечения с объектами сцены, исключая круг
    var intersects = raycaster.intersectObjects(
        scene.children.filter(obj => !(obj instanceof THREE.BoxHelper) && obj !== circle),
        true
    );
    intersects = intersects.filter(intersect => !(intersect.object instanceof THREE.BoxHelper));

    /* if (intersects.length > 0) {
         intersects.forEach(intersect => {
             console.log("Пересечен объект:", intersect.object);
         });
     } else {
         console.log("Пересечений не было.");
     }*/

    if (intersects.length > 0) {
        var intersect = intersects[0];

        // Устанавливаем позицию круга на точку пересечения
        circle.position.copy(intersect.point);
        const normal = intersect.face.normal.clone(); // Нормаль поверхности

        // Поворачиваем круг в направлении нормали
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), // Ось нормали по умолчанию
            normal.normalize() // Нормаль к поверхности
        );
        circle.quaternion.copy(quaternion);

        // Делаем круг видимым
        circle.visible = true;
        container.classList.add('cursor-pointer');
        container.classList.remove('cursor-clicking');
    } else {
        // Если нет пересечений, скрываем круг
        circle.visible = false;
        container.classList.remove('cursor-pointer');
    }

    // Устанавливаем флаг перемещения мыши
    if (isMouseDown) {
        const distanceMoved = Math.sqrt(
            Math.pow(event.clientX - lastMousePosition.x, 2) +
            Math.pow(event.clientY - lastMousePosition.y, 2)
        );

        if (distanceMoved > MOVE_THRESHOLD) {
            mouseMoved = true; // Устанавливаем флаг только если перемещение больше порога
        }
    }

    lastMousePosition.x = event.clientX; // Обновляем последнюю позицию
    lastMousePosition.y = event.clientY;
}

function onMouseDown(event) {
    if (event.button === 0) {
        mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

        lastMousePosition.x = event.clientX; // Сохраняем начальную позицию мыши
        lastMousePosition.y = event.clientY;

        mouseX = event.clientX;
        mouseY = event.clientY;
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
        isMouseDown = true;
        mouseDownTime = performance.now();
        mouseMoved = false;
        container.classList.add('cursor-clicking');
    }
}

function onMouseUp(event) {
    if (event.button === 0) {
        isMouseDown = false;
        container.classList.remove('cursor-clicking');

        var mouseUpTime = performance.now();
        var timeDiff = mouseUpTime - mouseDownTime;
        // console.log('клик:', timeDiff, mouseMoved);
        if (!mouseMoved) {
            onClick(event); // Вызываем onClick только если мышь не двигалась
        }
    }
}

let lastMousePosition = { x: 0, y: 0 }; // Для хранения последней позиции мыши
const MOVE_THRESHOLD = 5; // Пороговое значение для перемещения мыши (в пикселях)

// Параметры "человека"
const personHeight = 1;
const personRadius = 0.2; // Примерный радиус для проверки столкновений

// Функция для проверки столкновения с BoxHelper
function isColliding(position, log = false) {

    for (const child of scene.children) {
        if (child.name === "boxHelper_outer_walls")
            continue;
        if (child.name === "boxHelper_Body45")
            continue;
        if (child.name === "boxHelper_Body45_2")
            continue;
        if (child instanceof THREE.BoxHelper) {
            const box = new THREE.Box3().setFromObject(child.object);
            const personBox = new THREE.Box3(
                new THREE.Vector3(position.x - personRadius, 0.2, position.z - personRadius),
                new THREE.Vector3(position.x + personRadius, 1.5, position.z + personRadius)
            );
            if (box.intersectsBox(personBox)) {
                if (log) {
                    console.log("Столкновение ", child);
                    console.log("Столкновение ", personBox);
                }

                return true; // Столкновение есть
            }
        }
    }
    return false; // Столкновения нет
}


let calculatedPoints = [];

// Функция для очистки всех предыдущих точек
function clearCalculatedPoints() {
    calculatedPoints.forEach(point => {
        scene.remove(point); // Удаляем точку из сцены
        point.geometry.dispose(); // Освобождаем память геометрии
        point.material.dispose(); // Освобождаем память материала
    });
    calculatedPoints = []; // Очищаем массив
}

// Функция для поиска безопасной точки рядом с целевой
function findSafePosition(targetPosition, searchRadius = 0.5) {
    let wallAndCeilingsBox = null;

    for (const child of scene.children) {
        if (child.name === "boxHelper_Body45" && child instanceof THREE.BoxHelper) {
            wallAndCeilingsBox = new THREE.Box3().setFromObject(child.object);
            break;
        }
    }

    if (!wallAndCeilingsBox) {
        console.error("boxHelper_wall_and_ceillings не найден!");
        return null;
    }

    let closestSafePosition = null;
    let closestDistance = Infinity;

    const numChecks = 32;
    const raycaster = new THREE.Raycaster(); // Создаем Raycaster один раз

    // Предварительная подготовка: материал и геометрия для точек
    const visibleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Зеленый - для видимых точек
    const blockedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Красный - для невидимых точек
    const blocked2Material = new THREE.MeshBasicMaterial({ color: 0xfff000 }); // Красный - для невидимых точек
    const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16); // Радиус 0.1, сегменты 16

    clearCalculatedPoints(); // Очистка перед новым расчетом

    for (let i = 0; i < numChecks; i++) {
        const angle = (i / numChecks) * Math.PI * 2;
        const checkPosition = new THREE.Vector3(
            targetPosition.x + searchRadius * Math.cos(angle),
            cameraHeight, // Устанавливаем корректную высоту
            targetPosition.z + searchRadius * Math.sin(angle)
        );

        if (checkPosition.distanceTo(camera.position) < 0.5) continue;
        let materialToUse;

        if (wallAndCeilingsBox.containsPoint(checkPosition)) {
            if (!isColliding(checkPosition, true)) {
                // Проверка видимости с помощью Raycasting
                const direction = checkPosition.clone().sub(camera.position).normalize();
                raycaster.set(camera.position, direction);

                var intersects = raycaster.intersectObjects(
                    scene.children.filter(obj => !(obj instanceof THREE.BoxHelper) && obj !== circle && obj !== scene.getObjectByName("Body45")&& obj !== scene.getObjectByName("Body45_2")),
                    true
                );

                let materialToUse;

                if (intersects.length === 0 || intersects[0].distance > checkPosition.distanceTo(camera.position)) {
                    // Точка видна
                    materialToUse = visibleMaterial;
                    const distance = targetPosition.distanceTo(checkPosition);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestSafePosition = checkPosition;
                    }
                } else {
                    // Точка невидима
                    materialToUse = blockedMaterial;
                    console.log("Точка не видна из-за:", intersects[0].object);
                }

                // Визуализация точки
               
            }
            else
            {
                materialToUse = blocked2Material;
            }
        }
       

       /* const pointMesh = new THREE.Mesh(sphereGeometry, materialToUse);
        pointMesh.position.copy(checkPosition);
        scene.add(pointMesh); // Добавляем точку в сцену
        calculatedPoints.push(pointMesh); // Сохраняем ссылку на точку*/
    }


    if (closestSafePosition) {
        console.log("Найдена ближайшая безопасная и видимая позиция:", closestSafePosition);
    } else {
        console.log("В радиусе", searchRadius, "не найдена безопасная и видимая позиция внутри boxHelper_wall_and_ceillings");
    }
    return closestSafePosition;
}

function onClick(event) {
    // Вычисление координат мыши
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;


    raycaster.setFromCamera(mouse, camera);
    console.log(mouse.x, mouse.y);

    // Обновление линии для визуализации
    const rayStart = raycaster.ray.origin.clone(); // Начало луча (камера)
    let rayEnd; // Конец луча

    // Проверка пересечений
    var intersects = raycaster.intersectObjects(
        scene.children.filter(obj => !(obj instanceof THREE.BoxHelper) && obj !== circle),
        true
    );
    intersects = intersects.filter(intersect => !(intersect.object instanceof THREE.BoxHelper));

    if (intersects.length > 0) {
        // Точка пересечения
        rayEnd = intersects[0].point.clone();
        // clickMarker.position.copy(rayEnd);
    } else {
        // Если пересечений нет, линия до максимальной длины
        rayEnd = rayStart.clone().add(raycaster.ray.direction.clone().multiplyScalar(100));

    }

    // Обновление геометрии линии
    // rayLineGeometry.setFromPoints([rayStart, rayEnd]);

    if (intersects.length > 0) {
        let intersectPoint = intersects[0].point.clone();
        var clickPoint = intersects[0].point.clone();

        var startPosition = camera.position.clone();
        var stopDistance = 0.5;

        if (startPosition.distanceTo(intersectPoint) < stopDistance + 0.5) {
            console.log("Камера уже достаточно близко. Запускаем анимацию поворота.");

            animateRotation(clickPoint); // Анимация поворота камеры
            return; // Выход из функции, если движение не требуется
        }


        intersectPoint.y = cameraHeight + personHeight / 2; // Учитываем высоту "человека" и ставим центр капсулы
        if (isColliding(intersectPoint, true)) {
            console.log("Целевая точка внутри BoxHelper. Ищем безопасную позицию.");
            const safePosition = findSafePosition(intersectPoint);
            if (safePosition) {
                console.log("Найдена безопасная позиция:", safePosition);
                moveToPosition(safePosition);
                //animateRotation(clickPoint); 
            } else {
                console.log("Безопасная позиция не найдена.");
                // intersectPoint.y = cameraHeight;
                // Обработка ситуации, когда безопасная точка не найдена
                animateRotation(clickPoint); // Анимация поворота камеры
                return; // Выход из функции, если движение не требуется 
            }
        } else {



            moveToPosition(intersectPoint);
        }
    } else {
        console.log('Нет пересечений');
    }
}

function moveToPosition(targetPosition) {
    var duration = 1000; // Продолжительность анимации
    var startPosition = camera.position.clone(); // Начальная позиция камеры
    var stopDistance = 0.5; // Расстояние, на котором остановится камера           

    var startTime = performance.now(); // Время старта

    function animateMovement() {
        var elapsedTime = performance.now() - startTime; // Время, прошедшее с начала
        var t = elapsedTime / duration; // Нормализованное время для анимации

        // Линейная интерполяция позиции камеры
        if (t < 1) {
            camera.position.lerpVectors(startPosition, targetPosition, t);

            // Проверяем расстояние до целевой позиции
            if (camera.position.distanceTo(targetPosition) > stopDistance) {
                requestAnimationFrame(animateMovement); // Продолжаем анимацию
            }
        } else {
            // Если анимация завершена, но расстояние больше 0.5 метра, устанавливаем конечную позицию
            if (camera.position.distanceTo(targetPosition) > stopDistance) {
                camera.position.copy(targetPosition);
                // camera.lookAt(targetPosition); // Устанавливаем направление взгляда
            }
        }
    }

    animateMovement();
}

let isAnimating = false;
let yaw = 0;
let pitch = 0;
function animateRotation(targetPosition) {
    if (isAnimating) return; // Чтобы предотвратить повторный запуск анимации, если она уже идет

    isAnimating = true;

    var startQuaternion = camera.quaternion.clone(); // Начальная ориентация камеры
    var targetQuaternion = new THREE.Quaternion(); // Целевая ориентация камеры
    var duration = 1000; // Продолжительность анимации
    var startTime = performance.now();

    // Вычисляем целевой поворот для камеры
    camera.lookAt(targetPosition);
    targetQuaternion.copy(camera.quaternion);
    camera.quaternion.copy(startQuaternion); // Возвращаем начальную ориентацию

    function animate() {
        var elapsedTime = performance.now() - startTime;
        var t = Math.min(elapsedTime / duration, 1); // Нормализованное время для анимации (0 до 1)

        // Линейная интерполяция кватернионов
        camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, t);

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            camera.quaternion.copy(targetQuaternion); // Устанавливаем конечную ориентацию
            isAnimating = false; // Завершаем анимацию
            currentCameraQuaternion.copy(camera.quaternion); // Сохраняем новую ориентацию камеры
            var cameraRotation = new THREE.Euler().setFromQuaternion(currentCameraQuaternion, 'YXZ');
            yaw = cameraRotation.y;
            pitch = cameraRotation.x;
        }
    }

    animate();
}

function onDocumentMouseMove(event) {
    if (isMouseDown && !isAnimating) {
        var deltaX = event.clientX - prevMouseX;
        var deltaY = event.clientY - prevMouseY;

        var sensitivity = 0.002;
        var maxDelta = 0.1;

        yaw += Math.max(-maxDelta, Math.min(maxDelta, deltaX * sensitivity));
        pitch += Math.max(-maxDelta, Math.min(maxDelta, deltaY * sensitivity));

        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        let smoothedYaw = yaw;
        let smoothedPitch = pitch;
        let smoothingFactor = 0.1;

        smoothedYaw = THREE.MathUtils.lerp(smoothedYaw, yaw, smoothingFactor);
        smoothedPitch = THREE.MathUtils.lerp(smoothedPitch, pitch, smoothingFactor);


        var quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(new THREE.Euler(smoothedPitch, smoothedYaw, 0, 'YXZ'));

        camera.quaternion.copy(quaternion);

        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
    }
}