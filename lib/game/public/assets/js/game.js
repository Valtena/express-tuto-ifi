var snake, apple, squareSize, score, speed,
        updateDelay, direction, new_direction,
        addNew, cursors, scoreTextValue, speedTextValue, textStyle_Key, textStyle_Value,self;

var Game = {
  preload: function () {
    // Here we load all the needed resources for the level.
    // In our case, that's just two squares - one for the snake body and one for the apple.
    game.load.image('snake', './public/assets/images/snake.png');
    game.load.image('apple', './public/assets/images/apple.png');
  },
  create: function () {
    self = this;
    // By setting up global variables in the create function, we initialise them on game start.
    // We need them to be globally available so that the update function can alter them.
    snake = [];                     // This will work as a stack, containing the parts of our snake
    apple = {};                     // An object for the apple;
    squareSize = 15;                // The length of a side of the squares. Our image is 15x15 pixels.
    score = 0;                      // Game score.
    speed = 0;                      // Game speed.
    updateDelay = 0;                // A variable for control over update rates.
    direction = 'right';            // The direction of our snake.
    new_direction = null;           // A buffer to store the new direction into.
    addNew = false;                 // A variable used when an apple has been eaten.
    waitingAjax = false;

    // Set up a Phaser controller for keyboard input.
    cursors = game.input.keyboard.createCursorKeys();

    game.stage.backgroundColor = '#061f27';

    // Generate the initial snake stack. Our snake will be 10 elements long.
    for (var i = 0; i < 10; i++) {
      snake[i] = game.add.sprite(150 + i * squareSize, 150, 'snake');  // Parameters are (X coordinate, Y coordinate, image)
    }

    marmottajax({url: "/game/snake", method: "get" }).then(function (newApple) {
      // Genereate the first apple and init score to 0.
      self.generateApple(JSON.parse(newApple));
    });

    // Add Text to top of game.
    textStyle_Key = {font: "bold 14px sans-serif", fill: "#46c0f9", align: "center"};
    textStyle_Value = {font: "bold 18px sans-serif", fill: "#fff", align: "center"};

    // Score.
    game.add.text(30, 20, "SCORE", textStyle_Key);
    scoreTextValue = game.add.text(90, 18, score.toString(), textStyle_Value);
    // Speed.
    game.add.text(500, 20, "SPEED", textStyle_Key);
    speedTextValue = game.add.text(558, 18, speed.toString(), textStyle_Value);

  },
  update: function () {
    // Handle arrow key presses, while not allowing illegal direction changes that will kill the player.

    if (cursors.right.isDown && direction !== 'left')
    {
      new_direction = 'right';
    } else if (cursors.left.isDown && direction !== 'right')
    {
      new_direction = 'left';
    } else if (cursors.up.isDown && direction !== 'down')
    {
      new_direction = 'up';
    } else if (cursors.down.isDown && direction !== 'up')
    {
      new_direction = 'down';
    }

    // A formula to calculate game speed based on the score.
    // The higher the score, the higher the game speed, with a maximum of 10;
    speed = Math.min(10, Math.floor(score / 5));
    // Update speed value on game screen.
    speedTextValue.text = '' + speed;

    // Since the update function of Phaser has an update rate of around 60 FPS,
    // we need to slow that down make the game playable.

    // Increase a counter on every update call.
    if (!waitingAjax) {
      updateDelay++;

      // Do game stuff only if the counter is aliquot to (10 - the game speed).
      // The higher the speed, the more frequently this is fulfilled,
      // making the snake move faster.
      if (updateDelay % (10 - speed) == 0) {
        waitingAjax = true;


        // Snake movement

        var firstCell = snake[snake.length - 1],
                lastCell = snake.shift(),
                oldLastCellx = lastCell.x,
                oldLastCelly = lastCell.y;

        // If a new direction has been chosen from the keyboard, make it the direction of the snake now.
        if (new_direction) {
          direction = new_direction;
          new_direction = null;
        }

        marmottajax({url: "/game/snake", method: "post", parameters: {direction: direction, x: firstCell.x, y: firstCell.y}}).then(function (data) {
          pos = JSON.parse(data);
          lastCell.x = pos.x;
          lastCell.y = pos.y;
          snake.push(lastCell);
          firstCell = lastCell;

          if (addNew) {
            snake.unshift(game.add.sprite(oldLastCellx, oldLastCelly, 'snake'));
            addNew = false;
          }

          // Check for apple collision.
          self.appleCollision(firstCell);

          // Check for collision with self. Parameter is the head of the snake.
          self.selfCollision(firstCell);

          // Check with collision with wall. Parameter is the head of the snake.
          self.wallCollision(firstCell);
          waitingAjax = false;
        });

      }
    }


  },
  generateApple: function (newApple) {

    // Chose a random place on the grid.
    // X is between 0 and 585 (39*15)
    // Y is between 0 and 435 (29*15)

    var randomX = newApple.x * squareSize,
            randomY = newApple.y * squareSize;
    // Add a new apple.
    apple = game.add.sprite(randomX, randomY, 'apple');
  },
  appleCollision: function (firstCell) {

    // Check if any part of the snake is overlapping the apple.
    // This is needed if the apple spawns inside of the snake.
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x == apple.x && snake[i].y == apple.y) {
        marmottajax({url: "/game/snake", method: "put", parameters: { x: firstCell.x, y: firstCell.y}}).then(function (newApple) {
          // Next time the snake moves, a new block will be added to its length.
          addNew = true;

          // Destroy the old apple.
          apple.destroy();

          // Make a new one.
          self.generateApple(JSON.parse(newApple));

          // Increase score.
          score++;

          // Refresh scoreboard.
          scoreTextValue.text = score.toString();
        });

      }
    }

  },
  selfCollision: function (head) {

    // Check if the head of the snake overlaps with any part of the snake.
    for (var i = 0; i < snake.length - 1; i++) {
      if (head.x == snake[i].x && head.y == snake[i].y) {
        self.gameOver(head);
      }
    }

  },
  wallCollision: function (head) {

    // Check if the head of the snake is in the boundaries of the game field.

    if (head.x >= 600 || head.x < 0 || head.y >= 450 || head.y < 0) {

      self.gameOver(head);
    }

  },
  gameOver: function (){
        marmottajax({url: "/game/snake", method: "delete" }).then(function () { game.state.start('Game_Over');});
  }

};