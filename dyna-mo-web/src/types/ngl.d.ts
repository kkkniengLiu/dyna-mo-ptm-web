declare module "ngl" {
  export type RepresentationParameters = Record<string, unknown>;

  export interface Component {
    addRepresentation(type: string, params?: RepresentationParameters): void;
    autoView(selection?: string): void;
  }

  export class Stage {
    constructor(element: HTMLElement, params?: RepresentationParameters);
    loadFile(
      file: string | Blob,
      params?: RepresentationParameters,
    ): Promise<Component>;
    removeAllComponents(): void;
    handleResize(): void;
    dispose(): void;
    setParameters(params: RepresentationParameters): void;
  }
}
