let count = 0;
let totalBananas = 0;
let ownedBuildings = new Set();
let ownedUpgrades = new Set();
let unlockedBananas = ['Regular Banana', 'Cheese Banana'];
let activeBanana = 'Regular Banana';
let placing = null;
let hasUnlockedGoldBanana = false;
let hasUnlockedGubby = false;
let BananaTreeRate = 2;
let MonkeyWorkerRate = 8;
let BananaFactoryRate = 30;
let BananaResearchLabRate = 70;
let BananaMarketRate = 150;
let CursorRate = 1;
let startTime = Date.now();
let playTime = 0;
let unlockedSkins = [];

// Statistics tracking variables
let stats = {
    totalBananasEarned: 0,
    totalClicks: 0,
    bananasSpentBuildings: 0,
    bananasSpentUpgrades: 0,
    bananasSpentCases: 0,
    casesOpened: 0,
    whacGamesPlayed: 0,
    bestWhacScore: 0,
    totalWhacScore: 0,
    gameStartTime: Date.now(),
    lastSaveTime: Date.now()
};


const banana = document.getElementById('banana');
const countDisplay = document.createElement('div');
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
const overlay = document.getElementById('placementOverlay');
const btnStart = document.getElementById('btnStart');
const titleScreen = document.getElementById('titleScreen');
const gameScreen = document.getElementById('gameScreen');
const bananaSelect = document.getElementById('bananaSelect');
const btnExportSave = document.getElementById('btnExportSave');
const btnImportSave = document.getElementById('btnImportSave');
const fileInput = document.getElementById('importFileInput');
const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = settingsModal.querySelector('.close-settings');
const settingsForm = document.getElementById('settingsForm');

const basePrices = {
    'Cursor': 10,
    'Banana Tree': 100,
    'Monkey Worker': 1100,
    'Banana Factory': 13000,
    'Banana Research Lab': 150000,
    'Banana Market': 140000000
};


const bananaTypes = {
    'Regular Banana': { unlockCondition: () => true },
    'Cheese Banana': { unlockCondition: () => true },
    'Golden Banana': { unlockCondition: () => ownedBuildings.size >= 5 },
    'Rainbow Banana': { unlockCondition: () => totalBananas >= 10000 },
    'Cosmic Banana': { unlockCondition: () => ownedUpgrades.size >= 5 },
    'Legendary Banana': { unlockCondition: () => ownedBuildings.size >= 10 && ownedUpgrades.size >= 10 }
};


let buildingProduction = {
    'Cursor': CursorRate,
    'Banana Tree': BananaTreeRate,
    'Monkey Worker': MonkeyWorkerRate,
    'Banana Factory': BananaFactoryRate,
    'Banana Research Lab': BananaResearchLabRate,
    'Banana Market': BananaMarketRate
};


let ownedBuildingCounts = {
    'Cursor': 0,
    'Banana Tree': 0,
    'Monkey Worker': 0,
    'Banana Factory': 0,
    'Banana Research Lab': 0,
    'Banana Market': 0
};

function updateBananaImage() {
    if (bananaImages[activeBanana]) {
        banana.src = bananaImages[activeBanana];
    } else {
        banana.src = 'images/banana.png';
    }
}

countDisplay.style.position = 'absolute';
countDisplay.style.top = '10px';
countDisplay.style.left = '10px';
countDisplay.style.font = '1.2rem Pixelify Sans';
banana.parentElement.appendChild(countDisplay);

// Production accumulation for smooth earning
let lastProdTime = performance.now();
let bananaBuffer = 0;

function accumulateProduction() {
    const now = performance.now();
    const deltaSec = (now - lastProdTime) / 1000;
    if (deltaSec <= 0) return;
    lastProdTime = now;

    // bananas/second from buildings
    let prodPerSec = 0;
    for (const [building, cnt] of Object.entries(ownedBuildingCounts)) {
        if (!cnt) continue;
        if (building === 'Cursor') {
            // cursor produced 1 banana every 10 s previously → 0.1/ s
            prodPerSec += cnt * 0.1;
        } else {
            prodPerSec += cnt * buildingProduction[building];
        }
    }

    bananaBuffer += prodPerSec * deltaSec;
    if (bananaBuffer >= 1) {
        const whole = Math.floor(bananaBuffer);
        bananaBuffer -= whole;
        count += whole;
        totalBananas += whole;
        stats.totalBananasEarned += whole;
        checkBananaCount(totalBananas);
    }
}

// Smooth counter display variables & loop
let displayCount = 0;
function renderLoop() {
    // first, accumulate logical production smoothly
    accumulateProduction();
    const diff = count - displayCount;
    if (diff !== 0) {
        /*
           Move toward the real total but guarantee *at least* a step of 1 per frame.
           The bigger the gap, the bigger the step, so large jumps still catch up fast
           but small gaps animate one-by-one without stalling.
        */
        const step = Math.sign(diff) * Math.max(1, Math.floor(Math.abs(diff) / 10));
        // Ensure we never overshoot
        if (Math.sign(diff) !== Math.sign(diff - step)) {
            displayCount = count;
        } else {
            displayCount += step;
        }
    }
    countDisplay.textContent = `Bananas: ${displayCount}`;
    requestAnimationFrame(renderLoop);
}
renderLoop();

// initial logical update (visual handled by renderLoop)
updateCount();

btnStart.addEventListener('click', () => {
    titleScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    updateCount();
    updateBananaMenu();
    
    // Initialize stats if not already set
    if (!stats.gameStartTime) {
        stats.gameStartTime = Date.now();
    }
    
    // Setup quest modal after game starts
    setupQuestModal();
});

bananaSelect.addEventListener('change', (e) => {
    activeBanana = e.target.value;
    updateBananaImage();
});


banana.src = 'images/banana.png';
updateBananaMenu();

