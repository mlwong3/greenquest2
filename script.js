const GAME_DATA_KEY = 'greenQuestGameData';

const initialGameState = {
gameStarted: false,
level: 1, xp: 0, seeds: 100,
pet: {
type: 'seed1',
stage: 1,
name: '小種籽',
visual: 'https://i.imgur.com/s79zW2c.png',
evolutionPoints: { flower: 0, grass: 0, tree: 0 },
decoration: null,
},
inventory: { specialFeed: 0, ownedDecorations: [] },
pokedex: {},
stats: { feeds: 0, correctAnswers: 0 },
tasks: { 
dailyFeed: { description: "每日餵飼寵物一次", reward: 20, completedToday: false, claimedToday: false, lastFeedDate: null },
feedNonVascular: { description: "餵飼非維管植物", reward: 15, requiredType: "非維管植物", completedToday: false, claimedToday: false, lastFeedDate: null },
feedFern: { description: "餵飼蕨類植物", reward: 15, requiredType: "蕨類植物", completedToday: false, claimedToday: false, lastFeedDate: null },
feedDicot: { description: "餵飼雙子葉植物", reward: 15, requiredType: "雙子葉植物", completedToday: false, claimedToday: false, lastFeedDate: null },
feedMonocot: { description: "餵飼單子葉植物", reward: 15, requiredType: "單子葉植物", completedToday: false, claimedToday: false, lastFeedDate: null },
feedGymnosperm: { description: "餵飼裸子植物", reward: 15, requiredType: "裸子植物", completedToday: false, claimedToday: false, lastFeedDate: null }
},
achievements: {
firstAnswer: { name: "初為人師", description: "第一次成功回答問題", target: 1, progress: 0, unlocked: false, metric: 'correctAnswers' },
feedThreeTimes: { name: "小小農夫", description: "累計餵飼寵物 3 次", target: 3, progress: 0, unlocked: false, metric: 'feeds' },
reachLevelTwo: { name: "初窺門徑", description: "寵物達到 2 級", target: 2, progress: 1, unlocked: false, metric: 'level' },
},
currentQuiz: null, isProcessing: false, xpMultiplier: 1,
};

const petEvolutionData = {
seed1: {
name: '種籽',
stages: {
1: { visual: 'Pet1_1.png' },
2: { visual: 'Pet1_2.png' },
3: { visual: 'Pet1_3.png' }
}
},
seed2: {
name: '豆芽',
stages: {
1: { visual: 'Pet2_1.png' },
2: { visual: 'Pet2_2.png' },
3: { visual: 'Pet2_3.png' }
}
}
};
const shopItems = [
{ id: 'special_feed', name: '神奇營養液', description: '下次餵飼經驗值加倍！', price: 50, icon: '🧪' },
{ id: 'hat_1', name: '時尚草帽', description: '為你的寵物添購一頂可愛的草帽。', price: 150, icon: '👒', visual: 'hat.png' },
];
let gameState = {};
let videoStream = null;
let notificationQueue = [];
let isShowingNotification = false;

let navButtons, screens, petVisual, petName, levelText, xpBar, xpValue,
seedCountText, plantInput, modal, petDecoration, 
mainNav, cameraFeed, captureBtn, cancelCameraBtn, 
canvas;

const calculateXpToNextLevel = (level) => (2 * level);
const getTodayString = () => new Date().toISOString().split('T')[0];

function saveGameState() {
try { localStorage.setItem(GAME_DATA_KEY, JSON.stringify(gameState)); } catch (e) { console.error("無法儲存遊戲進度:", e); }
}

function loadGameState() {
try {
const savedData = localStorage.getItem(GAME_DATA_KEY);
if (savedData) {
const parsedData = JSON.parse(savedData);
if (parsedData.gameStarted) {
gameState = parsedData;

if (!gameState.pet.type) {
gameState.pet.type = 'seed1';
}
if (!gameState.pet.stage) {
gameState.pet.stage = 1;
}

delete gameState.tasks.feedShrub;
delete gameState.tasks.feedTree;
delete gameState.tasks.feedHerbaceous;
delete gameState.tasks.feedVine;

if (!gameState.tasks.feedNonVascular) {
gameState.tasks.feedNonVascular = { description: "餵飼非維管植物", reward: 15, requiredType: "非維管植物", completedToday: false, claimedToday: false, lastFeedDate: null };
}
if (!gameState.tasks.feedFern) {
gameState.tasks.feedFern = { description: "餵飼蕨類植物", reward: 15, requiredType: "蕨類植物", completedToday: false, claimedToday: false, lastFeedDate: null };
}
if (!gameState.tasks.feedDicot) {
gameState.tasks.feedDicot = { description: "餵飼雙子葉植物", reward: 15, requiredType: "雙子葉植物", completedToday: false, claimedToday: false, lastFeedDate: null };
}
if (!gameState.tasks.feedMonocot) {
gameState.tasks.feedMonocot = { description: "餵飼單子葉植物", reward: 15, requiredType: "單子葉植物", completedToday: false, claimedToday: false, lastFeedDate: null };
}
if (!gameState.tasks.feedGymnosperm) {
gameState.tasks.feedGymnosperm = { description: "餵飼裸子植物", reward: 15, requiredType: "裸子植物", completedToday: false, claimedToday: false, lastFeedDate: null };
}

checkEvolution();

return true;
}
}
gameState = JSON.parse(JSON.stringify(initialGameState));
return false;
} catch (e) {
console.error("無法讀取遊戲進度:", e);
gameState = JSON.parse(JSON.stringify(initialGameState));
return false;
}
}

