const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // 身内公開なら簡単にするため全許可
});

const PORT = process.env.PORT || 3000;

const WIDTH = 600;  // フィールド幅
const HEIGHT = 400; // フィールド高さ
const PUCK_RADIUS = 10;  // パック半径
const PLAYER_RADIUS = 30; // マレットの大きさ

// パック状態(初期位置と初期速度)
let puck = { x: 300, y: 200, vx: 1, vy: 1 };
// 全プレイヤーの位置を保持
const players = {}; // {socket.id: {x,y}}

// サーバのルートにアクセスしたら簡単なメッセージ
app.get("/", (req, res) => {
    res.send("AirHockey WebSocket Server is running");
});

// クライアント接続
io.on("connection", (socket) => {
    console.log("a user connected:", socket.id);

    // 新しいプレイヤーを追加
    players[socket.id] = { x: WIDTH / 2, y: HEIGHT - 50 };

    // クライアントから入力（マウス位置など）
    socket.on("playerMove", (data) => {
        // サーバ側のプレイヤー位置だけを更新
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
        }
    });

    // 切断時にプレイヤー削除
    socket.on("disconnect", () => {
        console.log("disconnected:", socket.id);
        delete players[socket.id];
    });
});


// ----- パックの物理演算（サーバ側で毎フレーム更新）-----
setInterval(() => {
    // パック位置更新
    puck.x += puck.vx;
    puck.y += puck.vy;

    // 壁で反射（単純なバウンス）
    if (puck.x - PUCK_RADIUS < 0 || puck.x + PUCK_RADIUS > WIDTH) {
        puck.vx *= -1;
        puck.x = Math.max(PUCK_RADIUS, Math.min(WIDTH - PUCK_RADIUS, puck.x));
    }
    if (puck.y - PUCK_RADIUS < 0 || puck.y + PUCK_RADIUS > HEIGHT) {
        puck.vy *= -1;
        puck.y = Math.max(PUCK_RADIUS, Math.min(HEIGHT - PUCK_RADIUS, puck.y));
    }

    // 各プレイヤーとの衝突チェック
    for (const id in players) {
        const player = players[id];
        const dx = puck.x - player.x;
        const dy = puck.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PUCK_RADIUS + PLAYER_RADIUS) {
            // 衝突：パックをプレイヤー円の外へ移動
            const angle = Math.atan2(dy, dx);
            const speed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
            puck.x = player.x + (PUCK_RADIUS + PLAYER_RADIUS) * Math.cos(angle);
            puck.y = player.y + (PUCK_RADIUS + PLAYER_RADIUS) * Math.sin(angle);
            // 反射
            puck.vx = -Math.cos(angle) * speed;
            puck.vy = -Math.sin(angle) * speed;
        }
    }



    // 全員に最新状態を送信
    io.emit("state", { players, puck });
}, 1000 / 60); // 60fps

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
