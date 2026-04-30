import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 450,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// 전역 변수 설정
let player;
let cursors;
let bullets;
let lastFired = 0;
let enemies; // 적 그룹 변수 추가
let items; // 아이템 그룹 추가
let fireDelay = 200; // 기본 발사 속도 (아이템 획득 시 줄어듦)

function preload() {
    // 아직은 이미지 없이 기본 도형으로 진행합니다.
}

function create() {
    // 플레이어, 탄환, 입력 설정 유지
    player = this.add.rectangle(225, 550, 40, 40, 0x00ff00);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    bullets = this.physics.add.group();
    cursors = this.input.keyboard.createCursorKeys();

    // 그룹 생성
    enemies = this.physics.add.group();
    items = this.physics.add.group();

    // 1초마다 일반 적 또는 탱커 생성
    this.time.addEvent({
        delay: 1000,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });

    // 충돌 설정들
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, items, pickUpItem, null, this);
}

function update(time) {
    // 이동 로직 유지
    if (cursors.left.isDown) player.body.setVelocityX(-300);
    else if (cursors.right.isDown) player.body.setVelocityX(300);
    else player.body.setVelocityX(0);

    // 발사 로직 (변수화된 fireDelay 사용)
    if (cursors.space.isDown && time > lastFired) {
        fireBullet(this, time);
        lastFired = time + fireDelay; 
    }

    // 화면 밖으로 나간 오브젝트 정리
    bullets.children.each(bullet => { if (bullet.y < 0) bullet.destroy(); });
    enemies.children.each(enemy => { if (enemy.y > 600) enemy.destroy(); });
}

// 적군 생성 함수
function spawnEnemy() {
    const x = Phaser.Math.Between(30, 420);
    const isTanker = Math.random() < 0.2; // 20% 확률로 탱커 등장

    let enemy;
    if (isTanker) {
        // 탱커: 보라색, 조금 더 큼, HP 5 설정
        enemy = this.add.rectangle(x, -20, 50, 50, 0xaa00ff);
        enemy.hp = 5; 
        enemy.isItemBox = true; // 탱커를 잡으면 아이템이 나오게 설정
    } else {
        // 일반 적: 빨간색, HP 1
        enemy = this.add.rectangle(x, -20, 30, 30, 0xff0000);
        enemy.hp = 1;
    }
    
    this.physics.add.existing(enemy);
    enemies.add(enemy);
    enemy.body.setVelocityY(isTanker ? 80 : 150); // 탱커는 더 천천히 내려옴
}

// 충돌 시 실행될 함수
function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.hp -= 1; // HP 감소

    // 피격 피드백 (잠시 하얗게 변함)
    enemy.setAlpha(0.5);
    this.time.delayedCall(50, () => { if(enemy.active) enemy.setAlpha(1); });

    if (enemy.hp <= 0) {
        if (enemy.isItemBox) spawnItem(this, enemy.x, enemy.y);
        enemy.destroy();
    }
}

function spawnItem(scene, x, y) {
    // 아이템: 파란색 작은 원형(또는 사각형)
    const item = scene.add.rectangle(x, y, 20, 20, 0x00ffff);
    scene.physics.add.existing(item);
    items.add(item);
    item.body.setVelocityY(100);
}

function pickUpItem(player, item) {
    item.destroy();
    // 파워업 효과: 연사 속도 증가 (최소 50ms까지)
    if (fireDelay > 50) fireDelay -= 30;
    
    // 시각적 피드백: 플레이어 색상 잠시 변경
    player.setFillStyle(0xffff00);
    this.time.delayedCall(200, () => { player.setFillStyle(0x00ff00); });
}

function fireBullet(scene, time) {
    const bullet = scene.add.rectangle(player.x, player.y - 20, 5, 15, 0xffff00);
    scene.physics.add.existing(bullet);
    bullets.add(bullet);
    bullet.body.setVelocityY(-500);
}