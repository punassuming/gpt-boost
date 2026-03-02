import type { ServiceContainer } from './types';

export class RuntimeServiceContainer implements ServiceContainer {
  private readonly services = new Map<string, unknown>();

  register<T>(id: string, service: T): void {
    this.services.set(id, service);
  }

  get<T>(id: string): T {
    if (!this.services.has(id)) {
      throw new Error(`Service not registered: ${id}`);
    }
    return this.services.get(id) as T;
  }

  has(id: string): boolean {
    return this.services.has(id);
  }

  listIds(): string[] {
    return Array.from(this.services.keys());
  }
}

export function createServiceContainer(
  seed?: Record<string, unknown>
): RuntimeServiceContainer {
  const container = new RuntimeServiceContainer();
  if (seed && typeof seed === 'object') {
    Object.entries(seed).forEach(([id, service]) => container.register(id, service));
  }
  return container;
}
