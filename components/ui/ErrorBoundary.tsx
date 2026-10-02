"use client";
import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ fallback: (err: Error) => ReactNode; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[Observatory] render error:", error); }
  render() { return this.state.error ? this.props.fallback(this.state.error) : this.props.children; }
}
