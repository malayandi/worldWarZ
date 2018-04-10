//COLORS
var Colors = {
    red:0xf25346,
    white:0xd8d0d1,
    brown:0x59332e,
    brownDark:0x23190f,
    pink:0xF5986E,
    yellow:0xf4ce93,
    blue:0x68c3c0,
    green:0x669900,
    greenDark:0x535640,
    golden:0xff9900,
    orangeDark: 0xFF4500,
};


/**
*
* Step 1: Setting up the scene, camera, and renderer.
*
*/
var scene,
		camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH,
		renderer, container;

function createScene() {
	// Get the width and the height of the screen,
	// use them to set up the aspect ratio of the camera 
	// and the size of the renderer.
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	// Create the scene
	scene = new THREE.Scene();

	// Add a fog effect to the scene; same color as the
	// background color used in the style sheet
	scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
	
	// Create the camera
	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera( // TODO: Consider using an orthographic camera instead.
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);
	
	// Set the position of the camera
	camera.position.x = 0;
	camera.position.z = 200;
	camera.position.y = 100;
	
	// Create the renderer
	renderer = new THREE.WebGLRenderer({ 
		// Allow transparency to show the gradient background
		// we defined in the CSS
		alpha: true, 

		// Activate the anti-aliasing; this is less performant,
		// but, as our project is low-poly based, it should be fine :)
		antialias: true 
	});

	// Define the size of the renderer; in this case,
	// it will fill the entire screen
	renderer.setSize(WIDTH, HEIGHT);
	
	// Enable shadow rendering
	renderer.shadowMap.enabled = true;
	
	// Add the DOM element of the renderer to the 
	// container we created in the HTML
	container = document.getElementById('world');
	container.appendChild(renderer.domElement);
	
	// Listen to the screen: if the user resizes it
	// we have to update the camera and the renderer size
	window.addEventListener('resize', handleWindowResize, false);
}

// Adjust height and width of the renderer and the camera if the user
// changes the screen size.
function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}



/**
*
* Step 2: Setting up the lights.
*
*/
var ambientLight, hemisphereLight, shadowLight;

function createLights() {
	// A hemisphere light is a gradient colored light; 
	// the first parameter is the sky color, the second parameter is the ground color, 
	// the third parameter is the intensity of the light
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9);
    	
	// A directional light shines from a specific direction. 
	// It acts like the sun, that means that all the rays produced are parallel. 
	shadowLight = new THREE.DirectionalLight(0xffffff, .9);

	// Set the direction of the light  
	shadowLight.position.set(150, 350, 350);
	
	// Allow shadow casting 
	shadowLight.castShadow = true;

	// define the visible area of the projected shadow
	shadowLight.shadow.camera.left = -400;
	shadowLight.shadow.camera.right = 400;
	shadowLight.shadow.camera.top = 400;
	shadowLight.shadow.camera.bottom = -400;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	// define the resolution of the shadow; the higher the better, 
	// but also the more expensive and less performant
	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;
	
	// to activate the lights, just add them to the scene
	scene.add(hemisphereLight);  
	scene.add(shadowLight);
}



/**
*
* Step 3: Creating objects.
*
*/
// First let's define a Ground object :
Ground = function(){
	var geom = new THREE.CylinderGeometry(700,600,250,40,5);
	geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));

	// important: by merging vertices we ensure the continuity of the waves
	geom.mergeVertices();

	// get the vertices
	var l = geom.vertices.length;

	// create an array to store new data associated to each vertex
	this.waves = [];

	for (var i=0; i<l; i++){
		// get each vertex
		var v = geom.vertices[i];

		// store some data associated to it
		this.waves.push({y:v.y,
										 x:v.x,
										 z:v.z,
										 // a random angle
										 ang:Math.random()*Math.PI*2,
										 // a random distance
										 amp:5 + Math.random()*15,
										 // a random speed between 0.016 and 0.048 radians / frame
//										 speed:0.016 + Math.random()*0.032
                         speed:0
										});
	};
	var mat = new THREE.MeshPhongMaterial({
		color:Colors.brown,
//		transparent:true,
//		opacity:.8,
		shading:THREE.FlatShading,
	});

	this.mesh = new THREE.Mesh(geom, mat);
	this.mesh.receiveShadow = true;

}

