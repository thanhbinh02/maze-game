const mazeCanvas = document.getElementById("mazeCanvas");
const ctx = mazeCanvas.getContext("2d");

const LEVEL_LIST = [
  {
    path: "./image/easy-button.png",
    value: 10,
  },
  {
    path: "./image/medium.png",
    value: 15,
  },
  {
    path: "./image/hard-button.png",
    value: 20,
  },
];

function getMousePos(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function isInside(pos, rect, button) {
  return (
    pos.x > rect.x &&
    pos.x < rect.x + button.width &&
    pos.y < rect.y + button.height &&
    pos.y > rect.y
  );
}

function handleStyleCursorPoint(condition, canvas) {
  if (condition) {
    canvas.style.cursor = "pointer";
  } else {
    canvas.style.cursor = "default";
  }
}

function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.cursor = "default";
}

const dirs = ["top", "bottom", "left", "right"];
const modDir = {
  top: { y: -1, x: 0, o: "bottom" },
  bottom: { y: 1, x: 0, o: "top" },
  left: { y: 0, x: -1, o: "right" },
  right: { y: 0, x: 1, o: "left" },
};
const cellSize = 50;
const height = 10;
const width = 10;
const halfCellSize = cellSize / 2;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function rand(max) {
  return Math.floor(Math.random() * max);
}

class DifficultyButton {
  constructor(canvas, imageUrl, levelDifficultyList) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.imageUrl = imageUrl;
    this.button = new Image();
    this.button.onload = () => {
      this.setupButton();
      this.addEventListeners();
    };
    this.button.src = imageUrl;
    this.levelDifficultyList = levelDifficultyList;
    this.isClicked = true;
  }

  setupButton() {
    const buttonWidth = this.button.width;
    const buttonHeight = this.button.height;
    this.x = (this.canvas.width - buttonWidth) / 2;
    this.y = (this.canvas.height - buttonHeight) / 2;
    this.ctx.drawImage(this.button, this.x, this.y, buttonWidth, buttonHeight);
  }

  addEventListeners() {
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("click", this.handleClick.bind(this));
  }

  handleMouseMove(event) {
    const mousePosition = getMousePos(this.canvas, event);
    handleStyleCursorPoint(
      this.isClicked && isInside(mousePosition, this, this.button),
      this.canvas
    );
  }

  handleClick(event) {
    const mousePosition = getMousePos(this.canvas, event);

    if (this.isClicked && isInside(mousePosition, this, this.button)) {
      this.clearButton();
    }
  }

  clearButton() {
    this.canvas.removeEventListener(
      "mousemove",
      this.handleMouseMove.bind(this)
    );
    this.canvas.removeEventListener("click", this.handleClick.bind(this));
    this.isClicked = false;
    this.ctx.clearRect(this.x, this.y, this.button.width, this.button.height);
    this.levelDifficultyList.loadImages();
  }
}

class LevelButtonList {
  constructor(canvas, images, maze, player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.images = images;
    this.loadedImages = [];
    this.currentImageIndex = 0;
    this.spacing = 10;

    // Bind event handlers once and store them as properties
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.maze = maze;
    this.player = player;
  }

  loadImages() {
    let loadedCount = 0;

    this.images.forEach((level, index) => {
      const image = new Image();
      image.onload = () => {
        loadedCount++;
        this.loadedImages[index] = { image, level };

        if (loadedCount === this.images.length) {
          this.addEventListeners();
          this.drawImages();
        }
      };
      image.src = level.path;
    });
  }

  drawImages() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const spacing = this.spacing;

    const totalHeight = this.loadedImages.reduce((sum, { image }, index) => {
      if (index > 0) {
        sum += spacing;
      }
      return sum + image.height;
    }, 0);

    let y = (canvas.height - totalHeight) / 2;

