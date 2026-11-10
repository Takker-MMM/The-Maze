const mazeLayouts = [
  [
    ".....#..G",
    "##.#.#.##",
    "...#.....",
    ".#.######",
    ".#..#..#.",
    ".#####.#.",
    ".#...#...",
    ".#.#.###.",
    "S..#.....",
  ],
  [
    ".#...#.#G",
    ".###.#.#.",
    ".....#...",
    "##.#####.",
    ".....#...",
    ".###.###.",
    ".#.....#.",
    ".#.###.#.",
    "S........",
  ],
  [
    ".....#..G",
    ".#.###.##",
    ".#...#.#.",
    ".#.#.#.#.",
    ".#.#.#...",
    ".###.###.",
    ".#.#...#.",
    ".#.#.#.#.",
    "S#...#...",
  ],
  [
    "........G",
    ".########",
    "...#.....",
    "##.#.###.",
    ".#.....#.",
    ".###.#.##",
    ".....#...",
    "##.#####.",
    "S....#...",
  ],
  [
    "...#.#.#G",
    ".#.#.#.#.",
    ".#...#...",
    ".#######.",
    ".#.#.....",
    ".#.###.##",
    ".....#...",
    ".###.#.#.",
    "S#.....#.",
  ],
];

const mazeElement = document.querySelector("#maze");
const stageCountElement = document.querySelector("#stage-count");
const statusElement = document.querySelector("#status");
const timerElement = document.querySelector("#timer");
const countdownElement = document.querySelector("#countdown");
const mazeOverlay = document.querySelector("#maze-overlay");
const startButton = document.querySelector("#start-button");
const nextStageButton = document.querySelector("#next-stage-button");
const logPanel = document.querySelector("#log-panel");
const logList = document.querySelector("#log-list");
const copyLogButton = document.querySelector("#copy-log-button");
const copyLogStatus = document.querySelector("#copy-log-status");
const playArea = document.querySelector(".play-area");
const surveyPanel = document.querySelector("#survey-panel");
const surveyReference = document.querySelector("#survey-reference");
const surveyMaze = document.querySelector("#survey-maze");
const surveyProgress = document.querySelector("#survey-progress");
const surveyForm = document.querySelector("#survey-form");
const surveyQuestions = document.querySelector("#survey-questions");
const surveyNextButton = document.querySelector("#survey-next-button");
const controls = document.querySelectorAll("[data-direction]");

let stageOrder = [];
let stageIndex = 0;
let mazeLayout;
let start;
let goal;
let player;
let moves = 0;
let won = false;
let gameState = "ready";
let countdownTimer;
let elapsedTimer;
let startedAt;
let logEntries = [];
let surveyIndex = 0;

const surveyQuestionsData = [
  { key: "面白さ", high: "面白かった", low: "つまらなかった", middle: "どちらとも言えない" },
  { key: "難しさ", high: "難しかった", low: "簡単だった", middle: "ちょうどいい難易度だった" },
  { key: "ストレス", high: "イライラした", low: "イライラしなかった", middle: "どちらとも言えない" },
];

function formatTime(milliseconds) {
  return (milliseconds / 1000).toFixed(2);
}

function formatLogTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getCoordinate(position) {
  return {
    x: position.column + 1,
    y: mazeLayout.length - position.row,
  };
}

function getMazeName() {
  return `迷路${stageOrder[stageIndex] + 1}`;
}

function addLog(message) {
  logEntries.push(message);
}

function renderLogs() {
  logList.replaceChildren();
  logEntries.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    logList.append(item);
  });
}

async function copyLogs() {
  const logText = logEntries.join("\n");
  try {
    await navigator.clipboard.writeText(logText);
    copyLogStatus.textContent = "ログデータをコピーしました";
  } catch (error) {
    copyLogStatus.textContent = "コピーに失敗しました。ログを選択して手動でコピーしてください";
    console.error("ログデータのコピーに失敗しました", error);
  }
}

function renderSurvey() {
  surveyQuestions.replaceChildren();
  const isFeedbackStep = surveyIndex === mazeLayouts.length;
  surveyReference.hidden = !isFeedbackStep;
  surveyMaze.hidden = isFeedbackStep;

  if (isFeedbackStep) {
    surveyProgress.textContent = "すべての迷路の評価が完了しました";
    const fieldset = document.createElement("fieldset");
    fieldset.className = "survey-question survey-feedback";
    const legend = document.createElement("legend");
    legend.textContent = "迷路について具体的な感想があれば、自由に記述してください。";
    const textarea = document.createElement("textarea");
    textarea.name = "feedback";
    textarea.rows = 6;
    textarea.placeholder = "自由に記述してください（任意）";
    fieldset.append(legend, textarea);
    surveyQuestions.append(fieldset);
    surveyNextButton.textContent = "アンケートを終えてログを見る";
    return;
  }

  surveyProgress.textContent = `${surveyIndex + 1}番目の迷路の評価（${surveyIndex + 1} / ${mazeLayouts.length}）`;

  surveyQuestionsData.forEach(({ key, high, low, middle }) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "survey-question";
    const legend = document.createElement("legend");
    legend.textContent = key;
    fieldset.append(legend);

    const choices = document.createElement("div");
    choices.className = "rating-choices";
    for (let rating = 1; rating <= 5; rating += 1) {
      const label = document.createElement("label");
      label.className = "rating-choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = key;
      input.value = rating;
      input.required = true;
      const text = document.createElement("span");
      text.textContent = rating;
      label.append(input, text);
      choices.append(label);
    }

    const explanation = document.createElement("p");
    explanation.className = "rating-explanation";
    explanation.textContent = `1: ${low} / 3: ${middle} / 5: ${high}`;
    fieldset.append(choices, explanation);
    surveyQuestions.append(fieldset);
  });

  surveyNextButton.textContent =
    surveyIndex === mazeLayouts.length - 1 ? "感想を記述する" : "次の迷路を評価";
}