// now we create the function that will be called in each frame 
// to update the position of the vertices to simulate the waves

Ground.prototype.moveWaves = function (){
	
	// get the vertices
	var verts = this.mesh.geometry.vertices;
	var l = verts.length;
	
	for (var i=0; i<l; i++){
		var v = verts[i];
		
		// get the data associated to it
		var vprops = this.waves[i];
		
		// update the position of the vertex
		v.x = vprops.x + Math.cos(vprops.ang)*vprops.amp;
		v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;

		// increment the angle for the next frame
		vprops.ang += vprops.speed;

	}

	// Tell the renderer that the geometry of the sea has changed.
	// In fact, in order to maintain the best level of performance, 
	// three.js caches the geometries and ignores any changes
	// unless we add this line
	this.mesh.geometry.verticesNeedUpdate=true;

	ground.mesh.rotation.z += .005;
}
// Instantiate the sea and add it to the scene:

var ground;

function createGround(){
	ground = new Ground();

	// push it a little bit at the bottom of the scene
	ground.mesh.position.y = -720;

	// add the mesh of the sea to the scene
	scene.add(ground.mesh);
}



Cloud = function(){
	// Create an empty container that will hold the different parts of the cloud
	this.mesh = new THREE.Object3D();
	
	// create a cube geometry;
	// this shape will be duplicated to create the cloud
	var geom = new THREE.BoxGeometry(20,20,20);
	
	// create a material; a simple white material will do the trick
	var mat = new THREE.MeshPhongMaterial({
		color:Colors.yellow,  
	});
	
	// duplicate the geometry a random number of times
	var nBlocs = 3+Math.floor(Math.random()*3);
	for (var i=0; i<nBlocs; i++ ){
		
		// create the mesh by cloning the geometry
		var m = new THREE.Mesh(geom, mat); 
		
		// set the position and the rotation of each cube randomly
		m.position.x = i*15;
		m.position.y = Math.random()*10;
		m.position.z = Math.random()*10;
		m.rotation.z = Math.random()*Math.PI*2;
		m.rotation.y = Math.random()*Math.PI*2;
		
		// set the size of the cube randomly
		var s = .1 + Math.random()*.9;
		m.scale.set(s,s,s);
		
		// allow each cube to cast and to receive shadows
		m.castShadow = true;
		m.receiveShadow = true;
		
		// add the cube to the container we first created
		this.mesh.add(m);
	} 
}

// Define a Sky Object
Sky = function(){
	// Create an empty container
	this.mesh = new THREE.Object3D();
	
	// choose a number of clouds to be scattered in the sky
	this.nClouds = 20;
	
	// To distribute the clouds consistently,
	// we need to place them according to a uniform angle
	var stepAngle = Math.PI*2 / this.nClouds;
	
	// create the clouds
	for(var i=0; i<this.nClouds; i++){
		var c = new Cloud();
	 
		// set the rotation and the position of each cloud;
		// for that we use a bit of trigonometry
		var a = stepAngle*i; // this is the final angle of the cloud
		var h = 750 + Math.random()*200; // this is the distance between the center of the axis and the cloud itself

		// Trigonometry!!! I hope you remember what you've learned in Math :)
		// in case you don't: 
		// we are simply converting polar coordinates (angle, distance) into Cartesian coordinates (x, y)
		c.mesh.position.y = Math.sin(a)*h;
		c.mesh.position.x = Math.cos(a)*h;

		// rotate the cloud according to its position
		c.mesh.rotation.z = a + Math.PI/2;

		// for a better result, we position the clouds 
		// at random depths inside of the scene
		c.mesh.position.z = -400-Math.random()*400;
		
		// we also set a random scale for each cloud
		var s = 1+Math.random()*2;
		c.mesh.scale.set(s,s,s);

		// do not forget to add the mesh of each cloud in the scene
		this.mesh.add(c.mesh);  
	}  
}

// Now we instantiate the sky and push its center a bit
// towards the bottom of the screen
var sky;

function createSky(){
	sky = new Sky();
	sky.mesh.position.y = -600;
	scene.add(sky.mesh);
}


