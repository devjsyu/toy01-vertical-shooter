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

function preload() {
    // 아직은 이미지 없이 기본 도형으로 진행합니다.
}

function create() {
    // 1. 플레이어 및 탄환 설정 (2단계와 동일)
    player = this.add.rectangle(225, 550, 40, 40, 0x00ff00);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    bullets = this.physics.add.group();
    cursors = this.input.keyboard.createCursorKeys();

    // 2. 적군 그룹 생성
    enemies = this.physics.add.group();

    // 3. 일정 시간마다 적군 생성 (Timer 이벤트)
    this.time.addEvent({
        delay: 1000,                // 1초마다
        callback: spawnEnemy,       // spawnEnemy 함수 실행
        callbackScope: this,
        loop: true
    });

    // 4. 충돌 판정 (Overlap) 설정
    // 탄환(bullets)과 적군(enemies)이 겹치면 hitEnemy 함수 실행
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
}

function update(time) {
    // 플레이어 이동 및 발사 로직 (2단계 유지)
    if (cursors.left.isDown) {
        player.body.setVelocityX(-300);
    } else if (cursors.right.isDown) {
        player.body.setVelocityX(300);
    } else {
        player.body.setVelocityX(0);
    }

    if (cursors.space.isDown && time > lastFired) {
        fireBullet(this, time);
    }

    // 화면 밖으로 나간 오브젝트 정리
    bullets.children.each(bullet => { if (bullet.y < 0) bullet.destroy(); });
    enemies.children.each(enemy => { if (enemy.y > 600) enemy.destroy(); });
}

// 적군 생성 함수
function spawnEnemy() {
    const x = Phaser.Math.Between(30, 420); // 랜덤한 X 좌표
    const enemy = this.add.rectangle(x, -20, 30, 30, 0xff0000); // 빨간색 사각형 적군
    this.physics.add.existing(enemy);
    
    enemies.add(enemy);
    enemy.body.setVelocityY(150); // 아래로 이동
}

// 충돌 시 실행될 함수
function hitEnemy(bullet, enemy) {
    bullet.destroy(); // 탄환 제거
    enemy.destroy();  // 적군 제거
    // 여기에 점수 증가 로직을 넣으면 훌륭한 백엔드 연동 포인트가 됩니다!
}

function fireBullet(scene, time) {
    // 탄환을 플레이어 위치에서 생성 (임시로 노란색 작은 사각형)
    const bullet = scene.add.rectangle(player.x, player.y - 20, 5, 15, 0xffff00);
    scene.physics.add.existing(bullet);
    
    bullets.add(bullet);
    bullet.body.setVelocityY(-500); // 위로 발사

    lastFired = time + 200; // 발사 간격 제한 (0.2초)
}