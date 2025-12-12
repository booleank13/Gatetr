// Game Configuration
const CONFIG = {
    gameDuration: 10, // seconds
    spawnInterval: 1000, // ms
    targetScore: 200,
    items: [
        { name: 'bitcoin', score: 50, img: 'assets/bitcoin-btc-logo.png' },
        { name: 'ethereum', score: 30, img: 'assets/ethereum.png' },
        { name: 'tether', score: 20, img: 'assets/tether.png' }
    ]
};

// Game State
let gameState = {
    isPlaying: false,
    score: 0,
    timeRemaining: CONFIG.gameDuration,
    items: [] // { element, speed, x, y }
};

// DOM Elements
const adContainer = document.getElementById('ad-container');
const basket = document.getElementById('basket');
const gameArea = document.getElementById('game-area');
const progressBarFill = document.getElementById('progress-bar-fill');
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const closeBtn = document.getElementById('close-btn');

// Timers
let gameLoopId;
let spawnTimerId;
let countdownTimerId;

// Initialization
function init() {
    // Setup event listeners
    startScreen.addEventListener('click', startGame);
    closeBtn.addEventListener('click', closeAd);

    // Basket movement
    adContainer.addEventListener('mousemove', moveBasket);
    adContainer.addEventListener('touchmove', moveBasketTouch, { passive: false });
}

function moveBasket(e) {
    if (!gameState.isPlaying) return;

    const rect = adContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    updateBasketPosition(x);
}

function moveBasketTouch(e) {
    if (!gameState.isPlaying) return;
    e.preventDefault(); // Prevent scrolling

    const rect = adContainer.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    updateBasketPosition(x);
}

function updateBasketPosition(x) {
    const basketWidth = basket.offsetWidth;
    const containerWidth = adContainer.offsetWidth;

    // Clamp x
    let newLeft = x - basketWidth / 2;
    if (newLeft < 0) newLeft = 0;
    if (newLeft > containerWidth - basketWidth) newLeft = containerWidth - basketWidth;

    basket.style.left = (newLeft + basketWidth / 2) + 'px'; // Style uses center alignment trick in CSS?
    // Wait, in CSS: left: 50%; transform: translateX(-50%);
    // So if I set left to a pixel value, it will still be offset by -50%.
    // To make it easier, let's change CSS logic via inline style.

    // Actually, if I set `left: ${x}px`, with `transform: translateX(-50%)`,
    // `x` should be the center point of the basket.
    // So I just need to clamp the center point.

    let center = x;
    if (center < basketWidth / 2) center = basketWidth / 2;
    if (center > containerWidth - basketWidth / 2) center = containerWidth - basketWidth / 2;

    basket.style.left = center + 'px';
}

