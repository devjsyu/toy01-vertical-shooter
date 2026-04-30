import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 450,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // 우주 배경이므로 중력은 0
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

function preload() {
    // 1단계에서는 이미지 대신 색상 사각형(Placeholder)을 사용할 예정입니다.
}

function create() {
    // 플레이어 생성 (임시로 초록색 사각형)
    this.player = this.add.rectangle(225, 550, 40, 40, 0x00ff00);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true); // 화면 밖으로 못 나가게 설정

    // 안내 문구
    this.add.text(10, 10, 'Space Shooter MVP - 1단계', { fill: '#00ffff' });
}

function update() {
    // 매 프레임 실행될 로직 (2단계에서 추가 예정)
}