// Creating the tank object
Tank = function() {
    
    this.mesh = new THREE.Object3D();

    // the tank body
    var geomBody = new THREE.BoxGeometry(100,25,50);
	var matBody = new THREE.MeshPhongMaterial({color:Colors.greenDark, shading:THREE.FlatShading});
	var body = new THREE.Mesh(geomBody, matBody);
	body.castShadow = true;
	body.receiveShadow = true;
	this.mesh.add(body);

    // the top of the tank
    var geomTop = new THREE.BoxGeometry(50,15,50);
	var matTop = new THREE.MeshPhongMaterial({color:Colors.greenDark, shading:THREE.FlatShading});
	var top = new THREE.Mesh(geomTop, matTop);
	top.castShadow = true;
	top.receiveShadow = true;
    top.position.y = 20;
	this.mesh.add(top);
    
    // glass
    var geomGlass = new THREE.BoxGeometry(40,9,5);
	var matGlass = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
	var glass = new THREE.Mesh(geomGlass, matGlass);
	glass.castShadow = true;
	glass.receiveShadow = true;
    glass.position.y = 21;
    glass.position.z = 25;
	this.mesh.add(glass);
    
    // adding wheels
    var geomWheel = new THREE.CylinderGeometry(5,5,5);
    var matWheel = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
    this.wheel1 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel1.castShadow = true;
    this.wheel1.receiveShadow = true;
    this.wheel1.position.set(45, -10, 25);
    this.wheel1.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel1);
    
    this.wheel2 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel2.castShadow = true;
    this.wheel2.receiveShadow = true;
    this.wheel2.position.set(35, -10, 25);
    this.wheel2.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel2);
    
    this.wheel3 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel3.castShadow = true;
    this.wheel3.receiveShadow = true;
    this.wheel3.position.set(25, -10, 25);
    this.wheel3.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel3);

    this.wheel4 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel4.castShadow = true;
    this.wheel4.receiveShadow = true;
    this.wheel4.position.set(15, -10, 25);
    this.wheel4.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel4);
    
    this.wheel5 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel5.castShadow = true;
    this.wheel5.receiveShadow = true;
    this.wheel5.position.set(5, -10, 25);
    this.wheel5.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel5);
    
    this.wheel6 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel6.castShadow = true;
    this.wheel6.receiveShadow = true;
    this.wheel6.position.set(-5, -10, 25);
    this.wheel6.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel6);

    this.wheel7 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel7.castShadow = true;
    this.wheel7.receiveShadow = true;
    this.wheel7.position.set(-15, -10, 25);
    this.wheel7.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel7);

    this.wheel8 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel8.castShadow = true;
    this.wheel8.receiveShadow = true;
    this.wheel8.position.set(-25, -10, 25);
    this.wheel8.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel8);
    
    this.wheel9 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel9.castShadow = true;
    this.wheel9.receiveShadow = true;
    this.wheel9.position.set(-35, -10, 25);
    this.wheel9.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel9);

    this.wheel10 = new THREE.Mesh(geomWheel, matWheel);
    this.wheel10.castShadow = true;
    this.wheel10.receiveShadow = true;
    this.wheel10.position.set(-45, -10, 25);
    this.wheel10.rotation.x = Math.PI/2;
    this.mesh.add(this.wheel10);

    
    // the shooting part
    var geomShoot = new THREE.CylinderGeometry(5,5,75,50,10);
    geomShoot.translate( 0, 37.5, 0 );
    var matShoot = new THREE.MeshPhongMaterial({color:Colors.greenDark, shading:THREE.FlatShading});
    this.shoot = new THREE.Mesh(geomShoot, matShoot);
	this.shoot.castShadow = true;
	this.shoot.receiveShadow = true;
    this.shoot.rotation.z = -Math.PI / 4;
	this.mesh.add(this.shoot);
}

var tank;

function createTank(){ 
	tank = new Tank();
	tank.mesh.scale.set(.5,.5,.5);
	tank.mesh.position.set(0, -30, -80);
	scene.add(tank.mesh);
}

var tank_move_max = 150;

