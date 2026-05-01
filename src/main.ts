import Phaser from 'phaser';

// 1. 객체 구조를 위한 인터페이스 정의 (Java의 DTO/Entity 느낌)
interface GameEntity extends Phaser.GameObjects.Rectangle {
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

function preload() {}

function create(this: Phaser.Scene) {
    isGameOver = false;
    score = 0;
    fireDelay = 200;

    // 플레이어 생성 및 타입 캐스팅
    player = this.add.rectangle(225, 550, 40, 40, 0x00ff00) as GameEntity;
    this.physics.add.existing(player);
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
    const isTanker = Math.random() < 0.2;
    
    const enemy = this.add.rectangle(x, -20, isTanker ? 50 : 30, isTanker ? 50 : 30, isTanker ? 0xaa00ff : 0xff0000) as GameEntity;
    this.physics.add.existing(enemy);
    
    enemy.hp = isTanker ? 5 : 1;
    enemy.isTanker = isTanker;
    enemies.add(enemy);
    enemy.body.setVelocityY(isTanker ? 80 : 150);
}

function hitEnemy(this: Phaser.Scene, bullet: Phaser.GameObjects.GameObject, enemy: GameEntity) {
    bullet.destroy();
    if (enemy.hp !== undefined) {
        enemy.hp -= 1;
        enemy.setAlpha(0.5);
        this.time.delayedCall(50, () => { if(enemy.active) enemy.setAlpha(1); });

        if (enemy.hp <= 0) {
            score += enemy.isTanker ? 50 : 10;
            scoreText.setText(`Score: ${score}`);
            if (enemy.isTanker) spawnItem(this, enemy.x, enemy.y);
            enemy.destroy();
        }
    }
}

function spawnItem(scene: Phaser.Scene, x: number, y: number) {
    const item = scene.add.rectangle(x, y, 20, 20, 0x00ffff);
    scene.physics.add.existing(item);
    items.add(item);
    
    // item.body를 아케이드 물리 바디 타입으로 형변환(Casting)합니다.
    const body = item.body as Phaser.Physics.Arcade.Body;

    // 이제 타입이 명확해졌으므로 에러 없이 사용할 수 있습니다.
    if (body) {
        body.setVelocityY(100);
    }
}

function pickUpItem(playerObj: GameEntity, item: Phaser.GameObjects.GameObject) {
    item.destroy();
    if (fireDelay > 50) fireDelay -= 30;
    playerObj.setFillStyle(0xffff00);
    // 씬 컨텍스트 접근을 위해 별도 처리 필요하지만 MVP에선 색상 변경만 유지
}

function fireBullet(scene: Phaser.Scene, time: number) {
    const bullet = scene.add.rectangle(player.x, player.y - 20, 5, 15, 0xffff00);
    scene.physics.add.existing(bullet);
    bullets.add(bullet);

    // item.body를 아케이드 물리 바디 타입으로 형변환(Casting)합니다.
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