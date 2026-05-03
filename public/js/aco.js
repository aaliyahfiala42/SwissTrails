const trails = window.trails || [];
const map = L.map('map', {
    zoomControl: false,
    preferCanvas: true
}).setView([46.8, 8.2], 10);

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const markers = [];

trails.forEach((trail) => {
    const marker = L.circleMarker([trail.latitude, trail.longitude], {
        radius: 4,
        fillColor: '#285943',
        color: '#ffffff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.85
    })
    .addTo(map)
    .bindPopup(`
        <strong>${trail.trail_name}</strong><br>
        <span>${Number(trail.latitude).toFixed(4)}, ${Number(trail.longitude).toFixed(4)}</span>    
        `);

    markers.push(marker);
});
//fit map to show all trails
if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0));
}

/* 
//Example testing setup
//simulated ants visualization
const antIcon = L.icon({
    iconUrl: 'assets/ant-silhouette.png',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAncor: [0, -12]
});

//create an example path for testing display
const examplePathIndices = [0, 3, 5, 2, 7, 15, 12, 30, 18, 17, 1, 9, 4, 8, 10, 0];

//convert to coordinate, draw line path
const examplePath = examplePathIndices.map(i => [
    trails[i].latitude,
    trails[i].longitude
]);
const pathLine = L.polyline(examplePath, {
    color: 'green',
    dashArray: '6, 6',
    weight: 2,
    opacity: 0.8,
    lineCap: 'round'
}).addTo(map);

const antMarkers = examplePath.map((latlng, i) => {
    return L.marker(latlng, { icon: antIcon })
        .addTo(map)
        .bindPopup(`Ant at step ${i + 1}`);
})
 */

const antInput = document.getElementById("antsInput");
const iterationsInput = document.getElementById("iterationsInput");
const trailsInput = document.getElementById("trailsInput");
const evaporationInput = document.getElementById("evaporationInput");
const alphaInput = document.getElementById("alphaInput");
const betaInput = document.getElementById("betaInput");
const pheromoneInput = document.getElementById("pheromoneInput");

const iterationMetric = document.getElementById("iterationMetric");
const costMetric = document.getElementById("costMetric");

const convergenceCanvas = document.getElementById('convergenceCanvas');
const ctx = convergenceCanvas.getContext('2d');

let antMarkers = [];
let antLines = [];
let bestRouteLine = null;
let running = false;
let convergenceHistory = [];


const antIcon = L.icon({
    iconUrl: '/assets/ant-silhouette.png',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
    className: 'ant-icon'
});


//set same random values for comparisons
function randomNumberGenerator(seed){
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; //between 0 and 1
    };
}


//convert to coordinates
function latLngTrail(index, points) {
    return [points[index].latitude, points[index].longitude ];
}

//calculate Haversine distnace in kilometers
//Haversine
//formula: 	a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
//c = 2 ⋅ atan2( √a, √(1−a) )
//d = R ⋅ c
//where: 	φ is latitude, λ is longitude, R is earth’s radius (mean radius = 6,371km);

function haversine(p1, p2){
    const R =  6371;
    const phi1 = p1.latitude * Math.PI / 180; //radians
    const phi2 = p2.latitude * Math.PI / 180;

    const dphi = (p2.latitude - p1.latitude) * Math.PI/180;
    const dlambda = (p2.longitude - p1.longitude) * Math.PI/180;

    const a = Math.sin(dphi/2) ** 2 +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dlambda/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;

    return d;
}

//distanceMatrix[i][j] distance from point i to j
function buildDistanceMatrix(points) {
    const n = points.length; 
    const matrix = Array.from({length: n}, () => Array(n).fill(0));

    for (let i = 0; i < n; i++){
        for (let j = 0; j < n; j++){
            if (i !== j){
                matrix[i][j] = haversine(points[i], points[j]);
            }
        }
    }

    return matrix;
}

//pick next point using pheromone and distance
//score_ij​=τ_ij**α ​(1/d_ij​​**)β
//Pij​=(​τ_ij**α ​η_ij**β)/ ∑k∈unvisited ​τ_ik**α ​η_ik**β​​,  ηij​=1/d_ij​​
function chooseNextPoint(current, visited, pheromone, distanceMetric, alpha, beta, rand){
    const choices = [];
    let totalScore = 0;

    for ( let j = 0; j < visited.length; j++){
        if(!visited[j]){
            const tau = pheromone[current][j] ** alpha;
            const eta  = (1/distanceMetric[current][j]) ** beta;
            const score = tau * eta;

            choices.push({ index: j, score});
            totalScore+= score;
        }
    }

    //random choice, influence by score
    let random = rand() * totalScore;

    for (const choice of choices) {
        random -= choice.score;
        if (random <= 0){
            return choice.index;
        }
    }

    //else return last valid unvisited point
    return choices[choices.length - 1].index;
}

//compute total route cost 
function routeCost(route, distanceMatrix){
    let cost = 0;

    for (let i = 0; i < route.length -1; i++){
        cost += distanceMatrix[route[i]][route[i+1]];
    }

    //go home
    cost += distanceMatrix[route[route.length-1]][route[0]];

    return cost;
}

