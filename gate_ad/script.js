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
    isDemo: true, // Start in demo mode
    score: 0,
    timeRemaining: CONFIG.gameDuration,
    items: [], // { element, speed, x, y }
    caughtItems: [] // Visual references
};

// DOM Elements
const adContainer = document.getElementById('ad-container');
const basket = document.getElementById('basket');
const basketItemsContainer = document.querySelector('.basket-items'); // New container
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

    // Start Demo Mode
    startDemo();
}

function startDemo() {
    gameState.isDemo = true;
    spawnTimerId = setInterval(spawnItem, 800); // Slightly faster for visual appeal?
    gameLoopId = requestAnimationFrame(gameLoop);
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

    // Clamp center
    let center = x;
    if (center < basketWidth / 2) center = basketWidth / 2;
    if (center > containerWidth - basketWidth / 2) center = containerWidth - basketWidth / 2;

    basket.style.left = center + 'px';
}

function startGame() {
    if (gameState.isPlaying) return;

    // Cleanup demo items
    clearItems();
    clearInterval(spawnTimerId);
    cancelAnimationFrame(gameLoopId);

    startScreen.classList.add('hidden');
    gameState.isPlaying = true;
    gameState.isDemo = false;
    gameState.score = 0;
    gameState.timeRemaining = CONFIG.gameDuration;
    gameState.items = [];

    updateProgressBar();

    // Start actual game
    spawnTimerId = setInterval(spawnItem, CONFIG.spawnInterval);
    gameLoopId = requestAnimationFrame(gameLoop);

    // Countdown
    countdownTimerId = setInterval(() => {
        gameState.timeRemaining--;
        if (gameState.timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

function clearItems() {
    gameState.items.forEach(item => item.el.remove());
    gameState.items = [];
}

function spawnItem() {
    // Determine spawn parent: gameArea or background-layer?
    // If in demo, maybe we want them behind the overlay text?
    // But overlay is z-index 40.
    // If we put them in gameArea (z-index 5), they will be behind overlay. Correct.

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
        speed: 3 + Math.random() * 2,
        score: itemConfig.score
    });
}

function gameLoop() {
    // Run loop in both demo and play mode

    updateItems();

    if (gameState.isPlaying) {
        checkCollisions();
    }

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
    const containerRect = adContainer.getBoundingClientRect();

    const basketTop = basketRect.top - containerRect.top;
    const basketLeft = basketRect.left - containerRect.left;
    const basketRight = basketLeft + basketRect.width;
    const basketBottom = basketTop + basketRect.height;

    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];

        const itemLeft = parseFloat(item.el.style.left);
        const itemRight = itemLeft + 40;
        const itemBottom = item.y + 40;
        const itemTop = item.y;

        // Collision logic
        const hitBasket = (
            itemBottom >= basketTop + 10 && // Allow to sink in a bit? Or hit rim (top - 5?)
            itemTop < basketBottom &&
            itemRight > basketLeft &&
            itemLeft < basketRight
        );

        if (hitBasket) {
            // Caught!
            catchItem(item, i);
        }
    }
}

function catchItem(itemData, index) {
    // Remove from falling list
    gameState.items.splice(index, 1);

    // Add score
    addScore(itemData.score, parseFloat(itemData.el.style.left), itemData.y);

    // Visual: Move into basket container
    const el = itemData.el;

    // Calculate relative position to keep it roughly where it hit?
    // Or just randomize inside basket?
    // "Sepete giren kriptolar sepetin içinde biriksin"

    // We append to .basket-items (relative to basket)
    // .basket-items is 100% width/height of basket (80x40).
    // Items are 40x40.

    // Let's randomize position slightly to simulate piling
    const randomX = Math.random() * (80 - 30); // Basket width - Item width (approx scaled)
    const randomY = Math.random() * 20 - 15; // Range: -15 to +5 (approx)
    const randomRot = Math.random() * 30 - 15;

    el.style.left = randomX + 'px';
    el.style.top = (10 + randomY) + 'px'; // Base offset + random
    el.style.transform = `rotate(${randomRot}deg) scale(0.7)`; // Scale down a bit
    el.className = 'caught-item'; // Changes class/style

    basketItemsContainer.appendChild(el);

    // Manage piling? Limit?
    if (basketItemsContainer.children.length > 15) {
        basketItemsContainer.removeChild(basketItemsContainer.firstChild);
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

    setTimeout(() => {
        endScreen.classList.remove('hidden');
    }, 500);
}

function closeAd() {
    adContainer.style.display = 'none';
    console.log("Ad closed");
}

// Start
init();