function queueNotification(contentHtml, onClose = () => {}) {
notificationQueue.push({ contentHtml, onClose });
if (!isShowingNotification) {
showNextNotification();
}
}

function showNextNotification() {
if (notificationQueue.length === 0) {
isShowingNotification = false;
return;
}

isShowingNotification = true;
const notification = notificationQueue.shift();
showModal(notification.contentHtml, () => {
notification.onClose();
setTimeout(() => showNextNotification(), 100);
});
}

function showModal(contentHtml, onClose = () => {}) {
const modalContent = modal.querySelector('.modal-content');
modalContent.innerHTML = contentHtml;
modal.classList.remove('hidden');
setTimeout(() => {
modal.classList.add('opacity-100');
modalContent.classList.remove('scale-95', 'opacity-0');
modalContent.classList.add('scale-100', 'opacity-100');
}, 10);

const closeBtn = modalContent.querySelector('.modal-close-btn');
if(closeBtn) {
const closeHandler = () => {
hideModal();
onClose();
closeBtn.removeEventListener('click', closeHandler);
};
closeBtn.addEventListener('click', closeHandler);
}
}

function hideModal() {
const modalContent = modal.querySelector('.modal-content');
modal.classList.remove('opacity-100');
modalContent.classList.remove('scale-100', 'opacity-100');
modalContent.classList.add('scale-95', 'opacity-0');
setTimeout(() => modal.classList.add('hidden'), 300);
}

function showSwitchSceneModal(targetUrl) {
showModal(`
<div class="text-6xl mb-4">🌿</div>
<h3 class="text-2xl font-bold mb-2">是否切換場景？</h3>
<p class="text-gray-600 mb-6">確定要切換到另一個場景嗎？</p>
<div class="flex gap-4 justify-center">
<button class="modal-close-btn btn bg-gray-500 text-white font-bold py-2 px-6 rounded-full" onclick="hideModal()">否</button>
<button class="btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full" onclick="window.location.href='${targetUrl}'">是</button>
</div>
`);
}

function navigateTo(screenName) {
Object.values(screens).forEach(s => s && s.classList.add('hidden'));
if (screens[screenName]) screens[screenName].classList.remove('hidden');
Object.values(navButtons).forEach(b => b && b.classList.remove('active'));
if (navButtons[screenName]) navButtons[screenName].classList.add('active');
if (screenName === 'tasks') renderTasks();
if (screenName === 'pokedex') renderPokedex();
if (screenName === 'shop') renderShop();
}

function renderAll() { renderUI(); renderPet(); }

function renderUI() {
const { level, xp, seeds } = gameState;
const xpToNextLevel = calculateXpToNextLevel(level);
levelText.textContent = `Lv.${level}`;
seedCountText.textContent = seeds;
xpValue.textContent = `${xp}/${xpToNextLevel}`;
xpBar.style.width = `${Math.min((xp / xpToNextLevel) * 100, 100)}%`;
}

function renderPet() {
const { pet } = gameState;
petVisual.src = pet.visual;
petName.textContent = pet.name;
if (pet.decoration) {
petDecoration.src = pet.decoration;
petDecoration.classList.remove('hidden');
} else {
petDecoration.classList.add('hidden');
}
}

function renderTasks() {
const container = screens.tasks;
if (!container.querySelector('h2')) {
container.innerHTML = `<h2 class="text-xl sm:text-2xl font-bold text-center text-emerald-700 mb-6">任務中心</h2><div id="tasks-list" class="space-y-3"></div>`;
}
const list = container.querySelector('#tasks-list');
list.innerHTML = '';

Object.entries(gameState.tasks).forEach(([taskKey, task]) => {
const taskEl = document.createElement('div');
let buttonHtml;
if (task.claimedToday) {
buttonHtml = `<button class="btn px-4 py-2 rounded-full text-white bg-gray-400" disabled>已領取</button>`;
} else if (task.completedToday) {
buttonHtml = `<button class="claim-task-btn btn px-4 py-2 rounded-full text-white bg-green-500 hover:bg-green-600" data-task="${taskKey}">領取</button>`;
} else {
buttonHtml = `<button class="btn px-4 py-2 rounded-full text-white bg-gray-400" disabled>未完成</button>`;
}
taskEl.className = `p-4 border rounded-lg shadow-sm ${task.claimedToday ? 'bg-gray-200' : 'bg-white'}`;
taskEl.innerHTML = `<div class="flex justify-between items-center"><div><p class="font-bold ${task.claimedToday ? 'task-completed' : ''}">${task.description}</p><p class="text-sm text-green-600">獎勵: ${task.reward} 🌿</p></div>${buttonHtml}</div>`;
list.appendChild(taskEl);
});

document.querySelectorAll('.claim-task-btn').forEach(btn => {
btn.addEventListener('click', (e) => claimTaskReward(e.target.dataset.task));
});
}

