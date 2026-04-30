import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 450,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// 변수 관리
let player, cursors, bullets, enemies, items;
let lastFired = 0;
let fireDelay = 200;
let score = 0;
let scoreText;
let isGameOver = false;

function preload() {}

function create() {
    isGameOver = false;
    score = 0;
    fireDelay = 200;

    // 1. 플레이어 생성
    player = this.add.rectangle(225, 550, 40, 40, 0x00ff00);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    // 2. 그룹 초기화
    bullets = this.physics.add.group();
    enemies = this.physics.add.group();
    items = this.physics.add.group();

    // 3. 입력 설정
    cursors = this.input.keyboard.createCursorKeys();

    // 4. UI 설정
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', fill: '#fff' });

    // 5. 타이머: 적 생성
    this.time.addEvent({
        delay: 1000,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });

    // 6. 충돌 설정
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, items, pickUpItem, null, this);
    // 플레이어와 적이 부딪히면 게임 오버
    this.physics.add.overlap(player, enemies, gameOver, null, this);
}

function update(time) {
    if (isGameOver) return;

    if (cursors.left.isDown) player.body.setVelocityX(-300);
    else if (cursors.right.isDown) player.body.setVelocityX(300);
    else player.body.setVelocityX(0);

    if (cursors.space.isDown && time > lastFired) {
        fireBullet(this, time);
        lastFired = time + fireDelay;
    }

    // 오브젝트 정리
    [bullets, enemies, items].forEach(group => {
        group.children.each(child => {
            if (child.y < -50 || child.y > 650) child.destroy();
        });
    });
}

function spawnEnemy() {
    if (isGameOver) return;
    const x = Phaser.Math.Between(30, 420);
    const isTanker = Math.random() < 0.2;
    const enemy = this.add.rectangle(x, -20, isTanker ? 50 : 30, isTanker ? 50 : 30, isTanker ? 0xaa00ff : 0xff0000);
    
    this.physics.add.existing(enemy);
    enemy.hp = isTanker ? 5 : 1;
    enemy.isTanker = isTanker;
    enemies.add(enemy);
    enemy.body.setVelocityY(isTanker ? 80 : 150);
}

function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.hp -= 1;
    enemy.setAlpha(0.5);
    this.time.delayedCall(50, () => { if(enemy.active) enemy.setAlpha(1); });

    if (enemy.hp <= 0) {
        score += enemy.isTanker ? 50 : 10;
        scoreText.setText('Score: ' + score);
        if (enemy.isTanker) spawnItem(this, enemy.x, enemy.y);
        enemy.destroy();
    }
}

function spawnItem(scene, x, y) {
    const item = scene.add.rectangle(x, y, 20, 20, 0x00ffff);
    scene.physics.add.existing(item);
    items.add(item);
    item.body.setVelocityY(100);
}

function pickUpItem(player, item) {
    item.destroy();
    if (fireDelay > 50) fireDelay -= 30;
    player.setFillStyle(0xffff00);
    this.time.delayedCall(200, () => { player.setFillStyle(0x00ff00); });
}

function fireBullet(scene, time) {
    const bullet = scene.add.rectangle(player.x, player.y - 20, 5, 15, 0xffff00);
    scene.physics.add.existing(bullet);
    bullets.add(bullet);
    bullet.body.setVelocityY(-500);
}

function gameOver() {
    isGameOver = true;
    this.physics.pause();
    player.setAlpha(0.5);

    const overText = this.add.text(225, 300, 'GAME OVER\nClick to Restart', {
        fontSize: '40px', fill: '#fff', align: 'center'
    }).setOrigin(0.5);

    // 나중에 이 포인트에서 백엔드 API로 점수를 전송하면 됩니다!
    console.log("최종 점수 전송:", score);

    this.input.on('pointerdown', () => {
        this.scene.restart();
    });
}