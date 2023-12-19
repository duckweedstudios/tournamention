import { APIButtonComponentWithCustomId, ButtonBuilder, ButtonInteraction, ButtonStyle } from 'discord.js';

class CustomButton {
    private component: APIButtonComponentWithCustomId;

    constructor(
        private builder: ButtonBuilder,
        public execute: (interaction: ButtonInteraction) => Promise<void>,
    ) {
        this.builder = builder;
        this.component = builder.toJSON() as APIButtonComponentWithCustomId;
        this.execute = execute;
    }

    public getBuilder(): ButtonBuilder {
        return this.builder;
    }

    public getCustomId(): string {
        return this.component.custom_id;
    }

    public getLabel(): string | undefined {
        return this.component.label;
    }

    public getStyle(): ButtonStyle {
        return this.component.style;
    }

    public isEnabled(): boolean | undefined {
        return !this.component.disabled;
    }
}

export default CustomButton;