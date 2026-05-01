import Phaser from 'phaser';

// 1. 객체 구조를 위한 인터페이스 정의 (Java의 DTO/Entity 느낌)
interface GameEntity extends Phaser.Physics.Arcade.Sprite {
    body: Phaser.Physics.Arcade.Body;
    hp?: number;
    isTanker?: boolean;
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 450,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { 
            // x값을 명시적으로 추가하여 Vector2Like 타입을 만족시킵니다.
            gravity: { x: 0, y: 0 }, 
            debug: false 
        }    },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// 2. 명시적 타입 선언
let player: GameEntity;
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
let bullets: Phaser.Physics.Arcade.Group;
let enemies: Phaser.Physics.Arcade.Group;
let items: Phaser.Physics.Arcade.Group;

let lastFired: number = 0;
let fireDelay: number = 200;
let score: number = 0;
let scoreText: Phaser.GameObjects.Text;
let isGameOver: boolean = false;

function preload(this: Phaser.Scene) {
    this.load.image('player', 'assets/player.png');
    this.load.image('enemy', 'assets/enemy.png');
    this.load.image('tanker', 'assets/tanker.png');
    this.load.image('item', 'assets/item.png');

    // 384x48 이미지를 48x48 크기로 8등분해서 읽어라! 라는 뜻입니다.
    this.load.spritesheet('explosion', 'assets/explosion.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    // 576x48 이미지를 48x48 크기로 12등분해서 읽어라! 라는 뜻입니다.
    this.load.spritesheet('upgrade', 'assets/upgrade.png', {
        frameWidth: 48,
        frameHeight: 48
    });

    this.load.spritesheet('laser', 'assets/laser.png', {
        frameWidth: 88,
        frameHeight: 114
    });

}

function create(this: Phaser.Scene) {
    isGameOver = false;
    score = 0;
    fireDelay = 200;

    // 1. 플레이어 생성 (정사각형 에셋 사용)
    player = this.physics.add.sprite(225, 550, 'player') as GameEntity;

    // 2. 크기 조정
    const SIZE = 120; 
    player.setDisplaySize(SIZE, SIZE);

    // 3. 히트박스(Body) 조정
    player.body.setSize(SIZE * 0.8, SIZE * 0.8, true);

    player.body.setCollideWorldBounds(true);

    bullets = this.physics.add.group();
    enemies = this.physics.add.group();
    items = this.physics.add.group();

    if (this.input.keyboard) {
        cursors = this.input.keyboard.createCursorKeys();
    }

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#fff' });

    this.time.addEvent({
        delay: 1000,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });

    this.physics.add.overlap(bullets, enemies, hitEnemy as any, undefined, this);
    this.physics.add.overlap(player, items, pickUpItem as any, undefined, this);
    this.physics.add.overlap(player, enemies, gameOver as any, undefined, this);

    this.anims.create({
        key: 'explode_anim',
        // 0, 1, 2, 3, 4, 5, 6, 7 총 8개의 프레임을 사용합니다.
        frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 7 }),
        frameRate: 16, // 8개 프레임이므로 속도를 약간 낮춰야(12~16) 자연스럽습니다.
        hideOnComplete: true
    });

    this.anims.create({
        key: 'upgrade_anim',
        frames: this.anims.generateFrameNumbers('upgrade', { start: 0, end: 11 }),
        frameRate: 36,
        hideOnComplete: true
    });

        this.anims.create({
        key: 'laser_anim',
        frames: this.anims.generateFrameNumbers('laser', { start: 0, end: 2 }),
        frameRate: 12,
        hideOnComplete: false
    });
}

function update(this: Phaser.Scene, time: number) {
    if (isGameOver) return;

    if (cursors.left.isDown) player.body.setVelocityX(-300);
    else if (cursors.right.isDown) player.body.setVelocityX(300);
    else player.body.setVelocityX(0);

    if (cursors.space.isDown && time > lastFired) {
        fireBullet(this, time);
        lastFired = time + fireDelay;
    }

    // 오브젝트 정리 로직 (타입 가드 활용)
    [bullets, enemies, items].forEach(group => {
        group.getChildren().forEach((child: any) => {
            if (child.y < -50 || child.y > 650) child.destroy();
        });
    });
}

