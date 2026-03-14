/**
 * Typed location.state interfaces for deep linking navigation.
 * Used instead of `as any` casts when reading location.state from
 * notifications, search, or inter-page navigation.
 */

export interface HighlightUserState {
  highlightUserId?: string;
}

export interface HighlightSwapState {
  highlightSwapId?: string;
}

export interface HighlightLeaveRequestState {
  highlightRequestId?: string;
}

export interface HighlightScheduleState {
  highlightMonthYear?: string;
  highlightScheduleId?: string;
}

export interface HighlightDailyReportState {
  highlightReportDate?: string;
  highlightReportId?: string;
}

export interface OpenEditRequestState {
  openEditRequestId?: string;
}

export interface OpenSesizareState {
  openSesizareId?: string;
}

export interface OpenSessionState {
  openSessionId?: string;
}

export interface OpenIssueState {
  openIssueId?: string;
}

export interface OpenDamageState {
  openDamageId?: string;
  tab?: number;
}

export interface OpenRequestState {
  openRequestId?: string;
}

export interface OpenLegitimationState {
  openLegitimationId?: string;
  tab?: number;
}
