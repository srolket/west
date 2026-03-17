import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card && card.quacks && card.swims;
}

// Отвечает является ли карта собакой.
function isDog(card) {
    return card instanceof Dog;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}



// Основа для утки.
/*function Duck() {
    this.quacks = function () { console.log('quack') };
    this.swims = function () { console.log('float: both;') };
}*/


// Основа для собаки.
/*function Dog() {
}*/

class Creature extends Card {
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    getDescriptions () {
        return [getCreatureDescription(this), super.getDescriptions()]
    }
}


class Duck extends Creature {
    constructor(name = 'Мирная утка', maxPower = 2) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack')
    }

    swims() {
        console.log('float: both;')
    }
}

class Dog extends Creature {
    constructor(name = 'Пес-бандит', maxPower = 3) {
        super(name, maxPower);
    }
}


class Lad extends Dog {
    constructor() {
        super('Браток', 2);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    }

    static getBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            super.modifyDealedDamageToCreature(value + Lad.getBonus(), toCard, gameContext, continuation);
        });
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            super.modifyTakenDamage(value - Lad.getBonus(), fromCard, gameContext, continuation);
        });
    }

    getDescriptions() {
        const descriptions = super.getDescriptions();
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') ||
            Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions.unshift('Чем их больше, тем они сильнее');
        }
        return descriptions;
    }
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation);
        });
    }

    getDescriptions() {
        const descriptions = super.getDescriptions();
        descriptions.unshift('Получает на 1 меньше урона');
        return descriptions;
    }

}

class Gatling extends Creature {
    constructor() {
        super('Гатлинг', 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const oppositeCards = gameContext.oppositePlayer.table;

        for (const card of oppositeCards) {
            taskQueue.push(onDone => {
                card.takeDamage(2, this, gameContext, onDone);
            });
        }

        taskQueue.continueWith(continuation);
    }
}

class Rogue extends Creature {
    constructor(name = 'Изгой', maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const { oppositePlayer, position, updateView } = gameContext;
        const oppositeCard = oppositePlayer.table[position];
        if (oppositeCard) {
            const prototype = Object.getPrototypeOf(oppositeCard);
            const abilitiesToSteal =[
                'modifyDealedDamageToCreature',
                'modifyDealedDamageToPlayer',
                'modifyTakenDamage'
            ];

            let isStolen = false;

            for (const ability of abilitiesToSteal) {
                if (prototype.hasOwnProperty(ability)) {
                    this[ability] = prototype[ability];

                    delete prototype[ability];

                    isStolen = true;
                }
            }

            if (isStolen) {
                updateView();
            }
        }

        super.doBeforeAttack(gameContext, continuation);
    }
}


class PseudoDuck extends Dog {
    constructor() {
        super('Псевдоутка', 3);
    }

    quacks() {
        console.log('quack')
    }

    swims() {
        console.log('float: both;')
    }
}


class Nemo extends Creature {
    constructor(name = 'Немо', maxPower = 4) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const { oppositePlayer, position, updateView } = gameContext;
        const oppositeCard = oppositePlayer.table[position];

        if (oppositeCard) {
            const stolenPrototype = Object.getPrototypeOf(oppositeCard);
            Object.setPrototypeOf(this, stolenPrototype);
            updateView();
            this.doBeforeAttack(gameContext, continuation);
        } else {
            super.doBeforeAttack(gameContext, continuation);
        }
    }
}


// Колода Шерифа, нижнего игрока.
const seriffStartDeck = [
    new Nemo(),
];
const banditStartDeck = [
    new Lad(),
    new Lad(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
