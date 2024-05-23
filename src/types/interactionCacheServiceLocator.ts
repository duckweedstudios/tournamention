import { InteractionCacheService } from './InteractionCacheService.js';
import { InMemoryInteractionCacheService } from './inMemoryInteractionCacheService.js';

export class InteractionCacheServiceLocator {
    private static service: InteractionCacheService;

    public static getService(): InteractionCacheService {
        if (!this.service) {
            this.service = new InMemoryInteractionCacheService();
        }
        return this.service;
    }

    public static setService(service: InteractionCacheService): void {
        this.service = service;
    }
}