// --- QUEST TRACKING ---
const QUESTS = {
  daily: {
    clicks: { goal: 100, progress: 0, reward: 100, claimed: false },
    bananas: { goal: 1000, progress: 0, reward: 250, claimed: false }
  },
  weekly: {
    buildings: { goal: 10, progress: 0, reward: 1000, claimed: false },
    cases: { goal: 5, progress: 0, reward: 500, claimed: false }
  }
};

function updateQuestUI() {
  // Daily
  setQuestClaimable('dailyClicksItem', 'claimDailyClicks', QUESTS.daily.clicks.progress >= QUESTS.daily.clicks.goal && !QUESTS.daily.clicks.claimed, QUESTS.daily.clicks.claimed);
  document.getElementById('dailyClicks').textContent = `${QUESTS.daily.clicks.progress}/${QUESTS.daily.clicks.goal}`;
  setQuestClaimable('dailyBananasItem', 'claimDailyBananas', QUESTS.daily.bananas.progress >= QUESTS.daily.bananas.goal && !QUESTS.daily.bananas.claimed, QUESTS.daily.bananas.claimed);
  document.getElementById('dailyBananas').textContent = `${QUESTS.daily.bananas.progress}/${QUESTS.daily.bananas.goal}`;
  // Weekly
  setQuestClaimable('weeklyBuildingsItem', 'claimWeeklyBuildings', QUESTS.weekly.buildings.progress >= QUESTS.weekly.buildings.goal && !QUESTS.weekly.buildings.claimed, QUESTS.weekly.buildings.claimed);
  document.getElementById('weeklyBuildings').textContent = `${QUESTS.weekly.buildings.progress}/${QUESTS.weekly.buildings.goal}`;
  setQuestClaimable('weeklyCasesItem', 'claimWeeklyCases', QUESTS.weekly.cases.progress >= QUESTS.weekly.cases.goal && !QUESTS.weekly.cases.claimed, QUESTS.weekly.cases.claimed);
  document.getElementById('weeklyCases').textContent = `${QUESTS.weekly.cases.progress}/${QUESTS.weekly.cases.goal}`;
}

// Track clicks
banana.addEventListener('click', () => {
  QUESTS.daily.clicks.progress++;
  updateQuestUI();
});
// Track bananas earned (clicks and production)
function addBananasForQuest(amount) {
  QUESTS.daily.bananas.progress += amount;
  updateQuestUI();
}
// Patch banana click and production
const origBananaClick = banana.onclick;
banana.addEventListener('click', (event) => {
  let gain = 1;
  if (ownedUpgrades.has('Golden Banana Boost')) gain *= 2;
  addBananasForQuest(gain);
});
const origAccumulateProduction = accumulateProduction;
accumulateProduction = function() {
  const before = count;
  origAccumulateProduction.apply(this, arguments);
  const gained = count - before;
  if (gained > 0) addBananasForQuest(gained);
};
// Track buildings bought
const origCreateBuildingElement = createBuildingElement;
createBuildingElement = function(buildingName) {
  QUESTS.weekly.buildings.progress++;
  updateQuestUI();
  origCreateBuildingElement.apply(this, arguments);
};
// Track cases opened
const origOpenCase = openCase;
openCase = function(caseItem) {
  QUESTS.weekly.cases.progress++;
  updateQuestUI();
  origOpenCase.apply(this, arguments);
};
// Claim quest rewards
function claimQuest(type, key, itemId, btnId, reward) {
  if (QUESTS[type][key].progress >= QUESTS[type][key].goal && !QUESTS[type][key].claimed) {
    count += reward;
    updateCount();
    QUESTS[type][key].claimed = true;
    // Unlock Gubbynana when a weekly quest is claimed
    if (type === 'weekly' && !hasUnlockedGubby) {
      unlockGubby();
    }
    showQuestCompleteAnimation();
    setQuestClaimable(itemId, btnId, false, true);
  }
}
document.getElementById('claimDailyClicks').addEventListener('click', () => claimQuest('daily', 'clicks', 'dailyClicksItem', 'claimDailyClicks', QUESTS.daily.clicks.reward));
document.getElementById('claimDailyBananas').addEventListener('click', () => claimQuest('daily', 'bananas', 'dailyBananasItem', 'claimDailyBananas', QUESTS.daily.bananas.reward));
document.getElementById('claimWeeklyBuildings').addEventListener('click', () => claimQuest('weekly', 'buildings', 'weeklyBuildingsItem', 'claimWeeklyBuildings', QUESTS.weekly.buildings.reward));
document.getElementById('claimWeeklyCases').addEventListener('click', () => claimQuest('weekly', 'cases', 'weeklyCasesItem', 'claimWeeklyCases', QUESTS.weekly.cases.reward));
// Reset quests (for demo, resets on page reload; for real, use date checks)
function resetDailyQuests() {
  QUESTS.daily.clicks.progress = 0; QUESTS.daily.clicks.claimed = false;
  QUESTS.daily.bananas.progress = 0; QUESTS.daily.bananas.claimed = false;
  updateQuestUI();
}
function resetWeeklyQuests() {
  QUESTS.weekly.buildings.progress = 0; QUESTS.weekly.buildings.claimed = false;
  QUESTS.weekly.cases.progress = 0; QUESTS.weekly.cases.claimed = false;
  updateQuestUI();
}
// Call update on load
updateQuestUI();

banana.addEventListener('click', (event) => {
    let gain = 1;

    if (ownedUpgrades.has('Golden Banana Boost')) {
        gain *= 2;
    }

    count += gain;
    totalBananas += gain;
    stats.totalBananasEarned += gain;
    updateCount();
    checkBananaUnlocks();

    createBanana(event);
    createFloatingText(gain, event.clientX, event.clientY - 30);
});


tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.add('active');
}));