function claimTaskReward(taskKey) {
const task = gameState.tasks[taskKey];
if (task && task.completedToday && !task.claimedToday) {
task.claimedToday = true;
gameState.seeds += task.reward;
showModal(`<div class="text-6xl mb-4">🎉</div><h3 class="text-2xl font-bold mb-2">獎勵已領取！</h3><p class="text-gray-600 mb-6">獲得 <b>${task.reward}</b> 🌿！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">繼續</button>`, () => {
renderAll();
renderTasks();
saveGameState();
});
}
}

function renderAchievements() {
const container = screens.achievements;
if (!container.querySelector('h2')) {
container.innerHTML = `<h2 class="text-xl sm:text-2xl font-bold text-center text-emerald-700 mb-6">我的成就</h2><div id="achievements-list" class="space-y-3"></div>`;
}
const list = container.querySelector('#achievements-list');
list.innerHTML = '';
Object.values(gameState.achievements).forEach(ach => {
const progress = Math.min(ach.progress, ach.target);
const percentage = Math.floor((progress / ach.target) * 100);
const achEl = document.createElement('div');
achEl.className = `p-4 border rounded-lg shadow-sm ${ach.unlocked ? 'achievement-unlocked' : 'bg-white'}`;
achEl.innerHTML = `<div class="flex items-center"><div class="text-4xl mr-4">${ach.unlocked ? '🏆' : '⏳'}</div><div><p class="font-bold">${ach.name}</p><p class="text-sm text-gray-600">${ach.description}</p><div class="w-full bg-gray-200 rounded-full h-2.5 mt-2"><div class="bg-yellow-400 h-2.5 rounded-full" style="width: ${percentage}%"></div></div><p class="text-xs text-right text-gray-500 mt-1">${progress} / ${ach.target}</p></div></div>`;
list.appendChild(achEl);
});
}

function renderPokedex() {
const container = screens.pokedex;
if (!container.querySelector('h2')) {
container.innerHTML = `<h2 class="text-xl sm:text-2xl font-bold text-center text-emerald-700 mb-6">植物圖鑑</h2><div id="pokedex-grid" class="pokedex-grid"></div>`;
}
const grid = container.querySelector('#pokedex-grid');
grid.innerHTML = '';
if (Object.keys(gameState.pokedex).length === 0) {
grid.innerHTML = `<p class="col-span-full text-center text-gray-500">還沒有收集到任何植物，快去餵飼寵物吧！</p>`;
return;
}
for (const plant of Object.values(gameState.pokedex)) {
const card = document.createElement('div');
card.className = 'pokedex-card bg-white rounded-lg shadow p-2 text-center cursor-pointer hover:shadow-lg transition-shadow';
card.innerHTML = `<img src="${plant.image}" alt="${plant.name}" class="w-full h-20 object-cover rounded-md mb-2"><p class="text-sm font-bold truncate">${plant.name}</p><p class="text-xs text-gray-500">${plant.type}</p>`;
card.addEventListener('click', () => showPlantDetail(plant));
grid.appendChild(card);
}
}

async function showPlantDetail(plant) {
const loadingContent = `<div class="text-6xl mb-4">🌿</div><h3 class="text-2xl font-bold mb-2">${plant.name}</h3><p class="text-sm text-gray-500 italic mb-4">${plant.scientificName || ''}</p><div class="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500 mx-auto mb-4"></div><p class="text-gray-600">AI 正在生成詳細資訊...</p>`;
showModal(loadingContent);

const prompt = `請為以下植物生成詳細介紹，嚴格按照JSON格式回傳：
植物名稱：${plant.name}
${plant.scientificName ? `學名：${plant.scientificName}` : ''}
植物類型：${plant.type}

請提供以下資訊：
{ "flowerLanguage": "該植物的花語（如果有的話，沒有則回傳空字串）", "bloomingSeason": "該植物的花期或生長季節", "description": "簡短描述該植物的特徵、生長環境、用途等（約50-80字）" }`;

const API_KEY = "AIzaSyBSZv_OIB2CdrilAShQAXfmVy8_EuCkDEQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const payload = { 
contents: [{ role: "user", parts: [{ text: prompt }] }], 
generationConfig: { responseMimeType: "application/json" } 
};

