// Game configuration
const config = {
    playerSpeed: 5,
    obstacleSpeed: 3,
    obstacleInterval: 1000,
    scoreInterval: 100,
    gameAreaWidth: 600,
    playerWidth: 40,
    maxLives: 3,
    powerUpChance: 0.1,
    powerUpTypes: ['shield', 'slowTime', 'extraLife', 'magnet', 'shrink', 'doubleShot'],
    powerUpDuration: 5000,
    difficultyLevels: {
        easy: {
            speedMultiplier: 0.7,
            obstacleSpawnRate: 1200,
            powerUpChance: 0.15
        },
        normal: {
            speedMultiplier: 1,
            obstacleSpawnRate: 1000,
            powerUpChance: 0.1
        },
        hard: {
            speedMultiplier: 1.3,
            obstacleSpawnRate: 800,
            powerUpChance: 0.05
        }
    },
    difficultyIncrease: {
        interval: 10000,
        speedIncrease: 0.2,
        spawnRateDecrease: 50
    },
    particleCount: 20,
    screenShakeIntensity: 5,
    screenShakeDuration: 500,
    achievements: {
        scores: [1000, 5000, 10000, 50000],
        survivalTime: [60, 180, 300, 600], // in seconds
        powerUpsCollected: [10, 50, 100, 500],
        perfectRuns: [1, 5, 10, 50] // runs without getting hit
    },
    magnetRange: 100,
    shrinkScale: 0.5,
    projectileSpeed: 5
};

// Game state
let gameState = {
    playerName: localStorage.getItem('playerName') || 'Player',
    score: 0,
    highScore: localStorage.getItem('highScore') || 0,
    lives: config.maxLives,
    level: 1,
    isGameOver: false,
    isPaused: false,
    isMuted: false,
    obstacles: [],
    powerUps: [],
    particles: [],
    playerPosition: 280,
    gameLoop: null,
    scoreLoop: null,
    difficultyLoop: null,
    currentObstacleInterval: config.obstacleInterval,
    currentObstacleSpeed: config.obstacleSpeed,
    powerUpActive: false,
    powerUpTimeout: null,
    difficulty: 'normal',
    controlScheme: 'arrows',
    musicVolume: 50,
    sfxVolume: 70,
    particleEffects: true,
    screenShake: true,
    achievements: JSON.parse(localStorage.getItem('achievements')) || {
        unlockedAchievements: [],
        powerUpsCollected: 0,
        perfectRuns: 0,
        longestSurvivalTime: 0
    },
    activePowerUps: {
        shield: false,
        slowTime: false,
        magnet: false,
        shrink: false,
        doubleShot: false
    },
    projectiles: [],
    gameStartTime: 0
};

// Settings
let settings = {
    load() {
        const savedSettings = localStorage.getItem('gameSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            gameState.playerName = parsed.playerName || gameState.playerName;
            gameState.difficulty = parsed.difficulty || gameState.difficulty;
            gameState.controlScheme = parsed.controlScheme || gameState.controlScheme;
            gameState.musicVolume = parsed.musicVolume ?? gameState.musicVolume;
            gameState.sfxVolume = parsed.sfxVolume ?? gameState.sfxVolume;
            gameState.particleEffects = parsed.particleEffects ?? gameState.particleEffects;
            gameState.screenShake = parsed.screenShake ?? gameState.screenShake;
        }
        this.applySettings();
    },
    save() {
        const settingsToSave = {
            playerName: gameState.playerName,
            difficulty: gameState.difficulty,
            controlScheme: gameState.controlScheme,
            musicVolume: gameState.musicVolume,
            sfxVolume: gameState.sfxVolume,
            particleEffects: gameState.particleEffects,
            screenShake: gameState.screenShake
        };
        localStorage.setItem('gameSettings', JSON.stringify(settingsToSave));
    },
    applySettings() {
        // Apply difficulty settings
        const diffSettings = config.difficultyLevels[gameState.difficulty];
        gameState.currentObstacleSpeed = config.obstacleSpeed * diffSettings.speedMultiplier;
        gameState.currentObstacleInterval = diffSettings.obstacleSpawnRate;
        config.powerUpChance = diffSettings.powerUpChance;

        // Apply audio settings
        backgroundMusic.volume = gameState.musicVolume / 100;
        menuMusic.volume = gameState.musicVolume / 100;
        [collisionSound, powerupSound, buttonClick].forEach(sound => {
            sound.volume = gameState.sfxVolume / 100;
        });

        // Update UI elements
        document.getElementById('playerName').value = gameState.playerName;
        document.getElementById('difficultySelect').value = gameState.difficulty;
        document.getElementById('musicVolume').value = gameState.musicVolume;
        document.getElementById('sfxVolume').value = gameState.sfxVolume;
        document.querySelector(`input[name="controls"][value="${gameState.controlScheme}"]`).checked = true;
        document.getElementById('particleEffects').checked = gameState.particleEffects;
        document.getElementById('screenShake').checked = gameState.screenShake;
    }
};