function spawnEnemy(this: Phaser.Scene) {
    if (isGameOver) return;
    const x = Phaser.Math.Between(30, 420);
    const isTanker = Math.random() < 0.1;
    
    const texture = isTanker ? 'tanker' : 'enemy';
    const enemy = this.physics.add.sprite(x, -20, texture) as GameEntity;
    
    const SIZE = isTanker ? 180 : 60; // 화면 크기 대비 너무 작으면 안 보이니 적당히 조절
    
    enemy.setDisplaySize(SIZE, SIZE);
    enemy.body.setSize(SIZE * 0.9, SIZE * 0.9, true);

    enemy.hp = isTanker ? 5 : 1;
    enemy.isTanker = isTanker;
    enemies.add(enemy);
    enemy.body.setVelocityY(isTanker ? 50 : 150);
}

function hitEnemy(this: Phaser.Scene, bullet: Phaser.GameObjects.GameObject, enemy: GameEntity) {
    bullet.destroy();

    // 피격 시 붉은색으로 변경
    enemy.setTint(0xff0000);
    
    // 0.1초 후에 원래 색상으로 복구 (비동기 피드백)
    this.time.delayedCall(50, () => {
        if (enemy.active) {
            enemy.clearTint();
        }
    });

    if (enemy.hp !== undefined) {
        enemy.hp -= 1;
        enemy.setAlpha(0.5);
        this.time.delayedCall(50, () => { if(enemy.active) enemy.setAlpha(1); });

        if (enemy.hp <= 0) {
            score += enemy.isTanker ? 50 : 10;
            scoreText.setText(`Score: ${score}`);
            if (enemy.isTanker) spawnItem(this, enemy.x, enemy.y);

            // hitEnemy 함수 내 적이 죽는 시점
            const boom = this.add.sprite(enemy.x, enemy.y, 'explosion');

            // 1. 적의 크기에 맞춰 폭발 크기를 키워줍니다. 
            // (원본이 48이라도 setDisplaySize를 쓰면 원하는 크기로 출력됩니다.)
            if (enemy.isTanker) {
                boom.setDisplaySize(enemy.displayWidth * 0.5, enemy.displayHeight * 0.5);
                this.cameras.main.shake(100, 0.02);
            } 

            // 2. 애니메이션 재생
            boom.play('explode_anim');

            enemy.destroy();
        }
    }
}

function spawnItem(scene: Phaser.Scene, x: number, y: number) {
    const item = scene.physics.add.sprite(x, y, 'item') as GameEntity;

    const SIZE = 50; 
    item.setDisplaySize(SIZE, SIZE);
    item.body.setSize(SIZE, SIZE, true);

    items.add(item);
    item.body.setVelocityY(100);
}

function pickUpItem(this: Phaser.Scene, playerObj: GameEntity, item: Phaser.GameObjects.GameObject) {
    item.destroy();

    const upgrade = this.add.sprite(playerObj.x, playerObj.y, 'upgrade');
    upgrade.setDisplaySize(playerObj.displayWidth * 0.8, playerObj.displayHeight * 0.8); 
    upgrade.play('upgrade_anim');

    if (fireDelay > 50) fireDelay -= 30;
}

function fireBullet(scene: Phaser.Scene, time: number) {
    // const bullet = scene.add.rectangle(player.x, player.y - 20, 5, 15, 0xffff00);
    const bullet = scene.add.sprite(player.x, player.y, 'laser');
    bullet.setDisplaySize(player.displayWidth * 0.8, player.displayHeight * 0.5); 
    bullet.play('laser_anim');
    bullets.add(bullet);

    // bullet.body를 아케이드 물리 바디 타입으로 형변환(Casting)합니다.
    const body = bullet.body as Phaser.Physics.Arcade.Body;

    // 이제 타입이 명확해졌으므로 에러 없이 사용할 수 있습니다.
    if (body) {
        body.setVelocityY(-500);
    }
}

function gameOver(this: Phaser.Scene) {
    isGameOver = true;
    this.physics.pause();
    player.setAlpha(0.5);

    this.add.text(225, 300, 'GAME OVER\nClick to Restart', {
        fontSize: '40px', color: '#fff', align: 'center'
    }).setOrigin(0.5);

    this.input.on('pointerdown', () => {
        this.scene.restart();
    });
}