document.querySelectorAll('.buy').forEach(btn => btn.addEventListener('click', e => {
    const item = e.target.closest('.item');
const buildingName = item.dataset.building;
const isUpgrade = item.dataset.type === 'upgrade';

    // Determine cost correctly for upgrades vs buildings
    let cost;
    if (isUpgrade) {
        cost = parseInt(item.dataset.cost, 10);
    } else {
        const currentCount = ownedBuildingCounts[buildingName] || 0;
        cost = Math.floor(basePrices[buildingName] * Math.pow(1.15, currentCount));
    }

    if (count >= cost) {
        count -= cost;
        updateCount();

        // Track statistics
        if (item.dataset.type === 'building') {
            stats.bananasSpentBuildings += cost;
            ownedBuildings.add(buildingName);
            ownedBuildingCounts[buildingName]++;
            createBuildingElement(buildingName);
        } else if (item.dataset.type === 'upgrade') {
            stats.bananasSpentUpgrades += cost;
            const upgrade = item.dataset.upgrade;
            ownedUpgrades.add(upgrade);

            if (upgrade === "Improved Banana Tree") {
                BananaTreeRate = BananaTreeRate * 2;
                buildingProduction['Banana Tree'] = BananaTreeRate;
            }
            if (upgrade === "Faster Monkeys") {
                MonkeyWorkerRate = MonkeyWorkerRate * 1.4;
                buildingProduction['Monkey Worker'] = MonkeyWorkerRate;
            }
            if (upgrade === "Automated Factories") {
                BananaFactoryRate = BananaFactoryRate * 2;
                buildingProduction['Banana Factory'] = BananaFactoryRate;
            }
            if (upgrade === "Advanced Research") {
                BananaResearchLabRate = BananaResearchLabRate * 2.5;
                buildingProduction['Banana Research Lab'] = BananaResearchLabRate;
            }
            if (upgrade === "Market Expansion") {
                BananaMarketRate *= 2; // 100% boost
                buildingProduction['Banana Market'] = BananaMarketRate;
            }
            if (upgrade === "Banana Fertilizer") {
                BananaTreeRate *= 1.5; // 50% boost
                buildingProduction['Banana Tree'] = BananaTreeRate;
            }
            if (upgrade === "Monkey Training") {
                MonkeyWorkerRate *= 1.5; // 50% boost
                buildingProduction['Monkey Worker'] = MonkeyWorkerRate;
            }
            if (upgrade === "Factory Overhaul") {
                BananaFactoryRate *= 3; // 3x boost
                buildingProduction['Banana Factory'] = BananaFactoryRate;
            }
            if (upgrade === "Global Trade") {
                BananaMarketRate *= 3; // 3x boost
                buildingProduction['Banana Market'] = BananaMarketRate;
            }

            item.remove();
        }

        
        const newCount = ownedBuildingCounts[buildingName] || 0;
        const nextCost = Math.floor(basePrices[buildingName] * Math.pow(1.15, newCount));

        
        item.dataset.cost = nextCost;
        item.querySelector('span').textContent = `${buildingName} - Cost: ${nextCost} Bananas`;

        const priceElement = item.querySelector('span');
        priceElement.classList.add('price-up');
        setTimeout(() => priceElement.classList.remove('price-up'), 500);

        checkBananaUnlocks();
    }
}));

// Placement flow
function startPlacing(building) {
    placing = building;
    overlay.style.pointerEvents = 'auto';
    document.addEventListener('mousemove', movePlaceholder);
    document.addEventListener('click', placeBuilding);
}

function movePlaceholder(e) {
    let ph = document.querySelector('.placeholder');
    if (!ph) {
        ph = document.createElement('div');
        ph.className = 'placeholder';
        overlay.appendChild(ph);
    }
    ph.style.left = e.clientX - 25 + 'px';
    ph.style.top = e.clientY - 25 + 'px';
}

function placeBuilding(e) {
    if (!placing) return;
    const el = document.createElement('div');
    el.className = 'placeholder';
    const imageUrl = `images/${placing.toLowerCase().replace(' ', '_')}.png`;
    el.style.background = `url("${imageUrl}") center/contain no-repeat`;
    el.style.backgroundColor = '#ccc';
    el.style.pointerEvents = 'none';
    el.style.left = e.clientX - 25 + 'px';
    el.style.top = e.clientY - 25 + 'px';
    overlay.appendChild(el);
    overlay.innerHTML = '';
    placing = null;
    overlay.style.pointerEvents = 'none';
    document.removeEventListener('mousemove', movePlaceholder);
    document.removeEventListener('click', placeBuilding);
}

// Check and unlock bananas
function unlockGubby() {
    if (hasUnlockedGubby) return;
    hasUnlockedGubby = true;
    unlockedBananas.push('Gubbynana');
    bananaTypes['Gubbynana'] = { unlockCondition: () => true };
    updateBananaMenu();
    showUnlockNotification('Unlocked Gubbynana!');
}

function checkBananaUnlocks() {
    for (const [banana, { unlockCondition }] of Object.entries(bananaTypes)) {
        if (!unlockedBananas.includes(banana) && unlockCondition()) {
            unlockedBananas.push(banana);
            updateBananaMenu();
            showUnlockNotification(`Unlocked ${banana}!`);
        }
    }
}

// FIXED: Update banana menu to show both bananas and skins
function updateBananaMenu() {
    bananaSelect.innerHTML = '';

    // Add regular bananas
    unlockedBananas.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        bananaSelect.appendChild(opt);
    });

    // Add skins
    unlockedSkins.forEach(skin => {
        const opt = document.createElement('option');
        opt.value = skin;
        opt.textContent = skin;
        bananaSelect.appendChild(opt);
    });

    // Set active banana
    bananaSelect.value = activeBanana;
}