try {
const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
if (!response.ok) throw new Error(`API 請求失敗: ${response.status}`);
const result = await response.json();
const detailData = JSON.parse(result.candidates[0].content.parts[0].text);

const flowerLanguageHtml = detailData.flowerLanguage ? `<div class="mb-3"><p class="text-sm font-semibold text-emerald-700">花語</p><p class="text-sm text-gray-700">${detailData.flowerLanguage}</p></div>` : '';
const scientificNameHtml = plant.scientificName ? `<p class="text-sm text-gray-500 italic mb-4">${plant.scientificName}</p>` : '';

const herbariumUrl = 'https://www.herbarium.gov.hk/tc/hk-plant-database/index.html';
const content = `
<div class="text-left max-h-[70vh] overflow-y-auto">
<img src="${plant.image}" alt="${plant.name}" class="w-full max-h-48 object-cover rounded-lg mb-4">
<h3 class="text-2xl font-bold mb-2 text-center">${plant.name}</h3>
${scientificNameHtml}
<div class="mb-3">
<p class="text-sm font-semibold text-emerald-700">植物種類</p>
<p class="text-sm text-gray-700">${plant.type}</p>
</div>
${flowerLanguageHtml}
<div class="mb-3">
<p class="text-sm font-semibold text-emerald-700">花期 / 生長季節</p>
<p class="text-sm text-gray-700">${detailData.bloomingSeason}</p>
</div>
<div class="mb-4">
<p class="text-sm font-semibold text-emerald-700">簡介</p>
<p class="text-sm text-gray-700">${detailData.description}</p>
</div>
<div class="bg-emerald-50 p-3 rounded-lg mb-4">
<p class="text-xs font-semibold text-emerald-700 mb-1">小知識</p>
<p class="text-xs text-gray-600">${plant.fact}</p>
</div>
<div class="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
<p class="text-xs font-semibold text-blue-700 mb-2">🏛️ 官方植物資料庫</p>
<p class="text-xs text-gray-600 mb-2">想了解更多權威資訊？可前往香港植物標本室查詢此植物的官方記錄。</p>
<a href="${herbariumUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:text-blue-800 underline">🔗 前往香港植物標本室</a>
</div>
<button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full w-full">關閉</button>
</div>
`;
showModal(content);
} catch (error) {
console.error("取得植物詳細資訊失敗:", error);
showModal(`<div class="text-6xl mb-4">😢</div><h3 class="text-2xl font-bold mb-2">無法載入詳細資訊</h3><p class="text-gray-600 mb-6">請稍後再試。</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">關閉</button>`);
}
}

function renderShop() {
const container = screens.shop;
if (!container.querySelector('h2')) {
container.innerHTML = `<h2 class="text-xl sm:text-2xl font-bold text-center text-emerald-700 mb-6">商店</h2><div id="shop-items-list" class="space-y-4"></div>`;
}
const list = container.querySelector('#shop-items-list');
list.innerHTML = '';
shopItems.forEach(item => {
const itemEl = document.createElement('div');
itemEl.className = 'flex items-center justify-between bg-white p-3 rounded-lg shadow-sm';
const owned = gameState.inventory.ownedDecorations.includes(item.id);
itemEl.innerHTML = `<div class="flex items-center"><div class="text-4xl mr-4">${item.icon}</div><div><p class="font-bold">${item.name}</p><p class="text-sm text-gray-600">${item.description}</p></div></div><button class="btn buy-btn" data-item-id="${item.id}" ${owned ? 'disabled' : ''}>${owned ? '已擁有' : `🌿 ${item.price}`}</button>`;
list.appendChild(itemEl);
});
document.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', handleBuyItem));
}

function handleBuyItem(event) {
const itemId = event.target.dataset.itemId;
const item = shopItems.find(i => i.id === itemId);
if (!item || gameState.seeds < item.price) {
showModal(`<div class="text-6xl mb-4">😕</div><h3 class="text-2xl font-bold mb-2">購買失敗</h3><p class="text-gray-600 mb-6">您的 🌿 不足！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">好的</button>`);
return;
}
gameState.seeds -= item.price;
if (item.id.includes('feed')) {
gameState.inventory.specialFeed++;
showModal(`<div class="text-6xl mb-4">🎉</div><h3 class="text-2xl font-bold mb-2">購買成功！</h3><p class="text-gray-600 mb-6">您購買了 ${item.name}！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">繼續</button>`);
} else if (item.id.includes('hat')) {
gameState.inventory.ownedDecorations.push(item.id);
gameState.pet.decoration = item.visual;
showModal(`<div class="text-6xl mb-4">🎉</div><h3 class="text-2xl font-bold mb-2">購買成功！</h3><p class="text-gray-600 mb-6">您購買了 ${item.name}，已為寵物戴上！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">好的</button>`);
}
renderAll();
renderShop();
saveGameState();
}

