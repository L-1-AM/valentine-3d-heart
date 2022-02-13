import * as THREE from 'three'
import * as R from 'remeda'

const render = () => {
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
    )

    const renderer = new THREE.WebGLRenderer()

    renderer.setSize(window.innerWidth, window.innerHeight)

    document.body.appendChild(renderer.domElement)

    interface Vertex {
        x: number
        y: number
        z: number
    }

    const vertex = (x: number, y: number, z = 0): Vertex => ({ x, y, z })

    type Polygon = [Vertex, Vertex, Vertex]

    const newPolygon = (a: Vertex, b: Vertex, c: Vertex) => [a, b, c] as Polygon

    interface VertexTranslate {
        x?: number
        y?: number
        z?: number
    }

    const vertexTranslate = (
        vertex: Vertex,
        translate: VertexTranslate,
    ): Vertex => ({
        x: vertex.x + (translate.x ?? 0),
        y: vertex.y + (translate.y ?? 0),
        z: vertex.z + (translate.z ?? 0),
    })

    type PolygonTranslate = [
        VertexTranslate?,
        VertexTranslate?,
        VertexTranslate?,
    ]

    const polygonTranslate = (polygon: Polygon, translate: PolygonTranslate) =>
        polygon.map((vertex, i) =>
            vertexTranslate(vertex, translate[i] ?? {}),
        ) as Polygon

    const translateX = (polygon: Polygon, amount: number) =>
        polygonTranslate(polygon, [{ x: amount }, { x: amount }, { x: amount }])

    const mirrorX = (polygon: Polygon, mirrorLine: number) => {
        // Distance between x vertex and the x mirror line.
        const vertexToMirrorLine = (vertex: number) => mirrorLine - vertex

        // The position of the reflected vertex.
        const reflectedVertex = (vertex: number) =>
            mirrorLine + vertexToMirrorLine(vertex)

        const reflectedPolygon = newPolygon(
            vertex(reflectedVertex(polygon[0].x), polygon[0].y, polygon[0].z),
            vertex(reflectedVertex(polygon[1].x), polygon[1].y, polygon[1].z),
            vertex(reflectedVertex(polygon[2].x), polygon[2].y, polygon[2].z),
        ).reverse() as Polygon

        return reflectedPolygon
    }

    interface Circle {
        centre: Vertex
        radius: number
    }

    const newCircle = (centre: Vertex, radius: number): Circle => ({
        centre,
        radius,
    })

    const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180

    // Converts a circle to a polygon.
    const circleToPolygons = (circle: Circle, sectors: number) => {
        // How wide each sector is.
        const sectorAngle = 360 / sectors

        return R.pipe(
            // Get the angle of each sector relative to the circle.
            R.range(0, sectors),
            R.map((sector) => sector * sectorAngle),
            // Coordinates of each sector.
            R.map((sectorAngle) => {
                const radians = degreesToRadians(sectorAngle)

                const cos = Math.cos(radians)
                const sin = Math.sin(radians)

                return vertex(
                    circle.centre.x + circle.radius * cos,
                    circle.centre.y + circle.radius * sin,
                    circle.centre.z,
                )
            }),
            // Sectors to polygons.
            (sectors) => {
                return R.map.indexed(sectors, (sector, i) =>
                    newPolygon(
                        circle.centre,
                        sector,
                        // Get next sector.
                        sectors[sectors.length === i + 1 ? 0 : i + 1],
                    ),
                )
            },
        )
    }

    // Converts a circle semi-circle from polygons.
    const circleToSemiCirclePolygons = (circle: Circle, sectors: number) =>
        R.pipe(circleToPolygons(circle, sectors * 2), (circle) =>
            R.dropLast(circle, circle.length / 2),
        )

    // Front of heart.

    const heartFrontLeftTop = circleToSemiCirclePolygons(
        newCircle(vertex(-1, 0, 0.5), 1),
        8,
    )

    const heartFrontLeftBottom = newPolygon(
        vertex(0, 0, 0.5),
        vertex(-2, 0, 0.5),
        vertex(0, -2, 0.5),
    )

    const heartFrontRightTop = R.map(heartFrontLeftTop, (polygon) =>
        mirrorX(polygon, 0),
    )
    const heartFrontRightBottom = mirrorX(heartFrontLeftBottom, 0)

    // Back of heart.

    // TODO: Code is very similar to mirrorX.
    const mirrorZ = (polygon: Polygon, mirrorLine: number) => {
        // Distance between z vertez and the z mirror line.
        const vertexToMirrorLine = (vertex: number) => mirrorLine - vertex

        // The position of the reflected vertex.
        const reflectedVertex = (vertex: number) =>
            mirrorLine + vertexToMirrorLine(vertex)

        const reflectedPolygon = newPolygon(
            vertex(polygon[0].x, polygon[0].y, reflectedVertex(polygon[0].z)),
            vertex(polygon[1].x, polygon[1].y, reflectedVertex(polygon[1].z)),
            vertex(polygon[2].x, polygon[2].y, reflectedVertex(polygon[2].z)),
        ).reverse() as Polygon

        return reflectedPolygon
    }

    const heartBackRightTop = R.map(heartFrontLeftTop, (polygon) =>
        mirrorZ(polygon, 0),
    )

    const heartBackRightBottom = newPolygon(
        vertex(0, 0, -0.5),
        vertex(-2, 0, -0.5),
        vertex(0, -2, -0.5),
    ).reverse() as Polygon

    const heartBackLeftTop = R.map(heartBackRightTop, (polygon) =>
        mirrorX(polygon, 0),
    )

    const heartBackLeftBottom = mirrorX(heartBackRightBottom, 0)

    // Sides of heart.

    // TODO: Research if there is formal name for this.

    // Get the distance between 2 vertices.
    const distanceBetweenVertices = (v1: Vertex, v2: Vertex) =>
        Math.sqrt(
            Math.pow(v1.x - v2.x, 2) +
                Math.pow(v1.y - v2.y, 2) +
                Math.pow(v1.z - v2.z, 2),
        )

    type Line = [Vertex, Vertex]

    const newLine = (a: Vertex, b: Vertex) => [a, b] as Line

    type Square = [Vertex, Vertex, Vertex, Vertex]

    const newSquare = (a: Vertex, b: Vertex, c: Vertex, d: Vertex) =>
        [a, b, c, d] as Square

    // Connect the sides of 2 polygons with planes.
    const connectPolygons = (p1: Polygon, p2: Polygon) =>
        p1
            // Join each p1 vertex with the closest p2 vertex.
            .map((v1) => [
                v1,
                p2
                    .map((v2) => ({
                        vertex: v2,
                        distance: distanceBetweenVertices(v1, v2),
                    }))
                    .sort((a, b) => (b.distance < a.distance ? 1 : -1))[0]
                    .vertex,
            ])
            // Create lines between the p1 and p2 vertices.
            .map((vertex) => newLine(vertex[0], vertex[1]))
            // Combine each pair of lines.
            .map((line, i, lines) => [
                line,
                lines[i + 1 === lines.length ? 0 : i + 1],
            ])
            // Create squares that fill between each pair of lines.
            .map((linePair) => newSquare(...linePair[0], ...linePair[1]))

    // Checks if vertices are the same.
    const isSameVertex = (v1: Vertex, v2: Vertex) =>
        v1.x === v2.x && v1.y === v2.y && v1.z === v2.z

    // Checks if polygons have the same vertices.
    const isSamePolygon = (p1: Polygon, p2: Polygon) =>
        // Check vertex 0 of polygon 1.
        (isSameVertex(p1[0], p2[0]) ||
            isSameVertex(p1[0], p2[1]) ||
            isSameVertex(p1[0], p2[2])) &&
        // Check vertex 2 of polygon 1.
        (isSameVertex(p1[1], p2[0]) ||
            isSameVertex(p1[1], p2[1]) ||
            isSameVertex(p1[1], p2[2])) &&
        // Check vertex 2 of polygon 1.
        (isSameVertex(p1[2], p2[0]) ||
            isSameVertex(p1[2], p2[1]) ||
            isSameVertex(p1[2], p2[2]))

    const isSameSquare = (s1: Square, s2: Square) =>
        // Check vertex 0 of square 1.
        (isSameVertex(s1[0], s2[0]) ||
            isSameVertex(s1[0], s2[1]) ||
            isSameVertex(s1[0], s2[2]) ||
            isSameVertex(s1[0], s2[3])) &&
        // Check vertex 1 of square 1.
        (isSameVertex(s1[1], s2[0]) ||
            isSameVertex(s1[1], s2[1]) ||
            isSameVertex(s1[1], s2[2]) ||
            isSameVertex(s1[1], s2[3])) &&
        // Check vertex 2 of square 1.
        (isSameVertex(s1[2], s2[0]) ||
            isSameVertex(s1[2], s2[1]) ||
            isSameVertex(s1[2], s2[2]) ||
            isSameVertex(s1[2], s2[3])) &&
        // Check vertex 3 of square 1.
        (isSameVertex(s1[3], s2[0]) ||
            isSameVertex(s1[3], s2[1]) ||
            isSameVertex(s1[3], s2[2]) ||
            isSameVertex(s1[3], s2[3]))

    const heartSidesSquares = R.pipe(
        [
            //connectPolygons(heartFrontLeftTop, heartBackRightTop),
            //connectPolygons(heartFrontRightTop, heartBackLeftTop),
            ...R.map(R.zip(heartFrontLeftTop, heartBackRightTop), (polygons) =>
                connectPolygons(...polygons),
            ),
            ...R.map(R.zip(heartFrontRightTop, heartBackLeftTop), (polygons) =>
                connectPolygons(...polygons),
            ),
            connectPolygons(heartFrontLeftBottom, heartBackRightBottom),
            connectPolygons(heartFrontRightBottom, heartBackLeftBottom),
        ],
        R.flatten(),
    )

    const heartSides = R.pipe(
        heartSidesSquares,
        // TODO: Doesn't work bottom of the semi-circles.
        // Remove squares that cannot be seen.
        R.filter((s1) =>
            R.pipe(
                heartSidesSquares,
                R.filter((s2) => isSameSquare(s1, s2)),
                (squares) => squares.length === 1,
            ),
        ),
        // Convert squares to triangles.
        R.map((square) => [
            newPolygon(square[1], square[2], square[0]),
            newPolygon(square[3], square[2], square[1]),
        ]),
        R.flatten(),
    )

    // Constructing heart.

    const polygons: Polygon[] = [
        // Front segments.
        ...heartFrontLeftTop,
        heartFrontLeftBottom,
        ...heartFrontRightTop,
        heartFrontRightBottom,
        // Back segments
        ...heartBackRightTop,
        ...heartBackLeftTop,
        heartBackLeftBottom,
        heartBackRightBottom,
        // Side segments
        ...heartSides,
    ]

    // Set vertices from points.
    const points = R.pipe(
        polygons,
        R.flatten(),
        R.map(({ x, y, z }) => [x, y, z]),
        R.flatten(),
        (points) => new Float32Array(points),
    )

    const heartGeometry = new THREE.BufferGeometry()

    heartGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3))

    // Set normals from polygons.
    heartGeometry.computeVertexNormals()

    // TODO: Need to consider uv.

    const heartWireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(heartGeometry),
        new THREE.LineBasicMaterial({ color: 0xffcc00 }),
    )

    const heartBasic = new THREE.Mesh(
        heartGeometry,
        new THREE.MeshBasicMaterial({ color: 0xffcc00 }),
    )

    const heartPhong = new THREE.Mesh(
        heartGeometry,
        new THREE.MeshPhongMaterial({
            color: 0xe9606c,
        }),
    )

    const heartShape = [
        //
        //heartWireframe,
        //
        //heartBasic,
        //
        heartPhong,
    ]

    heartShape.forEach((shape) => {
        scene.add(shape)
        //shape.rotation.y += degreesToRadians(90)
        //shape.rotation.z += degreesToRadians(-90)
    })

    camera.position.z = 10
    camera.position.y = 0

    // Lighting
    var light = new THREE.PointLight(0xffffff)
    light.position.set(0, 0, 20)
    scene.add(light)

    // Animation
    const animate = () => {
        requestAnimationFrame(animate)

        heartShape.forEach((shape) => {
            shape.rotation.y += degreesToRadians(0.5)
        })

        renderer.render(scene, camera)
    }

    animate()
}

render()
