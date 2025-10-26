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

// エンジンとワールド
const gameEngine = new GameEngine();
const gameState = new GameState();

// 衝突（ゴール）判定をGameEngineのイベントに接続
gameEngine.onCollision((event) => {
    for (const pair of event.pairs) {
        const puckBody = gameEngine.puck;
        if (pair.bodyA === puckBody || pair.bodyB === puckBody) {
            if (pair.bodyA === gameEngine.goals.top || pair.bodyB === gameEngine.goals.top) {
                // 青側（上）のゴールに入った場合は赤チーム（bottom）の得点
                gameState.score.top += 1;
                // 7点先取の判定
                if (gameState.score.top >= 7) {
                    io.emit("gameWin", { winner: "top" });
                    // スコアリセット
                    gameState.score.top = 0;
                    gameState.score.bottom = 0;
                }
                gameEngine.resetPuck();
            } else if (pair.bodyA === gameEngine.goals.bottom || pair.bodyB === gameEngine.goals.bottom) {
                // 赤側（下）のゴールに入った場合は青チーム（top）の得点
                gameState.score.bottom += 1;
                // 7点先取の判定
                if (gameState.score.bottom >= 7) {
                    io.emit("gameWin", { winner: "bottom" });
                    // スコアリセット
                    gameState.score.top = 0;
                    gameState.score.bottom = 0;
                }
                gameEngine.resetPuck();
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

    io.emit("state", {
        players: gameState.getPlayersState(),
        puck: { x: gameEngine.puck.position.x, y: gameEngine.puck.position.y },
        score: gameState.score
    });
}, 1000 / constants.FRAME_RATE);

server.listen(constants.PORT, () => {
    console.log(`Server running on port ${constants.PORT}`);
});