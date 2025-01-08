function countTriangles(scene) {
    let totalTriangles = 0;

    scene.traverse((object) => {
        //console.log(object.name);
        //console.log(object.type);
        if (object.isMesh) { // Проверяем, что объект является мешем
            const geometry = object.geometry;

            if (geometry.index !== null) {
                // Считаем треугольники для геометрии с индексом
                totalTriangles += geometry.index.count / 3;
            } else if (geometry.attributes.position !== undefined) {
                // Считаем треугольники для геометрии без индекса
                totalTriangles += geometry.attributes.position.count / 3;
            }
        }
    });

    console.log(`Общее количество треугольников: ${totalTriangles}`);
    return totalTriangles;
}

