(function () {
  const numbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const storageKey = "darts-scorer-state-v2";

  const el = {
    setupPage: document.getElementById("setupPage"),
    gamePage: document.getElementById("gamePage"),
    boardFrame: document.querySelector(".board-frame"),
    boardSegments: document.getElementById("boardSegments"),
    boardLabels: document.getElementById("boardLabels"),
    hitMarkerLayer: document.getElementById("hitMarkerLayer"),
    scoreFlash: document.getElementById("scoreFlash"),
    boardStatusMeta: document.getElementById("boardStatusMeta"),
    boardStatusPlayer: document.getElementById("boardStatusPlayer"),
    boardStatusTurn: document.getElementById("boardStatusTurn"),
    boardNextLegBtn: document.getElementById("boardNextLegBtn"),
    boardCheckoutHint: document.getElementById("boardCheckoutHint"),
    matchCompleteActions: document.getElementById("matchCompleteActions"),
    scorecards: document.getElementById("scorecards"),
    currentPlayer: document.getElementById("currentPlayer"),
    turnTotal: document.getElementById("turnTotal"),
    dartList: document.getElementById("dartList"),
    statusLine: document.getElementById("statusLine"),
    checkoutHint: document.getElementById("checkoutHint"),
    historyList: document.getElementById("historyList"),
    matchSummary: document.getElementById("matchSummary"),
    formatHint: document.getElementById("formatHint"),
    hapticsHint: document.getElementById("hapticsHint"),
    startScore: document.getElementById("startScore"),
    targetLegs: document.getElementById("targetLegs"),
    finishRule: document.getElementById("finishRule"),
    playerList: document.getElementById("playerList"),
    matchLogList: document.getElementById("matchLogList"),
    playerStatsList: document.getElementById("playerStatsList"),
    addPlayerBtn: document.getElementById("addPlayerBtn"),
    startMatchBtn: document.getElementById("startMatchBtn"),
    nextLegBtn: document.getElementById("nextLegBtn"),
    rematchBtn: document.getElementById("rematchBtn"),
    backToSetupBtn: document.getElementById("backToSetupBtn"),
    manualScore: document.getElementById("manualScore"),
    addManualBtn: document.getElementById("addManualBtn"),
    undoDartBtn: document.getElementById("undoDartBtn"),
    clearTurnBtn: document.getElementById("clearTurnBtn"),
    missBtn: document.getElementById("missBtn"),
    submitTurnBtn: document.getElementById("submitTurnBtn"),
    undoBtn: document.getElementById("undoBtn"),
    resetBtn: document.getElementById("resetBtn"),
    tabRules: document.getElementById("tabRules"),
    tabHistory: document.getElementById("tabHistory"),
    rulesView: document.getElementById("rulesView"),
    historyView: document.getElementById("historyView")
  };

  const defaultState = {
    startScore: 501,
    targetLegs: 1,
    finishRule: "double",
    matchStarted: false,
    legNumber: 1,
    startingPlayer: 0,
    currentPlayer: 0,
    currentDarts: [],
    history: [],
    matchArchive: [],
    legWinner: null,
    matchWinner: null,
    players: [
      createPlayer("Player 1", 501),
      createPlayer("Player 2", 501)
    ]
  };

  let state = loadState();
  let flashTimer = null;
  let feedbackTimer = null;
  let markerTimer = null;

  function createPlayer(name, score) {
    return { name, score, legsWon: 0, darts: 0, turns: [] };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && Array.isArray(saved.players) && saved.players.length >= 2) {
        return normalizeState(saved);
      }
    } catch (error) {
      localStorage.removeItem(storageKey);
    }
    return clone(defaultState);
  }

  function normalizeState(saved) {
    const startScore = Number(saved.startScore) || 501;
    return {
      ...clone(defaultState),
      ...saved,
      startScore,
      targetLegs: clampNumber(Number(saved.targetLegs) || 1, 1, 7),
      currentPlayer: clampNumber(Number(saved.currentPlayer) || 0, 0, saved.players.length - 1),
      startingPlayer: clampNumber(Number(saved.startingPlayer) || 0, 0, saved.players.length - 1),
      players: saved.players.map((player, index) => ({
        name: cleanName(player.name, `Player ${index + 1}`),
        score: Number.isFinite(Number(player.score)) ? Number(player.score) : startScore,
        legsWon: Number(player.legsWon) || 0,
        darts: Number(player.darts) || 0,
        turns: Array.isArray(player.turns) ? player.turns : []
      })),
      currentDarts: Array.isArray(saved.currentDarts) ? saved.currentDarts : [],
      history: Array.isArray(saved.history) ? saved.history : [],
      matchArchive: Array.isArray(saved.matchArchive) ? saved.matchArchive : [],
      legWinner: saved.legWinner ?? null,
      matchWinner: saved.matchWinner ?? null,
      matchStarted: Boolean(saved.matchStarted)
    };
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function polar(radius, angleDeg) {
    const angle = (angleDeg - 90) * Math.PI / 180;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }

  function ringPath(innerRadius, outerRadius, startAngle, endAngle) {
    const outerStart = polar(outerRadius, startAngle);
    const outerEnd = polar(outerRadius, endAngle);
    const innerEnd = polar(innerRadius, endAngle);
    const innerStart = polar(innerRadius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${outerStart.x.toFixed(3)} ${outerStart.y.toFixed(3)}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(3)} ${outerEnd.y.toFixed(3)}`,
      `L ${innerEnd.x.toFixed(3)} ${innerEnd.y.toFixed(3)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(3)} ${innerStart.y.toFixed(3)}`,
      "Z"
    ].join(" ");
  }

  function createSegment(pathData, cssClass, dart) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("class", `segment ${cssClass}`);
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-label", dart.label);
    path.addEventListener("click", (event) => addDart(dart, event));
    path.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        addDart(dart);
      }
    });
    el.boardSegments.appendChild(path);
  }

  function buildBoard() {
    el.boardSegments.innerHTML = "";
    el.boardLabels.innerHTML = "";
    addMissTarget();
    const rings = [
      { type: "double", inner: 220, outer: 244, multiplier: 2 },
      { type: "outer-single", inner: 158, outer: 220, multiplier: 1 },
      { type: "triple", inner: 130, outer: 158, multiplier: 3 },
      { type: "inner-single", inner: 34, outer: 130, multiplier: 1 }
    ];

    numbers.forEach((number, index) => {
      const start = index * 18 - 9;
      const end = start + 18;
      const middle = start + 9;
      const isEven = index % 2 === 0;
      rings.forEach((ring) => {
        let cssClass = isEven ? "single-dark" : "single-light";
        if (ring.type === "double" || ring.type === "triple") {
          cssClass = isEven ? "double-triple-red" : "double-triple-green";
        }
        createSegment(ringPath(ring.inner, ring.outer, start, end), cssClass, {
          value: number * ring.multiplier,
          multiplier: ring.multiplier,
          number,
          label: labelForDart(ring.multiplier, number)
        });
      });
      addNumberLabel(number, middle);
    });

    addCircleSegment(34, "bull-outer", { value: 25, multiplier: 1, number: 25, label: "Outer bull, 25" });
    addCircleSegment(16, "bull-inner", { value: 50, multiplier: 2, number: 25, label: "Bullseye, 50" });
  }

  function addMissTarget() {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "-280");
    rect.setAttribute("y", "-280");
    rect.setAttribute("width", "560");
    rect.setAttribute("height", "560");
    rect.setAttribute("class", "miss-target");
    rect.setAttribute("role", "button");
    rect.setAttribute("tabindex", "0");
    rect.setAttribute("aria-label", "Miss");
    rect.addEventListener("click", (event) => addDart({ value: 0, multiplier: 0, number: 0, label: "Miss" }, event));
    rect.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        addDart({ value: 0, multiplier: 0, number: 0, label: "Miss" });
      }
    });
    el.boardSegments.appendChild(rect);
  }

  function addNumberLabel(number, angle) {
    const position = polar(196, angle);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", position.x.toFixed(3));
    text.setAttribute("y", position.y.toFixed(3));
    text.setAttribute("class", "board-number");
    text.textContent = String(number);
    el.boardLabels.appendChild(text);
  }

  function addCircleSegment(radius, cssClass, dart) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", radius);
    circle.setAttribute("class", `segment ${cssClass}`);
    circle.setAttribute("tabindex", "0");
    circle.setAttribute("role", "button");
    circle.setAttribute("aria-label", dart.label);
    circle.addEventListener("click", (event) => addDart(dart, event));
    circle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        addDart(dart);
      }
    });
    el.boardSegments.appendChild(circle);
  }

  function labelForDart(multiplier, number) {
    if (multiplier === 1) return `Single ${number}, ${number}`;
    if (multiplier === 2) return `Double ${number}, ${number * 2}`;
    return `Triple ${number}, ${number * 3}`;
  }

  function canScore() {
    return state.matchStarted && state.legWinner === null && state.matchWinner === null;
  }

  function addDart(dart, event) {
    clearStatus();
    if (!canScore()) {
      setStatus(state.matchStarted ? "Start the next leg to continue." : "Start the match first.");
      return;
    }
    if (state.currentDarts.length >= 3) {
      setStatus("Submit or clear this turn before adding another dart.");
      return;
    }
    state.currentDarts.push(dart);
    vibrate(35);
    flashDart(dart, event);
    if (shouldAutoSubmitTurn()) {
      submitTurn();
      return;
    }
    saveAndRender();
  }

  function shouldAutoSubmitTurn() {
    const player = state.players[state.currentPlayer];
    const turnScore = state.currentDarts.reduce((sum, currentDart) => sum + currentDart.value, 0);
    const remaining = player.score - turnScore;
    const lastDart = state.currentDarts[state.currentDarts.length - 1];
    return state.currentDarts.length === 3 || remaining === 0 || isBust(remaining, lastDart);
  }

  function addManualScore() {
    const value = Number(el.manualScore.value);
    if (!Number.isInteger(value) || value < 0 || value > 180) {
      setStatus("Enter a score from 0 to 180.");
      return;
    }
    addDart({ value, multiplier: 0, number: value, label: `Manual ${value}` });
    el.manualScore.value = "";
  }

  function submitTurn() {
    clearStatus();
    if (!canScore()) {
      setStatus(state.matchStarted ? "Start the next leg to continue." : "Start the match first.");
      return;
    }
    if (state.currentDarts.length === 0) {
      setStatus("Add at least one dart before submitting.");
      return;
    }

    const player = state.players[state.currentPlayer];
    const turnScore = state.currentDarts.reduce((sum, dart) => sum + dart.value, 0);
    const remaining = player.score - turnScore;
    const lastDart = state.currentDarts[state.currentDarts.length - 1];
    const bust = isBust(remaining, lastDart);
    const nextScore = bust ? player.score : remaining;
    const turn = {
      playerIndex: state.currentPlayer,
      playerName: player.name,
      legNumber: state.legNumber,
      darts: clone(state.currentDarts),
      score: turnScore,
      from: player.score,
      to: nextScore,
      bust,
      legWon: false,
      matchWon: false
    };

    player.score = nextScore;
    player.darts += state.currentDarts.length;
    player.turns.push(turn);

    if (!bust && nextScore === 0) {
      vibrate([70, 35, 110]);
      player.legsWon += 1;
      turn.legWon = true;
      state.legWinner = state.currentPlayer;
      if (player.legsWon >= state.targetLegs) {
        turn.matchWon = true;
        state.matchWinner = state.currentPlayer;
        turn.matchRecordId = recordCompletedMatch(state.currentPlayer);
        setStatus(`${player.name} wins the match.`);
      } else {
        setStatus(`${player.name} wins leg ${state.legNumber}.`);
      }
    } else {
      if (bust) {
        vibrate([45, 35, 45]);
        playVisualFeedback("bust", state.currentPlayer);
      }
      state.currentPlayer = nextPlayerIndex(state.currentPlayer);
      setStatus(`Next: ${state.players[state.currentPlayer].name}`);
    }

    state.history.unshift(turn);
    state.currentDarts = [];
    saveAndRender();
  }

  function isBust(remaining, lastDart) {
    if (remaining < 0) return true;
    if (state.finishRule === "single") return false;
    if (remaining === 1) return true;
    if (remaining === 0) return !(lastDart.multiplier === 2);
    return false;
  }

  function nextPlayerIndex(index) {
    return (index + 1) % state.players.length;
  }

  function clearTurn() {
    state.currentDarts = [];
    saveAndRender();
  }

  function undoLastDart() {
    clearStatus();
    if (state.currentDarts.length > 0) {
      const undone = state.currentDarts.pop();
      vibrate(25);
      flashMessage(`Undone: ${shortDartLabel(undone)}`);
      saveAndRender();
      return;
    }

    const last = state.history.shift();
    if (!last) {
      setStatus("No dart to undo.");
      return;
    }
    const undone = last.darts[last.darts.length - 1];
    restoreTurn(last, true);
    vibrate(25);
    flashMessage(`Undone: ${shortDartLabel(undone)}`);
    saveAndRender();
  }

  function flashDart(dart, event) {
    showFlash(`${shortDartLabel(dart)} · ${dart.value}`, 1800, event);
    showHitMarker(dart, event);
  }

  function flashMessage(message) {
    showFlash(message, 1150);
  }

  function showFlash(message, duration, event) {
    window.clearTimeout(flashTimer);
    el.scoreFlash.textContent = message;
    el.scoreFlash.style.setProperty("--flash-duration", `${duration}ms`);
    positionFlash(event);
    el.scoreFlash.classList.remove("show");
    void el.scoreFlash.offsetWidth;
    el.scoreFlash.classList.add("show");
    flashTimer = window.setTimeout(() => {
      el.scoreFlash.classList.remove("show");
    }, duration);
  }

  function positionFlash(event) {
    if (!event) {
      el.scoreFlash.style.left = "50%";
      el.scoreFlash.style.top = "50%";
      return;
    }

    const frame = el.boardFrame.getBoundingClientRect();
    const x = clampNumber(event.clientX - frame.left + 46, 74, frame.width - 74);
    const y = clampNumber(event.clientY - frame.top - 48, 34, frame.height - 34);
    el.scoreFlash.style.left = `${x}px`;
    el.scoreFlash.style.top = `${y}px`;
  }

  function playVisualFeedback(type, playerIndex) {
    window.clearTimeout(feedbackTimer);
    el.boardFrame.classList.remove("feedback-bust");
    document.querySelectorAll(".scorecard.feedback-bust").forEach((card) => {
      card.classList.remove("feedback-bust");
    });

    void el.boardFrame.offsetWidth;
    el.boardFrame.classList.add(`feedback-${type}`);

    const card = el.scorecards.querySelector(`[data-player-index="${playerIndex}"]`);
    if (card && type !== "hit") {
      card.classList.add(`feedback-${type}`);
    }

    feedbackTimer = window.setTimeout(() => {
      el.boardFrame.classList.remove("feedback-bust");
      if (card) card.classList.remove("feedback-bust");
    }, 650);
  }

  function showHitMarker(dart, event) {
    window.clearTimeout(markerTimer);
    el.hitMarkerLayer.innerHTML = "";
    if (!event) return;

    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const position = svgPointFromEvent(event);
    marker.setAttribute("cx", position.x.toFixed(3));
    marker.setAttribute("cy", position.y.toFixed(3));
    marker.setAttribute("r", "16");
    marker.setAttribute("class", "hit-marker");
    el.hitMarkerLayer.appendChild(marker);

    markerTimer = window.setTimeout(() => {
      el.hitMarkerLayer.innerHTML = "";
    }, 1400);
  }

  function svgPointFromEvent(event) {
    const svg = event.currentTarget.ownerSVGElement;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }

  function undoLastTurn() {
    clearStatus();
    const last = state.history.shift();
    if (!last) {
      setStatus("No completed turn to undo.");
      return;
    }
    restoreTurn(last, false);
    saveAndRender();
  }

  function restoreTurn(turn, keepPreviousDarts) {
    const player = state.players[turn.playerIndex];
    player.score = turn.from;
    player.darts = Math.max(0, player.darts - turn.darts.length);
    player.turns.pop();
    if (turn.legWon) {
      player.legsWon = Math.max(0, player.legsWon - 1);
    }
    if (turn.matchRecordId) {
      state.matchArchive = state.matchArchive.filter((match) => match.id !== turn.matchRecordId);
    }
    state.currentPlayer = turn.playerIndex;
    state.currentDarts = keepPreviousDarts ? clone(turn.darts).slice(0, -1) : [];
    state.legWinner = null;
    state.matchWinner = null;
  }

  function addPlayer() {
    if (state.matchStarted) return;
    state.players.push(createPlayer(`Player ${state.players.length + 1}`, state.startScore));
    saveAndRender();
  }

  function removePlayer(index) {
    if (state.matchStarted || state.players.length <= 2) return;
    state.players.splice(index, 1);
    state.currentPlayer = 0;
    state.startingPlayer = 0;
    saveAndRender();
  }

  function updatePlayerName(index, value) {
    if (state.matchStarted) return;
    state.players[index].name = cleanName(value, `Player ${index + 1}`);
    saveState();
  }

  function updateSettings() {
    if (state.matchStarted) {
      render();
      return;
    }
    state.startScore = Number(el.startScore.value);
    state.targetLegs = Number(el.targetLegs.value);
    state.finishRule = el.finishRule.value;
    state.players.forEach((player) => {
      player.score = state.startScore;
      player.darts = 0;
      player.turns = [];
      player.legsWon = 0;
    });
    state.history = [];
    state.currentDarts = [];
    state.currentPlayer = 0;
    state.startingPlayer = 0;
    state.legNumber = 1;
    state.legWinner = null;
    state.matchWinner = null;
    saveAndRender();
  }

  function startMatch() {
    if (state.players.length < 2) {
      setStatus("Add at least two players.");
      return;
    }
    state.startScore = Number(el.startScore.value);
    state.targetLegs = Number(el.targetLegs.value);
    state.finishRule = el.finishRule.value;
    state.matchStarted = true;
    state.legNumber = 1;
    state.startingPlayer = 0;
    state.currentPlayer = 0;
    state.currentDarts = [];
    state.history = [];
    state.legWinner = null;
    state.matchWinner = null;
    state.players = state.players.map((player, index) => createPlayer(cleanName(player.name, `Player ${index + 1}`), state.startScore));
    setStatus(`First throw: ${state.players[0].name}`);
    saveAndRender();
  }

  function rematch() {
    const names = state.players.map((player, index) => cleanName(player.name, `Player ${index + 1}`));
    state.matchStarted = true;
    state.legNumber = 1;
    state.startingPlayer = 0;
    state.currentPlayer = 0;
    state.currentDarts = [];
    state.history = [];
    state.legWinner = null;
    state.matchWinner = null;
    state.players = names.map((name) => createPlayer(name, state.startScore));
    setStatus(`First throw: ${state.players[0].name}`);
    saveAndRender();
  }

  function backToSetup() {
    const names = state.players.map((player, index) => cleanName(player.name, `Player ${index + 1}`));
    const archive = clone(state.matchArchive);
    state = clone(defaultState);
    state.startScore = Number(el.startScore.value) || 501;
    state.targetLegs = Number(el.targetLegs.value) || 1;
    state.finishRule = el.finishRule.value || "double";
    state.players = names.map((name) => createPlayer(name, state.startScore));
    state.matchArchive = archive;
    saveAndRender();
  }

  function recordCompletedMatch(winnerIndex) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const winner = state.players[winnerIndex];
    state.matchArchive.unshift({
      id,
      completedAt: new Date().toISOString(),
      startScore: state.startScore,
      targetLegs: state.targetLegs,
      finishRule: state.finishRule,
      winnerName: winner.name,
      players: state.players.map((player) => ({
        name: player.name,
        legsWon: player.legsWon,
        darts: player.darts
      }))
    });
    state.matchArchive = state.matchArchive.slice(0, 20);
    return id;
  }

  function nextLeg() {
    if (state.legWinner === null || state.matchWinner !== null) return;
    state.legNumber += 1;
    state.startingPlayer = nextPlayerIndex(state.startingPlayer);
    state.currentPlayer = state.startingPlayer;
    state.currentDarts = [];
    state.legWinner = null;
    state.players.forEach((player) => {
      player.score = state.startScore;
      player.darts = 0;
      player.turns = [];
    });
    setStatus(`Leg ${state.legNumber}: ${state.players[state.currentPlayer].name} starts.`);
    saveAndRender();
  }

  function resetMatch() {
    const archive = clone(state.matchArchive);
    const names = state.players.map((player, index) => cleanName(player.name, `Player ${index + 1}`));
    state = clone(defaultState);
    state.startScore = Number(el.startScore.value);
    state.targetLegs = Number(el.targetLegs.value);
    state.finishRule = el.finishRule.value;
    state.players = names.map((name) => createPlayer(name, state.startScore));
    state.matchArchive = archive;
    saveAndRender();
  }

  function cleanName(value, fallback) {
    return String(value || "").trim() || fallback;
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function saveAndRender(shouldSave = true) {
    if (shouldSave) saveState();
    render();
  }

  function render() {
    const active = state.players[state.currentPlayer] || state.players[0];
    const setupLocked = state.matchStarted;
    const scoringLocked = !canScore();

    el.setupPage.classList.toggle("hidden", state.matchStarted);
    el.gamePage.classList.toggle("hidden", !state.matchStarted);
    el.matchSummary.textContent = `${state.startScore} · ${formatText()}`;
    el.formatHint.textContent = formatText();
    el.hapticsHint.textContent = hasHaptics() ? "Available" : "Not supported";
    el.startScore.value = String(state.startScore);
    el.targetLegs.value = String(state.targetLegs);
    el.finishRule.value = state.finishRule;
    el.startScore.disabled = setupLocked;
    el.targetLegs.disabled = setupLocked;
    el.finishRule.disabled = setupLocked;
    el.addPlayerBtn.disabled = setupLocked;
    el.startMatchBtn.textContent = "Start match";
    el.nextLegBtn.disabled = state.legWinner === null || state.matchWinner !== null;
    el.boardNextLegBtn.disabled = state.legWinner === null || state.matchWinner !== null;
    el.boardNextLegBtn.classList.toggle("hidden", state.legWinner === null || state.matchWinner !== null);
    el.matchCompleteActions.classList.toggle("hidden", state.matchWinner === null);

    renderPlayerManager(setupLocked);
    renderScorecards();
    renderMatchLog();
    renderPlayerStats();

    el.currentPlayer.textContent = currentPlayerText();
    const turnTotal = state.currentDarts.reduce((sum, dart) => sum + dart.value, 0);
    const checkoutHint = checkoutFor(active.score, state.finishRule);
    el.turnTotal.textContent = String(turnTotal);
    el.boardStatusMeta.textContent = boardStatusMetaText();
    el.boardStatusPlayer.textContent = currentPlayerText();
    el.boardStatusTurn.textContent = `Turn ${turnTotal}`;
    el.boardCheckoutHint.textContent = checkoutHint;
    el.submitTurnBtn.disabled = scoringLocked || state.currentDarts.length === 0;
    el.undoDartBtn.disabled = state.currentDarts.length === 0 && state.history.length === 0;
    el.missBtn.disabled = scoringLocked || state.currentDarts.length >= 3;
    el.addManualBtn.disabled = scoringLocked || state.currentDarts.length >= 3;
    el.manualScore.disabled = scoringLocked;

    el.dartList.innerHTML = "";
    for (let index = 0; index < 3; index += 1) {
      const dart = state.currentDarts[index];
      const chip = document.createElement("div");
      chip.className = `dart-chip${dart ? " filled" : ""}`;
      chip.textContent = dart ? shortDartLabel(dart) : `Dart ${index + 1}`;
      el.dartList.appendChild(chip);
    }

    el.checkoutHint.textContent = checkoutHint;
    renderHistory();
    saveState();
  }

  function renderPlayerManager(setupLocked) {
    el.playerList.innerHTML = "";
    state.players.forEach((player, index) => {
      const row = document.createElement("div");
      row.className = "player-row";

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 18;
      input.value = player.name;
      input.disabled = setupLocked;
      input.setAttribute("aria-label", `Player ${index + 1} name`);
      input.addEventListener("input", () => updatePlayerName(index, input.value));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.disabled = setupLocked || state.players.length <= 2;
      remove.addEventListener("click", () => removePlayer(index));

      row.append(input, remove);
      el.playerList.appendChild(row);
    });
  }

  function renderScorecards() {
    el.scorecards.innerHTML = "";
    state.players.forEach((player, index) => {
      const card = document.createElement("article");
      card.className = `scorecard${index === state.currentPlayer && canScore() ? " active" : ""}`;
      card.dataset.playerIndex = String(index);
      const average = player.darts ? ((state.startScore - player.score) / player.darts * 3).toFixed(1) : "0.0";
      card.innerHTML = `
        <div>
          <h3>${escapeHtml(player.name)}</h3>
          <p>${player.legsWon}/${state.targetLegs} legs · ${player.darts} darts · ${average} avg</p>
        </div>
        <div class="score">${player.score}</div>
      `;
      el.scorecards.appendChild(card);
    });
  }

  function renderMatchLog() {
    el.matchLogList.innerHTML = "";
    if (state.matchArchive.length === 0) {
      const item = document.createElement("li");
      item.textContent = "No completed matches yet.";
      el.matchLogList.appendChild(item);
      return;
    }

    state.matchArchive.forEach((match) => {
      const item = document.createElement("li");
      const date = new Date(match.completedAt);
      const score = match.players.map((player) => `${escapeHtml(player.name)} ${player.legsWon}`).join(" · ");
      item.innerHTML = `<strong>${escapeHtml(match.winnerName)}</strong> won ${match.startScore}, first to ${match.targetLegs}<br><span>${score} · ${date.toLocaleDateString()}</span>`;
      el.matchLogList.appendChild(item);
    });
  }

  function renderPlayerStats() {
    const stats = playerStats();
    el.playerStatsList.innerHTML = "";
    if (stats.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "Stats appear after completed matches.";
      el.playerStatsList.appendChild(empty);
      return;
    }

    stats.forEach((player) => {
      const row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML = `
        <strong>${escapeHtml(player.name)}</strong>
        <span>${player.wins}/${player.played} matches · ${player.legsWon} legs · ${player.winRate}%</span>
      `;
      el.playerStatsList.appendChild(row);
    });
  }

  function playerStats() {
    const totals = new Map();
    state.matchArchive.forEach((match) => {
      match.players.forEach((player) => {
        const current = totals.get(player.name) || { name: player.name, played: 0, wins: 0, legsWon: 0 };
        current.played += 1;
        current.legsWon += Number(player.legsWon) || 0;
        if (player.name === match.winnerName) current.wins += 1;
        totals.set(player.name, current);
      });
    });
    return Array.from(totals.values())
      .map((player) => ({
        ...player,
        winRate: Math.round(player.wins / player.played * 100)
      }))
      .sort((a, b) => b.wins - a.wins || b.legsWon - a.legsWon || a.name.localeCompare(b.name));
  }

  function currentPlayerText() {
    if (!state.matchStarted) return "Set up players";
    if (state.matchWinner !== null) return `${state.players[state.matchWinner].name} won match`;
    if (state.legWinner !== null) return `${state.players[state.legWinner].name} won leg`;
    return `${state.players[state.currentPlayer].name} · Leg ${state.legNumber}`;
  }

  function boardStatusMetaText() {
    if (!state.matchStarted) return "Match setup";
    if (state.matchWinner !== null) return "Match complete";
    if (state.legWinner !== null) return `Leg ${state.legNumber} complete`;
    return `Leg ${state.legNumber} · ${state.startScore}`;
  }

  function formatText() {
    return `First to ${state.targetLegs} · Best of ${state.targetLegs * 2 - 1}`;
  }

  function renderHistory() {
    el.historyList.innerHTML = "";
    if (state.history.length === 0) {
      const item = document.createElement("li");
      item.textContent = "No turns yet.";
      el.historyList.appendChild(item);
      return;
    }
    state.history.forEach((turn) => {
      const item = document.createElement("li");
      const result = turn.legWon ? "won the leg with" : turn.bust ? "busted" : "scored";
      item.innerHTML = `<strong>${escapeHtml(turn.playerName)}</strong> ${result} ${turn.score} (${turn.from} to ${turn.to})`;
      el.historyList.appendChild(item);
    });
  }

  function shortDartLabel(dart) {
    if (dart.label.startsWith("Manual")) return dart.label;
    if (dart.value === 25) return "Bull 25";
    if (dart.value === 50 && dart.number === 25) return "Bull 50";
    const prefix = dart.multiplier === 3 ? "T" : dart.multiplier === 2 ? "D" : "S";
    return `${prefix}${dart.number}`;
  }

  function checkoutFor(score, finishRule) {
    if (score <= 0) return "Leg complete";
    if (finishRule === "single") return score <= 180 ? String(score) : "No finish yet";
    return doubleOutCheckout(score) || "No finish yet";
  }

  function doubleOutCheckout(score) {
    if (score > 170 || score < 2 || [169, 168, 166, 165, 163, 162, 159].includes(score)) return "";
    const scoringTargets = dartTargets(false);
    const finishingTargets = dartTargets(true);

    for (const finish of finishingTargets) {
      if (finish.value === score) return finish.label;
    }
    for (const first of scoringTargets) {
      for (const finish of finishingTargets) {
        if (first.value + finish.value === score) return `${first.label} ${finish.label}`;
      }
    }
    for (const first of scoringTargets) {
      for (const second of scoringTargets) {
        for (const finish of finishingTargets) {
          if (first.value + second.value + finish.value === score) {
            return `${first.label} ${second.label} ${finish.label}`;
          }
        }
      }
    }
    return "";
  }

  function dartTargets(finishesOnly) {
    const singles = numbers.map((number) => ({ label: String(number), value: number }));
    const doubles = numbers.map((number) => ({ label: `D${number}`, value: number * 2 }));
    const triples = numbers.map((number) => ({ label: `T${number}`, value: number * 3 }));
    const bulls = finishesOnly
      ? [{ label: "Bull", value: 50 }]
      : [{ label: "25", value: 25 }, { label: "Bull", value: 50 }];
    return finishesOnly ? [...doubles, ...bulls] : [...triples, ...doubles, ...singles, ...bulls];
  }

  function vibrate(pattern) {
    if (!hasHaptics()) return false;
    return navigator.vibrate(pattern);
  }

  function hasHaptics() {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }

  function setStatus(message) {
    el.statusLine.textContent = message;
  }

  function clearStatus() {
    el.statusLine.textContent = "";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function showTab(tab) {
    const isRules = tab === "rules";
    el.tabRules.classList.toggle("active", isRules);
    el.tabHistory.classList.toggle("active", !isRules);
    el.tabRules.setAttribute("aria-selected", String(isRules));
    el.tabHistory.setAttribute("aria-selected", String(!isRules));
    el.rulesView.classList.toggle("hidden", !isRules);
    el.historyView.classList.toggle("hidden", isRules);
  }

  el.addManualBtn.addEventListener("click", addManualScore);
  el.manualScore.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addManualScore();
  });
  el.clearTurnBtn.addEventListener("click", clearTurn);
  el.undoDartBtn.addEventListener("click", undoLastDart);
  el.scoreFlash.addEventListener("click", undoLastDart);
  el.missBtn.addEventListener("click", () => addDart({ value: 0, multiplier: 0, number: 0, label: "Miss" }));
  el.submitTurnBtn.addEventListener("click", submitTurn);
  el.undoBtn.addEventListener("click", undoLastTurn);
  el.resetBtn.addEventListener("click", resetMatch);
  el.addPlayerBtn.addEventListener("click", addPlayer);
  el.startMatchBtn.addEventListener("click", startMatch);
  el.nextLegBtn.addEventListener("click", nextLeg);
  el.boardNextLegBtn.addEventListener("click", nextLeg);
  el.rematchBtn.addEventListener("click", rematch);
  el.backToSetupBtn.addEventListener("click", backToSetup);
  el.startScore.addEventListener("change", updateSettings);
  el.targetLegs.addEventListener("change", updateSettings);
  el.finishRule.addEventListener("change", updateSettings);
  el.tabRules.addEventListener("click", () => showTab("rules"));
  el.tabHistory.addEventListener("click", () => showTab("history"));

  buildBoard();
  render();
}());
