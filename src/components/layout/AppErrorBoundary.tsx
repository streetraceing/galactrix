import { Component, type ReactNode } from 'react';
import { i18next } from '../../i18n';
import { AppError } from './AppError';

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <AppError
        title={i18next.t('appError.unexpectedCrash')}
        message={error.message || i18next.t('errors.unknown')}
        retryLabel={i18next.t('appError.reload')}
        onRetry={() => window.location.reload()}
      />
    );
  }
}