// Export Save
btnExportSave.addEventListener('click', async () => {
    const saveData = {
        count,
        totalBananas,
        ownedBuildings: Array.from(ownedBuildings),
        ownedUpgrades: Array.from(ownedUpgrades),
        unlockedBananas,
        unlockedSkins,
        activeBanana,
        ownedBuildingCounts,
        stats,
        playTime
    };

    // Check if we're in Electron environment with all required methods
    if (window.electronAPI && window.electronAPI.showSaveDialog && window.electronAPI.writeFile) {
        const defaultPath = `monkey_clicker_save_${Date.now()}.json`;
        const savePath = await window.electronAPI.showSaveDialog(defaultPath);

        if (savePath) {
            window.electronAPI.writeFile(savePath, JSON.stringify(saveData));
            showUnlockNotification('Game saved successfully!');
        }
    } else {
        // Web browser fallback - create download link
        const dataStr = JSON.stringify(saveData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `monkey_clicker_save_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showUnlockNotification('Game saved successfully!');
    }
});


// Update banana counter instantly (renderLoop keeps smooth animation)
function updateCount() {
    countDisplay.textContent = `Bananas: ${count}`;
}

function createBanana(event) {
    const container = document.getElementById('banana-container');
    if (!container) return;

    const banana = document.createElement('div');
    banana.innerHTML = '🍌';
    banana.className = 'banana';

    const x = event.clientX;
    const y = event.clientY;

    banana.style.left = `${x}px`;
    banana.style.top = `${y}px`;

    container.appendChild(banana);

    setTimeout(() => {
        banana.remove();
    }, 800);
    
    // Track statistics
    stats.totalClicks++;
    stats.totalBananasEarned += 1;
}

function createFloatingText(amount, x, y) {
    const container = document.getElementById('banana-container');
    if (!container) return;

    const textEl = document.createElement('div');
    textEl.className = 'floating-text';
    textEl.textContent = `+${amount}`;
    textEl.style.left = `${x}px`;
    textEl.style.top = `${y}px`;

    container.appendChild(textEl);

    setTimeout(() => {
        textEl.remove();
    }, 1000);
}

function createBuildingElement(buildingName) {
    const productionArea = document.getElementById('productionArea');

    if (buildingName === 'Cursor') {
        createCursorElement();   // already makes the rotating image
        return;                  // skip normal DOM listing
    }
    // Find or create the building container
    let buildingContainer = document.querySelector(
        `.building-container[data-building="${buildingName}"]`
    );

    if (!buildingContainer) {
        buildingContainer = document.createElement('div');
        buildingContainer.className = 'building-container';
        buildingContainer.dataset.building = buildingName;

        // Building name label
        const nameEl = document.createElement('div');
        nameEl.className = 'building-name';
        nameEl.textContent = buildingName;
        buildingContainer.appendChild(nameEl);

        // Icons container
        const iconsContainerEl = document.createElement('div');
        iconsContainerEl.className = 'icons-container';
        buildingContainer.appendChild(iconsContainerEl);

        productionArea.appendChild(buildingContainer);
    }

    const iconsContainer = buildingContainer.querySelector('.icons-container');
    const maxIconsPerRow = 10;

    // Only show up to maxIconsPerRow icons
    if (ownedBuildingCounts[buildingName] <= maxIconsPerRow) {
        if (buildingName === 'Monkey Worker') {
            // Monkey worker with pickaxe animation
            const container = document.createElement('div');
            container.className = 'monkey-worker-container';

            // Worker sprite
            const workerImg = document.createElement('img');
            workerImg.src = 'images/monkey_worker.png';
            workerImg.alt = 'Monkey Worker';
            workerImg.className = 'worker';
            container.appendChild(workerImg);

            // Pickaxe overlay
            const pickaxeImg = document.createElement('img');
            pickaxeImg.src = 'images/pickaxe.webp';
            pickaxeImg.alt = 'Pickaxe';
            pickaxeImg.className = 'pickaxe';
            container.appendChild(pickaxeImg);

            iconsContainer.appendChild(container);
        } else {
            // Default building icon
            const icon = document.createElement('img');
            icon.src = `images/${buildingName.toLowerCase().replace(/ /g, '_')}.png`;
            icon.alt = buildingName;
            icon.className = 'building-icon';
            iconsContainer.appendChild(icon);
        }
    }

    // Update the count display (or create it if it doesn't exist)
    let countDisplay = buildingContainer.querySelector('.building-count');
    if (!countDisplay) {
        countDisplay = document.createElement('div');
        countDisplay.className = 'building-count';
        buildingContainer.appendChild(countDisplay);
    }
    countDisplay.textContent = `x${ownedBuildingCounts[buildingName]}`;
}


function checkBananaCount() {
    if (!hasUnlockedGoldBanana && totalBananas > 1000) {
        hasUnlockedGoldBanana = true;
        unlockedBananas.push('Money Banana');
        bananaTypes['Money Banana'] = { unlockCondition: () => true };
        bananaImages['Money Banana'] = 'images/gold_banana.png';
        updateBananaMenu();
    }
}

const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
document.body.appendChild(tooltip);

document.querySelectorAll('.item').forEach(item => {
    item.addEventListener('mouseenter', (e) => {
        const description = item.dataset.description;
        if (description) {
            tooltip.textContent = description;
            tooltip.style.opacity = '1';

            const rect = item.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
        }
    });

    item.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
    });

    item.addEventListener('mousemove', (e) => {
        tooltip.style.left = `${e.pageX - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${e.pageY - tooltip.offsetHeight - 20}px`;
    });
});

setInterval(() => {
    playTime = Math.floor((Date.now() - startTime) / 1000);
    updatePlayTime();
}, 1000);

function updatePlayTime() {
    const hours = Math.floor(playTime / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((playTime % 3600) / 60).toString().padStart(2, '0');
    const seconds = (playTime % 60).toString().padStart(2, '0');
    document.getElementById('playTime').textContent = `Time: ${hours}:${minutes}:${seconds}`;
}

// Stats modal functionality
const btnStats = document.getElementById('btnStats');
const statsModal = document.getElementById('statsModal');
const closeStats = document.querySelector('.close-stats');

btnStats.addEventListener('click', () => {
    updateStatsDisplay();
    statsModal.classList.remove('hidden');
});

closeStats.addEventListener('click', () => {
    statsModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === statsModal) {
        statsModal.classList.add('hidden');
    }
});

function updateStatsDisplay() {
    // Calculate current values
    const totalBuildings = Object.values(ownedBuildingCounts).reduce((sum, count) => sum + count, 0);
    const totalUpgrades = ownedUpgrades.size;
    const bananaTypesUnlocked = unlockedBananas.length;
    const totalSkins = unlockedSkins.length;
    const currentBPS = Object.entries(ownedBuildingCounts).reduce((total, [building, count]) => {
        return total + (buildingProduction[building] * count);
    }, 0);
    
    // Calculate efficiency percentages
    const clickEfficiency = stats.totalBananasEarned > 0 ? 
        ((stats.totalClicks * 1) / stats.totalBananasEarned * 100).toFixed(1) : 0;
    const buildingEfficiency = stats.totalBananasEarned > 0 ? 
        ((stats.bananasSpentBuildings) / stats.totalBananasEarned * 100).toFixed(1) : 0;
    const upgradeEfficiency = stats.totalBananasEarned > 0 ? 
        ((stats.bananasSpentUpgrades) / stats.totalBananasEarned * 100).toFixed(1) : 0;
    
    // Calculate average BPS
    const totalPlayTimeSeconds = (Date.now() - stats.gameStartTime) / 1000;
    const averageBPS = totalPlayTimeSeconds > 0 ? (stats.totalBananasEarned / totalPlayTimeSeconds).toFixed(2) : 0;
    
    // Update display
    document.getElementById('totalBananasEarned').textContent = formatNumber(stats.totalBananasEarned);
    document.getElementById('currentBananas').textContent = formatNumber(count);
    document.getElementById('totalClicks').textContent = formatNumber(stats.totalClicks);
    document.getElementById('bananasPerSecond').textContent = formatNumber(currentBPS);
    document.getElementById('totalPlayTime').textContent = formatTime(playTime);
    document.getElementById('averageBPS').textContent = formatNumber(averageBPS);
    
    document.getElementById('totalBuildings').textContent = formatNumber(totalBuildings);
    document.getElementById('totalUpgrades').textContent = formatNumber(totalUpgrades);
    document.getElementById('bananasSpentBuildings').textContent = formatNumber(stats.bananasSpentBuildings);
    document.getElementById('bananasSpentUpgrades').textContent = formatNumber(stats.bananasSpentUpgrades);
    
    document.getElementById('bananaTypesUnlocked').textContent = formatNumber(bananaTypesUnlocked);
    document.getElementById('totalSkins').textContent = formatNumber(totalSkins);
    document.getElementById('casesOpened').textContent = formatNumber(stats.casesOpened);
    document.getElementById('bananasSpentCases').textContent = formatNumber(stats.bananasSpentCases);
    
    document.getElementById('whacGamesPlayed').textContent = formatNumber(stats.whacGamesPlayed);
    document.getElementById('bestWhacScore').textContent = formatNumber(stats.bestWhacScore);
    document.getElementById('totalWhacScore').textContent = formatNumber(stats.totalWhacScore);
    
    document.getElementById('clickEfficiency').textContent = clickEfficiency + '%';
    document.getElementById('buildingEfficiency').textContent = buildingEfficiency + '%';
    document.getElementById('upgradeEfficiency').textContent = upgradeEfficiency + '%';
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Banana skin case system
    // Add icons to building shop items
    const cases = [
        {
            id: 'common',
            name: 'Common Case',
            cost: 100,
            image: 'images/common_case.png',
            contents: [
                { name: 'Glitchnana', rarity: 'Common', image: 'images/glitchnana.png' },
                { name: 'Craftynana', rarity: 'Common', image: 'images/craftynana.gif' },
                { name: 'Susinana', rarity: 'Common', image: 'images/sushinana.png' },
                { name: 'Goatnana', rarity: 'Common', image: 'images/goatnana.png' },
                { name: 'Screamnana', rarity: 'Common', image: 'images/screamnana.png' },
                { name: 'Blossomnana', rarity: 'Common', image: 'images/blossomnana.png' }
            ]
        },
        {
            id: 'rare',
            name: 'Rare Case',
            cost: 500,
            image: 'images/rare_case.png',
            contents: [
                { name: 'Christmasnana', rarity: 'Rare', image: 'images/christmasnana.gif' },
                { name: 'Furnana', rarity: 'Rare', image: 'images/furnana.gif' },
                { name: 'Moainana', rarity: 'Rare', image: 'images/moainana.png' },
                { name: 'Noisenana', rarity: 'Rare', image: 'images/noisenana.gif' },
                { name: 'Noodlenana', rarity: 'Rare', image: 'images/noodlenana.png' },
                { name: 'Gamblenana', rarity: 'Rare', image: 'images/gamblenana.gif' }
            ]
        },
        {
            id: 'epic',
            name: 'Epic Case',
            cost: 1500,
            image: 'images/epic_case.png',
            contents: [
                { name: 'Bananamobile', rarity: 'Epic', image: 'images/bananamobile.png' },
                { name: 'Wizardnana', rarity: 'Epic', image: 'images/wizardnana.png' },
                { name: 'Angelnana', rarity: 'Epic', image: 'images/angelnana.png' },
                { name: 'Moonglassnana', rarity: 'Epic', image: 'images/moonglassnana.gif' },
                { name: 'Radarnana', rarity: 'Epic', image: 'images/radarnana.gif' },
                { name: 'Cashnana', rarity: 'Epic', image: 'images/cashnana.gif' }
            ]
        },
        {
            id: 'legendary',
            name: 'Legendary Case',
            cost: 5000,
            image: 'images/legendary_case.png',
            contents: [
                { name: 'Pinkglownana', rarity: 'Legendary', image: 'images/pinkglownana.png' },
                { name: 'Infernana', rarity: 'Legendary', image: 'images/infernana.png' },
                { name: 'Heartratenana', rarity: 'Legendary', image: 'images/heartratenana.gif' },
                { name: 'Rubiknana', rarity: 'Legendary', image: 'images/rubiknana.gif' },
                { name: 'Dnanana', rarity: 'Legendary', image: 'images/dnanana.gif' }
            ]
        },
        {
            id: 'elemental',
            name: 'Elemental Case',
            cost: 1000,
            image: 'images/elemental_case.png',
            contents: [
                { name: 'Heatnana', rarity: 'Elemental', image: 'images/heatnana.gif' },
                { name: 'Flamenana', rarity: 'Elemental', image: 'images/flamenana.gif' },
                { name: 'Luminousnana', rarity: 'Elemental', image: 'images/luminousnana.gif' },
                { name: 'Frozenana', rarity: 'Elemental', image: 'images/frozenana.gif' },
                { name: 'Rainana', rarity: 'Elemental', image: 'images/rainana.gif' }
            ]
        }
    ];

    const modal = document.getElementById('caseModal');
    const btnCases = document.getElementById('btnCases');
    const caseContainer = document.getElementById('caseContainer'); // Add this
    const caseOpening = document.getElementById('caseOpening'); // Add this

    if (btnCases) {
        btnCases.addEventListener('click', function () {
            modal.classList.remove('hidden');
            caseContainer.classList.remove('hidden');  // Show case selection
            caseOpening.classList.add('hidden');      // Hide case opening UI
            generateCases();
        });
    }

    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            document.getElementById('caseModal').classList.add('hidden');
            document.getElementById('caseOpening').classList.add('hidden');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('caseModal')) {
            document.getElementById('caseModal').classList.add('hidden');
            document.getElementById('caseOpening').classList.add('hidden');
        }
    });

    function generateCases() {
        const container = document.getElementById('caseContainer');
        if (!container) return;

        container.innerHTML = '';

        cases.forEach(caseItem => {
            const caseElement = document.createElement('div');
            caseElement.className = 'case';
            caseElement.dataset.id = caseItem.id;

            caseElement.innerHTML = `
                <div class="case-image" style="background-image: url('${caseItem.image}')"></div>
                <div class="case-name">${caseItem.name}</div>
                <div class="case-rarity">${caseItem.id.charAt(0).toUpperCase() + caseItem.id.slice(1)}</div>
                <div class="case-cost">${caseItem.cost} Bananas</div>
            `;

            caseElement.addEventListener('click', () => {
                if (count >= caseItem.cost) {
                    count -= caseItem.cost;
                    updateCount();
                    
                    // Track case statistics
                    stats.bananasSpentCases += caseItem.cost;
                    stats.casesOpened++;
                    
                    openCase(caseItem);
                } else {
                    alert(`You need ${caseItem.cost} bananas to open this case!`);
                }
            });

            container.appendChild(caseElement);
        });
    }

    // Add helper functions first
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function animateCSSelection(caseItem, allItems, slowStart, targetIdx, itemW) {
        const grid = document.getElementById('csItemsGrid');
        // 1) kill any old CSS transition & highlight
        grid.style.transition = 'none';
        grid.style.left = '0px';
        grid.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

        // 2) fresh timing parameters
        const initialSpeed = 60;
        const finalSpeed = 300;
        const totalSteps = allItems.length + slowStart + targetIdx;
        let stepCount = 0;

        function step() {
            const offset = stepCount * itemW;
            grid.style.left = `-${offset}px`;

            // highlight (optional—remove if you don’t want the box)
            const centerPos = document.getElementById('csAnimationContainer').offsetWidth / 2;
            const highlightIndex = Math.floor((offset + centerPos) / itemW);
            const child = grid.children[highlightIndex];
            if (child) child.classList.add('highlight');

            stepCount++;
            if (stepCount < totalSteps) {
                // linear ease-out
                let speed = stepCount < slowStart
                    ? initialSpeed
                    : initialSpeed + ((stepCount - slowStart) / (totalSteps - slowStart)) * (finalSpeed - initialSpeed);
                setTimeout(step, speed);
            } else {
                setTimeout(() => finishCaseOpening(caseItem, targetIdx), 500);
            }
        }

        // 3) kick it off on next frame so the DOM has time to re-render your new items
        requestAnimationFrame(() => setTimeout(step, initialSpeed));
    }

    // Also modify the finishCaseOpening function to use the passed index
    function finishCaseOpening(caseItem, pickedIdx) {
        // Use the passed index to get the skin
        const skin = caseItem.contents[pickedIdx];

        // Add to your inventory/state
        if (!unlockedSkins.includes(skin.name)) {
            unlockedSkins.push(skin.name);
        }
        updateBananaMenu();

        // Show it in the UI
        document.getElementById('skinResult').innerHTML = `
        <div class="skin-card ${skin.rarity.toLowerCase()}">
            <div class="skin-image" style="background-image:url('${skin.image}')"></div>
            <div class="skin-name">${skin.name}</div>
            <div class="skin-rarity">${skin.rarity}</div>
        </div>`;
        document.getElementById('unlockedSkin').classList.remove('hidden');
    }

    // FIXED: Skin now properly added to inventory
    function openCase(caseItem) {
        // Hide case selection UI
        document.getElementById('caseContainer').classList.add('hidden');
        const caseOpening = document.getElementById('caseOpening');
        caseOpening.classList.remove('hidden');
        document.getElementById('unlockedSkin').classList.add('hidden');

        // Pick a random skin index FIRST - this needs to be done for both animation types
        const pickedIdx = Math.floor(Math.random() * caseItem.contents.length);
        const skin = caseItem.contents[pickedIdx];

        // Determine animation style
        if (settings.caseAnim === 'cs') {
            // ... existing CS animation code ... 
            // (keep all the CS animation logic, but use pickedIdx we just created)
            animateCSSelection(caseItem, allItems, slowStart, pickedIdx, itemW);
        } else {
            // FIXED: Pass the selected skin index to the finish function
            document.getElementById('csAnimationContainer').classList.add('hidden');
            const spinningBanana = document.getElementById('spinningBanana');
            spinningBanana.style.display = 'block';

            setTimeout(() => {
                spinningBanana.style.display = 'none';
                // FIXED: Pass the selected skin to finishCaseOpening
                finishCaseOpening(caseItem, pickedIdx);
            }, 3000);
        }
    }
function showUnlockNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.background = '#ffcc00';
    notification.style.color = '#000';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '10000';
    notification.style.fontFamily = 'Pixelify Sans';
    notification.style.fontSize = '1.2rem';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

btnImportSave.addEventListener('click', async () => {
    // Check if we're in Electron environment with all required methods
    if (window.electronAPI && window.electronAPI.showOpenDialog && window.electronAPI.readFile) {
        const filePath = await window.electronAPI.showOpenDialog();

        if (filePath) {
            try {
                const data = JSON.parse(await window.electronAPI.readFile(filePath));
                
                if (typeof data.count !== 'number') throw 'Invalid save format';
                
                count = data.count;
                totalBananas = data.totalBananas;
                ownedBuildings = new Set(data.ownedBuildings);
                ownedUpgrades = new Set(data.ownedUpgrades);
                unlockedBananas = data.unlockedBananas;
                unlockedSkins = data.unlockedSkins;
                activeBanana = data.activeBanana;
                
                
                if (data.stats) {
                    stats = data.stats;
                }
                if (data.playTime) {
                    playTime = data.playTime;
                }
                
                
                const loadedCounts = data.ownedBuildingCounts || {};
                ownedBuildingCounts = {};
                for (const buildingName of Object.keys(basePrices)) {
                    ownedBuildingCounts[buildingName] = loadedCounts[buildingName] || 0;
                }
                
                updateCount();
                updateBananaMenu();
                
                document.getElementById('productionArea').innerHTML = '';
                for (const b of Object.keys(ownedBuildingCounts)) {
                    for (let i = 0; i < ownedBuildingCounts[b]; i++) {
                        createBuildingElement(b);
                    }
                }
                alert('Save imported successfully!');
            } catch (err) {
                alert('Failed to import save: ' + err);
            }
        }
    } else {
        // Web browser fallback - trigger file input
        document.getElementById('importFileInput').click();
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            // Validate keys exist
            if (typeof data.count !== 'number') throw 'Invalid save format';
            // Overwrite game state
            count = data.count;
            totalBananas = data.totalBananas;
            ownedBuildings = new Set(data.ownedBuildings);
            ownedUpgrades = new Set(data.ownedUpgrades);
            unlockedBananas = data.unlockedBananas;
            unlockedSkins = data.unlockedSkins;
            activeBanana = data.activeBanana;
            
            // Load stats if available
            if (data.stats) {
                stats = data.stats;
            }
            if (data.playTime) {
                playTime = data.playTime;
            }
            
            // Recompute building counts
            const loadedCounts = data.ownedBuildingCounts || {};
            ownedBuildingCounts = {};
            for (const buildingName of Object.keys(basePrices)) {
                ownedBuildingCounts[buildingName] = loadedCounts[buildingName] || 0;
            }
            // Refresh UI
            updateCount();
            updateBananaMenu();
            // Clear & rebuild production area
            document.getElementById('productionArea').innerHTML = '';
            for (const b of Object.keys(ownedBuildingCounts)) {
                for (let i = 0; i < ownedBuildingCounts[b]; i++) {
                    createBuildingElement(b);
                }
            }
            alert('Save imported successfully!');
        } catch (err) {
            alert('Failed to import save: ' + err);
        }
    };
    reader.readAsText(file);
});

btnSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

// Close on × or outside click
closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

settingsModal.addEventListener('click', e => {
    // if the click is directly on the backdrop (not inside .modal-content)
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

const defaultSettings = {
    caseAnim: 'normal',        // <— force Counter‑Strike style from the get‑go
    showTooltips: true,
    autoSave: false,
    soundFX: true,
    volume: 0.8
};
let settings = JSON.parse(localStorage.getItem('mcSettings') || '{}');
settings = { ...defaultSettings, ...settings };

// Populate form with loaded values
Object.entries(settings).forEach(([key, val]) => {
    const input = settingsForm.elements[key];
    if (!input) return;
    if (input.type === 'radio' || input.type === 'checkbox') {
        if (input.type === 'radio') {
            if (input.value === val) input.checked = true;
        } else {
            input.checked = !!val;
        }
    } else {
        input.value = val;
    }
});

// On save
settingsForm.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(settingsForm);
    settings.caseAnim = fd.get('caseAnim');
    settings.showTooltips = !!fd.get('showTooltips');
    settings.autoSave = !!fd.get('autoSave');
    settings.soundFX = !!fd.get('soundFX');
    settings.volume = parseFloat(fd.get('volume'));

    localStorage.setItem('mcSettings', JSON.stringify(settings));
    applySettings();
    settingsModal.classList.add('hidden');
});

const loreMessages = [
    "Strange noises in the distance...",
    "A faint monkey screech echoes through the trees",
    "Leaves rustle unnervingly nearby",
    "You hear faint whispers carried on the wind",
    "Something watches you from the canopy above",
    "A chill runs down your spine",
    "The scent of ripe bananas grows stronger",
    "Distant drums beat a primitive rhythm",
    "Shadows seem to move just beyond your vision",
    "The jungle feels unusually silent",
    "Ancient energies stir beneath the soil",
    "A primal call echoes through the valley",
    "You feel the weight of ancient monkey spirits",
    "The air crackles with unseen energy"
];


// Sound effects

// Lore Console functionality
function addLoreMessage() {
    const messagesContainer = document.getElementById('loreMessages');
    const message = document.createElement('div');
    message.className = 'lore-message';
    message.textContent = loreMessages[Math.floor(Math.random() * loreMessages.length)];

    // Play sound effect if enabled
    if (settings.soundFX) {
        const sound = loreSound.cloneNode();
        sound.volume = settings.volume * 0.3;
        sound.play();
    }

    messagesContainer.appendChild(message);
    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Schedule random lore messages
function scheduleLoreMessage() {
    const minDelay = 30000; // 30 seconds
    const maxDelay = 90000; // 90 seconds
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;

    setTimeout(() => {
        if (document.getElementById('gameScreen').style.display === 'flex') {
            addLoreMessage();
        }
        scheduleLoreMessage();
    }, delay);
}

// Start the lore scheduler when game begins
btnStart.addEventListener('click', () => {
    // ... existing code ...
    scheduleLoreMessage(); // Start lore message scheduler
});

// Show lore console when game starts
// Apply settings at runtime
function applySettings() {
    // 1) Switch case animation style
    window.currentCaseAnimation = settings.caseAnim;
    // inside your openCase() function, branch on this flag:
    // if (currentCaseAnimation==='cs') { /* do CS‑style spin+flash */ }

    // 2) Tooltips
    document.querySelectorAll('.item').forEach(item => {
        if (settings.showTooltips) {
            item.classList.remove('disabled-tooltip');
        } else {
            item.classList.add('disabled-tooltip');
        }
    });

    // 3) Auto‑save
    if (settings.autoSave) {
        if (!window.autoSaveInterval) {
            window.autoSaveInterval = setInterval(() => {
                // trigger export/save to localStorage
                localStorage.setItem('mcAutosave', JSON.stringify({
                    count, totalBananas, /* …all your state… */
                }));
            }, 60_000);
        }
    } else if (window.autoSaveInterval) {
        clearInterval(window.autoSaveInterval);
        window.autoSaveInterval = null;
    }

    // 4) Sound FX & volume
    //Howler.volume(settings.volume);
    // for each SFX play: if (!settings.soundFX) return;

    // etc…
}

const cursorElements = [];

function createCursorElement() {
    const clickArea = document.getElementById('clickArea');
    const orbit = document.createElement('div');
    orbit.className = 'orbit';

    const img = document.createElement('img');
    img.src = 'images/cursor.png';
    img.alt = 'Cursor';
    img.className = 'cursor-img';

    orbit.appendChild(img);
    clickArea.appendChild(orbit);

    cursorElements.push(orbit);
    repositionCursors();
}

function repositionCursors() {
    const total = cursorElements.length;
    cursorElements.forEach((el, idx) => {
        const angle = (360 / total) * idx;
        el.style.transform = `rotate(${angle}deg)`;
    });
}

// Developer console helper to unlock gubbynana manually
afterInit = () => {};
window.gubby = unlockGubby;
// run once on page load
applySettings();

// Quest modal functionality - setup after everything is loaded
function setupQuestModal() {
  const btnQuests = document.getElementById('btnQuests');
  const questsModal = document.getElementById('questsModal');
  const closeQuests = document.querySelector('.close-quests');
  const questTabs = document.querySelectorAll('.quest-tab');
  const questPanels = document.querySelectorAll('.quest-panel');

  console.log('Setting up quest modal...', { btnQuests, questsModal, questTabs: questTabs.length, questPanels: questPanels.length });

  if (btnQuests && questsModal) {
    btnQuests.addEventListener('click', () => {
      console.log('Quest button clicked!');
      questsModal.classList.remove('hidden');
      // Default to daily tab
      questTabs.forEach(tab => tab.classList.remove('active'));
      questPanels.forEach(panel => panel.classList.add('hidden'));
      if (questTabs[0]) questTabs[0].classList.add('active');
      if (questPanels[0]) questPanels[0].classList.remove('hidden');
    });
  }

  if (closeQuests) {
    closeQuests.addEventListener('click', () => {
      questsModal.classList.add('hidden');
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === questsModal) {
      questsModal.classList.add('hidden');
    }
  });

  questTabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('locked')) return;
      questTabs.forEach(t => t.classList.remove('active'));
      questPanels.forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      if (questPanels[idx]) questPanels[idx].classList.remove('hidden');
    });
  });
}


function showQuestCompleteAnimation() {
  const anim = document.getElementById('questCompleteAnim');
  anim.innerHTML = '<span style="font-size:48px; color:#bada55;">✔️</span>';
  anim.style.display = 'block';
  setTimeout(() => {
    anim.style.display = 'none';
    anim.innerHTML = '';
  }, 1200);
}

function setQuestClaimable(questItemId, claimBtnId, claimable, completed) {
  const item = document.getElementById(questItemId);
  const btn = document.getElementById(claimBtnId);
  if (completed) {
    item.classList.remove('claimable');
    item.classList.add('quest-complete');
    btn.disabled = true;
    btn.textContent = 'Complete';
    if (!item.querySelector('.quest-check')) {
      const check = document.createElement('span');
      check.className = 'quest-check';
      check.innerHTML = '✔️';
      check.style.marginLeft = '8px';
      check.style.color = '#bada55';
      item.appendChild(check);
    }
  } else if (claimable) {
    item.classList.add('claimable');
    item.classList.remove('quest-complete');
    btn.disabled = false;
    btn.textContent = 'Claim';
    const check = item.querySelector('.quest-check');
    if (check) check.remove();
  } else {
    item.classList.remove('claimable');
    item.classList.remove('quest-complete');
    btn.disabled = true;
    btn.textContent = 'Claim';
    const check = item.querySelector('.quest-check');
    if (check) check.remove();
  }
}

// Example: make dailyClicks claimable for demo