    this.loadedImages.forEach((item, index) => {
      const x = (canvas.width - item.image.width) / 2;
      item.rect = {
        x,
        y,
        width: item.image.width,
        height: item.image.height,
        index,
      }; // Store rectangle info
      ctx.drawImage(item.image, x, y);
      y += item.image.height + spacing;
    });
  }

  addEventListeners() {
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("click", this.handleClick);
  }

  handleMouseMove(event) {
    const mousePosition = getMousePos(this.canvas, event);
    let hovering = false;

    this.loadedImages.forEach((item) => {
      if (isInside(mousePosition, item.rect, item.rect)) {
        hovering = true;
      }
    });

    handleStyleCursorPoint(hovering, this.canvas);
  }

  handleClick(event) {
    const mousePosition = getMousePos(this.canvas, event);

    this.loadedImages.forEach((item) => {
      if (isInside(mousePosition, item.rect, item.rect)) {
        console.log("Clicked level:", item.level.value);
      }
    });

    this.clearButtons();
  }

  clearButtons() {
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("click", this.handleClick);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.cursor = "default";
    this.maze.drawMap();
    this.player.drawPlayer();
  }
}

class Maze {
  constructor(width, height, cellSize, ctx) {
    this.width = width;
    this.height = height;
    this.map = null;
    this.startCoord = null;
    this.endCoord = null;
    this.cellSize = cellSize;
    this.ctx = ctx;
    this.defineStartEnd();
  }

  getMap() {
    return this.map;
  }

  getStartCoord() {
    return this.startCoord;
  }

  getEndCoord() {
    return this.endCoord;
  }

  initializeMaze() {
    this.map = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      this.map[y] = new Array(this.width);
      for (let x = 0; x < this.width; x++) {
        this.map[y][x] = {
          top: false,
          bottom: false,
          right: false,
          left: false,
          visited: false,
          priorPos: null,
        };
      }
    }
  }

  defineStartEnd() {
    const rand = Math.floor(Math.random() * 4);
    switch (rand) {
      case 0:
        this.startCoord = { x: 0, y: 0 };
        this.endCoord = { x: this.width - 1, y: this.height - 1 };
        break;
      case 1:
        this.startCoord = { x: 0, y: this.height - 1 };
        this.endCoord = { x: this.width - 1, y: 0 };
        break;
      case 2:
        this.startCoord = { x: this.width - 1, y: 0 };
        this.endCoord = { x: 0, y: this.height - 1 };
        break;
      case 3:
        this.startCoord = { x: this.width - 1, y: this.height - 1 };
        this.endCoord = { x: 0, y: 0 };
        break;
    }
  }

  defineMaze() {
    this.initializeMaze();

    let isComplete = false;
    let move = false;
    let cellsVisited = 1;
    let numLoops = 0;
    let maxLoops = 0;
    let pos = { x: 0, y: 0 };
    const numCells = this.width * this.height;

    while (!isComplete) {
      move = false;
      this.map[pos.y][pos.x].visited = true;

      if (numLoops >= maxLoops) {
        shuffle(dirs);
        maxLoops = Math.round(rand(this.height / 8));
        numLoops = 0;
      }
      numLoops++;

      for (let i = 0; i < dirs.length; i++) {
        const direction = dirs[i];
        const nx = pos.x + modDir[direction].x;
        const ny = pos.y + modDir[direction].y;

        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          if (!this.map[ny][nx].visited) {
            this.map[pos.y][pos.x][direction] = true;
            this.map[ny][nx][modDir[direction].o] = true;

            this.map[ny][nx].priorPos = pos;
            pos = { x: nx, y: ny };
            cellsVisited++;
            move = true;
            break;
          }
        }
      }

      if (!move) {
        pos = this.map[pos.y][pos.x].priorPos;
      }

      if (cellsVisited === numCells) {
        isComplete = true;
      }
    }
  }

  drawEndFlag() {
    const coord = this.endCoord;
    const gridSize = 4;
    const fraction = cellSize / gridSize - 2;
    let colorSwap = true;

    for (let y = 0; y < gridSize; y++) {
      if (gridSize % 2 === 0) {
        colorSwap = !colorSwap;
      }

      for (let x = 0; x < gridSize; x++) {
        this.ctx.beginPath();
        this.ctx.rect(
          coord.x * cellSize + x * fraction + 4.5,
          coord.y * cellSize + y * fraction + 4.5,
          fraction,
          fraction
        );
        if (colorSwap) {
          this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        } else {
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        }
        this.ctx.fill();
        colorSwap = !colorSwap;
      }
    }
  }

  drawCell(xCord, yCord, cell) {
    const x = xCord * this.cellSize;
    const y = yCord * this.cellSize;

    this.ctx.strokeStyle = "black";

    if (!cell.top) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + this.cellSize, y);
      this.ctx.stroke();
    }

    if (!cell.bottom) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + this.cellSize);
      this.ctx.lineTo(x + this.cellSize, y + this.cellSize);
      this.ctx.stroke();
    }

    if (!cell.left) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x, y + this.cellSize);
      this.ctx.stroke();
    }

    if (!cell.right) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + this.cellSize, y);
      this.ctx.lineTo(x + this.cellSize, y + this.cellSize);
      this.ctx.stroke();
    }
  }

  drawMap() {
    this.defineMaze();
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.drawCell(x, y, this.map[y][x]);
      }
    }
    this.drawEndFlag();
  }

  clear() {
    const canvasSize = cellSize + this.map?.length;
    this.ctx.clearRect(0, 0, canvasSize, canvasSize);
  }
}