//draw current best
function drawBestRoute(route, points){
    const coords = route.map( i => latLngTrail(i, points));
    coords.push(latLngTrail(route[0], points));

    if (bestRouteLine) {
        map.removeLayer(bestRouteLine);
    }

    bestRouteLine = L.polyline(coords, {
        color: '#285943',
        weight: 2,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);
}


function drawConvergence() {
    ctx.clearRect(0, 0, convergenceCanvas.width, convergenceCanvas.height);

    if (convergenceHistory.length < 2) return;

    const padding = 30;
    const width = convergenceCanvas.width - padding * 2;
    const height = convergenceCanvas.height - padding * 2;
    const min = Math.min(...convergenceHistory);
    const max = Math.max(...convergenceHistory);
    const range = max-min || 1;



    ctx.beginPath();

    //draw axes
    ctx.moveTo(padding,padding);
    ctx.lineTo(padding, padding + height);
    ctx.lineTo(padding +width, padding + height);
    ctx.strokeStyle="#999";
    ctx.stroke();

    ctx.fillStyle = "#667";
    ctx.fillText(max.toFixed(1), 2, padding+4);
    ctx.fillText(min.toFixed(1), 2, padding+height);
    ctx.fillText("1", padding, padding +height+14);
    ctx.fillText(convergenceHistory.length, padding +width -8, padding +height+14);

        ctx.beginPath();

    convergenceHistory.forEach((value, i) => {
        const x = padding + (i/ (convergenceHistory.length -1) *width);
        const normalized = (value - min)/((max -min) || 1);
        const y = padding + height - normalized*height;


        if (i == 0){
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
}


//eraser
function clearACOLayers() {
    antMarkers.forEach(marker=> map.removeLayer(marker));
    antLines.forEach(line => map.removeLayer(line));

    antMarkers=[];
    antLines=[];

    if(bestRouteLine){
        map.removeLayer(bestRouteLine);
        bestRouteLine=null;
    }

    convergenceHistory = [];
    drawConvergence();

    iterationMetric.textContent = '0';
    costMetric.textContent = "-";

}




function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



//Ant Colony Optimization algorithm
async function runACO(){
    if (running) return;

    clearACOLayers();
    running=true;

    const seed = 241757;
    const rand = randomNumberGenerator(seed);

    const m = Number(antInput.value);
    const maxIterations = Number(iterationsInput.value);
    const maxTrails = Number(trailsInput.value);

    //choose n first points, TODO: switch out with trail selection
    const points = trails.slice(0, Math.min(maxTrails, trails.length));

    const n = points.length;
    const distanceMatrix = buildDistanceMatrix(points);

    const evaporation = Number(evaporationInput.value);
    const Q = Number(pheromoneInput.value)
    const alpha = Number(alphaInput.value);
    const beta = Number(betaInput.value);

    let pheromone = Array.from({ length: n }, () => Array(n).fill(1));

    let bestRoute = null;
    let bestCost = Infinity;

    //visualize initial conditions
    for (let a = 0; a < m; a++){
        const start = a % n;
        const marker = L.marker(latLngTrail(start, points), {
            icon: antIcon
        }).addTo(map);

        const line = L.polyline([latLngTrail(start, points)], {
            color: '#d97706',
            weight: 1,
            opacity: 0.52,
            lineCap: 'round',
            interactive: false
        }).addTo(map);

        antMarkers.push(marker);
        antLines.push(line);
    }


    //run iterations
    for (let iter = 1; iter<= maxIterations; iter++ ){
        if(!running) break;

        const routes = [];
        const costs = [];


        //build a route for each ant
        for (let a = 0; a < m; a++){
            const start = a %n;
            const visited = Array(n).fill(false);
            const route = [start];

            visited[start] = true;

            let current = start;

            antMarkers[a].setLatLng(latLngTrail(current, points));
            antLines[a].setLatLngs([latLngTrail(current, points)]);

            while(route.length < n) {
                const next = chooseNextPoint(current, visited, pheromone, distanceMatrix, alpha, beta, rand);

                route.push(next);
                visited[next] = true;
                current = next;
                
                //visualize route for ant a
                const coords = route.map(x => latLngTrail(x, points));

                antMarkers[a].setLatLng(latLngTrail(current, points));
                antLines[a].setLatLngs(coords);

                await sleep(4);
            }

            const cost = routeCost(route, distanceMatrix);

            routes.push(route);
            costs.push(cost);

            if (cost < bestCost){
                bestCost = cost;
                bestRoute = route.slice();

                drawBestRoute(bestRoute, points);
            }

        }

        //evaporate
        for (let i = 0; i < n; i++ ){
            for ( let j = 0; j <n; j++){
                pheromone[i][j] *= evaporation;
            }
        }

        //pheromone
        for (let p = 0; p < routes.length; p++){
            const route = routes[p];
            const cost = costs[p];
            const deposit = Q / cost;

            for ( let i = 0; i < route.length -1; i++){
                const from = route[i];
                const to = route[i+1];

                pheromone[from][to] += deposit;
                pheromone[to][from] += deposit;
            }

            const lastEdge = route[route.length-1];
            const firstEdge = route[0];

                pheromone[lastEdge][firstEdge] += deposit;
                pheromone[firstEdge][lastEdge] += deposit;
        }

        convergenceHistory.push(bestCost);
        iterationMetric.textContent = iter;
        costMetric.textContent = bestCost.toFixed(2);
        drawConvergence();

        await sleep(20);
    }
    running = false;
}




document.getElementById('startACOBtn').addEventListener('click', runACO);
document.getElementById('resetACOBtn').addEventListener('click', () => {
    running = false;
    clearACOLayers();

})