// Leaderboard
const leaderboard = {
    scores: JSON.parse(localStorage.getItem('leaderboard')) || [],
    add(score) {
        const newScore = {
            playerName: gameState.playerName,
            score: score,
            date: new Date().toLocaleDateString()
        };
        this.scores.push(newScore);
        this.scores.sort((a, b) => b.score - a.score);
        this.scores = this.scores.slice(0, 10); // Keep only top 10
        localStorage.setItem('leaderboard', JSON.stringify(this.scores));
        this.display();
    },
    display() {
        const tbody = document.querySelector('#leaderboardTable tbody');
        tbody.innerHTML = '';
        this.scores.forEach((score, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${score.playerName}</td>
                <td>${score.score}</td>
                <td>${score.date}</td>
            `;
            tbody.appendChild(row);
        });
    }
};

// DOM elements
const player = document.getElementById('player');
const gameArea = document.getElementById('gameArea');
const scoreElement = document.getElementById('scoreValue');
const highScoreElement = document.getElementById('highScoreValue');
const levelElement = document.getElementById('levelValue');
const livesContainer = document.getElementById('lives');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const finalHighScoreElement = document.getElementById('finalHighScore');
const restartButton = document.getElementById('restartButton');
const muteButton = document.getElementById('muteButton');
const pauseButton = document.getElementById('pauseButton');
const menuButton = document.getElementById('menuButton');

// Menu elements
const mainMenu = document.getElementById('mainMenu');
const settingsMenu = document.getElementById('settingsMenu');
const tutorialScreen = document.getElementById('tutorialScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const gameContainer = document.getElementById('gameContainer');

// Audio elements
const backgroundMusic = document.getElementById('backgroundMusic');
const menuMusic = document.getElementById('menuMusic');
const collisionSound = document.getElementById('collisionSound');
const powerupSound = document.getElementById('powerupSound');
const buttonClick = document.getElementById('buttonClick');

// Key state
const keys = {
    ArrowLeft: false,
    ArrowRight: false
};

// Mobile controls
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

// Event listeners
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
restartButton.addEventListener('click', restartGame);
muteButton.addEventListener('click', toggleMute);
pauseButton.addEventListener('click', togglePause);

// Initialize controls
function initializeControls() {
    // Mobile touch controls
    if (leftBtn) {
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys.ArrowLeft = true;
        });
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys.ArrowLeft = false;
        });
        // Mouse support for testing on desktop
        leftBtn.addEventListener('mousedown', () => keys.ArrowLeft = true);
        leftBtn.addEventListener('mouseup', () => keys.ArrowLeft = false);
        leftBtn.addEventListener('mouseleave', () => keys.ArrowLeft = false);
    }

    if (rightBtn) {
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys.ArrowRight = true;
        });
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys.ArrowRight = false;
        });
        // Mouse support for testing on desktop
        rightBtn.addEventListener('mousedown', () => keys.ArrowRight = true);
        rightBtn.addEventListener('mouseup', () => keys.ArrowRight = false);
        rightBtn.addEventListener('mouseleave', () => keys.ArrowRight = false);
    }

    // Pause and mute buttons
    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            playButtonSound();
            togglePause();
        });
    }

    if (muteButton) {
        muteButton.addEventListener('click', () => {
            playButtonSound();
            toggleMute();
        });
    }

    // Restart button
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            playButtonSound();
            restartGame();
        });
    }
}

// Handle key press
function handleKeyDown(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
    if (e.key === 'p') togglePause();
    if (e.key === 'm') toggleMute();
    if (e.key === ' ' && gameState.activePowerUps.doubleShot) {
        createProjectile();
    }
}

// Handle key release
function handleKeyUp(e) {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
}

// Move player
function movePlayer() {
    if (gameState.isPaused) return;
    
    if (keys.ArrowLeft && gameState.playerPosition > 0) {
        gameState.playerPosition -= config.playerSpeed;
    }
    if (keys.ArrowRight && gameState.playerPosition < config.gameAreaWidth - config.playerWidth) {
        gameState.playerPosition += config.playerSpeed;
    }
    player.style.left = gameState.playerPosition + 'px';
}

// Create obstacle
function createObstacle() {
    if (gameState.isGameOver || gameState.isPaused) return;
    
    const obstacle = document.createElement('div');
    obstacle.className = 'obstacle';
    obstacle.style.left = Math.random() * (config.gameAreaWidth - config.playerWidth) + 'px';
    gameArea.appendChild(obstacle);
    gameState.obstacles.push(obstacle);

    // Chance to spawn power-up
    if (Math.random() < config.powerUpChance) {
        createPowerUp();
    }
}

// Create power-up
function createPowerUp() {
    const powerUp = document.createElement('div');
    powerUp.className = 'powerup';
    powerUp.dataset.type = config.powerUpTypes[Math.floor(Math.random() * config.powerUpTypes.length)];
    powerUp.style.left = Math.random() * (config.gameAreaWidth - 30) + 'px';
    gameArea.appendChild(powerUp);
    gameState.powerUps.push(powerUp);
}

// Move obstacles and power-ups
function moveObjects() {
    if (gameState.isPaused) return;

    // Move obstacles
    gameState.obstacles.forEach((obstacle, index) => {
        const top = obstacle.offsetTop;
        if (top > gameArea.offsetHeight) {
            obstacle.remove();
            gameState.obstacles.splice(index, 1);
        } else {
            obstacle.style.top = top + gameState.currentObstacleSpeed + 'px';
            checkCollision(obstacle);
        }
    });

    // Move power-ups
    gameState.powerUps.forEach((powerUp, index) => {
        const top = powerUp.offsetTop;
        if (top > gameArea.offsetHeight) {
            powerUp.remove();
            gameState.powerUps.splice(index, 1);
        } else {
            powerUp.style.top = top + gameState.currentObstacleSpeed + 'px';
            checkPowerUpCollision(powerUp);
        }
    });
}

// Check collision
function checkCollision(obstacle) {
    const playerRect = player.getBoundingClientRect();
    const obstacleRect = obstacle.getBoundingClientRect();

    if (
        playerRect.left < obstacleRect.right &&
        playerRect.right > obstacleRect.left &&
        playerRect.top < obstacleRect.bottom &&
        playerRect.bottom > obstacleRect.top
    ) {
        if (gameState.powerUpActive && player.classList.contains('shield')) {
            obstacle.remove();
            gameState.obstacles = gameState.obstacles.filter(o => o !== obstacle);
        } else {
            handleCollision();
        }
    }
}

// Check power-up collision
function checkPowerUpCollision(powerUp) {
    const playerRect = player.getBoundingClientRect();
    const powerUpRect = powerUp.getBoundingClientRect();

    if (
        playerRect.left < powerUpRect.right &&
        playerRect.right > powerUpRect.left &&
        playerRect.top < powerUpRect.bottom &&
        playerRect.bottom > powerUpRect.top
    ) {
        activatePowerUp(powerUp.dataset.type);
        powerUp.remove();
        gameState.powerUps = gameState.powerUps.filter(p => p !== powerUp);
    }
}

// Activate power-up
function activatePowerUp(type) {
    if (!gameState.isMuted) powerupSound.play();
    gameState.achievements.powerUpsCollected++;
    
    clearTimeout(gameState.powerUpTimeout);
    gameState.activePowerUps[type] = true;

    switch (type) {
        case 'shield':
            player.classList.add('shield');
            gameState.powerUpTimeout = setTimeout(() => {
                player.classList.remove('shield');
                gameState.activePowerUps.shield = false;
            }, config.powerUpDuration);
            break;
        case 'slowTime':
            const originalSpeed = gameState.currentObstacleSpeed;
            gameState.currentObstacleSpeed *= 0.5;
            gameState.powerUpTimeout = setTimeout(() => {
                gameState.currentObstacleSpeed = originalSpeed;
                gameState.activePowerUps.slowTime = false;
            }, config.powerUpDuration);
            break;
        case 'magnet':
            player.classList.add('magnet');
            gameState.powerUpTimeout = setTimeout(() => {
                player.classList.remove('magnet');
                gameState.activePowerUps.magnet = false;
            }, config.powerUpDuration);
            break;
        case 'shrink':
            player.classList.add('shrink');
            player.style.transform = `scale(${config.shrinkScale})`;
            gameState.powerUpTimeout = setTimeout(() => {
                player.classList.remove('shrink');
                player.style.transform = '';
                gameState.activePowerUps.shrink = false;
            }, config.powerUpDuration);
            break;
        case 'doubleShot':
            player.classList.add('double-shot');
            gameState.activePowerUps.doubleShot = true;
            gameState.powerUpTimeout = setTimeout(() => {
                player.classList.remove('double-shot');
                gameState.activePowerUps.doubleShot = false;
            }, config.powerUpDuration);
            break;
        case 'extraLife':
            if (gameState.lives < config.maxLives) {
                gameState.lives++;
                updateLives();
            }
            break;
    }

    achievements.check();
}

// Handle collision
function handleCollision() {
    if (!gameState.isMuted) collisionSound.play();
    gameState.lives--;
    updateLives();

    if (gameState.lives <= 0) {
        endGame();
    } else {
        player.style.opacity = '0.5';
        screenShake();
        // Create explosion particles
        const playerRect = player.getBoundingClientRect();
        for (let i = 0; i < config.particleCount; i++) {
            createParticle(
                playerRect.left + playerRect.width / 2,
                playerRect.top + playerRect.height / 2,
                '#e74c3c'
            );
        }
        setTimeout(() => {
            player.style.opacity = '1';
        }, 1000);
    }
}

// Update lives display
function updateLives() {
    livesContainer.innerHTML = '';
    for (let i = 0; i < gameState.lives; i++) {
        const heart = document.createElement('i');
        heart.className = 'fas fa-heart';
        livesContainer.appendChild(heart);
    }
}

// Update score
function updateScore() {
    if (gameState.isGameOver || gameState.isPaused) return;
    
    gameState.score++;
    scoreElement.textContent = gameState.score;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        highScoreElement.textContent = gameState.highScore;
        localStorage.setItem('highScore', gameState.highScore);
    }
}

// Increase difficulty
function increaseDifficulty() {
    if (gameState.isGameOver || gameState.isPaused) return;

    gameState.level++;
    levelElement.textContent = gameState.level;
    
    gameState.currentObstacleSpeed += config.difficultyIncrease.speedIncrease;
    gameState.currentObstacleInterval = Math.max(
        200,
        gameState.currentObstacleInterval - config.difficultyIncrease.spawnRateDecrease
    );
}

// Toggle mute
function toggleMute() {
    gameState.isMuted = !gameState.isMuted;
    if (muteButton) {
        muteButton.innerHTML = gameState.isMuted ? 
            '<i class="fas fa-volume-mute"></i>' : 
            '<i class="fas fa-volume-up"></i>';
    }
    
    [backgroundMusic, menuMusic, collisionSound, powerupSound, buttonClick].forEach(sound => {
        if (sound) sound.muted = gameState.isMuted;
    });
}

// Toggle pause
function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    if (pauseButton) {
        pauseButton.innerHTML = gameState.isPaused ? 
            '<i class="fas fa-play"></i>' : 
            '<i class="fas fa-pause"></i>';
    }
    
    if (gameState.isPaused) {
        backgroundMusic.pause();
    } else if (!gameState.isMuted) {
        backgroundMusic.play();
    }
}

// Game loop
function gameLoop() {
    if (!gameState.isGameOver && !gameState.isPaused) {
        movePlayer();
        moveObjects();
        updateProjectiles();
        updateMagnetEffect();
        gameState.particles.forEach(particle => particle.update());
        achievements.check();
        requestAnimationFrame(gameLoop);
    }
}

// End game
function endGame() {
    gameState.isGameOver = true;
    clearInterval(gameState.scoreLoop);
    clearInterval(gameState.difficultyLoop);
    backgroundMusic.pause();
    if (!gameState.isMuted) collisionSound.play();
    
    // Add score to leaderboard
    leaderboard.add(gameState.score);
    
    finalScoreElement.textContent = gameState.score;
    finalHighScoreElement.textContent = gameState.highScore;
    gameOverScreen.classList.remove('hidden');
}

// Restart game
function restartGame() {
    // Clear obstacles and power-ups
    gameState.obstacles.forEach(obstacle => obstacle.remove());
    gameState.powerUps.forEach(powerUp => powerUp.remove());
    gameState.particles.forEach(particle => particle.element.remove());
    
    // Reset game state
    gameState.score = 0;
    gameState.lives = config.maxLives;
    gameState.level = 1;
    gameState.isGameOver = false;
    gameState.isPaused = false;
    gameState.obstacles = [];
    gameState.powerUps = [];
    gameState.particles = [];
    gameState.playerPosition = 280;
    gameState.powerUpActive = false;
    
    // Apply current difficulty settings
    const diffSettings = config.difficultyLevels[gameState.difficulty];
    gameState.currentObstacleSpeed = config.obstacleSpeed * diffSettings.speedMultiplier;
    gameState.currentObstacleInterval = diffSettings.obstacleSpawnRate;

    // Reset display
    scoreElement.textContent = '0';
    levelElement.textContent = '1';
    updateLives();
    gameOverScreen.classList.add('hidden');
    player.style.left = gameState.playerPosition + 'px';
    player.classList.remove('shield');

    // Start game
    startGame();
}

// Start game
function startGame() {
    // Reset game state
    gameState.isGameOver = false;
    gameState.isPaused = false;
    gameState.gameStartTime = Date.now();
    
    // Clear existing intervals
    clearInterval(gameState.obstacleInterval);
    clearInterval(gameState.scoreLoop);
    clearInterval(gameState.difficultyLoop);
    
    // Clear existing obstacles and power-ups
    gameState.obstacles.forEach(obstacle => obstacle.remove());
    gameState.powerUps.forEach(powerUp => powerUp.remove());
    gameState.obstacles = [];
    gameState.powerUps = [];
    
    // Reset player position
    gameState.playerPosition = 280;
    player.style.left = gameState.playerPosition + 'px';
    
    // Start game loops
    gameState.obstacleInterval = setInterval(createObstacle, gameState.currentObstacleInterval);
    gameState.scoreLoop = setInterval(updateScore, config.scoreInterval);
    gameState.difficultyLoop = setInterval(increaseDifficulty, config.difficultyIncrease.interval);
    
    // Start background music
    if (!gameState.isMuted) {
        menuMusic.pause();
        backgroundMusic.currentTime = 0;
        backgroundMusic.play();
    }
    
    // Start game loop
    gameLoop();
}

// Initialize high score
highScoreElement.textContent = gameState.highScore;

// Initialize function
function initialize() {
    // Initialize all event listeners
    initializeMenuListeners();
    initializeControls();
    
    // Load saved data
    settings.load();
    leaderboard.display();
    
    // Show main menu initially
    showScreen('mainMenu');
    
    // Start menu music if not muted
    if (!gameState.isMuted) {
        menuMusic.play();
    }
}

// Initialize game
initialize();

// Settings
settings.load();
leaderboard.display();

// Menu navigation
function showScreen(screenId) {
    // Hide all screens
    [mainMenu, settingsMenu, tutorialScreen, leaderboardScreen, gameContainer].forEach(screen => {
        if (screen) screen.classList.add('hidden');
    });
    
    // Show the selected screen
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) {
        screenToShow.classList.remove('hidden');
        
        // Handle music
        if (screenId === 'gameContainer') {
            menuMusic.pause();
            menuMusic.currentTime = 0;
            if (!gameState.isMuted) {
                backgroundMusic.currentTime = 0;
                backgroundMusic.play();
            }
        } else {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
            if (!gameState.isMuted) {
                menuMusic.currentTime = 0;
                menuMusic.play();
            }
        }
    }
}

// Button click sound
function playButtonSound() {
    if (!gameState.isMuted && buttonClick) {
        buttonClick.currentTime = 0;
        buttonClick.play();
    }
}

// Particle system
function createParticle(x, y, color) {
    if (!gameState.particleEffects) return;
    
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.backgroundColor = color;
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.borderRadius = '50%';
    gameArea.appendChild(particle);

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 5 + 2;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    let opacity = 1;

    gameState.particles.push({
        element: particle,
        vx, vy,
        update() {
            const x = parseFloat(particle.style.left);
            const y = parseFloat(particle.style.top);
            particle.style.left = (x + this.vx) + 'px';
            particle.style.top = (y + this.vy) + 'px';
            opacity -= 0.02;
            particle.style.opacity = opacity;

            if (opacity <= 0) {
                particle.remove();
                const index = gameState.particles.indexOf(this);
                if (index > -1) gameState.particles.splice(index, 1);
            }
        }
    });
}

// Screen shake effect
function screenShake() {
    if (!gameState.screenShake) return;
    
    const container = document.querySelector('.game-container');
    let intensity = config.screenShakeIntensity;
    const startTime = Date.now();

    function shake() {
        const elapsed = Date.now() - startTime;
        if (elapsed < config.screenShakeDuration) {
            const x = Math.random() * intensity * 2 - intensity;
            const y = Math.random() * intensity * 2 - intensity;
            container.style.transform = `translate(${x}px, ${y}px)`;
            intensity *= 0.9;
            requestAnimationFrame(shake);
        } else {
            container.style.transform = '';
        }
    }
    shake();
}

// Initialize menu button listeners
function initializeMenuListeners() {
    // Main menu buttons
    const playButton = document.getElementById('playButton');
    const settingsButton = document.getElementById('settingsButton');
    const tutorialButton = document.getElementById('tutorialButton');
    const leaderboardButton = document.getElementById('leaderboardButton');
    
    if (playButton) {
        playButton.addEventListener('click', () => {
            playButtonSound();
            showScreen('gameContainer');
            startGame();
        });
    }
    
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            playButtonSound();
            showScreen('settingsMenu');
        });
    }
    
    if (tutorialButton) {
        tutorialButton.addEventListener('click', () => {
            playButtonSound();
            showScreen('tutorialScreen');
        });
    }
    
    if (leaderboardButton) {
        leaderboardButton.addEventListener('click', () => {
            playButtonSound();
            showScreen('leaderboardScreen');
            leaderboard.display();
        });
    }

    // Back buttons
    const backButtons = [
        'backFromSettings',
        'backFromTutorial',
        'backFromLeaderboard',
        'backToMenuButton'
    ];

    backButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                playButtonSound();
                showScreen('mainMenu');
            });
        }
    });

    // Menu button in game
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            playButtonSound();
            gameState.isGameOver = true;
            showScreen('mainMenu');
        });
    }

    // Settings form
    const saveSettingsButton = document.getElementById('saveSettings');
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', () => {
            playButtonSound();
            
            // Get form values
            const playerNameInput = document.getElementById('playerName');
            const difficultySelect = document.getElementById('difficultySelect');
            const controlsRadio = document.querySelector('input[name="controls"]:checked');
            const musicVolumeInput = document.getElementById('musicVolume');
            const sfxVolumeInput = document.getElementById('sfxVolume');
            const particleEffectsCheckbox = document.getElementById('particleEffects');
            const screenShakeCheckbox = document.getElementById('screenShake');

            // Update game state
            if (playerNameInput) gameState.playerName = playerNameInput.value;
            if (difficultySelect) gameState.difficulty = difficultySelect.value;
            if (controlsRadio) gameState.controlScheme = controlsRadio.value;
            if (musicVolumeInput) gameState.musicVolume = parseInt(musicVolumeInput.value);
            if (sfxVolumeInput) gameState.sfxVolume = parseInt(sfxVolumeInput.value);
            if (particleEffectsCheckbox) gameState.particleEffects = particleEffectsCheckbox.checked;
            if (screenShakeCheckbox) gameState.screenShake = screenShakeCheckbox.checked;

            // Save and apply settings
            settings.save();
            settings.applySettings();
            showScreen('mainMenu');
        });
    }

    // Volume control listeners
    const musicVolumeInput = document.getElementById('musicVolume');
    const sfxVolumeInput = document.getElementById('sfxVolume');

    if (musicVolumeInput) {
        musicVolumeInput.addEventListener('input', () => {
            const volume = parseInt(musicVolumeInput.value) / 100;
            backgroundMusic.volume = volume;
            menuMusic.volume = volume;
        });
    }

    if (sfxVolumeInput) {
        sfxVolumeInput.addEventListener('input', () => {
            const volume = parseInt(sfxVolumeInput.value) / 100;
            collisionSound.volume = volume;
            powerupSound.volume = volume;
            buttonClick.volume = volume;
        });
    }
}

// Achievement system
const achievements = {
    check() {
        // Check score achievements
        config.achievements.scores.forEach(score => {
            if (gameState.score >= score && !gameState.achievements.unlockedAchievements.includes(`score_${score}`)) {
                this.unlock(`score_${score}`, `Skor Ustası: ${score} puana ulaştın!`);
            }
        });

        // Check survival time
        const survivalTime = (Date.now() - gameState.gameStartTime) / 1000;
        config.achievements.survivalTime.forEach(time => {
            if (survivalTime >= time && !gameState.achievements.unlockedAchievements.includes(`survival_${time}`)) {
                this.unlock(`survival_${time}`, `Hayatta Kalma Uzmanı: ${time} saniye hayatta kaldın!`);
            }
        });

        // Check power-ups collected
        config.achievements.powerUpsCollected.forEach(count => {
            if (gameState.achievements.powerUpsCollected >= count && !gameState.achievements.unlockedAchievements.includes(`powerups_${count}`)) {
                this.unlock(`powerups_${count}`, `Güç Toplayıcı: ${count} güç-up topladın!`);
            }
        });

        // Check perfect runs
        config.achievements.perfectRuns.forEach(runs => {
            if (gameState.achievements.perfectRuns >= runs && !gameState.achievements.unlockedAchievements.includes(`perfect_${runs}`)) {
                this.unlock(`perfect_${runs}`, `Mükemmeliyetçi: ${runs} kez hiç hasar almadan oyunu bitirdin!`);
            }
        });
    },

    unlock(id, message) {
        gameState.achievements.unlockedAchievements.push(id);
        localStorage.setItem('achievements', JSON.stringify(gameState.achievements));
        this.showNotification(message);
    },

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <i class="fas fa-trophy"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);

        // Animasyon ve ses efekti
        setTimeout(() => {
            notification.classList.add('show');
            if (!gameState.isMuted) {
                const achievementSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3');
                achievementSound.volume = gameState.sfxVolume / 100;
                achievementSound.play();
            }
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
};

// Projectile system
function createProjectile() {
    if (!gameState.activePowerUps.doubleShot) return;

    const projectile = document.createElement('div');
    projectile.className = 'projectile';
    projectile.style.left = (gameState.playerPosition + config.playerWidth / 2 - 5) + 'px';
    projectile.style.bottom = '40px';
    gameArea.appendChild(projectile);

    gameState.projectiles.push(projectile);
}

function updateProjectiles() {
    gameState.projectiles.forEach((projectile, index) => {
        const top = projectile.offsetTop;
        if (top <= 0) {
            projectile.remove();
            gameState.projectiles.splice(index, 1);
        } else {
            projectile.style.top = (top - config.projectileSpeed) + 'px';
            checkProjectileCollisions(projectile);
        }
    });
}

function checkProjectileCollisions(projectile) {
    const projectileRect = projectile.getBoundingClientRect();
    
    gameState.obstacles.forEach((obstacle, index) => {
        const obstacleRect = obstacle.getBoundingClientRect();
        
        if (
            projectileRect.left < obstacleRect.right &&
            projectileRect.right > obstacleRect.left &&
            projectileRect.top < obstacleRect.bottom &&
            projectileRect.bottom > obstacleRect.top
        ) {
            // Engel ve mermi çarpışması
            createExplosion(obstacle.offsetLeft, obstacle.offsetTop);
            obstacle.remove();
            projectile.remove();
            gameState.obstacles.splice(index, 1);
            gameState.projectiles.splice(gameState.projectiles.indexOf(projectile), 1);
            
            // Bonus puan
            gameState.score += 50;
            scoreElement.textContent = gameState.score;
        }
    });
}

// Magnet effect
function updateMagnetEffect() {
    if (!gameState.activePowerUps.magnet) return;

    gameState.powerUps.forEach(powerUp => {
        const powerUpRect = powerUp.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();
        
        const dx = (playerRect.left + playerRect.width / 2) - (powerUpRect.left + powerUpRect.width / 2);
        const dy = (playerRect.top + playerRect.height / 2) - (powerUpRect.top + powerUpRect.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < config.magnetRange) {
            const speed = (config.magnetRange - distance) / config.magnetRange * 5;
            const angle = Math.atan2(dy, dx);
            
            powerUp.style.left = (powerUp.offsetLeft + Math.cos(angle) * speed) + 'px';
            powerUp.style.top = (powerUp.offsetTop + Math.sin(angle) * speed) + 'px';
        }
    });
}

// Add CSS styles for new features
const style = document.createElement('style');
style.textContent = `
    .achievement-notification {
        position: fixed;
        top: 20px;
        right: -300px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 15px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: right 0.5s ease;
        z-index: 1000;
    }

    .achievement-notification.show {
        right: 20px;
    }

    .achievement-notification i {
        color: #ffd700;
        font-size: 24px;
    }

    .projectile {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 10px #fff;
    }

    .magnet {
        animation: pulse 1s infinite;
    }

    .double-shot {
        background: linear-gradient(45deg, var(--primary-color), #fff);
    }

    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4); }
        70% { box-shadow: 0 0 0 20px rgba(52, 152, 219, 0); }
        100% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
    }
`;
document.head.appendChild(style); 