// JS for Minigames page – initially implements "Whac-A-Banana"
// Assumes banana skin images already exist in images/ directory.

(function () {
  const HOLE_COUNT = 9; // 3×3 grid
  const GAME_LENGTH = 30; // seconds
  const MIN_POP_TIME = 600; // ms visible
  const MAX_POP_TIME = 1200;

  const skins = [
    'banana.png',
    'gold_banana.png',
    'glitchnana.png',
    'wizardnana.png',
    'pinkglownana.png',
    'rotten_banana.png'
  ];

  const holes = [];
  let score = 0;
  let timeLeft = GAME_LENGTH;
  let timerInterval;
  let popTimeout;

  // DOM refs
  const board = document.getElementById('whacBoard');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const btnStart = document.getElementById('btnStartWhac');

  // build holes
  for (let i = 0; i < HOLE_COUNT; i++) {
    const hole = document.createElement('div');
    hole.className = 'hole';

    const img = document.createElement('img');
    img.src = `images/${skins[Math.floor(Math.random()*skins.length)]}`;
    hole.appendChild(img);

    hole.addEventListener('click', () => {
      if (hole.classList.contains('show')) {
        score++;
        scoreEl.textContent = score;
        // hide immediately after hit
        hideHole(hole);
      }
    });

    board.appendChild(hole);
    holes.push(hole);
  }

  btnStart.addEventListener('click', startGame);

  function startGame() {
    score = 0;
    timeLeft = GAME_LENGTH;
    scoreEl.textContent = 0;
    timeEl.textContent = GAME_LENGTH;
    btnStart.disabled = true;

    timerInterval = setInterval(() => {
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) endGame();
    }, 1000);

    popRandom();
  }

  function endGame() {
    clearInterval(timerInterval);
    clearTimeout(popTimeout);
    btnStart.disabled = false;
    holes.forEach(h => h.classList.remove('show'));
    
    // Update stats if available (when running in main game context)
    if (typeof stats !== 'undefined') {
      stats.whacGamesPlayed++;
      stats.totalWhacScore += score;
      if (score > stats.bestWhacScore) {
        stats.bestWhacScore = score;
      }
    }
    
    alert(`Time's up! You scored ${score} bananas!`);
    // TODO: award bananas back to main game via IPC if needed
  }

  function popRandom() {
    const hole = holes[Math.floor(Math.random()*holes.length)];
    // random skin each time
    const img = hole.querySelector('img');
    img.src = `images/${skins[Math.floor(Math.random()*skins.length)]}`;

    hole.classList.add('show');
    const time = rand(MIN_POP_TIME, MAX_POP_TIME);
    popTimeout = setTimeout(() => {
      hideHole(hole);
      if (timeLeft > 0) popRandom();
    }, time);
  }

  function hideHole(hole) {
    hole.classList.remove('show');
  }

  function rand(min, max) {
    return Math.round(Math.random() * (max - min) + min);
  }
})();

