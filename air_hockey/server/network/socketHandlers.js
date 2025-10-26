const Matter = require("matter-js");
const constants = require("../game/constants");

function registerHandlers(io, gameState, gameEngine) {
    io.on("connection", (socket) => {
        console.log("a user connected:", socket.id);

        // 初期状態は観戦者として追加（物理オブジェクトなし）
        gameState.addPlayer(socket.id, null);

        // チーム参加イベント
        socket.on("joinTeam", (data) => {
            const team = data.team; // "top" または "bottom"
            if (gameState.canJoinTeam(team)) {
                // プレイヤーの物理オブジェクトを作成
                const playerBody = Matter.Bodies.circle(
                    constants.WIDTH / 2,
                    constants.HEIGHT - 50,
                    constants.PLAYER_RADIUS,
                    {
                        isStatic: true,
                        restitution: 1,
                        inertia: Infinity
                    }
                );
                Matter.World.add(gameEngine.world, playerBody);

                // 既存のプレイヤーデータを更新
                gameState.removePlayer(socket.id);
                gameState.addPlayer(socket.id, playerBody, team);
                socket.emit("teamJoined", { team });
            } else {
                socket.emit("teamError", { message: "このチームは満員です" });
            }
        });

        // クライアントから入力（マウス位置など）
        socket.on("playerMove", (data) => {
            const playerData = gameState.players[socket.id];
            if (!playerData) return;
            const body = playerData.body;

            // 前回位置を保存していなければ初期化
            const lastPos = playerData.lastPos || { x: data.x, y: data.y };

            // 位置を瞬間移動
            Matter.Body.setPosition(body, { x: data.x, y: data.y });

            // 疑似速度（60FPS換算）を算出してクリップ
            let vx = (data.x - lastPos.x) * constants.FRAME_RATE;
            let vy = (data.y - lastPos.y) * constants.FRAME_RATE;

            vx = Math.max(-constants.PLAYER_MAX_SPEED, Math.min(constants.PLAYER_MAX_SPEED, vx));
            vy = Math.max(-constants.PLAYER_MAX_SPEED, Math.min(constants.PLAYER_MAX_SPEED, vy));

            Matter.Body.setVelocity(body, { x: vx, y: vy });
            // 今回の位置を保存
            gameState.setPlayerLastPos(socket.id, { x: data.x, y: data.y });
        });

        socket.on("disconnect", () => {
            console.log("disconnected:", socket.id);
            const p = gameState.players[socket.id];
            if (p && p.body) {
                Matter.World.remove(gameEngine.world, p.body);
            }
            gameState.removePlayer(socket.id);
        });
    });
}

module.exports = { registerHandlers };
