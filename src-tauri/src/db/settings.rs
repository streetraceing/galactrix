use std::collections::{HashMap, HashSet};

use rusqlite::{params, Connection};

use crate::i18n::{CommandError, CommandResult};
use crate::models::{
    AiModuleSettings, AppSettings, BudgetSettings, BudgetStatus, PromptSnippet, UsagePoint,
};

use super::now_unix;

pub(crate) fn get_settings(connection: &Connection) -> CommandResult<AppSettings> {
    connection
        .query_row(
            "SELECT profile_name, profile_avatar, animations, haptics,
                    compact_mode, send_on_enter, save_drafts,
                    interface_scale, sidebar_width, chat_sidebar_width,
                    sidebar_collapsed, theme_mode, theme_variant, language,
                    chat_view_mode, show_message_avatars,
                    show_message_timestamps, response_language, ai_modules_json,
                    focus_composer_after_send, setup_complete, budgets_json,
                    snippets_json
             FROM app_settings WHERE id = 1",
            [],
            |row| {
                Ok(AppSettings {
                    profile_name: row.get(0)?,
                    profile_avatar: row.get(1)?,
                    animations: row.get::<_, i64>(2)? != 0,
                    haptics: row.get::<_, i64>(3)? != 0,
                    compact_mode: row.get::<_, i64>(4)? != 0,
                    send_on_enter: row.get::<_, i64>(5)? != 0,
                    save_drafts: row.get::<_, i64>(6)? != 0,
                    interface_scale: row.get(7)?,
                    sidebar_width: row.get(8)?,
                    chat_sidebar_width: row.get(9)?,
                    sidebar_collapsed: row.get::<_, i64>(10)? != 0,
                    theme_mode: row.get(11)?,
                    theme_variant: row.get(12)?,
                    language: row.get(13)?,
                    chat_view_mode: row.get(14)?,
                    show_message_avatars: row.get::<_, i64>(15)? != 0,
                    show_message_timestamps: row.get::<_, i64>(16)? != 0,
                    response_language: row.get(17)?,
                    ai_modules: serde_json::from_str::<AiModuleSettings>(
                        &row.get::<_, String>(18)?,
                    )
                    .unwrap_or_default(),
                    focus_composer_after_send: row.get::<_, i64>(19)? != 0,
                    setup_complete: row.get::<_, i64>(20)? != 0,
                    budgets: serde_json::from_str::<Vec<BudgetSettings>>(
                        &row.get::<_, String>(21)?,
                    )
                    .unwrap_or_default(),
                    snippets: serde_json::from_str::<Vec<PromptSnippet>>(
                        &row.get::<_, String>(22)?,
                    )
                    .unwrap_or_default(),
                })
            },
        )
        .map_err(CommandError::internal)
}

pub(crate) fn usage_history(connection: &Connection) -> CommandResult<Vec<UsagePoint>> {
    const DAY_SECONDS: i64 = 86_400;
    const MIN_HISTORY_DAYS: i64 = 42;

    let today = now_unix().div_euclid(DAY_SECONDS);
    let earliest_timestamp =
        connection.query_row("SELECT MIN(created_at) FROM usage_events", [], |row| {
            row.get::<_, Option<i64>>(0)
        })?;
    let first_day = earliest_timestamp
        .map(|timestamp| timestamp.div_euclid(DAY_SECONDS))
        .unwrap_or(today - (MIN_HISTORY_DAYS - 1))
        .min(today - (MIN_HISTORY_DAYS - 1))
        .min(today);

    let mut statement = connection.prepare(
        "SELECT created_at / ?1 AS usage_day,
                COALESCE(SUM(input_tokens), 0),
                COALESCE(SUM(output_tokens), 0),
                COALESCE(SUM(request_count), 0)
         FROM usage_events
         WHERE created_at >= ?2
         GROUP BY usage_day
         ORDER BY usage_day",
    )?;
    let totals = statement
        .query_map(params![DAY_SECONDS, first_day * DAY_SECONDS], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                (
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ),
            ))
        })?
        .collect::<Result<HashMap<_, _>, _>>()?;

    let mut points = Vec::with_capacity((today - first_day + 1) as usize);
    for day in first_day..=today {
        let (input_tokens, output_tokens, requests) = totals.get(&day).copied().unwrap_or_default();
        points.push(UsagePoint {
            day,
            input_tokens,
            output_tokens,
            tokens: input_tokens + output_tokens,
            requests,
        });
    }
    Ok(points)
}

