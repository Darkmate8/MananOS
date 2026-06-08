export interface NotifPrefs {
  water_enabled: boolean;
  water_interval_hours: number;
  water_start_hour: number;
  water_end_hour: number;
  habits_enabled: boolean;
  habits_reminder_hour: number;
  habits_reminder_minute: number;
  push_token?: string;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  water_enabled: false,
  water_interval_hours: 2,
  water_start_hour: 8,
  water_end_hour: 22,
  habits_enabled: false,
  habits_reminder_hour: 20,
  habits_reminder_minute: 0,
};
