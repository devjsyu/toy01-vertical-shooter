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

function preload() {
    // 아직은 이미지 없이 기본 도형으로 진행합니다.
}

function create() {
    // 1. 플레이어 생성 (초록색 사각형)
    player = this.add.rectangle(225, 550, 40, 40, 0x00ff00);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);

    // 2. 탄환 그룹 생성
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 30 // 메모리 효율을 위해 화면 내 최대 탄환 수 제한
    });

    // 3. 입력 장치 설정 (방향키, 스페이스바)
    cursors = this.input.keyboard.createCursorKeys();
}

function update(time) {
    // 4. 플레이어 이동 로직
    if (cursors.left.isDown) {
        player.body.setVelocityX(-300);
    } else if (cursors.right.isDown) {
        player.body.setVelocityX(300);
    } else {
        player.body.setVelocityX(0);
    }

    // 5. 탄환 발사 로직 (스페이스바)
    if (cursors.space.isDown && time > lastFired) {
        fireBullet(this, time);
    }

    // 6. 화면 밖으로 나간 탄환 제거 (메모리 관리)
    bullets.children.each((bullet) => {
        if (bullet.y < 0) {
            bullet.destroy();
        }
    });
}

function fireBullet(scene, time) {
    // 탄환을 플레이어 위치에서 생성 (임시로 노란색 작은 사각형)
    const bullet = scene.add.rectangle(player.x, player.y - 20, 5, 15, 0xffff00);
    scene.physics.add.existing(bullet);
    
    bullets.add(bullet);
    bullet.body.setVelocityY(-500); // 위로 발사

    lastFired = time + 200; // 발사 간격 제한 (0.2초)
}