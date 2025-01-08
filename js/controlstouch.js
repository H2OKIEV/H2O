function onTouchEnd(event) {
    if (event.changedTouches.length === 1) {
        isMouseDown = false;
        container.classList.remove('cursor-clicking');

        var touchEndTime = performance.now();
        var timeDiff = touchEndTime - mouseDownTime;

        if (!mouseMoved && timeDiff < 200) {
            onClick(event);
        }
    }
}

function onTouchStart(event) {
    if (event.touches.length === 1) {

        var touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isMouseDown = true;
        mouseMoved = false;
        mouseDownTime = performance.now();
        container.classList.add('cursor-clicking');
        //event.preventDefault();
    }
}

function onTouchMove(event) {
    if (event.touches.length === 1 && isMouseDown) {

        var touch = event.touches[0];
        var deltaX = touch.clientX - touchStartX;
        var deltaY = touch.clientY - touchStartY;

        var sensitivity = 0.002;

        yaw += deltaX * sensitivity;
        pitch += deltaY * sensitivity;

        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        var yawQuaternion = new THREE.Quaternion();
        yawQuaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'XYZ'));

        var pitchQuaternion = new THREE.Quaternion();
        pitchQuaternion.setFromEuler(new THREE.Euler(pitch, 0, 0, 'XYZ'));

        camera.quaternion.copy(yawQuaternion);
        camera.quaternion.multiply(pitchQuaternion);

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        mouseMoved = true;
        event.preventDefault();
    }
}