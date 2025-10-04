const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Matter = require("matter-js");

// サーバの公開
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
const WALL_THICK = 200 // 壁の厚み

// エンジンとワールド
const engine = Matter.Engine.create();
const world = engine.world;
engine.gravity.y = 0; // 縦方向の重力を0に

// 壁（フィールドの周囲）
const walls = [
    Matter.Bodies.rectangle(WIDTH / 2, -WALL_THICK / 2, WIDTH, WALL_THICK, { isStatic: true, restitution: 1 }),
    Matter.Bodies.rectangle(WIDTH / 2, HEIGHT + WALL_THICK / 2, WIDTH, WALL_THICK, { isStatic: true, restitution: 1 }),
    Matter.Bodies.rectangle(-WALL_THICK / 2, HEIGHT / 2, WALL_THICK, HEIGHT, { isStatic: true, restitution: 1 }),
    Matter.Bodies.rectangle(WIDTH + WALL_THICK / 2, HEIGHT / 2, WALL_THICK, HEIGHT, { isStatic: true, restitution: 1 })
];
Matter.World.add(world, walls);

// パック状態(初期位置と初期速度)
const puck = Matter.Bodies.circle(300, 200, PUCK_RADIUS, {
    restitution: 0.9, // 反発係数
    friction: 0, // 面との摩擦
    frictionAir: 0.00005, // 空気抵抗（小さいほど減速しない）
    frictionStatic: 0,  // 静止摩擦
    inertia: Infinity // 回転禁止

});
Matter.World.add(world, puck);

// 全プレイヤーの位置を保持
const players = {}; // {socket.id: {x,y}}


// ゴール
const GOAL_WIDTH = 200;
const GOAL_DEPTH = 10;

const goals = {
    top: Matter.Bodies.rectangle(WIDTH / 2, -GOAL_DEPTH / 2, GOAL_WIDTH, GOAL_DEPTH, { isSensor: true, isStatic: true }),
    bottom: Matter.Bodies.rectangle(WIDTH / 2, HEIGHT + GOAL_DEPTH / 2, GOAL_WIDTH, GOAL_DEPTH, { isSensor: true, isStatic: true })
};
Matter.World.add(world, [goals.top, goals.bottom]);


// スコア
const score = { top: 0, bottom: 0 };


// サーバのルートにアクセスしたら簡単なメッセージ
app.get("/", (req, res) => {
    res.send("AirHockey WebSocket Server is running");
});

// クライアント接続
io.on("connection", (socket) => {
    console.log("a user connected:", socket.id);

    // 新しいプレイヤーを追加
    const playerBody = Matter.Bodies.circle(WIDTH / 2, HEIGHT - 50, PLAYER_RADIUS, {
        // 瞬間移動で力が加わらない
        isStatic: true,
        restitution: 1,
        inertia: Infinity // 回転禁止

        // isStatic: false,
        // // restitution: 1,
        // // restitution: 0.4,
        // friction: 0,
        // frictionAir: 0.15,
        // mass: 50,
        // inertia: Infinity // 回転禁止
    });
    Matter.World.add(world, playerBody);
    players[socket.id] = { body: playerBody };

    // クライアントから入力（マウス位置など）
    socket.on("playerMove", (data) => {
        const body = players[socket.id].body;
        if (!body) return;

        // 前回位置を保存していなければ初期化
        if (!players[socket.id].lastPos) {
            players[socket.id].lastPos = { x: data.x, y: data.y };
        }


        const lastPos = players[socket.id].lastPos;

        // 新しい位置に瞬間移動
        Matter.Body.setPosition(body, { x: data.x, y: data.y });

        // 疑似的な速度を計算（60FPS換算）
        let vx = (data.x - lastPos.x) * 60;
        let vy = (data.y - lastPos.y) * 60;


        const MAX_SPEED = 10;
        vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vx));
        vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vy));
        Matter.Body.setVelocity(body, { x: vx, y: vy });

        // 今回の位置を保存
        players[socket.id].lastPos = { x: data.x, y: data.y };


        // const dx = data.x - body.position.x;
        // const dy = data.y - body.position.y;

        // // 1フレームあたりの速度に変換
        // Matter.Body.setVelocity(body, {
        //     // x: Math.max(-MAX_SPEED, Math.min(MAX_SPEED, dx)),
        //     // y: Math.max(-MAX_SPEED, Math.min(MAX_SPEED, dy))
        // });
    });

    // 切断時にプレイヤー削除
    socket.on("disconnect", () => {
        console.log("disconnected:", socket.id);
        Matter.World.remove(world, players[socket.id].body);
        delete players[socket.id];
    });
});


// 衝突判定（ゴール）
Matter.Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
        if (pair.bodyA === puck || pair.bodyB === puck) {
            if (pair.bodyA === goals.top || pair.bodyB === goals.top) {
                score.bottom += 1;
                resetPuck();
            } else if (pair.bodyA === goals.bottom || pair.bodyB === goals.bottom) {
                score.top += 1;
                resetPuck();
            }
        }
    }
});

function resetPuck() {
    Matter.Body.setPosition(puck, { x: WIDTH / 2, y: HEIGHT / 2 });
    Matter.Body.setVelocity(puck, { x: 0, y: 0 });
}



// ----- パックの物理演算（サーバ側で毎フレーム更新）-----
setInterval(() => {
    // Matter.Engine.update(engine, 1000 / 60);
    Matter.Engine.update(engine);

    // 状態を全員に送信
    const playersState = {};
    for (const id in players) {
        playersState[id] = {
            x: players[id].body.position.x,
            y: players[id].body.position.y
        };
    }


    io.emit("state", {
        players: playersState,
        puck: { x: puck.position.x, y: puck.position.y },
        score
    });
}, 1000 / 60);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
