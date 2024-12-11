class GameUI {
  constructor() {
    // 内部数据
    this._data = {
      score: 0,
      isPaused: false,
      shootingAbilityTime: 0,
      speedAbilityTime: 0,
    };
    // 事件系统
    this.events = {
      emits: {},
      emit: (event, data) => {
        if (this.events.emits[event]) {
          this.events.emits[event](data);
        }
      },
      on: (event, callback) => {
        this.events.emits[event] = callback;
      },
      off: (event) => {
        delete this.events.emits[event];
      },
    };
    // 创建UI容器
    const uiContainer = document.createElement("div");
    uiContainer.className = "game-ui-container";
    this.dom = document.createElement("div");
    this.dom.id = "game-ui";
    uiContainer.appendChild(this.dom);
    document.body.appendChild(uiContainer);

    // 创建得分UI
    const { dom: scoreUI, updateScore } = this._createScoreUI();
    this.updateScore = updateScore;
    this.dom.appendChild(scoreUI);

    // 创建能力UI容器
    const { dom: abilityUIContainer } = this._createAbilityUIContainer();
    this.dom.appendChild(abilityUIContainer);
    this.abilityUI = {
      shooting: null,
      speed: null,
    };

    // 监听ESC键
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.togglePause();
      }
    });
  }

  togglePause() {
    this._data.isPaused = !this._data.isPaused;
    if (this._data.isPaused) {
      this.showPauseUI();
      this.events.emit("onPause");
    } else {
      this.hidePauseUI();
      this.events.emit("onResume");
    }
  }

  showPauseUI() {
    const { dom } = this._createPauseUI();
    this.pauseUI = dom;
    this.dom.appendChild(dom);
  }

  hidePauseUI() {
    if (this.pauseUI) {
      this.dom.removeChild(this.pauseUI);
      this.pauseUI = null;
    }
  }

  showGameOver() {
    const restart = () => {
      const gameOverUI = this.dom.querySelector(".game-over-ui");
      if (gameOverUI) {
        this.dom.removeChild(gameOverUI);
      }
      this.events.emit("onRestart");
    };
    const { dom } = this._createGameOverUI(restart);
    this.dom.appendChild(dom);
  }

  updateAbilityTime(type, time) {
    const abilityUIContainer = this.dom.querySelector(
      ".abilities-ui-container"
    );
    if (time <= 0) {
      if (this.abilityUI[type]) {
        abilityUIContainer.removeChild(this.abilityUI[type].dom);
        this.abilityUI[type] = null;
      }
    } else {
      if (this.abilityUI[type]) {
        this.abilityUI[type].update(time);
      } else {
        const { dom, update } = this._createAbilityUI(type, time);
        abilityUIContainer.appendChild(dom);
        this.abilityUI[type] = {
          dom,
          update,
        };
      }
    }
  }

  _createScoreUI() {
    const html = `<div class="score-ui"><div class="score-label">得分: </div><div class="score-value">0</div></div>`;
    const dom = htmlStringToDOM(html);
    return {
      dom,
      updateScore: (score) => {
        this._data.score = score;
        dom.querySelector(".score-value").textContent = score;
      },
    };
  }

  _createPauseUI() {
    const html = `
      <div class="pause-ui">
        <div class="pause-content">
          <div class="pause-title">游戏暂停</div>
          <div class="pause-score">
            <div class="pause-score-label">当前得分: </div>
            <div class="pause-score-value">${this._data.score}</div>
          </div>
          <div class="pause-tip">按ESC继续游戏</div>
        </div>
      </div>`;
    const dom = htmlStringToDOM(html);
    return { dom };
  }

  _createGameOverUI(restart) {
    const html = `<div class="game-over-ui"><div class="game-over-tip">游戏结束</div><div class="game-over-score"><div class="game-over-score-label">最终得分: </div><div class="game-over-score-value">${this._data.score}</div></div><div class="game-over-restart">重新开始</div></div>`;
    const dom = htmlStringToDOM(html);
    const gameOverRestart = dom.querySelector(".game-over-restart");
    gameOverRestart.addEventListener("click", restart);
    return {
      dom,
    };
  }

  _createAbilityUIContainer() {
    const html = `<div class="abilities-ui-container"></div>`;
    const dom = htmlStringToDOM(html);
    return { dom };
  }

  _createAbilityUI(type, duration) {
    const iconClass = type === "shooting" ? "tm-dark" : "tm-electric";
    const html = `
      <div class="ability-ui ${type}">
        <div class="ability-icon ${iconClass}"></div>
        <div class="ability-cooldown"></div>
        <div class="ability-timer">${(duration / 1000).toFixed(1)}s</div>
      </div>
    `;
    const dom = htmlStringToDOM(html);
    const cooldown = dom.querySelector(".ability-cooldown");
    const timer = dom.querySelector(".ability-timer");

    let lastProgress = 0;
    let animationFrame = null;

    // 创建更新函数
    const update = (time) => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      const updateProgress = () => {
        const seconds = time / 1000;
        // 更新计时器文本
        timer.textContent = seconds.toFixed(1) + "s";

        // 更新冷却遮罩，使用requestAnimationFrame使动画更顺滑
        const targetProgress = ((duration - time) / duration) * 360;
        const step = (targetProgress - lastProgress) * 0.2;
        lastProgress += step;

        if (Math.abs(targetProgress - lastProgress) > 0.1) {
          cooldown.style.setProperty("--progress", lastProgress + "deg");
          animationFrame = requestAnimationFrame(updateProgress);
        } else {
          lastProgress = targetProgress;
          cooldown.style.setProperty("--progress", targetProgress + "deg");
        }
      };

      updateProgress();
    };

    return { dom, update };
  }
}

function htmlStringToDOM(htmlString) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlString.trim();
  return tempDiv.firstChild;
}

export default GameUI;