async function startCamera() {
try {
const constraints = { video: { facingMode: 'environment' } };
videoStream = await navigator.mediaDevices.getUserMedia(constraints);
cameraFeed.srcObject = videoStream;
navigateTo('camera');
} catch(err) {
console.warn("後置鏡頭開啟失敗，嘗試預設鏡頭: ", err);
try {
const constraints = { video: true };
videoStream = await navigator.mediaDevices.getUserMedia(constraints);
cameraFeed.srcObject = videoStream;
navigateTo('camera');
} catch (finalErr) {
console.error("無法開啟任何相機: ", finalErr);
showModal(`<div class="text-6xl mb-4">😟</div><h3 class="text-2xl font-bold mb-2">無法開啟相機</h3><p class="text-gray-600 mb-6">請確認您已授權瀏覽器使用相機，或您的裝置有可用的鏡頭。</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">了解</button>`);
}
}
}
function stopCamera() {
if (videoStream) {
videoStream.getTracks().forEach(track => track.stop());
videoStream = null;
}
}
function capturePhoto() {
canvas.width = cameraFeed.videoWidth;
canvas.height = cameraFeed.videoHeight;
const context = canvas.getContext('2d');
context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

const dataUri = canvas.toDataURL('image/png');
const base64Data = dataUri.split(',')[1];

stopCamera();
processImage(base64Data, dataUri);
}

function showFeedOptions() {
const content = `<h3 class="text-2xl font-bold mb-6 text-center">餵飼寵物</h3><div class="grid grid-cols-1 gap-4"><button id="open-camera-btn" class="btn bg-emerald-500 text-white p-4 rounded-lg">📷 開啟相機</button><label for="plant-input" class="btn bg-gray-200 text-gray-800 p-4 rounded-lg cursor-pointer text-center">🖼️ 從相簿選擇</label></div><button class="modal-close-btn mt-6 text-sm text-gray-500">取消</button>`;
showModal(content);
document.getElementById('open-camera-btn').addEventListener('click', () => { hideModal(); startCamera(); });
}

async function processImage(base64Data, imageSrc) {
if (gameState.isProcessing) return;
gameState.isProcessing = true;
navigateTo('loading');
if (gameState.inventory.specialFeed > 0) {
gameState.inventory.specialFeed--;
gameState.xpMultiplier = 2;
showModal(`<div class="text-6xl mb-4">🧪</div><h3 class="text-2xl font-bold mb-2">效果發動！</h3><p class="text-gray-600 mb-6">神奇營養液生效，本次經驗值加倍！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">繼續</button>`);
}
await identifyPlantAndCreateQuiz(base64Data, imageSrc);
}

async function identifyPlantAndCreateQuiz(base64ImageData, imageSrc) {
const prompt = `你是一位專業的植物學家，請參考香港植物標本室（Hong Kong Herbarium）的分類標準來辨識圖片中的植物。請嚴格按照以下JSON格式回傳。

請根據植物的科學分類學分類：
- 非維管植物：無維管束的植物，例如：苔蘚、地衣、藻類
- 蕨類植物：有維管束但無種子的植物，例如：蕨類、鐵線蕨、木賊
- 雙子葉植物：種子有兩片子葉的被子植物，例如：玫瑰、向日葵、櫻花、楓樹、洋紫荊
- 單子葉植物：種子有一片子葉的被子植物，例如：稻米、竹子、百合、蘭花
- 裸子植物：種子裸露的植物，例如：松樹、杉木、銀杏、蘇鐵

如果圖片不是植物，請在plantType中回傳"非植物"。

請確保學名（scientificName）準確無誤，並優先使用香港及華南地區的常見植物名稱。

{ "plantName": "植物的中文名稱", "scientificName": "植物的拉丁學名（例如：Bauhinia × blakeana）", "plantType": "判斷植物屬於'非維管植物'、'蕨類植物'、'雙子葉植物'、'單子葉植物'、'裸子植物'或'非植物'", "funFact": "一段關於此植物的簡短有趣知識", "quiz": { "question": "根據知識點設計一個單選題", "options": ["選項A", "選項B", "正確答案C"], "correctAnswerIndex": 2 } }`;
const API_KEY = "AIzaSyBSZv_OIB2CdrilAShQAXfmVy8_EuCkDEQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const payload = { contents: [{ role: "user", parts: [ { text: prompt }, { inlineData: { mimeType: "image/png", data: base64ImageData } } ] }], generationConfig: { responseMimeType: "application/json" } };

try {
const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
if (!response.ok) {
const errorText = await response.text();
console.error(`API 請求失敗: ${response.status}`, errorText);
throw new Error(`API 請求失敗: ${response.status}`);
}
const result = await response.json();
console.log('API Response:', result);

if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0]) {
console.error('API 回應格式錯誤:', result);
throw new Error('API 回應格式不正確');
}