function updateTank(){
	var targetX_movement = normalize(mousePos.x, -1, 1, -tank_move_max, tank_move_max);
    
    var targetX_pointing = normalize(mousePos.x, -1, 1, -300, 300);
	var targetY_pointing = normalize(mousePos.y, -1, 1, 25, 175);    

	// update the airplane's position
	tank.mesh.position.x = targetX_movement;
    tank.shoot.rotation.z = -Math.PI/2 + Math.atan2(targetY_pointing, targetX_pointing);
    tank.wheel1.rotation.y -= 0.05;
    tank.wheel2.rotation.y -= 0.05;
    tank.wheel3.rotation.y -= 0.05;
    tank.wheel4.rotation.y -= 0.05;
    tank.wheel5.rotation.y -= 0.05;
    tank.wheel6.rotation.y -= 0.05;
    tank.wheel7.rotation.y -= 0.05;
    tank.wheel8.rotation.y -= 0.05;
    tank.wheel9.rotation.y -= 0.05;
    tank.wheel10.rotation.y -= 0.05;
}

function normalize(v,vmin,vmax,tmin, tmax){
	var nv = Math.max(Math.min(v,vmax), vmin);
	var dv = vmax-vmin;
	var pc = (nv-vmin)/dv;
	var dt = tmax-tmin;
	var tv = tmin + (pc*dt);
	return tv;
}


// array to store all created bullets;
var bullets=[];

// Creating the bullets that the tank will fire
function Bullet() {
    
    var directionX, directionY;
    
    this.mesh = new THREE.Object3D();
    
    // the bullet
    var geomBull = new THREE.SphereGeometry(1.25, 32, 32);
    var matBull = new THREE.MeshBasicMaterial({color: Colors.brownDark});
    var bullet = new THREE.Mesh(geomBull, matBull);
    bullet.castShadow = true;
	bullet.receiveShadow = true;
    this.mesh.add(bullet);
}

function createBullet(directionX, directionY) {
    bullet = new Bullet();
    bullet.directionX = directionX;
    bullet.directionY = directionY;
    bullet.mesh.position.set(tank.mesh.position.x, tank.mesh.position.y, tank.mesh.position.z);
    scene.add(bullet.mesh);
    return bullet
}

function updateBullets() {
    bullets.forEach(function(b) {
        b.mesh.position.x = b.mesh.position.x + b.directionX * 3;
        b.mesh.position.y = b.mesh.position.y + b.directionY * 3;
        pos = new THREE.Vector3(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z);

        if (!(isInView(pos))) {
            var index = bullets.indexOf(b);
            bullets.splice(index, 1);
            scene.remove(b.mesh);
        }
    })
}

// array to store all coins
var coins = [];
// maximum number of coins that may be on the screen at any one time
var maxNumCoins = 10;
// probability of generating a new coin at any second
var pNewCoin = 0.015;
// total number of coins collected
var totalCoinsCollected = 0;

// Creating the coins that the tank will collect
function Coin() {
    
    this.mesh = new THREE.Object3D();
    
    var geomCoin = new THREE.CylinderGeometry(5,5,1.5);
    var matCoin = new THREE.MeshBasicMaterial({color: Colors.golden});
    var coin = new THREE.Mesh(geomCoin, matCoin);
    coin.castShadow = true;
	coin.receiveShadow = true;
    this.mesh.add(coin);
}

function findMaxY() {
//    var y = 0;
//    pos = new THREE.Vector3(0, y, tank.mesh.position.z);
//    while (isInView(pos)) {
//        y = y + 10;
//        pos = new THREE.Vector3(0, y, tank.mesh.position.z);
//    }
//    return y;
    return 250;
}

// the max Y value that is in view for the tank's Z value
var maxY;

function createCoin() {
    x = (Math.random() * 2 - 1) * tank_move_max * 1.25;
    coin = new Coin();
    coin.mesh.position.set(x, maxY, tank.mesh.position.z);
    coin.mesh.rotation.x = Math.random() * Math.PI;
    coin.mesh.rotation.y = Math.random() * Math.PI;
    coin.mesh.rotation.z = Math.random() * Math.PI;
    scene.add(coin.mesh);
    return coin;
}

var coinDistTol = 25;

