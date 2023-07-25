import { BaseInteraction } from 'discord.js';

export class CustomEvent {
    name: string;
    execute: (interaction: BaseInteraction) => void;
    once: boolean;
    constructor(name: string, execute: (interaction: BaseInteraction) => void, once?: boolean) {
        this.name = name;
        this.execute = execute;
        this.once = once ?? false;
    }
}