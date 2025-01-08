// Обновление позиции камеры
function updateCameraPosition() {
    const speed = 0.02;
    const direction = new THREE.Vector3();

    // Движение вперед и назад
    if (keys.ArrowUp || keys.KeyW) {
        camera.getWorldDirection(direction);
        if (!checkCollisions(direction.clone().multiplyScalar(speed))) {
            camera.position.addScaledVector(direction, speed);
        }
    }
    if (keys.ArrowDown || keys.KeyS) {
        camera.getWorldDirection(direction);
        if (!checkCollisions(direction.clone().multiplyScalar(-speed))) {
            camera.position.addScaledVector(direction, -speed);
        }
    }

    // Движение влево и вправо
    if (keys.ArrowLeft || keys.KeyA) {
        camera.getWorldDirection(direction);
        const left = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
        if (!checkCollisions(left.clone().multiplyScalar(speed))) {
            camera.position.addScaledVector(left, speed);
        }
    }
    if (keys.ArrowRight || keys.KeyD) {
        camera.getWorldDirection(direction);
        const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
        if (!checkCollisions(right.clone().multiplyScalar(speed))) {
            camera.position.addScaledVector(right, speed);
        }
    }
    camera.position.y = 1.5;
}


// Управление камерой через клавиши
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false
};

// Обработчики событий для нажатия и отпускания клавиш
document.addEventListener('keydown', (event) => {
    console.log('devicePixelRatio:', window.devicePixelRatio);
    if (event.code in keys) {
        keys[event.code] = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.code in keys) {
        keys[event.code] = false;
    }
});

// Создание Raycaster для обнаружения столкновений

const collisionDistance = 0.5; // Минимальное расстояние до объекта
const rayHeightSteps = 5; // Количество проверок по высоте
const rayHeightInterval = 0.2; // Интервал между лучами по высоте

function checkCollisions(direction) {
    // return false;
    for (let i = 0; i < rayHeightSteps; i++) {
        // Смещаем положение луча вверх на определенную высоту
        const rayOrigin = camera.position.clone();
        rayOrigin.y -= i * rayHeightInterval;

        raycaster.set(rayOrigin, direction.normalize());
        //const intersects = raycaster.intersectObjects(scene.children, true);
        var intersects = raycaster.intersectObjects(
            scene.children.filter(obj => !(obj instanceof THREE.BoxHelper) && obj !== circle),
            true
        );
        intersects = intersects.filter(intersect => !(intersect.object instanceof THREE.BoxHelper));

        if (intersects.length > 0 && intersects[0].distance < collisionDistance) {
            return true; // Обнаружено столкновение
        }
    }
    return false; // Столкновений нет
}