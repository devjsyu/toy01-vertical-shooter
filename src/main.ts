import Phaser from 'phaser';

// 1. 객체 구조를 위한 인터페이스 정의 (Java의 DTO/Entity 느낌)
interface GameEntity extends Phaser.Physics.Arcade.Sprite {
    body: Phaser.Physics.Arcade.Body;
    hp?: number;
    isTanker?: boolean;
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 400, // Increased width
    height: 800, // Increased height
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH // Center the game on the screen
    },
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { 
            // x값을 명시적으로 추가하여 Vector2Like 타입을 만족시킵니다.
            gravity: { x: 0, y: 0 }, 
            debug: false
        }    
    },
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
let isGameStarted: boolean = false; // 게임 시작 여부
let startText: Phaser.GameObjects.Text; // 시작 안내 문구

let healthGraphics: Phaser.GameObjects.Graphics; // 체력 바 전용 도화지
let isInvincible = false; // 겹쳐있을 동안 체력 더 깎이지 않도록 무적 시간 설정

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

    this.load.audio('intro', 'assets/sounds/intro.mp3');
    this.load.audio('bgm', 'assets/sounds/bgm.mp3');
    this.load.audio('fire', 'assets/sounds/fire.mp3');
    this.load.audio('explosion', 'assets/sounds/explosion.mp3');
    this.load.audio('powerup', 'assets/sounds/powerup.mp3');
    this.load.audio('outtro', 'assets/sounds/outtro.mp3');
}

function create(this: Phaser.Scene) {
    isGameStarted = false; // 초기값은 시작 안 함
    isGameOver = false;
    score = 0;
    fireDelay = 200;

    // 1. 물리 엔진 일시정지 (대기 상태)
    this.physics.pause();
    this.sound.play('intro', { volume: 0.5 });

    // 2. 시작 안내 문구 생성
    startText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Click to start', {
        fontSize: '32px',
        color: '#fff',
        align: 'center',
        fontFamily: '"Jersey 10"'
    }).setOrigin(0.5);

    this.tweens.add({
        targets: startText,
        alpha: 0.2,
        duration: 800,
        ease: 'Power1',
        yoyo: true, // 다시 돌아옴
        loop: -1    // 무한 반복
    });

    // 3. 클릭(또는 터치) 이벤트 리스너 등록
    this.input.once('pointerdown', () => {
        startGame.call(this);
    });

    // 1. 플레이어 생성 (정사각형 에셋 사용)
    player = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 70, 'player') as GameEntity;
    player.hp = 5;

    // 2. 크기 조정
    const SIZE = 120; 
    player.setDisplaySize(SIZE, SIZE);
    
    // 3. 히트박스(Body) 조정: 원본 크기(player.width)를 기준으로 0.5 비율 적용
    player.body.setSize(player.width * 0.5, player.height * 0.5, true);

    player.body.setCollideWorldBounds(true);

    bullets = this.physics.add.group();
    enemies = this.physics.add.group();
    items = this.physics.add.group();

    if (this.input.keyboard) {
        cursors = this.input.keyboard.createCursorKeys();
    }

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', color: '#fff', fontFamily: '"Jersey 10"' });

    this.physics.add.overlap(bullets, enemies, hitEnemy as any, undefined, this);
    this.physics.add.overlap(player, items, pickUpItem as any, undefined, this);
    this.physics.add.overlap(player, enemies, takeDamage as any, undefined, this);

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

    healthGraphics = this.add.graphics();

    // Use postupdate to ensure the bar follows the player after physics movement
    this.events.on('postupdate', () => {
        if (isGameStarted && !isGameOver) {
            drawHealthBar(this, player, healthGraphics);
        } else {
            healthGraphics.clear();
        }
    });
}

function update(this: Phaser.Scene, time: number) {
    // 게임 시작 전이거나 게임 오버라면 로직 실행 안 함
    if (!isGameStarted || isGameOver) return;

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
            if (child.y < -100 || child.y > this.scale.height + 100) child.destroy();
        });
    });
}

function spawnEnemy(this: Phaser.Scene) {
    if (isGameOver) return;

    const x = Phaser.Math.Between(30, this.scale.width - 30);
    const isTanker = Math.random() < 0.1;
    
    const texture = isTanker ? 'tanker' : 'enemy';
    const enemy = this.physics.add.sprite(x, -20, texture) as GameEntity;
    
    const SIZE = isTanker ? 150 : 40; 
    
    enemy.setDisplaySize(SIZE, SIZE);

    // 원본 이미지 크기(enemy.width)에 비율을 곱해야 화면 크기와 일치하게 됩니다.
    const hitboxRatio = isTanker ? 0.6 : 1;
    enemy.body.setSize(enemy.width * hitboxRatio, enemy.height * hitboxRatio, true);

    enemy.hp = isTanker ? 5 : 1;
    enemy.isTanker = isTanker;
    enemies.add(enemy);

    // 점수가 높을수록 적의 속도가 빨라짐
    const speedBoost = Math.floor(score / 100) * 10; 
    enemy.body.setVelocityY((isTanker ? 50 : 150) + speedBoost);
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
            updateScore(score, this);
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

            // 3. 효과음 재생
            this.sound.play('explosion', { volume: 0.3 });

            enemy.destroy();
        }
    }
}