const data = JSON.parse(result.candidates[0].content.parts[0].text);
console.log('Parsed plant data:', data);

const validTypes = ['非維管植物', '蕨類植物', '雙子葉植物', '單子葉植物', '裸子植物'];
if (!validTypes.includes(data.plantType)) {
showModal(`<div class="text-6xl mb-4">🤔</div><h3 class="text-2xl font-bold mb-2">這不是植物喔</h3><p class="text-gray-600 mb-6">AI 認為這張圖片不是植物，請換一張照片再試一次吧！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">好的</button>`, () => {
navigateTo('home');
gameState.isProcessing = false;
});
return;
}

if (data.plantName && !gameState.pokedex[data.plantName]) {
gameState.pokedex[data.plantName] = { 
name: data.plantName, 
scientificName: data.scientificName || '',
type: data.plantType, 
image: imageSrc, 
fact: data.funFact 
};
}

const today = getTodayString();
const type = data.plantType;

if (type === '非維管植物' && gameState.tasks.feedNonVascular && !gameState.tasks.feedNonVascular.completedToday) {
gameState.tasks.feedNonVascular.completedToday = true;
gameState.tasks.feedNonVascular.lastFeedDate = today;
} else if (type === '蕨類植物' && gameState.tasks.feedFern && !gameState.tasks.feedFern.completedToday) {
gameState.tasks.feedFern.completedToday = true;
gameState.tasks.feedFern.lastFeedDate = today;
} else if (type === '雙子葉植物' && gameState.tasks.feedDicot && !gameState.tasks.feedDicot.completedToday) {
gameState.tasks.feedDicot.completedToday = true;
gameState.tasks.feedDicot.lastFeedDate = today;
} else if (type === '單子葉植物' && gameState.tasks.feedMonocot && !gameState.tasks.feedMonocot.completedToday) {
gameState.tasks.feedMonocot.completedToday = true;
gameState.tasks.feedMonocot.lastFeedDate = today;
} else if (type === '裸子植物' && gameState.tasks.feedGymnosperm && !gameState.tasks.feedGymnosperm.completedToday) {
gameState.tasks.feedGymnosperm.completedToday = true;
gameState.tasks.feedGymnosperm.lastFeedDate = today;
}

gameState.currentQuiz = data.quiz;
displayResultAndQuiz(data, imageSrc);
} catch (error) {
console.error("API 處理錯誤:", error);
showModal(`<div class="text-6xl mb-4">😢</div><h3 class="text-2xl font-bold mb-2">分析失敗</h3><p class="text-gray-600 mb-6">無法辨識圖片，請換一張試試。</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">繼續</button>`, () => {
navigateTo('home');
gameState.isProcessing = false;
});
}
}

function displayResultAndQuiz(data, imageSrc) { 
const screen = screens.result;
const scientificNameHtml = data.scientificName ? `<p class="text-sm text-gray-500 italic mt-1">${data.scientificName}</p>` : '';
screen.innerHTML = `<h2 class="text-xl sm:text-2xl font-bold text-center text-emerald-700 mb-4">分析結果與挑戰</h2><div class="bg-white p-4 rounded-lg mb-4 text-center shadow-sm"><img src="${imageSrc}" alt="上傳的植物圖片" class="max-h-40 w-auto mx-auto rounded-lg shadow-md mb-3"><div class="flex justify-center items-center gap-2"><p class="text-lg font-bold text-emerald-600">${data.plantName || "生態知識"}</p><span id="plant-type-badge" class="text-xs font-semibold px-2 py-0.5 rounded-full"></span></div>${scientificNameHtml}<p class="text-sm mt-2 text-gray-700 bg-emerald-50 p-2 rounded-md">${data.funFact || "準備好接受挑戰了嗎？"}</p></div><div class="bg-amber-50 p-4 rounded-lg shadow-sm"><p class="font-semibold text-amber-800 mb-3 text-center">💡 生態小測驗</p><p class="mb-4 text-center">${data.quiz.question}</p><div id="quiz-options" class="grid grid-cols-1 gap-3"></div></div>`;
const type = data.plantType || '';
const badge = screen.querySelector('#plant-type-badge');
badge.textContent = type;
if (type === '非維管植物') badge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-200 text-teal-800';
else if (type === '蕨類植物') badge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-green-200 text-green-800';
else if (type === '雙子葉植物') badge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-200 text-pink-800';
else if (type === '單子葉植物') badge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800';
else if (type === '裸子植物') badge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800';
else badge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-800';
const optionsContainer = screen.querySelector('#quiz-options');
data.quiz.options.forEach((option, index) => {
const button = document.createElement('button');
button.textContent = option;
button.className = 'btn w-full text-left p-3 bg-white hover:bg-amber-100 rounded-lg border border-amber-200';
button.onclick = () => handleQuizAnswer(index);
optionsContainer.appendChild(button);
});
navigateTo('result');
gameState.isProcessing = false;
}

