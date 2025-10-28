const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const constants = require("./game/constants");
const GameEngine = require("./game/gameEngine");
const GameState = require("./game/gameState");
const { registerHandlers } = require("./network/socketHandlers");

// サーバの公開
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });// 身内公開なら簡単にするため全許可

+// --- ここで client.html を返す ---
    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "../air_hockey_client.html"));
    });

// エンジンとワールド
const gameEngine = new GameEngine();
const gameState = new GameState();

// 衝突（ゴール）判定をGameEngineのイベントに接続
gameEngine.onCollision((event) => {
    for (const pair of event.pairs) {
        const puckBody = gameEngine.puck;
        if (pair.bodyA === puckBody || pair.bodyB === puckBody) {
            let goalType = null;
            if (pair.bodyA === gameEngine.goals.top || pair.bodyB === gameEngine.goals.top) {
                // 青側（上）のゴールに入った場合は赤チーム（bottom）の得点
                gameState.score.top += 1;
                goalType = "top";
                if (gameState.score.top >= 7) {
                    io.emit("gameWin", { winner: "top" });
                    gameState.score.top = 0;
                    gameState.score.bottom = 0;
                }
            } else if (pair.bodyA === gameEngine.goals.bottom || pair.bodyB === gameEngine.goals.bottom) {
                // 赤側（下）のゴールに入った場合は青チーム（top）の得点
                gameState.score.bottom += 1;
                goalType = "bottom";
                if (gameState.score.bottom >= 7) {
                    io.emit("gameWin", { winner: "bottom" });
                    gameState.score.top = 0;
                    gameState.score.bottom = 0;
                }
            }
            if (goalType) {
                // ゴール演出イベント送信
                io.emit("goalEffect", { goal: goalType });
                // パックを一定時間停止（演出中）
                if (typeof gameEngine.freezePuck === 'function') {
                    gameEngine.freezePuck(1200);
                } else {
                    // フォールバック: 直接リセット（差は小さいが演出中のちらつき防止のため）
                    setTimeout(() => gameEngine.resetPuck(), 1200);
                }
            }
        }
    }
});

// Socket handlers
registerHandlers(io, gameState, gameEngine);

// サーバのルートにアクセスしたら簡単なメッセージ
app.get("/", (req, res) => {
    res.send("AirHockey WebSocket Server is running");
});

// ループ（物理更新 + ブロードキャスト）
setInterval(() => {
    gameEngine.update();

    // チーム人数に応じて相手のゴール幅を計算
    const minGoal = 120;
    const maxGoal = 400;
    const topSize = gameState.getTeamSize("top");    // 青チーム人数
    const bottomSize = gameState.getTeamSize("bottom"); // 赤チーム人数

    // 青チームが増えると赤チームのゴール（bottom）が広がる
    const bottomGoalWidth = minGoal + (maxGoal - minGoal) * Math.min(topSize, 4) / 4;
    // 赤チームが増えると青チームのゴール（top）が広がる
    const topGoalWidth = minGoal + (maxGoal - minGoal) * Math.min(bottomSize, 4) / 4;

    // ゲームエンジン側のゴール幅を更新
    gameEngine.updateGoalWidths(topGoalWidth, bottomGoalWidth);

    // 全員に同じゴール幅を送信
    // ゴール演出中はクライアントにパックを送らない（非表示にするため）
    const puckPayload = gameEngine.puckFrozen ? null : { x: gameEngine.puck.position.x, y: gameEngine.puck.position.y };
    io.emit("state", {
        players: gameState.getPlayersState(),
        puck: puckPayload,
        score: gameState.score,
        goalWidth: { top: topGoalWidth, bottom: bottomGoalWidth }
    });
}, 1000 / 60); server.listen(constants.PORT, () => {
    console.log(`Server running on port ${constants.PORT}`);
});