function updateCoins() {
    // generating new coins
    if (coins.length < maxNumCoins && Math.random() < pNewCoin) {
        coin = createCoin();
        coins.push(coin);
    }
    // updating old coins
    coins.forEach(function(c) {
        c.mesh.position.y = c.mesh.position.y - 0.8 * difficulty;
        c.mesh.rotation.x += Math.random() * 0.01;
        c.mesh.rotation.y += Math.random() * 0.01;
        c.mesh.rotation.z += Math.random() * 0.01;
        pos = new THREE.Vector3(c.mesh.position.x, c.mesh.position.y, c.mesh.position.z);
        // checking for collision
        var diffPos = tank.mesh.position.clone().sub(c.mesh.position.clone());
        var d = diffPos.length();
        if (d < coinDistTol){
            var index = coins.indexOf(c);
            coins.splice(index, 1);
            scene.remove(c.mesh);
            totalCoinsCollected += 1;
            collected.innerHTML = totalCoinsCollected;
        }
        // removing if out of screen
        if (!(isInView(pos))) {
            var index = coins.indexOf(c);
            coins.splice(index, 1);
            scene.remove(c.mesh);
        }
    })    
}



// array to store all chunks of lava
var lavas = [];
// maximum number of chunks that may be on the screen at any one time
var maxNumLavas = 7;
// probability of generating a new chunk at any second
var pNewLava = 0.0075;
// total number of lives left
var livesLeft = 5;

// Creating the chunks of lava that the tank will avoid
function Lava() {
    
    this.mesh = new THREE.Object3D();
    
    var geomLava = new THREE.DodecahedronGeometry(8);
    var matLava = new THREE.MeshBasicMaterial({color: Colors.orangeDark});
    var lava = new THREE.Mesh(geomLava, matLava);
    lava.castShadow = true;
	lava.receiveShadow = true;
    this.mesh.add(lava);
}

function createLava() {
    x = (Math.random() * 2 - 1) * tank_move_max * 1.5;
    lava = new Lava();
    lava.mesh.position.set(x, maxY, tank.mesh.position.z);
    lava.mesh.rotation.x = Math.random() * Math.PI;
    lava.mesh.rotation.y = Math.random() * Math.PI;
    lava.mesh.rotation.z = Math.random() * Math.PI;
    scene.add(lava.mesh);
    return lava;
}

var lavaDistTol = 30;
var lavaBulDistTol = 15;

function updateLava() {
    // generating new coins
    if (lavas.length < maxNumLavas && Math.random() < pNewLava) {
        lava = createLava();
        lavas.push(lava);
    }
    // updating old coins
    lavas.forEach(function(l) {
        l.mesh.position.y = l.mesh.position.y - difficulty;
        l.mesh.rotation.x += Math.random() * 0.01;
        l.mesh.rotation.y += Math.random() * 0.01;
        l.mesh.rotation.z += Math.random() * 0.01;
        pos = new THREE.Vector3(l.mesh.position.x, l.mesh.position.y, l.mesh.position.z);
        // checking for collision with tank
        var diffPos = tank.mesh.position.clone().sub(l.mesh.position.clone());
        var d = diffPos.length();
        if (d < lavaDistTol){
            var index = lavas.indexOf(l);
            lavas.splice(index, 1);
            scene.remove(l.mesh);
            livesLeft -= 1;
            // updating health bar
            healthBar.style.width = (livesLeft/5*100).toString() + '%';
            if (livesLeft == 2) {
                healthBar.style.backgroundColor = "#ff9900";
            } else if (livesLeft < 2) {
                healthBar.style.backgroundColor = "red";
            }
        }
        // checking for collision with bullets
        bullets.forEach(function(b) {
            var diffPos = b.mesh.position.clone().sub(l.mesh.position.clone());
            var d = diffPos.length();
            if (d < lavaBulDistTol){
                // removing lava that has been hit
                var index = lavas.indexOf(l);
                lavas.splice(index, 1);
                scene.remove(l.mesh);
                // removing bullet that hit the lava
                var index = bullets.indexOf(b);
                bullets.splice(index, 1);
                scene.remove(b.mesh);
                // adding two coins for destroying a piece of lava
                totalCoinsCollected += 2;
                collected.innerHTML = totalCoinsCollected;
            }})
        // removing if out of screen
        if (!(isInView(pos))) {
            var index = lavas.indexOf(l);
            lavas.splice(index, 1);
            scene.remove(l.mesh);
        }
    })    
}