function handleQuizAnswer(selectedIndex) {
if (gameState.isProcessing) return;
gameState.isProcessing = true;

const isCorrect = selectedIndex === gameState.currentQuiz.correctAnswerIndex;

const afterQuizAction = () => {
gameState.stats.feeds++;
checkAchievements('feeds', gameState.stats.feeds);
const dailyFeedTask = gameState.tasks.dailyFeed;
if (!dailyFeedTask.completedToday) {
dailyFeedTask.completedToday = true;
dailyFeedTask.lastFeedDate = getTodayString();
queueNotification(`<div class="text-6xl mb-4">🔔</div><h3 class="text-2xl font-bold mb-2">任務進度更新</h3><p class="text-gray-600 mb-6">您已完成「每日餵飼」任務，記得到任務中心領取獎勵！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">繼續</button>`);
}
checkLevelUp();
navigateTo('home');
gameState.isProcessing = false;
gameState.xpMultiplier = 1;
};

if (isCorrect) {
const xpReward = 5 * gameState.xpMultiplier;
gameState.xp += xpReward;
gameState.stats.correctAnswers++;
checkAchievements('correctAnswers', gameState.stats.correctAnswers);
renderAll();
saveGameState();
showModal(`<div class="text-6xl mb-4">🎉</div><h3 class="text-2xl font-bold mb-2">答對了！</h3><p class="text-gray-600 mb-6">太棒了！獲得了 <b>${xpReward}</b> 點經驗值。</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">繼續</button>`, afterQuizAction);
} else {
const xpReward = 2 * gameState.xpMultiplier;
gameState.xp += xpReward;
const correctAnswer = gameState.currentQuiz.options[gameState.currentQuiz.correctAnswerIndex];
renderAll();
saveGameState();
showModal(`<div class="text-6xl mb-4">🤔</div><h3 class="text-2xl font-bold mb-2">差一點！</h3><p class="text-gray-600 mb-6">正確答案是「${correctAnswer}」。<br>別灰心，依然獲得了 <b>${xpReward}</b> 點經驗值！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">繼續</button>`, afterQuizAction);
}
}

function checkLevelUp() {
let levelsGained = 0;

while (true) {
const xpNeeded = calculateXpToNextLevel(gameState.level);
if (gameState.xp < xpNeeded) break;

gameState.xp -= xpNeeded;
gameState.level++;
levelsGained++;
checkAchievements('level', gameState.level);
}

if (levelsGained > 0) {
checkEvolution();
renderAll();
saveGameState();

const levelText = levelsGained > 1 ? `升級了 ${levelsGained} 級` : '升級了';
queueNotification(`<div class="text-6xl mb-4">🎊</div><h3 class="text-2xl font-bold mb-2">${levelText}！</h3><p class="text-gray-600 mb-6">恭喜！您的寵物升級到 <b>Lv.${gameState.level}</b>！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">太棒了！</button>`);
}
}

function checkEvolution() {
const petType = gameState.pet.type;
const currentLevel = gameState.level;
let newStage = 1;

if (currentLevel >= 3) {
newStage = 3;
} else if (currentLevel >= 2) {
newStage = 2;
}

if (newStage !== gameState.pet.stage) {
const oldStage = gameState.pet.stage;
gameState.pet.stage = newStage;

if (petEvolutionData[petType] && petEvolutionData[petType].stages[newStage]) {
const evolutionInfo = petEvolutionData[petType].stages[newStage];
gameState.pet.visual = evolutionInfo.visual;
renderPet();
saveGameState();

if (oldStage < newStage) {
queueNotification(`<div class="text-6xl mb-4">✨</div><h3 class="text-2xl font-bold mb-2">進化了！</h3><p class="text-gray-600 mb-6"><b>${gameState.pet.name}</b> 進化了！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">太酷了！</button>`);
}
}
}
}

function checkAchievements(metric, value) {
Object.keys(gameState.achievements).forEach(key => {
const ach = gameState.achievements[key];
if (ach.metric === metric && !ach.unlocked) {
ach.progress = value;
if (ach.progress >= ach.target) {
ach.unlocked = true;
gameState.seeds += 50;
queueNotification(`<div class="text-6xl mb-4">🏆</div><h3 class="text-2xl font-bold mb-2">成就解鎖！</h3><p class="text-gray-600 mb-4"><b>${ach.name}</b></p><p class="text-sm text-gray-500 mb-6">${ach.description}</p><p class="text-emerald-600 font-bold">獲得獎勵：50 🌿</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">太好了！</button>`);
}
}
});
saveGameState();
}