function spawnItem(scene: Phaser.Scene, x: number, y: number) {
    const item = scene.physics.add.sprite(x, y, 'item') as GameEntity;

    const SIZE = 50; 
    item.setDisplaySize(SIZE, SIZE);
    item.body.setSize(item.width, item.height, true);

    items.add(item);
    item.body.setVelocityY(200);
}

function pickUpItem(this: Phaser.Scene, playerObj: GameEntity, item: Phaser.GameObjects.GameObject) {
    item.destroy();

    const upgrade = this.add.sprite(playerObj.x, playerObj.y, 'upgrade');
    upgrade.setDisplaySize(playerObj.displayWidth * 0.8, playerObj.displayHeight * 0.8); 
    upgrade.play('upgrade_anim');
    this.sound.play('powerup', { volume: 0.6 });

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
        body.setSize(10, 10, true);
    }

    scene.sound.play('fire', { volume: 0.3 });
}

function gameOver(this: Phaser.Scene) {
    isGameOver = true;
    this.physics.pause();
    this.sound.pauseAll();
    player.setAlpha(0.5);

    this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER\nClick to Restart', {
        fontSize: '40px', color: '#fff', align: 'center', fontFamily: '"Jersey 10"'
    }).setOrigin(0.5);

    this.sound.play('outtro', { volume: 0.5 });

    this.input.on('pointerdown', () => {
        this.scene.restart();
    });
}

function startGame(this: Phaser.Scene) {
    isGameStarted = true;
    startText.destroy(); // 문구 삭제
    
    // 물리 엔진 재개
    this.physics.resume();
    this.sound.pauseAll();
    this.sound.play('bgm', { volume: 0.5, loop: true });

    // 적 스폰 타이머 시작
    this.time.addEvent({
        delay: 1000,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });
}

function drawHealthBar(scene: Phaser.Scene, entity: GameEntity, graphics: Phaser.GameObjects.Graphics) {
    graphics.clear(); // 잔상 남지 않도록 이전 프레임일 때 그린 그림 지우기

    if (!entity || !entity.active) return; // 객체가 없으면 그리지 않음

    const x = entity.x;
    const y = entity.y;
    const width = 40;
    const height = 5;
    const offset = 60;

    // 1. 배경 (검은색 바닥)
    graphics.fillStyle(0x333333, 0.8); // Dark grey is visible on black
    graphics.fillRect(x - width / 2, y + offset, width, height);

    // 2. 현재 체력 계산
    const currentHp = entity.hp || 0;
    const maxHp = 5;
    const healthPercent = Math.max(0, currentHp / maxHp);

    // 3. 체력 바 색상
    const barColor = healthPercent > 0.3 ? 0x00ff00 : 0xff0000;

    // 4. 체력 바 그리기
    graphics.fillStyle(barColor, 1);
    graphics.fillRect(x - width / 2, y + offset, width * healthPercent, height);
}

function takeDamage(this: Phaser.Scene, playerObj: GameEntity, enemy: GameEntity) {
    if (isInvincible) return; // 무적 상태면 데미지 무시

    enemy.destroy();

    if (playerObj.hp !== undefined) {
        playerObj.hp -= 1;
        
        // 피격 효과 (빨간색으로 반짝임)
        playerObj.setTint(0xff0000);
        this.time.delayedCall(100, () => playerObj.clearTint());
        const boom = this.add.sprite(enemy.x, enemy.y, 'explosion');
        boom.setDisplaySize(playerObj.displayWidth * 0.5, playerObj.displayHeight * 0.5);
        this.cameras.main.shake(100, 0.02);
        boom.play('explode_anim');
        this.sound.play('explosion', { volume: 0.5 });

        // 무적 시작
        isInvincible = true;

        // 1초 뒤 무적 해제
        this.time.delayedCall(1000, () => {
            isInvincible = false;
        });

        if (playerObj.hp <= 0) {
            gameOver.call(this);
        }
    }
}

function updateScore(score: number, scene: Phaser.Scene) {
    scoreText.setText(`Score: ${score}`);
    
    // 텍스트가 띠용~ 하고 커지는 트윈(Tween) 효과
    scoreText.setScale(1.2);
    // 0.1초 만에 다시 원래 크기(1)로 돌아옴
    scene.tweens.add({
        targets: scoreText,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Back.easeOut'
    });
}