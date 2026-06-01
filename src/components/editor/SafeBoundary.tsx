'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
  name?: string;
};

type State = { hasError: boolean };

export default class SafeBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SafeBoundary:${this.props.name ?? 'unknown'}]`, error, info);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