class Player {
  constructor(maze, ctx, cellSize) {
    this.playerCoords = {
      x: maze.getStartCoord()?.x,
      y: maze.getStartCoord()?.y,
    };
    this.ctx = ctx;
    this.cellSize = cellSize;
  }

  getPlayerCoords() {
    return this.playerCoords;
  }

  drawPlayer() {
    this.ctx.beginPath();
    this.ctx.fillStyle = "black";
    this.ctx.arc(
      this.playerCoords.x * this.cellSize + this.cellSize / 2,
      this.playerCoords.y * this.cellSize + this.cellSize / 2,
      this.cellSize / 2 - 2,
      0,
      2 * Math.PI
    );
    this.ctx.fill();
  }

  clearPlayer() {
    const offsetLeft = this.cellSize / 50;
    const offsetRight = this.cellSize / 25;

    this.ctx.clearRect(
      this.playerCoords.x * this.cellSize + offsetLeft,
      this.playerCoords.y * this.cellSize + offsetLeft,
      this.cellSize - offsetRight,
      this.cellSize - offsetRight
    );
  }

  movePlayer(newCoords) {
    this.clearPlayer();
    this.playerCoords = {
      x: newCoords.x,
      y: newCoords.y,
    };
    this.drawPlayer();
  }
}

let maze = new Maze(width, height, cellSize, ctx);
let player = new Player(maze, ctx, cellSize);

console.log("maze", maze);

const levelDifficultyList = new LevelButtonList(
  mazeCanvas,
  LEVEL_LIST,
  maze,
  player
);
const difficultyButton = new DifficultyButton(
  mazeCanvas,
  "./image/choose-difficulty-button.png" + "?" + new Date().getTime(),
  levelDifficultyList
);

window.addEventListener("keydown", (e) => {
  const cell =
    maze.getMap()[player.getPlayerCoords().y][player.getPlayerCoords().x];

  switch (e.key) {
    case "ArrowLeft": // left
      if (cell.left) {
        player.movePlayer({
          x: player.getPlayerCoords().x - 1,
          y: player.getPlayerCoords().y,
        });
      }
      break;
    case "ArrowRight": // right
      if (cell.right) {
        player.movePlayer({
          x: player.getPlayerCoords().x + 1,
          y: player.getPlayerCoords().y,
        });
      }
      break;
    case "ArrowUp": // top
      if (cell.top) {
        player.movePlayer({
          x: player.getPlayerCoords().x,
          y: player.getPlayerCoords().y - 1,
        });
      }
      break;
    case "ArrowDown": // bottom
      if (cell.bottom) {
        player.movePlayer({
          x: player.getPlayerCoords().x,
          y: player.getPlayerCoords().y + 1,
        });
      }
      break;
  }
});
