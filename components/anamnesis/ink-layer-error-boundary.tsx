"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onError?: () => void;
};

type State = {
  hasError: boolean;
};

/** Evita que falha do Konva derrube a tela inteira no iPad/Safari. */
export class InkLayerErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[InkLayer] render falhou:", error, info.componentStack);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 p-3 text-center text-xs text-ink-muted">
          Camada de desenho indisponível neste dispositivo. O PDF continua
          visível — recarregue a página para tentar novamente.
        </div>
      );
    }
    return this.props.children;
  }
}
