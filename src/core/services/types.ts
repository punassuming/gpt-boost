export interface ServiceContainer {
  register<T>(id: string, service: T): void;
  get<T>(id: string): T;
  has(id: string): boolean;
  listIds(): string[];
}