pub(crate) fn update_settings(
    connection: &Connection,
    settings: &AppSettings,
) -> CommandResult<()> {
    connection.execute(
        "UPDATE app_settings
         SET profile_name = ?1, profile_avatar = ?2,
             animations = ?3, haptics = ?4, compact_mode = ?5,
             send_on_enter = ?6, save_drafts = ?7, interface_scale = ?8,
             sidebar_width = ?9, chat_sidebar_width = ?10,
             sidebar_collapsed = ?11, theme_mode = ?12, theme_variant = ?13,
             language = ?14, chat_view_mode = ?15,
             show_message_avatars = ?16, show_message_timestamps = ?17,
             response_language = ?18, ai_modules_json = ?19,
             focus_composer_after_send = ?20, setup_complete = ?21,
             budgets_json = ?22, snippets_json = ?23
         WHERE id = 1",
        params![
            settings.profile_name,
            settings.profile_avatar,
            settings.animations as i64,
            settings.haptics as i64,
            settings.compact_mode as i64,
            settings.send_on_enter as i64,
            settings.save_drafts as i64,
            settings.interface_scale,
            settings.sidebar_width,
            settings.chat_sidebar_width,
            settings.sidebar_collapsed as i64,
            settings.theme_mode,
            settings.theme_variant,
            settings.language,
            settings.chat_view_mode,
            settings.show_message_avatars as i64,
            settings.show_message_timestamps as i64,
            settings.response_language,
            serde_json::to_string(&settings.ai_modules)?,
            settings.focus_composer_after_send as i64,
            settings.setup_complete as i64,
            serde_json::to_string(&settings.budgets)?,
            serde_json::to_string(&settings.snippets)?
        ],
    )?;
    Ok(())
}

pub(crate) fn provider_ids(connection: &Connection) -> CommandResult<HashSet<String>> {
    let mut statement = connection.prepare("SELECT id FROM providers")?;
    let ids = statement
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<HashSet<_>, _>>()?;
    Ok(ids)
}

/// Start of the current UTC period for a budget rule, aligned with the
/// day buckets used by [`usage_history`].
fn period_start(period: &str, now: i64) -> i64 {
    let days = now.div_euclid(86_400);
    if period == "month" {
        // civil_from_days (Hinnant): convert UTC day number to y/m/d.
        let z = days + 719_468;
        let era = z.div_euclid(146_097);
        let doe = z - era * 146_097;
        let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
        let y = yoe + era * 400;
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        let mp = (5 * doy + 2) / 153;
        let month = if mp < 10 { mp + 3 } else { mp - 9 };
        let year = if month <= 2 { y + 1 } else { y };
        return days_from_civil(year, month, 1) * 86_400;
    }
    days * 86_400
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = year - if month <= 2 { 1 } else { 0 };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = if month > 2 { month - 3 } else { month + 9 };
    let doy = (153 * mp + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub(crate) fn budget_status(connection: &Connection) -> CommandResult<Vec<BudgetStatus>> {
    let settings = get_settings(connection)?;
    if settings.budgets.is_empty() {
        return Ok(Vec::new());
    }
    let now = now_unix();
    let mut statuses = Vec::with_capacity(settings.budgets.len());
    for rule in &settings.budgets {
        let start = period_start(&rule.period, now);
        let (used_tokens, used_requests): (i64, i64) = connection
            .query_row(
                "SELECT COALESCE(SUM(input_tokens + output_tokens), 0),
                        COALESCE(SUM(request_count), 0)
                 FROM usage_events
                 WHERE created_at >= ?1 AND (?2 IS NULL OR provider_id = ?2)",
                params![start, rule.provider_id],
                |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)),
            )
            .map_err(CommandError::internal)?;
        let exceeded = (rule.token_limit > 0 && used_tokens >= rule.token_limit)
            || (rule.request_limit > 0 && used_requests >= rule.request_limit);
        statuses.push(BudgetStatus {
            rule_id: rule.id.clone(),
            provider_id: rule.provider_id.clone(),
            period: rule.period.clone(),
            token_limit: rule.token_limit,
            request_limit: rule.request_limit,
            used_tokens,
            used_requests,
            exceeded,
        });
    }
    Ok(statuses)
}