function checkDailyTasks() {
const today = getTodayString();

Object.values(gameState.tasks).forEach(task => {
if (task.lastFeedDate && task.lastFeedDate !== today) {
task.completedToday = false;
task.claimedToday = false;
}
});

saveGameState();
}

function initializeGame(petName, petImageURL, petType) {
gameState.pet.type = petType;
gameState.pet.stage = 1;
gameState.pet.name = petName;

if (petEvolutionData[petType] && petEvolutionData[petType].stages[1]) {
const stageData = petEvolutionData[petType].stages[1];
gameState.pet.visual = stageData.visual;
} else {
gameState.pet.visual = petImageURL;
}

gameState.gameStarted = true;
saveGameState();
screens.start.classList.add('hidden');
mainNav.classList.remove('hidden');
renderAll();
navigateTo('home');
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
// Assign DOM elements
navButtons = { home: document.getElementById('nav-home'), tasks: document.getElementById('nav-tasks'), pokedex: document.getElementById('nav-pokedex'), shop: document.getElementById('nav-shop') };
screens = { start: document.getElementById('start-screen'), home: document.getElementById('home-screen'), loading: document.getElementById('loading-screen'), result: document.getElementById('result-screen'), tasks: document.getElementById('tasks-screen'), achievements: document.getElementById('achievements-screen'), pokedex: document.getElementById('pokedex-screen'), shop: document.getElementById('shop-screen'), camera: document.getElementById('camera-screen') };
petVisual = document.getElementById('pet-visual'); petName = document.getElementById('pet-name'); levelText = document.getElementById('level-text'); xpBar = document.getElementById('xp-bar'); xpValue = document.getElementById('xp-value'); seedCountText = document.getElementById('seed-count'); plantInput = document.getElementById('plant-input'); modal = document.getElementById('modal'); petDecoration = document.getElementById('pet-decoration');
mainNav = document.getElementById('main-nav'); cameraFeed = document.getElementById('camera-feed'); captureBtn = document.getElementById('capture-btn'); cancelCameraBtn = document.getElementById('cancel-camera-btn'); canvas = document.getElementById('canvas');

// Add Event Listeners
plantInput.addEventListener('change', (e) => {
const file = e.target.files[0];
if (file) {
hideModal();
const reader = new FileReader();
reader.onload = (re) => processImage(re.target.result.split(',')[1], re.target.result);
reader.readAsDataURL(file);
}
});
document.getElementById('feed-btn-trigger').addEventListener('click', showFeedOptions);
document.getElementById('achievements-btn').addEventListener('click', () => { navigateTo('achievements'); renderAchievements(); });
Object.keys(navButtons).forEach(key => { if (navButtons[key]) navButtons[key].addEventListener('click', () => navigateTo(key)); });
captureBtn.addEventListener('click', capturePhoto);
cancelCameraBtn.addEventListener('click', () => { stopCamera(); navigateTo('home'); });

// Initial setup
if (loadGameState()) {
mainNav.classList.remove('hidden');
checkDailyTasks();
renderAll();
navigateTo('home');
} else {
screens.start.classList.remove('hidden');
const petChoice1 = document.getElementById('pet-choice-1');
const petChoice2 = document.getElementById('pet-choice-2');
const startPetName = document.getElementById('start-pet-name');
const startGameBtn = document.getElementById('start-game-btn');

let selectedPetURL = petChoice1.dataset.visual;
let selectedPetName = petChoice1.dataset.name;
let selectedPetType = petChoice1.dataset.type;
petChoice1.classList.add('selected');
startPetName.value = selectedPetName;

petChoice1.addEventListener('click', () => {
selectedPetURL = petChoice1.dataset.visual;
selectedPetName = petChoice1.dataset.name;
selectedPetType = petChoice1.dataset.type;
petChoice1.classList.add('selected');
petChoice2.classList.remove('selected');
startPetName.value = selectedPetName;
});
petChoice2.addEventListener('click', () => {
selectedPetURL = petChoice2.dataset.visual;
selectedPetName = petChoice2.dataset.name;
selectedPetType = petChoice2.dataset.type;
petChoice2.classList.add('selected');
petChoice1.classList.remove('selected');
startPetName.value = selectedPetName;
});

startGameBtn.addEventListener('click', () => {
const petNameValue = startPetName.value.trim();
if (!petNameValue) {
showModal(`<div class="text-6xl mb-4">⚠️</div><h3 class="text-2xl font-bold mb-2">提示</h3><p class="text-gray-600 mb-6">請為您的寵物取一個名字！</p><button class="modal-close-btn btn bg-emerald-500 text-white font-bold py-2 px-6 rounded-full">好的</button>`);
return;
}
initializeGame(petNameValue, selectedPetURL, selectedPetType);
});
}
});