function startGame() {
    startScreen.classList.add('hidden');
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.timeRemaining = CONFIG.gameDuration;
    gameState.items = [];

    updateProgressBar();

    // Spawn first item immediately? No, 1s as per prompt implies interval.
    // "kriptolar 1 sn de bir aşağı düşecek" -> "cryptos will fall once every 1 second"
    spawnTimerId = setInterval(spawnItem, CONFIG.spawnInterval);

    // Game Loop
    gameLoopId = requestAnimationFrame(gameLoop);

    // Countdown
    countdownTimerId = setInterval(() => {
        gameState.timeRemaining--;
        if (gameState.timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

function spawnItem() {
    if (!gameState.isPlaying) return;

    const itemConfig = CONFIG.items[Math.floor(Math.random() * CONFIG.items.length)];
    const itemEl = document.createElement('img');
    itemEl.src = itemConfig.img;
    itemEl.className = 'item';
    itemEl.style.left = Math.random() * (adContainer.offsetWidth - 40) + 'px'; // 40 is item width
    itemEl.style.top = '-40px';

    gameArea.appendChild(itemEl);

    gameState.items.push({
        el: itemEl,
        y: -40,
        speed: 3 + Math.random() * 2, // Random speed
        score: itemConfig.score
    });
}

function gameLoop() {
    if (!gameState.isPlaying) return;

    updateItems();
    checkCollisions();

    gameLoopId = requestAnimationFrame(gameLoop);
}

function updateItems() {
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];
        item.y += item.speed;
        item.el.style.top = item.y + 'px';

        // Remove if out of bounds
        if (item.y > adContainer.offsetHeight) {
            item.el.remove();
            gameState.items.splice(i, 1);
        }
    }
}

function checkCollisions() {
    const basketRect = basket.getBoundingClientRect();
    const basketTop = basketRect.top - adContainer.getBoundingClientRect().top; // Relative to container
    const basketLeft = basketRect.left - adContainer.getBoundingClientRect().left;
    const basketRight = basketLeft + basketRect.width;
    const basketBottom = basketTop + basketRect.height; // Approximation

    // Since basket has a specific shape (top rim), we check collision with the top part primarily

    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];

        // Simple AABB collision detection relative to container
        // Item rect
        const itemLeft = parseFloat(item.el.style.left);
        const itemRight = itemLeft + 40; // width
        const itemBottom = item.y + 40; // height
        const itemTop = item.y;

        // Check overlap
        // We want to catch them when they hit the top of the basket roughly
        const hitBasket = (
            itemBottom >= basketTop &&
            itemTop < basketBottom &&
            itemRight > basketLeft &&
            itemLeft < basketRight
        );

        if (hitBasket) {
            // Caught!
            addScore(item.score, itemLeft, itemTop);
            item.el.remove();
            gameState.items.splice(i, 1);
        }
    }
}

function addScore(points, x, y) {
    gameState.score += points;
    updateProgressBar();

    // Show +Points popup
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + points;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    gameArea.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, 800);

    // Check win condition immediately?
    // "finalde 200 puan topladığında" -> when 200 points collected finally.
    // Does it end immediately or wait for time?
    // Usually "topladığında" (when collected) implies immediately.
    if (gameState.score >= CONFIG.targetScore) {
        endGame();
    }
}

function updateProgressBar() {
    const percentage = Math.min((gameState.score / CONFIG.targetScore) * 100, 100);
    progressBarFill.style.width = percentage + '%';
}

function endGame() {
    gameState.isPlaying = false;
    clearInterval(spawnTimerId);
    clearInterval(countdownTimerId);
    cancelAnimationFrame(gameLoopId);

    // Check if score >= 200
    // Prompt says: "finalde 200 puan topladığında ... çıkacak"
    // And "oyunda kaybetmek olmayacak" (no losing).
    // So even if time runs out and score < 200?
    // "10 sn sürecek ve oyunda kaybetmek olmayacak." -> Game lasts 10s, no lose.
    // "finalde 200 puan topladığında 200 tl yi almak için ... çıkacak"
    // This implies if they get 200 points, they get the offer.
    // What if they don't get 200 points in 10s?
    // Given ad mechanics, it's likely rigged or easy enough to win.
    // Or the end screen shows up anyway?
    // "200 puan topladığında" -> Conditional.
    // However, usually ads want users to convert.
    // I will assume if time runs out, we show the end screen anyway,
    // maybe implying they did a good job or just show the signup.
    // But strictly reading: "When 200 points collected ... signup appears".

    // Let's assume if score >= 200 OR time ends (and we pretend they won or show it anyway).
    // Actually, with falling speed and values, getting 200 in 10s:
    // 1 item per second = 10 items.
    // Max score = 10 * 50 = 500.
    // Min score (if all tethers) = 10 * 20 = 200.
    // So it is guaranteed to reach 200 if they catch everything.
    // If they miss some, they might fail.
    // "oyunda kaybetmek olmayacak" might mean "Game Over" screen doesn't exist, just the Signup screen.
    // So I will show the signup screen regardless of score at the end,
    // OR immediately when they hit 200.

    // If they hit 200 early, end game and show screen? "finalde 200 puan topladığında"

    setTimeout(() => {
        endScreen.classList.remove('hidden');
    }, 500);
}

function closeAd() {
    // Usually communicates with parent frame or closes window
    // For demo, we can just hide container or reload
    adContainer.style.display = 'none';
    console.log("Ad closed");
}

// Start
init();