function renderSurveyReferences() {
  surveyReference.replaceChildren();
  const heading = document.createElement("p");
  heading.className = "survey-reference-title";
  heading.textContent = "参考：5つの迷路";
  surveyReference.append(heading);

  mazeLayouts.forEach((layout, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "survey-reference-maze";
    const label = document.createElement("span");
    label.textContent = `迷路${index + 1}`;
    wrapper.append(label);
    const maze = document.createElement("div");
    maze.className = "maze";
    layout.forEach((line) => {
      [...line].forEach((tile) => {
        const cell = document.createElement("div");
        cell.className = `cell ${tile === "#" ? "wall" : "path"}${tile === "S" ? " start" : ""}${tile === "G" ? " goal" : ""}`;
        maze.append(cell);
      });
    });
    wrapper.append(maze);
    surveyReference.append(wrapper);
  });
}

function startSurvey() {
  surveyIndex = 0;
  gameState = "survey";
  stopTimers();
  document.body.classList.remove("won");
  playArea.classList.add("survey-mode");
  document.querySelector(".intro").hidden = true;
  document.querySelector(".game-header").hidden = true;
  document.querySelector(".maze-stage").hidden = true;
  document.querySelector(".controls").hidden = true;
  mazeOverlay.classList.add("is-playing");
  mazeElement.classList.remove("is-hidden");
  surveyMaze.append(mazeElement);
  loadStage(surveyIndex);
  renderMaze();
  surveyPanel.hidden = false;
  renderSurveyReferences();
  renderSurvey();
}

function finishSurvey(event) {
  event.preventDefault();
  if (!surveyForm.reportValidity()) return;

  if (surveyIndex === mazeLayouts.length) {
    const feedback = surveyForm.elements.feedback.value.trim() || "（記述なし）";
    addLog(`迷路についての具体的な感想：${feedback}`);
    surveyPanel.hidden = true;
    playArea.classList.remove("survey-mode");
    document.querySelector(".maze-stage").append(mazeElement);
    document.querySelector(".intro").hidden = true;
    document.querySelector(".game-header").hidden = true;
    document.querySelector(".maze-stage").hidden = true;
    document.querySelector(".controls").hidden = true;
    renderLogs();
    logPanel.hidden = false;
    return;
  }

  const mazeName = `迷路${stageOrder[surveyIndex] + 1}`;
  const ratings = surveyQuestionsData.map(({ key }) => {
    const selected = surveyForm.querySelector(`input[name="${key}"]:checked`);
    return `${key} ${selected.value}点`;
  });
  addLog(`${mazeName}の評価：${ratings.join(" / ")}`);

  surveyIndex += 1;
  if (surveyIndex === mazeLayouts.length) {
    surveyForm.reset();
    renderSurvey();
    return;
  }

  loadStage(surveyIndex);
  renderMaze();
  surveyForm.reset();
  renderSurvey();
}

function updateTimer() {
  if (gameState === "playing") {
    timerElement.textContent = formatTime(performance.now() - startedAt);
  }
}

function setControlsDisabled(disabled) {
  controls.forEach((button) => {
    button.disabled = disabled;
  });
}

function shuffleStages() {
  stageOrder = mazeLayouts.map((_, index) => index);
  for (let index = stageOrder.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [stageOrder[index], stageOrder[randomIndex]] = [stageOrder[randomIndex], stageOrder[index]];
  }
}

function loadStage(index) {
  mazeLayout = mazeLayouts[stageOrder[index]];
  start = findTile("S");
  goal = findTile("G");
  player = { ...start };
  stageIndex = index;
  stageCountElement.textContent = `${stageIndex + 1} / ${mazeLayouts.length}`;
}

function findTile(tileToFind) {
  for (let row = 0; row < mazeLayout.length; row += 1) {
    const column = mazeLayout[row].indexOf(tileToFind);
    if (column !== -1) return { row, column };
  }
  throw new Error(`迷路に${tileToFind}がありません`);
}

function stopTimers() {
  clearInterval(countdownTimer);
  clearInterval(elapsedTimer);
}