// a measure of the difficulty of the game: affects number/speed of lava/coins falling
var difficulty = 1;
// update difficulty of the game based on how many coins have been collected
function updateDiff() {
    difficulty = Math.max(1, 0.75 * Math.floor(Math.log(totalCoinsCollected/3)));
    // updating lava related parameters
    maxNumLavas = 7 + Math.floor(difficulty);
    pNewLava = 0.0075 + difficulty/500;
    // updating coin realted parameters;
    maxNumCoins = 10 + Math.floor(difficulty);
    pNewCoin = 0.015 + difficulty/250;
}

/**
*
* Step n: Setting up the game mechanics.
*
*/
// Checks if a given THREE.Vector3 object is in view of the camera
function isInView(pos) {
    camera.updateMatrix();
    camera.updateMatrixWorld();
    var frustum = new THREE.Frustum();
    frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));  

    if (frustum.containsPoint(pos)) {
        return true;
    }
    else {
        return false;
    }
}

function checkGameOver() {
    if (livesLeft == 0) {
        alert("Game Over! :(");
        location.reload();
    }
}

function loop(){
	// Rotate the propeller, the sea and the sky
//	airplane.propeller.rotation.x += 0.3;
	sky.mesh.rotation.z += .0075;
    
    ground.moveWaves();
    
    // update the tank on each frame
	updateTank();
    // update all bullets
    updateBullets();
    // create and update all coins/lava
    updateCoins();
    updateLava();
    // update difficulty of game
    updateDiff();
    // check if game over
    checkGameOver();

	// render the scene
	renderer.render(scene, camera);
    // call the loop function again
	requestAnimationFrame(loop);
}

// Handle mouse movement
var mousePos={x:0, y:0};

// now handle the mousemove event
function handleMouseMove(event) {
	// here we are converting the mouse position value received 
	// to a normalized value varying between -1 and 1;
	// this is the formula for the horizontal axis:
	var tx = -1 + (event.clientX / WIDTH)*2;

	// for the vertical axis, we need to inverse the formula 
	// because the 2D y-axis goes the opposite direction of the 3D y-axis
	
	var ty = 1 - (event.clientY / HEIGHT)*2;
	mousePos = {x:tx, y:ty};
}

function handleMouseClick(event) {
    var originX = tank.shoot.position.x;
    var originY = tank.shoot.position.y;
        
    var tx = -1 + (event.clientX / WIDTH)*2;
	var ty = 1 - (event.clientY / HEIGHT)*2;
    
    var targetX = normalize(tx, -1, 1, -300, 300);
    var targetY = normalize(ty, -1, 1, 25, 175);

    var rawDirectionX = targetX - originX;
    var rawDirectionY = targetY - originY;
    
    // Normalizing
    var directionX = rawDirectionX/Math.sqrt(Math.pow(rawDirectionX,2) + Math.pow(rawDirectionY, 2));
    var directionY = rawDirectionY/Math.sqrt(Math.pow(rawDirectionX,2) + Math.pow(rawDirectionY, 2));
    
    bullet = createBullet(directionX, directionY)
    if (bullet.directionY > 0) {
        bullets.push(bullet);
    }
}

// number of coins collected
var collected, healthBar;

function init() {
    
    collected = document.getElementById("coinsCollected");
    healthBar = document.getElementById("healthBar");    
    
	// set up the scene, the camera and the renderer
	createScene();
	// add the lights
	createLights();
	// add the objects // TODO: CHANGE THE OBJECTS BEING CREATED
    createGround();
	createTank();
	createSky();
        
    maxY = findMaxY();
    
    document.addEventListener('mousemove', handleMouseMove, false);
    document.addEventListener('click', handleMouseClick, false);
    
	// start a loop that will update the objects' positions 
	// and render the scene on each frame
	loop();
}

//init();
window.addEventListener('load', init, false);
