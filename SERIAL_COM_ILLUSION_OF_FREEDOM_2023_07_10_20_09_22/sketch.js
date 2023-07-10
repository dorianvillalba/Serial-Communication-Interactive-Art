let serial;
let latestData = "";
let playerX = 100;
let playerY = 100;
let bird1, bird2;
let birdAnimation = [];
let birdFrame = 0;
let clouds = [];
let terrain = [];
let terrainDetail = 0.005;
let fullscreenButton;
let cloudSound;

let skyColors;
let timeOfDay = 0;
let timeSpeed = 0.002;

let sun;

function preload() {
  bird1 = loadImage('bird1.png');
  bird2 = loadImage('bird2.png');
  bird3 = loadImage('bird3.png');
  bird4 = loadImage('bird4.png');
  bird5 = loadImage('bird5.png');
  bird6 = loadImage('bird6.png');
  cloudSound = loadSound('cloud-sound.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  frameRate(20);

  skyColors = [
    color(135, 206, 235), // Daytime sky color
    color(250, 128, 114), // Sunset sky color
    color(25, 25, 112),   // Nighttime sky color
    color(250, 128, 114)  // Sunrise sky color
  ];

  let terrainColors = [  color(34, 139, 34),  
                       // dark green  
                       color(50, 205, 50),  
                       // green  
                       color(255, 255, 255),
                       // snow 
                       color(160, 82, 45),  
                       // brown
                      ];

  birdAnimation = [bird1, bird2,bird3,bird4,bird5,bird6];

  for (let i = 0; i < 5; i++) {
    clouds.push(new Cloud());
  }

  for (let x = 0; x < width; x++) {
    terrain[x] = height * noise(x * terrainDetail);
  }

  sun = new Sun();

  serial = new p5.SerialPort();

  serial.list();
  serial.open('/dev/tty.usbmodem143101');

  serial.on('open', gotOpen);
  serial.on('data', gotData);
  serial.on('error', gotError);
}

function gotOpen() {
  console.log('Serial port is open');
}

function gotError(error) {
  console.error(error);
}

function gotData() {
  let currentString = serial.readLine();
  if (currentString === null) {
    return;
  }
  currentString = currentString.trim();
  console.log(currentString);
  latestData = currentString;
}

function draw() {
  let skyColor = lerpColor(
    skyColors[floor(timeOfDay) % skyColors.length],
    skyColors[(floor(timeOfDay) + 1) % skyColors.length],
    timeOfDay % 1
  );
  background(skyColor);

  sun.display();
  sun.move();

  clouds.forEach(cloud => {
    cloud.display();
    cloud.move();
  });

  drawTerrain();
  drawFrame();


  if (latestData === "") {
    return;
  }

  let values = latestData.split(',');
  if (values.length < 2) {
    return;
  }

  let xValue = parseInt(values[0]);
  let yValue = parseInt(values[1]);
  playerX += map(xValue, 0, 1023, -5, 5);
  playerY += map(yValue, 0, 1023, -5, 5);
 let frameWidth = 20;
playerX = constrain(playerX, frameWidth, width  - frameWidth);
playerY = constrain(playerY, frameWidth, height  - frameWidth);


  // Check if the bird is inside a cloud
  let insideCloud = false;
clouds.forEach(cloud => {
  if (cloud.isInsideCloud(playerX + 25, playerY + 25)) {
    insideCloud = true;
    cloud.playSound();
  } else {
    cloud.stopSound();
  }
});

  // Check if the bird is touching the sun
  let touchingSun = sun.isTouchingSun(playerX + 25, playerY + 25);

  // Draw the bird
  if (insideCloud) {
    tint(255, 255, 255, 127);
  } else if (touchingSun) {
    tint(0, 0, 0);
  } else {
    noTint();
  }

  image(birdAnimation[birdFrame], playerX, playerY, 100, 100);
  birdFrame = (birdFrame + 1) % birdAnimation.length;

  timeOfDay += timeSpeed;
  if (timeOfDay >= skyColors.length) {
    timeOfDay = 0;
  }
}

function drawTerrain() {
  fill(34, 139, 34);
  beginShape();
  for (let x = 0; x < terrain.length; x++) {
    vertex(x, terrain[x]);
  }
  vertex(width, height);
  vertex(0, height);
  endShape(CLOSE);

  // Shift and regenerate terrain
  terrain.shift();
  terrain.push(height * noise((width + frameCount) * terrainDetail));
}

function createNoise(size, detail) {
  let noiseArray = [];
  for (let i = 0; i < size; i++) {
    noiseArray[i] = noise(i * detail);
  }
  return noiseArray;
}
function drawFrame() {
  let frameWidth = 40;
  fill(139, 69, 19);
  rect(0, 0, width, frameWidth); // Top border
  rect(0, height - frameWidth, width, frameWidth); // Bottom border
  rect(0, 0, frameWidth, height); // Left border
  rect(width - frameWidth, 0, frameWidth, height); // Right border
}

class Cloud {
  constructor() {
    this.x = random(width);
    this.y = random(height / 2);
    this.size = random(50, 100);
    this.soundPlayed = false;
    this.soundStopTimeout = null;
  }

  display() {
    fill(255);
    noStroke();
    ellipse(this.x, this.y, this.size, this.size / 2);
    ellipse(this.x + this.size / 2, this.y, this.size, this.size / 2);
    ellipse(this.x - this.size / 2, this.y, this.size, this.size / 2);
  }

  isInsideCloud(x, y) {
    return (x >= this.x - this.size / 2) && (x <= this.x + this.size / 2) && (y >= this.y - this.size / 4) && (y <= this.y + this.size / 4);
  }

  move() {
    this.x -= map(playerX, 0, width, 0.1, 2);

    if (this.x < -this.size) {
      this.x = width + this.size;
      this.y = random(height / 2);
      this.size = random(50, 100);
    }
  }

  playSound() {
    if (!this.soundPlayed) {
      cloudSound.play();
      this.soundPlayed = true;
    }
  }

  stopSound() {
    if (this.soundPlayed) {
      clearTimeout(this.soundStopTimeout);
      this.soundStopTimeout = setTimeout(() => {
        cloudSound.stop();
        this.soundPlayed = false;
      }, 500);
    }
  }
}


let Sun = class {
  constructor() {
    this.radius = 30;
  }

  display() {
    fill(255, 255, 0);
    noStroke();
    ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
  }
isTouchingSun(x, y) {
  let distance = dist(this.x, this.y, x, y);
  return distance <= this.radius + 25;
}
  
  move() {
    let sunPos = map(timeOfDay, 0, skyColors.length, 0, TWO_PI);
    this.x = width / 2 + cos(sunPos) * (width / 2.5);
    this.y = height / 2 - sin(sunPos) * (height / 2.5);
  }
};