function renderMaze() {
  mazeElement.replaceChildren();
  mazeLayout.forEach((line, row) => {
    [...line].forEach((tile, column) => {
      const cell = document.createElement("div");
      cell.className = `cell ${tile === "#" ? "wall" : "path"}`;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute(
        "aria-label",
        tile === "#"
          ? "壁"
          : tile === "S"
            ? "スタート地点"
            : tile === "G"
              ? "ゴール"
              : "通路",
      );

      if (tile === "S") {
        cell.classList.add("start");
        const startMarker = document.createElement("span");
        startMarker.className = "start-marker";
        startMarker.textContent = "START";
        startMarker.setAttribute("aria-hidden", "true");
        cell.append(startMarker);
      }
      if (tile === "G") {
        cell.classList.add("goal");
        const goalMarker = document.createElement("span");
        goalMarker.className = "goal-marker";
        goalMarker.textContent = "GOAL";
        goalMarker.setAttribute("aria-hidden", "true");
        cell.append(goalMarker);
      }
      if (row === player.row && column === player.column) {
        cell.classList.add("player");
        cell.setAttribute(
          "aria-label",
          tile === "S"
            ? "プレイヤー（スタート地点）"
            : tile === "G"
              ? "プレイヤー（ゴール）"
              : "プレイヤー",
        );
      }
      if (tile !== "#" && (row < player.row || (row === player.row && column <= player.column))) {
        cell.classList.add("visited");
      }
      mazeElement.append(cell);
    });
  });
}

function move(direction) {
  if (gameState !== "playing" || won) return;
  const offsets = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1],
  };
  const [rowOffset, columnOffset] = offsets[direction];
  const nextRow = player.row + rowOffset;
  const nextColumn = player.column + columnOffset;
  const nextTile = mazeLayout[nextRow]?.[nextColumn];

  if (nextTile === undefined || nextTile === "#") {
    statusElement.textContent = "そこには進めないよ";
    return;
  }

  player = { row: nextRow, column: nextColumn };
  moves += 1;
  const coordinate = getCoordinate(player);
  addLog(
    `${getMazeName()}：座標 (${coordinate.x}, ${coordinate.y}) / 経過時間 ${formatLogTime(
      performance.now() - startedAt,
    )}`,
  );
  if (player.row === goal.row && player.column === goal.column) {
    won = true;
    gameState = "won";
    clearInterval(elapsedTimer);
    timerElement.textContent = formatTime(performance.now() - startedAt);
    statusElement.textContent = "クリア！ゴールしました";
    addLog(
      `${getMazeName()}ゴール（タイム ${formatLogTime(performance.now() - startedAt)} / 移動回数 ${moves}回）`,
    );
    document.body.classList.add("won");
    nextStageButton.hidden = stageIndex === mazeLayouts.length - 1;
    if (stageIndex === mazeLayouts.length - 1) {
      statusElement.textContent = "全ステージクリア！";
      startSurvey();
    }
  } else {
    statusElement.textContent = "いい調子、そのまま進もう";
  }
  renderMaze();
}

function startGame() {
  if (gameState !== "ready") return;

  gameState = "countdown";
  startButton.disabled = true;
  setControlsDisabled(true);
  let count = 3;
  countdownElement.textContent = count;
  statusElement.textContent = `スタートまで ${count}`;
  countdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      countdownElement.textContent = count;
      statusElement.textContent = `スタートまで ${count}`;
      return;
    }

    clearInterval(countdownTimer);
    gameState = "playing";
    startedAt = performance.now();
    addLog(`${getMazeName()}スタート`);
    mazeElement.classList.remove("is-hidden");
    mazeOverlay.classList.add("is-playing");
    countdownElement.textContent = "";
    setControlsDisabled(false);
    statusElement.textContent = "スタート！ゴールを目指そう";
    elapsedTimer = setInterval(updateTimer, 10);
  }, 1000);
}

function nextStage() {
  if (gameState !== "won" || stageIndex >= mazeLayouts.length - 1) return;
  stopTimers();
  loadStage(stageIndex + 1);
  moves = 0;
  won = false;
  gameState = "ready";
  startedAt = undefined;
  timerElement.textContent = "0.00";
  countdownElement.textContent = "";
  statusElement.textContent = "スタートを押してゲーム開始";
  document.body.classList.remove("won");
  mazeElement.classList.add("is-hidden");
  mazeOverlay.classList.remove("is-playing");
  startButton.disabled = false;
  nextStageButton.hidden = true;
  setControlsDisabled(true);
  renderMaze();
}

document.addEventListener("keydown", (event) => {
  const keys = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  const direction = keys[event.key];
  if (event.target instanceof HTMLTextAreaElement) return;
  if (direction) {
    event.preventDefault();
    move(direction);
  }
});

controls.forEach((button) => {
  button.addEventListener("click", () => move(button.dataset.direction));
});
startButton.addEventListener("click", startGame);
nextStageButton.addEventListener("click", nextStage);
surveyForm.addEventListener("submit", finishSurvey);
copyLogButton.addEventListener("click", copyLogs);

shuffleStages();
loadStage(0);
setControlsDisabled(true);
renderMaze();
